import os
import re
from pathlib import Path
from typing import List, Optional, Dict, Any

from app.parsers.base import BaseASTParser
from app.parsers.symbol_types import (
    FileAST,
    ASTSymbol,
    ASTCall,
    ASTImport,
    ASTExport,
    ImportedSymbol,
    SymbolKind,
)


class MultiLanguageASTParser(BaseASTParser):
    """
    Versatile multi-language AST parser supporting:
    - Frontend: Vue (.vue SFC), Svelte (.svelte), HTML/CSS
    - JVM: Java (.java), Kotlin (.kt, .kts), Scala (.scala)
    - Mobile & Native: Swift (.swift), Dart (.dart)
    - Web Backend: PHP (.php), Ruby (.rb, .erb)
    - Database/Schemas: SQL (.sql), Prisma (.prisma)
    """

    def __init__(self, language_name: str = "multi_lang"):
        super().__init__(language_name)

    def parse_file(self, file_path: str, relative_path: str, content: str) -> FileAST:
        ext = Path(file_path).suffix.lower()
        lines = content.splitlines()
        loc = len(lines)

        symbols: List[ASTSymbol] = []
        calls: List[ASTCall] = []
        imports: List[ASTImport] = []
        exports: List[ASTExport] = []

        if ext == ".vue":
            self._parse_vue(file_path, lines, content, symbols, calls, imports, exports)
        elif ext == ".svelte":
            self._parse_svelte(file_path, lines, content, symbols, calls, imports, exports)
        elif ext in (".java", ".kt", ".kts", ".scala"):
            self._parse_jvm(file_path, lines, content, symbols, calls, imports, exports, ext)
        elif ext in (".swift", ".dart"):
            self._parse_mobile(file_path, lines, content, symbols, calls, imports, exports, ext)
        elif ext in (".php", ".rb", ".erb"):
            self._parse_scripting(file_path, lines, content, symbols, calls, imports, exports, ext)
        elif ext in (".sql", ".prisma"):
            self._parse_schema(file_path, lines, content, symbols, calls, imports, exports, ext)
        elif ext in (".html", ".htm", ".css", ".scss", ".sass", ".less"):
            self._parse_web_markup(file_path, lines, content, symbols, calls, imports, exports, ext)
        else:
            self._parse_generic(file_path, lines, content, symbols, calls, imports, exports)

        return FileAST(
            file_path=file_path,
            relative_path=relative_path,
            language=ext.lstrip(".") or self.language_name,
            line_count=loc,
            byte_size=len(content.encode("utf-8")),
            symbols=symbols,
            calls=calls,
            imports=imports,
            exports=exports,
            raw_content=content,
        )

    def _parse_vue(
        self,
        file_path: str,
        lines: List[str],
        content: str,
        symbols: List[ASTSymbol],
        calls: List[ASTCall],
        imports: List[ASTImport],
        exports: List[ASTExport],
    ):
        component_name = Path(file_path).stem
        symbols.append(
            ASTSymbol(
                id=f"{file_path}::{component_name}",
                name=component_name,
                kind=SymbolKind.CLASS,
                file_path=file_path,
                start_line=1,
                end_line=len(lines) or 1,
                start_col=0,
                end_col=0,
                signature=f"component {component_name}",
                docstring="Vue Single File Component",
                code_content=content[:300],
            )
        )
        exports.append(
            ASTExport(
                file_path=file_path,
                symbol_name=component_name,
                is_default=True,
                line_number=1,
            )
        )

        script_matches = re.finditer(r"<script(?:\s+[^>]*?)?>([\s\S]*?)<\/script>", content)
        for s_match in script_matches:
            script_content = s_match.group(1)
            start_line_offset = content[:s_match.start(1)].count("\n") + 1

            for line_idx, line in enumerate(script_content.splitlines(), start=start_line_offset):
                imp_match = re.search(r"import\s+(?:\{([^}]+)\}|([A-Za-z0-9_]+))\s+from\s+['\"]([^'\"]+)['\"]", line)
                if imp_match:
                    named, default_sym, source = imp_match.groups()
                    syms = []
                    if named:
                        for s in named.split(","):
                            if s.strip():
                                syms.append(ImportedSymbol(name=s.strip()))
                    if default_sym:
                        syms.append(ImportedSymbol(name=default_sym.strip()))
                    imports.append(
                        ASTImport(
                            file_path=file_path,
                            source_module=source,
                            imported_symbols=syms,
                            is_relative=source.startswith("."),
                            line_number=line_idx,
                        )
                    )

                func_match = re.search(r"(?:function|const|let)\s+([A-Za-z0-9_]+)\s*(?:=\s*(?:async\s*)?\([^)]*\)\s*=>|\([^)]*\))", line)
                if func_match:
                    fn_name = func_match.group(1)
                    symbols.append(
                        ASTSymbol(
                            id=f"{file_path}::{fn_name}",
                            name=fn_name,
                            kind=SymbolKind.FUNCTION,
                            file_path=file_path,
                            start_line=line_idx,
                            end_line=line_idx,
                            start_col=0,
                            end_col=0,
                            signature=f"{fn_name}()",
                            scope=component_name,
                        )
                    )

    def _parse_svelte(
        self,
        file_path: str,
        lines: List[str],
        content: str,
        symbols: List[ASTSymbol],
        calls: List[ASTCall],
        imports: List[ASTImport],
        exports: List[ASTExport],
    ):
        component_name = Path(file_path).stem
        symbols.append(
            ASTSymbol(
                id=f"{file_path}::{component_name}",
                name=component_name,
                kind=SymbolKind.CLASS,
                file_path=file_path,
                start_line=1,
                end_line=len(lines) or 1,
                start_col=0,
                end_col=0,
                signature=f"svelteComponent {component_name}",
                docstring="Svelte Component",
                code_content=content[:300],
            )
        )
        exports.append(
            ASTExport(
                file_path=file_path,
                symbol_name=component_name,
                is_default=True,
                line_number=1,
            )
        )

        for idx, line in enumerate(lines, 1):
            imp_match = re.search(r"import\s+(?:\{([^}]+)\}|([A-Za-z0-9_]+))\s+from\s+['\"]([^'\"]+)['\"]", line)
            if imp_match:
                named, default_sym, source = imp_match.groups()
                syms = []
                if named:
                    for s in named.split(","):
                        if s.strip():
                            syms.append(ImportedSymbol(name=s.strip()))
                if default_sym:
                    syms.append(ImportedSymbol(name=default_sym.strip()))
                imports.append(
                    ASTImport(
                        file_path=file_path,
                        source_module=source,
                        imported_symbols=syms,
                        is_relative=source.startswith("."),
                        line_number=idx,
                    )
                )

            prop_match = re.search(r"export\s+let\s+([A-Za-z0-9_]+)", line)
            if prop_match:
                p_name = prop_match.group(1)
                symbols.append(
                    ASTSymbol(
                        id=f"{file_path}::{p_name}",
                        name=p_name,
                        kind=SymbolKind.VARIABLE,
                        file_path=file_path,
                        start_line=idx,
                        end_line=idx,
                        start_col=0,
                        end_col=0,
                        signature=f"prop {p_name}",
                        scope=component_name,
                    )
                )

    def _parse_jvm(
        self,
        file_path: str,
        lines: List[str],
        content: str,
        symbols: List[ASTSymbol],
        calls: List[ASTCall],
        imports: List[ASTImport],
        exports: List[ASTExport],
        ext: str,
    ):
        current_class = None
        for idx, line in enumerate(lines, 1):
            imp_match = re.search(r"import\s+([A-Za-z0-9_.*]+);?", line)
            if imp_match:
                source = imp_match.group(1)
                sym_name = source.split(".")[-1]
                imports.append(
                    ASTImport(
                        file_path=file_path,
                        source_module=source,
                        imported_symbols=[ImportedSymbol(name=sym_name)],
                        is_wildcard=source.endswith("*"),
                        line_number=idx,
                    )
                )

            cls_match = re.search(r"(?:public|private|protected|internal|abstract|final)?\s*(?:class|interface|object|trait|enum)\s+([A-Za-z0-9_]+)", line)
            if cls_match:
                cls_name = cls_match.group(1)
                current_class = cls_name
                symbols.append(
                    ASTSymbol(
                        id=f"{file_path}::{cls_name}",
                        name=cls_name,
                        kind=SymbolKind.CLASS if "class" in line else SymbolKind.INTERFACE,
                        file_path=file_path,
                        start_line=idx,
                        end_line=idx,
                        start_col=0,
                        end_col=0,
                        signature=line.strip(),
                    )
                )
                exports.append(ASTExport(file_path=file_path, symbol_name=cls_name, line_number=idx))

            fn_match = re.search(r"(?:fun|def|(?:public|private|protected|static|final)\s+[A-Za-z0-9_<>[\],\s]+\s+)\s*([A-Za-z0-9_]+)\s*\(([^)]*)\)", line)
            if fn_match:
                fn_name = fn_match.group(1)
                if fn_name not in ("if", "for", "while", "switch", "catch"):
                    params = [p.strip() for p in fn_match.group(2).split(",") if p.strip()]
                    scope_name = f"{current_class}.{fn_name}" if current_class else fn_name
                    symbols.append(
                        ASTSymbol(
                            id=f"{file_path}::{scope_name}",
                            name=fn_name,
                            kind=SymbolKind.METHOD if current_class else SymbolKind.FUNCTION,
                            file_path=file_path,
                            start_line=idx,
                            end_line=idx,
                            start_col=0,
                            end_col=0,
                            signature=line.strip(),
                            scope=current_class,
                            parameters=params,
                        )
                    )

    def _parse_mobile(
        self,
        file_path: str,
        lines: List[str],
        content: str,
        symbols: List[ASTSymbol],
        calls: List[ASTCall],
        imports: List[ASTImport],
        exports: List[ASTExport],
        ext: str,
    ):
        current_type = None
        for idx, line in enumerate(lines, 1):
            imp_match = re.search(r"import\s+['\"]?([A-Za-z0-9_./:]+)['\"]?;?", line)
            if imp_match:
                source = imp_match.group(1)
                imports.append(
                    ASTImport(
                        file_path=file_path,
                        source_module=source,
                        imported_symbols=[ImportedSymbol(name=source.split("/")[-1])],
                        line_number=idx,
                    )
                )

            type_match = re.search(r"(?:class|struct|protocol|extension|mixin)\s+([A-Za-z0-9_]+)", line)
            if type_match:
                t_name = type_match.group(1)
                current_type = t_name
                symbols.append(
                    ASTSymbol(
                        id=f"{file_path}::{t_name}",
                        name=t_name,
                        kind=SymbolKind.CLASS,
                        file_path=file_path,
                        start_line=idx,
                        end_line=idx,
                        start_col=0,
                        end_col=0,
                        signature=line.strip(),
                    )
                )

            fn_match = re.search(r"(?:func|(?:void|Future|Widget|String|int|double|bool|[A-Z][A-Za-z0-9_<>]+)\s+)?\s*([A-Za-z0-9_]+)\s*\(([^)]*)\)", line)
            if fn_match:
                fn_name = fn_match.group(1)
                if fn_name not in ("if", "for", "while", "switch", "catch", "import", "class", "return"):
                    scope_name = f"{current_type}.{fn_name}" if current_type else fn_name
                    symbols.append(
                        ASTSymbol(
                            id=f"{file_path}::{scope_name}",
                            name=fn_name,
                            kind=SymbolKind.METHOD if current_type else SymbolKind.FUNCTION,
                            file_path=file_path,
                            start_line=idx,
                            end_line=idx,
                            start_col=0,
                            end_col=0,
                            signature=line.strip(),
                            scope=current_type,
                        )
                    )

    def _parse_scripting(
        self,
        file_path: str,
        lines: List[str],
        content: str,
        symbols: List[ASTSymbol],
        calls: List[ASTCall],
        imports: List[ASTImport],
        exports: List[ASTExport],
        ext: str,
    ):
        current_class = None
        for idx, line in enumerate(lines, 1):
            req_match = re.search(r"(?:require|require_relative|use|include)\s+['\"]?([A-Za-z0-9_./\\]+)['\"]?", line)
            if req_match:
                source = req_match.group(1)
                imports.append(
                    ASTImport(
                        file_path=file_path,
                        source_module=source,
                        imported_symbols=[ImportedSymbol(name=source.split("/")[-1])],
                        line_number=idx,
                    )
                )

            cls_match = re.search(r"(?:class|module|trait)\s+([A-Za-z0-9_]+)", line)
            if cls_match:
                cls_name = cls_match.group(1)
                current_class = cls_name
                symbols.append(
                    ASTSymbol(
                        id=f"{file_path}::{cls_name}",
                        name=cls_name,
                        kind=SymbolKind.CLASS,
                        file_path=file_path,
                        start_line=idx,
                        end_line=idx,
                        start_col=0,
                        end_col=0,
                        signature=line.strip(),
                    )
                )

            fn_match = re.search(r"(?:def|function)\s+([A-Za-z0-9_]+)\s*(?:\(([^)]*)\))?", line)
            if fn_match:
                fn_name = fn_match.group(1)
                scope_name = f"{current_class}.{fn_name}" if current_class else fn_name
                symbols.append(
                    ASTSymbol(
                        id=f"{file_path}::{scope_name}",
                        name=fn_name,
                        kind=SymbolKind.METHOD if current_class else SymbolKind.FUNCTION,
                        file_path=file_path,
                        start_line=idx,
                        end_line=idx,
                        start_col=0,
                        end_col=0,
                        signature=line.strip(),
                        scope=current_class,
                    )
                )

    def _parse_schema(
        self,
        file_path: str,
        lines: List[str],
        content: str,
        symbols: List[ASTSymbol],
        calls: List[ASTCall],
        imports: List[ASTImport],
        exports: List[ASTExport],
        ext: str,
    ):
        for idx, line in enumerate(lines, 1):
            table_match = re.search(r"(?:CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?|model\s+)([A-Za-z0-9_]+)", line, re.IGNORECASE)
            if table_match:
                table_name = table_match.group(1)
                symbols.append(
                    ASTSymbol(
                        id=f"{file_path}::{table_name}",
                        name=table_name,
                        kind=SymbolKind.CLASS,
                        file_path=file_path,
                        start_line=idx,
                        end_line=idx,
                        start_col=0,
                        end_col=0,
                        signature=f"table {table_name}",
                        docstring="Database Schema Entity",
                    )
                )

    def _parse_web_markup(
        self,
        file_path: str,
        lines: List[str],
        content: str,
        symbols: List[ASTSymbol],
        calls: List[ASTCall],
        imports: List[ASTImport],
        exports: List[ASTExport],
        ext: str,
    ):
        stem = Path(file_path).stem
        symbols.append(
            ASTSymbol(
                id=f"{file_path}::{stem}",
                name=stem,
                kind=SymbolKind.MODULE,
                file_path=file_path,
                start_line=1,
                end_line=len(lines) or 1,
                start_col=0,
                end_col=0,
                signature=f"document {stem}{ext}",
                docstring=f"Web Document / Style Definition ({ext})",
            )
        )

    def _parse_generic(
        self,
        file_path: str,
        lines: List[str],
        content: str,
        symbols: List[ASTSymbol],
        calls: List[ASTCall],
        imports: List[ASTImport],
        exports: List[ASTExport],
    ):
        stem = Path(file_path).stem
        symbols.append(
            ASTSymbol(
                id=f"{file_path}::{stem}",
                name=stem,
                kind=SymbolKind.MODULE,
                file_path=file_path,
                start_line=1,
                end_line=len(lines) or 1,
                start_col=0,
                end_col=0,
                signature=f"module {stem}",
            )
        )
