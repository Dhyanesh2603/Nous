import os
import networkx as nx
from typing import List, Dict, Any, Optional
from pydantic import BaseModel, Field

from app.parsers.symbol_types import FileAST, SymbolKind
from app.graph.graph_store import GraphStore
from app.facts.fact_store import FactStore


class ModuleHealthCard(BaseModel):
    module_id: str
    name: str
    relative_dir: str
    file_count: int
    line_count: int
    symbol_count: int
    cohesion_score: float  # 0.0 to 1.0 (intra-module calls / total module calls)
    afferent_coupling: int  # Ca (incoming dependencies from other modules)
    efferent_coupling: int  # Ce (outgoing dependencies to other modules)
    instability: float  # I = Ce / (Ca + Ce)
    maintainability_rating: str  # 'A', 'B', 'C', 'D', 'F'
    dependency_depth: int  # Longest path in module dependency DAG
    average_complexity: float
    test_coverage_pct: float  # Heuristic based on matching test files
    documentation_coverage_pct: float  # % of symbols with docstrings
    health_score: float  # 0 to 100
    risk_level: str  # 'Low', 'Moderate', 'High', 'Critical'
    file_paths: List[str] = Field(default_factory=list)


class ModuleHealthReport(BaseModel):
    total_modules: int
    overall_health_score: float
    average_cohesion: float
    average_instability: float
    modules: List[ModuleHealthCard] = Field(default_factory=list)


class ModuleHealthAnalyzer:
    """
    Module Health Dashboard Engine:
    Per-module calculation of:
    - Robert C. Martin's Package Coupling ($C_a, C_e, I$)
    - Relational Cohesion Metric ($H$)
    - Maintainability Rating
    - Longest Dependency DAG Depth
    - Cyclomatic Complexity Averages
    - Heuristic Test File Coverage
    - Documentation / Docstring Coverage
    """

    def __init__(
        self,
        graph_store: Optional[GraphStore] = None,
        fact_store: Optional[FactStore] = None,
        file_asts: Optional[Dict[str, FileAST]] = None,
    ):
        self.graph_store = graph_store
        self.fact_store = fact_store
        self.file_asts = file_asts or {}

    def analyze(self) -> ModuleHealthReport:
        cards: List[ModuleHealthCard] = []

        if not self.graph_store or not self.graph_store.modules:
            return ModuleHealthReport(
                total_modules=0,
                overall_health_score=100.0,
                average_cohesion=1.0,
                average_instability=0.0,
                modules=[],
            )

        test_files = [
            f for f in self.file_asts.keys()
            if any(t in f.lower() for t in ("test_", "_test.", "spec.", "tests/"))
        ]

        for mod_id, cluster in self.graph_store.modules.items():
            mod_files = set(cluster.file_paths)
            mod_rel_files = [
                self.file_asts[f].relative_path.replace("\\", "/")
                if f in self.file_asts else os.path.basename(f)
                for f in mod_files
            ]

            # 1. Intra-module vs Inter-module Calls (Cohesion Calculation)
            intra_calls = 0
            total_mod_calls = 0
            if self.graph_store.call_builder:
                for u, v, data in self.graph_store.call_graph.edges(data=True):
                    u_sym = self.graph_store.call_builder.symbols_by_id.get(u)
                    v_sym = self.graph_store.call_builder.symbols_by_id.get(v)
                    if u_sym and u_sym.file_path in mod_files:
                        total_mod_calls += 1
                        if v_sym and v_sym.file_path in mod_files:
                            intra_calls += 1

            cohesion = (
                round(intra_calls / max(1, total_mod_calls), 2)
                if total_mod_calls > 0
                else 0.85
            )

            # 2. Complexity & Documentation
            symbols_in_mod = [
                sym for s_id, sym in getattr(self.graph_store.call_builder, "symbols_by_id", {}).items()
                if sym.file_path in mod_files
            ]
            avg_comp = (
                round(sum(s.cyclomatic_complexity for s in symbols_in_mod) / max(1, len(symbols_in_mod)), 1)
                if symbols_in_mod
                else 1.2
            )
            doc_symbols = [s for s in symbols_in_mod if s.docstring and len(s.docstring.strip()) > 5]
            doc_pct = round((len(doc_symbols) / max(1, len(symbols_in_mod))) * 100, 1) if symbols_in_mod else 80.0

            # 3. Test Coverage Heuristic
            matching_tests = 0
            for mf in mod_files:
                base = os.path.splitext(os.path.basename(mf))[0]
                if any(base in tf for tf in test_files):
                    matching_tests += 1
            test_pct = round((matching_tests / max(1, len(mod_files))) * 100, 1)

            # 4. Dependency Depth
            dep_depth = 1
            if self.graph_store.dep_builder:
                sub_dag = self.graph_store.dep_graph.subgraph(mod_files)
                try:
                    dep_depth = nx.dag_longest_path_length(sub_dag) + 1 if len(sub_dag.nodes) > 1 else 1
                except Exception:
                    dep_depth = 1

            # 5. Health Score Composite (0 to 100)
            ca = cluster.afferent_coupling
            ce = cluster.efferent_coupling
            instability = cluster.instability

            # Ideal instability depends on coupling; penalty for high complexity & low cohesion
            score = 100.0 - (avg_comp - 1.0) * 8.0 - (1.0 - cohesion) * 20.0 - (100.0 - doc_pct) * 0.15
            score = round(max(20.0, min(100.0, score)), 1)

            risk = "Low"
            rating = "A"
            if score < 55 or avg_comp >= 8.0:
                risk = "Critical"
                rating = "F"
            elif score < 70 or avg_comp >= 5.0:
                risk = "High"
                rating = "C"
            elif score < 85:
                risk = "Moderate"
                rating = "B"

            cards.append(
                ModuleHealthCard(
                    module_id=mod_id,
                    name=cluster.name,
                    relative_dir=cluster.relative_dir,
                    file_count=len(mod_files),
                    line_count=cluster.line_count,
                    symbol_count=cluster.symbol_count,
                    cohesion_score=cohesion,
                    afferent_coupling=ca,
                    efferent_coupling=ce,
                    instability=instability,
                    maintainability_rating=rating,
                    dependency_depth=dep_depth,
                    average_complexity=avg_comp,
                    test_coverage_pct=test_pct,
                    documentation_coverage_pct=doc_pct,
                    health_score=score,
                    risk_level=risk,
                    file_paths=mod_rel_files,
                )
            )

        avg_cohesion = (
            round(sum(c.cohesion_score for c in cards) / max(1, len(cards)), 2)
            if cards
            else 1.0
        )
        avg_instability = (
            round(sum(c.instability for c in cards) / max(1, len(cards)), 2)
            if cards
            else 0.0
        )
        overall_health = (
            round(sum(c.health_score for c in cards) / max(1, len(cards)), 1)
            if cards
            else 100.0
        )

        return ModuleHealthReport(
            total_modules=len(cards),
            overall_health_score=overall_health,
            average_cohesion=avg_cohesion,
            average_instability=avg_instability,
            modules=sorted(cards, key=lambda c: c.health_score),
        )
