import os
from datetime import datetime
from typing import List, Dict, Any, Optional
from pydantic import BaseModel, Field

from app.parsers.symbol_types import FileAST, SymbolKind


class GeneratedDocSection(BaseModel):
    title: str
    doc_type: str  # 'onboarding', 'architecture', 'api_reference', 'data_models', 'modules'
    markdown_content: str
    summary: str
    symbols_covered_count: int


class DocumentationReport(BaseModel):
    repository_name: str
    generated_at: str
    total_sections: int
    sections: List[GeneratedDocSection] = Field(default_factory=list)


class DocGenerator:
    """
    Automatic Documentation Generator Engine:
    Synthesizes production-ready markdown documentation from parsed ASTs,
    relational facts, database models, and API route catalogs.
    """

    def __init__(self, scanner: Any):
        self.scanner = scanner

    def generate(self) -> DocumentationReport:
        now_str = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        repo_name = (
            os.path.basename(self.scanner.root_dir)
            if self.scanner and self.scanner.root_dir
            else "Repository"
        )
        sections: List[GeneratedDocSection] = []

        if not self.scanner or not self.scanner.file_asts:
            return DocumentationReport(
                repository_name=repo_name,
                generated_at=now_str,
                total_sections=0,
                sections=[],
            )

        file_asts = self.scanner.file_asts
        all_symbols = (
            list(self.scanner.graph_store.call_builder.symbols_by_id.values())
            if self.scanner.graph_store and self.scanner.graph_store.call_builder
            else []
        )

        # 1. Onboarding & Getting Started Guide
        onboarding_md = f"""# Developer Onboarding Guide — {repo_name}

Welcome to the **{repo_name}** codebase! This onboarding guide is automatically generated from live AST symbols and architectural topology.

## Quick Repository Snapshot
- **Total Source Files**: {len(file_asts)}
- **Total Functions & Methods**: {len([s for s in all_symbols if s.kind in (SymbolKind.FUNCTION, SymbolKind.METHOD, SymbolKind.ASYNC_FUNCTION)])}
- **Total Data Classes & Interfaces**: {len([s for s in all_symbols if s.kind in (SymbolKind.CLASS, SymbolKind.INTERFACE)])}
- **Primary Architecture Pattern**: Layered Service Architecture with RipEx AST Indexing

## High-Level Directory Layout
"""
        dirs = sorted({os.path.dirname(ast.relative_path.replace('\\', '/')) for ast in file_asts.values() if os.path.dirname(ast.relative_path)})
        for d in dirs[:10]:
            onboarding_md += f"- `/{d}/`: Core package containing {len([ast for ast in file_asts.values() if ast.relative_path.replace('\\', '/').startswith(d)])} source files.\n"

        sections.append(
            GeneratedDocSection(
                title="Developer Onboarding Guide",
                doc_type="onboarding",
                markdown_content=onboarding_md,
                summary="High-level architecture overview, repository layout, and setup guide for new developers.",
                symbols_covered_count=len(file_asts),
            )
        )

        # 2. Architecture & Subsystems Documentation
        arch_md = f"""# Architecture & Subsystem Blueprint

## Module Boundaries
The codebase is partitioned into distinct functional modules:
"""
        if self.scanner.graph_store and self.scanner.graph_store.modules:
            for mod_id, cluster in self.scanner.graph_store.modules.items():
                arch_md += f"\n### Module `{cluster.name}`\n"
                arch_md += f"- **Relative Path**: `{cluster.relative_dir}`\n"
                arch_md += f"- **Files ({len(cluster.file_paths)})**: {', '.join([os.path.basename(f) for f in cluster.file_paths[:6]])}\n"
                arch_md += f"- **Afferent Coupling ($C_a$)**: {cluster.afferent_coupling} | **Efferent Coupling ($C_e$)**: {cluster.efferent_coupling}\n"
                arch_md += f"- **Instability Index**: {cluster.instability}\n"

        sections.append(
            GeneratedDocSection(
                title="Architecture & Module Blueprint",
                doc_type="architecture",
                markdown_content=arch_md,
                summary="Package decomposition, coupling metrics, and structural module boundaries.",
                symbols_covered_count=len(getattr(self.scanner.graph_store, "modules", {})),
            )
        )

        # 3. API & Endpoints Catalog
        api_routes = getattr(self.scanner.fact_store, "route_handlers", []) if self.scanner.fact_store else []
        api_md = f"""# API Reference & Route Endpoints Catalog

Total registered HTTP endpoints detected across controllers and routers: **{len(api_routes)}**

| Method | Path | Handler | File |
|---|---|---|---|
"""
        for r in api_routes:
            rel = (
                file_asts[r.file_path].relative_path.replace("\\", "/")
                if r.file_path in file_asts
                else os.path.basename(r.file_path)
            )
            api_md += f"| `{r.http_method}` | `{r.route_path}` | `{r.handler_name}()` | `{rel}:{r.line_number}` |\n"

        if not api_routes:
            api_md += "| *No explicit REST decorators detected* | - | - | - |\n"

        sections.append(
            GeneratedDocSection(
                title="API Endpoints & Routing Reference",
                doc_type="api_reference",
                markdown_content=api_md,
                summary="Complete REST API routing matrix with methods, paths, and handler coordinates.",
                symbols_covered_count=len(api_routes),
            )
        )

        # 4. Classes & Data Models Catalog
        classes = [s for s in all_symbols if s.kind in (SymbolKind.CLASS, SymbolKind.INTERFACE, SymbolKind.TYPE_ALIAS)]
        models_md = f"""# Data Models & Class Catalog

Total data models, interfaces, and core classes: **{len(classes)}**

"""
        for cls in classes[:25]:
            rel = (
                file_asts[cls.file_path].relative_path.replace("\\", "/")
                if cls.file_path in file_asts
                else cls.file_path
            )
            models_md += f"### `{cls.name}` ({cls.kind.value})\n"
            models_md += f"- **Defined In**: `{rel}:{cls.start_line}`\n"
            if cls.docstring:
                models_md += f"- **Description**: {cls.docstring.strip()}\n"
            models_md += "\n"

        sections.append(
            GeneratedDocSection(
                title="Data Models & Class Catalog",
                doc_type="data_models",
                markdown_content=models_md,
                summary="Comprehensive inventory of classes, ORM models, interfaces, and structs.",
                symbols_covered_count=len(classes),
            )
        )

        return DocumentationReport(
            repository_name=repo_name,
            generated_at=now_str,
            total_sections=len(sections),
            sections=sections,
        )
