from fastapi import APIRouter, HTTPException
from app.state import app_state
from app.analysis.framework_analyzer import FrameworkAnalyzer, FrameworkOverviewReport

router = APIRouter(prefix="/api/framework", tags=["Framework"])


@router.get("/overview", response_model=FrameworkOverviewReport)
def get_framework_overview():
    if not app_state.current_repo_path or not app_state.scanner:
        return FrameworkOverviewReport()

    analyzer = FrameworkAnalyzer(
        app_state.current_repo_path,
        app_state.scanner.file_asts,
    )
    return analyzer.analyze()
