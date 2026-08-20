import os
import math
from typing import List, Dict, Any, Optional
from pydantic import BaseModel, Field

from app.parsers.symbol_types import SymbolKind


class DebtDimension(BaseModel):
    dimension_name: str
    weight: float  # e.g. 0.15
    score: float  # 0 to 100 (100 is cleanest, 0 is most indebted)
    debt_hours: float
    description: str


class DebtHotspot(BaseModel):
    id: str
    title: str
    category: str  # 'High Complexity', 'High Churn', 'Cycle', 'Oversized File', 'Oversized Function', 'Clone', 'Rule Violation'
    severity: str  # 'critical', 'high', 'medium', 'low'
    file_path: str
    relative_path: str
    line_number: int
    estimated_hours_to_fix: float
    remediation_rationale: str


class TechnicalDebtReport(BaseModel):
    overall_debt_score: float  # 0 to 100
    debt_grade: str  # 'A', 'B', 'C', 'D', 'F'
    total_debt_hours: float
    total_debt_cost_estimate_usd: float  # @ $85/hr
    maintainability_index: float  # 0 to 100
    dimensions: List[DebtDimension] = Field(default_factory=list)
    top_debt_hotspots: List[DebtHotspot] = Field(default_factory=list)
    recommendations: List[str] = Field(default_factory=list)


class TechnicalDebtEngine:
    """
    Comprehensive Technical Debt Calculation Engine:
    Quantifies architectural, structural, and code-level technical debt
    across 8 core dimensions:
    1. Cyclomatic Complexity
    2. Commit Churn vs Complexity Hotspots
    3. Circular Dependencies
    4. AST Code Clone Density
    5. Architecture Boundary Violations
    6. Oversized Files (>400 LOC)
    7. Oversized Functions (>50 LOC)
    8. Maintainability Index
    """

    def __init__(self, scanner: Any):
        self.scanner = scanner

    def calculate(self) -> TechnicalDebtReport:
        hotspots: List[DebtHotspot] = []
        dim_scores: Dict[str, float] = {}
        dim_hours: Dict[str, float] = {}

        if not self.scanner or not self.scanner.file_asts:
            return TechnicalDebtReport(
                overall_debt_score=100.0,
                debt_grade="A",
                total_debt_hours=0.0,
                total_debt_cost_estimate_usd=0.0,
                maintainability_index=100.0,
                dimensions=[],
                top_debt_hotspots=[],
                recommendations=["Load a repository to analyze technical debt."],
            )

        file_asts = self.scanner.file_asts
        total_files = max(1, len(file_asts))

        # 1. Cyclomatic Complexity Analysis
        all_symbols = (
            list(self.scanner.graph_store.call_builder.symbols_by_id.values())
            if self.scanner.graph_store and self.scanner.graph_store.call_builder
            else []
        )
        high_comp_symbols = [s for s in all_symbols if s.cyclomatic_complexity >= 6]
        avg_comp = (
            sum(s.cyclomatic_complexity for s in all_symbols) / max(1, len(all_symbols))
            if all_symbols
            else 1.0
        )
        comp_score = max(0.0, min(100.0, 100.0 - (len(high_comp_symbols) * 8.0 + (avg_comp - 1.5) * 15.0)))
        comp_hours = round(len(high_comp_symbols) * 3.5, 1)
        dim_scores["Cyclomatic Complexity"] = round(comp_score, 1)
        dim_hours["Cyclomatic Complexity"] = comp_hours

        for s in high_comp_symbols[:6]:
            rel = (
                file_asts[s.file_path].relative_path.replace("\\", "/")
                if s.file_path in file_asts
                else s.file_path
            )
            hotspots.append(
                DebtHotspot(
                    id=f"debt_comp_{s.id}",
                    title=f"High Cyclomatic Complexity in '{s.name}()' (v(G)={s.cyclomatic_complexity})",
                    category="High Complexity",
                    severity="high" if s.cyclomatic_complexity >= 10 else "medium",
                    file_path=s.file_path,
                    relative_path=rel,
                    line_number=s.start_line,
                    estimated_hours_to_fix=3.5,
                    remediation_rationale="Decompose nested control flow and branching into smaller single-responsibility helper functions.",
                )
            )

        # 2. Git Churn Analysis
        churn_items = []
        try:
            churn_report = self.scanner.git_analyzer.analyze()
            churn_items = churn_report.metrics if hasattr(churn_report, "metrics") else []
        except Exception:
            churn_items = []
        critical_churn = [m for m in churn_items if getattr(m, "quadrant", "") == "critical_hotspot"]
        churn_score = max(0.0, min(100.0, 100.0 - len(critical_churn) * 18.0))
        churn_hours = round(len(critical_churn) * 6.0, 1)
        dim_scores["Git Churn & Hotspots"] = round(churn_score, 1)
        dim_hours["Git Churn & Hotspots"] = churn_hours

        # 3. Circular Dependencies
        cycles = getattr(self.scanner.graph_store, "cycles", [])
        cycle_score = max(0.0, 100.0 - len(cycles) * 25.0)
        cycle_hours = round(len(cycles) * 5.0, 1)
        dim_scores["Circular Dependencies"] = round(cycle_score, 1)
        dim_hours["Circular Dependencies"] = cycle_hours

        for idx, cyc in enumerate(cycles[:3]):
            rel_files = [
                file_asts[f].relative_path.replace("\\", "/") if f in file_asts else os.path.basename(f)
                for f in cyc
            ]
            hotspots.append(
                DebtHotspot(
                    id=f"debt_cycle_{idx}",
                    title=f"Circular Import Cycle ({len(cyc)} files): {' -> '.join(rel_files[:3])}",
                    category="Cycle",
                    severity="critical",
                    file_path=cyc[0],
                    relative_path=rel_files[0],
                    line_number=1,
                    estimated_hours_to_fix=5.0,
                    remediation_rationale="Break circular coupling by extracting shared contracts into a separate interface or domain module.",
                )
            )

        # 4. AST Clone Density
        clone_count = 0
        try:
            clone_report = self.scanner.clone_detector.detect_clones()
            clone_count = len(getattr(clone_report, "clone_groups", []))
        except Exception:
            clone_count = 0
        clone_score = max(0.0, 100.0 - clone_count * 12.0)
        clone_hours = round(clone_count * 2.5, 1)
        dim_scores["Code Clone Density"] = round(clone_score, 1)
        dim_hours["Code Clone Density"] = clone_hours

        # 5. Architecture Rule Violations
        rule_violations_count = 0
        try:
            rule_report = self.scanner.rules_engine.evaluate_rules()
            rule_violations_count = len(getattr(rule_report, "violations", []))
        except Exception:
            rule_violations_count = 0
        arch_score = max(0.0, 100.0 - rule_violations_count * 15.0)
        arch_hours = round(rule_violations_count * 4.0, 1)
        dim_scores["Architecture Violations"] = round(arch_score, 1)
        dim_hours["Architecture Violations"] = arch_hours

        # 6. Oversized Files (>400 LOC)
        oversized_files = [ast for ast in file_asts.values() if ast.line_count > 400]
        file_size_score = max(0.0, 100.0 - len(oversized_files) * 16.0)
        file_size_hours = round(len(oversized_files) * 4.0, 1)
        dim_scores["Oversized Files (>400 LOC)"] = round(file_size_score, 1)
        dim_hours["Oversized Files (>400 LOC)"] = file_size_hours

        for ast in oversized_files[:4]:
            rel = ast.relative_path.replace("\\", "/")
            hotspots.append(
                DebtHotspot(
                    id=f"debt_file_{rel}",
                    title=f"Oversized File '{rel}' ({ast.line_count} LOC)",
                    category="Oversized File",
                    severity="medium",
                    file_path=ast.file_path,
                    relative_path=rel,
                    line_number=1,
                    estimated_hours_to_fix=4.0,
                    remediation_rationale=f"Split monolithic file ({ast.line_count} LOC) into cohesive submodules.",
                )
            )

        # 7. Oversized Functions (>50 LOC)
        oversized_fns = [
            s for s in all_symbols
            if s.kind in (SymbolKind.FUNCTION, SymbolKind.METHOD, SymbolKind.ASYNC_FUNCTION)
            and (s.end_line - s.start_line) > 50
        ]
        fn_size_score = max(0.0, 100.0 - len(oversized_fns) * 8.0)
        fn_size_hours = round(len(oversized_fns) * 2.0, 1)
        dim_scores["Oversized Functions (>50 LOC)"] = round(fn_size_score, 1)
        dim_hours["Oversized Functions (>50 LOC)"] = fn_size_hours

        # 8. Maintainability Index (MI)
        # Standard SEI Maintainability Index formula approximation
        total_loc = sum(ast.line_count for ast in file_asts.values())
        avg_loc_per_file = total_loc / total_files
        mi_approx = max(20.0, min(100.0, 171.0 - 5.2 * math.log(max(1, avg_loc_per_file)) - 0.23 * avg_comp * 10 - 16.2 * math.log(max(1, total_files))))
        dim_scores["Maintainability Index"] = round(mi_approx, 1)
        dim_hours["Maintainability Index"] = round(max(0.0, (80.0 - mi_approx) * 0.5), 1)

        # Composite Weighted Score
        weights = {
            "Cyclomatic Complexity": 0.15,
            "Git Churn & Hotspots": 0.15,
            "Circular Dependencies": 0.15,
            "Code Clone Density": 0.10,
            "Architecture Violations": 0.15,
            "Oversized Files (>400 LOC)": 0.10,
            "Oversized Functions (>50 LOC)": 0.10,
            "Maintainability Index": 0.10,
        }

        overall_score = sum(dim_scores[name] * w for name, w in weights.items())
        overall_score = round(max(0.0, min(100.0, overall_score)), 1)
        total_hours = sum(dim_hours.values())

        grade = "A"
        if overall_score < 50:
            grade = "F"
        elif overall_score < 65:
            grade = "D"
        elif overall_score < 78:
            grade = "C"
        elif overall_score < 90:
            grade = "B"

        dimensions_list = [
            DebtDimension(
                dimension_name=k,
                weight=weights[k],
                score=dim_scores[k],
                debt_hours=dim_hours[k],
                description=f"Weighted health of {k} across all workspace files.",
            )
            for k in weights
        ]

        recommendations = [
            f"Prioritize refactoring {len(high_comp_symbols)} high-complexity functions to lower cognitive burden.",
            f"Break {len(cycles)} circular dependency import loops to enable clean modular builds.",
            f"Modularize {len(oversized_files)} oversized files (>400 LOC) to enhance code readability.",
        ]

        return TechnicalDebtReport(
            overall_debt_score=overall_score,
            debt_grade=grade,
            total_debt_hours=round(total_hours, 1),
            total_debt_cost_estimate_usd=round(total_hours * 85.0, 2),
            maintainability_index=round(mi_approx, 1),
            dimensions=dimensions_list,
            top_debt_hotspots=hotspots,
            recommendations=recommendations,
        )
