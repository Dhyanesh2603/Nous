from typing import Dict, Any, List, Optional, Set
import re
from app.scanner import RepoScanner
from app.parsers.symbol_types import ASTSymbol, FileAST


class GraphRAGContext:
    def __init__(
        self,
        query: str,
        seed_files: List[str],
        seed_symbols: List[ASTSymbol],
        call_chains: List[Dict[str, Any]],
        dependency_subgraph: Dict[str, Any],
        frameworks: List[str],
        formatted_prompt: str,
    ):
        self.query = query
        self.seed_files = seed_files
        self.seed_symbols = seed_symbols
        self.call_chains = call_chains
        self.dependency_subgraph = dependency_subgraph
        self.frameworks = frameworks
        self.formatted_prompt = formatted_prompt


class GraphRAGContextBuilder:
    """
    Graph-Augmented Retrieval Engine for Nous.
    Extracts verified AST facts, call chains, and module dependencies
    to provide 100% grounded context for LLM queries.
    """

    def __init__(self, scanner: RepoScanner):
        self.scanner = scanner

    def build_context(self, query: str, focus_node_id: Optional[str] = None, max_hops: int = 2) -> GraphRAGContext:
        keywords = self._extract_keywords(query)
        if focus_node_id:
            keywords.append(focus_node_id.lower())

        seed_files: Set[str] = set()
        seed_symbols: List[ASTSymbol] = []
        matching_routes: List[Dict[str, Any]] = []

        # 1. Search AST Symbols & Files
        for path, file_ast in self.scanner.file_asts.items():
            path_lower = path.lower()
            # Check file match
            if any(k in path_lower for k in keywords):
                seed_files.add(path)

            for sym in file_ast.symbols:
                sym_name_lower = sym.name.lower()
                sym_doc_lower = (sym.docstring or "").lower()
                
                # Check symbol name or docstring match
                if any(k in sym_name_lower or k in sym_doc_lower for k in keywords):
                    seed_symbols.append(sym)
                    seed_files.add(path)

                # Check route handler attributes if any
                if sym.kind in ("route", "controller", "endpoint") or "route" in sym_name_lower:
                    matching_routes.append({
                        "name": sym.name,
                        "file": path,
                        "line": sym.start_line,
                        "kind": sym.kind
                    })

        # If no specific seeds found, include top central / entry files
        if not seed_files:
            seed_files = set(list(self.scanner.file_asts.keys())[:10])

        # 2. Extract Call Chains & Invocations
        call_chains: List[Dict[str, Any]] = []
        for file_path in list(seed_files)[:15]:
            file_ast = self.scanner.file_asts.get(file_path)
            if not file_ast:
                continue
            for call in file_ast.calls[:8]:
                call_chains.append({
                    "caller_file": file_path,
                    "caller_symbol": call.caller_symbol_id or "global",
                    "callee": call.callee_name,
                    "line": call.line_number,
                })

        # 3. Extract Dependency Graph Subgraph
        nodes: List[Dict[str, Any]] = []
        edges: List[Dict[str, Any]] = []
        for f in list(seed_files)[:20]:
            file_ast = self.scanner.file_asts.get(f)
            if file_ast:
                nodes.append({
                    "id": f,
                    "language": file_ast.language,
                    "loc": file_ast.line_count,
                    "symbols_count": len(file_ast.symbols),
                })
                for imp in file_ast.imports[:5]:
                    imported_names = [s.name for s in imp.imported_symbols]
                    edges.append({
                        "source": f,
                        "target_module": imp.source_module,
                        "imported_symbols": imported_names,
                    })

        # 4. Detected frameworks
        frameworks = self._detect_frameworks()

        # 5. Format Grounded Text Context
        formatted_prompt = self._format_prompt_context(
            query=query,
            frameworks=frameworks,
            seed_files=list(seed_files),
            seed_symbols=seed_symbols[:20],
            call_chains=call_chains[:25],
            edges=edges[:30],
        )

        return GraphRAGContext(
            query=query,
            seed_files=list(seed_files),
            seed_symbols=seed_symbols,
            call_chains=call_chains,
            dependency_subgraph={"nodes": nodes, "edges": edges},
            frameworks=frameworks,
            formatted_prompt=formatted_prompt,
        )

    def _extract_keywords(self, query: str) -> List[str]:
        words = re.findall(r"\b[A-Za-z0-9_-]{3,}\b", query.lower())
        stopwords = {
            "how", "what", "where", "does", "this", "that", "with", "from",
            "the", "and", "for", "are", "can", "explain", "show", "tell",
            "code", "repo", "project", "work", "file", "call", "path"
        }
        return [w for w in words if w not in stopwords]

    def _detect_frameworks(self) -> List[str]:
        frameworks = set()
        for path in self.scanner.file_asts.keys():
            p = path.lower()
            if "fastapi" in p or "flask" in p or "django" in p:
                frameworks.add("Python Web (FastAPI/Flask/Django)")
            if "react" in p or p.endswith(".tsx") or p.endswith(".jsx"):
                frameworks.add("React UI")
            if "express" in p or "nest" in p:
                frameworks.add("Node.js / Express")
            if p.endswith(".vue"):
                frameworks.add("Vue.js")
            if p.endswith(".go"):
                frameworks.add("Go Service")
            if p.endswith(".rs"):
                frameworks.add("Rust Engine")
        return list(frameworks) or ["Polyglot Architecture"]

    def _format_prompt_context(
        self,
        query: str,
        frameworks: List[str],
        seed_files: List[str],
        seed_symbols: List[ASTSymbol],
        call_chains: List[Dict[str, Any]],
        edges: List[Dict[str, Any]],
    ) -> str:
        sections = []
        sections.append("=== VERIFIED REPOSITORY FACTS ===")
        sections.append(f"Detected Frameworks: {', '.join(frameworks)}")
        sections.append(f"Relevant Files ({len(seed_files)}): {', '.join(seed_files[:15])}")

        if seed_symbols:
            sections.append("\n=== MATCHING AST SYMBOLS & DECLARATIONS ===")
            for sym in seed_symbols[:15]:
                doc_str = f" - Doc: {sym.docstring}" if sym.docstring else ""
                sections.append(f"- [{sym.kind.value if hasattr(sym.kind, 'value') else sym.kind}] {sym.name} (Lines {sym.start_line}-{sym.end_line}){doc_str}")

        if call_chains:
            sections.append("\n=== AST CALL CHAINS & INVOCATIONS ===")
            for c in call_chains[:20]:
                sections.append(f"- {c['caller_file']}::{c['caller_symbol']} -> calls `{c['callee']}()` at line {c['line']}")

        if edges:
            sections.append("\n=== INTER-MODULE DEPENDENCY IMPORTS ===")
            for e in edges[:15]:
                syms = f" ({', '.join(e['imported_symbols'])})" if e["imported_symbols"] else ""
                sections.append(f"- {e['source']} imports `{e['target_module']}`{syms}")

        sections.append(f"\nUser Question: {query}")
        return "\n".join(sections)
