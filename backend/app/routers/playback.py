from typing import List
from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel

from app.state import app_state
from app.analysis.execution_playback import (
    ExecutionPlaybackEngine,
    ExecutionPlaybackTrace,
    ExecutionCandidate,
)

router = APIRouter(prefix="/api/analysis/execution-playback", tags=["Interactive Execution Playback"])


class TraceRequest(BaseModel):
    entry_id_or_name: str


@router.get("/candidates", response_model=List[ExecutionCandidate])
def get_playback_candidates():
    """Returns candidate entry functions and route handlers for execution simulation."""
    if not app_state.scanner:
        raise HTTPException(status_code=400, detail="No repository currently loaded")

    engine = ExecutionPlaybackEngine(scanner=app_state.scanner)
    return engine.get_entry_candidates()


@router.post("/trace", response_model=ExecutionPlaybackTrace)
def trace_playback_execution(req: TraceRequest):
    """Simulates step-by-step runtime execution flow, call depths, and state payloads."""
    if not app_state.scanner:
        raise HTTPException(status_code=400, detail="No repository currently loaded")

    engine = ExecutionPlaybackEngine(scanner=app_state.scanner)
    return engine.trace_execution(req.entry_id_or_name)
