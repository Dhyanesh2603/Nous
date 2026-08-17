from typing import Dict, List, Set, Optional, Tuple
import os
import networkx as nx
from networkx.algorithms import community
from pydantic import BaseModel, Field

from app.parsers.symbol_types import FileAST


class ModuleCluster(BaseModel):
    id: str
    name: str
    relative_dir: str
    file_paths: List[str] = Field(default_factory=list)
    symbol_count: int = 0
    line_count: int = 0
    afferent_coupling: int = 0  # Ca (incoming dependencies from outside module)
    efferent_coupling: int = 0  # Ce (outgoing dependencies to outside module)
    instability: float = 0.0     # Ce / (Ca + Ce)
    cohesion_score: float = 1.0


class ModuleDetector:
    def __init__(self, root_dir: str, file_asts: Dict[str, FileAST], dep_graph: nx.DiGraph):
        self.root_dir = os.path.abspath(root_dir)
        self.file_asts = file_asts
        self.dep_graph = dep_graph
        self.modules: Dict[str, ModuleCluster] = {}

    def detect_modules(self) -> Dict[str, ModuleCluster]:
        self.modules.clear()
        
        # 1. Group files by immediate top/sub-directory hierarchy relative to root_dir
        dir_to_files: Dict[str, List[str]] = {}
        
        for file_path, ast in self.file_asts.items():
            rel_dir = os.path.dirname(ast.relative_path).replace("\\", "/")
            # Top-level directory name or 'root'
            module_key = rel_dir if rel_dir and rel_dir != "." else "root"
            
            # If deeply nested, take top 1 or 2 levels for meaningful architectural modules
            parts = [p for p in module_key.split("/") if p not in ("src", "app", "lib", ".")]
            if parts:
                mod_name = "/".join(parts[:2])
            else:
                mod_name = module_key
                
            if mod_name not in dir_to_files:
                dir_to_files[mod_name] = []
            dir_to_files[mod_name].append(file_path)

        # 2. Build ModuleCluster objects
        for mod_name, files in dir_to_files.items():
            total_symbols = sum(len(self.file_asts[f].symbols) for f in files if f in self.file_asts)
            total_loc = sum(self.file_asts[f].line_count for f in files if f in self.file_asts)
            mod_id = f"mod::{mod_name}"
            
            self.modules[mod_id] = ModuleCluster(
                id=mod_id,
                name=mod_name,
                relative_dir=mod_name,
                file_paths=files,
                symbol_count=total_symbols,
                line_count=total_loc,
            )

        # 3. Calculate coupling and instability metrics across modules
        self._calculate_coupling()
        
        return self.modules

    def _calculate_coupling(self):
        file_to_module: Dict[str, str] = {}
        for mod_id, cluster in self.modules.items():
            for f in cluster.file_paths:
                file_to_module[f] = mod_id

        # Count cross-module edges in dependency graph
        for mod_id, cluster in self.modules.items():
            incoming_modules: Set[str] = set()
            outgoing_modules: Set[str] = set()
            
            for file_path in cluster.file_paths:
                if not self.dep_graph.has_node(file_path):
                    continue
                
                # Outgoing edges (this file depends on target)
                for _, target in self.dep_graph.out_edges(file_path):
                    target_mod = file_to_module.get(target)
                    if target_mod and target_mod != mod_id:
                        outgoing_modules.add(target_mod)
                        
                # Incoming edges (source file depends on this file)
                for source, _ in self.dep_graph.in_edges(file_path):
                    source_mod = file_to_module.get(source)
                    if source_mod and source_mod != mod_id:
                        incoming_modules.add(source_mod)

            ca = len(incoming_modules)
            ce = len(outgoing_modules)
            instability = round(ce / (ca + ce), 2) if (ca + ce) > 0 else 0.0
            
            cluster.afferent_coupling = ca
            cluster.efferent_coupling = ce
            cluster.instability = instability
