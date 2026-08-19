from fastapi import APIRouter, HTTPException
from app.state import app_state
from app.analysis.security_scanner import SecurityScanner, SecurityAuditReport

router = APIRouter(prefix="/api/security", tags=["Security"])


@router.get("/audit", response_model=SecurityAuditReport)
def get_security_audit():
    if not app_state.current_repo_path:
        return SecurityAuditReport(
            security_score=100,
            grade="A",
            total_issues=0,
            critical_count=0,
            high_count=0,
            medium_count=0,
            low_count=0,
        )

    scanner = SecurityScanner(app_state.current_repo_path)
    return scanner.audit()
