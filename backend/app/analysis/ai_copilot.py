import os
import re
from pathlib import Path
from typing import Dict, List, Optional, Any
from pydantic import BaseModel, Field

from app.scanner import RepoScanner
from app.analysis.framework_analyzer import FrameworkAnalyzer
from app.analysis.database_analyzer import DatabaseAnalyzer
from app.analysis.security_scanner import SecurityScanner
from app.analysis.test_advisor import TestAdvisor


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
        search_res = self.scanner.search_engine.search(query, limit=8)
        cited_files = list({r.relative_path for r in search_res.results})
        cited_symbols = [r.symbol_name for r in search_res.results if r.symbol_name]

        # 1. Architecture, Overview, Frameworks & Tech Stack
        if any(w in q_lower for w in ("architecture", "structure", "overview", "summarize", "how it works", "what does", "tech stack", "framework", "about")):
            framework_analyzer = getattr(self.scanner, "framework_analyzer", None) or FrameworkAnalyzer(self.scanner.root_dir, self.scanner.file_asts)
            framework_report = framework_analyzer.analyze()
            modules = list(self.scanner.graph_store.modules.keys())
            total_files = len(self.scanner.file_asts)
            total_symbols = len(self.scanner.search_engine.symbols)
            facts_count = len(self.scanner.fact_store.facts)
            routes_count = len(self.scanner.fact_store.routes)
            fe_comps = len(framework_report.frontend_components)
            detected_fw = ", ".join(framework_report.detected_frameworks) if framework_report.detected_frameworks else "Multi-language Polyglot"

            md = f"""### Repository Architecture & System Overview

- **Detected Frameworks & Stack**: `{detected_fw}`
- **Source Files**: `{total_files}`
- **AST Symbols & Declarations**: `{total_symbols}`
- **Frontend Components**: `{fe_comps}`
- **API Endpoints**: `{routes_count}`
- **RipEx Relational Facts**: `{facts_count}`

#### Core Architectural Modules & Layers
"""
            for m in modules[:6]:
                md += f"- **`{m}`**: Module cluster with domain logic and internal dependencies.\n"

            if framework_report.frontend_components:
                md += "\n#### Key Frontend Components\n"
                for comp in framework_report.frontend_components[:5]:
                    md += f"- **`{comp.name}`** (`{comp.framework}`) in `{comp.relative_path}`\n"

            if framework_report.backend_layers.controllers:
                md += "\n#### Key Backend Controllers & Routers\n"
                for ctrl in framework_report.backend_layers.controllers[:5]:
                    md += f"- **`{ctrl['name']}`** in `{ctrl['file']}` ({ctrl.get('endpoints_count', 0)} endpoints)\n"

            entrypoint_files = [
                os.path.relpath(f, self.scanner.root_dir).replace("\\", "/")
                for f in self.scanner.file_asts.keys()
                if any(ep in f.lower() for ep in ("main.py", "app.py", "index.ts", "main.ts", "server.js", "app.tsx", "index.tsx", "main.go", "main.rs", "app.vue"))
            ]
            if entrypoint_files:
                md += "\n#### Key System Entrypoints\n"
                for ep in entrypoint_files[:4]:
                    md += f"- `{ep}`\n"

            return CopilotAnswer(
                query=query,
                summary=f"Analyzed {total_files} files across {len(modules)} modules ({detected_fw}).",
                markdown_response=md,
                cited_files=cited_files[:4] or entrypoint_files[:4],
                cited_symbols=cited_symbols[:5],
                suggested_actions=["Explore Frontend Architecture", "View Module Graph", "Inspect API Routes"],
            )

        # 2. Frontend UI Components, State & Hooks
        elif any(w in q_lower for w in ("frontend", "component", "react", "vue", "svelte", "ui", "view", "page", "hook", "state", "props")):
            framework_analyzer = getattr(self.scanner, "framework_analyzer", None) or FrameworkAnalyzer(self.scanner.root_dir, self.scanner.file_asts)
            framework_report = framework_analyzer.analyze()
            comps = framework_report.frontend_components
            md = f"### Frontend UI Component Hierarchy ({len(comps)} Components Detected)\n\n"

            if comps:
                for c in comps[:10]:
                    props_str = ", ".join(c.props[:3]) if c.props else "none"
                    hooks_str = ", ".join(c.hooks_used[:3]) if c.hooks_used else "none"
                    md += f"#### `{c.name}` ({c.framework})\n"
                    md += f"- **Location**: `{c.relative_path}:{c.line_number}`\n"
                    md += f"- **Props**: `{props_str}` | **Hooks**: `{hooks_str}`\n"
                    if c.child_components:
                        md += f"- **Child Elements**: {', '.join([f'`<{tag}/>`' for tag in c.child_components[:4]])}\n"
                    md += "\n"
            else:
                md += "No standalone UI components detected in current AST index. Check if frontend files are located in subdirectories.\n"

            return CopilotAnswer(
                query=query,
                summary=f"Found {len(comps)} UI components and layouts.",
                markdown_response=md,
                cited_files=[c.relative_path for c in comps[:6]],
                cited_symbols=[c.name for c in comps[:6]],
                suggested_actions=["View Frontend Architecture Mode", "Inspect Component Flow"],
            )

        # 3. API Routes, Endpoints, Routers & HTTP
        elif any(w in q_lower for w in ("api", "route", "endpoint", "controller", "http", "get", "post", "put", "delete")):
            routes = self.scanner.fact_store.routes
            md = f"### Discovered API Endpoints & Routes ({len(routes)} Endpoints)\n\n"

            if routes:
                for r in routes[:12]:
                    rel_f = os.path.relpath(r.file_path, self.scanner.root_dir).replace("\\", "/")
                    md += f"- **`{r.http_method.upper()}` `{r.route_path}`**\n"
                    md += f"  - Handler: `{r.handler_name}()` in `{rel_f}:{r.line_number}`\n"
            else:
                md += "No explicit HTTP routes discovered. Check if routes use non-standard decorators or framework conventions.\n"

            return CopilotAnswer(
                query=query,
                summary=f"Cataloged {len(routes)} API route handlers.",
                markdown_response=md,
                cited_files=list({os.path.relpath(r.file_path, self.scanner.root_dir).replace("\\", "/") for r in routes[:8]}),
                cited_symbols=[r.handler_name for r in routes[:8]],
                suggested_actions=["Open API Lifecycle Mapper", "Trace API Flow"],
            )

        # 4. Database Models, SQL Tables & Entities
        elif any(w in q_lower for w in ("database", "db", "sql", "table", "model", "schema", "prisma", "entity", "orm")):
            db_analyzer = getattr(self.scanner, "database_analyzer", None) or DatabaseAnalyzer(self.scanner.root_dir, self.scanner.file_asts)
            db_report = db_analyzer.analyze()
            md = f"### Database Architecture & Data Entities ({len(db_report.tables)} Tables / Models)\n\n"

            if db_report.tables:
                for t in db_report.tables[:10]:
                    col_names = [c.name for c in t.columns[:4]]
                    cols_str = ", ".join(col_names) if col_names else "columns defined in AST"
                    rel_f = os.path.relpath(t.file_path, self.scanner.root_dir).replace("\\", "/")
                    md += f"#### Table: `{t.name}` ({t.model_type})\n"
                    md += f"- **File**: `{rel_f}`\n"
                    md += f"- **Key Columns/Fields**: `{cols_str}`\n"
                    if t.foreign_keys:
                        md += f"- **Foreign Keys**: {', '.join([f'`{fk.from_column} -> {fk.to_table}.{fk.to_column}`' for fk in t.foreign_keys[:3]])}\n"
                    md += "\n"
            else:
                md += "No database tables or ORM models detected in the current index.\n"

            return CopilotAnswer(
                query=query,
                summary=f"Identified {len(db_report.tables)} database entities and tables.",
                markdown_response=md,
                cited_files=[os.path.relpath(t.file_path, self.scanner.root_dir).replace("\\", "/") for t in db_report.tables[:6]],
                cited_symbols=[t.name for t in db_report.tables[:6]],
                suggested_actions=["Open Database Schema Inspector", "View Data Flow"],
            )

        # 5. Security, SAST & Vulnerabilities
        elif any(w in q_lower for w in ("security", "vulnerability", "sast", "secret", "injection", "safe", "cve", "risk")):
            sec_scanner = getattr(self.scanner, "security_scanner", None) or SecurityScanner(self.scanner.file_asts)
            sec_report = sec_scanner.scan()
            findings = sec_report.findings
            md = f"### Static Security & SAST Audit ({len(findings)} Findings)\n\n"

            if findings:
                for f in findings[:8]:
                    md += f"#### [{f.severity.upper()}] `{f.title}`\n"
                    md += f"- **File**: `{f.relative_path}:{f.line_number}`\n"
                    md += f"- **Description**: {f.description}\n"
                    md += f"- **Recommendation**: {f.recommendation}\n\n"
            else:
                md += "✅ No high-severity security vulnerabilities or hardcoded secrets detected!\n"

            return CopilotAnswer(
                query=query,
                summary=f"Security scan complete: {sec_report.critical_count} critical, {sec_report.high_count} high findings.",
                markdown_response=md,
                cited_files=[f.relative_path for f in findings[:6]],
                cited_symbols=[],
                suggested_actions=["Open Security & SAST Modal", "Review PR Impact"],
            )

        # 6. Dead Code & Refactoring
        elif any(w in q_lower for w in ("dead code", "unused", "clean", "refactor", "clone", "duplicate")):
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

        # 7. Testing Strategy & Advisor
        elif any(w in q_lower for w in ("test", "testing", "coverage", "unit test", "advisor", "qa")):
            test_advisor = getattr(self.scanner, "test_advisor", None) or TestAdvisor(self.scanner.file_asts, self.scanner.graph_store)
            test_report = test_advisor.analyze()
            candidates = test_report.untested_candidates
            md = f"### Automated Test Advisor & Coverage Recommendations\n\n"
            md += f"- **Risk Index**: `{test_report.untested_risk_index}/100`\n"
            md += f"- **Suggested Priority Functions to Test**:\n"
            for c in candidates[:6]:
                md += f"  - **`{c.symbol_name}`** (`{c.relative_path}:{c.line_number}`) — *Complexity: {c.cyclomatic_complexity}, Callers: {c.caller_count}*\n"

            return CopilotAnswer(
                query=query,
                summary=f"Recommended tests for {len(candidates)} high-complexity functions.",
                markdown_response=md,
                cited_files=[c.relative_path for c in candidates[:5]],
                cited_symbols=[c.symbol_name for c in candidates[:5]],
                suggested_actions=["Open Test Advisor Modal", "Run Automated Code Review"],
            )

        # 8. General Semantic Retrieval & Symbol Q&A
        else:
            md = f"### Code Intelligence Search Results for *\"{query}\"*\n\n"
            if search_res.results:
                for idx, r in enumerate(search_res.results[:6], 1):
                    md += f"#### {idx}. `{r.symbol_name or r.relative_path}` ({r.symbol_kind or 'file'})\n"
                    md += f"- **File**: `{r.relative_path}:{r.start_line}`\n"
                    if r.matched_snippet:
                        md += f"```\n{r.matched_snippet[:200]}\n```\n\n"
            else:
                # Fallback: List top files and modules
                top_files = [os.path.relpath(f, self.scanner.root_dir).replace("\\", "/") for f in list(self.scanner.file_asts.keys())[:5]]
                md += f"No direct match for *\"{query}\"*. Here are key components in the repository:\n\n"
                for tf in top_files:
                    md += f"- `{tf}`\n"

            return CopilotAnswer(
                query=query,
                summary=f"Retrieved {len(search_res.results)} relevant symbols from the Knowledge Graph.",
                markdown_response=md,
                cited_files=cited_files[:6],
                cited_symbols=cited_symbols[:6],
                suggested_actions=["Calculate Blast Radius", "View Call Graph", "Open Knowledge Graph"],
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
