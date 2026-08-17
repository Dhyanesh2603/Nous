import os
import pytest
from app.scanner import RepoScanner
from app.config import settings


def test_python_project_scan_and_graph():
    fixture_dir = str((settings.FIXTURES_DIR / "python_project").resolve())
    scanner = RepoScanner(fixture_dir)
    stats = scanner.scan_and_index()
    
    assert stats["total_files_parsed"] >= 6
    assert stats["total_symbols"] >= 8
    
    # Verify graph structure
    graph_resp = scanner.graph_store.get_react_flow_graph("file")
    assert len(graph_resp.nodes) >= 6
    assert len(graph_resp.edges) >= 4
    
    # Verify cycle detection on cycles/a.py and cycles/b.py
    assert len(scanner.graph_store.cycles) >= 1
    
    # Verify blast radius calculation
    # Let's find jwt_utils file or generate_token symbol
    jwt_file = next(f for f in scanner.file_asts.keys() if "jwt_utils.py" in f)
    blast_resp = scanner.graph_store.calculate_blast_radius(jwt_file)
    assert blast_resp.total_impacted_files >= 1
    assert any("service.py" in item.file_path for item in blast_resp.impact_items)


def test_ts_project_scan_and_graph():
    fixture_dir = str((settings.FIXTURES_DIR / "ts_project").resolve())
    scanner = RepoScanner(fixture_dir)
    stats = scanner.scan_and_index()
    
    assert stats["total_files_parsed"] >= 4
    
    # Check symbol call resolution
    # startApp -> ApiClient.fetchUser -> add
    add_symbol_id = next((s_id for s_id in scanner.graph_store.call_builder.symbols_by_id if "add" in s_id), None)
    assert add_symbol_id is not None
    
    # Blast radius on math.ts add function
    blast_resp = scanner.graph_store.calculate_blast_radius(add_symbol_id)
    assert blast_resp.total_impacted_symbols >= 1
