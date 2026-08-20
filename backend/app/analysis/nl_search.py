import re
from typing import List, Dict, Any, Optional
from pydantic import BaseModel, Field

from app.parsers.symbol_types import SymbolKind


class NLSearchResult(BaseModel):
    id: str
    symbol_name: str
    kind: str
    file_path: str
    relative_path: str
    line_number: int
    match_score: float  # 0.0 to 100.0
    intent_category: str  # 'Authentication', 'Database', 'API Endpoint', 'Business Logic', 'Utility'
    explanation: str
    code_snippet: Optional[str] = None


class NLSearchReport(BaseModel):
    query: str
    detected_intent: str
    total_results: int
    results: List[NLSearchResult] = Field(default_factory=list)


class NaturalLanguageSearchEngine:
    """
    Natural Language Code Intelligence Search Engine:
    Maps natural language developer queries and intent concepts directly
    into AST symbols, RipEx relational facts, database models, and route handlers.
    """

    def __init__(self, scanner: Any):
        self.scanner = scanner

    def search(self, query: str) -> NLSearchReport:
        results: List[NLSearchResult] = []
        q_lower = query.lower().strip()
        tokens = [t for t in re.split(r"\W+", q_lower) if len(t) > 2]

        if not self.scanner or not self.scanner.file_asts:
            return NLSearchReport(
                query=query,
                detected_intent="General Code Search",
                total_results=0,
                results=[],
            )

        file_asts = self.scanner.file_asts

        # Intent Detection Heuristic
        detected_intent = "General Code Search"
        if any(t in q_lower for t in ("auth", "login", "token", "jwt", "password", "session", "permission", "security")):
            detected_intent = "Authentication & Security"
        elif any(t in q_lower for t in ("db", "database", "sql", "query", "prisma", "insert", "select", "update", "delete", "table", "schema")):
            detected_intent = "Database & Persistence"
        elif any(t in q_lower for t in ("route", "api", "endpoint", "http", "controller", "post", "get", "rest", "handler")):
            detected_intent = "API & REST Routing"
        elif any(t in q_lower for t in ("service", "business", "logic", "manager", "processor", "workflow")):
            detected_intent = "Business Logic & Services"

        all_symbols = (
            list(self.scanner.graph_store.call_builder.symbols_by_id.values())
            if self.scanner.graph_store and self.scanner.graph_store.call_builder
            else []
        )

        for sym in all_symbols:
            rel = (
                file_asts[sym.file_path].relative_path.replace("\\", "/")
                if sym.file_path in file_asts
                else sym.file_path
            )

            score = 0.0
            matched_reasons = []

            # Exact name or docstring token match
            name_lower = sym.name.lower()
            doc_lower = (sym.docstring or "").lower()
            code_lower = (sym.code_content or "").lower()
            path_lower = rel.lower()

            for tok in tokens:
                if tok in name_lower:
                    score += 35.0
                    matched_reasons.append(f"symbol name matches '{tok}'")
                if tok in path_lower:
                    score += 20.0
                    matched_reasons.append(f"file path matches '{tok}'")
                if tok in doc_lower:
                    score += 25.0
                    matched_reasons.append(f"docstring matches '{tok}'")
                elif tok in code_lower:
                    score += 15.0
                    matched_reasons.append(f"code body matches '{tok}'")

            # Intent category boost
            if detected_intent == "Authentication & Security" and any(k in name_lower or k in path_lower for k in ("auth", "token", "jwt", "login", "password")):
                score += 30.0
            elif detected_intent == "Database & Persistence" and any(k in name_lower or k in path_lower for k in ("db", "sql", "user", "repo", "query", "model")):
                score += 30.0
            elif detected_intent == "API & REST Routing" and any(k in name_lower or k in path_lower for k in ("route", "router", "controller", "api", "handler")):
                score += 30.0

            if score > 0.0:
                explanation = f"Matched {', '.join(matched_reasons[:2])}."
                if sym.docstring:
                    explanation += f" Purpose: {sym.docstring.strip()[:100]}"

                results.append(
                    NLSearchResult(
                        id=f"nl_{sym.id}",
                        symbol_name=f"{sym.name}()" if sym.kind in (SymbolKind.FUNCTION, SymbolKind.METHOD) else sym.name,
                        kind=sym.kind.value,
                        file_path=sym.file_path,
                        relative_path=rel,
                        line_number=sym.start_line,
                        match_score=round(min(100.0, score), 1),
                        intent_category=detected_intent,
                        explanation=explanation,
                        code_snippet=sym.code_content[:180] if sym.code_content else None,
                    )
                )

        # Sort descending by match score
        results.sort(key=lambda r: r.match_score, reverse=True)

        return NLSearchReport(
            query=query,
            detected_intent=detected_intent,
            total_results=len(results),
            results=results[:20],
        )
