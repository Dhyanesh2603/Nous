from fastapi import APIRouter, HTTPException

from app.state import app_state
from app.analysis.api_mapper import ApiDependencyMapper, ApiDependencyGraphReport

router = APIRouter(prefix="/api/analysis", tags=["API Dependency Mapping"])


@router.get("/api-dependencies", response_model=ApiDependencyGraphReport)
def get_api_dependencies():
    """Returns detected REST, GraphQL, gRPC, WebSocket, and internal APIs with client dependency graph."""
    if not app_state.scanner:
        raise HTTPException(status_code=400, detail="No repository currently loaded")

    mapper = ApiDependencyMapper(
        fact_store=app_state.scanner.fact_store,
        file_asts=app_state.scanner.file_asts,
        root_dir=app_state.scanner.root_dir,
    )
    return mapper.analyze()
