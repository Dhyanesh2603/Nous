from typing import Dict, List, Set, Any, Optional, Tuple
import os
import networkx as nx
from pydantic import BaseModel, Field

from app.parsers.symbol_types import FileAST, ASTSymbol, SymbolKind
from app.graph.dependency_graph import DependencyGraphBuilder, DependencyEdge
from app.graph.call_graph import CallGraphBuilder, CallEdge
from app.graph.module_detector import ModuleDetector, ModuleCluster


class ReactFlowNode(BaseModel):
    id: str
    type: str  # 'moduleNode', 'fileNode', 'symbolNode'
    data: Dict[str, Any]
    position: Dict[str, float] = Field(default_factory=lambda: {"x": 0.0, "y": 0.0})


class ReactFlowEdge(BaseModel):
    id: str
    source: str
    target: str
    label: Optional[str] = None
    animated: bool = False
    style: Optional[Dict[str, Any]] = None
    data: Optional[Dict[str, Any]] = None


class GraphStructureResponse(BaseModel):
    nodes: List[ReactFlowNode]
    edges: List[ReactFlowEdge]
    view_mode: str
    summary: Dict[str, Any]


class BlastRadiusItem(BaseModel):
    id: str
    name: str
    type: str
    file_path: str
    depth: int
    impact_score: float
    relationship: str


class BlastRadiusResponse(BaseModel):
    target_id: str
    target_name: str
    target_type: str
    total_impacted_symbols: int
    total_impacted_files: int
    impact_items: List[BlastRadiusItem]
    subgraph_nodes: List[ReactFlowNode]
    subgraph_edges: List[ReactFlowEdge]


class GraphStore:
    def __init__(self, root_dir: str):
        self.root_dir = os.path.abspath(root_dir)
        self.file_asts: Dict[str, FileAST] = {}
        self.dep_builder: Optional[DependencyGraphBuilder] = None
        self.call_builder: Optional[CallGraphBuilder] = None
        self.module_detector: Optional[ModuleDetector] = None
        
        self.dep_graph = nx.DiGraph()
        self.call_graph = nx.DiGraph()
        self.modules: Dict[str, ModuleCluster] = {}
        self.cycles: List[List[str]] = []

    def set_file_asts(self, file_asts: Dict[str, FileAST]):
        self.file_asts = file_asts
        
        # Build dependency graph
        self.dep_builder = DependencyGraphBuilder(self.root_dir, self.file_asts)
        self.dep_graph = self.dep_builder.build()
        self.cycles = self.dep_builder.cycles
        
        # Build call graph
        self.call_builder = CallGraphBuilder(self.root_dir, self.file_asts, self.dep_builder)
        self.call_graph = self.call_builder.build()
        
        # Detect modules
        self.module_detector = ModuleDetector(self.root_dir, self.file_asts, self.dep_graph)
        self.modules = self.module_detector.detect_modules()

    def get_react_flow_graph(self, view_mode: str = "file") -> GraphStructureResponse:
        nodes: List[ReactFlowNode] = []
        edges: List[ReactFlowEdge] = []
        
        if view_mode == "module":
            nodes, edges = self._build_module_view()
        elif view_mode == "symbol":
            nodes, edges = self._build_symbol_view()
        elif view_mode == "combined":
            nodes, edges = self._build_combined_view()
        elif view_mode in ("frontend", "backend"):
            nodes, edges = self._build_scoped_file_view(view_mode)
        else:  # default: file view
            nodes, edges = self._build_file_view()

        summary = {
            "total_files": len(self.file_asts),
            "total_modules": len(self.modules),
            "total_symbols": len(self.call_builder.symbols_by_id) if self.call_builder else 0,
            "total_calls": len(self.call_builder.edges) if self.call_builder else 0,
            "total_dependencies": len(self.dep_builder.edges) if self.dep_builder else 0,
            "circular_cycles_count": len(self.cycles),
        }

        return GraphStructureResponse(
            nodes=nodes,
            edges=edges,
            view_mode=view_mode,
            summary=summary,
        )

    def _build_module_view(self) -> Tuple[List[ReactFlowNode], List[ReactFlowEdge]]:
        nodes: List[ReactFlowNode] = []
        edges: List[ReactFlowEdge] = []
        
        file_to_module: Dict[str, str] = {}
        for mod_id, cluster in self.modules.items():
            for f in cluster.file_paths:
                file_to_module[f] = mod_id
                
            nodes.append(
                ReactFlowNode(
                    id=mod_id,
                    type="moduleNode",
                    data={
                        "id": mod_id,
                        "name": cluster.name,
                        "fileCount": len(cluster.file_paths),
                        "symbolCount": cluster.symbol_count,
                        "lineCount": cluster.line_count,
                        "afferentCoupling": cluster.afferent_coupling,
                        "efferentCoupling": cluster.efferent_coupling,
                        "instability": cluster.instability,
                        "files": [os.path.relpath(p, self.root_dir).replace("\\", "/") for p in cluster.file_paths],
                    },
                )
            )

        # Aggregate edges between modules
        module_edges_map: Dict[Tuple[str, str], int] = {}
        for u, v, data in self.dep_graph.edges(data=True):
            mod_u = file_to_module.get(u)
            mod_v = file_to_module.get(v)
            if mod_u and mod_v and mod_u != mod_v:
                pair = (mod_u, mod_v)
                module_edges_map[pair] = module_edges_map.get(pair, 0) + 1

        for (src, tgt), weight in module_edges_map.items():
            edges.append(
                ReactFlowEdge(
                    id=f"e::{src}->{tgt}",
                    source=src,
                    target=tgt,
                    label=f"{weight} imports",
                    data={"weight": weight},
                )
            )

        return nodes, edges

    def _build_file_view(self) -> Tuple[List[ReactFlowNode], List[ReactFlowEdge]]:
        nodes: List[ReactFlowNode] = []
        edges: List[ReactFlowEdge] = []
        
        # Cycle nodes set
        cycle_nodes_set: Set[str] = set()
        for c in self.cycles:
            cycle_nodes_set.update(c)

        for file_path, ast in self.file_asts.items():
            rel = ast.relative_path.replace("\\", "/")
            mod_name = os.path.dirname(rel) if os.path.dirname(rel) else "root"
            
            nodes.append(
                ReactFlowNode(
                    id=file_path,
                    type="fileNode",
                    data={
                        "id": file_path,
                        "label": os.path.basename(file_path),
                        "relativePath": rel,
                        "moduleName": mod_name,
                        "language": ast.language,
                        "lineCount": ast.line_count,
                        "symbolCount": len(ast.symbols),
                        "importCount": len(ast.imports),
                        "exportCount": len(ast.exports),
                        "inCycle": file_path in cycle_nodes_set,
                        "symbols": [
                            {"name": s.name, "kind": s.kind.value if hasattr(s.kind, "value") else str(s.kind), "line": s.start_line}
                            for s in ast.symbols[:8]
                        ],
                    },
                )
            )

        for u, v, data in self.dep_graph.edges(data=True):
            if u in self.file_asts and v in self.file_asts:
                symbols_imported = data.get("symbols", [])
                label_text = ", ".join(symbols_imported[:2]) + (f" +{len(symbols_imported)-2}" if len(symbols_imported) > 2 else "")
                edges.append(
                    ReactFlowEdge(
                        id=f"e::{u}->{v}",
                        source=u,
                        target=v,
                        label=label_text if symbols_imported else None,
                        data={"symbols": symbols_imported, "weight": data.get("weight", 1)},
                    )
                )

        return nodes, edges

    def _build_scoped_file_view(self, scope: str) -> Tuple[List[ReactFlowNode], List[ReactFlowEdge]]:
        all_nodes, all_edges = self._build_file_view()
        
        frontend_extensions = {
            ".tsx", ".jsx", ".vue", ".svelte", ".html", ".htm", ".css", ".scss", ".sass", ".less"
        }
        frontend_keywords = {
            "component", "views", "pages", "hooks", "layouts", "frontend", "ui", "context",
            "store", "client", "web", "assets", "styles", "modal", "canvas", "header",
            "footer", "button", "screen", "widgets", "router", "app", "nav"
        }
        
        scoped_nodes = []
        scoped_node_ids = set()

        for node in all_nodes:
            rel = (node.data.get("relativePath") or "").lower()
            ext = os.path.splitext(rel)[1].lower()
            
            # Check if file is frontend based on extension, path keywords, or AST symbols/imports
            is_fe = ext in frontend_extensions or any(k in rel for k in frontend_keywords)
            
            # For .ts / .js files, also check if imported/exporting UI components or state
            if not is_fe and ext in (".ts", ".js", ".mjs"):
                file_obj = self.file_asts.get(node.id)
                if file_obj:
                    content_lower = (file_obj.raw_content or "").lower()
                    if any(lib in content_lower for lib in ("react", "vue", "svelte", "useState", "useEffect", "document.", "window.")):
                        is_fe = True

            if scope == "frontend" and is_fe:
                scoped_nodes.append(node)
                scoped_node_ids.add(node.id)
            elif scope == "backend" and not is_fe:
                scoped_nodes.append(node)
                scoped_node_ids.add(node.id)

        # Filter edges to only include those where both source and target are in scoped_nodes
        scoped_edges = [
            e for e in all_edges
            if e.source in scoped_node_ids and e.target in scoped_node_ids
        ]

        # If scoped filtering produced empty results (e.g. backend-only repo for frontend view), fallback gracefully
        if not scoped_nodes:
            return all_nodes, all_edges

        return scoped_nodes, scoped_edges

    def _build_symbol_view(self) -> Tuple[List[ReactFlowNode], List[ReactFlowEdge]]:
        nodes: List[ReactFlowNode] = []
        edges: List[ReactFlowEdge] = []

        if not self.call_builder:
            return nodes, edges

        for sym_id, sym in self.call_builder.symbols_by_id.items():
            rel_file = self.file_asts[sym.file_path].relative_path if sym.file_path in self.file_asts else sym.file_path
            nodes.append(
                ReactFlowNode(
                    id=sym_id,
                    type="symbolNode",
                    data={
                        "id": sym_id,
                        "name": sym.name,
                        "kind": sym.kind.value if hasattr(sym.kind, "value") else str(sym.kind),
                        "filePath": sym.file_path,
                        "relativePath": rel_file,
                        "startLine": sym.start_line,
                        "endLine": sym.end_line,
                        "signature": sym.signature,
                        "docstring": sym.docstring,
                        "complexity": sym.cyclomatic_complexity,
                        "scope": sym.scope,
                    },
                )
            )

        for u, v, data in self.call_graph.edges(data=True):
            edges.append(
                ReactFlowEdge(
                    id=f"e::{u}->{v}",
                    source=u,
                    target=v,
                    label=data.get("raw_call"),
                    data={"raw_call": data.get("raw_call"), "lineNumber": data.get("line_number")},
                )
            )

        return nodes, edges

    def _build_combined_view(self) -> Tuple[List[ReactFlowNode], List[ReactFlowEdge]]:
        # Combined contains both Files and high-complexity Symbols
        nodes, edges = self._build_file_view()
        if self.call_builder:
            for sym_id, sym in self.call_builder.symbols_by_id.items():
                if sym.cyclomatic_complexity > 1 or sym.kind in (SymbolKind.CLASS, SymbolKind.INTERFACE):
                    rel_file = self.file_asts[sym.file_path].relative_path if sym.file_path in self.file_asts else sym.file_path
                    nodes.append(
                        ReactFlowNode(
                            id=sym_id,
                            type="symbolNode",
                            data={
                                "id": sym_id,
                                "name": sym.name,
                                "kind": sym.kind.value if hasattr(sym.kind, "value") else str(sym.kind),
                                "filePath": sym.file_path,
                                "relativePath": rel_file,
                                "startLine": sym.start_line,
                                "endLine": sym.end_line,
                                "signature": sym.signature,
                                "complexity": sym.cyclomatic_complexity,
                            },
                        )
                    )
        return nodes, edges

    def calculate_blast_radius(self, target_id: str, max_depth: int = 4) -> BlastRadiusResponse:
        """
        Calculates downstream impact of modifying a symbol or file.
        Uses reverse graph traversal (callers who invoke target symbol, or files that import target file).
        """
        is_symbol = "::" in target_id
        impact_items: List[BlastRadiusItem] = []
        visited_nodes: Set[str] = {target_id}
        subgraph_node_ids: Set[str] = {target_id}
        subgraph_edges: List[ReactFlowEdge] = []
        
        target_name = target_id
        target_type = "symbol" if is_symbol else "file"
        
        if is_symbol and self.call_builder and target_id in self.call_builder.symbols_by_id:
            sym = self.call_builder.symbols_by_id[target_id]
            target_name = sym.name
            
            # BFS on reverse call graph (predecessors are callers)
            queue = [(target_id, 0)]
            
            while queue:
                curr_id, depth = queue.pop(0)
                if depth >= max_depth:
                    continue
                
                # Predecessors in call graph are the callers
                for caller_id in self.call_graph.predecessors(curr_id):
                    edge_data = self.call_graph[caller_id][curr_id]
                    subgraph_edges.append(
                        ReactFlowEdge(
                            id=f"blast_e::{caller_id}->{curr_id}",
                            source=caller_id,
                            target=curr_id,
                            animated=True,
                            label=edge_data.get("raw_call"),
                        )
                    )
                    
                    if caller_id not in visited_nodes:
                        visited_nodes.add(caller_id)
                        subgraph_node_ids.add(caller_id)
                        
                        caller_sym = self.call_builder.symbols_by_id.get(caller_id)
                        name = caller_sym.name if caller_sym else caller_id
                        f_path = caller_sym.file_path if caller_sym else ""
                        impact_score = round(1.0 / (depth + 1), 2)
                        
                        impact_items.append(
                            BlastRadiusItem(
                                id=caller_id,
                                name=name,
                                type="symbol",
                                file_path=f_path,
                                depth=depth + 1,
                                impact_score=impact_score,
                                relationship=f"Invokes {curr_id.split('::')[-1]} (depth {depth + 1})",
                            )
                        )
                        queue.append((caller_id, depth + 1))
        
        elif not is_symbol and target_id in self.dep_graph:
            target_name = os.path.basename(target_id)
            
            # BFS on reverse dependency graph (predecessors are importing files)
            queue = [(target_id, 0)]
            
            while queue:
                curr_id, depth = queue.pop(0)
                if depth >= max_depth:
                    continue
                
                for dependant_file in self.dep_graph.predecessors(curr_id):
                    edge_data = self.dep_graph[dependant_file][curr_id]
                    subgraph_edges.append(
                        ReactFlowEdge(
                            id=f"blast_e::{dependant_file}->{curr_id}",
                            source=dependant_file,
                            target=curr_id,
                            animated=True,
                            label="imports",
                        )
                    )
                    
                    if dependant_file not in visited_nodes:
                        visited_nodes.add(dependant_file)
                        subgraph_node_ids.add(dependant_file)
                        impact_score = round(1.0 / (depth + 1), 2)
                        
                        impact_items.append(
                            BlastRadiusItem(
                                id=dependant_file,
                                name=os.path.basename(dependant_file),
                                type="file",
                                file_path=dependant_file,
                                depth=depth + 1,
                                impact_score=impact_score,
                                relationship=f"Imports {os.path.basename(curr_id)} (depth {depth + 1})",
                            )
                        )
                        queue.append((dependant_file, depth + 1))

        # Build subgraph nodes
        subgraph_nodes: List[ReactFlowNode] = []
        for nid in subgraph_node_ids:
            if "::" in nid and self.call_builder and nid in self.call_builder.symbols_by_id:
                s = self.call_builder.symbols_by_id[nid]
                subgraph_nodes.append(
                    ReactFlowNode(
                        id=nid,
                        type="symbolNode",
                        data={
                            "id": nid,
                            "name": s.name,
                            "kind": s.kind.value if hasattr(s.kind, "value") else str(s.kind),
                            "filePath": s.file_path,
                            "relativePath": self.file_asts[s.file_path].relative_path if s.file_path in self.file_asts else s.file_path,
                            "startLine": s.start_line,
                            "endLine": s.end_line,
                            "signature": s.signature,
                            "isTarget": nid == target_id,
                        },
                    )
                )
            elif nid in self.file_asts:
                fast = self.file_asts[nid]
                subgraph_nodes.append(
                    ReactFlowNode(
                        id=nid,
                        type="fileNode",
                        data={
                            "id": nid,
                            "label": os.path.basename(nid),
                            "relativePath": fast.relative_path,
                            "language": fast.language,
                            "lineCount": fast.line_count,
                            "isTarget": nid == target_id,
                        },
                    )
                )

        unique_files = {item.file_path for item in impact_items if item.file_path}
        
        return BlastRadiusResponse(
            target_id=target_id,
            target_name=target_name,
            target_type=target_type,
            total_impacted_symbols=len([i for i in impact_items if i.type == "symbol"]),
            total_impacted_files=len(unique_files),
            impact_items=impact_items,
            subgraph_nodes=subgraph_nodes,
            subgraph_edges=subgraph_edges,
        )
