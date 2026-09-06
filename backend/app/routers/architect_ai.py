from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any

from app.state import app_state
from app.ai.llm_client import LLMClient
from app.analysis.architect_ai import ArchitectAIEngine, ArchitectAIResponse

router = APIRouter(prefix="/api/ai", tags=["Architect AI"])


class SetKeyRequest(BaseModel):
    provider: str = Field(..., description="Provider name e.g. nvidia, deepseek, openai, anthropic, gemini")
    api_key: str = Field(..., description="API key to configure")
    model: Optional[str] = Field(None, description="Optional default model identifier")


class ArchitectAIQueryRequest(BaseModel):
    query: str = Field(..., description="Natural language question regarding codebase architecture or flow")
    provider: Optional[str] = Field(None, description="Requested provider: nvidia, deepseek, openai, anthropic, gemini, ollama, offline")
    model: Optional[str] = Field(None, description="Specific model identifier")
    api_key: Optional[str] = Field(None, description="Optional per-request API key")
    focus_node_id: Optional[str] = Field(None, description="Optional target file or symbol ID to focus on")


@router.get("/status")
def get_ai_status():
    """Returns availability and active status of all configured AI providers."""
    client = LLMClient()
    return client.get_available_providers()


@router.post("/set-key")
def configure_api_key(req: SetKeyRequest):
    """Dynamically sets an API key in-memory and saves it to local environment."""
    client = LLMClient()
    client.set_api_key(req.provider, req.api_key)
    
    # Also save to .env in repository root
    try:
        from pathlib import Path
        env_path = Path("D:/Nous/.env")
        lines = []
        if env_path.exists():
            lines = env_path.read_text(encoding="utf-8").splitlines()
        key_var = "NVIDIA_API_KEY" if req.provider in ("nvidia", "deepseek") else f"{req.provider.upper()}_API_KEY"
        
        updated = False
        new_lines = []
        for line in lines:
            if line.startswith(f"{key_var}="):
                new_lines.append(f'{key_var}="{req.api_key.strip()}"')
                updated = True
            else:
                new_lines.append(line)
        if not updated:
            new_lines.append(f'{key_var}="{req.api_key.strip()}"')
        env_path.write_text("\n".join(new_lines) + "\n", encoding="utf-8")
    except Exception:
        pass

    return {
        "status": "success",
        "provider": req.provider,
        "active_status": client.get_available_providers()
    }


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
            api_key=request.api_key,
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Architect AI query failed: {str(e)}")
