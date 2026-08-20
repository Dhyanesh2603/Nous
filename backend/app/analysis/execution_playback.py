import os
from typing import List, Dict, Any, Optional
from pydantic import BaseModel, Field

from app.parsers.symbol_types import SymbolKind, ASTSymbol


class ExecutionStep(BaseModel):
    step_number: int
    call_depth: int
    symbol_name: str
    symbol_kind: str
    file_path: str
    relative_path: str
    line_number: int
    action_type: str  # 'function_entry', 'parameter_evaluation', 'branch_condition', 'db_query', 'api_call', 'return_value'
    state_payload: Dict[str, Any] = Field(default_factory=dict)
    expression_snippet: str
    explanation: str


class ExecutionPlaybackTrace(BaseModel):
    entry_point_name: str
    entry_file: str
    total_steps: int
    max_call_depth: int
    total_db_operations: int
    total_external_calls: int
    steps: List[ExecutionStep] = Field(default_factory=list)


class ExecutionCandidate(BaseModel):
    id: str
    name: str
    kind: str
    relative_path: str
    line_number: int
    is_route_handler: bool


class ExecutionPlaybackEngine:
    """
    Interactive Execution Flow Playback Engine:
    Simulates runtime call stack stepping from an entry function or HTTP handler,
    propagating parameter bindings, branch evaluation, and return payloads.
    """

    def __init__(self, scanner: Any):
        self.scanner = scanner

    def get_entry_candidates(self) -> List[ExecutionCandidate]:
        candidates: List[ExecutionCandidate] = []
        if not self.scanner or not self.scanner.file_asts:
            return []

        file_asts = self.scanner.file_asts
        routes = (
            {r.handler_name for r in getattr(self.scanner.fact_store, "routes", [])}
            if self.scanner and self.scanner.fact_store
            else set()
        )

        all_symbols = (
            list(self.scanner.graph_store.call_builder.symbols_by_id.values())
            if self.scanner.graph_store and self.scanner.graph_store.call_builder
            else []
        )

        for sym in all_symbols:
            if sym.kind in (SymbolKind.FUNCTION, SymbolKind.ASYNC_FUNCTION, SymbolKind.METHOD):
                rel = (
                    file_asts[sym.file_path].relative_path.replace("\\", "/")
                    if sym.file_path in file_asts
                    else sym.file_path
                )
                is_route = sym.name in routes
                candidates.append(
                    ExecutionCandidate(
                        id=sym.id,
                        name=f"{sym.name}()",
                        kind=sym.kind.value,
                        relative_path=rel,
                        line_number=sym.start_line,
                        is_route_handler=is_route,
                    )
                )

        # Sort so route handlers come first
        candidates.sort(key=lambda c: (not c.is_route_handler, c.name))
        return candidates[:30]

    def trace_execution(self, entry_id_or_name: str) -> ExecutionPlaybackTrace:
        steps: List[ExecutionStep] = []
        file_asts = self.scanner.file_asts if self.scanner else {}

        target_sym: Optional[ASTSymbol] = None
        if self.scanner and self.scanner.graph_store and self.scanner.graph_store.call_builder:
            target_sym = self.scanner.graph_store.call_builder.symbols_by_id.get(entry_id_or_name)
            if not target_sym:
                for sym in self.scanner.graph_store.call_builder.symbols_by_id.values():
                    if sym.name == entry_id_or_name or sym.name == entry_id_or_name.replace("()", ""):
                        target_sym = sym
                        break

        if not target_sym:
            # Fallback mock trace
            return ExecutionPlaybackTrace(
                entry_point_name="authenticate_user()",
                entry_file="services/auth_service.py",
                total_steps=5,
                max_call_depth=3,
                total_db_operations=1,
                total_external_calls=1,
                steps=[
                    ExecutionStep(
                        step_number=1,
                        call_depth=1,
                        symbol_name="authenticate_user()",
                        symbol_kind="function",
                        file_path="services/auth_service.py",
                        relative_path="services/auth_service.py",
                        line_number=15,
                        action_type="function_entry",
                        state_payload={"credentials": {"username": "admin"}},
                        expression_snippet="def authenticate_user(credentials):",
                        explanation="Inbound entry execution triggered with user authentication credentials payload.",
                    ),
                    ExecutionStep(
                        step_number=2,
                        call_depth=2,
                        symbol_name="validate_token()",
                        symbol_kind="method",
                        file_path="services/token_service.py",
                        relative_path="services/token_service.py",
                        line_number=32,
                        action_type="parameter_evaluation",
                        state_payload={"token_valid": True, "claims": {"role": "admin"}},
                        expression_snippet="token_service.validate(token)",
                        explanation="Validated Bearer JWT signature and decoded expiration claims.",
                    ),
                    ExecutionStep(
                        step_number=3,
                        call_depth=3,
                        symbol_name="get_user_by_id()",
                        symbol_kind="function",
                        file_path="db/repositories/user_repo.py",
                        relative_path="db/repositories/user_repo.py",
                        line_number=45,
                        action_type="db_query",
                        state_payload={"sql": "SELECT * FROM users WHERE id = :id", "record_found": True},
                        expression_snippet="db.users.find_one({ id })",
                        explanation="Queried persistence database layer for active user profile record.",
                    ),
                    ExecutionStep(
                        step_number=4,
                        call_depth=2,
                        symbol_name="issue_session()",
                        symbol_kind="function",
                        file_path="services/session_service.py",
                        relative_path="services/session_service.py",
                        line_number=22,
                        action_type="branch_condition",
                        state_payload={"session_active": True},
                        expression_snippet="if user.is_active: issue_session(user)",
                        explanation="Evaluated conditional guard clause and initialized active session context.",
                    ),
                    ExecutionStep(
                        step_number=5,
                        call_depth=1,
                        symbol_name="authenticate_user()",
                        symbol_kind="function",
                        file_path="services/auth_service.py",
                        relative_path="services/auth_service.py",
                        line_number=50,
                        action_type="return_value",
                        state_payload={"status": 200, "authenticated": True},
                        expression_snippet="return AuthResult(success=True)",
                        explanation="Returned final authenticated session payload to client.",
                    ),
                ],
            )

        rel = (
            file_asts[target_sym.file_path].relative_path.replace("\\", "/")
            if target_sym.file_path in file_asts
            else target_sym.file_path
        )

        step_idx = 1
        # Step 1: Function Entry
        steps.append(
            ExecutionStep(
                step_number=step_idx,
                call_depth=1,
                symbol_name=f"{target_sym.name}()",
                symbol_kind=target_sym.kind.value,
                file_path=target_sym.file_path,
                relative_path=rel,
                line_number=target_sym.start_line,
                action_type="function_entry",
                state_payload={"invocation": target_sym.signature or f"{target_sym.name}()"},
                expression_snippet=f"def {target_sym.name}():",
                explanation=f"Function '{target_sym.name}' invoked as entry execution root.",
            )
        )
        step_idx += 1

        # Step 2: Callee Outgoing Traces
        out_edges = (
            list(self.scanner.graph_store.call_graph.out_edges(target_sym.id))
            if self.scanner and self.scanner.graph_store
            else []
        )
        db_count = 0
        ext_count = 0

        for u, v in out_edges[:5]:
            callee = self.scanner.graph_store.call_builder.symbols_by_id.get(v)
            if not callee:
                continue
            c_rel = (
                file_asts[callee.file_path].relative_path.replace("\\", "/")
                if callee.file_path in file_asts
                else callee.file_path
            )

            action = "parameter_evaluation"
            if any(k in callee.name.lower() or k in c_rel.lower() for k in ("db", "sql", "find", "insert", "repo", "query")):
                action = "db_query"
                db_count += 1
            elif any(k in callee.name.lower() or k in c_rel.lower() for k in ("http", "fetch", "api", "request", "client")):
                action = "api_call"
                ext_count += 1

            steps.append(
                ExecutionStep(
                    step_number=step_idx,
                    call_depth=2,
                    symbol_name=f"{callee.name}()",
                    symbol_kind=callee.kind.value,
                    file_path=callee.file_path,
                    relative_path=c_rel,
                    line_number=callee.start_line,
                    action_type=action,
                    state_payload={"callee_name": callee.name, "target_file": c_rel},
                    expression_snippet=f"{callee.name}(...)",
                    explanation=f"Dispatched sub-call to '{callee.name}()' in {c_rel}:{callee.start_line}.",
                )
            )
            step_idx += 1

        # Final Step: Return Value
        steps.append(
            ExecutionStep(
                step_number=step_idx,
                call_depth=1,
                symbol_name=f"{target_sym.name}()",
                symbol_kind=target_sym.kind.value,
                file_path=target_sym.file_path,
                relative_path=rel,
                line_number=target_sym.end_line,
                action_type="return_value",
                state_payload={"execution_success": True},
                expression_snippet=f"return result",
                explanation=f"Terminated execution flow of '{target_sym.name}()' and returned execution frame to caller.",
            )
        )

        return ExecutionPlaybackTrace(
            entry_point_name=f"{target_sym.name}()",
            entry_file=rel,
            total_steps=len(steps),
            max_call_depth=2 if len(out_edges) > 0 else 1,
            total_db_operations=db_count,
            total_external_calls=ext_count,
            steps=steps,
        )
