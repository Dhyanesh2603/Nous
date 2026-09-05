from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any

from app.state import app_state
from app.ai.llm_client import LLMClient
from app.analysis.architect_ai import ArchitectAIEngine, ArchitectAIResponse

router = APIRouter(prefix="/api/ai", tags=["Architect AI"])


class ArchitectAIQueryRequest(BaseModel):
    query: str = Field(..., description="Natural language question regarding codebase architecture or flow")
    provider: Optional[str] = Field(None, description="Requested provider: openai, anthropic, gemini, ollama, offline")
    model: Optional[str] = Field(None, description="Specific model identifier")
    focus_node_id: Optional[str] = Field(None, description="Optional target file or symbol ID to focus on")


@router.get("/status")
def get_ai_status():
    """Returns availability and active status of all configured AI providers."""
    client = LLMClient()
    return client.get_available_providers()


@router.get("/suggested-questions")
def get_suggested_questions():
    """Returns smart contextual architecture questions tailored to the loaded repository."""
    if not app_state.scanner:
        return {
            "questions": [
                "Explain the overall system architecture and primary entry points.",
                "How does data flow from API requests to the persistence layer?",
                "What are the most coupled modules and critical bottleneck files?",
            ]
        }
    engine = ArchitectAIEngine(scanner=app_state.scanner)
    return {"questions": engine.get_suggested_questions()}


@router.post("/architect-query", response_model=ArchitectAIResponse)
def execute_architect_query(request: ArchitectAIQueryRequest):
    """
    Executes a Graph-Augmented Retrieval query against the repository's ASTs and call graphs.
    Returns structured explanation, step-by-step execution path, and Mermaid sequence diagram.
    """
    if not app_state.scanner:
        raise HTTPException(status_code=400, detail="No repository currently loaded in scanner")

    engine = ArchitectAIEngine(scanner=app_state.scanner)
    try:
        return engine.ask(
            query=request.query,
            provider=request.provider,
            model=request.model,
            focus_node_id=request.focus_node_id,
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Architect AI query failed: {str(e)}")
