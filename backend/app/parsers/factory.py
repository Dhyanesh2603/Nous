from typing import Optional, Dict
from pathlib import Path

from app.parsers.base import BaseASTParser
from app.parsers.python_parser import PythonASTParser
from app.parsers.ts_parser import TypeScriptASTParser


class ParserFactory:
    def __init__(self):
        self._parsers: Dict[str, BaseASTParser] = {
            "python": PythonASTParser(),
            "typescript": TypeScriptASTParser("typescript"),
            "tsx": TypeScriptASTParser("tsx"),
            "javascript": TypeScriptASTParser("javascript"),
        }

    def get_parser_for_file(self, file_path: str) -> Optional[BaseASTParser]:
        ext = Path(file_path).suffix.lower()
        if ext == ".py":
            return self._parsers["python"]
        elif ext == ".ts":
            return self._parsers["typescript"]
        elif ext == ".tsx":
            return self._parsers["tsx"]
        elif ext in (".js", ".jsx", ".mjs", ".cjs"):
            return self._parsers["javascript"]
        return None

    def is_supported_file(self, file_path: str) -> bool:
        return self.get_parser_for_file(file_path) is not None
