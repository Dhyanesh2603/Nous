from fastapi import APIRouter, HTTPException, Query
from typing import Optional, List, Dict, Any

from app.state import app_state
from app.facts.fact_types import FactKind, FactSummary, FactQueryResponse, RouteFact, CodeFact

router = APIRouter(prefix="/api/facts", tags=["Facts"])


@router.get("/summary", response_model=FactSummary)
def get_facts_summary():
    if not app_state.scanner:
        raise HTTPException(status_code=400, detail="No repository loaded.")
    return app_state.scanner.fact_store.get_summary()


@router.get("/query", response_model=FactQueryResponse)
def query_facts(
    subject: Optional[str] = Query(None, description="Filter by subject ID / substring"),
    predicate: Optional[str] = Query(None, description="Filter by predicate (defines, calls, instantiates, etc.)"),
    object_: Optional[str] = Query(None, alias="object", description="Filter by object ID / substring"),
    kind: Optional[FactKind] = Query(None, description="Filter by FactKind"),
    file_path: Optional[str] = Query(None, description="Filter by file path / relative path"),
    limit: int = Query(100, ge=1, le=500),
):
    if not app_state.scanner:
        raise HTTPException(status_code=400, detail="No repository loaded.")
    return app_state.scanner.fact_store.query(
        subject=subject,
        predicate=predicate,
        object_=object_,
        kind=kind,
        file_path=file_path,
        limit=limit,
    )


@router.get("/routes", response_model=List[RouteFact])
def get_api_routes():
    if not app_state.scanner:
        raise HTTPException(status_code=400, detail="No repository loaded.")
    return app_state.scanner.fact_store.get_routes()


@router.get("/symbol/{symbol_id:path}")
def get_symbol_facts(symbol_id: str):
    if not app_state.scanner:
        raise HTTPException(status_code=400, detail="No repository loaded.")
    return app_state.scanner.fact_store.get_symbol_facts(symbol_id)
