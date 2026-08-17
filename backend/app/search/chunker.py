from typing import List, Dict, Optional
import os
from pydantic import BaseModel, Field

from app.parsers.symbol_types import FileAST, ASTSymbol, SymbolKind


class CodeChunk(BaseModel):
    id: str
    file_path: str
    relative_path: str
    symbol_id: Optional[str] = None
    symbol_name: Optional[str] = None
    symbol_kind: Optional[str] = None
    start_line: int
    end_line: int
    context_header: str
    content: str
    tokens_estimate: int = 0
    language: str


class ASTChunker:
    def __init__(self, root_dir: str):
        self.root_dir = os.path.abspath(root_dir)

    def chunk_repository(self, file_asts: Dict[str, FileAST]) -> List[CodeChunk]:
        chunks: List[CodeChunk] = []
        
        for file_path, ast in file_asts.items():
            file_chunks = self.chunk_file(ast)
            chunks.extend(file_chunks)
            
        return chunks

    def chunk_file(self, ast: FileAST) -> List[CodeChunk]:
        chunks: List[CodeChunk] = []
        raw_lines = (ast.raw_content or "").splitlines()
        rel_path = ast.relative_path.replace("\\", "/")
        mod_name = os.path.dirname(rel_path) or "root"
        
        # If file has symbols, chunk along symbol boundaries
        if ast.symbols:
            covered_lines: set[int] = set()
            
            for sym in ast.symbols:
                # Include class, function, method, interface, type_alias
                start = max(1, sym.start_line)
                end = min(len(raw_lines), sym.end_line)
                
                # Context header
                header_parts = [
                    f"File: {rel_path}",
                    f"Module: {mod_name}",
                    f"Kind: {sym.kind.value if hasattr(sym.kind, 'value') else str(sym.kind)}",
                    f"Name: {sym.name}",
                ]
                if sym.scope:
                    header_parts.append(f"Scope: {sym.scope}")
                if sym.signature:
                    header_parts.append(f"Signature: {sym.signature}")
                if sym.docstring:
                    header_parts.append(f"Docstring: {sym.docstring}")
                    
                context_header = " | ".join(header_parts)
                
                chunk_lines = raw_lines[start - 1 : end]
                chunk_content = "\n".join(chunk_lines)
                tokens_est = len(chunk_content.split())
                
                chunks.append(
                    CodeChunk(
                        id=f"chunk::{sym.id}",
                        file_path=ast.file_path,
                        relative_path=rel_path,
                        symbol_id=sym.id,
                        symbol_name=sym.name,
                        symbol_kind=sym.kind.value if hasattr(sym.kind, "value") else str(sym.kind),
                        start_line=start,
                        end_line=end,
                        context_header=context_header,
                        content=chunk_content,
                        tokens_estimate=tokens_est,
                        language=ast.language,
                    )
                )
                for l in range(start, end + 1):
                    covered_lines.add(l)
                    
        else:
            # File without explicit symbols (e.g. configuration or simple script)
            content = ast.raw_content or ""
            chunks.append(
                CodeChunk(
                    id=f"chunk::{ast.file_path}::whole",
                    file_path=ast.file_path,
                    relative_path=rel_path,
                    start_line=1,
                    end_line=ast.line_count,
                    context_header=f"File: {rel_path} | Module: {mod_name}",
                    content=content,
                    tokens_estimate=len(content.split()),
                    language=ast.language,
                )
            )
            
        return chunks
