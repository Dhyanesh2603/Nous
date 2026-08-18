from typing import List, Optional, Set
import tree_sitter_rust
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

RUST_BRANCH_NODES = {
    "if_expression",
    "match_expression",
    "for_expression",
    "while_expression",
    "loop_expression",
}


class RustASTParser(BaseASTParser):
    def __init__(self):
        super().__init__("rust")
        self.language = Language(tree_sitter_rust.language())

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
            language="rust",
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
            if node.type == "use_declaration":
                use_text = self.get_node_text(node, source_bytes).replace("use ", "").rstrip(";").strip()
                imports.append(
                    ASTImport(
                        file_path=file_path,
                        source_module=use_text,
                        imported_symbols=[ImportedSymbol(name=use_text.split("::")[-1])],
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
            is_pub = any(c.type == "visibility_modifier" and "pub" in self.get_node_text(c, source_bytes) for c in child.children)

            if child.type == "function_item":
                name_node = child.child_by_field_name("name")
                if name_node:
                    func_name = self.get_node_text(name_node, source_bytes)
                    symbol_id = f"{file_path}::{f'{current_scope}.' if current_scope else ''}{func_name}"
                    complexity = self.calculate_cyclomatic_complexity(child, RUST_BRANCH_NODES)
                    
                    if is_pub:
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
                            kind=SymbolKind.METHOD if current_scope else SymbolKind.FUNCTION,
                            file_path=file_path,
                            start_line=child.start_point.row + 1,
                            end_line=child.end_point.row + 1,
                            start_col=child.start_point.column,
                            end_col=child.end_point.column,
                            scope=current_scope,
                            signature=f"fn {func_name}(...)",
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
                        current_scope=f"{current_scope}.{func_name}" if current_scope else func_name,
                        current_symbol_id=symbol_id,
                    )
                    continue

            elif child.type in ("struct_item", "enum_item", "trait_item"):
                name_node = child.child_by_field_name("name")
                if name_node:
                    item_name = self.get_node_text(name_node, source_bytes)
                    kind = SymbolKind.INTERFACE if child.type == "trait_item" else (SymbolKind.ENUM if child.type == "enum_item" else SymbolKind.CLASS)
                    symbol_id = f"{file_path}::{item_name}"
                    
                    if is_pub:
                        exports.append(
                            ASTExport(
                                file_path=file_path,
                                symbol_name=item_name,
                                line_number=child.start_point.row + 1,
                            )
                        )

                    symbols.append(
                        ASTSymbol(
                            id=symbol_id,
                            name=item_name,
                            kind=kind,
                            file_path=file_path,
                            start_line=child.start_point.row + 1,
                            end_line=child.end_point.row + 1,
                            start_col=child.start_point.column,
                            end_col=child.end_point.column,
                            signature=f"{child.type.replace('_item', '')} {item_name}",
                            code_content=self.get_node_text(child, source_bytes),
                        )
                    )

            elif child.type == "impl_item":
                type_node = child.child_by_field_name("type")
                trait_node = child.child_by_field_name("trait")
                impl_name = self.get_node_text(type_node, source_bytes) if type_node else "impl"
                if trait_node:
                    impl_name = f"{self.get_node_text(trait_node, source_bytes)} for {impl_name}"

                self._extract_symbols_and_calls(
                    child,
                    source_bytes,
                    file_path,
                    symbols,
                    calls,
                    exports,
                    current_scope=impl_name,
                    current_symbol_id=current_symbol_id,
                )
                continue

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
