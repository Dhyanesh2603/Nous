import os
from enum import Enum
from typing import List, Dict, Any, Set, Optional
from pydantic import BaseModel, Field
import networkx as nx

from app.parsers.symbol_types import SymbolKind, ASTSymbol
from app.graph.graph_store import GraphStore
from app.facts.fact_store import FactStore
from app.facts.fact_types import FactKind


class SimulationType(str, Enum):
    FUNCTION_DELETE = "function_delete"
    CLASS_DELETE = "class_delete"
    MODULE_DELETE = "module_delete"
    FUNCTION_RENAME = "function_rename"
    FILE_MOVE = "file_move"
    MODULE_EXTRACT = "module_extract"


class BrokenImport(BaseModel):
    file_path: str
    relative_path: str
    line_number: int
    imported_symbol_or_module: str
    impact_reason: str


class BrokenCaller(BaseModel):
    caller_symbol_id: str
    caller_name: str
    caller_file: str
    relative_path: str
    call_line: int
    raw_call: str
    impact_reason: str


class AffectedRoute(BaseModel):
    http_method: str
    route_path: str
    handler_name: str
    file_path: str
    line_number: int
    impact_level: str  # 'critical', 'high', 'medium'
    reason: str


class ImpactSimulationResult(BaseModel):
    target_id: str
    target_name: str
    simulation_type: SimulationType
    new_name_or_path: Optional[str] = None
    estimated_risk_score: float  # 0.0 to 100.0
    risk_level: str  # 'Low', 'Moderate', 'High', 'Critical'
    total_broken_callers: int
    total_broken_imports: int
    total_affected_apis: int
    total_downstream_files: int
    broken_callers: List[BrokenCaller] = Field(default_factory=list)
    broken_imports: List[BrokenImport] = Field(default_factory=list)
    affected_apis: List[AffectedRoute] = Field(default_factory=list)
    downstream_dependencies: List[str] = Field(default_factory=list)
    subgraph_nodes: List[Dict[str, Any]] = Field(default_factory=list)
    subgraph_edges: List[Dict[str, Any]] = Field(default_factory=list)
    summary_markdown: str


class ImpactSimulator:
    """
    Change Impact Simulator Engine:
    Simulates architectural and semantic consequences of code refactoring:
    - Function / Method Deletion
    - Class Deletion
    - Module / Directory Deletion
    - Function / Symbol Rename
    - File Movement / Relocation
    - Module Extraction / Boundary Splitting
    """

    def __init__(self, graph_store: GraphStore, fact_store: Optional[FactStore] = None):
        self.graph_store = graph_store
        self.fact_store = fact_store

    def get_simulation_targets(self) -> Dict[str, Any]:
        """Returns lists of symbols, classes, files, and modules available for simulation."""
        symbols = []
        classes = []
        files = []
        modules = []

        if self.graph_store and self.graph_store.call_builder:
            for s_id, sym in self.graph_store.call_builder.symbols_by_id.items():
                rel = (
                    self.graph_store.file_asts[sym.file_path].relative_path.replace("\\", "/")
                    if sym.file_path in self.graph_store.file_asts
                    else sym.file_path
                )
                item = {
                    "id": s_id,
                    "name": sym.name,
                    "kind": sym.kind.value if hasattr(sym.kind, "value") else str(sym.kind),
                    "file_path": sym.file_path,
                    "relative_path": rel,
                    "line": sym.start_line,
                }
                if sym.kind == SymbolKind.CLASS:
                    classes.append(item)
                elif sym.kind in (SymbolKind.FUNCTION, SymbolKind.METHOD, SymbolKind.ASYNC_FUNCTION):
                    symbols.append(item)

        if self.graph_store:
            for f_path, ast in self.graph_store.file_asts.items():
                files.append({
                    "id": f_path,
                    "name": os.path.basename(f_path),
                    "relative_path": ast.relative_path.replace("\\", "/"),
                    "line_count": ast.line_count,
                    "symbol_count": len(ast.symbols),
                })
            for m_id, cluster in self.graph_store.modules.items():
                modules.append({
                    "id": m_id,
                    "name": cluster.name,
                    "relative_dir": cluster.relative_dir,
                    "file_count": len(cluster.file_paths),
                })

        return {
            "functions": sorted(symbols, key=lambda x: x["name"])[:100],
            "classes": sorted(classes, key=lambda x: x["name"])[:60],
            "files": sorted(files, key=lambda x: x["relative_path"])[:80],
            "modules": sorted(modules, key=lambda x: x["name"]),
        }

    def simulate(
        self,
        target_id: str,
        simulation_type: SimulationType,
        new_name_or_path: Optional[str] = None,
    ) -> ImpactSimulationResult:
        if simulation_type in (SimulationType.FUNCTION_DELETE, SimulationType.FUNCTION_RENAME):
            return self._simulate_function_impact(target_id, simulation_type, new_name_or_path)
        elif simulation_type == SimulationType.CLASS_DELETE:
            return self._simulate_class_impact(target_id)
        elif simulation_type in (SimulationType.MODULE_DELETE, SimulationType.MODULE_EXTRACT):
            return self._simulate_module_impact(target_id, simulation_type, new_name_or_path)
        elif simulation_type == SimulationType.FILE_MOVE:
            return self._simulate_file_move_impact(target_id, new_name_or_path)
        else:
            return self._simulate_function_impact(target_id, SimulationType.FUNCTION_DELETE)

    def _simulate_function_impact(
        self, target_id: str, sim_type: SimulationType, new_name: Optional[str] = None
    ) -> ImpactSimulationResult:
        broken_callers: List[BrokenCaller] = []
        broken_imports: List[BrokenImport] = []
        affected_apis: List[AffectedRoute] = []
        downstream_files: Set[str] = set()

        sym = self.graph_store.call_builder.symbols_by_id.get(target_id) if self.graph_store.call_builder else None
        target_name = sym.name if sym else target_id.split("::")[-1]
        target_file = sym.file_path if sym else ""

        # 1. Traverse callers in call graph
        if self.graph_store and self.graph_store.call_graph.has_node(target_id):
            callers = list(self.graph_store.call_graph.predecessors(target_id))
            for caller_id in callers:
                caller_sym = self.graph_store.call_builder.symbols_by_id.get(caller_id)
                caller_file = caller_sym.file_path if caller_sym else ""
                rel_caller = (
                    self.graph_store.file_asts[caller_file].relative_path.replace("\\", "/")
                    if caller_file in self.graph_store.file_asts
                    else caller_file
                )
                if caller_file:
                    downstream_files.add(caller_file)

                # Get call edge details
                edge_data = self.graph_store.call_graph.get_edge_data(caller_id, target_id) or {}
                raw_call = edge_data.get("raw_call", f"{target_name}()")
                call_line = edge_data.get("line_number", caller_sym.start_line if caller_sym else 1)

                reason = (
                    f"Direct call invocation to deleted function '{target_name}()' will raise NameError/TypeError."
                    if sim_type == SimulationType.FUNCTION_DELETE
                    else f"Call site expects '{target_name}()' but function is renamed to '{new_name or 'new_name'}()'."
                )

                broken_callers.append(
                    BrokenCaller(
                        caller_symbol_id=caller_id,
                        caller_name=caller_sym.name if caller_sym else caller_id,
                        caller_file=caller_file,
                        relative_path=rel_caller,
                        call_line=call_line,
                        raw_call=raw_call,
                        impact_reason=reason,
                    )
                )

        # 2. Check if target is explicitly imported
        if target_file and self.graph_store:
            for f_path, ast in self.graph_store.file_asts.items():
                if f_path == target_file:
                    continue
                for imp in ast.imports:
                    for s in imp.imported_symbols:
                        if s.name == target_name:
                            downstream_files.add(f_path)
                            rel = ast.relative_path.replace("\\", "/")
                            broken_imports.append(
                                BrokenImport(
                                    file_path=f_path,
                                    relative_path=rel,
                                    line_number=imp.line_number,
                                    imported_symbol_or_module=target_name,
                                    impact_reason=f"Import statement 'from {imp.source_module} import {target_name}' will fail with ImportError.",
                                )
                            )

        # 3. Check affected API routes
        if self.fact_store:
            for route in self.fact_store.routes:
                if route.handler_name == target_name:
                    affected_apis.append(
                        AffectedRoute(
                            http_method=route.http_method,
                            route_path=route.route_path,
                            handler_name=route.handler_name,
                            file_path=route.file_path,
                            line_number=route.line_number,
                            impact_level="critical",
                            reason=f"Endpoint handler '{target_name}()' will be unreachable, returning HTTP 500.",
                        )
                    )
                else:
                    # Check if route handler calls this target directly
                    matching_callers = [c for c in broken_callers if route.handler_name in c.caller_name]
                    if matching_callers:
                        affected_apis.append(
                            AffectedRoute(
                                http_method=route.http_method,
                                route_path=route.route_path,
                                handler_name=route.handler_name,
                                file_path=route.file_path,
                                line_number=route.line_number,
                                impact_level="high",
                                reason=f"Handler '{route.handler_name}()' relies directly on modified target '{target_name}()'.",
                            )
                        )

        # 4. Calculate Risk Score
        total_files = max(1, len(self.graph_store.file_asts) if self.graph_store else 1)
        file_pct = (len(downstream_files) / total_files) * 50.0
        caller_weight = min(30.0, len(broken_callers) * 6.0)
        api_weight = min(20.0, len(affected_apis) * 10.0)
        risk_score = min(100.0, round(file_pct + caller_weight + api_weight, 1))

        risk_level = "Low"
        if risk_score >= 70:
            risk_level = "Critical"
        elif risk_score >= 40:
            risk_level = "High"
        elif risk_score >= 15:
            risk_level = "Moderate"

        # Build Subgraph
        nodes, edges = self._build_subgraph(target_id, target_name, broken_callers, broken_imports)

        summary_md = f"""### ⚠️ Impact Simulation: `{target_name}` ({sim_type.value})
- **Estimated Risk Level**: **{risk_level} ({risk_score}/100)**
- **Broken Call Sites**: `{len(broken_callers)}` call invocations
- **Broken Imports**: `{len(broken_imports)}` external files
- **Affected API Routes**: `{len(affected_apis)}` endpoints
- **Transitive Impact**: `{len(downstream_files)}` downstream files
"""

        return ImpactSimulationResult(
            target_id=target_id,
            target_name=target_name,
            simulation_type=sim_type,
            new_name_or_path=new_name,
            estimated_risk_score=risk_score,
            risk_level=risk_level,
            total_broken_callers=len(broken_callers),
            total_broken_imports=len(broken_imports),
            total_affected_apis=len(affected_apis),
            total_downstream_files=len(downstream_files),
            broken_callers=broken_callers,
            broken_imports=broken_imports,
            affected_apis=affected_apis,
            downstream_dependencies=[
                self.graph_store.file_asts[f].relative_path.replace("\\", "/")
                if f in self.graph_store.file_asts
                else f
                for f in downstream_files
            ],
            subgraph_nodes=nodes,
            subgraph_edges=edges,
            summary_markdown=summary_md,
        )

    def _simulate_class_impact(self, target_id: str) -> ImpactSimulationResult:
        sym = self.graph_store.call_builder.symbols_by_id.get(target_id) if self.graph_store.call_builder else None
        class_name = sym.name if sym else target_id.split("::")[-1]
        target_file = sym.file_path if sym else ""

        broken_callers: List[BrokenCaller] = []
        broken_imports: List[BrokenImport] = []
        affected_apis: List[AffectedRoute] = []
        downstream_files: Set[str] = set()

        # Find all member methods of this class and simulate deletion of all
        if self.graph_store and self.graph_store.call_builder:
            for s_id, s in self.graph_store.call_builder.symbols_by_id.items():
                if s.scope == class_name or s_id == target_id:
                    if self.graph_store.call_graph.has_node(s_id):
                        for caller_id in self.graph_store.call_graph.predecessors(s_id):
                            caller_sym = self.graph_store.call_builder.symbols_by_id.get(caller_id)
                            caller_file = caller_sym.file_path if caller_sym else ""
                            if caller_file:
                                downstream_files.add(caller_file)
                            rel = (
                                self.graph_store.file_asts[caller_file].relative_path.replace("\\", "/")
                                if caller_file in self.graph_store.file_asts
                                else caller_file
                            )
                            broken_callers.append(
                                BrokenCaller(
                                    caller_symbol_id=caller_id,
                                    caller_name=caller_sym.name if caller_sym else caller_id,
                                    caller_file=caller_file,
                                    relative_path=rel,
                                    call_line=caller_sym.start_line if caller_sym else 1,
                                    raw_call=f"{class_name}.{s.name}()",
                                    impact_reason=f"Invocation of member method '{s.name}()' on deleted class '{class_name}'.",
                                )
                            )

        # Check imports of this class
        if self.graph_store:
            for f_path, ast in self.graph_store.file_asts.items():
                for imp in ast.imports:
                    for s in imp.imported_symbols:
                        if s.name == class_name:
                            downstream_files.add(f_path)
                            broken_imports.append(
                                BrokenImport(
                                    file_path=f_path,
                                    relative_path=ast.relative_path.replace("\\", "/"),
                                    line_number=imp.line_number,
                                    imported_symbol_or_module=class_name,
                                    impact_reason=f"Import of deleted class '{class_name}' from '{imp.source_module}'.",
                                )
                            )

        total_files = max(1, len(self.graph_store.file_asts) if self.graph_store else 1)
        risk_score = min(100.0, round((len(downstream_files) / total_files) * 60.0 + len(broken_callers) * 4.0 + 10.0, 1))
        risk_level = "Critical" if risk_score >= 70 else ("High" if risk_score >= 40 else "Moderate")

        nodes, edges = self._build_subgraph(target_id, class_name, broken_callers, broken_imports)

        summary_md = f"""### ⚠️ Class Deletion Simulation: `{class_name}`
- **Estimated Risk Level**: **{risk_level} ({risk_score}/100)**
- **Broken Member Callers**: `{len(broken_callers)}` call sites
- **Broken Class Imports**: `{len(broken_imports)}` files
- **Impacted Downstream Files**: `{len(downstream_files)}` files
"""

        return ImpactSimulationResult(
            target_id=target_id,
            target_name=class_name,
            simulation_type=SimulationType.CLASS_DELETE,
            estimated_risk_score=risk_score,
            risk_level=risk_level,
            total_broken_callers=len(broken_callers),
            total_broken_imports=len(broken_imports),
            total_affected_apis=len(affected_apis),
            total_downstream_files=len(downstream_files),
            broken_callers=broken_callers,
            broken_imports=broken_imports,
            affected_apis=affected_apis,
            downstream_dependencies=[
                self.graph_store.file_asts[f].relative_path.replace("\\", "/")
                if f in self.graph_store.file_asts
                else f
                for f in downstream_files
            ],
            subgraph_nodes=nodes,
            subgraph_edges=edges,
            summary_markdown=summary_md,
        )

    def _simulate_module_impact(
        self, target_id: str, sim_type: SimulationType, target_dir: Optional[str] = None
    ) -> ImpactSimulationResult:
        cluster = self.graph_store.modules.get(target_id) if self.graph_store else None
        module_name = cluster.name if cluster else target_id
        module_files = set(cluster.file_paths) if cluster else set()

        broken_imports: List[BrokenImport] = []
        broken_callers: List[BrokenCaller] = []
        affected_apis: List[AffectedRoute] = []
        downstream_files: Set[str] = set()

        if self.graph_store:
            for f_path, ast in self.graph_store.file_asts.items():
                if f_path in module_files:
                    continue
                for imp in ast.imports:
                    # Check if imported source belongs to this module
                    if any(mf.endswith(imp.source_module.replace(".", "/") + ".py") or imp.source_module in mf for mf in module_files):
                        downstream_files.add(f_path)
                        rel = ast.relative_path.replace("\\", "/")
                        broken_imports.append(
                            BrokenImport(
                                file_path=f_path,
                                relative_path=rel,
                                line_number=imp.line_number,
                                imported_symbol_or_module=imp.source_module,
                                impact_reason=f"Module '{module_name}' deletion removes '{imp.source_module}'.",
                            )
                        )

        # Check API routes located inside module
        if self.fact_store:
            for route in self.fact_store.routes:
                if route.file_path in module_files:
                    affected_apis.append(
                        AffectedRoute(
                            http_method=route.http_method,
                            route_path=route.route_path,
                            handler_name=route.handler_name,
                            file_path=route.file_path,
                            line_number=route.line_number,
                            impact_level="critical",
                            reason=f"API route '{route.route_path}' handler resides inside deleted module '{module_name}'.",
                        )
                    )

        total_files = max(1, len(self.graph_store.file_asts) if self.graph_store else 1)
        risk_score = min(100.0, round((len(downstream_files) / total_files) * 60.0 + len(affected_apis) * 8.0 + 20.0, 1))
        risk_level = "Critical" if risk_score >= 60 else "High"

        nodes = [
            {"id": target_id, "type": "moduleNode", "data": {"label": f"Module: {module_name}", "isTarget": True}, "position": {"x": 200, "y": 100}}
        ]
        edges = []
        for idx, imp in enumerate(broken_imports[:15]):
            n_id = f"imp_{idx}"
            nodes.append({"id": n_id, "type": "fileNode", "data": {"label": imp.relative_path}, "position": {"x": 50 + (idx % 3) * 180, "y": 250 + (idx // 3) * 80}})
            edges.append({"id": f"e_{idx}", "source": n_id, "target": target_id, "animated": True, "label": "broken import"})

        summary_md = f"""### ⚠️ Module Impact Simulation: `{module_name}`
- **Estimated Risk Level**: **{risk_level} ({risk_score}/100)**
- **Contained Files Removed**: `{len(module_files)}` files
- **External Broken Imports**: `{len(broken_imports)}` files
- **Affected API Endpoints**: `{len(affected_apis)}` endpoints
"""

        return ImpactSimulationResult(
            target_id=target_id,
            target_name=module_name,
            simulation_type=sim_type,
            new_name_or_path=target_dir,
            estimated_risk_score=risk_score,
            risk_level=risk_level,
            total_broken_callers=0,
            total_broken_imports=len(broken_imports),
            total_affected_apis=len(affected_apis),
            total_downstream_files=len(downstream_files),
            broken_callers=[],
            broken_imports=broken_imports,
            affected_apis=affected_apis,
            downstream_dependencies=[
                self.graph_store.file_asts[f].relative_path.replace("\\", "/")
                if f in self.graph_store.file_asts
                else f
                for f in downstream_files
            ],
            subgraph_nodes=nodes,
            subgraph_edges=edges,
            summary_markdown=summary_md,
        )

    def _simulate_file_move_impact(
        self, target_id: str, new_path: Optional[str] = None
    ) -> ImpactSimulationResult:
        file_path = target_id
        ast = self.graph_store.file_asts.get(file_path) if self.graph_store else None
        file_name = os.path.basename(file_path) if file_path else "file"
        rel_path = ast.relative_path.replace("\\", "/") if ast else file_path

        broken_imports: List[BrokenImport] = []
        downstream_files: Set[str] = set()

        if self.graph_store and self.graph_store.dep_graph.has_node(file_path):
            importers = list(self.graph_store.dep_graph.predecessors(file_path))
            for imp_file in importers:
                downstream_files.add(imp_file)
                imp_ast = self.graph_store.file_asts.get(imp_file)
                rel_imp = imp_ast.relative_path.replace("\\", "/") if imp_ast else os.path.basename(imp_file)
                broken_imports.append(
                    BrokenImport(
                        file_path=imp_file,
                        relative_path=rel_imp,
                        line_number=1,
                        imported_symbol_or_module=file_name,
                        impact_reason=f"File import pointing to '{rel_path}' will break after relocation to '{new_path or 'new_location'}'.",
                    )
                )

        risk_score = min(100.0, round(len(broken_imports) * 12.0 + 5.0, 1))
        risk_level = "High" if risk_score >= 50 else ("Moderate" if risk_score >= 20 else "Low")

        nodes = [{"id": file_path, "type": "fileNode", "data": {"label": rel_path, "isTarget": True}, "position": {"x": 250, "y": 100}}]
        edges = []
        for idx, imp in enumerate(broken_imports[:12]):
            n_id = f"mv_imp_{idx}"
            nodes.append({"id": n_id, "type": "fileNode", "data": {"label": imp.relative_path}, "position": {"x": 50 + (idx % 3) * 180, "y": 250 + (idx // 3) * 70}})
            edges.append({"id": f"e_mv_{idx}", "source": n_id, "target": file_path, "animated": True, "label": "re-resolve"})

        summary_md = f"""### ⚠️ File Relocation Simulation: `{rel_path}`
- **Destination Target**: `{new_path or 'new/path/to/file'}`
- **Estimated Risk Level**: **{risk_level} ({risk_score}/100)**
- **Imports Requiring Update**: `{len(broken_imports)}` files
"""

        return ImpactSimulationResult(
            target_id=target_id,
            target_name=file_name,
            simulation_type=SimulationType.FILE_MOVE,
            new_name_or_path=new_path,
            estimated_risk_score=risk_score,
            risk_level=risk_level,
            total_broken_callers=0,
            total_broken_imports=len(broken_imports),
            total_affected_apis=0,
            total_downstream_files=len(downstream_files),
            broken_callers=[],
            broken_imports=broken_imports,
            affected_apis=[],
            downstream_dependencies=[
                self.graph_store.file_asts[f].relative_path.replace("\\", "/")
                if f in self.graph_store.file_asts
                else f
                for f in downstream_files
            ],
            subgraph_nodes=nodes,
            subgraph_edges=edges,
            summary_markdown=summary_md,
        )

    def _build_subgraph(
        self,
        target_id: str,
        target_name: str,
        broken_callers: List[BrokenCaller],
        broken_imports: List[BrokenImport],
    ) -> tuple[List[Dict[str, Any]], List[Dict[str, Any]]]:
        nodes = [
            {
                "id": target_id,
                "type": "symbolNode",
                "data": {"label": target_name, "isTarget": True, "kind": "target"},
                "position": {"x": 300, "y": 80},
            }
        ]
        edges = []

        seen_nodes = {target_id}
        for idx, caller in enumerate(broken_callers[:12]):
            cid = caller.caller_symbol_id
            if cid not in seen_nodes:
                seen_nodes.add(cid)
                nodes.append({
                    "id": cid,
                    "type": "symbolNode",
                    "data": {"label": f"{caller.caller_name}()", "filePath": caller.relative_path, "kind": "caller"},
                    "position": {"x": 50 + (idx % 3) * 190, "y": 240 + (idx // 3) * 80},
                })
            edges.append({
                "id": f"edge_caller_{idx}",
                "source": cid,
                "target": target_id,
                "animated": True,
                "label": "calls",
            })

        for idx, imp in enumerate(broken_imports[:8]):
            fid = f"imp_node_{idx}"
            if fid not in seen_nodes:
                seen_nodes.add(fid)
                nodes.append({
                    "id": fid,
                    "type": "fileNode",
                    "data": {"label": imp.relative_path, "filePath": imp.file_path, "kind": "importer"},
                    "position": {"x": 40 + (idx % 2) * 220, "y": 420 + (idx // 2) * 80},
                })
            edges.append({
                "id": f"edge_imp_{idx}",
                "source": fid,
                "target": target_id,
                "animated": True,
                "label": "imports",
            })

        return nodes, edges
