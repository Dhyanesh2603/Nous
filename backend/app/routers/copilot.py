from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from app.state import app_state
from app.analysis.ai_copilot import (
    AICopilotEngine,
    CopilotAnswer,
    ImpactPredictionReport,
    OnboardingRoadmap,
)

router = APIRouter(prefix="/api/copilot", tags=["Copilot"])


class CopilotQueryRequest(BaseModel):
    query: str


class ImpactQueryRequest(BaseModel):
    target: str  # file path or symbol ID


@router.post("/query", response_model=CopilotAnswer)
def ask_copilot(req: CopilotQueryRequest):
    engine = AICopilotEngine(app_state.scanner)
    return engine.answer_query(req.query)


@router.post("/impact", response_model=ImpactPredictionReport)
def predict_change_impact(req: ImpactQueryRequest):
    engine = AICopilotEngine(app_state.scanner)
    return engine.predict_impact(req.target)


@router.get("/onboarding", response_model=OnboardingRoadmap)
def get_onboarding_roadmap():
    engine = AICopilotEngine(app_state.scanner)
    return engine.generate_onboarding_roadmap()


@router.get("/docs")
def get_generated_documentation():
    engine = AICopilotEngine(app_state.scanner)
    doc_md = engine.generate_documentation()
    return {"documentation_markdown": doc_md}
