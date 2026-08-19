from app.routers.ingest import router as ingest_router
from app.routers.graph import router as graph_router
from app.routers.search import router as search_router
from app.routers.analysis import router as analysis_router
from app.routers.files import router as files_router
from app.routers.facts import router as facts_router
from app.routers.database import router as database_router
from app.routers.security import router as security_router
from app.routers.performance import router as performance_router
from app.routers.framework import router as framework_router
from app.routers.health_score import router as health_score_router
from app.routers.copilot import router as copilot_router
from app.routers.timeline import router as timeline_router
from app.routers.api_flow import router as api_flow_router
from app.routers.dependencies import router as dependencies_router
from app.routers.compare import router as compare_router
from app.routers.code_review import router as code_review_router

__all__ = [
    "ingest_router",
    "graph_router",
    "search_router",
    "analysis_router",
    "files_router",
    "facts_router",
    "database_router",
    "security_router",
    "performance_router",
    "framework_router",
    "health_score_router",
    "copilot_router",
    "timeline_router",
    "api_flow_router",
    "dependencies_router",
    "compare_router",
    "code_review_router",
]
