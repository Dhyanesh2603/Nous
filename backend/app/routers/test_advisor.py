from fastapi import APIRouter, HTTPException

from app.state import app_state
from app.analysis.test_advisor import TestAdvisor, TestAdvisorReport

router = APIRouter(prefix="/api/analysis", tags=["Intelligent Test Advisor"])


@router.get("/test-advice", response_model=TestAdvisorReport)
def get_test_advice():
    """Identifies untested high-risk functions and provides ready-to-run test stubs."""
    if not app_state.scanner:
        raise HTTPException(status_code=400, detail="No repository currently loaded")

    advisor = TestAdvisor(scanner=app_state.scanner)
    return advisor.analyze()
