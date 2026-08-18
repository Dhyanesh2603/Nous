from typing import Dict, List, Set, Optional, Tuple, Any
import os
import networkx as nx
from pydantic import BaseModel, Field

from app.parsers.symbol_types import FileAST, ASTSymbol
from app.graph.graph_store import GraphStore


class SequenceStep(BaseModel):
    step: int
    depth: int
    caller_id: str
    caller_label: str
    caller_participant: str
    callee_id: str
    callee_label: str
    callee_participant: str
    raw_call: str
    line_number: int
    file_path: str


class SequenceParticipant(BaseModel):
    id: str
    name: str
    type: str  # 'actor', 'module', 'class', 'file'
    file_path: Optional[str] = None


class SequenceDiagramResponse(BaseModel):
    entry_symbol_id: str
    entry_symbol_name: str
    mermaid_markdown: str
    total_steps: int
    participants: List[SequenceParticipant]
    steps: List[SequenceStep]


class SequenceDiagramGenerator:
    def __init__(self, graph_store: GraphStore):
        self.graph_store = graph_store

    def generate_sequence(self, entry_symbol_id: str, max_depth: int = 5) -> SequenceDiagramResponse:
        if not self.graph_store.call_builder or entry_symbol_id not in self.graph_store.call_builder.symbols_by_id:
            raise ValueError(f"Symbol '{entry_symbol_id}' not found in call graph index.")

        entry_sym = self.graph_store.call_builder.symbols_by_id[entry_symbol_id]
        
        steps: List[SequenceStep] = []
        visited_edges: Set[Tuple[str, str]] = set()
        participants_map: Dict[str, SequenceParticipant] = {}

        # Add initial Actor
        participants_map["User"] = SequenceParticipant(
            id="User",
            name="Client / User",
            type="actor",
        )

        entry_participant = self._get_participant_id(entry_sym.file_path, entry_sym.scope)
        participants_map[entry_participant] = SequenceParticipant(
            id=entry_participant,
            name=entry_sym.scope or os.path.basename(entry_sym.file_path),
            type="class" if entry_sym.scope else "file",
            file_path=entry_sym.file_path,
        )

        # Initial call step from User to entry point
        steps.append(
            SequenceStep(
                step=1,
                depth=0,
                caller_id="User",
                caller_label="Client / User",
                caller_participant="User",
                callee_id=entry_symbol_id,
                callee_label=entry_sym.name,
                callee_participant=entry_participant,
                raw_call=f"{entry_sym.name}()",
                line_number=entry_sym.start_line,
                file_path=entry_sym.file_path,
            )
        )

        # Perform DFS on Call Graph starting from entry_symbol_id
        step_counter = 2
        self._dfs_trace(
            entry_symbol_id,
            depth=1,
            max_depth=max_depth,
            steps=steps,
            visited_edges=visited_edges,
            participants_map=participants_map,
            step_counter_ref=[step_counter],
        )

        # Generate Mermaid Markdown
        mermaid_code = self._build_mermaid_code(participants_map, steps)

        return SequenceDiagramResponse(
            entry_symbol_id=entry_symbol_id,
            entry_symbol_name=entry_sym.name,
            mermaid_markdown=mermaid_code,
            total_steps=len(steps),
            participants=list(participants_map.values()),
            steps=steps,
        )

    def _dfs_trace(
        self,
        current_symbol_id: str,
        depth: int,
        max_depth: int,
        steps: List[SequenceStep],
        visited_edges: Set[Tuple[str, str]],
        participants_map: Dict[str, SequenceParticipant],
        step_counter_ref: List[int],
    ):
        if depth > max_depth or not self.graph_store.call_graph.has_node(current_symbol_id):
            return

        caller_sym = self.graph_store.call_builder.symbols_by_id[current_symbol_id]
        caller_part = self._get_participant_id(caller_sym.file_path, caller_sym.scope)
        
        # Outgoing calls from this symbol
        for _, callee_id, edge_data in self.graph_store.call_graph.out_edges(current_symbol_id, data=True):
            edge_key = (current_symbol_id, callee_id)
            if edge_key in visited_edges:
                continue
            visited_edges.add(edge_key)

            callee_sym = self.graph_store.call_builder.symbols_by_id.get(callee_id)
            if not callee_sym:
                continue

            callee_part = self._get_participant_id(callee_sym.file_path, callee_sym.scope)
            if callee_part not in participants_map:
                participants_map[callee_part] = SequenceParticipant(
                    id=callee_part,
                    name=callee_sym.scope or os.path.basename(callee_sym.file_path),
                    type="class" if callee_sym.scope else "file",
                    file_path=callee_sym.file_path,
                )

            raw_call = edge_data.get("raw_call", f"{callee_sym.name}()")
            line_no = edge_data.get("line_number", callee_sym.start_line)

            steps.append(
                SequenceStep(
                    step=step_counter_ref[0],
                    depth=depth,
                    caller_id=current_symbol_id,
                    caller_label=caller_sym.name,
                    caller_participant=caller_part,
                    callee_id=callee_id,
                    callee_label=callee_sym.name,
                    callee_participant=callee_part,
                    raw_call=raw_call,
                    line_number=line_no,
                    file_path=caller_sym.file_path,
                )
            )
            step_counter_ref[0] += 1

            # Recurse down the call stack
            self._dfs_trace(
                callee_id,
                depth=depth + 1,
                max_depth=max_depth,
                steps=steps,
                visited_edges=visited_edges,
                participants_map=participants_map,
                step_counter_ref=step_counter_ref,
            )

    def _get_participant_id(self, file_path: str, scope: Optional[str]) -> str:
        base = os.path.splitext(os.path.basename(file_path))[0]
        if scope:
            # e.g., AuthService
            top_class = scope.split(".")[0]
            return f"{top_class}"
        return f"{base}_mod"

    def _build_mermaid_code(
        self,
        participants: Dict[str, SequenceParticipant],
        steps: List[SequenceStep],
    ) -> str:
        lines = [
            "sequenceDiagram",
            "    autonumber",
        ]

        # Declare participants
        for p_id, p in participants.items():
            if p.type == "actor":
                lines.append(f'    actor {p_id} as "{p.name}"')
            else:
                lines.append(f'    participant {p_id} as "{p.name}"')

        lines.append("")

        # Add interactions
        for step in steps:
            clean_call = step.raw_call.replace('"', "'").replace("\n", " ")
            if len(clean_call) > 40:
                clean_call = f"{step.callee_label}(...)"
            lines.append(f"    {step.caller_participant}->>+{step.callee_participant}: {clean_call}")

        return "\n".join(lines)
