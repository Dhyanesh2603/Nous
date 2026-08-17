import os
from pathlib import Path
from typing import Dict, List, Set, Tuple, Optional
import networkx as nx
from pydantic import BaseModel, Field

from app.parsers.symbol_types import FileAST, ASTImport


class DependencyEdge(BaseModel):
    source_file: str
    target_file: str
    imported_symbols: List[str] = Field(default_factory=list)
    is_external: bool = False
    weight: int = 1


class DependencyGraphBuilder:
    def __init__(self, root_dir: str, file_asts: Dict[str, FileAST]):
        self.root_dir = os.path.abspath(root_dir)
        self.file_asts = file_asts  # keyed by absolute normalized file_path
        self.graph = nx.DiGraph()
        self.edges: List[DependencyEdge] = []
        self.cycles: List[List[str]] = []

    def build(self) -> nx.DiGraph:
        self.graph.clear()
        self.edges.clear()

        # Add all internal file nodes
        for file_path, ast in self.file_asts.items():
            self.graph.add_node(
                file_path,
                label=os.path.basename(file_path),
                relative_path=ast.relative_path,
                language=ast.language,
                line_count=ast.line_count,
                symbol_count=len(ast.symbols),
                node_type="file",
            )

        # Resolve imports to edges
        for source_path, ast in self.file_asts.items():
            for imp in ast.imports:
                target_path, is_ext = self._resolve_import_path(source_path, imp)
                imported_names = [s.name for s in imp.imported_symbols]
                
                if target_path:
                    if not self.graph.has_node(target_path):
                        self.graph.add_node(
                            target_path,
                            label=imp.source_module,
                            relative_path=imp.source_module if is_ext else os.path.relpath(target_path, self.root_dir),
                            language="external" if is_ext else "unknown",
                            line_count=0,
                            symbol_count=0,
                            node_type="external_package" if is_ext else "file",
                        )
                    
                    if self.graph.has_edge(source_path, target_path):
                        # Increment weight and append symbols
                        data = self.graph[source_path][target_path]
                        data["weight"] += 1
                        data["symbols"].extend(imported_names)
                    else:
                        self.graph.add_edge(
                            source_path,
                            target_path,
                            symbols=imported_names,
                            is_external=is_ext,
                            weight=1,
                        )

                    self.edges.append(
                        DependencyEdge(
                            source_file=source_path,
                            target_file=target_path,
                            imported_symbols=imported_names,
                            is_external=is_ext,
                            weight=1,
                        )
                    )

        # Detect simple cycles among internal files
        self._detect_cycles()
        return self.graph

    def _resolve_import_path(self, current_file: str, imp: ASTImport) -> Tuple[Optional[str], bool]:
        """
        Resolves an ASTImport source_module to an absolute internal file path or an external package name.
        """
        source_mod = imp.source_module.strip()
        if not source_mod:
            return None, False

        curr_dir = os.path.dirname(current_file)
        
        # 1. Relative imports starting with . or .. (Python or JS/TS)
        if source_mod.startswith("."):
            possible_target = os.path.normpath(os.path.join(curr_dir, source_mod))
            resolved = self._match_file_extension(possible_target)
            if resolved:
                return resolved, False
            # Check for index.ts, __init__.py, etc.
            index_resolved = self._match_index_file(possible_target)
            if index_resolved:
                return index_resolved, False

        # 2. Python module style (e.g. app.parsers.base or utils.helpers)
        if "." in source_mod and not source_mod.startswith("."):
            as_rel_path = source_mod.replace(".", os.sep)
            possible_from_root = os.path.normpath(os.path.join(self.root_dir, as_rel_path))
            resolved = self._match_file_extension(possible_from_root)
            if resolved:
                return resolved, False
            index_resolved = self._match_index_file(possible_from_root)
            if index_resolved:
                return index_resolved, False

        # 3. TS/JS root or baseUrl imports (e.g. "@/components/Button" or "src/utils")
        clean_mod = source_mod.lstrip("@/").lstrip("/")
        possible_from_root = os.path.normpath(os.path.join(self.root_dir, clean_mod))
        resolved = self._match_file_extension(possible_from_root)
        if resolved:
            return resolved, False
        index_resolved = self._match_index_file(possible_from_root)
        if index_resolved:
            return index_resolved, False

        # 4. Check all known internal files for matching suffix
        for internal_path in self.file_asts.keys():
            rel = os.path.relpath(internal_path, self.root_dir).replace("\\", "/")
            if rel.endswith(source_mod) or rel.rsplit(".", 1)[0].endswith(source_mod):
                return internal_path, False

        # If not resolved internally, it's an external library (e.g., react, fastapi, os)
        return source_mod, True

    def _match_file_extension(self, base_path: str) -> Optional[str]:
        extensions = [".py", ".ts", ".tsx", ".js", ".jsx"]
        # Direct match if already has extension
        if base_path in self.file_asts:
            return base_path
        for ext in extensions:
            candidate = base_path + ext
            if candidate in self.file_asts:
                return candidate
        return None

    def _match_index_file(self, dir_path: str) -> Optional[str]:
        index_names = ["__init__.py", "index.ts", "index.tsx", "index.js", "index.jsx"]
        for idx in index_names:
            candidate = os.path.normpath(os.path.join(dir_path, idx))
            if candidate in self.file_asts:
                return candidate
        return None

    def _detect_cycles(self):
        # Create subgraph of only internal files to avoid external false cycles
        internal_nodes = [n for n in self.graph.nodes if n in self.file_asts]
        subgraph = self.graph.subgraph(internal_nodes)
        try:
            self.cycles = list(nx.simple_cycles(subgraph))
        except Exception:
            self.cycles = []
