import os
import re
from pathlib import Path
from typing import Dict, List, Optional, Any
from pydantic import BaseModel, Field

from app.scanner import RepoScanner


class CopilotAnswer(BaseModel):
    query: str
    summary: str
    markdown_response: str
    cited_files: List[str] = Field(default_factory=list)
    cited_symbols: List[str] = Field(default_factory=list)
    suggested_actions: List[str] = Field(default_factory=list)


class ImpactPredictionReport(BaseModel):
    target: str
    target_type: str  # 'file' or 'symbol'
    breaking_change_probability: int  # 0 - 100
    risk_level: str  # 'Low', 'Medium', 'High', 'Critical'
    affected_files_count: int
    affected_symbols_count: int
    affected_routes: List[str] = Field(default_factory=list)
    affected_tables: List[str] = Field(default_factory=list)
    affected_files: List[str] = Field(default_factory=list)
    suggested_tests: List[str] = Field(default_factory=list)


class OnboardingStep(BaseModel):
    step_number: int
    title: str
    description: str
    key_files: List[str] = Field(default_factory=list)
    key_symbols: List[str] = Field(default_factory=list)
    learning_goal: str


class OnboardingRoadmap(BaseModel):
    repo_name: str
    primary_languages: List[str] = Field(default_factory=list)
    estimated_reading_time_minutes: int
    total_steps: int
    steps: List[OnboardingStep] = Field(default_factory=list)


class AICopilotEngine:
    def __init__(self, scanner: Optional[RepoScanner]):
        self.scanner = scanner

    def answer_query(self, query: str) -> CopilotAnswer:
        if not self.scanner:
            return CopilotAnswer(
                query=query,
                summary="No repository is currently loaded in Nous.",
                markdown_response="Please open or scan a codebase to ask questions.",
            )

        q_lower = query.lower()
        search_res = self.scanner.search_engine.search(query, limit=5)
        cited_files = list({r.relative_path for r in search_res.results})
        cited_symbols = [r.symbol_name for r in search_res.results if r.symbol_name]

        # 1. Architecture / Structure explanation
        if any(w in q_lower for w in ("architecture", "structure", "overview", "summarize", "how it works")):
            modules = list(self.scanner.graph_store.modules.keys())
            total_files = len(self.scanner.file_asts)
            total_symbols = len(self.scanner.search_engine.symbols)
            facts_count = len(self.scanner.fact_store.facts)
            routes_count = len(self.scanner.fact_store.routes)

            md = f"""### Repository Architectural Summary

- **Total Source Files**: `{total_files}`
- **AST Symbols**: `{total_symbols}`
- **RipEx Relational Facts**: `{facts_count}`
- **API Endpoints Discovered**: `{routes_count}`

#### Core Modules & Packages
"""
            for m in modules[:6]:
                md += f"- **`{m}`**: Contains domain logic and service bindings.\n"

            md += f"""
#### Key Entrypoints
"""
            for f in self.scanner.file_asts.keys():
                if any(ep in f.lower() for ep in ("main.py", "app.py", "index.ts", "main.ts", "server.js", "app.tsx")):
                    md += f"- [`{os.path.relpath(f, self.scanner.root_dir)}`](file:///{f})\n"

            return CopilotAnswer(
                query=query,
                summary=f"Analyzed {total_files} files across {len(modules)} architectural modules.",
                markdown_response=md,
                cited_files=cited_files[:4],
                cited_symbols=cited_symbols[:5],
                suggested_actions=["View Module Graph", "Run Rules Linter", "Explore RipEx Facts"],
            )

        # 2. Authentication Flow
        elif any(w in q_lower for w in ("auth", "jwt", "login", "token", "password", "session")):
            auth_symbols = [s for s in self.scanner.search_engine.symbols if any(k in s.name.lower() for k in ("auth", "jwt", "token", "login", "user", "session"))]
            auth_files = list({os.path.relpath(s.file_path, self.scanner.root_dir) for s in auth_symbols})

            md = f"""### Authentication & Authorization Lifecycle

Nous identified **{len(auth_symbols)} symbols** and **{len(auth_files)} files** responsible for identity and session lifecycle:

#### Relevant Files & Handlers:
"""
            for af in auth_files[:5]:
                md += f"- **`{af}`**\n"

            md += f"""
#### Key Authentication Functions:
"""
            for sym in auth_symbols[:6]:
                md += f"- `{sym.name}()` ({sym.kind}) in `{os.path.relpath(sym.file_path, self.scanner.root_dir)}:{sym.start_line}`\n"

            return CopilotAnswer(
                query=query,
                summary=f"Found {len(auth_symbols)} authentication components across {len(auth_files)} files.",
                markdown_response=md,
                cited_files=auth_files[:5],
                cited_symbols=[s.name for s in auth_symbols[:6]],
                suggested_actions=["Trace Login Sequence Diagram", "Check Hardcoded Secrets", "Inspect API Routes"],
            )

        # 3. Dead code / duplicate search
        elif "dead code" in q_lower or "unused" in q_lower:
            dead_code = self.scanner.analyzer.detect_dead_code()
            md = f"### Dead Code & Unreferenced Symbols ({len(dead_code)} detected)\n\n"
            for dc in dead_code[:8]:
                md += f"- **`{dc.name}`** ({dc.kind}) in `{dc.relative_path}:{dc.line_number}` — *{dc.reason}*\n"

            return CopilotAnswer(
                query=query,
                summary=f"Detected {len(dead_code)} unreferenced AST symbols.",
                markdown_response=md,
                cited_files=list({d.relative_path for d in dead_code[:8]}),
                suggested_actions=["Refactor Dead Code", "View Clones Explorer"],
            )

        # 4. General Search & Retrieval Q&A
        else:
            md = f"### Code Intelligence Search Results for *\"{query}\"*\n\n"
            if search_res.results:
                for idx, r in enumerate(search_res.results[:5], 1):
                    md += f"#### {idx}. `{r.symbol_name or r.relative_path}` ({r.symbol_kind or 'file'})\n"
                    md += f"- **File**: `{r.relative_path}:{r.start_line}`\n"
                    if r.matched_snippet:
                        md += f"```python\n{r.matched_snippet[:160]}\n```\n\n"
            else:
                md += "No specific symbol matches found. Try searching for module names, functions, or architectural terms."

            return CopilotAnswer(
                query=query,
                summary=f"Retrieved {len(search_res.results)} relevant symbols from the Knowledge Graph.",
                markdown_response=md,
                cited_files=cited_files,
                cited_symbols=cited_symbols,
                suggested_actions=["Calculate Blast Radius", "View Call Graph"],
            )

    def predict_impact(self, target_identifier: str) -> ImpactPredictionReport:
        if not self.scanner:
            return ImpactPredictionReport(
                target=target_identifier,
                target_type="file",
                breaking_change_probability=0,
                risk_level="Low",
                affected_files_count=0,
                affected_symbols_count=0,
            )

        # Use blast radius calculation
        blast = self.scanner.graph_store.calculate_blast_radius(target_identifier, max_depth=3)
        
        affected_files = [item.file_path for item in blast.impact_items if item.type == "file"]
        affected_symbols = [item.name for item in blast.impact_items if item.type == "symbol"]
        
        # Determine risk level
        total_impact = blast.total_impacted_symbols + blast.total_impacted_files
        if total_impact > 15:
            risk_level = "Critical"
            prob = 90
        elif total_impact > 8:
            risk_level = "High"
            prob = 70
        elif total_impact > 3:
            risk_level = "Medium"
            prob = 40
        else:
            risk_level = "Low"
            prob = 15

        # Check affected routes
        affected_routes = []
        for r in self.scanner.fact_store.routes:
            if any(af in r.file_path for af in affected_files) or r.handler_name in affected_symbols:
                affected_routes.append(f"{r.http_method} {r.route_path}")

        # Suggested tests
        suggested_tests = [
            f"Run unit tests covering {target_identifier}",
            "Verify downstream caller integration tests",
        ]
        if affected_routes:
            suggested_tests.append(f"Execute HTTP smoke tests on: {', '.join(affected_routes[:3])}")

        return ImpactPredictionReport(
            target=target_identifier,
            target_type=blast.target_type,
            breaking_change_probability=prob,
            risk_level=risk_level,
            affected_files_count=blast.total_impacted_files,
            affected_symbols_count=blast.total_impacted_symbols,
            affected_routes=affected_routes,
            affected_files=[os.path.relpath(f, self.scanner.root_dir) for f in affected_files[:8]],
            suggested_tests=suggested_tests,
        )

    def generate_onboarding_roadmap(self) -> OnboardingRoadmap:
        if not self.scanner:
            return OnboardingRoadmap(
                repo_name="Repository",
                estimated_reading_time_minutes=15,
                total_steps=0,
                steps=[],
            )

        steps = []
        step_no = 1

        # Step 1: System Entrypoint
        entrypoint_files = [
            os.path.relpath(f, self.scanner.root_dir)
            for f in self.scanner.file_asts.keys()
            if any(ep in f.lower() for ep in ("main.py", "app.py", "index.ts", "main.ts", "server.js", "app.tsx"))
        ]
        if entrypoint_files:
            steps.append(
                OnboardingStep(
                    step_number=step_no,
                    title="System Entrypoint & Application Bootstrap",
                    description="Understand how the server boots, initializes middlewares, and loads environment variables.",
                    key_files=entrypoint_files[:3],
                    learning_goal="Learn application startup flow and dependency wiring.",
                )
            )
            step_no += 1

        # Step 2: Routing & HTTP Controllers
        if self.scanner.fact_store.routes:
            route_files = list({r.relative_path for r in self.scanner.fact_store.routes})
            steps.append(
                OnboardingStep(
                    step_number=step_no,
                    title="API Routing & Controller Layer",
                    description="Explore all public and internal REST/GraphQL endpoints exposed by the backend.",
                    key_files=route_files[:4],
                    key_symbols=[r.handler_name for r in self.scanner.fact_store.routes[:5]],
                    learning_goal="Understand request validation, authentication guards, and response contracts.",
                )
            )
            step_no += 1

        # Step 3: Domain Services & Business Logic
        service_files = [
            os.path.relpath(f, self.scanner.root_dir)
            for f in self.scanner.file_asts.keys()
            if any(k in f.lower() for k in ("service", "manager", "processor", "pipeline"))
        ]
        if service_files:
            steps.append(
                OnboardingStep(
                    step_number=step_no,
                    title="Core Domain Services & Processing Pipelines",
                    description="Review core business operations, algorithm processors, and external integrations.",
                    key_files=service_files[:4],
                    learning_goal="Master business rules, state transitions, and asynchronous operations.",
                )
            )
            step_no += 1

        # Step 4: Data Models & Persistence
        model_files = [
            os.path.relpath(f, self.scanner.root_dir)
            for f in self.scanner.file_asts.keys()
            if any(k in f.lower() for k in ("model", "schema", "entity", "dto", "database"))
        ]
        if model_files:
            steps.append(
                OnboardingStep(
                    step_number=step_no,
                    title="Data Models & Persistence Schemas",
                    description="Explore database entities, relations, data transfer objects, and caching schemas.",
                    key_files=model_files[:4],
                    learning_goal="Understand entity relationships, primary keys, and table foreign key mappings.",
                )
            )
            step_no += 1

        languages = list({ast.language for ast in self.scanner.file_asts.values()})

        return OnboardingRoadmap(
            repo_name=os.path.basename(self.scanner.root_dir) or "Codebase",
            primary_languages=languages,
            estimated_reading_time_minutes=step_no * 10,
            total_steps=len(steps),
            steps=steps,
        )

    def generate_documentation(self) -> str:
        if not self.scanner:
            return "# Codebase Documentation\n\nNo repository loaded."

        repo_name = os.path.basename(self.scanner.root_dir) or "Codebase"
        total_files = len(self.scanner.file_asts)
        total_symbols = len(self.scanner.search_engine.symbols)
        languages = list({ast.language for ast in self.scanner.file_asts.values()})

        doc = f"""# {repo_name} - Architecture & Developer Guide

Generated automatically by **Nous Software Intelligence Platform (RipEx v0.3.0 Engine)**.

---

## 📊 Codebase Overview
- **Total Files**: `{total_files}`
- **AST Symbols & Definitions**: `{total_symbols}`
- **Primary Languages**: {', '.join([f'`{lang}`' for lang in languages])}
- **Relational Facts**: `{len(self.scanner.fact_store.facts)}`

---

## 🏗️ Architectural Modules
"""
        for mod_name, cluster in self.scanner.graph_store.modules.items():
            doc += f"### Module: `{mod_name}`\n"
            doc += f"- **Files ({len(cluster.file_paths)})**: {', '.join([f'`{os.path.basename(f)}`' for f in cluster.file_paths[:5]])}\n"
            doc += f"- **Afferent Coupling (Ca)**: `{cluster.afferent_coupling}` | **Efferent Coupling (Ce)**: `{cluster.efferent_coupling}` | **Instability**: `{cluster.instability:.2f}`\n\n"

        if self.scanner.fact_store.routes:
            doc += f"""---

## 🌐 API Routes Catalog ({len(self.scanner.fact_store.routes)} endpoints)

| Method | Route Path | Handler Function | File Location |
|---|---|---|---|
"""
            for r in self.scanner.fact_store.routes:
                doc += f"| `{r.http_method}` | `{r.route_path}` | `{r.handler_name}()` | `{r.relative_path}:{r.line_number}` |\n"

        return doc
