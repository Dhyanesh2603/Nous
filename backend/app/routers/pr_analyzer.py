from fastapi import APIRouter, HTTPException

from app.state import app_state
from app.analysis.pr_analyzer import PRImpactAnalyzer, PRImpactReport

router = APIRouter(prefix="/api/analysis", tags=["PR Impact Analyzer"])


@router.get("/pr-impact", response_model=PRImpactReport)
def get_pr_impact(diff_target: str = "HEAD~1"):
    """Calculates PR change blast radius, affected call chains, risk level, and suggested reviewers."""
    if not app_state.scanner:
        raise HTTPException(status_code=400, detail="No repository currently loaded")

    analyzer = PRImpactAnalyzer(scanner=app_state.scanner)
    return analyzer.analyze(diff_target=diff_target)
