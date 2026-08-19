from fastapi import APIRouter, HTTPException
from app.state import app_state
from app.analysis.database_analyzer import DatabaseAnalyzer, DatabaseSchemaReport

router = APIRouter(prefix="/api/database", tags=["Database"])


@router.get("/schema", response_model=DatabaseSchemaReport)
def get_database_schema():
    if not app_state.current_repo_path:
        return DatabaseSchemaReport(detected=False)

    analyzer = DatabaseAnalyzer(app_state.current_repo_path)
    return analyzer.analyze()
