import os
import pytest
from app.scanner import RepoScanner
from app.analysis.time_machine import TimeMachineEngine
from app.analysis.execution_playback import ExecutionPlaybackEngine
from app.analysis.knowledge_graph import KnowledgeGraphEngine
from app.analysis.migration_planner import MigrationPlannerEngine


@pytest.fixture
def python_scanner():
    fixture_path = os.path.abspath(r"D:\Nous\backend\tests\fixtures\python_project")
    scanner = RepoScanner(fixture_path)
    scanner.scan_and_index()
    return scanner


def test_phase4_time_machine(python_scanner):
    engine = TimeMachineEngine(root_dir=python_scanner.root_dir)
    report = engine.get_frames(max_frames=10)
    assert report is not None
    assert report.total_frames >= 1
    assert len(report.frames) == report.total_frames
    assert report.total_authors >= 1
    assert report.frames[0].short_hash != ""
    assert report.frames[0].cumulative_loc > 0


def test_phase4_execution_playback(python_scanner):
    engine = ExecutionPlaybackEngine(scanner=python_scanner)
    candidates = engine.get_entry_candidates()
    assert isinstance(candidates, list)

    # Test trace execution
    entry_name = candidates[0].name if candidates else "authenticate_user()"
    trace = engine.trace_execution(entry_name)
    assert trace is not None
    assert trace.total_steps >= 1
    assert len(trace.steps) == trace.total_steps
    assert trace.steps[0].action_type == "function_entry"


def test_phase4_knowledge_graph(python_scanner):
    engine = KnowledgeGraphEngine(scanner=python_scanner)
    report = engine.build_graph()
    assert report is not None
    assert report.total_nodes >= 1
    assert report.total_edges >= 0
    assert "file" in report.entity_counts
    assert "function" in report.entity_counts


def test_phase4_migration_planner(python_scanner):
    engine = MigrationPlannerEngine(scanner=python_scanner)
    report = engine.generate_plans()
    assert report is not None
    assert report.total_plans >= 3
    assert len(report.plans) == report.total_plans
    top_plan = report.plans[0]
    assert top_plan.readiness_score > 0.0
    assert len(top_plan.checklist) >= 1
    assert len(top_plan.benefits) >= 1
