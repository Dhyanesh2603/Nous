from fastapi import APIRouter, HTTPException

from app.state import app_state
from app.analysis.migration_planner import MigrationPlannerEngine, MigrationPlannerReport

router = APIRouter(prefix="/api/analysis", tags=["AI Refactoring & Migration Planner"])


@router.get("/migration-plans", response_model=MigrationPlannerReport)
def get_migration_plans():
    """Generates phased modernization plans with readiness scores, complexity estimates, and checklists."""
    if not app_state.scanner:
        raise HTTPException(status_code=400, detail="No repository currently loaded")

    engine = MigrationPlannerEngine(scanner=app_state.scanner)
    return engine.generate_plans()
