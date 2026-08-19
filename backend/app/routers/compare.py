from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from app.state import app_state
from app.analysis.repo_diff import RepoDiffEngine, ArchitectureDiffReport

router = APIRouter(prefix="/api/compare", tags=["Compare"])


class DiffCompareRequest(BaseModel):
    base_ref: str = "HEAD~1"
    target_ref: str = "HEAD"


@router.post("/diff", response_model=ArchitectureDiffReport)
def compare_repository_diff(req: DiffCompareRequest):
    if not app_state.current_repo_path:
        engine = RepoDiffEngine("")
        return engine._synthetic_diff(req.base_ref, req.target_ref)

    engine = RepoDiffEngine(app_state.current_repo_path)
    return engine.compare(req.base_ref, req.target_ref)
