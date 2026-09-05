from typing import Dict, Any, List, Optional, Set, Tuple
import os
import networkx as nx
from pydantic import BaseModel, Field

from app.scanner import RepoScanner
from app.parsers.symbol_types import ASTSymbol


class RippleLevelItem(BaseModel):
    id: str
    name: str
    kind: str  # "file", "function", "class", "route", "controller"
    file_path: str
    line: Optional[int] = None
    relationship: str  # "direct_import", "direct_call", "transitive_dependency", "ingress_route"
    risk_level: str  # "critical", "high", "medium", "low"
    risk_reason: str


class RippleSimulationReport(BaseModel):
    target_id: str
    target_name: str
    target_type: str  # "file" | "symbol"
    change_type: str  # "breaking" | "behavioral" | "additive"
    overall_risk_score: float  # 0.0 - 100.0
    risk_tier: str  # "CRITICAL", "HIGH", "MEDIUM", "LOW"
    level1_direct: List[RippleLevelItem] = Field(default_factory=list)
    level2_transitive: List[RippleLevelItem] = Field(default_factory=list)
    level3_ingress: List[RippleLevelItem] = Field(default_factory=list)
    breaking_contract_warnings: List[str] = Field(default_factory=list)
    recommended_test_files: List[str] = Field(default_factory=list)
    affected_endpoints_count: int = 0
    total_affected_files: int = 0
    transitive_reachability_pct: float = 0.0


class RippleSimulatorEngine:
    """
    Interactive Ripple Effect & Failure Cascade Simulator.
    Calculates multi-tier failure propagation (Level 1 Direct, Level 2 Transitive,
    Level 3 Ingress Endpoints) and evaluates contract change risks.
    """

    def __init__(self, scanner: RepoScanner):
        self.scanner = scanner
        self.graph_store = scanner.graph_store

    def get_available_targets(self) -> List[Dict[str, str]]:
        """Returns list of top candidate files and central symbols for ripple testing."""
        targets: List[Dict[str, str]] = []
        
        # Files sorted by in-degree / dependents
        dep_graph = self.graph_store.dep_graph
        if dep_graph:
            sorted_files = sorted(
                dep_graph.nodes(),
                key=lambda n: dep_graph.in_degree(n),
                reverse=True
            )
            for f in sorted_files[:20]:
                name = os.path.basename(f)
                in_deg = dep_graph.in_degree(f)
                targets.append({
                    "id": f,
                    "name": name,
                    "type": "file",
                    "label": f"{name} ({in_deg} dependents)",
                })

        # Add top central symbols
        call_graph = self.graph_store.call_graph
        if call_graph:
            sorted_syms = sorted(
                call_graph.nodes(),
                key=lambda n: call_graph.in_degree(n),
                reverse=True
            )
            for s in sorted_syms[:15]:
                in_deg = call_graph.in_degree(s)
                sym_obj = None
                if self.graph_store.call_builder:
                    sym_obj = self.graph_store.call_builder.symbols_by_id.get(s)
                name = sym_obj.name if sym_obj else s.split("::")[-1]
                targets.append({
                    "id": s,
                    "name": name,
                    "type": "symbol",
                    "label": f"fn/class {name} ({in_deg} callers)",
                })

        return targets

    def simulate(
        self,
        target_id: str,
        target_type: str = "file",
        change_type: str = "breaking",
    ) -> RippleSimulationReport:
        """
        Executes multi-tier cascade traversal and evaluates contract breaking risks.
        """
        dep_graph = self.graph_store.dep_graph
        call_graph = self.graph_store.call_graph

        target_name = os.path.basename(target_id)
        if target_type == "symbol" and self.graph_store.call_builder:
            sym_obj = self.graph_store.call_builder.symbols_by_id.get(target_id)
            if sym_obj:
                target_name = sym_obj.name

        level1_items: List[RippleLevelItem] = []
        level2_items: List[RippleLevelItem] = []
        level3_items: List[RippleLevelItem] = []
        warnings: List[str] = []
        test_files: Set[str] = set()

        all_affected_files: Set[str] = {target_id} if target_type == "file" else set()

        # -------------------------------------------------------------
        # 1. LEVEL 1: DIRECT IMPACT (Predecessors / Direct Invocations)
        # -------------------------------------------------------------
        l1_nodes: Set[str] = set()
        if target_type == "file":
            if dep_graph.has_node(target_id):
                l1_nodes = set(dep_graph.predecessors(target_id))
            for pred in l1_nodes:
                all_affected_files.add(pred)
                base = os.path.basename(pred)
                risk_lvl = "critical" if change_type == "breaking" else ("high" if change_type == "behavioral" else "medium")
                level1_items.append(
                    RippleLevelItem(
                        id=pred,
                        name=base,
                        kind="file",
                        file_path=pred,
                        relationship="direct_import",
                        risk_level=risk_lvl,
                        risk_reason=f"Directly imports and relies on module interfaces from {target_name}.",
                    )
                )
        else:
            # Symbol target
            if call_graph.has_node(target_id):
                l1_nodes = set(call_graph.predecessors(target_id))
            for caller in l1_nodes:
                caller_sym = self.graph_store.call_builder.symbols_by_id.get(caller) if self.graph_store.call_builder else None
                c_name = caller_sym.name if caller_sym else caller.split("::")[-1]
                c_file = caller_sym.file_path if caller_sym else caller.split("::")[0]
                all_affected_files.add(c_file)
                risk_lvl = "critical" if change_type == "breaking" else ("high" if change_type == "behavioral" else "medium")
                level1_items.append(
                    RippleLevelItem(
                        id=caller,
                        name=c_name,
                        kind=caller_sym.kind.value if caller_sym else "function",
                        file_path=c_file,
                        line=caller_sym.start_line if caller_sym else 1,
                        relationship="direct_call",
                        risk_level=risk_lvl,
                        risk_reason=f"Directly calls {target_name}() in execution flow.",
                    )
                )

        # -------------------------------------------------------------
        # 2. LEVEL 2: TRANSITIVE RIPPLE (2-Hop to 4-Hop Invocations)
        # -------------------------------------------------------------
        l2_nodes: Set[str] = set()
        if target_type == "file":
            for n1 in l1_nodes:
                if dep_graph.has_node(n1):
                    for pred2 in dep_graph.predecessors(n1):
                        if pred2 not in l1_nodes and pred2 != target_id:
                            l2_nodes.add(pred2)
                            all_affected_files.add(pred2)
            for pred in list(l2_nodes)[:15]:
                base = os.path.basename(pred)
                risk_lvl = "high" if change_type == "breaking" else ("medium" if change_type == "behavioral" else "low")
                level2_items.append(
                    RippleLevelItem(
                        id=pred,
                        name=base,
                        kind="file",
                        file_path=pred,
                        relationship="transitive_dependency",
                        risk_level=risk_lvl,
                        risk_reason=f"Transitive consumer affected through secondary service chaining.",
                    )
                )
        else:
            for c1 in l1_nodes:
                if call_graph.has_node(c1):
                    for caller2 in call_graph.predecessors(c1):
                        if caller2 not in l1_nodes and caller2 != target_id:
                            l2_nodes.add(caller2)
            for caller in list(l2_nodes)[:15]:
                caller_sym = self.graph_store.call_builder.symbols_by_id.get(caller) if self.graph_store.call_builder else None
                c_name = caller_sym.name if caller_sym else caller.split("::")[-1]
                c_file = caller_sym.file_path if caller_sym else caller.split("::")[0]
                all_affected_files.add(c_file)
                risk_lvl = "high" if change_type == "breaking" else ("medium" if change_type == "behavioral" else "low")
                level2_items.append(
                    RippleLevelItem(
                        id=caller,
                        name=c_name,
                        kind=caller_sym.kind.value if caller_sym else "function",
                        file_path=c_file,
                        line=caller_sym.start_line if caller_sym else 1,
                        relationship="transitive_dependency",
                        risk_level=risk_lvl,
                        risk_reason=f"Cascading upstream caller invoking {target_name} through helper functions.",
                    )
                )

        # -------------------------------------------------------------
        # 3. LEVEL 3: INGRESS ROUTES & PUBLIC API ENDPOINTS
        # -------------------------------------------------------------
        affected_routes: List[Dict[str, Any]] = []
        if hasattr(self.scanner, "fact_store") and self.scanner.fact_store:
            for r in self.scanner.fact_store.routes:
                r_file = r.get("file_path", "")
                if r_file in all_affected_files:
                    affected_routes.append(r)
                    level3_items.append(
                        RippleLevelItem(
                            id=f"route::{r.get('method', 'GET')}::{r.get('path', '/')}",
                            name=f"{r.get('method', 'GET')} {r.get('path', '/')}",
                            kind="route",
                            file_path=r_file,
                            line=r.get("line_number", 1),
                            relationship="ingress_route",
                            risk_level="critical" if change_type == "breaking" else "high",
                            risk_reason=f"Public HTTP route controller will fail if contract breaks.",
                        )
                    )

        # -------------------------------------------------------------
        # 4. CONTRACT CHANGE RISK SCORING & TEST RECOMMENDATIONS
        # -------------------------------------------------------------
        total_files_in_repo = max(len(self.scanner.file_asts), 1)
        reachability_pct = round((len(all_affected_files) / total_files_in_repo) * 100.0, 1)

        # Multiplier based on change type
        multiplier = 1.0 if change_type == "breaking" else (0.6 if change_type == "behavioral" else 0.25)
        raw_score = (len(level1_items) * 12 + len(level2_items) * 6 + len(level3_items) * 15 + reachability_pct * 0.4) * multiplier
        risk_score = min(max(round(raw_score, 1), 5.0), 99.0)

        if risk_score >= 70:
            risk_tier = "CRITICAL"
        elif risk_score >= 45:
            risk_tier = "HIGH"
        elif risk_score >= 20:
            risk_tier = "MEDIUM"
        else:
            risk_tier = "LOW"

        # Formulate breaking contract warnings
        if change_type == "breaking":
            warnings.append(f"Breaking signature changes in '{target_name}' will cause immediate compilation / runtime crashes across {len(level1_items)} direct dependents.")
            if len(level3_items) > 0:
                warnings.append(f"Contract failure propagates to {len(level3_items)} public ingress HTTP routes!")
        elif change_type == "behavioral":
            warnings.append(f"Internal algorithm updates in '{target_name}' may introduce subtle regression bugs across {len(level1_items) + len(level2_items)} downstream components.")
        else:
            warnings.append(f"Additive non-breaking change: Minimal regression risk detected.")

        # Identify recommended test files
        for f in self.scanner.file_asts.keys():
            f_lower = f.lower()
            if "test" in f_lower or "spec" in f_lower:
                # Check if test imports or targets any affected file
                base = os.path.basename(target_id).split(".")[0].lower()
                if base in f_lower or any(os.path.basename(aff).split(".")[0].lower() in f_lower for aff in all_affected_files):
                    test_files.add(f)

        if not test_files:
            # Recommend generic test file naming
            test_files.add(f"tests/test_{os.path.basename(target_id).split('.')[0]}.py")

        return RippleSimulationReport(
            target_id=target_id,
            target_name=target_name,
            target_type=target_type,
            change_type=change_type,
            overall_risk_score=risk_score,
            risk_tier=risk_tier,
            level1_direct=level1_items,
            level2_transitive=level2_items,
            level3_ingress=level3_items,
            breaking_contract_warnings=warnings,
            recommended_test_files=list(test_files)[:6],
            affected_endpoints_count=len(level3_items),
            total_affected_files=len(all_affected_files),
            transitive_reachability_pct=reachability_pct,
        )
