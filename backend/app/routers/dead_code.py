from fastapi import APIRouter, HTTPException
from app.state import app_state
from app.analysis.dead_code_detector import DeadCodeDetector, DeadCodeReport

router = APIRouter(prefix="/api/analysis", tags=["Dead Code Intelligence"])


@router.get("/dead-code-report", response_model=DeadCodeReport)
def get_dead_code_report():
    """Returns comprehensive dead code detection report across unused functions, classes, files, exports, and unreachable code."""
    if not app_state.scanner:
        raise HTTPException(status_code=400, detail="No repository currently loaded")

    detector = DeadCodeDetector(
        graph_store=app_state.scanner.graph_store,
        fact_store=app_state.scanner.fact_store,
    )
    return detector.analyze()
