# Nous: Codebase Intelligence & Architecture Engine

**Nous** is a multi-language codebase intelligence platform designed to ingest repositories, parse structural ASTs using Tree-sitter, construct unified dependency and call graphs, automatically discover architectural module boundaries, provide interactive graph visualization, and deliver AST-aware natural language semantic search.

---

## Features

- **Multi-Language AST Parsing Engine**: Tree-sitter extractors for Python (`.py`), TypeScript (`.ts`, `.tsx`), and JavaScript (`.js`, `.jsx`).
- **Unified Graph Modeling**:
  - Multi-file Import & Dependency Graph (with cycle detection via NetworkX).
  - Cross-module Function & Method Call Graph with symbol scoping.
  - Architectural Module Boundary & Community Clustering.
  - Transitive Blast Radius Impact Engine.
- **AST-Aware Hybrid Search**: Reciprocal Rank Fusion (RRF) combining exact symbol lookups, signature matching, and semantic conceptual retrieval.
- **Interactive Architecture Canvas**: React 19 + Vite + React Flow canvas with Dagre hierarchical auto-layout, multi-level abstraction switching (**Modules**, **Files**, **Symbols**), custom animated edges, and code preview drawers.
- **Quality & Architectural Analytics**: Dead code detection (unreferenced exports and orphan internal functions), circular dependency diagnostics, and cyclomatic complexity hotspots.

---

## Quickstart

### 1. Prerequisites
- Python 3.11+
- Node.js 18+

### 2. Backend Setup
```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt

# Run backend API server
uvicorn app.main:app --port 8000 --reload
```

### 3. Frontend Setup
```powershell
cd frontend
npm install
npm run dev
```

Open **`http://localhost:5173`** in your browser.

---

## Running Tests

```powershell
# Run backend pytest suite
cd backend
.\.venv\Scripts\Activate.ps1
pytest -v

# Run frontend build & type check
cd ../frontend
npm run build
```
