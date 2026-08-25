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


@router.get("/platform-docs")
def get_platform_docs():
    """Returns the comprehensive platform documentation and user manual (DOCUMENTATION.md)."""
    from pathlib import Path

    doc_path = Path(__file__).resolve().parents[3] / "DOCUMENTATION.md"
    if not doc_path.exists():
        doc_path = Path("DOCUMENTATION.md")

    if doc_path.exists():
        content = doc_path.read_text(encoding="utf-8").lstrip("\ufeff")
    else:
        content = "# NOUS Documentation\nDocumentation file is currently being initialized."

    return {
        "title": "NOUS Platform Documentation & User Manual",
        "markdown": content,
    }

