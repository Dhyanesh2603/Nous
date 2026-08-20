import os
import pytest
from app.scanner import RepoScanner
from app.analysis.dead_code_detector import DeadCodeDetector
from app.analysis.impact_simulator import ImpactSimulator, SimulationType
from app.analysis.data_flow import DataFlowAnalyzer, FlowStepType
from app.analysis.api_mapper import ApiDependencyMapper
from app.analysis.security_scanner import SecurityScanner


@pytest.fixture
def python_scanner():
    fixture_path = os.path.abspath(r"D:\Nous\backend\tests\fixtures\python_project")
    scanner = RepoScanner(fixture_path)
    scanner.scan_and_index()
    return scanner


def test_phase1_dead_code_detector(python_scanner):
    detector = DeadCodeDetector(
        graph_store=python_scanner.graph_store,
        fact_store=python_scanner.fact_store,
    )
    report = detector.analyze()
    assert report is not None
    assert report.total_dead_items >= 1
    assert len(report.items) == report.total_dead_items

    # Verify confidence scores are between 0.0 and 1.0
    for item in report.items:
        assert 0.0 <= item.confidence_score <= 1.0
        assert item.category in (
            "unused_function",
            "unused_class",
            "unused_file",
            "unused_export",
            "unreachable_code",
        )
        assert item.suggested_remediation != ""


def test_phase1_impact_simulator(python_scanner):
    simulator = ImpactSimulator(
        graph_store=python_scanner.graph_store,
        fact_store=python_scanner.fact_store,
    )
    targets = simulator.get_simulation_targets()
    assert "functions" in targets
    assert "classes" in targets
    assert "files" in targets
    assert "modules" in targets

    # Simulate function deletion if symbols exist
    if targets["functions"]:
        target_fn = targets["functions"][0]["id"]
        result = simulator.simulate(
            target_id=target_fn,
            simulation_type=SimulationType.FUNCTION_DELETE,
        )
        assert result.target_id == target_fn
        assert result.simulation_type == SimulationType.FUNCTION_DELETE
        assert 0.0 <= result.estimated_risk_score <= 100.0
        assert result.risk_level in ("Low", "Moderate", "High", "Critical")
        assert len(result.subgraph_nodes) >= 1

    # Simulate function rename
    if targets["functions"]:
        target_fn = targets["functions"][0]["id"]
        result_rename = simulator.simulate(
            target_id=target_fn,
            simulation_type=SimulationType.FUNCTION_RENAME,
            new_name_or_path="renamed_function",
        )
        assert result_rename.simulation_type == SimulationType.FUNCTION_RENAME


def test_phase1_data_flow_analyzer(python_scanner):
    analyzer = DataFlowAnalyzer(
        graph_store=python_scanner.graph_store,
        fact_store=python_scanner.fact_store,
    )
    report = analyzer.analyze()
    assert report is not None
    assert isinstance(report.chains, list)
    assert len(report.available_entry_points) >= 0

    if report.chains:
        chain = report.chains[0]
        assert chain.chain_id != ""
        assert len(chain.steps) >= 1
        for step in chain.steps:
            assert step.step_index >= 1
            assert isinstance(step.step_type, FlowStepType)


def test_phase1_api_mapper(python_scanner):
    mapper = ApiDependencyMapper(
        fact_store=python_scanner.fact_store,
        file_asts=python_scanner.file_asts,
        root_dir=python_scanner.root_dir,
    )
    report = mapper.analyze()
    assert report is not None
    assert "REST" in report.protocol_distribution
    assert isinstance(report.endpoints, list)
    assert isinstance(report.client_calls, list)
    assert isinstance(report.graph_nodes, list)


def test_phase1_advanced_security_scanner(tmp_path):
    # Create test file with multiple vulnerability patterns
    vuln_file = tmp_path / "vulnerable_service.py"
    vuln_file.write_text("""
import os
import subprocess
import pickle
import yaml
import jwt

# 1. Secret
AWS_KEY = "AKIA" + "1234567890ABCDEF"

# 2. SQL Injection
def get_user(user_id):
    query = f"SELECT * FROM users WHERE id = {user_id}"
    return db.execute(query)

# 3. Command Injection
def run_backup(path):
    os.system(f"tar -czf backup.tar.gz {path}")

# 4. Unsafe eval
def calc(expr):
    return eval(expr)

# 5. Insecure deserialization
def load_data(raw):
    return pickle.loads(raw)

# 6. Weak JWT
def make_token():
    return jwt.decode(tok, algorithms=['none'])

# 7. Unsafe subprocess
def ping(host):
    subprocess.call(f"ping {host}", shell=True)
""", encoding="utf-8")

    scanner = SecurityScanner(str(tmp_path))
    report = scanner.scan()

    assert report.total_issues >= 5
    assert report.security_score < 100
    categories = [v.category for v in report.vulnerabilities]
    assert "SQL Injection" in categories
    assert "Command Injection" in categories
    assert "Unsafe Code Execution" in categories
    assert "Insecure Deserialization" in categories
