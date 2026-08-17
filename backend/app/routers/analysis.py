from fastapi import APIRouter, HTTPException

from app.state import app_state
from app.analysis.metrics import ArchitectureMetricsResponse

router = APIRouter(prefix="/api/analysis", tags=["Analysis"])


@router.get("/metrics", response_model=ArchitectureMetricsResponse)
def get_metrics():
    if not app_state.scanner:
        raise HTTPException(status_code=400, detail="No repository loaded.")
    return app_state.scanner.analyzer.analyze()


@router.get("/dead-code")
def get_dead_code():
    if not app_state.scanner:
        raise HTTPException(status_code=400, detail="No repository loaded.")
    return {"dead_code": app_state.scanner.analyzer.detect_dead_code()}


@router.get("/circular-dependencies")
def get_circular_dependencies():
    if not app_state.scanner:
        raise HTTPException(status_code=400, detail="No repository loaded.")
    return {"circular_dependencies": app_state.scanner.analyzer.format_circular_dependencies()}


@router.get("/hotspots")
def get_hotspots():
    if not app_state.scanner:
        raise HTTPException(status_code=400, detail="No repository loaded.")
    return {"hotspots": app_state.scanner.analyzer.detect_hotspots()}
