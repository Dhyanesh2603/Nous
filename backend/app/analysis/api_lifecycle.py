import os
import re
from typing import Dict, List, Optional, Any
from pydantic import BaseModel, Field

from app.scanner import RepoScanner


class ApiPipelineStep(BaseModel):
    step_number: int
    stage: str  # 'Client', 'Middleware', 'Auth Guard', 'Controller', 'Service', 'Database', 'Response'
    title: str
    description: str
    file_path: Optional[str] = None
    line_number: Optional[int] = None
    symbol_name: Optional[str] = None


class EndpointLifecycle(BaseModel):
    id: str
    http_method: str
    route_path: str
    handler_name: str
    file_path: str
    relative_path: str
    line_number: int
    summary: str
    middleware_chain: List[str] = Field(default_factory=list)
    auth_required: bool = False
    database_models_touched: List[str] = Field(default_factory=list)
    downstream_services: List[str] = Field(default_factory=list)
    pipeline_steps: List[ApiPipelineStep] = Field(default_factory=list)


class ApiFlowCatalog(BaseModel):
    total_endpoints: int
    endpoints: List[EndpointLifecycle] = Field(default_factory=list)


class ApiLifecycleAnalyzer:
    def __init__(self, scanner: Optional[RepoScanner]):
        self.scanner = scanner

    def build_catalog(self) -> ApiFlowCatalog:
        if not self.scanner or not self.scanner.fact_store.routes:
            return ApiFlowCatalog(total_endpoints=0, endpoints=[])

        endpoints: List[EndpointLifecycle] = []

        for idx, route in enumerate(self.scanner.fact_store.routes):
            handler_sym = route.handler_name
            rel_file = route.relative_path
            full_file = route.file_path
            
            # Find downstream calls from handler
            downstream_services = []
            db_models = []
            auth_required = False

            if self.scanner.call_builder:
                for edge in self.scanner.call_builder.edges:
                    if edge.caller_name == handler_sym or edge.caller_id == route.handler_symbol_id:
                        callee = edge.callee_name
                        if "service" in callee.lower() or "manager" in callee.lower():
                            downstream_services.append(callee)
                        if "user" in callee.lower() or "model" in callee.lower() or "db" in callee.lower():
                            db_models.append(callee)
                        if any(k in callee.lower() for k in ("auth", "jwt", "token", "permission", "guard")):
                            auth_required = True

            # Also check file content for auth decorators
            ast = self.scanner.file_asts.get(full_file)
            if ast:
                for sym in ast.symbols:
                    if sym.name == handler_sym:
                        if any("auth" in d.lower() or "jwt" in d.lower() or "depend" in d.lower() for d in sym.decorators):
                            auth_required = True

            # Construct Lifecycle Pipeline Steps
            pipeline_steps = [
                ApiPipelineStep(
                    step_number=1,
                    stage="Client",
                    title="Incoming HTTP Request",
                    description=f"{route.http_method} {route.route_path}",
                ),
                ApiPipelineStep(
                    step_number=2,
                    stage="Middleware",
                    title="CORS & Exception Middleware",
                    description="Request header parsing, CORS verification, and logging.",
                ),
            ]

            if auth_required:
                pipeline_steps.append(
                    ApiPipelineStep(
                        step_number=3,
                        stage="Auth Guard",
                        title="Authentication & Token Validation",
                        description="Verify JWT bearer token and authorization scope.",
                    )
                )

            pipeline_steps.append(
                ApiPipelineStep(
                    step_number=len(pipeline_steps) + 1,
                    stage="Controller",
                    title=f"Route Handler: {handler_sym}()",
                    description=f"Validate request schema and execute controller in {rel_file}:{route.line_number}",
                    file_path=full_file,
                    line_number=route.line_number,
                    symbol_name=handler_sym,
                )
            )

            if downstream_services:
                pipeline_steps.append(
                    ApiPipelineStep(
                        step_number=len(pipeline_steps) + 1,
                        stage="Service",
                        title=f"Domain Service: {', '.join(downstream_services[:2])}()",
                        description="Execute core business rules and calculations.",
                    )
                )

            if db_models:
                pipeline_steps.append(
                    ApiPipelineStep(
                        step_number=len(pipeline_steps) + 1,
                        stage="Database",
                        title=f"Persistence Query: {', '.join(db_models[:2])}",
                        description="Query and persist entity state in database.",
                    )
                )

            pipeline_steps.append(
                ApiPipelineStep(
                    step_number=len(pipeline_steps) + 1,
                    stage="Response",
                    title="JSON HTTP Response",
                    description=f"Serialize output model with HTTP 200 OK status.",
                )
            )

            endpoints.append(
                EndpointLifecycle(
                    id=f"EP_{idx+1}",
                    http_method=route.http_method,
                    route_path=route.route_path,
                    handler_name=handler_sym,
                    file_path=full_file,
                    relative_path=rel_file,
                    line_number=route.line_number,
                    summary=f"Dispatched by {handler_sym}() in {rel_file}",
                    middleware_chain=["CORSMiddleware", "AuthGuard"] if auth_required else ["CORSMiddleware"],
                    auth_required=auth_required,
                    database_models_touched=list(set(db_models))[:3],
                    downstream_services=list(set(downstream_services))[:3],
                    pipeline_steps=pipeline_steps,
                )
            )

        return ApiFlowCatalog(total_endpoints=len(endpoints), endpoints=endpoints)
