from app.routers.ingest import router as ingest_router
from app.routers.graph import router as graph_router
from app.routers.search import router as search_router
from app.routers.analysis import router as analysis_router
from app.routers.files import router as files_router

__all__ = [
    "ingest_router",
    "graph_router",
    "search_router",
    "analysis_router",
    "files_router",
]
