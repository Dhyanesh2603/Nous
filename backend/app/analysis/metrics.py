from typing import List, Dict, Any, Set, Optional
import os
import networkx as nx
from pydantic import BaseModel, Field

from app.parsers.symbol_types import FileAST, ASTSymbol, SymbolKind
from app.graph.graph_store import GraphStore


class DeadCodeSymbol(BaseModel):
    id: str
    name: str
    kind: str
    file_path: str
    relative_path: str
    line_number: int
    reason: str  # 'unreferenced_export' or 'orphan_function'


class CircularDependencyItem(BaseModel):
    cycle_id: str
    length: int
    files: List[str]
    relative_files: List[str]
    description: str


class HotspotItem(BaseModel):
    id: str
    name: str
    kind: str
    relative_path: str
    start_line: int
    complexity: int
    incoming_calls: int
    risk_score: float


class ArchitectureMetricsResponse(BaseModel):
    total_files: int
    total_loc: int
    total_symbols: int
    total_calls: int
    language_distribution: Dict[str, int]
    dead_code_count: int
    circular_cycles_count: int
    dead_code_symbols: List[DeadCodeSymbol]
    circular_dependencies: List[CircularDependencyItem]
    hotspots: List[HotspotItem]


class CodeQualityAnalyzer:
    def __init__(self, graph_store: GraphStore):
        self.graph_store = graph_store

    def analyze(self) -> ArchitectureMetricsResponse:
        dead_code = self.detect_dead_code()
        cycles = self.format_circular_dependencies()
        hotspots = self.detect_hotspots()
        
        # Language distribution and LOC
        lang_dist: Dict[str, int] = {}
        total_loc = 0
        for ast in self.graph_store.file_asts.values():
            lang_dist[ast.language] = lang_dist.get(ast.language, 0) + 1
            total_loc += ast.line_count

        total_symbols = len(self.graph_store.call_builder.symbols_by_id) if self.graph_store.call_builder else 0
        total_calls = len(self.graph_store.call_builder.edges) if self.graph_store.call_builder else 0

        return ArchitectureMetricsResponse(
            total_files=len(self.graph_store.file_asts),
            total_loc=total_loc,
            total_symbols=total_symbols,
            total_calls=total_calls,
            language_distribution=lang_dist,
            dead_code_count=len(dead_code),
            circular_cycles_count=len(cycles),
            dead_code_symbols=dead_code,
            circular_dependencies=cycles,
            hotspots=hotspots,
        )

    def detect_dead_code(self) -> List[DeadCodeSymbol]:
        dead_symbols: List[DeadCodeSymbol] = []
        if not self.graph_store.call_builder:
            return dead_symbols

        # 1. Collect all imported symbol names across the entire repository
        all_imported_names: Set[str] = set()
        for ast in self.graph_store.file_asts.values():
            for imp in ast.imports:
                for sym in imp.imported_symbols:
                    all_imported_names.add(sym.name)
                    if sym.alias:
                        all_imported_names.add(sym.alias)

        # 2. Check exports
        for file_path, ast in self.graph_store.file_asts.items():
            rel_file = ast.relative_path.replace("\\", "/")
            
            # Skip test files and main/index entry points from dead code false positives
            if any(term in rel_file.lower() for term in ("test", "main.", "index.", "app.", "__init__")):
                continue
                
            for exp in ast.exports:
                if exp.symbol_name not in all_imported_names and not exp.is_default:
                    # Find matching symbol in AST
                    matching_sym = next((s for s in ast.symbols if s.name == exp.symbol_name), None)
                    kind = matching_sym.kind.value if matching_sym and hasattr(matching_sym.kind, "value") else "export"
                    sym_id = matching_sym.id if matching_sym else f"{file_path}::{exp.symbol_name}"
                    
                    dead_symbols.append(
                        DeadCodeSymbol(
                            id=sym_id,
                            name=exp.symbol_name,
                            kind=kind,
                            file_path=file_path,
                            relative_path=rel_file,
                            line_number=exp.line_number,
                            reason="Exported symbol is never imported across the codebase",
                        )
                    )

        # 3. Check internal functions with 0 incoming calls and not exported
        for sym_id, sym in self.graph_store.call_builder.symbols_by_id.items():
            rel_file = self.graph_store.file_asts[sym.file_path].relative_path.replace("\\", "/") if sym.file_path in self.graph_store.file_asts else sym.file_path
            
            if any(term in rel_file.lower() for term in ("test", "main.", "index.", "app.", "route", "router")):
                continue
                
            if sym.kind in (SymbolKind.FUNCTION, SymbolKind.METHOD, SymbolKind.ASYNC_FUNCTION):
                in_degree = self.graph_store.call_graph.in_degree(sym_id) if self.graph_store.call_graph.has_node(sym_id) else 0
                
                # Check if it was already marked
                if in_degree == 0 and not sym.name.startswith("__") and sym.name not in ("constructor", "setUp", "tearDown"):
                    # If not in dead_symbols
                    if not any(d.id == sym_id for d in dead_symbols):
                        dead_symbols.append(
                            DeadCodeSymbol(
                                id=sym_id,
                                name=sym.name,
                                kind=sym.kind.value if hasattr(sym.kind, "value") else str(sym.kind),
                                file_path=sym.file_path,
                                relative_path=rel_file,
                                line_number=sym.start_line,
                                reason="Internal function has 0 incoming calls across the call graph",
                            )
                        )

        return dead_symbols

    def format_circular_dependencies(self) -> List[CircularDependencyItem]:
        items: List[CircularDependencyItem] = []
        for idx, cycle in enumerate(self.graph_store.cycles):
            rel_files = [
                self.graph_store.file_asts[f].relative_path.replace("\\", "/")
                if f in self.graph_store.file_asts else os.path.basename(f)
                for f in cycle
            ]
            chain_desc = " -> ".join(rel_files) + f" -> {rel_files[0]}"
            items.append(
                CircularDependencyItem(
                    cycle_id=f"cycle_{idx + 1}",
                    length=len(cycle),
                    files=cycle,
                    relative_files=rel_files,
                    description=chain_desc,
                )
            )
        return items

    def detect_hotspots(self) -> List[HotspotItem]:
        hotspots: List[HotspotItem] = []
        if not self.graph_store.call_builder:
            return hotspots

        for sym_id, sym in self.graph_store.call_builder.symbols_by_id.items():
            in_degree = self.graph_store.call_graph.in_degree(sym_id) if self.graph_store.call_graph.has_node(sym_id) else 0
            complexity = sym.cyclomatic_complexity
            risk_score = round(float(complexity * (in_degree + 1)), 2)
            
            rel_path = self.graph_store.file_asts[sym.file_path].relative_path.replace("\\", "/") if sym.file_path in self.graph_store.file_asts else sym.file_path
            
            hotspots.append(
                HotspotItem(
                    id=sym_id,
                    name=sym.name,
                    kind=sym.kind.value if hasattr(sym.kind, "value") else str(sym.kind),
                    relative_path=rel_path,
                    start_line=sym.start_line,
                    complexity=complexity,
                    incoming_calls=in_degree,
                    risk_score=risk_score,
                )
            )

        return sorted(hotspots, key=lambda x: x.risk_score, reverse=True)[:15]
