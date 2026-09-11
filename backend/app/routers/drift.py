from fastapi import APIRouter, HTTPException

from app.state import app_state
from app.analysis.architecture_drift import (
    ArchitectureDriftAnalyzer,
    ArchitectureDriftReport,
    CleanArchitectureChecker,
    CleanArchitectureReport,
)
from pydantic import BaseModel, Field

router = APIRouter(prefix="/api/analysis", tags=["Architecture Drift Timeline"])


class FixPromptRequest(BaseModel):
    violation_id: str


@router.get("/architecture-drift", response_model=ArchitectureDriftReport)
def get_architecture_drift(max_samples: int = 12):
    """Reconstructs architectural drift, modularity trends, and coupling growth across Git history."""
    if not app_state.scanner:
        raise HTTPException(status_code=400, detail="No repository currently loaded")

    analyzer = ArchitectureDriftAnalyzer(root_dir=app_state.scanner.root_dir)
    return analyzer.analyze(max_samples=max_samples)


@router.get("/clean-architecture", response_model=CleanArchitectureReport)
def get_clean_architecture_drift():
    """Validates codebase dependencies against Clean Architecture layer rules."""
    if not app_state.scanner:
        raise HTTPException(status_code=400, detail="No repository currently loaded")

    checker = CleanArchitectureChecker(scanner=app_state.scanner)
    return checker.check()


@router.post("/drift-fix-prompt")
def generate_drift_fix_prompt(req: FixPromptRequest):
    """Generates an automated AI refactoring prompt to resolve an architectural boundary violation."""
    if not app_state.scanner:
        raise HTTPException(status_code=400, detail="No repository currently loaded")

    checker = CleanArchitectureChecker(scanner=app_state.scanner)
    report = checker.check()
    for v in report.violations:
        if v.id == req.violation_id:
            prompt = checker.generate_fix_prompt(v)
            return {"prompt": prompt, "violation": v}

    raise HTTPException(status_code=404, detail="Violation ID not found")

