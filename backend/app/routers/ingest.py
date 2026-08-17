import os
from pathlib import Path
from typing import Optional, List
from fastapi import APIRouter, HTTPException, BackgroundTasks
from pydantic import BaseModel

from app.state import app_state
from app.config import settings

router = APIRouter(prefix="/api/ingest", tags=["Ingest"])


class IngestRequest(BaseModel):
    path: str


class IngestSampleRequest(BaseModel):
    sample_id: str  # 'python_project' or 'ts_project' or 'nous_self'


@router.post("")
def ingest_repository(req: IngestRequest):
    if not os.path.exists(req.path):
        raise HTTPException(status_code=400, detail=f"Directory path does not exist: {req.path}")
    
    stats = app_state.load_repository(req.path)
    return {"status": "success", "stats": stats}


@router.get("/status")
def get_ingest_status():
    if not app_state.scanner:
        return {
            "is_loaded": False,
            "is_indexing": app_state.is_indexing,
            "current_repo_path": None,
            "files_count": 0,
            "symbols_count": 0,
        }
    
    return {
        "is_loaded": True,
        "is_indexing": app_state.is_indexing,
        "current_repo_path": app_state.current_repo_path,
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
