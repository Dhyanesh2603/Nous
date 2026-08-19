from contextlib import asynccontextmanager
import os
from pathlib import Path
from fastapi import FastAPI
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.routers import (
    ingest_router,
    graph_router,
    search_router,
    analysis_router,
    files_router,
    facts_router,
    database_router,
    security_router,
    performance_router,
    framework_router,
    health_score_router,
    copilot_router,
    timeline_router,
    api_flow_router,
    dependencies_router,
    compare_router,
    code_review_router,
)
from app.state import app_state


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: auto-load Python sample fixture if available, or backend itself
    try:
        py_fixture = Path("D:/Nous/backend/tests/fixtures/python_project")
        if py_fixture.exists():
            print(f"[Nous] Pre-loading default sample repository: {py_fixture}")
            app_state.load_repository(str(py_fixture.resolve()))
        else:
            print(f"[Nous] Pre-loading self repository: D:\\Nous")
            app_state.load_repository(r"D:\Nous")
    except Exception as e:
        print(f"[Nous] Initial autoload notice: {e}")
    yield
    # Shutdown logic if any


app = FastAPI(
    title=settings.APP_NAME,
    version="0.5.0",
    description="Software Intelligence Platform with RipEx AST, Timeline Replay, API Flow, Supply Chain, and AI Copilot.",
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
app.include_router(facts_router)
app.include_router(database_router)
app.include_router(security_router)
app.include_router(performance_router)
app.include_router(framework_router)
app.include_router(health_score_router)
app.include_router(copilot_router)
app.include_router(timeline_router)
app.include_router(api_flow_router)
app.include_router(dependencies_router)
app.include_router(compare_router)
app.include_router(code_review_router)


@app.get("/")
def root():
    return {
        "message": "Welcome to Nous Software Intelligence Platform",
        "version": "0.5.0",
        "docs_url": "/docs",
        "health_url": "/api/health",
        "frontend_url": "http://127.0.0.1:5173",
    }


@app.get("/api/health")
def health_check():
    return {
        "status": "healthy",
        "service": settings.APP_NAME,
        "version": "0.5.0",
        "has_active_repo": app_state.scanner is not None,
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="127.0.0.1", port=8000, reload=True)
