from contextlib import asynccontextmanager
import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.routers import (
    ingest_router,
    graph_router,
    search_router,
    analysis_router,
    files_router,
)
from app.state import app_state


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: auto-load Python sample fixture if available, or backend itself
    try:
        py_fixture = settings.FIXTURES_DIR / "python_project"
        if py_fixture.exists():
            print(f"[Nous] Pre-loading default sample repository: {py_fixture}")
            app_state.load_repository(str(py_fixture.resolve()))
        else:
            # Fallback to self-indexing
            print(f"[Nous] Pre-loading self repository: {settings.BASE_DIR}")
            app_state.load_repository(str(settings.BASE_DIR.resolve()))
    except Exception as e:
        print(f"[Nous] Initial autoload notice: {e}")
    yield
    # Shutdown logic if any


app = FastAPI(
    title=settings.APP_NAME,
    version=settings.VERSION,
    description="Multi-language codebase intelligence, Tree-sitter AST parser, graph architecture visualizer & semantic retrieval engine.",
    lifespan=lifespan,
)

# CORS Configuration for frontend Vite dev server and preview
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount API routers
app.include_router(ingest_router)
app.include_router(graph_router)
app.include_router(search_router)
app.include_router(analysis_router)
app.include_router(files_router)


@app.get("/api/health")
def health_check():
    return {
        "status": "healthy",
        "service": settings.APP_NAME,
        "version": settings.VERSION,
        "has_active_repo": app_state.scanner is not None,
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="127.0.0.1", port=8000, reload=True)
