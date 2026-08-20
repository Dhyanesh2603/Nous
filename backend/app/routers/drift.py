from fastapi import APIRouter, HTTPException

from app.state import app_state
from app.analysis.architecture_drift import ArchitectureDriftAnalyzer, ArchitectureDriftReport

router = APIRouter(prefix="/api/analysis", tags=["Architecture Drift Timeline"])


@router.get("/architecture-drift", response_model=ArchitectureDriftReport)
def get_architecture_drift(max_samples: int = 12):
    """Reconstructs architectural drift, modularity trends, and coupling growth across Git history."""
    if not app_state.scanner:
        raise HTTPException(status_code=400, detail="No repository currently loaded")

    analyzer = ArchitectureDriftAnalyzer(root_dir=app_state.scanner.root_dir)
    return analyzer.analyze(max_samples=max_samples)
