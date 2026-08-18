from typing import Dict, List, Set, Optional, Tuple, Any
import os
import fnmatch
from pydantic import BaseModel, Field

from app.graph.graph_store import GraphStore


class ArchitectureRule(BaseModel):
    id: str
    name: str
    description: str
    source_pattern: str  # e.g., 'models/**' or '*/models/*'
    target_pattern: str  # e.g., 'auth/**' or 'services/**'
    action: str = "deny"  # 'deny' or 'allow_only'
    severity: str = "error"  # 'error' or 'warning'
    preset: Optional[str] = None


class RuleViolation(BaseModel):
    rule_id: str
    rule_name: str
    source_file: str
    source_relative: str
    target_file: str
    target_relative: str
    imported_symbols: List[str] = Field(default_factory=list)
    severity: str
    explanation: str


class RuleEvaluationReport(BaseModel):
    total_rules_evaluated: int
    violations_count: int
    is_compliant: bool
    preset_applied: Optional[str] = None
    violations: List[RuleViolation]


# Built-in industry presets
BUILTIN_PRESETS: Dict[str, List[ArchitectureRule]] = {
    "clean_architecture": [
        ArchitectureRule(
            id="clean_domain_isolation",
            name="Domain Layer Isolation",
            description="Domain models and entities must not depend on outer business logic, auth, or infrastructure services.",
            source_pattern="*models/*",
            target_pattern="*auth/*",
            action="deny",
            severity="error",
            preset="clean_architecture",
        ),
        ArchitectureRule(
            id="clean_domain_pipeline",
            name="Domain to Pipeline Decoupling",
            description="Domain entities must not depend directly on execution pipelines or batch processors.",
            source_pattern="*models/*",
            target_pattern="*pipeline/*",
            action="deny",
            severity="error",
            preset="clean_architecture",
        ),
    ],
    "layered_architecture": [
        ArchitectureRule(
            id="layered_bottom_up",
            name="No Reverse Dependencies",
            description="Lower-level utility layers must not import higher-level application or domain controllers.",
            source_pattern="*utils/*",
            target_pattern="*auth/*",
            action="deny",
            severity="error",
            preset="layered_architecture",
        ),
        ArchitectureRule(
            id="layered_helpers_isolation",
            name="Helper Utilities Isolation",
            description="Shared helpers should remain pure without importing business pipeline processors.",
            source_pattern="*utils/*",
            target_pattern="*pipeline/*",
            action="deny",
            severity="warning",
            preset="layered_architecture",
        ),
    ],
}


class ArchitectureRulesEngine:
    def __init__(self, graph_store: GraphStore):
        self.graph_store = graph_store

    def evaluate_rules(
        self,
        custom_rules: Optional[List[ArchitectureRule]] = None,
        preset: Optional[str] = None,
    ) -> RuleEvaluationReport:
        rules: List[ArchitectureRule] = []

        if preset and preset in BUILTIN_PRESETS:
            rules.extend(BUILTIN_PRESETS[preset])
        elif custom_rules:
            rules.extend(custom_rules)
        else:
            # Default to Clean Architecture preset
            rules.extend(BUILTIN_PRESETS["clean_architecture"])

        violations: List[RuleViolation] = []

        for rule in rules:
            for u, v, data in self.graph_store.dep_graph.edges(data=True):
                # u is source file (importer), v is target file (imported)
                if u not in self.graph_store.file_asts or v not in self.graph_store.file_asts:
                    continue

                rel_u = self.graph_store.file_asts[u].relative_path.replace("\\", "/")
                rel_v = self.graph_store.file_asts[v].relative_path.replace("\\", "/")

                # Match patterns
                src_match = self._matches_pattern(rel_u, rule.source_pattern)
                tgt_match = self._matches_pattern(rel_v, rule.target_pattern)

                if rule.action == "deny" and src_match and tgt_match:
                    symbols_imported = data.get("symbols", [])
                    explanation = (
                        f"Architecture Drift: '{rel_u}' imports from '{rel_v}', "
                        f"violating rule '{rule.name}' ({rule.description})."
                    )
                    violations.append(
                        RuleViolation(
                            rule_id=rule.id,
                            rule_name=rule.name,
                            source_file=u,
                            source_relative=rel_u,
                            target_file=v,
                            target_relative=rel_v,
                            imported_symbols=symbols_imported,
                            severity=rule.severity,
                            explanation=explanation,
                        )
                    )

        return RuleEvaluationReport(
            total_rules_evaluated=len(rules),
            violations_count=len(violations),
            is_compliant=len(violations) == 0,
            preset_applied=preset,
            violations=violations,
        )

    def _matches_pattern(self, path: str, pattern: str) -> bool:
        norm_path = path.replace("\\", "/").lower()
        norm_pat = pattern.replace("\\", "/").lower()
        
        if fnmatch.fnmatch(norm_path, norm_pat):
            return True
        if fnmatch.fnmatch(os.path.basename(norm_path), norm_pat):
            return True
        return False
