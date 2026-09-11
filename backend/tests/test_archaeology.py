import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.state import app_state
from app.scanner import RepoScanner
from app.analysis.archaeology import ArchaeologyEngine, LegacyFlagDetector, ArchaeologyResponse
from app.analysis.architecture_drift import CleanArchitectureChecker, CleanArchitectureReport

client = TestClient(app)


@pytest.fixture(autouse=True)
def setup_test_scanner():
    scanner = RepoScanner("tests/fixtures/python_project")
    scanner.scan_and_index()
    app_state.scanner = scanner
    yield
    app_state.scanner = None


def test_legacy_flag_detector():
    detector = LegacyFlagDetector()
    sample_code = """
    # TODO: Implement OAuth2 login
    def login():
        pass

    # HACK: Bypass rate limit for tests
    def check_rate():
        return True

    # FIXME: SQL injection risk here
    def query():
        pass
    """
    flags = []
    for line_idx, line in enumerate(sample_code.splitlines(), start=1):
        for flag_name, (pattern, severity) in detector.PATTERNS.items():
            if pattern.search(line):
                flags.append((flag_name, severity))

    flag_names = [f[0] for f in flags]
    assert "TODO" in flag_names
    assert "HACK" in flag_names
    assert "FIXME" in flag_names


def test_archaeology_engine():
    engine = ArchaeologyEngine(scanner=app_state.scanner)
    files = list(app_state.scanner.file_asts.keys())
    assert len(files) > 0

    target = files[0]
    res = engine.investigate(target)
    assert isinstance(res, ArchaeologyResponse)
    assert target.replace("\\", "/").endswith(res.target)
    assert len(res.summary) > 0
    assert len(res.primary_purpose) > 0
    assert res.risk_level in ("Low", "Medium", "High", "Critical")


def test_archaeology_api_routes():
    # 1. Test /api/archaeology
    resp = client.get("/api/archaeology")
    assert resp.status_code == 200
    data = resp.json()
    assert "target" in data
    assert "summary" in data
    assert "risk_level" in data
    assert "primary_purpose" in data

    # 2. Test /api/archaeology/files
    resp_files = client.get("/api/archaeology/files")
    assert resp_files.status_code == 200
    assert "files" in resp_files.json()
    assert len(resp_files.json()["files"]) > 0

    # 3. Test /api/archaeology/legacy-flags
    resp_flags = client.get("/api/archaeology/legacy-flags")
    assert resp_flags.status_code == 200
    assert isinstance(resp_flags.json(), list)


def test_clean_architecture_checker():
    checker = CleanArchitectureChecker(scanner=app_state.scanner)
    report = checker.check()
    assert isinstance(report, CleanArchitectureReport)
    assert len(report.layers) == 4
    layer_names = [l.name for l in report.layers]
    assert "Domain" in layer_names
    assert "Application" in layer_names
    assert "Infrastructure" in layer_names
    assert "Presentation" in layer_names
    assert report.compliance_score >= 0.0

    # Test API endpoint
    resp = client.get("/api/analysis/clean-architecture")
    assert resp.status_code == 200
    assert "layers" in resp.json()
    assert "compliance_score" in resp.json()
