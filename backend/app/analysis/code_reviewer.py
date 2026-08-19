import os
import re
from pathlib import Path
from typing import Dict, List, Optional, Any
from pydantic import BaseModel, Field

from app.scanner import RepoScanner


class CodeReviewFinding(BaseModel):
    id: str
    rule_name: str
    category: str  # 'Complexity', 'Code Smell', 'Maintainability', 'Technical Debt', 'Test Coverage'
    severity: str  # 'critical', 'warning', 'info'
    file_path: str
    relative_path: str
    line_number: int
    matched_code: str
    review_comment: str
    suggested_refactor: str


class CodeReviewReport(BaseModel):
    review_status: str  # 'Approved', 'Needs Changes', 'Critical Issues'
    maintainability_rating: str  # 'A', 'B', 'C', 'D'
    total_findings: int
    critical_findings_count: int
    warning_findings_count: int
    info_findings_count: int
    suggested_test_suites: List[str] = Field(default_factory=list)
    findings: List[CodeReviewFinding] = Field(default_factory=list)


class CodeReviewerEngine:
    def __init__(self, scanner: Optional[RepoScanner]):
        self.scanner = scanner

    def run_review(self) -> CodeReviewReport:
        if not self.scanner:
            return CodeReviewReport(
                review_status="Approved",
                maintainability_rating="A",
                total_findings=0,
                critical_findings_count=0,
                warning_findings_count=0,
                info_findings_count=0,
            )

        findings: List[CodeReviewFinding] = []
        root_dir = self.scanner.root_dir

        for file_path, ast in self.scanner.file_asts.items():
            rel = ast.relative_path
            
            # Check 1: Overly complex or large functions (> 50 lines)
            for sym in ast.symbols:
                if sym.kind in ("function", "method"):
                    lines_span = sym.end_line - sym.start_line
                    if lines_span > 60:
                        findings.append(
                            CodeReviewFinding(
                                id=f"CR_{len(findings)+1}",
                                rule_name="Function Exceeds 60 Lines (Single Responsibility)",
                                category="Complexity",
                                severity="warning",
                                file_path=file_path,
                                relative_path=rel,
                                line_number=sym.start_line,
                                matched_code=f"def {sym.name}(...) -> {lines_span} lines",
                                review_comment=f"`{sym.name}` is {lines_span} lines long, indicating mixed responsibilities.",
                                suggested_refactor="Extract secondary helper methods or domain value objects.",
                            )
                        )

            # Check 2: Raw file scanning for TODO/FIXME and Magic Numbers
            try:
                with open(file_path, "r", encoding="utf-8", errors="replace") as f:
                    for line_idx, line in enumerate(f, 1):
                        stripped = line.strip()
                        if "TODO" in stripped or "FIXME" in stripped:
                            findings.append(
                                CodeReviewFinding(
                                    id=f"CR_{len(findings)+1}",
                                    rule_name="Unresolved Technical Debt Marker",
                                    category="Technical Debt",
                                    severity="info",
                                    file_path=file_path,
                                    relative_path=rel,
                                    line_number=line_idx,
                                    matched_code=stripped[:120],
                                    review_comment="Unresolved TODO/FIXME annotation in production code path.",
                                    suggested_refactor="Track in backlog or resolve before merge.",
                                )
                            )
            except Exception:
                pass

        critical_count = sum(1 for f in findings if f.severity == "critical")
        warning_count = sum(1 for f in findings if f.severity == "warning")
        info_count = sum(1 for f in findings if f.severity == "info")

        if critical_count > 0:
            status = "Needs Changes"
            rating = "D"
        elif warning_count > 5:
            status = "Needs Changes"
            rating = "C"
        elif warning_count > 0:
            status = "Approved with Comments"
            rating = "B"
        else:
            status = "Approved"
            rating = "A"

        # Suggested test plan
        test_suites = ["pytest tests -v", "npm run test -- --coverage"]
        if self.scanner.fact_store.routes:
            test_suites.append(f"Execute HTTP smoke tests on {len(self.scanner.fact_store.routes)} detected REST endpoints")

        return CodeReviewReport(
            review_status=status,
            maintainability_rating=rating,
            total_findings=len(findings),
            critical_findings_count=critical_count,
            warning_findings_count=warning_count,
            info_findings_count=info_count,
            suggested_test_suites=test_suites,
            findings=findings,
        )
