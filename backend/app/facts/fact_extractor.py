from typing import Dict, List, Set, Optional, Tuple, Any
import re
import os

from app.parsers.symbol_types import FileAST, ASTSymbol, ASTCall, ASTImport, ASTExport, SymbolKind
from app.facts.fact_types import CodeFact, FactKind, RouteFact


class FactExtractor:
    """
    RipEx-style structural fact extraction pipeline.
    Converts multi-language FileAST representations into normalized relational CodeFact streams.
    """

    def extract_facts(self, file_asts: Dict[str, FileAST]) -> Tuple[List[CodeFact], List[RouteFact]]:
        facts: List[CodeFact] = []
        routes: List[RouteFact] = []
        fact_counter = 1

        # Build set of all declared class/interface names for accurate instantiation detection
        known_types: Set[str] = set()
        for fast in file_asts.values():
            for sym in fast.symbols:
                if sym.kind in (SymbolKind.CLASS, SymbolKind.INTERFACE, SymbolKind.STRUCT if hasattr(SymbolKind, 'STRUCT') else SymbolKind.CLASS):
                    known_types.add(sym.name)

        for file_path, fast in file_asts.items():
            rel_path = fast.relative_path.replace("\\", "/")

            # 1. Export Facts (File exports Symbol)
            for exp in fast.exports:
                facts.append(
                    CodeFact(
                        id=f"fact_{fact_counter}",
                        kind=FactKind.EXPORT_DEF,
                        subject_id=file_path,
                        predicate="exports",
                        object_id=exp.symbol_name,
                        file_path=file_path,
                        relative_path=rel_path,
                        line_number=exp.line_number,
                        metadata={"is_default": exp.is_default, "alias": exp.alias},
                    )
                )
                fact_counter += 1

            # 2. Import Facts (File imports Module / Symbol)
            for imp in fast.imports:
                imported_names = [s.name for s in imp.imported_symbols]
                facts.append(
                    CodeFact(
                        id=f"fact_{fact_counter}",
                        kind=FactKind.IMPORT_REF,
                        subject_id=file_path,
                        predicate="imports",
                        object_id=imp.source_module,
                        file_path=file_path,
                        relative_path=rel_path,
                        line_number=imp.line_number,
                        metadata={
                            "symbols": imported_names,
                            "is_relative": imp.is_relative,
                            "is_wildcard": imp.is_wildcard,
                        },
                    )
                )
                fact_counter += 1

            # 3. Symbol Definition Facts
            for sym in fast.symbols:
                kind_str = sym.kind.value if hasattr(sym.kind, "value") else str(sym.kind)
                
                # Def fact: File defines Symbol
                facts.append(
                    CodeFact(
                        id=f"fact_{fact_counter}",
                        kind=FactKind.DEF_SYMBOL,
                        subject_id=file_path,
                        predicate="defines",
                        object_id=sym.id,
                        file_path=file_path,
                        relative_path=rel_path,
                        line_number=sym.start_line,
                        span=(sym.start_col, sym.end_col),
                        metadata={
                            "name": sym.name,
                            "kind": kind_str,
                            "scope": sym.scope,
                            "signature": sym.signature,
                            "docstring": sym.docstring,
                            "complexity": sym.cyclomatic_complexity,
                        },
                    )
                )
                fact_counter += 1

                # Membership Fact: Container class/module contains method/symbol
                if sym.scope:
                    parent_class_id = f"{file_path}::{sym.scope}"
                    facts.append(
                        CodeFact(
                            id=f"fact_{fact_counter}",
                            kind=FactKind.MEMBER_DEF,
                            subject_id=parent_class_id,
                            predicate="contains_member",
                            object_id=sym.id,
                            file_path=file_path,
                            relative_path=rel_path,
                            line_number=sym.start_line,
                            metadata={"member_name": sym.name, "member_kind": kind_str},
                        )
                    )
                    fact_counter += 1

                # Inheritance Facts: Class inherits from Base / implements Interface
                if sym.kind in (SymbolKind.CLASS, SymbolKind.INTERFACE) and sym.parameters:
                    for base in sym.parameters:
                        clean_base = base.replace("extends", "").replace("implements", "").strip()
                        if clean_base:
                            facts.append(
                                CodeFact(
                                    id=f"fact_{fact_counter}",
                                    kind=FactKind.INHERITS_REF,
                                    subject_id=sym.id,
                                    predicate="inherits_from",
                                    object_id=clean_base,
                                    file_path=file_path,
                                    relative_path=rel_path,
                                    line_number=sym.start_line,
                                    metadata={"base_type": clean_base},
                                )
                            )
                            fact_counter += 1

                # Type Reference Facts: Return type & Parameter types
                if sym.return_type:
                    clean_ret = sym.return_type.lstrip(":").strip()
                    facts.append(
                        CodeFact(
                            id=f"fact_{fact_counter}",
                            kind=FactKind.TYPE_REF,
                            subject_id=sym.id,
                            predicate="returns_type",
                            object_id=clean_ret,
                            file_path=file_path,
                            relative_path=rel_path,
                            line_number=sym.start_line,
                            metadata={"position": "return"},
                        )
                    )
                    fact_counter += 1

                # Route Handler Detection (e.g. @app.get('/users'), @router.post, etc.)
                if sym.decorators:
                    for dec in sym.decorators:
                        route_info = self._parse_route_decorator(dec)
                        if route_info:
                            method, path = route_info
                            route_id = f"route::{method}::{path}"
                            
                            r_fact = RouteFact(
                                id=route_id,
                                http_method=method,
                                route_path=path,
                                handler_symbol_id=sym.id,
                                handler_name=sym.name,
                                file_path=file_path,
                                relative_path=rel_path,
                                line_number=sym.start_line,
                            )
                            routes.append(r_fact)

                            facts.append(
                                CodeFact(
                                    id=f"fact_{fact_counter}",
                                    kind=FactKind.ROUTE_HANDLER_DEF,
                                    subject_id=route_id,
                                    predicate="routes_to",
                                    object_id=sym.id,
                                    file_path=file_path,
                                    relative_path=rel_path,
                                    line_number=sym.start_line,
                                    metadata={"method": method, "path": path, "decorator": dec},
                                )
                            )
                            fact_counter += 1

            # 4. Invocation & Instantiation Facts
            for call in fast.calls:
                caller_id = call.caller_symbol_id or file_path
                callee_name = call.callee_name

                # Call reference
                facts.append(
                    CodeFact(
                        id=f"fact_{fact_counter}",
                        kind=FactKind.CALL_REF,
                        subject_id=caller_id,
                        predicate="calls",
                        object_id=callee_name,
                        file_path=file_path,
                        relative_path=rel_path,
                        line_number=call.line_number,
                        metadata={"raw_call": call.raw_call},
                    )
                )
                fact_counter += 1

                # Instantiation reference (e.g., new AuthService() or AuthService() where AuthService is a known class)
                is_instantiation = False
                target_class = None

                if "new " in call.raw_call:
                    is_instantiation = True
                    target_class = callee_name.replace("new ", "").split("(")[0].strip()
                elif callee_name in known_types or (callee_name and callee_name[0].isupper() and "." not in callee_name):
                    is_instantiation = True
                    target_class = callee_name

                if is_instantiation and target_class:
                    facts.append(
                        CodeFact(
                            id=f"fact_{fact_counter}",
                            kind=FactKind.INSTANTIATES_REF,
                            subject_id=caller_id,
                            predicate="instantiates",
                            object_id=target_class,
                            file_path=file_path,
                            relative_path=rel_path,
                            line_number=call.line_number,
                            metadata={"class_name": target_class, "raw_call": call.raw_call},
                        )
                    )
                    fact_counter += 1

        return facts, routes

    def _parse_route_decorator(self, decorator_text: str) -> Optional[Tuple[str, str]]:
        # e.g., @app.get("/users") or @router.post("/items/{id}")
        match = re.search(r'\.(get|post|put|delete|patch|options|head)\s*\(\s*["\']([^"\']+)["\']', decorator_text, re.IGNORECASE)
        if match:
            method = match.group(1).upper()
            path = match.group(2)
            return method, path
        return None
