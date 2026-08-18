from enum import Enum
from typing import Dict, List, Optional, Tuple, Any
from pydantic import BaseModel, Field


class FactKind(str, Enum):
    DEF_SYMBOL = "DEF_SYMBOL"                     # Subject defines Symbol
    CALL_REF = "CALL_REF"                         # Caller calls Callee
    INSTANTIATES_REF = "INSTANTIATES_REF"         # Caller instantiates Class
    INHERITS_REF = "INHERITS_REF"                 # Class inherits from Base / implements Interface
    TYPE_REF = "TYPE_REF"                         # Symbol uses Type
    ROUTE_HANDLER_DEF = "ROUTE_HANDLER_DEF"       # Route path mapped to Handler Symbol
    IMPORT_REF = "IMPORT_REF"                     # File imports Module / Symbol
    EXPORT_DEF = "EXPORT_DEF"                     # File exports Symbol
    MEMBER_DEF = "MEMBER_DEF"                     # Container contains Member


class CodeFact(BaseModel):
    id: str
    kind: FactKind
    subject_id: str
    predicate: str  # e.g., 'defines', 'calls', 'instantiates', 'inherits_from', 'imports', 'routes_to', 'typed_as'
    object_id: str
    file_path: str
    relative_path: str
    line_number: int
    span: Tuple[int, int] = (0, 0)
    metadata: Dict[str, Any] = Field(default_factory=dict)


class RouteFact(BaseModel):
    id: str
    http_method: str  # 'GET', 'POST', 'PUT', 'DELETE', 'PATCH', etc.
    route_path: str   # e.g., '/api/users/{id}'
    handler_symbol_id: str
    handler_name: str
    file_path: str
    relative_path: str
    line_number: int


class FactSummary(BaseModel):
    total_facts: int
    facts_by_kind: Dict[str, int]
    total_routes_detected: int
    total_instantiations: int
    total_inheritance_relations: int


class FactQueryResponse(BaseModel):
    total_matches: int
    facts: List[CodeFact]
