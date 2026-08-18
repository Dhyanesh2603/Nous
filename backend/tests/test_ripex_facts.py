import os
import pytest
from app.parsers.ripex_parser import RipExASTParser
from app.parsers.factory import ParserFactory
from app.facts.fact_extractor import FactExtractor
from app.facts.fact_store import FactStore
from app.facts.fact_types import FactKind


def test_ripex_parser_execution():
    parser = RipExASTParser()
    assert parser.is_available(), "ripex binary should be found and executable"

    fixture_path = r"D:\Nous\backend\tests\fixtures\python_project\main.py"
    with open(fixture_path, "r", encoding="utf-8") as f:
        content = f.read()

    ast = parser.parse_file(fixture_path, "main.py", content)
    assert ast.language == "python"
    assert len(ast.symbols) >= 1
    assert any(s.name == "bootstrap_app" for s in ast.symbols)
    assert len(ast.imports) >= 3
    assert len(ast.calls) >= 5


def test_ripex_multi_language_parsing():
    parser = RipExASTParser()

    # 1. Test Go code
    go_code = """
package main
import "fmt"
type UserService struct {}
func (u *UserService) GetUser(id string) string {
    fmt.Println(id)
    return id
}
"""
    go_ast = parser.parse_file("user.go", "user.go", go_code)
    assert len(go_ast.symbols) >= 1

    # 2. Test Rust code
    rs_code = """
pub struct Calculator;
impl Calculator {
    pub fn add(a: i32, b: i32) -> i32 {
        a + b
    }
}
"""
    rs_ast = parser.parse_file("calc.rs", "calc.rs", rs_code)
    assert len(rs_ast.symbols) >= 1

    # 3. Test C code
    c_code = """
#include <stdio.h>
int calculate_sum(int a, int b) {
    printf("adding %d and %d", a, b);
    return a + b;
}
"""
    c_ast = parser.parse_file("math.c", "math.c", c_code)
    assert len(c_ast.symbols) >= 1


def test_fact_extraction_and_store():
    parser = RipExASTParser()
    extractor = FactExtractor()
    store = FactStore()

    py_file = r"D:\Nous\backend\tests\fixtures\python_project\main.py"
    with open(py_file, "r", encoding="utf-8") as f:
        py_content = f.read()

    ast = parser.parse_file(py_file, "main.py", py_content)
    facts, routes = extractor.extract_facts({py_file: ast})
    store.load_facts(facts, routes)

    summary = store.get_summary()
    assert summary.total_facts > 0
    assert summary.facts_by_kind.get(FactKind.CALL_REF.value, 0) > 0
    assert summary.facts_by_kind.get(FactKind.IMPORT_REF.value, 0) > 0

    # Query calls made by bootstrap_app
    query_res = store.query(predicate="calls")
    assert query_res.total_matches >= 5

    # Query symbol facts
    sym_facts = store.get_symbol_facts(f"{py_file}::bootstrap_app")
    assert sym_facts["total_facts"] >= 5
    assert len(sym_facts["calls_made"]) >= 5


def test_route_handler_detection():
    extractor = FactExtractor()
    store = FactStore()

    # Simulate FastAPI decorated file
    from app.parsers.python_parser import PythonASTParser
    py_parser = PythonASTParser()
    
    route_code = """
from fastapi import FastAPI
app = FastAPI()

@app.get('/api/users')
def list_users():
    return []

@app.post('/api/users/{user_id}')
def create_user(user_id: str):
    return {'id': user_id}
"""
    ast = py_parser.parse_file("routes.py", "routes.py", route_code)
    facts, routes = extractor.extract_facts({"routes.py": ast})
    store.load_facts(facts, routes)

    assert len(routes) == 2
    assert any(r.http_method == "GET" and r.route_path == "/api/users" for r in routes)
    assert any(r.http_method == "POST" and r.route_path == "/api/users/{user_id}" for r in routes)
