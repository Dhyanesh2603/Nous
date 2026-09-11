import os
from fastapi import APIRouter, HTTPException, Query
from typing import List, Optional, Dict, Any

from app.state import app_state
from app.analysis.archaeology import ArchaeologyEngine, ArchaeologyResponse, LegacyFlagItem, LegacyFlagDetector

router = APIRouter(prefix="/api/archaeology", tags=["Code Archaeology"])


@router.get("", response_model=ArchaeologyResponse)
def get_code_origin(
    file: Optional[str] = Query(None, description="Target file path to investigate"),
    symbol: Optional[str] = Query(None, description="Optional symbol/function name in the file")
):
    """
    Answers 'Why does this code exist?' by investigating the historical provenance,
    original author intent, commit evolution, and legacy safety markers.
    """
    if not app_state.scanner:
        raise HTTPException(status_code=400, detail="No active repository loaded in scanner")

    target_file = file
    if not target_file:
        # Default to first file in scanner
        files = list(app_state.scanner.file_asts.keys())
        if not files:
            raise HTTPException(status_code=404, detail="No source files in active repository")
        target_file = files[0]

    engine = ArchaeologyEngine(scanner=app_state.scanner)
    return engine.investigate(target_file, symbol_name=symbol)


@router.get("/legacy-flags", response_model=List[LegacyFlagItem])
def get_legacy_flags(
    file_path: Optional[str] = Query(None, description="Optional specific file to scan")
):
    """
    Scans source files for technical debt and legacy flags (#TODO, #FIXME, #HACK, #LEGACY, #DO NOT REMOVE).
    """
    if not app_state.scanner:
        raise HTTPException(status_code=400, detail="No active repository loaded in scanner")

    detector = LegacyFlagDetector()
    if file_path:
        return detector.scan_file(file_path, repo_root=app_state.scanner.root_dir)
    
    file_paths = [os.path.join(app_state.scanner.root_dir, rel) for rel in app_state.scanner.file_asts.keys()]
    return detector.scan_repo(app_state.scanner.root_dir, file_list=file_paths)


@router.get("/files")
def get_archaeology_files():
    """
    Returns list of all source files available for archaeology inspection.
    """
    if not app_state.scanner:
        return {"files": []}
    
    files = list(app_state.scanner.file_asts.keys())
    return {"files": sorted(files)}
