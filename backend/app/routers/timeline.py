from fastapi import APIRouter, HTTPException, Query
from app.state import app_state
from app.analysis.timeline_engine import TimelineEngine, RepositoryTimelineReport

router = APIRouter(prefix="/api/timeline", tags=["Timeline"])


@router.get("/evolution", response_model=RepositoryTimelineReport)
def get_timeline_evolution(max_commits: int = Query(40, ge=5, le=200)):
    if not app_state.current_repo_path:
        return RepositoryTimelineReport(is_git_repo=False, total_commits=0)

    engine = TimelineEngine(app_state.current_repo_path)
    return engine.analyze_timeline(max_commits=max_commits)
