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
    "case_clause",
    "boolean_operator",
    "conditional_expression",
}


class PythonASTParser(BaseASTParser):
    def __init__(self):
        super().__init__("python")
        self.language = Language(tree_sitter_python.language())
        self.parser = Parser(self.language)

    def parse_file(self, file_path: str, relative_path: str, content: str) -> FileAST:
        source_bytes = content.encode("utf-8")
        tree = self.parser.parse(source_bytes)
        
        symbols: List[ASTSymbol] = []
        calls: List[ASTCall] = []
        imports: List[ASTImport] = []
        exports: List[ASTExport] = []
        
        lines = content.splitlines()
        line_count = len(lines)
        byte_size = len(source_bytes)
        
        # Traverse AST
        self._extract_imports(tree.root_node, source_bytes, file_path, imports)
        self._extract_symbols_and_calls(
            tree.root_node, source_bytes, file_path, symbols, calls, current_scope=None, current_symbol_id=None
        )
        
        # In Python, top-level functions and classes are implicit exports unless prefixed with _
        for sym in symbols:
            if not sym.scope and not sym.name.startswith("_") and sym.kind in (SymbolKind.FUNCTION, SymbolKind.ASYNC_FUNCTION, SymbolKind.CLASS):
                exports.append(
                    ASTExport(
                        file_path=file_path,
                        symbol_name=sym.name,
                        line_number=sym.start_line,
                    )
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
        cursor = root.walk()
        visited_children = False
        
        while True:
            if not visited_children:
                node = cursor.node
                if node.type == "import_statement":
                    self._parse_import_statement(node, source_bytes, file_path, imports)
                elif node.type == "import_from_statement":
                    self._parse_import_from_statement(node, source_bytes, file_path, imports)
                
                if cursor.goto_first_child():
                    continue
            if cursor.goto_next_sibling():
                visited_children = False
            elif cursor.goto_parent():
                visited_children = True
            else:
                break

    def _parse_import_statement(self, node: Node, source_bytes: bytes, file_path: str, imports: List[ASTImport]):
        line_no = node.start_point.row + 1
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
                orig = child.child_by_field_name("name")
                alias = child.child_by_field_name("alias")
                if orig:
                    name_text = self.get_node_text(orig, source_bytes)
                    alias_text = self.get_node_text(alias, source_bytes) if alias else None
                    imports.append(
                        ASTImport(
                            file_path=file_path,
                            source_module=name_text,
                            imported_symbols=[ImportedSymbol(name=name_text, alias=alias_text)],
                            is_default=True,
                            line_number=line_no,
                        )
                    )

    def _parse_import_from_statement(self, node: Node, source_bytes: bytes, file_path: str, imports: List[ASTImport]):
        line_no = node.start_point.row + 1
        module_name_node = node.child_by_field_name("module_name")
        module_name = self.get_node_text(module_name_node, source_bytes) if module_name_node else ""
        
        # Check for relative dots e.g., 'from . import foo' or 'from ..utils import bar'
        dots = ""
        for child in node.children:
            if child.type == "relative_import":
                dots = self.get_node_text(child, source_bytes)
                break
            elif child.type == "import_prefix":
                dots = self.get_node_text(child, source_bytes)
                break
        
        full_module = f"{dots}{module_name}" if dots else module_name
        
        imported_symbols: List[ImportedSymbol] = []
        is_wildcard = False
        
        for child in node.children:
            if child.type == "wildcard_import":
                is_wildcard = True
            elif child.type == "dotted_name" and child != module_name_node:
                sym_name = self.get_node_text(child, source_bytes)
                imported_symbols.append(ImportedSymbol(name=sym_name))
            elif child.type == "aliased_import":
                orig = child.child_by_field_name("name")
                alias = child.child_by_field_name("alias")
                if orig:
                    imported_symbols.append(
                        ImportedSymbol(
                            name=self.get_node_text(orig, source_bytes),
                            alias=self.get_node_text(alias, source_bytes) if alias else None,
                        )
                    )
        
        if full_module or imported_symbols:
            imports.append(
                ASTImport(
                    file_path=file_path,
                    source_module=full_module,
                    imported_symbols=imported_symbols,
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
        current_scope: Optional[str] = None,
        current_symbol_id: Optional[str] = None,
    ):
        for child in node.children:
            actual_node = child
            decorators: List[str] = []
            
            if child.type == "decorated_definition":
                for dec_child in child.children:
                    if dec_child.type == "decorator":
                        decorators.append(self.get_node_text(dec_child, source_bytes).strip())
                    elif dec_child.type in ("function_definition", "async_function_definition", "class_definition"):
                        actual_node = dec_child

            if actual_node.type in ("function_definition", "async_function_definition"):
                name_node = actual_node.child_by_field_name("name")
                if name_node:
                    func_name = self.get_node_text(name_node, source_bytes)
                    kind = SymbolKind.METHOD if current_scope else (
                        SymbolKind.ASYNC_FUNCTION if actual_node.type == "async_function_definition" else SymbolKind.FUNCTION
                    )
                    
                    symbol_id = f"{file_path}::{f'{current_scope}.' if current_scope else ''}{func_name}"
                    
                    # Parameters
                    params_node = actual_node.child_by_field_name("parameters")
                    params_list = []
                    if params_node:
                        for p in params_node.children:
                            if p.type in ("identifier", "typed_parameter", "default_parameter", "typed_default_parameter"):
                                params_list.append(self.get_node_text(p, source_bytes))
                    
                    # Return type
                    ret_node = actual_node.child_by_field_name("return_type")
                    return_type = self.get_node_text(ret_node, source_bytes) if ret_node else None
                    
                    # Docstring
                    docstring = self._extract_docstring(actual_node, source_bytes)
                    
                    # Code snippet
                    code_snippet = self.get_node_text(actual_node, source_bytes)
                    
                    # Signature
                    signature = f"def {func_name}({', '.join(params_list)})"
                    if return_type:
                        signature += f" -> {return_type}"
                    if actual_node.type == "async_function_definition":
                        signature = f"async {signature}"
                        
                    complexity = self.calculate_cyclomatic_complexity(actual_node, PYTHON_BRANCH_NODES)
                    
                    symbol = ASTSymbol(
                        id=symbol_id,
                        name=func_name,
                        kind=kind,
                        file_path=file_path,
                        start_line=actual_node.start_point.row + 1,
                        end_line=actual_node.end_point.row + 1,
                        start_col=actual_node.start_point.column,
                        end_col=actual_node.end_point.column,
                        scope=current_scope,
                        docstring=docstring,
                        signature=signature,
                        code_content=code_snippet,
                        cyclomatic_complexity=complexity,
                        parameters=params_list,
                        return_type=return_type,
                        decorators=decorators,
                    )
                    symbols.append(symbol)
                    
                    # Recurse inside function for calls and nested definitions
                    self._extract_symbols_and_calls(
                        actual_node,
                        source_bytes,
                        file_path,
                        symbols,
                        calls,
                        current_scope=f"{current_scope}.{func_name}" if current_scope else func_name,
                        current_symbol_id=symbol_id,
                    )
                    continue

            elif actual_node.type == "class_definition":
                name_node = actual_node.child_by_field_name("name")
                if name_node:
                    class_name = self.get_node_text(name_node, source_bytes)
                    symbol_id = f"{file_path}::{f'{current_scope}.' if current_scope else ''}{class_name}"
                    
                    superclasses_node = actual_node.child_by_field_name("superclasses")
                    superclasses = []
                    if superclasses_node:
                        for sc in superclasses_node.children:
                            if sc.type in ("identifier", "attribute"):
                                superclasses.append(self.get_node_text(sc, source_bytes))
                    
                    docstring = self._extract_docstring(actual_node, source_bytes)
                    code_snippet = self.get_node_text(actual_node, source_bytes)
                    signature = f"class {class_name}" + (f"({', '.join(superclasses)})" if superclasses else "")
                    
                    symbol = ASTSymbol(
                        id=symbol_id,
                        name=class_name,
                        kind=SymbolKind.CLASS,
                        file_path=file_path,
                        start_line=actual_node.start_point.row + 1,
                        end_line=actual_node.end_point.row + 1,
                        start_col=actual_node.start_point.column,
                        end_col=actual_node.end_point.column,
                        scope=current_scope,
                        docstring=docstring,
                        signature=signature,
                        code_content=code_snippet,
                        cyclomatic_complexity=1,
                        parameters=superclasses,
                        decorators=decorators,
                    )
                    symbols.append(symbol)
                    
                    self._extract_symbols_and_calls(
                        actual_node,
                        source_bytes,
                        file_path,
                        symbols,
                        calls,
                        current_scope=f"{current_scope}.{class_name}" if current_scope else class_name,
                        current_symbol_id=symbol_id,
                    )
                    continue

            elif actual_node.type == "call":
                func_node = actual_node.child_by_field_name("function")
                if func_node:
                    callee_name = self.get_node_text(func_node, source_bytes)
                    call = ASTCall(
                        caller_symbol_id=current_symbol_id,
                        callee_name=callee_name,
                        file_path=file_path,
                        line_number=actual_node.start_point.row + 1,
                        col_number=actual_node.start_point.column,
                        raw_call=self.get_node_text(actual_node, source_bytes),
                    )
                    calls.append(call)

            # Traverse child elements
            self._extract_symbols_and_calls(
                actual_node,
                source_bytes,
                file_path,
                symbols,
                calls,
                current_scope=current_scope,
                current_symbol_id=current_symbol_id,
            )

    def _extract_docstring(self, node: Node, source_bytes: bytes) -> Optional[str]:
        body = node.child_by_field_name("body")
        if body and len(body.children) > 0:
            first_stmt = body.children[0]
            if first_stmt.type == "expression_statement" and len(first_stmt.children) > 0:
                expr = first_stmt.children[0]
                if expr.type == "string":
                    text = self.get_node_text(expr, source_bytes).strip()
                    # Strip quotes (triple or single)
                    if text.startswith('"""') and text.endswith('"""'):
                        return text[3:-3].strip()
                    if text.startswith("'''") and text.endswith("'''"):
                        return text[3:-3].strip()
                    if text.startswith('"') and text.endswith('"'):
                        return text[1:-1].strip()
                    if text.startswith("'") and text.endswith("'"):
                        return text[1:-1].strip()
                    return text
        return None
