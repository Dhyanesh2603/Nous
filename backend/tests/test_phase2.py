import os
import pytest
from app.scanner import RepoScanner
from app.analysis.architecture_detector import ArchitectureDetector
from app.analysis.architecture_drift import ArchitectureDriftAnalyzer
from app.analysis.tech_debt_engine import TechnicalDebtEngine
from app.analysis.module_health import ModuleHealthAnalyzer
from app.analysis.refactoring_advisor import RefactoringAdvisor


@pytest.fixture
def python_scanner():
    fixture_path = os.path.abspath(r"D:\Nous\backend\tests\fixtures\python_project")
    scanner = RepoScanner(fixture_path)
    scanner.scan_and_index()
    return scanner


def test_phase2_architecture_detector(python_scanner):
    detector = ArchitectureDetector(
        graph_store=python_scanner.graph_store,
        fact_store=python_scanner.fact_store,
        file_asts=python_scanner.file_asts,
        root_dir=python_scanner.root_dir,
    )
    report = detector.analyze()
    assert report is not None
    assert report.primary_style is not None
    assert 0.0 <= report.primary_confidence <= 1.0
    assert len(report.detected_styles) >= 1
    assert len(report.architectural_layers) >= 1
    assert isinstance(report.recommendations, list)


def test_phase2_architecture_drift(python_scanner):
    analyzer = ArchitectureDriftAnalyzer(root_dir=python_scanner.root_dir)
    report = analyzer.analyze(max_samples=6)
    assert report is not None
    assert report.total_checkpoints >= 1
    assert len(report.checkpoints) == report.total_checkpoints
    assert report.initial_coupling > 0
    assert report.current_coupling > 0
    assert isinstance(report.degradation_alerts, list)


def test_phase2_technical_debt_engine(python_scanner):
    engine = TechnicalDebtEngine(scanner=python_scanner)
    report = engine.calculate()
    assert report is not None
    assert 0.0 <= report.overall_debt_score <= 100.0
    assert report.debt_grade in ("A", "B", "C", "D", "F")
    assert report.total_debt_hours >= 0.0
    assert len(report.dimensions) == 8
    assert isinstance(report.top_debt_hotspots, list)
    assert isinstance(report.recommendations, list)


def test_phase2_module_health_analyzer(python_scanner):
    analyzer = ModuleHealthAnalyzer(
        graph_store=python_scanner.graph_store,
        fact_store=python_scanner.fact_store,
        file_asts=python_scanner.file_asts,
    )
    report = analyzer.analyze()
    assert report is not None
    assert 0.0 <= report.overall_health_score <= 100.0
    assert 0.0 <= report.average_cohesion <= 1.0
    assert 0.0 <= report.average_instability <= 1.0
    if report.modules:
        mod = report.modules[0]
        assert mod.name != ""
        assert mod.maintainability_rating in ("A", "B", "C", "D", "F")
        assert 0.0 <= mod.test_coverage_pct <= 100.0
        assert 0.0 <= mod.documentation_coverage_pct <= 100.0


def test_phase2_refactoring_advisor(python_scanner):
    advisor = RefactoringAdvisor(scanner=python_scanner)
    report = advisor.analyze()
    assert report is not None
    assert report.total_recommendations >= 0
    assert report.total_estimated_effort_hours >= 0.0
    assert isinstance(report.recommendations, list)
    for rec in report.recommendations:
        assert rec.priority in ("critical", "high", "medium", "low")
        assert rec.estimated_effort_hours > 0
        assert rec.suggested_transformation != ""
