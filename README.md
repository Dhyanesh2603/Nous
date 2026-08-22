<div align="center">

# 🧠 NOUS
### Enterprise Software Intelligence & Interactive Architecture Engine

**Nous** is a codebase intelligence platform designed to ingest software repositories, extract structural Abstract Syntax Trees (ASTs) using open-source language grammars (Tree-sitter & standard AST libraries), construct unified dependency and call graphs, enforce architectural boundaries, and provide an interactive, real-time visual canvas with AI-assisted diagnostics.

[![FastAPI](https://img.shields.io/badge/Backend-FastAPI_0.115+-009688.svg?logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![React](https://img.shields.io/badge/Frontend-React_19_+_Vite-61DAFB.svg?logo=react&logoColor=black)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/Language-TypeScript_5.8-3178C6.svg?logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![Python](https://img.shields.io/badge/Language-Python_3.11+-3776AB.svg?logo=python&logoColor=white)](https://www.python.org)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

</div>

---

## 🌟 Key Capabilities

### 1. 🔍 Polyglot AST Ingestion & Language Support
Nous integrates standard language AST engines and **Tree-sitter** grammar parsers to extract symbols, classes, function signatures, and call references across popular language ecosystems:
- **Languages Supported**: **Python** (`.py`), **TypeScript / TSX** (`.ts`, `.tsx`), **JavaScript / JSX** (`.js`, `.jsx`), **Go** (`.go`), **Rust** (`.rs`), **Java** (`.java`), **Kotlin** (`.kt`), **SQL DDL** (`.sql`), **Prisma** (`.prisma`), **Vue**, **Svelte**, and **C/C++**.
- **Ingestion Sources**:
  - **Local Directory**: Real-time background file watching with automatic live-reloading graph updates.
  - **Single File & Snippets**: Instant isolated AST extraction and dependency inspection.
  - **ZIP Archives**: Compressed project archive extraction and immediate full-repo scanning.
  - **Remote Git Repositories**: Full commit history ingestion (`--unshallow`), branch churn tracking, and timeline reconstruction.

### 2. 🗺️ Interactive Architecture Canvas
- **Multi-Level Architectural Views**:
  - **Overview Dashboard**: High-level diagnostic telemetry, health metrics, and direct tool launchers.
  - **Full Dependency Graph**: Global file-level import and dependency relationships.
  - **Frontend Architecture Lens**: Isolates React/Vue/Svelte components, routing, and UI hooks.
  - **Backend Architecture Lens**: Isolates controllers, API routes, domain services, repositories, and middleware.
  - **Module Cluster View**: High-level architectural community clustering via Louvain modularity.
  - **Call Graph View**: Cross-file function, method, and class invocation hierarchy.
- **Minimap Viewport Radar & Theatre-Seat Sector Navigator**:
  - **Slidable Sub-Screen Viewport**: Pannable and draggable illuminated viewport lens to slide across the graph smoothly.
  - **Theatre Sector Presets**: Jump directly to `Top` (Ingress/Controllers), `Mid` (Core Logic/Services), `Base` (Database/Storage), or `All` (Whole Graph Overview).
  - **Magnification Slider**: Live zoom percentage adjustment (20% – 200%) with quick recentering.
- **Transitive Blast Radius**: Calculates exact downstream impact radius with glowing, animated blast vectors.

### 3. 🛡️ Diagnostics, AI Copilot & Analysis Subsystems (67 API Endpoints)
- **AI Repository Copilot**: AST-aware semantic question answering, code citations, and structured onboarding roadmaps.
- **Automated Code Review & SAST Security Audit**: Detects hardcoded secrets, SQL injection vectors, unsafe execution patterns, and entropy outliers.
- **Database Schema & Relational ERD**: Extracts tables, primary/foreign keys, and data types from SQL and Prisma models.
- **API Request Flow Tracer**: End-to-end visual execution pipeline tracing from HTTP route handlers to database persistence.
- **Architecture Boundary & Dependency Linter**: Validates layering rules (e.g. controllers cannot directly query database models).
- **AST Clones & Duplicate Code Detector**: Syntactic and structural code clone identification.
- **Git Timeline & Evolution Replay**: Commit-by-commit evolution playback, author metrics, and churn hotspots.
- **Technical Debt & Architecture Drift Engine**: Tracks cyclomatic complexity hotspots, coupling metrics, and architectural drift.
- **PR Impact Simulator**: Simulates blast radius of function/class modifications or deletions before merging.
- **Automated Doc Generator & Test Advisor**: Auto-generates architecture documentation and recommends unit test cases for uncovered branches.

---

## 🏗️ Architecture Overview

```
Nous Platform
 ├── backend/
 │    ├── app/
 │    │    ├── parsers/        # Tree-sitter grammar wrappers & AST extractors
 │    │    ├── graph/          # DependencyGraph, CallGraph, GraphStore (NetworkX)
 │    │    ├── analysis/       # 20+ specialized intelligence & diagnostic engines
 │    │    ├── routers/        # 30 modular FastAPI routers (67 API endpoints)
 │    │    ├── scanner.py      # Repository orchestrator & state synchronization
 │    │    └── main.py         # FastAPI application entrypoint & CORS middleware
 │    └── tests/               # 44 comprehensive pytest integration tests
 └── frontend/
      ├── src/
      │    ├── components/
      │    │    ├── canvas/    # React Flow canvas, Dagre layout, MinimapRadarControl
      │    │    ├── dashboard/ # Repository overview & diagnostic tool matrix
      │    │    ├── layout/    # Top navigation bar & tools dropdown menu
      │    │    └── [modals]/  # 25+ specialized analysis & diagnostic modal dialogs
      │    ├── services/       # Typed Axios API client
      │    └── types/          # Full TypeScript domain & graph type definitions
      └── vite.config.ts
```

---

## 🚀 Quickstart Guide

### Prerequisites
- **Python 3.11+**
- **Node.js 18+** & **npm**
- **Git**

---

### 1. Backend Setup

```bash
# Navigate to backend directory
cd backend

# Create and activate Python virtual environment
python -m venv .venv

# Windows (PowerShell):
.\.venv\Scripts\Activate.ps1
# Linux / macOS:
source .venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Start FastAPI server on port 8000
uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```

Backend API will be live at: **`http://127.0.0.1:8000`**  
Interactive OpenAPI documentation: **`http://127.0.0.1:8000/docs`**

---

### 2. Frontend Setup

```bash
# Navigate to frontend directory
cd frontend

# Install npm packages
npm install

# Start Vite React development server
npm run dev
```

Frontend application will be live at: **`http://localhost:5173`**

---

## 🧪 Testing & Verification

### Run Backend Tests (44 Tests)
```bash
cd backend
pytest -v
```

### Run Frontend Production Build & TypeScript Checks
```bash
cd frontend
npm run build
```

---

## 🙏 Acknowledgements & Open Source Engines

Nous builds upon and integrates with the following open-source technologies:
- **[Tree-sitter](https://tree-sitter.github.io/)** — Incremental parsing library and ecosystem of language grammars.
- **[NetworkX](https://networkx.org/)** — Graph algorithms, cycle detection, and topological analysis.
- **[React Flow (@xyflow/react)](https://reactflow.dev/)** & **[Dagre](https://github.com/dagrejs/dagre)** — Interactive graph canvas and hierarchical layout rendering.
- **[FastAPI](https://fastapi.tiangolo.com/)** — High-performance asynchronous REST API framework.

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
