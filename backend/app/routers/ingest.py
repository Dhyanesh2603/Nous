import os
import shutil
import zipfile
from pathlib import Path
from typing import Optional, List
from fastapi import APIRouter, HTTPException, BackgroundTasks, UploadFile, File, Form
from pydantic import BaseModel

from app.state import app_state
from app.config import settings
from app.git_cloner import GitCloner

router = APIRouter(prefix="/api/ingest", tags=["Ingest"])
git_cloner = GitCloner()


class IngestRequest(BaseModel):
    path: Optional[str] = None
    git_url: Optional[str] = None
    branch: Optional[str] = None


class IngestSampleRequest(BaseModel):
    sample_id: str  # 'python_project' or 'ts_project' or 'nous_self'


@router.post("")
def ingest_repository(req: IngestRequest):
    # 1. Handle Remote Git Repository URL
    if req.git_url or (req.path and git_cloner.is_git_url(req.path)):
        url_to_clone = req.git_url or req.path
        try:
            cloned_dir, repo_name = git_cloner.clone_repository(url_to_clone, branch=req.branch)
            stats = app_state.load_repository(cloned_dir)
            return {
                "status": "success",
                "mode": "git_clone",
                "git_url": url_to_clone,
                "repo_name": repo_name,
                "local_path": cloned_dir,
                "stats": stats,
            }
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Git clone error: {str(e)}")

    # 2. Handle Local File / Directory Path
    if not req.path:
        raise HTTPException(status_code=400, detail="Either 'path' or 'git_url' must be provided.")

    if not os.path.exists(req.path):
        raise HTTPException(status_code=400, detail=f"Local path does not exist: {req.path}")
    
    stats = app_state.load_repository(req.path)
    return {
        "status": "success",
        "mode": "single_file" if os.path.isfile(req.path) else "local_dir",
        "local_path": req.path,
        "stats": stats,
    }


@router.post("/zip")
async def upload_and_ingest_zip(file: UploadFile = File(...)):
    if not file.filename or not file.filename.lower().endswith(".zip"):
        raise HTTPException(status_code=400, detail="Uploaded file must be a valid .zip archive.")

    cache_dir = Path(__file__).resolve().parent.parent.parent / ".cloned_repos" / f"zip_{Path(file.filename).stem}"
    cache_dir.mkdir(parents=True, exist_ok=True)
    
    temp_zip = cache_dir / "temp_archive.zip"
    try:
        with open(temp_zip, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)

        # Extract safely
        with zipfile.ZipFile(temp_zip, "r") as zip_ref:
            # Check for path traversal vulnerabilities
            for member in zip_ref.namelist():
                if member.startswith("/") or ".." in member:
                    continue
                zip_ref.extract(member, cache_dir)
                
        if temp_zip.exists():
            temp_zip.unlink()
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to extract zip archive: {str(e)}")

    # If the zip extracted into a single top-level directory (e.g. repo-main/), use that
    extracted_items = [p for p in cache_dir.iterdir() if p.is_dir() and not p.name.startswith(".")]
    target_scan_dir = extracted_items[0] if len(extracted_items) == 1 else cache_dir

    stats = app_state.load_repository(str(target_scan_dir.resolve()))
    return {
        "status": "success",
        "mode": "zip_archive",
        "filename": file.filename,
        "local_path": str(target_scan_dir.resolve()),
        "stats": stats,
    }


@router.post("/file-upload")
async def upload_and_ingest_file(file: UploadFile = File(...)):
    if not file.filename:
        raise HTTPException(status_code=400, detail="No filename provided.")

    upload_dir = Path(__file__).resolve().parent.parent.parent / ".file_uploads"
    upload_dir.mkdir(parents=True, exist_ok=True)
    
    target_file = upload_dir / file.filename
    try:
        with open(target_file, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to save uploaded file: {str(e)}")

    stats = app_state.load_repository(str(target_file.resolve()))
    return {
        "status": "success",
        "mode": "single_file",
        "filename": file.filename,
        "local_path": str(target_file.resolve()),
        "stats": stats,
    }


@router.get("/status")
def get_ingest_status():
    if not app_state.scanner:
        return {
            "is_loaded": False,
            "is_indexing": app_state.is_indexing,
            "current_repo_path": None,
            "is_single_file": False,
            "files_count": 0,
            "symbols_count": 0,
        }
    
    return {
        "is_loaded": True,
        "is_indexing": app_state.is_indexing,
        "current_repo_path": app_state.current_repo_path,
        "is_single_file": app_state.scanner.is_single_file,
        "files_count": len(app_state.scanner.file_asts),
        "symbols_count": len(app_state.scanner.search_engine.symbols),
        "chunks_count": len(app_state.scanner.search_engine.chunks),
        "modules_count": len(app_state.scanner.graph_store.modules),
    }


@router.get("/samples")
def list_samples():
    fixtures_dir = settings.FIXTURES_DIR
    samples = []
    
    if fixtures_dir.exists():
        for d in fixtures_dir.iterdir():
            if d.is_dir():
                samples.append({
                    "id": d.name,
                    "name": d.name.replace("_", " ").title(),
                    "path": str(d.resolve()),
                })
                
    # Also allow self-ingestion of Nous itself
    backend_path = settings.BASE_DIR
    samples.append({
        "id": "nous_backend",
        "name": "Nous Backend (Python/Tree-sitter Engine)",
        "path": str(backend_path.resolve()),
    })
    
    return {"samples": samples}


@router.post("/sample")
def ingest_sample(req: IngestSampleRequest):
    if req.sample_id == "nous_backend":
        target_path = str(settings.BASE_DIR.resolve())
    else:
        target_path = str((settings.FIXTURES_DIR / req.sample_id).resolve())
        
    if not os.path.exists(target_path):
        raise HTTPException(status_code=404, detail=f"Sample '{req.sample_id}' not found at {target_path}")
        
    stats = app_state.load_repository(target_path)
    return {"status": "success", "sample_id": req.sample_id, "stats": stats}


@router.post("/watch/toggle")
def toggle_watch_mode():
    from app.watcher import repo_watcher
    if not app_state.current_repo_path:
        raise HTTPException(status_code=400, detail="No active repository to watch.")

    if repo_watcher.is_watching:
        repo_watcher.stop_watching()
        return {"is_watching": False, "watched_path": None}
    else:
        repo_watcher.start_watching(app_state.current_repo_path)
        return {"is_watching": True, "watched_path": app_state.current_repo_path}


@router.get("/watch/status")
def get_watch_status():
    from app.watcher import repo_watcher
    return {
        "is_watching": repo_watcher.is_watching,
        "watched_path": repo_watcher.watched_path,
    }

