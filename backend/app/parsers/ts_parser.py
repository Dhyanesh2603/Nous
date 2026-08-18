from typing import List, Optional, Set
import tree_sitter_typescript
import tree_sitter_javascript
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

TS_BRANCH_NODES = {
    "if_statement",
    "for_statement",
    "for_in_statement",
    "while_statement",
    "do_statement",
    "switch_case",
    "catch_clause",
    "ternary_expression",
}


class TypeScriptASTParser(BaseASTParser):
    def __init__(self, mode: str = "typescript"):
        """
        mode: 'typescript' (.ts), 'tsx' (.tsx), or 'javascript' (.js, .jsx)
        """
        super().__init__(mode)
        self.mode = mode
        if mode == "tsx":
            self.language = Language(tree_sitter_typescript.language_tsx())
        elif mode == "javascript":
            self.language = Language(tree_sitter_javascript.language())
        else:
            self.language = Language(tree_sitter_typescript.language_typescript())
            
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
        self._extract_imports_and_exports(tree.root_node, source_bytes, file_path, imports, exports)
        self._extract_symbols_and_calls(
            tree.root_node, source_bytes, file_path, symbols, calls, current_scope=None, current_symbol_id=None
        )

        return FileAST(
            file_path=file_path,
            relative_path=relative_path,
            language=self.mode,
            symbols=symbols,
            calls=calls,
            imports=imports,
            exports=exports,
            line_count=line_count,
            byte_size=byte_size,
            raw_content=content,
        )

    def _extract_imports_and_exports(
        self,
        root: Node,
        source_bytes: bytes,
        file_path: str,
        imports: List[ASTImport],
        exports: List[ASTExport],
    ):
        # Python stack-based traversal (100% memory safe)
        stack = [root]
        while stack:
            node = stack.pop()
            if node.type == "import_statement":
                self._parse_import_statement(node, source_bytes, file_path, imports)
            elif node.type in ("export_statement", "export_clause"):
                self._parse_export_statement(node, source_bytes, file_path, exports)
            elif node.type == "call_expression":
                # Check for require('...')
                fn = node.child_by_field_name("function")
                if fn and self.get_node_text(fn, source_bytes) == "require":
                    args = node.child_by_field_name("arguments")
                    if args and len(args.children) > 1:
                        req_path = self.get_node_text(args.children[1], source_bytes).strip("'\"`")
                        imports.append(
                            ASTImport(
                                file_path=file_path,
                                source_module=req_path,
                                imported_symbols=[ImportedSymbol(name="*")],
                                is_default=True,
                                line_number=node.start_point.row + 1,
                            )
                        )

            for child in reversed(node.children):
                stack.append(child)

    def _parse_import_statement(self, node: Node, source_bytes: bytes, file_path: str, imports: List[ASTImport]):
        line_no = node.start_point.row + 1
        source_node = node.child_by_field_name("source")
        source_module = self.get_node_text(source_node, source_bytes).strip("'\"`") if source_node else ""
        
        imported_symbols: List[ImportedSymbol] = []
        is_default = False
        is_wildcard = False
        
        for child in node.children:
            if child.type == "import_clause":
                for clause_child in child.children:
                    if clause_child.type == "identifier":
                        imported_symbols.append(ImportedSymbol(name=self.get_node_text(clause_child, source_bytes)))
                        is_default = True
                    elif clause_child.type == "named_imports":
                        for spec in clause_child.children:
                            if spec.type == "import_specifier":
                                name_n = spec.child_by_field_name("name")
                                alias_n = spec.child_by_field_name("alias")
                                name = self.get_node_text(name_n, source_bytes) if name_n else ""
                                alias = self.get_node_text(alias_n, source_bytes) if alias_n else None
                                if name:
                                    imported_symbols.append(ImportedSymbol(name=name, alias=alias))
                    elif clause_child.type == "namespace_import":
                        is_wildcard = True
                        for ns_child in clause_child.children:
                            if ns_child.type == "identifier":
                                imported_symbols.append(
                                    ImportedSymbol(name="*", alias=self.get_node_text(ns_child, source_bytes))
                                )
                                
        if source_module or imported_symbols:
            imports.append(
                ASTImport(
                    file_path=file_path,
                    source_module=source_module,
                    imported_symbols=imported_symbols,
                    is_default=is_default,
                    is_wildcard=is_wildcard,
                    line_number=line_no,
                )
            )

    def _parse_export_statement(self, node: Node, source_bytes: bytes, file_path: str, exports: List[ASTExport]):
        line_no = node.start_point.row + 1
        is_default = any(c.type == "default" for c in node.children)
        
        # Check for declaration export: export const Foo = ..., export function Bar() ..., export class Baz ...
        decl = node.child_by_field_name("declaration")
        if decl:
            if decl.type in ("function_declaration", "class_declaration", "interface_declaration", "type_alias_declaration", "enum_declaration"):
                name_n = decl.child_by_field_name("name")
                if name_n:
                    exports.append(
                        ASTExport(
                            file_path=file_path,
                            symbol_name=self.get_node_text(name_n, source_bytes),
                            is_default=is_default,
                            line_number=line_no,
                        )
                    )
            elif decl.type in ("lexical_declaration", "variable_declaration"):
                for var_decl in decl.children:
                    if var_decl.type == "variable_declarator":
                        name_n = var_decl.child_by_field_name("name")
                        if name_n:
                            exports.append(
                                ASTExport(
                                    file_path=file_path,
                                    symbol_name=self.get_node_text(name_n, source_bytes),
                                    is_default=is_default,
                                    line_number=line_no,
                                )
                            )
                            
        # Check for export default <identifier>;
        value_node = node.child_by_field_name("value")
        if value_node and is_default:
            exports.append(
                ASTExport(
                    file_path=file_path,
                    symbol_name=self.get_node_text(value_node, source_bytes),
                    is_default=True,
                    line_number=line_no,
                )
            )

        # Named export clause: export { a, b as c }
        for child in node.children:
            if child.type == "export_clause":
                for spec in child.children:
                    if spec.type == "export_specifier":
                        name_n = spec.child_by_field_name("name")
                        alias_n = spec.child_by_field_name("alias")
                        if name_n:
                            exports.append(
                                ASTExport(
                                    file_path=file_path,
                                    symbol_name=self.get_node_text(name_n, source_bytes),
                                    alias=self.get_node_text(alias_n, source_bytes) if alias_n else None,
                                    is_default=is_default,
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
            # 1. Function declaration
            if child.type in ("function_declaration", "generator_function_declaration"):
                name_node = child.child_by_field_name("name")
                func_name = self.get_node_text(name_node, source_bytes) if name_node else "anonymous"
                symbol_id = f"{file_path}::{f'{current_scope}.' if current_scope else ''}{func_name}"
                
                params = self._extract_params(child, source_bytes)
                ret_node = child.child_by_field_name("return_type")
                return_type = self.get_node_text(ret_node, source_bytes) if ret_node else None
                signature = f"function {func_name}({', '.join(params)})" + (f": {return_type}" if return_type else "")
                complexity = self.calculate_cyclomatic_complexity(child, TS_BRANCH_NODES)
                
                symbols.append(
                    ASTSymbol(
                        id=symbol_id,
                        name=func_name,
                        kind=SymbolKind.FUNCTION,
                        file_path=file_path,
                        start_line=child.start_point.row + 1,
                        end_line=child.end_point.row + 1,
                        start_col=child.start_point.column,
                        end_col=child.end_point.column,
                        scope=current_scope,
                        signature=signature,
                        code_content=self.get_node_text(child, source_bytes),
                        cyclomatic_complexity=complexity,
                        parameters=params,
                        return_type=return_type,
                    )
                )
                
                self._extract_symbols_and_calls(
                    child,
                    source_bytes,
                    file_path,
                    symbols,
                    calls,
                    current_scope=f"{current_scope}.{func_name}" if current_scope else func_name,
                    current_symbol_id=symbol_id,
                )
                continue

            # 2. Variable declarator holding arrow_function or function_expression or memo() wrapper
            elif child.type in ("lexical_declaration", "variable_declaration"):
                matched_var = False
                for decl in child.children:
                    if decl.type == "variable_declarator":
                        name_node = decl.child_by_field_name("name")
                        val_node = decl.child_by_field_name("value")
                        
                        target_fn_node = None
                        if val_node:
                            if val_node.type in ("arrow_function", "function_expression"):
                                target_fn_node = val_node
                            elif val_node.type == "call_expression":
                                args = val_node.child_by_field_name("arguments")
                                if args:
                                    for a in args.children:
                                        if a.type in ("arrow_function", "function_expression"):
                                            target_fn_node = a
                                            break

                        if name_node and target_fn_node:
                            var_name = self.get_node_text(name_node, source_bytes)
                            symbol_id = f"{file_path}::{f'{current_scope}.' if current_scope else ''}{var_name}"
                            params = self._extract_params(target_fn_node, source_bytes)
                            ret_node = target_fn_node.child_by_field_name("return_type")
                            return_type = self.get_node_text(ret_node, source_bytes) if ret_node else None
                            signature = f"const {var_name} = ({', '.join(params)})" + (f": {return_type}" if return_type else "")
                            complexity = self.calculate_cyclomatic_complexity(target_fn_node, TS_BRANCH_NODES)
                            
                            symbols.append(
                                ASTSymbol(
                                    id=symbol_id,
                                    name=var_name,
                                    kind=SymbolKind.FUNCTION,
                                    file_path=file_path,
                                    start_line=child.start_point.row + 1,
                                    end_line=child.end_point.row + 1,
                                    start_col=child.start_point.column,
                                    end_col=child.end_point.column,
                                    scope=current_scope,
                                    signature=signature,
                                    code_content=self.get_node_text(child, source_bytes),
                                    cyclomatic_complexity=complexity,
                                    parameters=params,
                                    return_type=return_type,
                                )
                            )
                            self._extract_symbols_and_calls(
                                target_fn_node,
                                source_bytes,
                                file_path,
                                symbols,
                                calls,
                                current_scope=f"{current_scope}.{var_name}" if current_scope else var_name,
                                current_symbol_id=symbol_id,
                            )
                            matched_var = True

                if matched_var:
                    continue

            # 3. Class Declaration
            elif child.type == "class_declaration":
                name_node = child.child_by_field_name("name")
                class_name = self.get_node_text(name_node, source_bytes) if name_node else "AnonymousClass"
                symbol_id = f"{file_path}::{f'{current_scope}.' if current_scope else ''}{class_name}"
                
                heritage = []
                for c in child.children:
                    if c.type == "class_heritage":
                        heritage.append(self.get_node_text(c, source_bytes))
                
                signature = f"class {class_name}" + (f" {heritage[0]}" if heritage else "")
                
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
                        code_content=self.get_node_text(child, source_bytes),
                        parameters=heritage,
                    )
                )
                
                self._extract_symbols_and_calls(
                    child,
                    source_bytes,
                    file_path,
                    symbols,
                    calls,
                    current_scope=f"{current_scope}.{class_name}" if current_scope else class_name,
                    current_symbol_id=symbol_id,
                )
                continue

            # 4. Method Definition
            elif child.type == "method_definition":
                name_node = child.child_by_field_name("name")
                method_name = self.get_node_text(name_node, source_bytes) if name_node else "method"
                symbol_id = f"{file_path}::{f'{current_scope}.' if current_scope else ''}{method_name}"
                
                params = self._extract_params(child, source_bytes)
                ret_node = child.child_by_field_name("return_type")
                return_type = self.get_node_text(ret_node, source_bytes) if ret_node else None
                signature = f"{method_name}({', '.join(params)})" + (f": {return_type}" if return_type else "")
                complexity = self.calculate_cyclomatic_complexity(child, TS_BRANCH_NODES)
                
                symbols.append(
                    ASTSymbol(
                        id=symbol_id,
                        name=method_name,
                        kind=SymbolKind.METHOD,
                        file_path=file_path,
                        start_line=child.start_point.row + 1,
                        end_line=child.end_point.row + 1,
                        start_col=child.start_point.column,
                        end_col=child.end_point.column,
                        scope=current_scope,
                        signature=signature,
                        code_content=self.get_node_text(child, source_bytes),
                        cyclomatic_complexity=complexity,
                        parameters=params,
                        return_type=return_type,
                    )
                )
                
                self._extract_symbols_and_calls(
                    child,
                    source_bytes,
                    file_path,
                    symbols,
                    calls,
                    current_scope=f"{current_scope}.{method_name}" if current_scope else method_name,
                    current_symbol_id=symbol_id,
                )
                continue

            # 5. Interface Declaration
            elif child.type == "interface_declaration":
                name_node = child.child_by_field_name("name")
                if name_node:
                    iface_name = self.get_node_text(name_node, source_bytes)
                    symbol_id = f"{file_path}::{iface_name}"
                    symbols.append(
                        ASTSymbol(
                            id=symbol_id,
                            name=iface_name,
                            kind=SymbolKind.INTERFACE,
                            file_path=file_path,
                            start_line=child.start_point.row + 1,
                            end_line=child.end_point.row + 1,
                            start_col=child.start_point.column,
                            end_col=child.end_point.column,
                            signature=f"interface {iface_name}",
                            code_content=self.get_node_text(child, source_bytes),
                        )
                    )

            # 6. Type Alias Declaration
            elif child.type == "type_alias_declaration":
                name_node = child.child_by_field_name("name")
                if name_node:
                    type_name = self.get_node_text(name_node, source_bytes)
                    symbol_id = f"{file_path}::{type_name}"
                    symbols.append(
                        ASTSymbol(
                            id=symbol_id,
                            name=type_name,
                            kind=SymbolKind.TYPE_ALIAS,
                            file_path=file_path,
                            start_line=child.start_point.row + 1,
                            end_line=child.end_point.row + 1,
                            start_col=child.start_point.column,
                            end_col=child.end_point.column,
                            signature=f"type {type_name}",
                            code_content=self.get_node_text(child, source_bytes),
                        )
                    )

            # 7. Enum Declaration
            elif child.type == "enum_declaration":
                name_node = child.child_by_field_name("name")
                if name_node:
                    enum_name = self.get_node_text(name_node, source_bytes)
                    symbol_id = f"{file_path}::{enum_name}"
                    symbols.append(
                        ASTSymbol(
                            id=symbol_id,
                            name=enum_name,
                            kind=SymbolKind.ENUM,
                            file_path=file_path,
                            start_line=child.start_point.row + 1,
                            end_line=child.end_point.row + 1,
                            start_col=child.start_point.column,
                            end_col=child.end_point.column,
                            signature=f"enum {enum_name}",
                            code_content=self.get_node_text(child, source_bytes),
                        )
                    )

            # 8. Function Calls / Method Calls
            elif child.type in ("call_expression", "new_expression"):
                fn_node = child.child_by_field_name("function") or child.child_by_field_name("constructor")
                if fn_node:
                    callee_name = self.get_node_text(fn_node, source_bytes)
                    if callee_name != "require":
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

            # Traverse deeper into unhandled statements (export_statement, statements, etc.)
            self._extract_symbols_and_calls(
                child,
                source_bytes,
                file_path,
                symbols,
                calls,
                current_scope=current_scope,
                current_symbol_id=current_symbol_id,
            )

    def _extract_params(self, node: Node, source_bytes: bytes) -> List[str]:
        params_node = node.child_by_field_name("parameters")
        params: List[str] = []
        if params_node:
            for p in params_node.children:
                if p.type in ("identifier", "required_parameter", "optional_parameter", "formal_parameters"):
                    text = self.get_node_text(p, source_bytes).strip("()")
                    if text and text not in (",", "(", ")"):
                        params.append(text)
        return params
