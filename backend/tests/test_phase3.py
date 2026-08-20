import os
import pytest
from app.scanner import RepoScanner
from app.analysis.doc_generator import DocGenerator
from app.analysis.pr_analyzer import PRImpactAnalyzer
from app.analysis.nl_search import NaturalLanguageSearchEngine
from app.analysis.test_advisor import TestAdvisor


@pytest.fixture
def python_scanner():
    fixture_path = os.path.abspath(r"D:\Nous\backend\tests\fixtures\python_project")
    scanner = RepoScanner(fixture_path)
    scanner.scan_and_index()
    return scanner


def test_phase3_doc_generator(python_scanner):
    generator = DocGenerator(scanner=python_scanner)
    report = generator.generate()
    assert report is not None
    assert report.total_sections >= 4
    assert len(report.sections) == report.total_sections
    for sec in report.sections:
        assert sec.title != ""
        assert len(sec.markdown_content) > 20


def test_phase3_pr_analyzer(python_scanner):
    analyzer = PRImpactAnalyzer(scanner=python_scanner)
    report = analyzer.analyze()
    assert report is not None
    assert 0.0 <= report.estimated_blast_radius_score <= 100.0
    assert report.risk_level in ("Low", "Moderate", "High", "Critical")
    assert len(report.changed_files) >= 1
    assert len(report.suggested_reviewers) >= 1
    assert len(report.safety_checklist) >= 1


def test_phase3_natural_language_search(python_scanner):
    engine = NaturalLanguageSearchEngine(scanner=python_scanner)
    report = engine.search("user authentication and token validation")
    assert report is not None
    assert report.query == "user authentication and token validation"
    assert report.detected_intent == "Authentication & Security"
    assert report.total_results >= 1
    top_result = report.results[0]
    assert top_result.symbol_name != ""
    assert top_result.match_score > 0


def test_phase3_test_advisor(python_scanner):
    advisor = TestAdvisor(scanner=python_scanner)
    report = advisor.analyze()
    assert report is not None
    assert report.total_untested_functions >= 1
    assert len(report.untested_candidates) >= 1
    cand = report.untested_candidates[0]
    assert cand.symbol_name != ""
    assert cand.risk_score >= 0.0
    assert "pytest" in cand.suggested_test_stub or "def test_" in cand.suggested_test_stub
