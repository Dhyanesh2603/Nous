import os
import re
from typing import List, Dict, Any, Set, Optional
from pydantic import BaseModel, Field

from app.parsers.symbol_types import FileAST, ASTSymbol, SymbolKind
from app.graph.graph_store import GraphStore
from app.facts.fact_store import FactStore
from app.facts.fact_types import FactKind


class DeadCodeItem(BaseModel):
    id: str
    name: str
    category: str  # 'unused_function', 'unused_class', 'unused_file', 'unused_export', 'unreachable_code'
    kind: str
    file_path: str
    relative_path: str
    line_number: int
    confidence_score: float  # 0.0 - 1.0
    reason: str
    snippet: Optional[str] = None
    suggested_remediation: str


class DeadCodeReport(BaseModel):
    total_dead_items: int
    unused_functions_count: int
    unused_classes_count: int
    unused_files_count: int
    unused_exports_count: int
    unreachable_code_count: int
    overall_dead_loc: int
    items: List[DeadCodeItem] = Field(default_factory=list)


class DeadCodeDetector:
    """
    Advanced Dead Code Detection Engine:
    - Detects unused functions (internal 0-caller functions)
    - Detects unused classes (0 instantiations, 0 subclasses)
    - Detects unused files (0 incoming imports across repo, not entrypoints)
    - Detects unused exports (exported symbols never imported)
    - Detects unreachable code (statements following unconditional returns/raises)
    - Computes calibrated confidence scores (0.0 to 1.0)
    """

    ENTRY_POINT_PATTERNS = (
        "main.", "index.", "app.", "__init__", "server.", "route", "router",
        "manage.", "wsgi.", "asgi.", "setup.", "cli.", "conftest.", "test", "spec"
    )

    def __init__(self, graph_store: GraphStore, fact_store: Optional[FactStore] = None):
        self.graph_store = graph_store
        self.fact_store = fact_store

    def analyze(self) -> DeadCodeReport:
        items: List[DeadCodeItem] = []
        if not self.graph_store or not self.graph_store.file_asts:
            return DeadCodeReport(
                total_dead_items=0,
                unused_functions_count=0,
                unused_classes_count=0,
                unused_files_count=0,
                unused_exports_count=0,
                unreachable_code_count=0,
                overall_dead_loc=0,
                items=[],
            )

        # 1. Collect all imported symbol names and imported module paths
        all_imported_names: Set[str] = set()
        imported_file_targets: Set[str] = set()

        for file_path, ast in self.graph_store.file_asts.items():
            for imp in ast.imports:
                for sym in imp.imported_symbols:
                    all_imported_names.add(sym.name)
                    if sym.alias:
                        all_imported_names.add(sym.alias)

        if self.graph_store.dep_builder:
            for u, v, data in self.graph_store.dep_graph.edges(data=True):
                imported_file_targets.add(v)

        # Collect route-bound handler symbol names
        route_handler_names: Set[str] = set()
        if self.fact_store:
            for route in self.fact_store.routes:
                route_handler_names.add(route.handler_name)
            for fact in self.fact_store.by_kind.get(FactKind.ROUTE_HANDLER_DEF, []):
                route_handler_names.add(fact.object_id)

        # 2. Detect Unused Exports
        items.extend(self._detect_unused_exports(all_imported_names, route_handler_names))

        # 3. Detect Unused Functions
        items.extend(self._detect_unused_functions(route_handler_names))

        # 4. Detect Unused Classes
        items.extend(self._detect_unused_classes())

        # 5. Detect Unused Files
        items.extend(self._detect_unused_files(imported_file_targets))

        # 6. Detect Unreachable Code
        items.extend(self._detect_unreachable_code())

        # Calculate statistics
        fn_count = sum(1 for x in items if x.category == "unused_function")
        cls_count = sum(1 for x in items if x.category == "unused_class")
        file_count = sum(1 for x in items if x.category == "unused_file")
        exp_count = sum(1 for x in items if x.category == "unused_export")
        unreach_count = sum(1 for x in items if x.category == "unreachable_code")

        # Estimate dead LOC
        dead_loc = 0
        for item in items:
            if item.category == "unused_file":
                ast = self.graph_store.file_asts.get(item.file_path)
                if ast:
                    dead_loc += ast.line_count
            else:
                dead_loc += 10  # Average estimate per dead symbol

        return DeadCodeReport(
            total_dead_items=len(items),
            unused_functions_count=fn_count,
            unused_classes_count=cls_count,
            unused_files_count=file_count,
            unused_exports_count=exp_count,
            unreachable_code_count=unreach_count,
            overall_dead_loc=dead_loc,
            items=sorted(items, key=lambda x: x.confidence_score, reverse=True),
        )

    def _is_entry_point(self, rel_path: str) -> bool:
        lower = rel_path.lower().replace("\\", "/")
        return any(term in lower for term in self.ENTRY_POINT_PATTERNS)

    def _detect_unused_exports(
        self, all_imported_names: Set[str], route_handlers: Set[str]
    ) -> List[DeadCodeItem]:
        results: List[DeadCodeItem] = []
        for file_path, ast in self.graph_store.file_asts.items():
            rel_file = ast.relative_path.replace("\\", "/")
            if self._is_entry_point(rel_file):
                continue

            for exp in ast.exports:
                if exp.symbol_name in all_imported_names or exp.symbol_name in route_handlers:
                    continue
                if exp.is_default:
                    continue

                matching_sym = next((s for s in ast.symbols if s.name == exp.symbol_name), None)
                kind = matching_sym.kind.value if matching_sym and hasattr(matching_sym.kind, "value") else "export"
                sym_id = matching_sym.id if matching_sym else f"{file_path}::{exp.symbol_name}"
                snippet = matching_sym.code_content if matching_sym and matching_sym.code_content else None

                # Calculate confidence score
                confidence = 0.95
                if "plugin" in rel_file or "tool" in rel_file:
                    confidence = 0.70  # Might be dynamically loaded

                results.append(
                    DeadCodeItem(
                        id=sym_id,
                        name=exp.symbol_name,
                        category="unused_export",
                        kind=kind,
                        file_path=file_path,
                        relative_path=rel_file,
                        line_number=exp.line_number,
                        confidence_score=confidence,
                        reason=f"Export '{exp.symbol_name}' is declared but never imported by any module in the workspace.",
                        snippet=snippet,
                        suggested_remediation=f"Remove export statement for '{exp.symbol_name}' or make it internal to {os.path.basename(file_path)}.",
                    )
                )
        return results

    def _detect_unused_functions(self, route_handlers: Set[str]) -> List[DeadCodeItem]:
        results: List[DeadCodeItem] = []
        if not self.graph_store.call_builder:
            return results

        for sym_id, sym in self.graph_store.call_builder.symbols_by_id.items():
            rel_file = (
                self.graph_store.file_asts[sym.file_path].relative_path.replace("\\", "/")
                if sym.file_path in self.graph_store.file_asts
                else sym.file_path
            )

            if self._is_entry_point(rel_file):
                continue

            if sym.kind in (SymbolKind.FUNCTION, SymbolKind.METHOD, SymbolKind.ASYNC_FUNCTION):
                if sym.name.startswith("__") or sym.name in (
                    "constructor", "setUp", "tearDown", "render", "handler"
                ):
                    continue
                if sym.name in route_handlers:
                    continue

                in_degree = (
                    self.graph_store.call_graph.in_degree(sym_id)
                    if self.graph_store.call_graph.has_node(sym_id)
                    else 0
                )

                if in_degree == 0:
                    confidence = 0.90
                    # If decorated or part of lifecycle, lower confidence
                    if sym.decorators:
                        confidence = 0.65
                    if sym.kind == SymbolKind.METHOD:
                        confidence = 0.75  # Could be polymorphically invoked

                    results.append(
                        DeadCodeItem(
                            id=sym_id,
                            name=sym.name,
                            category="unused_function",
                            kind=sym.kind.value if hasattr(sym.kind, "value") else str(sym.kind),
                            file_path=sym.file_path,
                            relative_path=rel_file,
                            line_number=sym.start_line,
                            confidence_score=confidence,
                            reason=f"Function '{sym.name}()' has 0 incoming invocations across the static call graph.",
                            snippet=sym.code_content,
                            suggested_remediation=f"Safely delete function '{sym.name}()' or integrate it into its caller workflow.",
                        )
                    )
        return results

    def _detect_unused_classes(self) -> List[DeadCodeItem]:
        results: List[DeadCodeItem] = []
        if not self.graph_store.call_builder:
            return results

        # Check for instantiations and inheritances in fact store
        instantiated_classes: Set[str] = set()
        subclassed_classes: Set[str] = set()

        if self.fact_store:
            for fact in self.fact_store.by_kind.get(FactKind.INSTANTIATES_REF, []):
                instantiated_classes.add(fact.object_id)
            for fact in self.fact_store.by_kind.get(FactKind.INHERITS_REF, []):
                subclassed_classes.add(fact.object_id)

        for sym_id, sym in self.graph_store.call_builder.symbols_by_id.items():
            if sym.kind != SymbolKind.CLASS:
                continue

            rel_file = (
                self.graph_store.file_asts[sym.file_path].relative_path.replace("\\", "/")
                if sym.file_path in self.graph_store.file_asts
                else sym.file_path
            )
            if self._is_entry_point(rel_file):
                continue

            # Check if instantiated or subclassed
            is_instantiated = (
                sym.name in instantiated_classes
                or any(sym.name in call.callee_name for ast in self.graph_store.file_asts.values() for call in ast.calls)
            )
            is_subclassed = sym.name in subclassed_classes

            # Check if any methods of this class are called
            has_called_methods = False
            for s_id, s in self.graph_store.call_builder.symbols_by_id.items():
                if s.scope == sym.name:
                    in_deg = self.graph_store.call_graph.in_degree(s_id) if self.graph_store.call_graph.has_node(s_id) else 0
                    if in_deg > 0:
                        has_called_methods = True
                        break

            if not is_instantiated and not is_subclassed and not has_called_methods:
                confidence = 0.88
                if sym.decorators:
                    confidence = 0.60

                results.append(
                    DeadCodeItem(
                        id=sym_id,
                        name=sym.name,
                        category="unused_class",
                        kind="class",
                        file_path=sym.file_path,
                        relative_path=rel_file,
                        line_number=sym.start_line,
                        confidence_score=confidence,
                        reason=f"Class '{sym.name}' is never instantiated, subclassed, or invoked anywhere in the codebase.",
                        snippet=sym.code_content,
                        suggested_remediation=f"Remove class '{sym.name}' or verify if it belongs to an unfinished domain model.",
                    )
                )
        return results

    def _detect_unused_files(self, imported_file_targets: Set[str]) -> List[DeadCodeItem]:
        results: List[DeadCodeItem] = []
        for file_path, ast in self.graph_store.file_asts.items():
            rel_file = ast.relative_path.replace("\\", "/")
            if self._is_entry_point(rel_file):
                continue

            # Check if this file has incoming imports
            has_incoming_import = (
                file_path in imported_file_targets
                or (self.graph_store.dep_graph.has_node(file_path) and self.graph_store.dep_graph.in_degree(file_path) > 0)
            )

            # Check if any symbol in this file is called externally
            has_external_calls = False
            for sym in ast.symbols:
                in_deg = self.graph_store.call_graph.in_degree(sym.id) if self.graph_store.call_graph.has_node(sym.id) else 0
                if in_deg > 0:
                    has_external_calls = True
                    break

            if not has_incoming_import and not has_external_calls and ast.line_count > 3:
                results.append(
                    DeadCodeItem(
                        id=f"file::{file_path}",
                        name=os.path.basename(file_path),
                        category="unused_file",
                        kind="file",
                        file_path=file_path,
                        relative_path=rel_file,
                        line_number=1,
                        confidence_score=0.85,
                        reason=f"File '{rel_file}' has 0 incoming import references and 0 active symbol callers.",
                        suggested_remediation=f"Archive or delete obsolete file '{rel_file}'.",
                    )
                )
        return results

    def _detect_unreachable_code(self) -> List[DeadCodeItem]:
        results: List[DeadCodeItem] = []
        for file_path, ast in self.graph_store.file_asts.items():
            rel_file = ast.relative_path.replace("\\", "/")
            lines = (ast.raw_content or "").splitlines()

            for sym in ast.symbols:
                if sym.kind not in (SymbolKind.FUNCTION, SymbolKind.METHOD, SymbolKind.ASYNC_FUNCTION):
                    continue

                fn_start = sym.start_line - 1
                fn_end = min(sym.end_line, len(lines))
                fn_lines = lines[fn_start:fn_end]

                found_terminator = False
                terminator_indent = 0

                for idx, line in enumerate(fn_lines):
                    stripped = line.strip()
                    if not stripped or stripped.startswith("#") or stripped.startswith("//"):
                        continue

                    indent = len(line) - len(line.lstrip())

                    if found_terminator and indent == terminator_indent:
                        # Statement after unconditional return at the exact same indent level
                        if not stripped.startswith(("elif ", "else:", "except ", "finally:", "}")):
                            results.append(
                                DeadCodeItem(
                                    id=f"{sym.id}::unreachable::{sym.start_line + idx}",
                                    name=f"{sym.name}:L{sym.start_line + idx}",
                                    category="unreachable_code",
                                    kind="statement",
                                    file_path=file_path,
                                    relative_path=rel_file,
                                    line_number=sym.start_line + idx,
                                    confidence_score=0.92,
                                    reason=f"Code statement inside '{sym.name}()' appears directly after an unconditional return/raise at line {sym.start_line + idx}.",
                                    snippet=stripped,
                                    suggested_remediation="Remove unreachable dead code after the return/raise statement.",
                                )
                            )
                            break

                    if re.match(r"^(?:return\b|raise\b|throw\b|process\.exit\(|sys\.exit\()", stripped):
                        found_terminator = True
                        terminator_indent = indent
                    elif indent < terminator_indent:
                        found_terminator = False

        return results
