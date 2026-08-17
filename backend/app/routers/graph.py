from fastapi import APIRouter, HTTPException, Query
from typing import Optional

from app.state import app_state
from app.graph.graph_store import GraphStructureResponse, BlastRadiusResponse

router = APIRouter(prefix="/api/graph", tags=["Graph"])


@router.get("/structure", response_model=GraphStructureResponse)
def get_graph_structure(view_mode: str = Query("file", pattern="^(file|module|symbol|combined)$")):
    if not app_state.scanner:
        raise HTTPException(status_code=400, detail="No repository currently loaded. Please ingest a repository first.")
    
    return app_state.scanner.graph_store.get_react_flow_graph(view_mode)


@router.get("/modules")
def get_modules():
    if not app_state.scanner:
        raise HTTPException(status_code=400, detail="No repository loaded.")
    
    return {"modules": list(app_state.scanner.graph_store.modules.values())}


@router.get("/blast-radius", response_model=BlastRadiusResponse)
def get_blast_radius(node_id: str = Query(...), max_depth: int = Query(4, ge=1, le=10)):
    if not app_state.scanner:
        raise HTTPException(status_code=400, detail="No repository loaded.")
    
    return app_state.scanner.graph_store.calculate_blast_radius(node_id, max_depth)
