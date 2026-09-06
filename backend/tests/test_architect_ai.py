import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.state import app_state
from app.scanner import RepoScanner
from app.ai.llm_client import LLMClient, LLMMessage
from app.ai.graph_rag import GraphRAGContextBuilder
from app.analysis.architect_ai import ArchitectAIEngine, ArchitectAIResponse


client = TestClient(app)


@pytest.fixture(autouse=True)
def setup_test_scanner():
    scanner = RepoScanner("tests/fixtures/python_project")
    scanner.scan_and_index()
    app_state.scanner = scanner
    yield
    app_state.scanner = None


def test_llm_client_status():
    llm = LLMClient()
    status = llm.get_available_providers()
    assert "providers" in status
    assert "active_default" in status
    assert "offline" in status["providers"]
    assert status["providers"]["offline"]["available"] is True


def test_llm_client_offline_fallback():
    llm = LLMClient()
    res = llm.generate([LLMMessage(role="user", content="Explain the architecture flow")])
    assert res.is_fallback is True
    assert res.provider == "offline"
    assert "Architectural Analysis" in res.content


def test_graph_rag_context_extraction():
    rag = GraphRAGContextBuilder(app_state.scanner)
    ctx = rag.build_context(query="How does authentication work?")
    assert len(ctx.seed_files) > 0
    assert len(ctx.formatted_prompt) > 0
    assert "VERIFIED REPOSITORY FACTS" in ctx.formatted_prompt


def test_architect_ai_engine_ask():
    engine = ArchitectAIEngine(scanner=app_state.scanner)
    res = engine.ask(query="Explain the overall system architecture")
    assert isinstance(res, ArchitectAIResponse)
    assert res.query == "Explain the overall system architecture"
    assert len(res.summary) > 0
    assert "sequenceDiagram" in res.sequence_diagram
    assert len(res.referenced_files) > 0
    assert len(res.architectural_observations) > 0


def test_architect_ai_api_endpoints():
    # 1. Test status
    resp = client.get("/api/ai/status")
    assert resp.status_code == 200
    data = resp.json()
    assert "providers" in data

    # 2. Test suggested questions
    resp = client.get("/api/ai/suggested-questions")
    assert resp.status_code == 200
    questions = resp.json().get("questions", [])
    assert len(questions) > 0

    # 3. Test architect query endpoint
    resp = client.post(
        "/api/ai/architect-query",
        json={"query": "Explain the entry points and controllers"},
    )
    assert resp.status_code == 200
    res_data = resp.json()
    assert "summary" in res_data
    assert "sequence_diagram" in res_data
    assert "sequenceDiagram" in res_data["sequence_diagram"]
    assert "referenced_files" in res_data

    # 4. Test set-key endpoint
    set_key_resp = client.post(
        "/api/ai/set-key",
        json={"provider": "nvidia", "api_key": "nvapi-test-key-12345"},
    )
    assert set_key_resp.status_code == 200
    set_data = set_key_resp.json()
    assert set_data["status"] == "success"
    assert set_data["provider"] == "nvidia"
    assert set_data["active_status"]["providers"]["nvidia"]["available"] is True


def test_llm_client_nvidia_provider():
    llm = LLMClient()
    status = llm.get_available_providers()
    assert "nvidia" in status["providers"]
    nvidia_info = status["providers"]["nvidia"]
    assert "deepseek-ai/deepseek-v4-flash" in nvidia_info["default_model"] or "deepseek" in nvidia_info["default_model"]
    assert "supported_models" in nvidia_info
    assert any("deepseek-v4-flash" in m for m in nvidia_info["supported_models"])


def test_nvidia_thinking_tokens_formatting(monkeypatch):
    import io

    class MockHTTPResponse:
        def __init__(self, data_dict):
            import json
            self.data = json.dumps(data_dict).encode("utf-8")
        def read(self):
            return self.data
        def __enter__(self):
            return self
        def __exit__(self, *args):
            pass

    mock_json = {
        "choices": [
            {
                "message": {
                    "role": "assistant",
                    "content": "<think>Analyzing graph topology and call chain</think>The controller delegates to the auth service."
                }
            }
        ],
        "usage": {"total_tokens": 42}
    }

    import urllib.request
    monkeypatch.setattr(urllib.request, "urlopen", lambda req, timeout=60.0: MockHTTPResponse(mock_json))

    llm = LLMClient()
    res = llm.generate(
        [LLMMessage(role="user", content="Explain auth flow")],
        provider="nvidia",
        model="deepseek-ai/deepseek-v4-flash",
        api_key="nvapi-test-dummy",
    )
    assert res.provider == "nvidia"
    assert "DeepSeek Reasoning Process" in res.content
    assert "The controller delegates to the auth service" in res.content

