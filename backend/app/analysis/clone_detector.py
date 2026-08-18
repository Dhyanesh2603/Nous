from typing import Dict, List, Set, Optional, Tuple, Any
import os
import hashlib
import re
import difflib
from pydantic import BaseModel, Field

from app.parsers.symbol_types import FileAST, ASTSymbol, SymbolKind
from app.graph.graph_store import GraphStore


class CloneInstance(BaseModel):
    id: str
    file_path: str
    relative_path: str
    symbol_name: Optional[str] = None
    start_line: int
    end_line: int
    line_count: int
    snippet: str


class CloneGroup(BaseModel):
    group_id: str
    clone_type: str  # 'Type-1 (Exact)' or 'Type-2 (Renamed Identifiers)'
    similarity_score: float
    duplicated_lines: int
    instances_count: int
    instances: List[CloneInstance]


class CloneReport(BaseModel):
    total_clone_groups: int
    total_duplicated_lines: int
    clone_groups: List[CloneGroup]


class CodeCloneDetector:
    def __init__(self, graph_store: GraphStore, min_lines: int = 4):
        self.graph_store = graph_store
        self.min_lines = min_lines

    def detect_clones(self) -> CloneReport:
        symbols_pool: List[Tuple[str, FileAST, ASTSymbol]] = []
        
        # Collect candidate AST symbols (functions, methods)
        for fpath, fast in self.graph_store.file_asts.items():
            for sym in fast.symbols:
                if sym.kind in (SymbolKind.FUNCTION, SymbolKind.METHOD, SymbolKind.ASYNC_FUNCTION):
                    line_count = sym.end_line - sym.start_line + 1
                    if line_count >= self.min_lines and sym.code_content:
                        symbols_pool.append((fpath, fast, sym))

        type1_map: Dict[str, List[Tuple[FileAST, ASTSymbol]]] = {}
        type2_map: Dict[str, List[Tuple[FileAST, ASTSymbol]]] = {}
        
        for fpath, fast, sym in symbols_pool:
            raw_code = sym.code_content or ""
            
            # Type-1 Normalization: strip whitespace & comments
            t1_norm = self._normalize_type1(raw_code)
            if len(t1_norm.splitlines()) >= self.min_lines:
                t1_hash = hashlib.sha256(t1_norm.encode("utf-8")).hexdigest()
                type1_map.setdefault(t1_hash, []).append((fast, sym))

            # Type-2 Normalization: abstract identifiers & literals
            t2_norm = self._normalize_type2(raw_code)
            if len(t2_norm.splitlines()) >= self.min_lines:
                t2_hash = hashlib.sha256(t2_norm.encode("utf-8")).hexdigest()
                type2_map.setdefault(t2_hash, []).append((fast, sym))

        clone_groups: List[CloneGroup] = []
        visited_symbols: Set[str] = set()
        group_counter = 1

        # 1. Process Type-1 exact clones
        for t1_hash, instances in type1_map.items():
            if len(instances) >= 2:
                inst_list: List[CloneInstance] = []
                for fast, sym in instances:
                    visited_symbols.add(sym.id)
                    inst_list.append(
                        CloneInstance(
                            id=sym.id,
                            file_path=fast.file_path,
                            relative_path=fast.relative_path.replace("\\", "/"),
                            symbol_name=sym.name,
                            start_line=sym.start_line,
                            end_line=sym.end_line,
                            line_count=sym.end_line - sym.start_line + 1,
                            snippet=(sym.code_content or "")[:400],
                        )
                    )

                dup_lines = max(i.line_count for i in inst_list) * (len(inst_list) - 1)
                clone_groups.append(
                    CloneGroup(
                        group_id=f"clone_group_{group_counter}",
                        clone_type="Type-1 (Exact)",
                        similarity_score=100.0,
                        duplicated_lines=dup_lines,
                        instances_count=len(inst_list),
                        instances=inst_list,
                    )
                )
                group_counter += 1

        # 2. Process Type-2 renamed clones (not already captured by Type-1)
        for t2_hash, instances in type2_map.items():
            unvisited = [pair for pair in instances if pair[1].id not in visited_symbols]
            if len(unvisited) >= 2:
                # Verify similarity ratio with difflib
                code_a = unvisited[0][1].code_content or ""
                code_b = unvisited[1][1].code_content or ""
                sim = difflib.SequenceMatcher(None, self._normalize_type2(code_a), self._normalize_type2(code_b)).ratio()
                
                if sim >= 0.80:
                    inst_list = []
                    for fast, sym in unvisited:
                        visited_symbols.add(sym.id)
                        inst_list.append(
                            CloneInstance(
                                id=sym.id,
                                file_path=fast.file_path,
                                relative_path=fast.relative_path.replace("\\", "/"),
                                symbol_name=sym.name,
                                start_line=sym.start_line,
                                end_line=sym.end_line,
                                line_count=sym.end_line - sym.start_line + 1,
                                snippet=(sym.code_content or "")[:400],
                            )
                        )

                    dup_lines = max(i.line_count for i in inst_list) * (len(inst_list) - 1)
                    clone_groups.append(
                        CloneGroup(
                            group_id=f"clone_group_{group_counter}",
                            clone_type="Type-2 (Renamed)",
                            similarity_score=round(sim * 100.0, 1),
                            duplicated_lines=dup_lines,
                            instances_count=len(inst_list),
                            instances=inst_list,
                        )
                    )
                    group_counter += 1

        total_dup = sum(g.duplicated_lines for g in clone_groups)
        return CloneReport(
            total_clone_groups=len(clone_groups),
            total_duplicated_lines=total_dup,
            clone_groups=sorted(clone_groups, key=lambda x: x.duplicated_lines, reverse=True),
        )

    def _normalize_type1(self, code: str) -> str:
        # Remove comments, strip leading/trailing whitespace per line, ignore empty lines
        lines = []
        for line in code.splitlines():
            clean = re.sub(r"#.*|//.*", "", line).strip()
            if clean:
                lines.append(clean)
        return "\n".join(lines)

    def _normalize_type2(self, code: str) -> str:
        # Abstract identifiers and literals
        clean = self._normalize_type1(code)
        # Replace numbers
        clean = re.sub(r"\b\d+\b", "NUM", clean)
        # Replace string literals
        clean = re.sub(r'("[^"]*"|\'[^\']*\')', '"STR"', clean)
        # Replace identifiers (preserving keywords)
        keywords = {
            "def", "class", "return", "if", "elif", "else", "for", "while", "import", "from",
            "as", "try", "except", "finally", "with", "yield", "async", "await", "function",
            "const", "let", "var", "export", "interface", "type", "public", "private", "true", "false", "null", "none"
        }
        tokens = []
        for tok in re.split(r"(\W+)", clean):
            if tok.isalnum():
                if tok.lower() in keywords or tok in ("NUM", "STR"):
                    tokens.append(tok)
                else:
                    tokens.append("VAR")
            else:
                tokens.append(tok)
        return "".join(tokens)
