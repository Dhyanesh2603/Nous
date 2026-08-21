from fastapi import APIRouter, HTTPException, Query

from app.state import app_state
from app.analysis.nl_search import NaturalLanguageSearchEngine, NLSearchReport

router = APIRouter(prefix="/api/analysis", tags=["Natural Language Code Search"])


@router.get("/nl-search", response_model=NLSearchReport)
def natural_language_code_search(q: str = Query("", description="Natural language search query")):
    """Performs natural language query mapping against AST symbols, RipEx facts, and route handlers."""
    if not app_state.scanner:
        raise HTTPException(status_code=400, detail="No repository currently loaded")

    if not q or not q.strip():
        return NLSearchReport(
            query=q,
            detected_intent="General Code Search",
            total_results=0,
            results=[],
            suggested_filters=[]
        )

    engine = NaturalLanguageSearchEngine(scanner=app_state.scanner)
    return engine.search(query=q)
