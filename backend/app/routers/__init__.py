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
from app.routers.dead_code import router as dead_code_router
from app.routers.impact import router as impact_router
from app.routers.data_flow import router as data_flow_router
from app.routers.api_mapper import router as api_mapper_router
from app.routers.architecture import router as architecture_router
from app.routers.drift import router as drift_router
from app.routers.tech_debt import router as tech_debt_router
from app.routers.module_health import router as module_health_router
from app.routers.refactoring import router as refactoring_router
from app.routers.doc_gen import router as doc_gen_router
from app.routers.pr_analyzer import router as pr_analyzer_router
from app.routers.nl_search import router as nl_search_router
from app.routers.test_advisor import router as test_advisor_router
from app.routers.time_machine import router as time_machine_router
from app.routers.playback import router as playback_router
from app.routers.knowledge_graph import router as knowledge_graph_router
from app.routers.migration_planner import router as migration_planner_router

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
    "dead_code_router",
    "impact_router",
    "data_flow_router",
    "api_mapper_router",
    "architecture_router",
    "drift_router",
    "tech_debt_router",
    "module_health_router",
    "refactoring_router",
    "doc_gen_router",
    "pr_analyzer_router",
    "nl_search_router",
    "test_advisor_router",
    "time_machine_router",
    "playback_router",
    "knowledge_graph_router",
    "migration_planner_router",
]
