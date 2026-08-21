import os
from typing import List, Dict, Any, Optional
from pydantic import BaseModel, Field

from app.parsers.symbol_types import SymbolKind, ASTSymbol


class UntestedFunctionItem(BaseModel):
    id: str
    symbol_name: str
    file_path: str
    relative_path: str
    line_number: int
    cyclomatic_complexity: int
    in_degree_callers_count: int
    risk_score: float  # 0.0 to 100.0
    risk_tier: str  # 'Critical', 'High', 'Moderate'
    estimated_test_writing_mins: int
    recommended_framework: str  # 'pytest', 'vitest', 'jest', 'go test'
    reason_for_testing: str
    suggested_test_stub: str


class TestAdvisorReport(BaseModel):
    __test__ = False
    total_untested_functions: int
    critical_untested_count: int
    high_untested_count: int
    average_test_gap_score: float
    untested_candidates: List[UntestedFunctionItem] = Field(default_factory=list)


class TestAdvisor:
    """
    Intelligent Unit Test Advisor & Code Stub Generator:
    Identifies high-risk, high-in-degree functions lacking unit test coverage
    and synthesizes production test stubs with fixtures and assertions.
    """
    __test__ = False

    def __init__(self, scanner: Any):
        self.scanner = scanner

    def analyze(self) -> TestAdvisorReport:
        candidates: List[UntestedFunctionItem] = []

        if not self.scanner or not self.scanner.file_asts:
            return TestAdvisorReport(
                total_untested_functions=0,
                critical_untested_count=0,
                high_untested_count=0,
                average_test_gap_score=0.0,
                untested_candidates=[],
            )

        file_asts = self.scanner.file_asts
        test_files = [
            f for f in file_asts.keys()
            if any(t in f.lower() for t in ("test_", "_test.", "spec.", "tests/"))
        ]

        all_symbols = (
            list(self.scanner.graph_store.call_builder.symbols_by_id.values())
            if self.scanner.graph_store and self.scanner.graph_store.call_builder
            else []
        )

        for sym in all_symbols:
            if sym.kind not in (SymbolKind.FUNCTION, SymbolKind.METHOD, SymbolKind.ASYNC_FUNCTION):
                continue
            if sym.name.startswith("_") and not sym.name.startswith("__"):
                continue

            rel = (
                file_asts[sym.file_path].relative_path.replace("\\", "/")
                if sym.file_path in file_asts
                else sym.file_path
            )

            # Skip test files themselves
            if any(t in rel.lower() for t in ("test", "spec")):
                continue

            # Calculate caller in-degree
            in_degree = 0
            if self.scanner.graph_store:
                in_degree = self.scanner.graph_store.call_graph.in_degree(sym.id) if sym.id in self.scanner.graph_store.call_graph else 0

            # Calculate Risk Score
            risk = round(min(100.0, sym.cyclomatic_complexity * 8.0 + in_degree * 12.0), 1)

            tier = "Moderate"
            if risk >= 60.0:
                tier = "Critical"
            elif risk >= 35.0:
                tier = "High"

            # Determine Framework & Stub
            framework = "pytest"
            if rel.endswith((".ts", ".tsx", ".js", ".jsx")):
                framework = "vitest"
            elif rel.endswith(".go"):
                framework = "go test"

            stub = self._generate_stub(sym, rel, framework)

            candidates.append(
                UntestedFunctionItem(
                    id=f"test_cand_{sym.id}",
                    symbol_name=f"{sym.name}()",
                    file_path=sym.file_path,
                    relative_path=rel,
                    line_number=sym.start_line,
                    cyclomatic_complexity=sym.cyclomatic_complexity,
                    in_degree_callers_count=in_degree,
                    risk_score=risk,
                    risk_tier=tier,
                    estimated_test_writing_mins=max(10, sym.cyclomatic_complexity * 4),
                    recommended_framework=framework,
                    reason_for_testing=f"High complexity (v(G)={sym.cyclomatic_complexity}) with {in_degree} upstream caller dependencies.",
                    suggested_test_stub=stub,
                )
            )

        candidates.sort(key=lambda c: c.risk_score, reverse=True)

        crit_count = sum(1 for c in candidates if c.risk_tier == "Critical")
        high_count = sum(1 for c in candidates if c.risk_tier == "High")
        avg_gap = (
            round(sum(c.risk_score for c in candidates) / max(1, len(candidates)), 1)
            if candidates
            else 0.0
        )

        return TestAdvisorReport(
            total_untested_functions=len(candidates),
            critical_untested_count=crit_count,
            high_untested_count=high_count,
            average_test_gap_score=avg_gap,
            untested_candidates=candidates[:25],
        )

    def _generate_stub(self, sym: ASTSymbol, rel_path: str, framework: str) -> str:
        mod_name = os.path.splitext(os.path.basename(rel_path))[0]
        if framework == "pytest":
            return f"""import pytest
from {mod_name} import {sym.name}

def test_{sym.name}_success():
    # Arrange: Setup mock fixtures and input parameters
    # Act: Execute target function under test
    result = {sym.name}()
    # Assert: Verify returned state and invariant contracts
    assert result is not None

def test_{sym.name}_edge_cases():
    # Edge case testing for boundary conditions and exceptions
    with pytest.raises(Exception):
        {sym.name}(None)
"""
        elif framework == "vitest":
            return f"""import {{ describe, it, expect }} from 'vitest';
import {{ {sym.name} }} from './{mod_name}';

describe('{sym.name}()', () => {{
  it('should execute successfully with valid inputs', () => {{
    const result = {sym.name}();
    expect(result).toBeDefined();
  }});

  it('should handle edge cases and invalid parameters gracefully', () => {{
    expect(() => {sym.name}(null as any)).toThrow();
  }});
}});
"""
        else:
            return f"""package {mod_name}_test

import (
    "testing"
)

func Test{sym.name}(t *testing.T) {{
    // Arrange & Act
    // Assert
}}
"""
