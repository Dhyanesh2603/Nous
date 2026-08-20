from typing import Optional
from fastapi import APIRouter, HTTPException

from app.state import app_state
from app.analysis.data_flow import DataFlowAnalyzer, DataFlowReport, DataFlowChain

router = APIRouter(prefix="/api/analysis", tags=["Data Flow Intelligence"])


@router.get("/data-flow/chains", response_model=DataFlowReport)
def get_data_flow_chains():
    """Returns end-to-end traced data flow chains across variables, parameters, user inputs, DB writes/reads, and API calls."""
    if not app_state.scanner:
        raise HTTPException(status_code=400, detail="No repository currently loaded")

    analyzer = DataFlowAnalyzer(
        graph_store=app_state.scanner.graph_store,
        fact_store=app_state.scanner.fact_store,
    )
    return analyzer.analyze()


@router.get("/data-flow/trace", response_model=Optional[DataFlowChain])
def trace_symbol_data_flow(entry_symbol: str):
    """Traces step-by-step data flow starting from a specified entry symbol."""
    if not app_state.scanner:
        raise HTTPException(status_code=400, detail="No repository currently loaded")

    analyzer = DataFlowAnalyzer(
        graph_store=app_state.scanner.graph_store,
        fact_store=app_state.scanner.fact_store,
    )
    res = analyzer.trace_symbol(entry_symbol)
    if not res:
        raise HTTPException(status_code=404, detail=f"No data flow paths found starting from symbol '{entry_symbol}'")
    return res
