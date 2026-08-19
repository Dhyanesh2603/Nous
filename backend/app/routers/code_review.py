from fastapi import APIRouter, HTTPException
from app.state import app_state
from app.analysis.code_reviewer import CodeReviewerEngine, CodeReviewReport

router = APIRouter(prefix="/api/review", tags=["Review"])


@router.get("/audit", response_model=CodeReviewReport)
def get_code_review_audit():
    if not app_state.scanner:
        return CodeReviewReport(
            review_status="Approved",
            maintainability_rating="A",
            total_findings=0,
            critical_findings_count=0,
            warning_findings_count=0,
            info_findings_count=0,
        )

    reviewer = CodeReviewerEngine(app_state.scanner)
    return reviewer.run_review()
