from typing import List, Dict, Any, Optional, Tuple
import math
import re
from pydantic import BaseModel, Field

from app.search.chunker import CodeChunk, ASTChunker
from app.parsers.symbol_types import FileAST, ASTSymbol


class SearchResultItem(BaseModel):
    id: str
    symbol_name: Optional[str] = None
    symbol_kind: Optional[str] = None
    file_path: str
    relative_path: str
    start_line: int
    end_line: int
    matched_snippet: str
    context_header: str
    score: float
    match_type: str  # 'exact_symbol', 'signature', 'semantic_chunk', 'file_path'
    node_id: str


class SearchResponse(BaseModel):
    query: str
    total_matches: int
    results: List[SearchResultItem]


class HybridSearchEngine:
    def __init__(self, root_dir: str):
        self.root_dir = root_dir
        self.chunker = ASTChunker(root_dir)
        self.chunks: List[CodeChunk] = []
        self.symbols: List[ASTSymbol] = []
        self.file_asts: Dict[str, FileAST] = {}

    def index_repository(self, file_asts: Dict[str, FileAST]):
        self.file_asts = file_asts
        self.chunks = self.chunker.chunk_repository(file_asts)
        self.symbols = []
        for ast in file_asts.values():
            self.symbols.extend(ast.symbols)

    def search(self, query: str, limit: int = 20, kind_filter: Optional[str] = None) -> SearchResponse:
        q = query.strip().lower()
        if not q:
            return SearchResponse(query=query, total_matches=0, results=[])

        terms = [t for t in re.split(r"[\s_.:/\\]+", q) if t]
        
        # 1. Lexical Symbol Search
        symbol_scores: Dict[str, Tuple[float, ASTSymbol, str]] = {}
        for sym in self.symbols:
            if kind_filter and sym.kind.value != kind_filter:
                continue
            
            s_name = sym.name.lower()
            s_sig = (sym.signature or "").lower()
            s_doc = (sym.docstring or "").lower()
            
            score = 0.0
            m_type = "semantic_chunk"
            
            # Exact symbol name match
            if s_name == q:
                score += 100.0
                m_type = "exact_symbol"
            elif s_name.startswith(q):
                score += 70.0
                m_type = "exact_symbol"
            elif q in s_name:
                score += 40.0
                m_type = "exact_symbol"
            
            # Signature match
            if q in s_sig:
                score += 25.0
                if m_type != "exact_symbol":
                    m_type = "signature"

            # Multi-term partial matches
            matched_terms = sum(1 for t in terms if t in s_name or t in s_sig or t in s_doc)
            if matched_terms > 0:
                score += (matched_terms / len(terms)) * 20.0

            if score > 0:
                symbol_scores[sym.id] = (score, sym, m_type)

        # 2. AST Chunk Content Search (BM25-style frequency scoring)
        chunk_scores: Dict[str, Tuple[float, CodeChunk]] = {}
        for chunk in self.chunks:
            if kind_filter and chunk.symbol_kind and chunk.symbol_kind != kind_filter:
                continue
            
            c_text = chunk.content.lower()
            c_header = chunk.context_header.lower()
            
            c_score = 0.0
            for term in terms:
                # Term frequency in content
                tf = c_text.count(term)
                if tf > 0:
                    c_score += min(tf * 2.0, 10.0)
                # Term match in header/signature
                if term in c_header:
                    c_score += 8.0

            # Boost chunk if exact query substring found
            if q in c_text:
                c_score += 15.0
            if q in chunk.relative_path.lower():
                c_score += 20.0

            if c_score > 0:
                chunk_scores[chunk.id] = (c_score, chunk)

        # 3. Reciprocal Rank Fusion (RRF)
        # Sort symbol candidates
        ranked_symbols = sorted(symbol_scores.values(), key=lambda x: x[0], reverse=True)
        # Sort chunk candidates
        ranked_chunks = sorted(chunk_scores.values(), key=lambda x: x[0], reverse=True)

        combined_map: Dict[str, SearchResultItem] = {}
        k = 60.0

        # Add symbol hits with RRF
        for rank, (raw_score, sym, m_type) in enumerate(ranked_symbols[:40]):
            rrf_score = 1.0 / (k + rank + 1)
            node_id = sym.id
            rel_path = self.file_asts[sym.file_path].relative_path if sym.file_path in self.file_asts else sym.file_path
            
            snippet_lines = (sym.code_content or sym.signature or sym.name).splitlines()[:5]
            snippet = "\n".join(snippet_lines)
            
            combined_map[node_id] = SearchResultItem(
                id=sym.id,
                symbol_name=sym.name,
                symbol_kind=sym.kind.value if hasattr(sym.kind, "value") else str(sym.kind),
                file_path=sym.file_path,
                relative_path=rel_path,
                start_line=sym.start_line,
                end_line=sym.end_line,
                matched_snippet=snippet,
                context_header=f"{rel_path} | {sym.signature or sym.name}",
                score=round(raw_score + (rrf_score * 100.0), 2),
                match_type=m_type,
                node_id=sym.id,
            )

        # Add chunk hits with RRF
        for rank, (raw_score, chunk) in enumerate(ranked_chunks[:40]):
            rrf_score = 1.0 / (k + rank + 1)
            node_id = chunk.symbol_id or chunk.file_path
            
            snippet_lines = chunk.content.splitlines()[:5]
            snippet = "\n".join(snippet_lines)
            
            if node_id in combined_map:
                # Merge and elevate score
                combined_map[node_id].score += round((rrf_score * 100.0) + (raw_score * 0.5), 2)
            else:
                combined_map[node_id] = SearchResultItem(
                    id=chunk.id,
                    symbol_name=chunk.symbol_name,
                    symbol_kind=chunk.symbol_kind or "code_block",
                    file_path=chunk.file_path,
                    relative_path=chunk.relative_path,
                    start_line=chunk.start_line,
                    end_line=chunk.end_line,
                    matched_snippet=snippet,
                    context_header=chunk.context_header,
                    score=round(raw_score + (rrf_score * 80.0), 2),
                    match_type="semantic_chunk",
                    node_id=node_id,
                )

        # Final ranked list
        final_results = sorted(combined_map.values(), key=lambda x: x.score, reverse=True)[:limit]

        return SearchResponse(
            query=query,
            total_matches=len(combined_map),
            results=final_results,
        )
