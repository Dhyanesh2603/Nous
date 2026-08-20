from fastapi import APIRouter, HTTPException

from app.state import app_state
from app.analysis.refactoring_advisor import RefactoringAdvisor, RefactoringReport

router = APIRouter(prefix="/api/analysis", tags=["Refactoring Advisor"])


@router.get("/refactoring-suggestions", response_model=RefactoringReport)
def get_refactoring_suggestions():
    """Generates intelligent refactoring advice (Extract Method/Class, Split File, Break Cycles, Simplify Conditionals)."""
    if not app_state.scanner:
        raise HTTPException(status_code=400, detail="No repository currently loaded")

    advisor = RefactoringAdvisor(scanner=app_state.scanner)
    return advisor.analyze()
