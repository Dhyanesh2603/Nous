import os
import pytest
from app.scanner import RepoScanner
from app.git_cloner import GitCloner
from app.state import app_state


def test_single_file_scan():
    single_file = r"D:\Nous\backend\tests\fixtures\python_project\main.py"
    scanner = RepoScanner(single_file)
    assert scanner.is_single_file is True

    result = scanner.scan_and_index()
    assert result["is_single_file"] is True
    assert result["total_files_parsed"] == 1
    assert result["total_symbols"] >= 1
    assert result["total_facts"] >= 5

    # Check graph store nodes
    graph_res = scanner.graph_store.get_react_flow_graph(view_mode="file")
    assert len(graph_res.nodes) >= 1
    assert any(n.data.get("relativePath") == "main.py" for n in graph_res.nodes)


def test_git_cloner_url_detection():
    cloner = GitCloner()
    assert cloner.is_git_url("https://github.com/fastapi/fastapi") is True
    assert cloner.is_git_url("https://gitlab.com/owner/repo.git") is True
    assert cloner.is_git_url("github.com/Dhyanesh2603/Nous") is True
    assert cloner.is_git_url("D:\\local\\folder") is False
    assert cloner.is_git_url("C:/Users/app") is False

    norm = cloner.normalize_url("github.com/owner/repo")
    assert norm == "https://github.com/owner/repo"


def test_state_load_single_file():
    single_file = r"D:\Nous\backend\tests\fixtures\python_project\main.py"
    stats = app_state.load_repository(single_file)
    assert stats["is_single_file"] is True
    assert stats["total_files_parsed"] == 1
    assert app_state.scanner.is_single_file is True
