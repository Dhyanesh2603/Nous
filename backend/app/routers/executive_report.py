from fastapi import APIRouter, HTTPException

from app.state import app_state
from app.analysis.executive_report import ExecutiveReportEngine, ExecutiveAuditReport

router = APIRouter(prefix="/api/analysis", tags=["Executive Audit Report"])


@router.get("/executive-report", response_model=ExecutiveAuditReport)
def get_executive_audit_report():
    """Compiles an executive architecture, security, and technical debt audit report."""
    if not app_state.scanner:
        raise HTTPException(status_code=400, detail="No repository currently loaded")

    engine = ExecutiveReportEngine(scanner=app_state.scanner)
    return engine.generate()
