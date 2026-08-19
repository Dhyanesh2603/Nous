import os
from pathlib import Path
from typing import Dict, List, Optional, Any
from pydantic import BaseModel, Field

from app.analysis.security_scanner import SecurityScanner
from app.analysis.performance_analyzer import PerformanceAnalyzer
from app.analysis.clone_detector import CodeCloneDetector
from app.analysis.git_analytics import GitChurnAnalyzer


class HealthRadarMetrics(BaseModel):
    architecture_score: int
    maintainability_score: int
    security_score: int
    performance_score: int
    testability_score: int


class RefactoringRecommendation(BaseModel):
    priority: str  # 'critical', 'high', 'medium', 'low'
    category: str
    title: str
    impact: str
    remediation: str


class RepositoryHealthScorecard(BaseModel):
    overall_score: int  # 0 - 100
    overall_grade: str  # 'A+', 'A', 'B', 'C', 'D', 'F'
    technical_debt_hours: int
    technical_debt_level: str  # 'Low', 'Moderate', 'High', 'Critical'
    radar: HealthRadarMetrics
    total_loc: int
    total_files: int
    total_symbols: int
    circular_cycles_count: int
    duplicated_lines_count: int
    recommendations: List[RefactoringRecommendation] = Field(default_factory=list)


class HealthScorecardCalculator:
    def __init__(self, root_dir: str, scanner: Any):
        self.root_dir = os.path.abspath(root_dir)
        self.scanner = scanner

    def calculate(self) -> RepositoryHealthScorecard:
        if not self.scanner:
            return self._empty_scorecard()

        # 1. Architecture Score (penalty for cycles, hotspots)
        cycles_count = len(self.scanner.graph_store.cycles)
        hotspots = self.scanner.analyzer.detect_hotspots()
        arch_penalty = (cycles_count * 20) + (len(hotspots) * 5)
        architecture_score = max(0, min(100, 100 - arch_penalty))

        # 2. Maintainability Score (penalty for high complexity, large duplicate clones)
        clones_report = self.scanner.clone_detector.detect_clones()
        dup_lines = clones_report.total_duplicated_lines
        maint_penalty = min(50, dup_lines // 10) + (len(hotspots) * 4)
        maintainability_score = max(0, min(100, 100 - maint_penalty))

        # 3. Security Score
        sec_scanner = SecurityScanner(self.root_dir)
        sec_report = sec_scanner.audit()
        security_score = sec_report.security_score

        # 4. Performance Score
        perf_analyzer = PerformanceAnalyzer(self.root_dir, self.scanner.file_asts)
        perf_report = perf_analyzer.analyze()
        performance_score = perf_report.performance_score

        # 5. Testability Score (estimated based on coupling and complexity)
        testability_score = max(0, min(100, (architecture_score + maintainability_score) // 2))

        # Overall weighted composite score
        overall_score = int(
            (architecture_score * 0.25)
            + (maintainability_score * 0.25)
            + (security_score * 0.25)
            + (performance_score * 0.15)
            + (testability_score * 0.10)
        )

        if overall_score >= 95:
            overall_grade = "A+"
        elif overall_score >= 85:
            overall_grade = "A"
        elif overall_score >= 75:
            overall_grade = "B"
        elif overall_score >= 65:
            overall_grade = "C"
        elif overall_score >= 50:
            overall_grade = "D"
        else:
            overall_grade = "F"

        # Technical debt estimation in engineer hours
        debt_hours = (cycles_count * 8) + (dup_lines // 5) + (sec_report.critical_count * 12) + (sec_report.high_count * 6) + (perf_report.n_plus_one_count * 4)
        if debt_hours <= 10:
            debt_level = "Low"
        elif debt_hours <= 40:
            debt_level = "Moderate"
        elif debt_hours <= 100:
            debt_level = "High"
        else:
            debt_level = "Critical"

        # Generate top refactoring recommendations
        recommendations = []
        if cycles_count > 0:
            recommendations.append(
                RefactoringRecommendation(
                    priority="critical",
                    category="Architecture",
                    title=f"Resolve {cycles_count} Circular Dependency Cycle(s)",
                    impact="Circular dependencies create tight coupling, hinder independent testing, and cause initialization bugs.",
                    remediation="Extract shared types/interfaces into a separate domain/types package or use dependency inversion.",
                )
            )

        if sec_report.critical_count > 0:
            recommendations.append(
                RefactoringRecommendation(
                    priority="critical",
                    category="Security",
                    title=f"Remediate {sec_report.critical_count} Critical Hardcoded Credentials",
                    impact="Prevents credential exposure and unauthorized external access.",
                    remediation="Revoke exposed keys and migrate to environment variables or key vault manager.",
                )
            )

        if perf_report.n_plus_one_count > 0:
            recommendations.append(
                RefactoringRecommendation(
                    priority="high",
                    category="Performance",
                    title=f"Batch {perf_report.n_plus_one_count} Potential N+1 Database Queries",
                    impact="Eliminates exponential roundtrip database latencies during high concurrency.",
                    remediation="Replace loop-based individual queries with IN filters or SQL JOIN queries.",
                )
            )

        if dup_lines > 50:
            recommendations.append(
                RefactoringRecommendation(
                    priority="medium",
                    category="Maintainability",
                    title=f"Refactor {dup_lines} Lines of Duplicate Logic",
                    impact="Reduces bug propagation and maintenance burden.",
                    remediation="Consolidate duplicate logic into reusable utility methods or shared services.",
                )
            )

        total_loc = sum(ast.line_count for ast in self.scanner.file_asts.values())
        total_files = len(self.scanner.file_asts)
        total_symbols = len(self.scanner.search_engine.symbols)

        return RepositoryHealthScorecard(
            overall_score=overall_score,
            overall_grade=overall_grade,
            technical_debt_hours=debt_hours,
            technical_debt_level=debt_level,
            radar=HealthRadarMetrics(
                architecture_score=architecture_score,
                maintainability_score=maintainability_score,
                security_score=security_score,
                performance_score=performance_score,
                testability_score=testability_score,
            ),
            total_loc=total_loc,
            total_files=total_files,
            total_symbols=total_symbols,
            circular_cycles_count=cycles_count,
            duplicated_lines_count=dup_lines,
            recommendations=recommendations,
        )

    def _empty_scorecard(self) -> RepositoryHealthScorecard:
        return RepositoryHealthScorecard(
            overall_score=100,
            overall_grade="A+",
            technical_debt_hours=0,
            technical_debt_level="Low",
            radar=HealthRadarMetrics(
                architecture_score=100,
                maintainability_score=100,
                security_score=100,
                performance_score=100,
                testability_score=100,
            ),
            total_loc=0,
            total_files=0,
            total_symbols=0,
            circular_cycles_count=0,
            duplicated_lines_count=0,
            recommendations=[],
        )
