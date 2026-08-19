from fastapi import APIRouter, HTTPException
from app.state import app_state
from app.analysis.api_lifecycle import ApiLifecycleAnalyzer, ApiFlowCatalog

router = APIRouter(prefix="/api/api-flow", tags=["API Flow"])


@router.get("/catalog", response_model=ApiFlowCatalog)
def get_api_flow_catalog():
    if not app_state.scanner:
        return ApiFlowCatalog(total_endpoints=0, endpoints=[])

    analyzer = ApiLifecycleAnalyzer(app_state.scanner)
    return analyzer.build_catalog()
