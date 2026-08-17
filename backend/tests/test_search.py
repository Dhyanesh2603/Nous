import os
import pytest
from app.scanner import RepoScanner
from app.config import settings


def test_hybrid_search_and_dead_code():
    fixture_dir = str((settings.FIXTURES_DIR / "python_project").resolve())
    scanner = RepoScanner(fixture_dir)
    scanner.scan_and_index()
    
    # 1. Exact symbol search
    resp = scanner.search_engine.search("AuthService")
    assert resp.total_matches >= 1
    assert any(r.symbol_name == "AuthService" for r in resp.results)
    
    # 2. Conceptual query search
    resp_concept = scanner.search_engine.search("token decode validate")
    assert resp_concept.total_matches >= 1
    assert any("jwt_utils" in r.relative_path or "service" in r.relative_path for r in resp_concept.results)
    
    # 3. Dead code detection
    dead_code = scanner.analyzer.detect_dead_code()
    assert len(dead_code) >= 1
    assert any("dead_unreferenced_exporter" in d.name for d in dead_code)
