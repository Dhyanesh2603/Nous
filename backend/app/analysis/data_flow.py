import os
import re
from enum import Enum
from typing import List, Dict, Any, Set, Optional, Tuple
from pydantic import BaseModel, Field

from app.parsers.symbol_types import FileAST, ASTSymbol, SymbolKind
from app.graph.graph_store import GraphStore
from app.facts.fact_store import FactStore
from app.facts.fact_types import FactKind


class FlowStepType(str, Enum):
    USER_INPUT = "user_input"
    PARAM_PASS = "param_pass"
    VARIABLE_ASSIGN = "variable_assign"
    TRANSFORMATION = "transformation"
    DB_READ = "db_read"
    DB_WRITE = "db_write"
    API_REQUEST = "api_request"
    API_RESPONSE = "api_response"
    RETURN_VALUE = "return_value"


class DataFlowStep(BaseModel):
    step_index: int
    step_type: FlowStepType
    symbol_name: str
    symbol_id: Optional[str] = None
    file_path: str
    relative_path: str
    line_number: int
    variable_name: str
    expression_snippet: str
    description: str


class DataFlowChain(BaseModel):
    chain_id: str
    entry_point: str
    entry_file: str
    terminal_sink: str
    flow_category: str  # 'Input -> DB Write', 'DB Read -> API Response', 'API Request -> Transformation', 'User Input -> Validation'
    is_tainted_sink: bool = False
    total_steps: int
    steps: List[DataFlowStep] = Field(default_factory=list)


class DataFlowReport(BaseModel):
    total_chains: int
    total_user_input_sources: int
    total_db_reads: int
    total_db_writes: int
    total_api_endpoints_traced: int
    chains: List[DataFlowChain] = Field(default_factory=list)
    available_entry_points: List[Dict[str, str]] = Field(default_factory=list)


class DataFlowAnalyzer:
    """
    Data Flow Analysis Engine:
    Tracks lifecycle flow of variables, parameters, return values, user inputs,
    database reads/writes, and API requests/responses across function boundaries.
    """

    USER_INPUT_PATTERNS = [
        (r"(?:request\.(?:body|query_params|args|form|json|data|GET|POST)|req\.(?:body|query|params))", "HTTP Request Parameter"),
        (r"(?:params|query|body|payload)\s*:\s*[A-Z][a-zA-Z0-9]+", "Typed Request Model"),
        (r"(?:input|sys\.argv|process\.argv)\b", "CLI / System Input"),
    ]

    DB_WRITE_PATTERNS = [
        (r"\.(?:save|create|insert|update|upsert|delete|bulk_create|add|commit)\s*\(", "Database Mutation Write"),
        (r"(?:INSERT\s+INTO|UPDATE\s+\w+\s+SET|DELETE\s+FROM)", "Raw SQL Write"),
    ]

    DB_READ_PATTERNS = [
        (r"\.(?:find|find_one|find_all|select|filter|get|all|first|query|execute)\s*\(", "Database Query Read"),
        (r"(?:SELECT\s+.*?\s+FROM)", "Raw SQL Query"),
    ]

    API_REQUEST_PATTERNS = [
        (r"(?:fetch|axios\.(?:get|post|put|delete)|requests\.(?:get|post|put|delete)|http\.get)\s*\(", "Outbound HTTP API Call"),
    ]

    def __init__(self, graph_store: GraphStore, fact_store: Optional[FactStore] = None):
        self.graph_store = graph_store
        self.fact_store = fact_store

    def analyze(self) -> DataFlowReport:
        chains: List[DataFlowChain] = []
        entry_points: List[Dict[str, str]] = []

        if not self.graph_store or not self.graph_store.file_asts:
            return DataFlowReport(
                total_chains=0,
                total_user_input_sources=0,
                total_db_reads=0,
                total_db_writes=0,
                total_api_endpoints_traced=0,
                chains=[],
                available_entry_points=[],
            )

        # 1. Collect all API route handlers as primary flow entry points
        route_entries: List[Tuple[str, str, str]] = []  # (handler_name, file_path, route_path)
        if self.fact_store:
            for r in self.fact_store.routes:
                route_entries.append((r.handler_name, r.file_path, r.route_path))
                entry_points.append({
                    "id": f"{r.file_path}::{r.handler_name}",
                    "name": f"{r.http_method} {r.route_path} ({r.handler_name})",
                    "file": os.path.basename(r.file_path),
                })

        # Also add top-level functions with parameters
        if self.graph_store.call_builder:
            for s_id, sym in self.graph_store.call_builder.symbols_by_id.items():
                if sym.parameters and sym.kind in (SymbolKind.FUNCTION, SymbolKind.ASYNC_FUNCTION):
                    if not any(e["id"] == s_id for e in entry_points):
                        entry_points.append({
                            "id": s_id,
                            "name": f"{sym.name}({', '.join(sym.parameters[:2])})",
                            "file": os.path.basename(sym.file_path),
                        })

        # 2. Build Data Flow Chains for Route Handlers and Entry Points
        chain_idx = 1
        total_user_inputs = 0
        total_db_reads = 0
        total_db_writes = 0
        traced_apis = 0

        # Trace route handlers
        for handler_name, file_path, route_path in route_entries:
            traced_apis += 1
            ast = self.graph_store.file_asts.get(file_path)
            if not ast:
                continue

            matching_sym = next((s for s in ast.symbols if s.name == handler_name), None)
            if not matching_sym:
                continue

            chain = self._trace_flow_from_symbol(matching_sym, f"chain_{chain_idx}", route_path)
            if chain and chain.steps:
                chains.append(chain)
                chain_idx += 1
                total_user_inputs += sum(1 for s in chain.steps if s.step_type == FlowStepType.USER_INPUT)
                total_db_reads += sum(1 for s in chain.steps if s.step_type == FlowStepType.DB_READ)
                total_db_writes += sum(1 for s in chain.steps if s.step_type == FlowStepType.DB_WRITE)

        # Also trace other entry points if few routes
        if len(chains) < 5 and self.graph_store.call_builder:
            for s_id, sym in list(self.graph_store.call_builder.symbols_by_id.items())[:20]:
                if sym.kind in (SymbolKind.FUNCTION, SymbolKind.ASYNC_FUNCTION) and sym.parameters:
                    if not any(c.entry_point == sym.name for c in chains):
                        chain = self._trace_flow_from_symbol(sym, f"chain_{chain_idx}")
                        if chain and len(chain.steps) >= 2:
                            chains.append(chain)
                            chain_idx += 1
                            total_user_inputs += sum(1 for s in chain.steps if s.step_type == FlowStepType.USER_INPUT)
                            total_db_reads += sum(1 for s in chain.steps if s.step_type == FlowStepType.DB_READ)
                            total_db_writes += sum(1 for s in chain.steps if s.step_type == FlowStepType.DB_WRITE)
                        if len(chains) >= 15:
                            break

        return DataFlowReport(
            total_chains=len(chains),
            total_user_input_sources=total_user_inputs,
            total_db_reads=total_db_reads,
            total_db_writes=total_db_writes,
            total_api_endpoints_traced=traced_apis,
            chains=chains,
            available_entry_points=entry_points[:40],
        )

    def trace_symbol(self, symbol_id: str) -> Optional[DataFlowChain]:
        """Traces flow starting from a specific target symbol."""
        if not self.graph_store or not self.graph_store.call_builder:
            return None
        sym = self.graph_store.call_builder.symbols_by_id.get(symbol_id)
        if not sym:
            return None
        return self._trace_flow_from_symbol(sym, f"trace_{sym.name}")

    def _trace_flow_from_symbol(
        self, entry_sym: ASTSymbol, chain_id: str, route_context: Optional[str] = None
    ) -> Optional[DataFlowChain]:
        steps: List[DataFlowStep] = []
        step_counter = 1
        file_path = entry_sym.file_path
        ast = self.graph_store.file_asts.get(file_path)
        rel_path = ast.relative_path.replace("\\", "/") if ast else file_path

        # Step 1: User Input / Entry Parameters
        has_user_input = False
        if route_context:
            steps.append(
                DataFlowStep(
                    step_index=step_counter,
                    step_type=FlowStepType.USER_INPUT,
                    symbol_name=entry_sym.name,
                    symbol_id=entry_sym.id,
                    file_path=file_path,
                    relative_path=rel_path,
                    line_number=entry_sym.start_line,
                    variable_name="req.params / payload",
                    expression_snippet=f"HTTP Endpoint: {route_context}",
                    description=f"Inbound client payload dispatched into handler '{entry_sym.name}()'.",
                )
            )
            step_counter += 1
            has_user_input = True
        elif entry_sym.parameters:
            steps.append(
                DataFlowStep(
                    step_index=step_counter,
                    step_type=FlowStepType.PARAM_PASS,
                    symbol_name=entry_sym.name,
                    symbol_id=entry_sym.id,
                    file_path=file_path,
                    relative_path=rel_path,
                    line_number=entry_sym.start_line,
                    variable_name=", ".join(entry_sym.parameters),
                    expression_snippet=entry_sym.signature or f"def {entry_sym.name}(...)",
                    description=f"Parameters received in function entry boundary '{entry_sym.name}()'.",
                )
            )
            step_counter += 1

        # Scan function body lines for internal variable operations and DB/API sinks
        visited_symbols: Set[str] = {entry_sym.id}
        current_sym = entry_sym
        depth = 0

        while current_sym and depth < 5:
            depth += 1
            code = current_sym.code_content or ""
            c_ast = self.graph_store.file_asts.get(current_sym.file_path)
            c_rel = c_ast.relative_path.replace("\\", "/") if c_ast else current_sym.file_path

            # Detect DB reads
            for pat, desc in self.DB_READ_PATTERNS:
                m = re.search(pat, code, re.IGNORECASE)
                if m:
                    steps.append(
                        DataFlowStep(
                            step_index=step_counter,
                            step_type=FlowStepType.DB_READ,
                            symbol_name=current_sym.name,
                            symbol_id=current_sym.id,
                            file_path=current_sym.file_path,
                            relative_path=c_rel,
                            line_number=current_sym.start_line,
                            variable_name="query_result",
                            expression_snippet=m.group(0),
                            description=f"Read data from database via `{m.group(0).strip()}` in {current_sym.name}().",
                        )
                    )
                    step_counter += 1
                    break

            # Detect DB writes
            for pat, desc in self.DB_WRITE_PATTERNS:
                m = re.search(pat, code, re.IGNORECASE)
                if m:
                    steps.append(
                        DataFlowStep(
                            step_index=step_counter,
                            step_type=FlowStepType.DB_WRITE,
                            symbol_name=current_sym.name,
                            symbol_id=current_sym.id,
                            file_path=current_sym.file_path,
                            relative_path=c_rel,
                            line_number=current_sym.start_line,
                            variable_name="db_record",
                            expression_snippet=m.group(0),
                            description=f"Persist state mutations to database via `{m.group(0).strip()}` in {current_sym.name}().",
                        )
                    )
                    step_counter += 1
                    break

            # Detect outbound API calls
            for pat, desc in self.API_REQUEST_PATTERNS:
                m = re.search(pat, code, re.IGNORECASE)
                if m:
                    steps.append(
                        DataFlowStep(
                            step_index=step_counter,
                            step_type=FlowStepType.API_REQUEST,
                            symbol_name=current_sym.name,
                            symbol_id=current_sym.id,
                            file_path=current_sym.file_path,
                            relative_path=c_rel,
                            line_number=current_sym.start_line,
                            variable_name="api_client",
                            expression_snippet=m.group(0),
                            description=f"Outbound API request invoked via `{m.group(0).strip()}`.",
                        )
                    )
                    step_counter += 1
                    break

            # Traverse callee successors in call graph
            next_sym = None
            if self.graph_store and self.graph_store.call_graph.has_node(current_sym.id):
                callees = list(self.graph_store.call_graph.successors(current_sym.id))
                for c_id in callees:
                    if c_id not in visited_symbols:
                        visited_symbols.add(c_id)
                        cand = self.graph_store.call_builder.symbols_by_id.get(c_id)
                        if cand and cand.kind in (SymbolKind.FUNCTION, SymbolKind.METHOD, SymbolKind.ASYNC_FUNCTION):
                            next_sym = cand
                            callee_rel = (
                                self.graph_store.file_asts[cand.file_path].relative_path.replace("\\", "/")
                                if cand.file_path in self.graph_store.file_asts
                                else cand.file_path
                            )
                            steps.append(
                                DataFlowStep(
                                    step_index=step_counter,
                                    step_type=FlowStepType.PARAM_PASS,
                                    symbol_name=cand.name,
                                    symbol_id=cand.id,
                                    file_path=cand.file_path,
                                    relative_path=callee_rel,
                                    line_number=cand.start_line,
                                    variable_name=", ".join(cand.parameters[:2]) if cand.parameters else "data",
                                    expression_snippet=f"{current_sym.name}() -> {cand.name}()",
                                    description=f"Forward transformed data payload to service method `{cand.name}()`.",
                                )
                            )
                            step_counter += 1
                            break

            current_sym = next_sym

        # Terminal Response Step
        if route_context:
            steps.append(
                DataFlowStep(
                    step_index=step_counter,
                    step_type=FlowStepType.API_RESPONSE,
                    symbol_name=entry_sym.name,
                    symbol_id=entry_sym.id,
                    file_path=file_path,
                    relative_path=rel_path,
                    line_number=entry_sym.end_line,
                    variable_name="HTTP 200 JSON",
                    expression_snippet="return JSONResponse(...)",
                    description=f"Serialize return value and send HTTP Response for {route_context}.",
                )
            )
        elif steps:
            steps.append(
                DataFlowStep(
                    step_index=step_counter,
                    step_type=FlowStepType.RETURN_VALUE,
                    symbol_name=entry_sym.name,
                    symbol_id=entry_sym.id,
                    file_path=file_path,
                    relative_path=rel_path,
                    line_number=entry_sym.end_line,
                    variable_name="result",
                    expression_snippet="return result",
                    description=f"Return computed value to invoking caller.",
                )
            )

        if not steps:
            return None

        # Classify flow category
        has_db_write = any(s.step_type == FlowStepType.DB_WRITE for s in steps)
        has_db_read = any(s.step_type == FlowStepType.DB_READ for s in steps)
        has_api_req = any(s.step_type == FlowStepType.API_REQUEST for s in steps)

        if has_user_input and has_db_write:
            category = "User Input -> Database Mutation"
            terminal = "Database Table"
        elif has_db_read and (route_context or any(s.step_type == FlowStepType.API_RESPONSE for s in steps)):
            category = "Database Query -> HTTP Response"
            terminal = "Client HTTP Response"
        elif has_api_req:
            category = "Pipeline -> External API Request"
            terminal = "External REST/gRPC Service"
        elif has_db_write:
            category = "Service Logic -> Database Write"
            terminal = "Database Table"
        else:
            category = "Transformation Pipeline -> Return Value"
            terminal = f"{entry_sym.name}() Output"

        return DataFlowChain(
            chain_id=chain_id,
            entry_point=entry_sym.name,
            entry_file=rel_path,
            terminal_sink=terminal,
            flow_category=category,
            is_tainted_sink=has_user_input and has_db_write,
            total_steps=len(steps),
            steps=steps,
        )
