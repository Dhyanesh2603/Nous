from typing import Optional
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.state import app_state
from app.analysis.impact_simulator import (
    ImpactSimulator,
    SimulationType,
    ImpactSimulationResult,
)

router = APIRouter(prefix="/api/analysis", tags=["Change Impact Simulator"])


class SimulateRequest(BaseModel):
    target_id: str
    simulation_type: SimulationType
    new_name_or_path: Optional[str] = None


@router.get("/impact-simulate/targets")
def get_simulation_targets():
    """Returns candidate functions, classes, files, and modules available for impact simulation."""
    if not app_state.scanner:
        raise HTTPException(status_code=400, detail="No repository currently loaded")

    simulator = ImpactSimulator(
        graph_store=app_state.scanner.graph_store,
        fact_store=app_state.scanner.fact_store,
    )
    return simulator.get_simulation_targets()


@router.post("/impact-simulate", response_model=ImpactSimulationResult)
def simulate_change_impact(request: SimulateRequest):
    """Simulates deletion, renaming, relocation, or extraction of a function, class, module, or file."""
    if not app_state.scanner:
        raise HTTPException(status_code=400, detail="No repository currently loaded")

    simulator = ImpactSimulator(
        graph_store=app_state.scanner.graph_store,
        fact_store=app_state.scanner.fact_store,
    )
    return simulator.simulate(
        target_id=request.target_id,
        simulation_type=request.simulation_type,
        new_name_or_path=request.new_name_or_path,
    )
