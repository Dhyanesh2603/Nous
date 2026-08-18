from typing import List, Optional, Set
import tree_sitter_python
from tree_sitter import Language, Parser, Node

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

PYTHON_BRANCH_NODES = {
    "if_statement",
    "elif_clause",
    "for_statement",
    "while_statement",
    "except_clause",
    "with_statement",
    "assert_statement",
    "conditional_expression",
}


class PythonASTParser(BaseASTParser):
    def __init__(self):
        super().__init__("python")
        self.language = Language(tree_sitter_python.language())

    def parse_file(self, file_path: str, relative_path: str, content: str) -> FileAST:
        source_bytes = content.encode("utf-8")
        parser = Parser(self.language)
        tree = parser.parse(source_bytes)
        
        symbols: List[ASTSymbol] = []
        calls: List[ASTCall] = []
        imports: List[ASTImport] = []
        exports: List[ASTExport] = []
        
        lines = content.splitlines()
        line_count = len(lines)
        byte_size = len(source_bytes)
        
        # Extract imports and exports
        self._extract_imports(tree.root_node, source_bytes, file_path, imports)
        self._extract_symbols_and_calls(
            tree.root_node, source_bytes, file_path, symbols, calls, exports, current_scope=None, current_symbol_id=None
        )

        return FileAST(
            file_path=file_path,
            relative_path=relative_path,
            language="python",
            symbols=symbols,
            calls=calls,
            imports=imports,
            exports=exports,
            line_count=line_count,
            byte_size=byte_size,
            raw_content=content,
        )

    def _extract_imports(self, root: Node, source_bytes: bytes, file_path: str, imports: List[ASTImport]):
        stack = [root]
        while stack:
            node = stack.pop()
            if node.type in ("import_statement", "import_from_statement"):
                self._parse_import_node(node, source_bytes, file_path, imports)
            for child in reversed(node.children):
                stack.append(child)

    def _parse_import_node(self, node: Node, source_bytes: bytes, file_path: str, imports: List[ASTImport]):
        line_no = node.start_point.row + 1
        
        if node.type == "import_statement":
            # e.g., import os, sys as system
            for child in node.children:
                if child.type == "dotted_name":
                    mod_name = self.get_node_text(child, source_bytes)
                    imports.append(
                        ASTImport(
                            file_path=file_path,
                            source_module=mod_name,
                            imported_symbols=[ImportedSymbol(name=mod_name)],
                            is_default=True,
                            line_number=line_no,
                        )
                    )
                elif child.type == "aliased_import":
                    name_node = child.child_by_field_name("name")
                    alias_node = child.child_by_field_name("alias")
                    name = self.get_node_text(name_node, source_bytes) if name_node else ""
                    alias = self.get_node_text(alias_node, source_bytes) if alias_node else None
                    imports.append(
                        ASTImport(
                            file_path=file_path,
                            source_module=name,
                            imported_symbols=[ImportedSymbol(name=name, alias=alias)],
                            is_default=True,
                            line_number=line_no,
                        )
                    )
        elif node.type == "import_from_statement":
            # e.g., from .models import User, Order as MyOrder
            module_name = ""
            is_relative = False
            symbols: List[ImportedSymbol] = []
            is_wildcard = False
            
            # Module name or relative dots
            module_node = node.child_by_field_name("module_name")
            if module_node:
                module_name = self.get_node_text(module_node, source_bytes)
            
            # Check for relative dots
            for child in node.children:
                if child.type == "relative_import":
                    is_relative = True
                    module_name = self.get_node_text(child, source_bytes)
                elif child.type == "wildcard_import":
                    is_wildcard = True
                    symbols.append(ImportedSymbol(name="*"))
                elif child.type == "dotted_name" and child != module_node:
                    name = self.get_node_text(child, source_bytes)
                    symbols.append(ImportedSymbol(name=name))
                elif child.type == "aliased_import":
                    name_n = child.child_by_field_name("name")
                    alias_n = child.child_by_field_name("alias")
                    name = self.get_node_text(name_n, source_bytes) if name_n else ""
                    alias = self.get_node_text(alias_n, source_bytes) if alias_n else None
                    symbols.append(ImportedSymbol(name=name, alias=alias))

            if module_name or symbols:
                imports.append(
                    ASTImport(
                        file_path=file_path,
                        source_module=module_name,
                        imported_symbols=symbols,
                        is_relative=is_relative or module_name.startswith("."),
                        is_wildcard=is_wildcard,
                        line_number=line_no,
                    )
                )

    def _extract_symbols_and_calls(
        self,
        node: Node,
        source_bytes: bytes,
        file_path: str,
        symbols: List[ASTSymbol],
        calls: List[ASTCall],
        exports: List[ASTExport],
        current_scope: Optional[str] = None,
        current_symbol_id: Optional[str] = None,
        pending_decorators: Optional[List[str]] = None,
    ):
        for child in node.children:
            # 0. Decorated Definition
            if child.type == "decorated_definition":
                decs = []
                inner_node = None
                for c in child.children:
                    if c.type == "decorator":
                        decs.append(self.get_node_text(c, source_bytes))
                    elif c.type in ("function_definition", "async_function_definition", "class_definition"):
                        inner_node = c

                if inner_node:
                    self._extract_symbols_and_calls(
                        child,
                        source_bytes,
                        file_path,
                        symbols,
                        calls,
                        exports,
                        current_scope=current_scope,
                        current_symbol_id=current_symbol_id,
                        pending_decorators=decs,
                    )
                continue

            # 1. Class definition
            elif child.type == "class_definition":
                name_node = child.child_by_field_name("name")
                class_name = self.get_node_text(name_node, source_bytes) if name_node else "AnonymousClass"
                symbol_id = f"{file_path}::{f'{current_scope}.' if current_scope else ''}{class_name}"
                
                # Bases / superclasses
                superclasses = []
                superclasses_node = child.child_by_field_name("superclasses")
                if superclasses_node:
                    for arg in superclasses_node.children:
                        if arg.type in ("identifier", "attribute"):
                            superclasses.append(self.get_node_text(arg, source_bytes))
                
                docstring = self._extract_docstring(child, source_bytes)
                signature = f"class {class_name}" + (f"({', '.join(superclasses)})" if superclasses else "")
                
                # In Python, top-level non-underscore classes are exported
                if not current_scope and not class_name.startswith("_"):
                    exports.append(
                        ASTExport(
                            file_path=file_path,
                            symbol_name=class_name,
                            line_number=child.start_point.row + 1,
                        )
                    )

                symbols.append(
                    ASTSymbol(
                        id=symbol_id,
                        name=class_name,
                        kind=SymbolKind.CLASS,
                        file_path=file_path,
                        start_line=child.start_point.row + 1,
                        end_line=child.end_point.row + 1,
                        start_col=child.start_point.column,
                        end_col=child.end_point.column,
                        scope=current_scope,
                        signature=signature,
                        docstring=docstring,
                        code_content=self.get_node_text(child, source_bytes),
                        parameters=superclasses,
                        decorators=pending_decorators or [],
                    )
                )
                
                # Recurse into class body
                body_node = child.child_by_field_name("body")
                if body_node:
                    self._extract_symbols_and_calls(
                        body_node,
                        source_bytes,
                        file_path,
                        symbols,
                        calls,
                        exports,
                        current_scope=f"{current_scope}.{class_name}" if current_scope else class_name,
                        current_symbol_id=symbol_id,
                    )
                continue

            # 2. Function / Method definition
            elif child.type in ("function_definition", "async_function_definition"):
                name_node = child.child_by_field_name("name")
                func_name = self.get_node_text(name_node, source_bytes) if name_node else "anonymous"
                symbol_id = f"{file_path}::{f'{current_scope}.' if current_scope else ''}{func_name}"
                
                is_method = current_scope is not None
                is_async = child.type == "async_function_definition"
                
                params = self._extract_parameters(child, source_bytes)
                ret_node = child.child_by_field_name("return_type")
                return_type = self.get_node_text(ret_node, source_bytes) if ret_node else None
                docstring = self._extract_docstring(child, source_bytes)
                
                decorators = list(pending_decorators or [])
                for c in child.children:
                    if c.type == "decorator":
                        decorators.append(self.get_node_text(c, source_bytes))

                signature = (f"async " if is_async else "") + f"def {func_name}({', '.join(params)})" + (f" -> {return_type}" if return_type else "")
                complexity = self.calculate_cyclomatic_complexity(child, PYTHON_BRANCH_NODES)
                
                # Top-level non-underscore function is exported
                if not current_scope and not func_name.startswith("_"):
                    exports.append(
                        ASTExport(
                            file_path=file_path,
                            symbol_name=func_name,
                            line_number=child.start_point.row + 1,
                        )
                    )

                kind = SymbolKind.ASYNC_FUNCTION if is_async else (SymbolKind.METHOD if is_method else SymbolKind.FUNCTION)
                symbols.append(
                    ASTSymbol(
                        id=symbol_id,
                        name=func_name,
                        kind=kind,
                        file_path=file_path,
                        start_line=child.start_point.row + 1,
                        end_line=child.end_point.row + 1,
                        start_col=child.start_point.column,
                        end_col=child.end_point.column,
                        scope=current_scope,
                        signature=signature,
                        docstring=docstring,
                        code_content=self.get_node_text(child, source_bytes),
                        cyclomatic_complexity=complexity,
                        parameters=params,
                        return_type=return_type,
                        decorators=decorators,
                    )
                )

                # Recurse into function body
                body_node = child.child_by_field_name("body")
                if body_node:
                    self._extract_symbols_and_calls(
                        body_node,
                        source_bytes,
                        file_path,
                        symbols,
                        calls,
                        exports,
                        current_scope=f"{current_scope}.{func_name}" if current_scope else func_name,
                        current_symbol_id=symbol_id,
                    )
                continue

            # 3. Call expressions
            elif child.type == "call":
                func_node = child.child_by_field_name("function")
                if func_node:
                    callee_name = self.get_node_text(func_node, source_bytes)
                    calls.append(
                        ASTCall(
                            caller_symbol_id=current_symbol_id,
                            callee_name=callee_name,
                            file_path=file_path,
                            line_number=child.start_point.row + 1,
                            col_number=child.start_point.column,
                            raw_call=self.get_node_text(child, source_bytes),
                        )
                    )

            # Traverse other child statements
            if child.type != "decorated_definition":
                self._extract_symbols_and_calls(
                    child,
                    source_bytes,
                    file_path,
                    symbols,
                    calls,
                    exports,
                    current_scope=current_scope,
                    current_symbol_id=current_symbol_id,
                )

    def _extract_parameters(self, func_node: Node, source_bytes: bytes) -> List[str]:
        params_node = func_node.child_by_field_name("parameters")
        params: List[str] = []
        if params_node:
            for p in params_node.children:
                if p.type in ("identifier", "typed_parameter", "default_parameter", "typed_default_parameter", "list_splat_pattern", "dictionary_splat_pattern"):
                    params.append(self.get_node_text(p, source_bytes))
        return params

    def _extract_docstring(self, node: Node, source_bytes: bytes) -> Optional[str]:
        body = node.child_by_field_name("body")
        if body and len(body.children) > 0:
            first_stmt = body.children[0]
            if first_stmt.type == "expression_statement":
                expr = first_stmt.children[0] if first_stmt.children else None
                if expr and expr.type == "string":
                    doc = self.get_node_text(expr, source_bytes)
                    return doc.strip('"""\'\'\'').strip()
        return None
