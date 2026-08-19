import os
import pytest
from app.analysis.timeline_engine import TimelineEngine
from app.analysis.api_lifecycle import ApiLifecycleAnalyzer
from app.analysis.dependency_analyzer import DependencyAnalyzer
from app.analysis.repo_diff import RepoDiffEngine
from app.analysis.code_reviewer import CodeReviewerEngine
from app.scanner import RepoScanner


def test_timeline_engine():
    fixture_dir = r"D:\Nous\backend\tests\fixtures\python_project"
    engine = TimelineEngine(fixture_dir)
    report = engine.analyze_timeline(max_commits=10)
    assert report.total_commits >= 1
    assert len(report.timeline_snapshots) >= 1
    assert len(report.feature_milestones) >= 1


def test_api_lifecycle_and_code_review():
    fixture_dir = r"D:\Nous\backend\tests\fixtures\python_project"
    scanner = RepoScanner(fixture_dir)
    scanner.scan_and_index()

    # 1. API Lifecycle Analyzer
    api_analyzer = ApiLifecycleAnalyzer(scanner)
    catalog = api_analyzer.build_catalog()
    assert catalog.total_endpoints >= 0

    # 2. Code Reviewer Engine
    reviewer = CodeReviewerEngine(scanner)
    review = reviewer.run_review()
    assert review.review_status in ("Approved", "Needs Changes", "Approved with Comments")
    assert review.maintainability_rating in ("A", "B", "C", "D")
    assert len(review.suggested_test_suites) >= 1


def test_dependency_analyzer(tmp_path):
    pkg_file = tmp_path / "package.json"
    pkg_file.write_text('{"dependencies": {"react": "^18.2.0", "axios": "^1.4.0"}, "devDependencies": {"typescript": "^5.0.0"}}')

    analyzer = DependencyAnalyzer(str(tmp_path))
    report = analyzer.analyze()
    assert report.total_dependencies == 3
    assert report.direct_dependencies_count == 2
    assert report.dev_dependencies_count == 1
    assert any(d.name == "react" for d in report.dependencies)


def test_repo_diff_engine():
    fixture_dir = r"D:\Nous\backend\tests\fixtures\python_project"
    engine = RepoDiffEngine(fixture_dir)
    diff = engine.compare()
    assert diff.base_ref == "HEAD~1"
    assert diff.target_ref == "HEAD"
    assert len(diff.architectural_drift_summary) > 10
