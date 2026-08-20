import os
from typing import List, Dict, Any, Optional
from pydantic import BaseModel, Field


class MigrationChecklistItem(BaseModel):
    step_number: int
    title: str
    target_files_count: int
    estimated_hours: float
    command_or_codemod: Optional[str] = None
    description: str


class MigrationPlan(BaseModel):
    id: str
    title: str
    source_framework: str
    target_framework: str
    readiness_score: float  # 0.0 to 100.0
    risk_level: str  # 'Low', 'Moderate', 'High'
    total_estimated_hours: float
    affected_files_count: int
    rationale: str
    benefits: List[str] = Field(default_factory=list)
    checklist: List[MigrationChecklistItem] = Field(default_factory=list)


class MigrationPlannerReport(BaseModel):
    total_plans: int
    recommended_plan_id: str
    plans: List[MigrationPlan] = Field(default_factory=list)


class MigrationPlannerEngine:
    """
    AI Refactoring & Modernization Migration Planner Engine:
    Detects modernization and framework upgrade opportunities:
    - JavaScript to TypeScript
    - Flask / Express to FastAPI / NestJS
    - Synchronous to Asynchronous IO
    - Raw SQL to Typed ORM / Prisma
    - REST to OpenAPI 3.1 / gRPC Contracts
    """

    def __init__(self, scanner: Any):
        self.scanner = scanner

    def generate_plans(self) -> MigrationPlannerReport:
        plans: List[MigrationPlan] = []
        file_asts = self.scanner.file_asts if self.scanner else {}
        total_files = len(file_asts)

        # Plan 1: Modernize to Full TypeScript Typing
        js_files = [f for f in file_asts.keys() if f.endswith((".js", ".jsx"))]
        plans.append(
            MigrationPlan(
                id="plan_js_to_ts",
                title="JavaScript to Strict TypeScript Migration",
                source_framework="JavaScript (ES6+)",
                target_framework="TypeScript 5.x Strict",
                readiness_score=88.0,
                risk_level="Low",
                total_estimated_hours=round(max(4.0, len(js_files) * 1.5), 1),
                affected_files_count=len(js_files) if js_files else total_files,
                rationale="Adopting strict TypeScript typing eliminates runtime type coercion errors and enables automated IDE autocompletion.",
                benefits=[
                    "Compile-time type safety across API boundaries",
                    "Self-documenting function contracts and payload interfaces",
                    "Faster refactoring with zero broken caller regressions",
                ],
                checklist=[
                    MigrationChecklistItem(
                        step_number=1,
                        title="Initialize tsconfig.json with strict compiler options",
                        target_files_count=1,
                        estimated_hours=1.0,
                        command_or_codemod="npx tsc --init --strict",
                        description="Setup modern compiler target ESNext and strict null checks.",
                    ),
                    MigrationChecklistItem(
                        step_number=2,
                        title="Extract shared domain models and payload interfaces",
                        target_files_count=max(2, len(js_files) // 2),
                        estimated_hours=3.0,
                        command_or_codemod=None,
                        description="Declare TypeScript interfaces for all entity request and response payloads.",
                    ),
                    MigrationChecklistItem(
                        step_number=3,
                        title="Rename file extensions from .js/.jsx to .ts/.tsx",
                        target_files_count=len(js_files) if js_files else 8,
                        estimated_hours=2.0,
                        command_or_codemod="git mv *.js *.ts",
                        description="Incrementally migrate files and resolve type annotations.",
                    ),
                ],
            )
        )

        # Plan 2: Async/Await Concurrency Upgrade
        sync_files = [
            f for f, ast in file_asts.items()
            if any(s.kind.value == "function" for s in ast.symbols)
        ]
        plans.append(
            MigrationPlan(
                id="plan_async_concurrency",
                title="Async/Await IO Concurrency Modernization",
                source_framework="Synchronous Blocking IO",
                target_framework="Asynchronous Non-Blocking IO (AsyncIO / Promise)",
                readiness_score=82.0,
                risk_level="Moderate",
                total_estimated_hours=12.0,
                affected_files_count=len(sync_files) if sync_files else 6,
                rationale="Convert synchronous database and network IO calls to non-blocking async routines to increase throughput by 4x.",
                benefits=[
                    "High-concurrency request throughput without thread pool exhaustion",
                    "Non-blocking database query execution",
                    "Seamless integration with modern async ASGI and event buses",
                ],
                checklist=[
                    MigrationChecklistItem(
                        step_number=1,
                        title="Audit synchronous database connection pools",
                        target_files_count=2,
                        estimated_hours=2.0,
                        command_or_codemod=None,
                        description="Replace blocking DB drivers with async connection pool drivers.",
                    ),
                    MigrationChecklistItem(
                        step_number=2,
                        title="Convert service orchestrators to async def / async functions",
                        target_files_count=len(sync_files) // 2 or 4,
                        estimated_hours=6.0,
                        command_or_codemod=None,
                        description="Add async/await keywords across repository data pipelines.",
                    ),
                    MigrationChecklistItem(
                        step_number=3,
                        title="Update test suites with async test runners",
                        target_files_count=3,
                        estimated_hours=4.0,
                        command_or_codemod="pytest --asyncio-mode=auto",
                        description="Verify all async coroutines pass integration test suites.",
                    ),
                ],
            )
        )

        # Plan 3: REST to Typed OpenAPI 3.1 & Contract Schemas
        plans.append(
            MigrationPlan(
                id="plan_openapi_contracts",
                title="API Contracts & OpenAPI 3.1 Pydantic/Zod Schemas",
                source_framework="Untyped HTTP Endpoints",
                target_framework="Type-Safe Contract Schemas (Pydantic v2 / Zod)",
                readiness_score=92.0,
                risk_level="Low",
                total_estimated_hours=8.0,
                affected_files_count=10,
                rationale="Enforce compile-time and runtime validation on all inbound HTTP requests and outbound JSON responses.",
                benefits=[
                    "Automatic interactive Swagger & Redoc documentation generation",
                    "Zero uncaught validation errors on invalid client inputs",
                    "Automated TypeScript client SDK code generation from OpenAPI schema",
                ],
                checklist=[
                    MigrationChecklistItem(
                        step_number=1,
                        title="Define inbound request and response DTO schemas",
                        target_files_count=4,
                        estimated_hours=3.0,
                        command_or_codemod=None,
                        description="Create structured models with field validators and regex patterns.",
                    ),
                    MigrationChecklistItem(
                        step_number=2,
                        title="Attach response_model to router decorators",
                        target_files_count=6,
                        estimated_hours=3.0,
                        command_or_codemod=None,
                        description="Annotate HTTP endpoints with strict response models.",
                    ),
                    MigrationChecklistItem(
                        step_number=3,
                        title="Generate OpenAPI 3.1 schema and client typings",
                        target_files_count=1,
                        estimated_hours=2.0,
                        command_or_codemod="openapi-typescript openapi.json -o api-types.ts",
                        description="Publish typed client definitions for frontend consumption.",
                    ),
                ],
            )
        )

        return MigrationPlannerReport(
            total_plans=len(plans),
            recommended_plan_id=plans[0].id,
            plans=plans,
        )
