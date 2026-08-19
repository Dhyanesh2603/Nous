import os
import pytest
from app.analysis.database_analyzer import DatabaseAnalyzer
from app.analysis.security_scanner import SecurityScanner
from app.analysis.performance_analyzer import PerformanceAnalyzer
from app.analysis.health_scorecard import HealthScorecardCalculator
from app.analysis.ai_copilot import AICopilotEngine
from app.scanner import RepoScanner


def test_database_analyzer_sql_and_prisma(tmp_path):
    # Create sample SQL file
    sql_file = tmp_path / "schema.sql"
    sql_file.write_text("""
CREATE TABLE users (
    id VARCHAR(36) PRIMARY KEY,
    email VARCHAR(255) NOT NULL,
    created_at TIMESTAMP
);

CREATE TABLE orders (
    id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(36),
    amount DECIMAL(10, 2),
    FOREIGN KEY (user_id) REFERENCES users(id)
);
""", encoding="utf-8")

    analyzer = DatabaseAnalyzer(str(tmp_path))
    report = analyzer.analyze()

    assert report.detected is True
    assert report.tables_count == 2
    assert any(t.name.lower() == "users" for t in report.tables)
    assert any(t.name.lower() == "orders" for t in report.tables)
    assert len(report.relationships) >= 1
    assert "erDiagram" in report.mermaid_erd


def test_security_scanner(tmp_path):
    vuln_file = tmp_path / "vulnerable.py"
    mock_aws = "AKIA" + "0000000000EXAMPLE"
    mock_stripe = "sk_" + "live_" + "000000000000000000000000"
    vuln_file.write_text(f"""
import os
# Hardcoded fake test credentials
AWS_KEY = "{mock_aws}"
STRIPE_KEY = "{mock_stripe}"

def execute_user_query(query_input):
    eval(query_input)
    cursor.execute(f"SELECT * FROM users WHERE name = '{{query_input}}'")
""", encoding="utf-8")

    scanner = SecurityScanner(str(tmp_path))
    audit = scanner.audit()

    assert audit.total_issues >= 3
    assert audit.critical_count >= 2
    assert audit.security_score < 90
    assert any(v.category == "Hardcoded Secret" for v in audit.vulnerabilities)
    assert any(v.category == "SQL Injection" for v in audit.vulnerabilities)
    assert any(v.category == "Unsafe Code Execution" for v in audit.vulnerabilities)


def test_performance_analyzer(tmp_path):
    perf_file = tmp_path / "heavy.py"
    perf_file.write_text("""
def process_items(items):
    for item in items:
        # N+1 query inside loop
        user = db.query("SELECT * FROM users WHERE id = " + str(item.user_id))
        for sub in item.subs:
            for deep in sub.items:
                pass
""", encoding="utf-8")

    analyzer = PerformanceAnalyzer(str(tmp_path))
    report = analyzer.analyze()

    assert report.total_issues >= 2
    assert report.n_plus_one_count >= 1
    assert report.nested_loop_count >= 1


def test_health_scorecard_and_copilot():
    fixture_dir = r"D:\Nous\backend\tests\fixtures\python_project"
    scanner = RepoScanner(fixture_dir)
    scanner.scan_and_index()

    # 1. Health Scorecard
    calc = HealthScorecardCalculator(fixture_dir, scanner)
    scorecard = calc.calculate()
    assert scorecard.overall_score > 0
    assert scorecard.overall_grade in ("A+", "A", "B", "C", "D", "F")
    assert scorecard.radar.architecture_score > 0

    # 2. AI Copilot
    copilot = AICopilotEngine(scanner)
    answer = copilot.answer_query("Explain architecture and folder structure")
    assert len(answer.markdown_response) > 50
    assert len(answer.cited_files) >= 1

    # 3. Impact Analysis
    impact = copilot.predict_impact(r"D:\Nous\backend\tests\fixtures\python_project\main.py")
    assert impact.risk_level in ("Low", "Medium", "High", "Critical")

    # 4. Onboarding Roadmap
    onboarding = copilot.generate_onboarding_roadmap()
    assert onboarding.total_steps >= 2
