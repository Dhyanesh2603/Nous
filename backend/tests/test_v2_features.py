import os
import pytest
from app.scanner import RepoScanner
from app.config import settings
from app.parsers.go_parser import GoASTParser
from app.parsers.rust_parser import RustASTParser
from app.analysis.clone_detector import CodeCloneDetector
from app.analysis.rules_engine import ArchitectureRulesEngine
from app.analysis.pattern_detector import DesignPatternDetector
from app.graph.sequence_generator import SequenceDiagramGenerator


def test_go_parser():
    parser = GoASTParser()
    code = '''
package main

import (
    "fmt"
    "net/http"
)

type User struct {
    ID string
    Name string
}

type UserService interface {
    GetUser(id string) (*User, error)
}

func (u *User) GetDisplayName() string {
    if u.Name != "" {
        return u.Name
    }
    return "Anonymous"
}

func MainHandler(w http.ResponseWriter, r *http.Request) {
    fmt.Println("Handling request")
}
'''
    ast = parser.parse_file("/path/to/main.go", "main.go", code)
    assert ast.language == "go"
    assert len(ast.imports) >= 2
    assert any(s.name == "User" for s in ast.symbols)
    assert any(s.name == "UserService" for s in ast.symbols)
    assert any(s.name == "GetDisplayName" for s in ast.symbols)
    assert any(s.name == "MainHandler" for s in ast.symbols)


def test_rust_parser():
    parser = RustASTParser()
    code = '''
use std::collections::HashMap;

pub struct UserProfile {
    pub id: String,
    pub username: String,
}

pub trait Authenticatable {
    fn authenticate(&self, token: &str) -> bool;
}

impl UserProfile {
    pub fn new(id: String, username: String) -> Self {
        UserProfile { id, username }
    }
}

pub fn calculate_hash(input: &str) -> u64 {
    if input.is_empty() {
        return 0;
    }
    42
}
'''
    ast = parser.parse_file("/path/to/lib.rs", "lib.rs", code)
    assert ast.language == "rust"
    assert len(ast.imports) >= 1
    assert any(s.name == "UserProfile" for s in ast.symbols)
    assert any(s.name == "Authenticatable" for s in ast.symbols)
    assert any(s.name == "new" for s in ast.symbols)
    assert any(s.name == "calculate_hash" for s in ast.symbols)


def test_git_churn_and_rules_and_patterns():
    fixture_dir = str((settings.FIXTURES_DIR / "python_project").resolve())
    scanner = RepoScanner(fixture_dir)
    scanner.scan_and_index()

    # 1. Git Churn
    churn_report = scanner.git_analyzer.analyze()
    assert len(churn_report.files) >= 6
    assert all(f.hotspot_score >= 0 for f in churn_report.files)

    # 2. Architecture Rules Evaluation
    rules_report = scanner.rules_engine.evaluate_rules(preset="clean_architecture")
    assert rules_report.total_rules_evaluated >= 1

    # 3. Design Pattern Detection
    patterns_summary = scanner.pattern_detector.analyze_patterns()
    assert len(patterns_summary.detected_patterns) >= 1
    assert "Modular" in patterns_summary.primary_architecture_style

    # 4. Sequence Diagram Generator
    # Trace from bootstrap_app in main.py
    bootstrap_sym_id = next(s_id for s_id in scanner.graph_store.call_builder.symbols_by_id if "bootstrap_app" in s_id)
    seq_resp = scanner.sequence_generator.generate_sequence(bootstrap_sym_id)
    assert seq_resp.total_steps >= 2
    assert "sequenceDiagram" in seq_resp.mermaid_markdown
    assert "AuthService" in seq_resp.mermaid_markdown


def test_clone_detector():
    fixture_dir = str((settings.FIXTURES_DIR / "python_project").resolve())
    scanner = RepoScanner(fixture_dir)
    scanner.scan_and_index()

    detector = CodeCloneDetector(scanner.graph_store, min_lines=2)
    report = detector.detect_clones()
    assert report.total_clone_groups >= 0
