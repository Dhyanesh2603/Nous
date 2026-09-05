from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any

from app.state import app_state
from app.analysis.ripple_simulator import RippleSimulatorEngine, RippleSimulationReport

router = APIRouter(prefix="/api/analysis/ripple", tags=["Ripple Effect Simulator"])


class RippleSimulateRequest(BaseModel):
    target_id: str = Field(..., description="Target file path or symbol ID to mutate")
    target_type: str = Field("file", description="'file' or 'symbol'")
    change_type: str = Field("breaking", description="'breaking' (signature), 'behavioral' (logic), 'additive' (non-breaking)")


@router.get("/targets")
def get_ripple_targets():
    """Returns top candidate files and central symbols suitable for ripple effect simulation."""
    if not app_state.scanner:
        return {"targets": []}
    engine = RippleSimulatorEngine(scanner=app_state.scanner)
    return {"targets": engine.get_available_targets()}


@router.post("/simulate", response_model=RippleSimulationReport)
def run_ripple_simulation(request: RippleSimulateRequest):
    """
    Executes a multi-tier failure propagation simulation (Level 1, Level 2, Level 3 Ingress Routes)
    and computes contract breaking risk scores.
    """
    if not app_state.scanner:
        raise HTTPException(status_code=400, detail="No repository loaded in scanner")

    engine = RippleSimulatorEngine(scanner=app_state.scanner)
    try:
        return engine.simulate(
            target_id=request.target_id,
            target_type=request.target_type,
            change_type=request.change_type,
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Ripple simulation failed: {str(e)}")
