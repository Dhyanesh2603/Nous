from fastapi import APIRouter, HTTPException

from app.state import app_state
from app.analysis.module_health import ModuleHealthAnalyzer, ModuleHealthReport

router = APIRouter(prefix="/api/analysis", tags=["Module Health Dashboard"])


@router.get("/module-health", response_model=ModuleHealthReport)
def get_module_health_report():
    """Returns package cohesion, coupling, instability, DAG depth, test coverage, and health cards for all modules."""
    if not app_state.scanner:
        raise HTTPException(status_code=400, detail="No repository currently loaded")

    analyzer = ModuleHealthAnalyzer(
        graph_store=app_state.scanner.graph_store,
        fact_store=app_state.scanner.fact_store,
        file_asts=app_state.scanner.file_asts,
    )
    return analyzer.analyze()
