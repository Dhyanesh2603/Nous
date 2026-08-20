from fastapi import APIRouter, HTTPException

from app.state import app_state
from app.analysis.time_machine import TimeMachineEngine, TimeMachineReport

router = APIRouter(prefix="/api/analysis/time-machine", tags=["Repository Time Machine"])


@router.get("/frames", response_model=TimeMachineReport)
def get_time_machine_frames(max_frames: int = 30):
    """Reconstructs git evolution playback frames with cumulative LOC, velocity, and commit history."""
    if not app_state.scanner:
        raise HTTPException(status_code=400, detail="No repository currently loaded")

    engine = TimeMachineEngine(root_dir=app_state.scanner.root_dir)
    return engine.get_frames(max_frames=max_frames)
