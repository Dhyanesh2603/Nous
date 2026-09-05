import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.state import app_state
from app.scanner import RepoScanner
from app.analysis.ripple_simulator import RippleSimulatorEngine, RippleSimulationReport


client = TestClient(app)


@pytest.fixture(autouse=True)
def setup_test_scanner():
    scanner = RepoScanner("tests/fixtures/python_project")
    scanner.scan_and_index()
    app_state.scanner = scanner
    yield
    app_state.scanner = None


def test_ripple_engine_targets():
    engine = RippleSimulatorEngine(scanner=app_state.scanner)
    targets = engine.get_available_targets()
    assert len(targets) > 0
    assert "id" in targets[0]
    assert "name" in targets[0]
    assert "type" in targets[0]


def test_ripple_engine_simulate_breaking_vs_additive():
    engine = RippleSimulatorEngine(scanner=app_state.scanner)
    targets = engine.get_available_targets()
    target_id = targets[0]["id"]
    target_type = targets[0]["type"]

    # 1. Breaking simulation
    rep_breaking = engine.simulate(target_id=target_id, target_type=target_type, change_type="breaking")
    assert isinstance(rep_breaking, RippleSimulationReport)
    assert rep_breaking.change_type == "breaking"
    assert rep_breaking.overall_risk_score > 0
    assert len(rep_breaking.breaking_contract_warnings) > 0
    assert len(rep_breaking.recommended_test_files) > 0

    # 2. Additive simulation (should have lower risk score)
    rep_additive = engine.simulate(target_id=target_id, target_type=target_type, change_type="additive")
    assert rep_additive.change_type == "additive"
    assert rep_additive.overall_risk_score <= rep_breaking.overall_risk_score


def test_ripple_api_endpoints():
    # 1. Get targets
    resp = client.get("/api/analysis/ripple/targets")
    assert resp.status_code == 200
    targets = resp.json().get("targets", [])
    assert len(targets) > 0

    # 2. Simulate
    target_id = targets[0]["id"]
    resp = client.post(
        "/api/analysis/ripple/simulate",
        json={"target_id": target_id, "target_type": targets[0]["type"], "change_type": "breaking"},
    )
    assert resp.status_code == 200
    data = resp.json()
    assert "overall_risk_score" in data
    assert "risk_tier" in data
    assert "level1_direct" in data
    assert "level2_transitive" in data
    assert "breaking_contract_warnings" in data
    assert "recommended_test_files" in data
