from fastapi import APIRouter, HTTPException

from app.state import app_state
from app.analysis.knowledge_graph import KnowledgeGraphEngine, KnowledgeGraphReport

router = APIRouter(prefix="/api/analysis", tags=["Unified Knowledge Graph"])


@router.get("/knowledge-graph", response_model=KnowledgeGraphReport)
def get_unified_knowledge_graph():
    """Generates unified multi-entity knowledge graph connecting files, modules, symbols, routes, and tables."""
    if not app_state.scanner:
        raise HTTPException(status_code=400, detail="No repository currently loaded")

    engine = KnowledgeGraphEngine(scanner=app_state.scanner)
    return engine.build_graph()
