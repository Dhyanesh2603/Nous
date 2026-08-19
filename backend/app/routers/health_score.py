from fastapi import APIRouter, HTTPException
from app.state import app_state
from app.analysis.health_scorecard import HealthScorecardCalculator, RepositoryHealthScorecard

router = APIRouter(prefix="/api/analysis", tags=["Analysis"])


@router.get("/health-scorecard", response_model=RepositoryHealthScorecard)
def get_repository_health_scorecard():
    if not app_state.current_repo_path or not app_state.scanner:
        calculator = HealthScorecardCalculator("", None)
        return calculator._empty_scorecard()

    calculator = HealthScorecardCalculator(
        app_state.current_repo_path,
        app_state.scanner,
    )
    return calculator.calculate()
