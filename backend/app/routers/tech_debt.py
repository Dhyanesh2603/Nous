from fastapi import APIRouter, HTTPException

from app.state import app_state
from app.analysis.tech_debt_engine import TechnicalDebtEngine, TechnicalDebtReport

router = APIRouter(prefix="/api/analysis", tags=["Technical Debt Engine"])


@router.get("/tech-debt", response_model=TechnicalDebtReport)
def get_technical_debt_report():
    """Computes comprehensive technical debt score, remediation hours, and 8-dimension debt breakdown."""
    if not app_state.scanner:
        raise HTTPException(status_code=400, detail="No repository currently loaded")

    engine = TechnicalDebtEngine(scanner=app_state.scanner)
    return engine.calculate()
