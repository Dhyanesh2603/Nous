from fastapi import APIRouter, HTTPException

from app.state import app_state
from app.analysis.architecture_detector import ArchitectureDetector, ArchitectureDetectionReport

router = APIRouter(prefix="/api/analysis", tags=["Architecture Intelligence"])


@router.get("/architecture-style", response_model=ArchitectureDetectionReport)
def get_architecture_style():
    """Automatically detects architecture patterns (MVC, MVVM, Clean Architecture, Hexagonal, Onion, DDD, Layered, Microservices, Event-Driven)."""
    if not app_state.scanner:
        raise HTTPException(status_code=400, detail="No repository currently loaded")

    detector = ArchitectureDetector(
        graph_store=app_state.scanner.graph_store,
        fact_store=app_state.scanner.fact_store,
        file_asts=app_state.scanner.file_asts,
        root_dir=app_state.scanner.root_dir,
    )
    return detector.analyze()
