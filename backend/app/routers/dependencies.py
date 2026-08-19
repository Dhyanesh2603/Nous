from fastapi import APIRouter, HTTPException
from app.state import app_state
from app.analysis.dependency_analyzer import DependencyAnalyzer, SupplyChainReport

router = APIRouter(prefix="/api/dependencies", tags=["Dependencies"])


@router.get("/supply-chain", response_model=SupplyChainReport)
def get_supply_chain_dependencies():
    if not app_state.current_repo_path:
        return SupplyChainReport()

    analyzer = DependencyAnalyzer(app_state.current_repo_path)
    return analyzer.analyze()
