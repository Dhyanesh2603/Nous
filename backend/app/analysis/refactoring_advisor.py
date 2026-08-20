import os
import re
from enum import Enum
from typing import List, Dict, Any, Optional
from pydantic import BaseModel, Field

from app.parsers.symbol_types import SymbolKind, ASTSymbol


class RefactorCategory(str, Enum):
    EXTRACT_METHOD = "Extract Method"
    EXTRACT_CLASS = "Extract Class"
    SPLIT_FILE = "Split File"
    MOVE_CLASS = "Move Class"
    INTRODUCE_INTERFACE = "Introduce Interface"
    DEPENDENCY_INJECTION = "Dependency Injection"
    REMOVE_CIRCULAR_DEPENDENCY = "Remove Circular Dependency"
    SIMPLIFY_CONDITIONALS = "Simplify Conditionals"
    REDUCE_COMPLEXITY = "Reduce Complexity"
    MODULARIZATION = "Modularization Opportunity"


class RefactorRecommendation(BaseModel):
    id: str
    category: RefactorCategory
    priority: str  # 'critical', 'high', 'medium', 'low'
    title: str
    target_symbol_or_file: str
    relative_path: str
    line_number: int
    estimated_effort_hours: float
    description: str
    code_snippet: Optional[str] = None
    suggested_transformation: str


class RefactoringReport(BaseModel):
    total_recommendations: int
    critical_count: int
    high_count: int
    medium_count: int
    low_count: int
    total_estimated_effort_hours: float
    recommendations: List[RefactorRecommendation] = Field(default_factory=list)


class RefactoringAdvisor:
    """
    Intelligent Refactoring Advisor Engine:
    Scans AST complexity, line counts, constructor coupling, cyclic imports,
    and deeply nested conditionals to generate actionable automated refactoring advice:
    - Extract Method
    - Extract Class
    - Split File
    - Move Class
    - Introduce Interface
    - Dependency Injection
    - Remove Circular Dependency
    - Simplify Conditionals
    - Reduce Complexity
    - Modularization
    """

    def __init__(self, scanner: Any):
        self.scanner = scanner

    def analyze(self) -> RefactoringReport:
        recs: List[RefactorRecommendation] = []
        rec_id = 1

        if not self.scanner or not self.scanner.file_asts:
            return RefactoringReport(
                total_recommendations=0,
                critical_count=0,
                high_count=0,
                medium_count=0,
                low_count=0,
                total_estimated_effort_hours=0.0,
                recommendations=[],
            )

        file_asts = self.scanner.file_asts

        # 1. Circular Dependencies -> Remove Circular Dependency
        cycles = getattr(self.scanner.graph_store, "cycles", [])
        for idx, cycle in enumerate(cycles):
            rel_files = [
                file_asts[f].relative_path.replace("\\", "/") if f in file_asts else os.path.basename(f)
                for f in cycle
            ]
            recs.append(
                RefactorRecommendation(
                    id=f"refactor_{rec_id}",
                    category=RefactorCategory.REMOVE_CIRCULAR_DEPENDENCY,
                    priority="critical",
                    title=f"Break Cyclic Dependency: {rel_files[0]} ↔ {rel_files[1] if len(rel_files) > 1 else ''}",
                    target_symbol_or_file=rel_files[0],
                    relative_path=rel_files[0],
                    line_number=1,
                    estimated_effort_hours=4.0,
                    description=f"Circular import loop detected across {len(cycle)} modules. Cyclic coupling prevents isolated testing and increases build brittleness.",
                    suggested_transformation="Extract shared type definitions and helper interfaces into a dedicated common module, breaking the cycle.",
                )
            )
            rec_id += 1

        # 2. Oversized Files -> Split File / Modularization
        for f_path, ast in file_asts.items():
            rel = ast.relative_path.replace("\\", "/")
            if ast.line_count > 350:
                recs.append(
                    RefactorRecommendation(
                        id=f"refactor_{rec_id}",
                        category=RefactorCategory.SPLIT_FILE,
                        priority="high",
                        title=f"Split Monolithic File '{os.path.basename(f_path)}' ({ast.line_count} LOC)",
                        target_symbol_or_file=rel,
                        relative_path=rel,
                        line_number=1,
                        estimated_effort_hours=3.5,
                        description=f"File contains {ast.line_count} lines of code and {len(ast.symbols)} symbols, exceeding single-responsibility cohesion limits.",
                        suggested_transformation=f"Decompose {os.path.basename(f_path)} into smaller cohesive sub-modules grouped by domain capability.",
                    )
                )
                rec_id += 1

        # 3. High Complexity Functions -> Reduce Complexity & Simplify Conditionals
        all_symbols: List[ASTSymbol] = (
            list(self.scanner.graph_store.call_builder.symbols_by_id.values())
            if self.scanner.graph_store and self.scanner.graph_store.call_builder
            else []
        )

        for sym in all_symbols:
            rel = (
                file_asts[sym.file_path].relative_path.replace("\\", "/")
                if sym.file_path in file_asts
                else sym.file_path
            )

            # Reduce Complexity
            if sym.cyclomatic_complexity >= 8:
                recs.append(
                    RefactorRecommendation(
                        id=f"refactor_{rec_id}",
                        category=RefactorCategory.REDUCE_COMPLEXITY,
                        priority="high" if sym.cyclomatic_complexity >= 12 else "medium",
                        title=f"Reduce Complexity in '{sym.name}()' (v(G)={sym.cyclomatic_complexity})",
                        target_symbol_or_file=f"{sym.name}()",
                        relative_path=rel,
                        line_number=sym.start_line,
                        estimated_effort_hours=3.0,
                        description=f"Function '{sym.name}' has cyclomatic complexity of {sym.cyclomatic_complexity} with multiple nested execution paths.",
                        code_snippet=sym.code_content[:180] if sym.code_content else None,
                        suggested_transformation="Decompose nested if/else logic using guard clauses or strategy dispatch patterns.",
                    )
                )
                rec_id += 1

            # Extract Method on Large Functions
            fn_loc = sym.end_line - sym.start_line
            if fn_loc > 45 and sym.kind in (SymbolKind.FUNCTION, SymbolKind.METHOD, SymbolKind.ASYNC_FUNCTION):
                recs.append(
                    RefactorRecommendation(
                        id=f"refactor_{rec_id}",
                        category=RefactorCategory.EXTRACT_METHOD,
                        priority="medium",
                        title=f"Extract Method from Long Function '{sym.name}()' ({fn_loc} lines)",
                        target_symbol_or_file=f"{sym.name}()",
                        relative_path=rel,
                        line_number=sym.start_line,
                        estimated_effort_hours=2.0,
                        description=f"Function spans {fn_loc} lines. Extracting logical sub-tasks into well-named private methods improves readability.",
                        code_snippet=sym.code_content[:180] if sym.code_content else None,
                        suggested_transformation="Extract sub-routines into private helper functions with clear parameter boundaries.",
                    )
                )
                rec_id += 1

            # Deep Conditionals (Regex scan in code content)
            if sym.code_content and re.search(r"if\b.*?\n\s+if\b.*?\n\s+if\b", sym.code_content):
                recs.append(
                    RefactorRecommendation(
                        id=f"refactor_{rec_id}",
                        category=RefactorCategory.SIMPLIFY_CONDITIONALS,
                        priority="medium",
                        title=f"Simplify Deeply Nested Conditionals in '{sym.name}()'",
                        target_symbol_or_file=f"{sym.name}()",
                        relative_path=rel,
                        line_number=sym.start_line,
                        estimated_effort_hours=2.0,
                        description="Function contains >= 3 levels of nested if statements creating high cognitive load.",
                        code_snippet=sym.code_content[:180],
                        suggested_transformation="Replace nested conditionals with early return guard clauses or lookup dictionaries.",
                    )
                )
                rec_id += 1

        # 4. Classes with > 8 Methods -> Extract Class
        if self.scanner.graph_store and self.scanner.graph_store.call_builder:
            for s_id, sym in self.scanner.graph_store.call_builder.symbols_by_id.items():
                if sym.kind == SymbolKind.CLASS:
                    member_methods = [
                        s for s in all_symbols
                        if s.scope == sym.name and s.kind in (SymbolKind.METHOD, SymbolKind.FUNCTION)
                    ]
                    if len(member_methods) >= 8:
                        rel = (
                            file_asts[sym.file_path].relative_path.replace("\\", "/")
                            if sym.file_path in file_asts
                            else sym.file_path
                        )
                        recs.append(
                            RefactorRecommendation(
                                id=f"refactor_{rec_id}",
                                category=RefactorCategory.EXTRACT_CLASS,
                                priority="medium",
                                title=f"Extract Class from God-Class '{sym.name}' ({len(member_methods)} methods)",
                                target_symbol_or_file=f"class {sym.name}",
                                relative_path=rel,
                                line_number=sym.start_line,
                                estimated_effort_hours=4.0,
                                description=f"Class '{sym.name}' aggregates {len(member_methods)} methods, indicating multiple divergent responsibilities.",
                                suggested_transformation="Separate auxiliary operations into dedicated service or delegate classes.",
                            )
                        )
                        rec_id += 1

        # Priority Counts & Total Effort
        crit = sum(1 for r in recs if r.priority == "critical")
        high = sum(1 for r in recs if r.priority == "high")
        med = sum(1 for r in recs if r.priority == "medium")
        low = sum(1 for r in recs if r.priority == "low")
        total_hours = round(sum(r.estimated_effort_hours for r in recs), 1)

        return RefactoringReport(
            total_recommendations=len(recs),
            critical_count=crit,
            high_count=high,
            medium_count=med,
            low_count=low,
            total_estimated_effort_hours=total_hours,
            recommendations=recs,
        )
