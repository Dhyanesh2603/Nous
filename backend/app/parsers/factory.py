from pathlib import Path
from typing import Dict, Optional

from app.parsers.base import BaseASTParser
from app.parsers.python_parser import PythonASTParser
from app.parsers.ts_parser import TypeScriptASTParser
from app.parsers.go_parser import GoASTParser
from app.parsers.rust_parser import RustASTParser
from app.parsers.ripex_parser import RipExASTParser
from app.parsers.multi_lang_parser import MultiLanguageASTParser
from app.config import settings


class ParserFactory:
    def __init__(self, prefer_ripex: bool = True):
        self.prefer_ripex = prefer_ripex
        self.ripex_parser = RipExASTParser() if prefer_ripex else None
        self.ripex_available = self.ripex_parser.is_available() if self.ripex_parser else False
        self.multi_lang_parser = MultiLanguageASTParser()

        # Native Tree-sitter fallbacks
        self._parsers: Dict[str, BaseASTParser] = {
            "python": PythonASTParser(),
            "typescript": TypeScriptASTParser("typescript"),
            "tsx": TypeScriptASTParser("tsx"),
            "javascript": TypeScriptASTParser("javascript"),
            "go": GoASTParser(),
            "rust": RustASTParser(),
            "multi_lang": self.multi_lang_parser,
        }

    def is_supported_file(self, file_path: str) -> bool:
        ext = Path(file_path).suffix.lower()
        return ext in settings.SUPPORTED_EXTENSIONS

    def get_parser_for_file(self, file_path: str) -> Optional[BaseASTParser]:
        ext = Path(file_path).suffix.lower()

        # If RipEx is preferred and available, use it for its supported core set
        if self.prefer_ripex and self.ripex_available:
            if ext in (
                ".py", ".pyi",
                ".ts", ".tsx", ".mts", ".cts",
                ".js", ".jsx", ".mjs", ".cjs",
                ".go",
                ".rs",
                ".c", ".h",
                ".cpp", ".hpp", ".cc", ".cxx", ".hh", ".hxx",
                ".cs"
            ):
                return self.ripex_parser

        # Fallback to Tree-sitter parsers
        if ext in (".py", ".pyi"):
            return self._parsers["python"]
        elif ext in (".ts", ".mts", ".cts"):
            return self._parsers["typescript"]
        elif ext in (".tsx",):
            return self._parsers["tsx"]
        elif ext in (".js", ".jsx", ".mjs", ".cjs"):
            return self._parsers["javascript"]
        elif ext in (".go",):
            return self._parsers["go"]
        elif ext in (".rs",):
            return self._parsers["rust"]
            
        # Multi-Language parser for Vue, Svelte, Java, Kotlin, Swift, Dart, PHP, Ruby, SQL, HTML, CSS, etc.
        if ext in settings.SUPPORTED_EXTENSIONS:
            return self.multi_lang_parser

        return None
