from typing import Dict, List, Set, Optional, Tuple
import os
import networkx as nx
from pydantic import BaseModel, Field

from app.parsers.symbol_types import FileAST, ASTSymbol, ASTCall, ASTImport, SymbolKind
from app.graph.dependency_graph import DependencyGraphBuilder


class CallEdge(BaseModel):
    caller_id: str
    callee_id: str
    caller_name: str
    callee_name: str
    line_number: int
    raw_call: str


class CallGraphBuilder:
    def __init__(self, root_dir: str, file_asts: Dict[str, FileAST], dep_builder: DependencyGraphBuilder):
        self.root_dir = os.path.abspath(root_dir)
        self.file_asts = file_asts
        self.dep_builder = dep_builder
        self.graph = nx.DiGraph()
        self.edges: List[CallEdge] = []
        
        # Fast lookup indexes
        self.symbols_by_id: Dict[str, ASTSymbol] = {}
        self.symbols_by_file_and_name: Dict[Tuple[str, str], ASTSymbol] = {}
        self.symbols_by_name: Dict[str, List[ASTSymbol]] = {}
        self._build_symbol_indexes()

    def _build_symbol_indexes(self):
        for file_path, ast in self.file_asts.items():
            for sym in ast.symbols:
                self.symbols_by_id[sym.id] = sym
                self.symbols_by_file_and_name[(file_path, sym.name)] = sym
                
                # If scoped e.g. Class.method, also index full scoped name
                if sym.scope:
                    scoped_name = f"{sym.scope}.{sym.name}"
                    self.symbols_by_file_and_name[(file_path, scoped_name)] = sym
                    
                if sym.name not in self.symbols_by_name:
                    self.symbols_by_name[sym.name] = []
                self.symbols_by_name[sym.name].append(sym)

    def build(self) -> nx.DiGraph:
        self.graph.clear()
        self.edges.clear()

        # Add all symbols as nodes
        for sym_id, sym in self.symbols_by_id.items():
            self.graph.add_node(
                sym_id,
                label=sym.name,
                kind=sym.kind.value if hasattr(sym.kind, "value") else str(sym.kind),
                file_path=sym.file_path,
                relative_path=self.file_asts[sym.file_path].relative_path if sym.file_path in self.file_asts else sym.file_path,
                start_line=sym.start_line,
                end_line=sym.end_line,
                signature=sym.signature,
                complexity=sym.cyclomatic_complexity,
                node_type="symbol",
            )

        # Resolve calls to symbol edges
        for file_path, ast in self.file_asts.items():
            for call in ast.calls:
                if not call.caller_symbol_id or call.caller_symbol_id not in self.symbols_by_id:
                    continue
                
                resolved_callee = self._resolve_callee(file_path, call)
                if resolved_callee:
                    callee_id = resolved_callee.id
                    caller_sym = self.symbols_by_id[call.caller_symbol_id]
                    
                    if not self.graph.has_edge(call.caller_symbol_id, callee_id):
                        self.graph.add_edge(
                            call.caller_symbol_id,
                            callee_id,
                            line_number=call.line_number,
                            raw_call=call.raw_call,
                            weight=1,
                        )
                    else:
                        self.graph[call.caller_symbol_id][callee_id]["weight"] += 1
                        
                    self.edges.append(
                        CallEdge(
                            caller_id=call.caller_symbol_id,
                            callee_id=callee_id,
                            caller_name=caller_sym.name,
                            callee_name=resolved_callee.name,
                            line_number=call.line_number,
                            raw_call=call.raw_call,
                        )
                    )

        return self.graph

    def _resolve_callee(self, current_file: str, call: ASTCall) -> Optional[ASTSymbol]:
        raw_name = call.callee_name.strip()
        
        # Normalize method calls e.g., self.foo(), this.bar(), obj.method()
        method_name = raw_name.split(".")[-1]
        
        # 1. Check if it's a call to a function/method defined in the same file
        if (current_file, raw_name) in self.symbols_by_file_and_name:
            return self.symbols_by_file_and_name[(current_file, raw_name)]
        if (current_file, method_name) in self.symbols_by_file_and_name:
            return self.symbols_by_file_and_name[(current_file, method_name)]

        # 2. Check imports in the current file
        ast = self.file_asts.get(current_file)
        if ast:
            for imp in ast.imports:
                for sym_imp in imp.imported_symbols:
                    # e.g., import { calculate } from './calc' or import calculate as calc
                    effective_name = sym_imp.alias or sym_imp.name
                    if effective_name in (raw_name, method_name):
                        target_file, is_ext = self.dep_builder._resolve_import_path(current_file, imp)
                        if target_file and not is_ext and target_file in self.file_asts:
                            # Look up imported symbol in target file
                            orig_name = sym_imp.name
                            if (target_file, orig_name) in self.symbols_by_file_and_name:
                                return self.symbols_by_file_and_name[(target_file, orig_name)]
                            # Or if default import, look for top class or function
                            if sym_imp.name == "*" or imp.is_default:
                                target_ast = self.file_asts[target_file]
                                for target_sym in target_ast.symbols:
                                    if target_sym.name == orig_name or target_sym.name == raw_name:
                                        return target_sym

        # 3. If unique symbol name in entire project, resolve directly
        matching_symbols = self.symbols_by_name.get(method_name, [])
        if len(matching_symbols) == 1:
            return matching_symbols[0]

        return None
