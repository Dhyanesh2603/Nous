from abc import ABC, abstractmethod
from typing import Optional, List, Tuple
from tree_sitter import Node, Tree
from app.parsers.symbol_types import FileAST, ASTSymbol, ASTCall, ASTImport, ASTExport


class BaseASTParser(ABC):
    def __init__(self, language_name: str):
        self.language_name = language_name

    @abstractmethod
    def parse_file(self, file_path: str, relative_path: str, content: str) -> FileAST:
        """Parse source code content and extract FileAST with symbols, calls, imports, exports."""
        pass

    @staticmethod
    def get_node_text(node: Node, source_bytes: bytes) -> str:
        """Extract text from source bytes for a given tree-sitter node."""
        if not node:
            return ""
        return source_bytes[node.start_byte:node.end_byte].decode("utf-8", errors="replace")

    @staticmethod
    def calculate_cyclomatic_complexity(node: Node, branch_node_types: set[str]) -> int:
        """
        Calculates cyclomatic complexity for a given function/method AST subtree
        by counting decision points (if, while, for, case, and/or expressions, etc.) + 1.
        """
        complexity = 1
        cursor = node.walk()
        visited_children = False
        
        while True:
            if not visited_children:
                if cursor.node.type in branch_node_types:
                    complexity += 1
                if cursor.goto_first_child():
                    continue
            if cursor.goto_next_sibling():
                visited_children = False
            elif cursor.goto_parent():
                visited_children = True
            else:
                break
                
        return complexity
