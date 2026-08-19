from fastapi import APIRouter, HTTPException
from app.state import app_state
from app.analysis.performance_analyzer import PerformanceAnalyzer, PerformanceReport

router = APIRouter(prefix="/api/performance", tags=["Performance"])


@router.get("/insights", response_model=PerformanceReport)
def get_performance_insights():
    if not app_state.current_repo_path:
        return PerformanceReport(
            performance_score=100,
            grade="A",
            total_issues=0,
            n_plus_one_count=0,
            blocking_io_count=0,
            nested_loop_count=0,
        )

    analyzer = PerformanceAnalyzer(
        app_state.current_repo_path,
        app_state.scanner.file_asts if app_state.scanner else None,
    )
    return analyzer.analyze()
