import os
from typing import List, Dict, Any, Optional
from pydantic import BaseModel, Field

from app.parsers.symbol_types import SymbolKind


class KnowledgeNode(BaseModel):
    id: str
    label: str
    entity_type: str  # 'file', 'module', 'function', 'class', 'route', 'table', 'vulnerability'
    file_path: Optional[str] = None
    relative_path: Optional[str] = None
    line_number: Optional[int] = None
    metadata: Dict[str, Any] = Field(default_factory=dict)


class KnowledgeEdge(BaseModel):
    id: str
    source: str
    target: str
    relation_type: str  # 'contains', 'imports', 'calls', 'defines', 'routes_to', 'queries_table', 'has_vulnerability'
    label: Optional[str] = None


class KnowledgeGraphReport(BaseModel):
    total_nodes: int
    total_edges: int
    entity_counts: Dict[str, int] = Field(default_factory=dict)
    nodes: List[KnowledgeNode] = Field(default_factory=list)
    edges: List[KnowledgeEdge] = Field(default_factory=list)


class KnowledgeGraphEngine:
    """
    Unified Repository Knowledge Graph:
    Fuses AST symbols, package modules, relational facts, database schemas,
    API route handlers, and security findings into an interconnected multi-entity graph.
    """

    def __init__(self, scanner: Any):
        self.scanner = scanner

    def build_graph(self) -> KnowledgeGraphReport:
        nodes: List[KnowledgeNode] = []
        edges: List[KnowledgeEdge] = []
        counts: Dict[str, int] = {
            "file": 0,
            "module": 0,
            "function": 0,
            "class": 0,
            "route": 0,
            "table": 0,
            "vulnerability": 0,
        }

        if not self.scanner or not self.scanner.file_asts:
            return KnowledgeGraphReport(
                total_nodes=0,
                total_edges=0,
                entity_counts=counts,
                nodes=[],
                edges=[],
            )

        file_asts = self.scanner.file_asts

        # 1. Module Nodes
        if self.scanner.graph_store and self.scanner.graph_store.modules:
            for m_id, cluster in self.scanner.graph_store.modules.items():
                nodes.append(
                    KnowledgeNode(
                        id=f"mod_{m_id}",
                        label=cluster.name,
                        entity_type="module",
                        metadata={"relative_dir": cluster.relative_dir, "file_count": len(cluster.file_paths)},
                    )
                )
                counts["module"] += 1

        # 2. File Nodes & Module-File Edges
        for idx, (f_path, ast) in enumerate(file_asts.items()):
            rel = ast.relative_path.replace("\\", "/")
            f_node_id = f"file_{idx}"
            nodes.append(
                KnowledgeNode(
                    id=f_node_id,
                    label=os.path.basename(rel),
                    entity_type="file",
                    file_path=f_path,
                    relative_path=rel,
                    line_number=1,
                    metadata={"loc": ast.line_count, "symbols_count": len(ast.symbols)},
                )
            )
            counts["file"] += 1

            mod_dir = os.path.dirname(rel)
            if mod_dir:
                edges.append(
                    KnowledgeEdge(
                        id=f"e_mod_file_{idx}",
                        source=f"mod_{mod_dir}",
                        target=f_node_id,
                        relation_type="contains",
                        label="contains",
                    )
                )

        # 3. Class & Function Nodes & Definitions
        all_symbols = (
            list(self.scanner.graph_store.call_builder.symbols_by_id.values())
            if self.scanner.graph_store and self.scanner.graph_store.call_builder
            else []
        )

        for sym in all_symbols[:40]:
            rel = (
                file_asts[sym.file_path].relative_path.replace("\\", "/")
                if sym.file_path in file_asts
                else sym.file_path
            )
            s_type = "class" if sym.kind in (SymbolKind.CLASS, SymbolKind.INTERFACE) else "function"
            s_node_id = f"sym_{sym.id}"
            nodes.append(
                KnowledgeNode(
                    id=s_node_id,
                    label=f"{sym.name}()" if s_type == "function" else f"class {sym.name}",
                    entity_type=s_type,
                    file_path=sym.file_path,
                    relative_path=rel,
                    line_number=sym.start_line,
                    metadata={"complexity": sym.cyclomatic_complexity},
                )
            )
            counts[s_type] += 1

            # File defines symbol edge
            f_idx = list(file_asts.keys()).index(sym.file_path) if sym.file_path in file_asts else -1
            if f_idx >= 0:
                edges.append(
                    KnowledgeEdge(
                        id=f"e_def_{sym.id}",
                        source=f"file_{f_idx}",
                        target=s_node_id,
                        relation_type="defines",
                        label="defines",
                    )
                )

        # 4. Route Nodes
        if self.scanner.fact_store:
            routes_list = getattr(self.scanner.fact_store, "routes", [])
            for idx, r in enumerate(routes_list):
                r_id = f"route_{idx}"
                nodes.append(
                    KnowledgeNode(
                        id=r_id,
                        label=f"{r.http_method} {r.route_path}",
                        entity_type="route",
                        file_path=r.file_path,
                        line_number=r.line_number,
                        metadata={"handler": r.handler_name},
                    )
                )
                counts["route"] += 1

                # Route to handler edge
                edges.append(
                    KnowledgeEdge(
                        id=f"e_route_{r_id}",
                        source=r_id,
                        target=f"sym_{r.handler_name}",
                        relation_type="routes_to",
                        label="routes_to",
                    )
                )

        # 5. Database Table Entities
        if hasattr(self.scanner, "database_analyzer"):
            try:
                db_rep = self.scanner.database_analyzer.analyze()
                for t in getattr(db_rep, "tables", [])[:8]:
                    t_id = f"tbl_{t.table_name}"
                    nodes.append(
                        KnowledgeNode(
                            id=t_id,
                            label=f"Table: {t.table_name}",
                            entity_type="table",
                            metadata={"columns": len(t.columns)},
                        )
                    )
                    counts["table"] += 1
            except Exception:
                pass

        return KnowledgeGraphReport(
            total_nodes=len(nodes),
            total_edges=len(edges),
            entity_counts=counts,
            nodes=nodes,
            edges=edges,
        )
