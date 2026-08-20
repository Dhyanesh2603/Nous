from fastapi import APIRouter, HTTPException

from app.state import app_state
from app.analysis.doc_generator import DocGenerator, DocumentationReport

router = APIRouter(prefix="/api/analysis", tags=["Documentation Generator"])


@router.get("/generate-docs", response_model=DocumentationReport)
def generate_docs():
    """Synthesizes comprehensive markdown documentation for onboarding, architecture, API, and models."""
    if not app_state.scanner:
        raise HTTPException(status_code=400, detail="No repository currently loaded")

    generator = DocGenerator(scanner=app_state.scanner)
    return generator.generate()
