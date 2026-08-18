from fastapi import APIRouter, HTTPException, Query
from typing import Optional, List
from pydantic import BaseModel

from app.state import app_state
from app.analysis.metrics import ArchitectureMetricsResponse
from app.analysis.git_analytics import GitChurnReport
from app.analysis.clone_detector import CloneReport
from app.analysis.rules_engine import RuleEvaluationReport, ArchitectureRule
from app.graph.sequence_generator import SequenceDiagramResponse
from app.analysis.pattern_detector import ArchitecturalSummary

router = APIRouter(prefix="/api/analysis", tags=["Analysis"])


class EvaluateRulesRequest(BaseModel):
    preset: Optional[str] = None
    custom_rules: Optional[List[ArchitectureRule]] = None


@router.get("/metrics", response_model=ArchitectureMetricsResponse)
def get_metrics():
    if not app_state.scanner:
        raise HTTPException(status_code=400, detail="No repository loaded.")
    return app_state.scanner.analyzer.analyze()


@router.get("/dead-code")
def get_dead_code():
    if not app_state.scanner:
        raise HTTPException(status_code=400, detail="No repository loaded.")
    return {"dead_code": app_state.scanner.analyzer.detect_dead_code()}


@router.get("/circular-dependencies")
def get_circular_dependencies():
    if not app_state.scanner:
        raise HTTPException(status_code=400, detail="No repository loaded.")
    return {"circular_dependencies": app_state.scanner.analyzer.format_circular_dependencies()}


@router.get("/hotspots")
def get_hotspots():
    if not app_state.scanner:
        raise HTTPException(status_code=400, detail="No repository loaded.")
    return {"hotspots": app_state.scanner.analyzer.detect_hotspots()}


@router.get("/git-churn", response_model=GitChurnReport)
def get_git_churn():
    if not app_state.scanner:
        raise HTTPException(status_code=400, detail="No repository loaded.")
    return app_state.scanner.git_analyzer.analyze()


@router.get("/clones", response_model=CloneReport)
def get_code_clones():
    if not app_state.scanner:
        raise HTTPException(status_code=400, detail="No repository loaded.")
    return app_state.scanner.clone_detector.detect_clones()


@router.get("/rules", response_model=RuleEvaluationReport)
def get_architecture_rules(preset: Optional[str] = Query("clean_architecture")):
    if not app_state.scanner:
        raise HTTPException(status_code=400, detail="No repository loaded.")
    return app_state.scanner.rules_engine.evaluate_rules(preset=preset)


@router.post("/rules/evaluate", response_model=RuleEvaluationReport)
def evaluate_custom_rules(req: EvaluateRulesRequest):
    if not app_state.scanner:
        raise HTTPException(status_code=400, detail="No repository loaded.")
    return app_state.scanner.rules_engine.evaluate_rules(
        custom_rules=req.custom_rules, preset=req.preset
    )


@router.get("/sequence", response_model=SequenceDiagramResponse)
def get_sequence_diagram(
    symbol_id: str = Query(..., description="Target entry point symbol ID to trace"),
    max_depth: int = Query(5, ge=1, le=10),
):
    if not app_state.scanner:
        raise HTTPException(status_code=400, detail="No repository loaded.")
    try:
        return app_state.scanner.sequence_generator.generate_sequence(
            entry_symbol_id=symbol_id, max_depth=max_depth
        )
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.get("/patterns", response_model=ArchitecturalSummary)
def get_design_patterns():
    if not app_state.scanner:
        raise HTTPException(status_code=400, detail="No repository loaded.")
    return app_state.scanner.pattern_detector.analyze_patterns()
