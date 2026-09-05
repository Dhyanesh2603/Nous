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
    timeline_router,
    api_flow_router,
    dependencies_router,
    compare_router,
    code_review_router,
    dead_code_router,
    impact_router,
    data_flow_router,
    api_mapper_router,
    architecture_router,
    drift_router,
    tech_debt_router,
    module_health_router,
    refactoring_router,
    doc_gen_router,
    pr_analyzer_router,
    test_advisor_router,
    time_machine_router,
    playback_router,
    knowledge_graph_router,
    migration_planner_router,
    executive_report_router,
    architect_ai_router,
    ripple_router,
)
from app.state import app_state


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Keep state clean until the user explicitly selects or ingests a repository
    yield
    # Shutdown logic if any


app = FastAPI(
    title=settings.APP_NAME,
    version="1.0.0",
    description="Enterprise Software Intelligence Platform with Time Machine, Execution Playback, Multi-Entity Knowledge Graph, and Migration Planner.",
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

# Mount API routers (Total 30 routers)
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
app.include_router(timeline_router)
app.include_router(api_flow_router)
app.include_router(dependencies_router)
app.include_router(compare_router)
app.include_router(code_review_router)
app.include_router(dead_code_router)
app.include_router(impact_router)
app.include_router(data_flow_router)
app.include_router(api_mapper_router)
app.include_router(architecture_router)
app.include_router(drift_router)
app.include_router(tech_debt_router)
app.include_router(module_health_router)
app.include_router(refactoring_router)
app.include_router(doc_gen_router)
app.include_router(pr_analyzer_router)
app.include_router(test_advisor_router)
app.include_router(time_machine_router)
app.include_router(playback_router)
app.include_router(knowledge_graph_router)
app.include_router(migration_planner_router)
app.include_router(executive_report_router)
app.include_router(architect_ai_router)
app.include_router(ripple_router)


@app.get("/api/health")
def health_check():
    return {
        "status": "healthy",
        "service": settings.APP_NAME,
        "version": "1.0.0",
        "has_active_repo": app_state.scanner is not None,
    }


# Static Frontend SPA Serving (Single-Container / Production Deployment)
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

frontend_dist = Path(__file__).resolve().parent.parent.parent / "frontend" / "dist"
if not frontend_dist.exists():
    frontend_dist = Path(__file__).resolve().parent.parent / "static"

if frontend_dist.exists() and (frontend_dist / "index.html").exists():
    assets_dir = frontend_dist / "assets"
    if assets_dir.exists():
        app.mount("/assets", StaticFiles(directory=str(assets_dir)), name="assets")

    @app.get("/{full_path:path}")
    async def serve_spa(full_path: str):
        target = frontend_dist / full_path
        if full_path and target.is_file():
            return FileResponse(target)
        return FileResponse(frontend_dist / "index.html")
else:
    @app.get("/")
    def root():
        return {
            "message": "Welcome to Nous Enterprise Software Intelligence Platform",
            "version": "1.0.0",
            "docs_url": "/docs",
            "health_url": "/api/health",
            "frontend_url": "http://127.0.0.1:5173",
        }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="127.0.0.1", port=8000, reload=True)
