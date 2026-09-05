from typing import Dict, Any, List, Optional
import re
from pydantic import BaseModel, Field

from app.scanner import RepoScanner
from app.ai.llm_client import LLMClient, LLMMessage
from app.ai.graph_rag import GraphRAGContextBuilder, GraphRAGContext


class ReferencedSymbolItem(BaseModel):
    name: str
    kind: str
    file_path: str
    start_line: int
    end_line: int


class ArchitectAIResponse(BaseModel):
    query: str
    summary: str
    execution_steps: List[str] = Field(default_factory=list)
    sequence_diagram: str = ""
    referenced_files: List[str] = Field(default_factory=list)
    referenced_symbols: List[ReferencedSymbolItem] = Field(default_factory=list)
    architectural_observations: List[str] = Field(default_factory=list)
    provider: str = "offline"
    model: str = "deterministic-ast-engine"
    is_fallback: bool = False


class ArchitectAIEngine:
    """
    Architect AI: Graph-Augmented Architecture Explainer & Q&A Engine.
    Combines AST facts, NetworkX call graphs, and LLM reasoning to explain
    codebase execution pathways and architecture flows.
    """

    def __init__(self, scanner: RepoScanner, llm_client: Optional[LLMClient] = None):
        self.scanner = scanner
        self.llm_client = llm_client or LLMClient()
        self.rag_builder = GraphRAGContextBuilder(scanner)

    def get_suggested_questions(self) -> List[str]:
        """Generates smart contextual questions based on the ingested repository."""
        questions = [
            "Explain the overall system architecture and primary entry points.",
            "How does data flow from API requests to the persistence layer?",
            "What are the most coupled modules and critical bottleneck files?",
            "How is error handling and middleware structured across the codebase?",
        ]

        # Add framework-specific questions
        has_auth = any("auth" in f.lower() or "login" in f.lower() or "jwt" in f.lower() for f in self.scanner.file_asts.keys())
        if has_auth:
            questions.insert(1, "How does user authentication and authorization work?")

        has_db = any("db" in f.lower() or "model" in f.lower() or "sql" in f.lower() or "prisma" in f.lower() for f in self.scanner.file_asts.keys())
        if has_db:
            questions.insert(2, "Explain the database models, relations, and query flow.")

        has_react = any(f.endswith(".tsx") or f.endswith(".jsx") for f in self.scanner.file_asts.keys())
        if has_react:
            questions.append("How are UI components and client state management organized?")

        return questions[:6]

    def ask(
        self,
        query: str,
        provider: Optional[str] = None,
        model: Optional[str] = None,
        focus_node_id: Optional[str] = None,
    ) -> ArchitectAIResponse:
        """Executes Graph-RAG retrieval and synthesizes structured architectural intelligence."""
        # 1. Build Grounded Graph-RAG Context
        ctx = self.rag_builder.build_context(query=query, focus_node_id=focus_node_id)

        # 2. System Prompt instructing LLM to act as a Principal Software Architect
        system_prompt = (
            "You are a Principal Software Architect and Static Analysis expert. "
            "You are answering a developer's question about a specific software codebase. "
            "You MUST base your response on the provided VERIFIED REPOSITORY FACTS, AST symbols, and call chains. "
            "Never invent file paths or functions that are not in the context. "
            "Always include exact file paths and function names where relevant."
        )

        user_prompt = (
            f"{ctx.formatted_prompt}\n\n"
            "Please provide a structured architectural explanation in Markdown with the following:\n"
            "1. High-Level Summary: Concise explanation of the subsystem/mechanism.\n"
            "2. Step-by-Step Flow: The execution pathway from ingress to persistence.\n"
            "3. Key Architectural Observations: Coupling, patterns, or boundary considerations."
        )

        # 3. Generate via LLM Client
        messages = [
            LLMMessage(role="system", content=system_prompt),
            LLMMessage(role="user", content=user_prompt),
        ]
        llm_res = self.llm_client.generate(messages, provider=provider, model=model)

        # 4. Generate Deterministic Mermaid Sequence Diagram from verified Call Chains
        sequence_diag = self._generate_sequence_diagram(ctx)

        # 5. Extract Referenced Symbols & Files
        ref_symbols: List[ReferencedSymbolItem] = []
        for sym in ctx.seed_symbols[:10]:
            ref_symbols.append(
                ReferencedSymbolItem(
                    name=sym.name,
                    kind=sym.kind.value if hasattr(sym.kind, "value") else str(sym.kind),
                    file_path=sym.file_path,
                    start_line=sym.start_line,
                    end_line=sym.end_line,
                )
            )

        # Extract structured execution steps from narrative
        steps = self._extract_execution_steps(llm_res.content, ctx)
        observations = self._extract_observations(ctx)

        return ArchitectAIResponse(
            query=query,
            summary=llm_res.content,
            execution_steps=steps,
            sequence_diagram=sequence_diag,
            referenced_files=ctx.seed_files[:12],
            referenced_symbols=ref_symbols,
            architectural_observations=observations,
            provider=llm_res.provider,
            model=llm_res.model,
            is_fallback=llm_res.is_fallback,
        )

    def _generate_sequence_diagram(self, ctx: GraphRAGContext) -> str:
        """Constructs a clean Mermaid sequence diagram from verified call chains."""
        if not ctx.call_chains:
            # Fallback simple diagram using seed files
            diag = ["sequenceDiagram", "    autonumber"]
            if len(ctx.seed_files) >= 2:
                src = self._sanitize_mermaid_id(ctx.seed_files[0])
                dst = self._sanitize_mermaid_id(ctx.seed_files[1])
                diag.append(f"    actor Client")
                diag.append(f"    Client->>{src}: Ingress Request")
                diag.append(f"    {src}->>{dst}: Delegate Call")
                diag.append(f"    {dst}-->>Client: Response")
            else:
                diag.append("    actor Client")
                diag.append("    Client->>System: Query Execution")
            return "\n".join(diag)

        diag = ["sequenceDiagram", "    autonumber"]
        participants = set()
        calls_added = 0

        for c in ctx.call_chains[:8]:
            caller_file = self._sanitize_mermaid_id(c["caller_file"])
            callee_func = c["callee"]
            
            # Find destination file if known
            target_file = caller_file
            for sym in ctx.seed_symbols:
                if sym.name == callee_func:
                    target_file = self._sanitize_mermaid_id(sym.file_path)
                    break

            if caller_file != target_file:
                diag.append(f"    {caller_file}->>{target_file}: {callee_func}() [L{c['line']}]")
                calls_added += 1
            else:
                diag.append(f"    {caller_file}->>{caller_file}: {callee_func}() [L{c['line']}]")
                calls_added += 1

            if calls_added >= 8:
                break

        if calls_added == 0:
            diag.append("    actor Client")
            diag.append("    Client->>Application: Process Request")

        return "\n".join(diag)

    def _sanitize_mermaid_id(self, file_path: str) -> str:
        name = file_path.replace("\\", "/").split("/")[-1]
        clean = re.sub(r"[^a-zA-Z0-9_]", "_", name)
        return clean or "Module"

    def _extract_execution_steps(self, content: str, ctx: GraphRAGContext) -> List[str]:
        steps: List[str] = []
        for line in content.split("\n"):
            line_str = line.strip()
            if re.match(r"^(\d+\.|\-|\*)\s+", line_str) and len(line_str) > 10:
                steps.append(re.sub(r"^(\d+\.|\-|\*)\s+", "", line_str))

        if not steps and ctx.call_chains:
            for c in ctx.call_chains[:5]:
                steps.append(f"`{c['caller_symbol']}` in `{c['caller_file']}` invokes `{c['callee']}()` at line {c['line']}.")

        return steps[:6]

    def _extract_observations(self, ctx: GraphRAGContext) -> List[str]:
        obs: List[str] = []
        obs.append(f"Analyzed {len(ctx.seed_files)} primary architectural files across {len(ctx.frameworks)} detected frameworks.")
        if len(ctx.call_chains) > 10:
            obs.append(f"Dense cross-module call coupling observed ({len(ctx.call_chains)} active invocations).")
        else:
            obs.append("Clean functional separation with modular call hierarchy.")
        return obs
