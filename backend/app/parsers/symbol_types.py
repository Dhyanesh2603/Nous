from __future__ import annotations
from enum import Enum
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field


class SymbolKind(str, Enum):
    FUNCTION = "function"
    ASYNC_FUNCTION = "async_function"
    METHOD = "method"
    CLASS = "class"
    INTERFACE = "interface"
    TYPE_ALIAS = "type_alias"
    ENUM = "enum"
    VARIABLE = "variable"
    MODULE = "module"


class ASTSymbol(BaseModel):
    id: str
    name: str
    kind: SymbolKind
    file_path: str
    start_line: int
    end_line: int
    start_col: int
    end_col: int
    scope: Optional[str] = None  # e.g., "UserService.authenticate"
    docstring: Optional[str] = None
    signature: Optional[str] = None
    code_content: Optional[str] = None
    cyclomatic_complexity: int = 1
    parameters: List[str] = Field(default_factory=list)
    return_type: Optional[str] = None
    decorators: List[str] = Field(default_factory=list)


class ASTCall(BaseModel):
    caller_symbol_id: Optional[str] = None
    callee_name: str
    file_path: str
    line_number: int
    col_number: int
    raw_call: str


class ImportedSymbol(BaseModel):
    name: str
    alias: Optional[str] = None


class ASTImport(BaseModel):
    file_path: str
    source_module: str
    imported_symbols: List[ImportedSymbol] = Field(default_factory=list)
    is_default: bool = False
    is_wildcard: bool = False
    line_number: int = 1


class ASTExport(BaseModel):
    file_path: str
    symbol_name: str
    alias: Optional[str] = None
    is_default: bool = False
    line_number: int = 1


class FileAST(BaseModel):
    file_path: str
    relative_path: str
    language: str
    symbols: List[ASTSymbol] = Field(default_factory=list)
    calls: List[ASTCall] = Field(default_factory=list)
    imports: List[ASTImport] = Field(default_factory=list)
    exports: List[ASTExport] = Field(default_factory=list)
    line_count: int = 0
    byte_size: int = 0
    raw_content: Optional[str] = None
