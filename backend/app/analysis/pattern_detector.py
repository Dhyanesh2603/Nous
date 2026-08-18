from typing import Dict, List, Set, Optional, Tuple, Any
import os
import re
from pydantic import BaseModel, Field

from app.parsers.symbol_types import FileAST, ASTSymbol, SymbolKind
from app.graph.graph_store import GraphStore


class DetectedPattern(BaseModel):
    id: str
    pattern_name: str  # 'Repository', 'Factory', 'Adapter', 'Singleton', 'Middleware', 'Pipeline'
    category: str      # 'Creational', 'Structural', 'Behavioral', 'Architectural'
    symbol_name: str
    symbol_kind: str
    file_path: str
    relative_path: str
    line_number: int
    confidence: float
    evidence: str


class ArchitecturalSummary(BaseModel):
    primary_architecture_style: str  # e.g., 'Layered Architecture (Services + Domain + Data)'
    patterns_count: int
    detected_patterns: List[DetectedPattern]
    module_roles: Dict[str, str]
    recommendations: List[str]


class DesignPatternDetector:
    def __init__(self, graph_store: GraphStore):
        self.graph_store = graph_store

    def analyze_patterns(self) -> ArchitecturalSummary:
        patterns: List[DetectedPattern] = []
        module_roles: Dict[str, str] = {}

        if not self.graph_store.call_builder:
            return ArchitecturalSummary(
                primary_architecture_style="Modular Monolith",
                patterns_count=0,
                detected_patterns=[],
                module_roles={},
                recommendations=[],
            )

        for sym_id, sym in self.graph_store.call_builder.symbols_by_id.items():
            fast = self.graph_store.file_asts.get(sym.file_path)
            rel_file = fast.relative_path.replace("\\", "/") if fast else sym.file_path
            name_lower = sym.name.lower()
            code_content = (sym.code_content or "").lower()

            # 1. Repository Pattern
            if "repository" in name_lower or "repo" in name_lower or any(m in code_content for m in ("find_by", "save(", "delete(", "fetchall", "get_by_id")):
                if sym.kind in (SymbolKind.CLASS, SymbolKind.INTERFACE):
                    patterns.append(
                        DetectedPattern(
                            id=f"pat::{sym_id}::repo",
                            pattern_name="Repository Pattern",
                            category="Architectural",
                            symbol_name=sym.name,
                            symbol_kind=sym.kind.value if hasattr(sym.kind, "value") else str(sym.kind),
                            file_path=sym.file_path,
                            relative_path=rel_file,
                            line_number=sym.start_line,
                            confidence=0.90 if "repository" in name_lower else 0.75,
                            evidence="Abstracts domain data access and queries behind a persistent entity interface.",
                        )
                    )

            # 2. Factory Pattern
            if "factory" in name_lower or (name_lower.startswith("create_") and sym.kind in (SymbolKind.FUNCTION, SymbolKind.METHOD)):
                patterns.append(
                    DetectedPattern(
                        id=f"pat::{sym_id}::factory",
                        pattern_name="Factory Pattern",
                        category="Creational",
                        symbol_name=sym.name,
                        symbol_kind=sym.kind.value if hasattr(sym.kind, "value") else str(sym.kind),
                        file_path=sym.file_path,
                        relative_path=rel_file,
                        line_number=sym.start_line,
                        confidence=0.85,
                        evidence="Encapsulates instantiation logic and object creation from calling consumers.",
                    )
                )

            # 3. Adapter / Client Pattern
            if "adapter" in name_lower or "client" in name_lower or "wrapper" in name_lower:
                if sym.kind in (SymbolKind.CLASS, SymbolKind.INTERFACE):
                    patterns.append(
                        DetectedPattern(
                            id=f"pat::{sym_id}::adapter",
                            pattern_name="Adapter / Service Client",
                            category="Structural",
                            symbol_name=sym.name,
                            symbol_kind=sym.kind.value if hasattr(sym.kind, "value") else str(sym.kind),
                            file_path=sym.file_path,
                            relative_path=rel_file,
                            line_number=sym.start_line,
                            confidence=0.90,
                            evidence="Translates third-party or network interfaces into uniform internal abstractions.",
                        )
                    )

            # 4. Pipeline / Batch Processor Pattern
            if "pipeline" in name_lower or "processor" in name_lower or "batch" in name_lower:
                if sym.kind in (SymbolKind.CLASS, SymbolKind.FUNCTION):
                    patterns.append(
                        DetectedPattern(
                            id=f"pat::{sym_id}::pipeline",
                            pattern_name="Pipeline / Data Processor",
                            category="Behavioral",
                            symbol_name=sym.name,
                            symbol_kind=sym.kind.value if hasattr(sym.kind, "value") else str(sym.kind),
                            file_path=sym.file_path,
                            relative_path=rel_file,
                            line_number=sym.start_line,
                            confidence=0.85,
                            evidence="Sequentially processes and transforms structured datasets through discrete stages.",
                        )
                    )

            # 5. Middleware / Interceptor
            if "middleware" in name_lower or "interceptor" in name_lower or "auth" in name_lower and "service" in name_lower:
                if sym.kind in (SymbolKind.CLASS, SymbolKind.FUNCTION, SymbolKind.METHOD):
                    patterns.append(
                        DetectedPattern(
                            id=f"pat::{sym_id}::middleware",
                            pattern_name="Security / Authentication Service",
                            category="Behavioral",
                            symbol_name=sym.name,
                            symbol_kind=sym.kind.value if hasattr(sym.kind, "value") else str(sym.kind),
                            file_path=sym.file_path,
                            relative_path=rel_file,
                            line_number=sym.start_line,
                            confidence=0.80,
                            evidence="Intercepts execution flows for identity verification, session tokens, and security checks.",
                        )
                    )

        # Derive module roles from module clusters
        for mod_id, cluster in self.graph_store.modules.items():
            m_name = cluster.name.lower()
            if "auth" in m_name or "sec" in m_name:
                role = "Authentication & Security Domain (manages tokens, credentials, and session state)"
            elif "model" in m_name or "entity" in m_name or "schema" in m_name:
                role = "Core Domain Entities & Schema Definitions"
            elif "pipe" in m_name or "proc" in m_name or "service" in m_name:
                role = "Business Logic & Transformation Processing"
            elif "util" in m_name or "helper" in m_name or "common" in m_name:
                role = "Shared Utility Layer & Infrastructure Helpers"
            elif "api" in m_name or "route" in m_name or "controller" in m_name:
                role = "Presentation & API Routing Layer"
            else:
                role = f"Application Core Module ({cluster.name})"
            module_roles[cluster.name] = role

        # Generate actionable architecture recommendations
        recommendations: List[str] = []
        if len(self.graph_store.cycles) > 0:
            recommendations.append(
                f"Break {len(self.graph_store.cycles)} circular dependency chain(s) using Dependency Inversion or Interface Segregation."
            )
        
        high_instability = [c.name for c in self.graph_store.modules.values() if c.instability > 0.75]
        if high_instability:
            recommendations.append(
                f"Modules '{', '.join(high_instability[:3])}' have high instability ($I > 0.75$). Consider decoupling outward dependencies."
            )

        if not recommendations:
            recommendations.append("Architecture is cohesive with well-defined module boundaries and zero cycles.")

        return ArchitecturalSummary(
            primary_architecture_style="Modular Layered Architecture",
            patterns_count=len(patterns),
            detected_patterns=patterns,
            module_roles=module_roles,
            recommendations=recommendations,
        )
