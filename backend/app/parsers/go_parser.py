from typing import List, Optional, Set
import tree_sitter_go
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

GO_BRANCH_NODES = {
    "if_statement",
    "for_statement",
    "expression_switch_statement",
    "type_switch_statement",
    "select_statement",
    "communication_case",
    "expression_case",
}


class GoASTParser(BaseASTParser):
    def __init__(self):
        super().__init__("go")
        self.language = Language(tree_sitter_go.language())

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
        
        self._extract_imports(tree.root_node, source_bytes, file_path, imports)
        self._extract_symbols_and_calls(
            tree.root_node, source_bytes, file_path, symbols, calls, exports
        )

        return FileAST(
            file_path=file_path,
            relative_path=relative_path,
            language="go",
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
            if node.type == "import_spec":
                path_node = node.child_by_field_name("path")
                name_node = node.child_by_field_name("name")
                if path_node:
                    pkg_path = self.get_node_text(path_node, source_bytes).strip('"')
                    alias = self.get_node_text(name_node, source_bytes) if name_node else None
                    imports.append(
                        ASTImport(
                            file_path=file_path,
                            source_module=pkg_path,
                            imported_symbols=[ImportedSymbol(name=pkg_path, alias=alias)],
                            is_default=True,
                            line_number=node.start_point.row + 1,
                        )
                    )
            for child in reversed(node.children):
                stack.append(child)

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
    ):
        for child in node.children:
            if child.type in ("function_declaration", "method_declaration"):
                name_node = child.child_by_field_name("name")
                if name_node:
                    func_name = self.get_node_text(name_node, source_bytes)
                    is_method = child.type == "method_declaration"
                    
                    receiver = None
                    if is_method:
                        recv_node = child.child_by_field_name("receiver")
                        if recv_node:
                            receiver = self.get_node_text(recv_node, source_bytes).strip("()")

                    scope = receiver or current_scope
                    symbol_id = f"{file_path}::{f'{scope}.' if scope else ''}{func_name}"
                    complexity = self.calculate_cyclomatic_complexity(child, GO_BRANCH_NODES)
                    
                    if func_name[0].isupper():
                        exports.append(
                            ASTExport(
                                file_path=file_path,
                                symbol_name=func_name,
                                line_number=child.start_point.row + 1,
                            )
                        )

                    symbols.append(
                        ASTSymbol(
                            id=symbol_id,
                            name=func_name,
                            kind=SymbolKind.METHOD if is_method else SymbolKind.FUNCTION,
                            file_path=file_path,
                            start_line=child.start_point.row + 1,
                            end_line=child.end_point.row + 1,
                            start_col=child.start_point.column,
                            end_col=child.end_point.column,
                            scope=scope,
                            signature=f"func {f'({receiver}) ' if receiver else ''}{func_name}(...)",
                            code_content=self.get_node_text(child, source_bytes),
                            cyclomatic_complexity=complexity,
                        )
                    )

                    self._extract_symbols_and_calls(
                        child,
                        source_bytes,
                        file_path,
                        symbols,
                        calls,
                        exports,
                        current_scope=f"{scope}.{func_name}" if scope else func_name,
                        current_symbol_id=symbol_id,
                    )
                    continue

            elif child.type == "type_spec":
                name_node = child.child_by_field_name("name")
                type_node = child.child_by_field_name("type")
                if name_node:
                    type_name = self.get_node_text(name_node, source_bytes)
                    kind = SymbolKind.INTERFACE if type_node and type_node.type == "interface_type" else SymbolKind.CLASS
                    symbol_id = f"{file_path}::{type_name}"
                    
                    if type_name[0].isupper():
                        exports.append(
                            ASTExport(
                                file_path=file_path,
                                symbol_name=type_name,
                                line_number=child.start_point.row + 1,
                            )
                        )

                    symbols.append(
                        ASTSymbol(
                            id=symbol_id,
                            name=type_name,
                            kind=kind,
                            file_path=file_path,
                            start_line=child.start_point.row + 1,
                            end_line=child.end_point.row + 1,
                            start_col=child.start_point.column,
                            end_col=child.end_point.column,
                            signature=f"type {type_name} struct/interface",
                            code_content=self.get_node_text(child, source_bytes),
                        )
                    )

            elif child.type == "call_expression":
                fn_node = child.child_by_field_name("function")
                if fn_node:
                    callee_name = self.get_node_text(fn_node, source_bytes)
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
