from fastapi import APIRouter, HTTPException, Query
from typing import Optional

from app.state import app_state
from app.search.hybrid_search import SearchResponse

router = APIRouter(prefix="/api/search", tags=["Search"])


@router.get("", response_model=SearchResponse)
def search_codebase(
    q: str = Query(..., min_length=1),
    limit: int = Query(20, ge=1, le=100),
    kind: Optional[str] = Query(None)
):
    if not app_state.scanner:
        raise HTTPException(status_code=400, detail="No repository loaded.")
    
    return app_state.scanner.search_engine.search(q, limit=limit, kind_filter=kind)
