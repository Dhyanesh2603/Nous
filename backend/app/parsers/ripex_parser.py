import json
import os
import subprocess
import shutil
from typing import Optional, List, Dict, Any

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


class RipExASTParser(BaseASTParser):
    """
    Direct RipEx binary parser adapter (Astraive/ripex v0.3.0).
    Executes native ripex binary to produce multi-language structural facts (C, C++, C#, Go, JS, TS, Python, Rust).
    """

    def __init__(self, language_mode: str = "auto", binary_path: Optional[str] = None):
        super().__init__(language_mode)
        self.language_mode = language_mode
        self.binary_path = binary_path or self._find_ripex_binary()

    def _find_ripex_binary(self) -> str:
        # Check local backend/bin directory first
        local_bin = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "bin", "ripex.exe"))
        if os.path.exists(local_bin):
            return local_bin
        # Check system PATH
        which_path = shutil.which("ripex")
        if which_path:
            return which_path
        return "ripex"

    def is_available(self) -> bool:
        try:
            res = subprocess.run([self.binary_path, "--version"], capture_output=True, text=True, timeout=3)
            return res.returncode == 0
        except Exception:
            return False

    def parse_file(self, file_path: str, relative_path: str, content: str) -> FileAST:
        # If file does not exist on disk yet, write temporary or pass directly
        if not os.path.exists(file_path):
            temp_path = os.path.join(os.path.dirname(self.binary_path), f"_tmp_ripex_{os.path.basename(file_path)}")
            with open(temp_path, "w", encoding="utf-8") as tf:
                tf.write(content)
            target_to_parse = temp_path
            cleanup_temp = True
        else:
            target_to_parse = file_path
            cleanup_temp = False

        cmd = [self.binary_path, "parse", target_to_parse, "--json", "--facts"]
        if self.language_mode != "auto":
            cmd.extend(["--lang", self.language_mode])

        try:
            proc = subprocess.run(cmd, capture_output=True, text=True, timeout=10)
            if cleanup_temp and os.path.exists(target_to_parse):
                os.remove(target_to_parse)

            if proc.returncode != 0 and not proc.stdout.strip():
                raise RuntimeError(f"RipEx parse failed: {proc.stderr}")

            payload = json.loads(proc.stdout)
            return self._convert_ripex_payload_to_ast(file_path, relative_path, content, payload)
        except Exception as e:
            if cleanup_temp and os.path.exists(target_to_parse):
                os.remove(target_to_parse)
            raise e

    def _convert_ripex_payload_to_ast(
        self, file_path: str, relative_path: str, content: str, payload: Dict[str, Any]
    ) -> FileAST:
        facts = payload.get("facts", {})
        language = payload.get("language", self.language_mode)
        
        symbols: List[ASTSymbol] = []
        imports: List[ASTImport] = []
        calls: List[ASTCall] = []
        exports: List[ASTExport] = []
        
        lines = content.splitlines()
        line_count = len(lines)
        byte_size = len(content.encode("utf-8"))

        # 1. Convert Symbols
        for sym_data in facts.get("symbols", []):
            name = sym_data.get("name", "anonymous")
            kind_str = sym_data.get("kind", "function").lower()
            
            # Map kind string to SymbolKind
            if "class" in kind_str or "struct" in kind_str:
                kind = SymbolKind.CLASS
            elif "interface" in kind_str or "trait" in kind_str:
                kind = SymbolKind.INTERFACE
            elif "enum" in kind_str:
                kind = SymbolKind.ENUM
            elif "method" in kind_str:
                kind = SymbolKind.METHOD
            elif sym_data.get("is_async", False):
                kind = SymbolKind.ASYNC_FUNCTION
            else:
                kind = SymbolKind.FUNCTION

            line_start = sym_data.get("line_start", 1)
            line_end = sym_data.get("line_end", line_start)
            signature = sym_data.get("signature", name)
            docstring = sym_data.get("doc_string")
            is_exported = sym_data.get("exported", False)

            symbol_id = f"{file_path}::{name}"

            # Extract code snippet from lines
            code_snippet = ""
            if 1 <= line_start <= len(lines):
                code_snippet = "\n".join(lines[line_start - 1 : min(line_end, len(lines))])

            symbols.append(
                ASTSymbol(
                    id=symbol_id,
                    name=name,
                    kind=kind,
                    file_path=file_path,
                    start_line=line_start,
                    end_line=line_end,
                    start_col=0,
                    end_col=0,
                    signature=signature,
                    docstring=docstring,
                    code_content=code_snippet,
                    cyclomatic_complexity=1,  # Base complexity
                    parameters=sym_data.get("base_classes", []),
                    return_type=sym_data.get("return_type"),
                )
            )

            if is_exported:
                exports.append(
                    ASTExport(
                        file_path=file_path,
                        symbol_name=name,
                        line_number=line_start,
                    )
                )

        # 2. Convert Imports
        for imp_data in facts.get("imports", []):
            source = imp_data.get("source", "")
            imported_name = imp_data.get("imported_name") or imp_data.get("local_name") or "*"
            line_no = imp_data.get("line", 1)
            is_star = imp_data.get("is_star_import", False)

            imports.append(
                ASTImport(
                    file_path=file_path,
                    source_module=source,
                    imported_symbols=[ImportedSymbol(name=imported_name)],
                    is_wildcard=is_star,
                    line_number=line_no,
                )
            )

        # 3. Convert Calls
        for call_data in facts.get("calls", []):
            callee_text = call_data.get("callee_text", "")
            obj = call_data.get("object")
            full_callee = f"{obj}.{callee_text}" if obj else callee_text
            line_no = call_data.get("line", 1)
            col_no = call_data.get("column", 0)

            # Find matching caller symbol by line range
            caller_id = None
            for sym in symbols:
                if sym.start_line <= line_no <= sym.end_line:
                    caller_id = sym.id
                    break

            calls.append(
                ASTCall(
                    caller_symbol_id=caller_id,
                    callee_name=full_callee,
                    file_path=file_path,
                    line_number=line_no,
                    col_number=col_no,
                    raw_call=full_callee,
                )
            )

        return FileAST(
            file_path=file_path,
            relative_path=relative_path,
            language=language,
            symbols=symbols,
            calls=calls,
            imports=imports,
            exports=exports,
            line_count=line_count,
            byte_size=byte_size,
            raw_content=content,
        )
