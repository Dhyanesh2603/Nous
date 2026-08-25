# NOUS
### Software Architecture Intelligence & Static Codebase Analysis Platform

Nous is an automated software architecture analysis and intelligence platform. It ingests polyglot source code repositories, constructs unified Abstract Syntax Tree (AST) representations, maps dependency and call graphs, and renders interactive, real-time architectural topology with integrated static analysis and diagnostics.

---

## Abstract

Modern software repositories often suffer from architectural erosion, hidden circular dependencies, untracked blast radiuses, and unvalidated structural drift. Nous provides an automated system to parse, index, and analyze complex codebases across multiple programming languages.

By integrating open-source grammar parsing engines (Tree-sitter and language-specific AST libraries) with graph-theoretic algorithms (NetworkX, Dagre layout engines), Nous produces deterministic models of file-level dependencies, symbol-level call graphs, and architectural community clusters. These models drive an interactive visual canvas and a suite of static diagnostic subsystems, enabling engineers to inspect system boundaries, trace execution pathways, detect code clones, and evaluate the architectural impact of proposed changes.

---

## Core System Architecture

### 1. Ingestion and AST Extraction
- **Multi-Source Ingestion**: Supports local file system directories with real-time file-system watching, isolated single-source files, compressed archive formats (`.zip`), and full-depth remote Git repositories.
- **Polyglot Parsing Support**: Uses Tree-sitter grammars and standard AST extractors across Python, TypeScript, JavaScript, Go, Rust, Java, Kotlin, SQL DDL, Prisma schema definitions, Vue, Svelte, and C/C++.
- **Deterministic State Isolation**: Initializes in an unpopulated state, allowing users to explicitly select, switch, or ingest target repositories on demand without ambient data cross-contamination.

### 2. Graph Modeling Engine
- **Hierarchical Dependency Graph**: Models inter-module import relationships, detects circular dependency cycles, and computes topological orderings.
- **Symbol Scoping & Call Graph**: Indexes functions, classes, interfaces, and methods to map caller-callee relationships across file boundaries.
- **Community Clustering**: Automatically identifies logical subsystem boundaries using modularity maximization algorithms.
- **Transitive Blast Radius Computation**: Evaluates downstream dependency reachability when a symbol or module is targeted for modification or deprecation.

### 3. Interactive Topology Canvas
- **Multi-Tier Abstraction Layers**:
  - **Overview Dashboard**: High-level repository telemetry, health indicators, and direct diagnostic launchers.
  - **Global Dependency View**: Complete file-level dependency topology with directed acyclic layout.
  - **Frontend Architecture Lens**: Isolates user interface components, client routing, and state hooks.
  - **Backend Architecture Lens**: Isolates API routes, controllers, domain services, middleware, and data access objects.
  - **Module Cluster View**: High-level structural communities grouped by architectural affinity.
  - **Call Graph View**: Cross-file functional invocation graph with symbol resolution.
- **Minimap Viewport Radar & Sector Navigation**:
  - **Interactive Viewport Lens**: Draggable and resizable bounding viewport slider providing real-time canvas navigation.
  - **Discrete Sector Controls**: Quick-jump presets targeting Ingress/Controllers (`Top`), Core Services (`Mid`), and Persistence/Storage (`Base`).
  - **Magnification Slider**: Continuous zoom adjustment from 20% to 200% with automatic canvas recentering.

### 4. Diagnostics & Analysis Subsystems
- **Executive Architecture & Security Audit Report**: Unified quality, security, complexity, and drift synthesizer with PDF and Markdown export.
- **Universal Omni-Command Palette (`Ctrl+K`)**: Dual-mode action launcher and deterministic AST symbol hybrid search (BM25 + RRF).
- **Static Application Security Testing (SAST)**: Static identification of hardcoded credentials, SQL injection vectors, and unsafe execution routines.
- **Relational Schema & ERD Analyzer**: Extraction of relational entities, table attributes, and foreign key constraints from SQL DDL and Prisma models.
- **API Request Flow Tracer**: Reconstruction of end-to-end execution pipelines from HTTP endpoints through middleware to persistence layers.
- **Architecture Boundary Linter**: Static verification of layered architectural constraints and forbidden dependency directions.
- **Structural Code Clone Detection**: Identification of exact and near-duplicate syntax subtrees across the codebase.
- **Git Evolution & Churn Analytics**: Historical commit replay, author attribution analysis, and file modification frequency heatmaps.
- **Technical Debt & Architectural Drift**: Metrics on cyclomatic complexity, coupling concentration, and structural entropy over time.
- **Pull Request Impact Simulation**: Forward-looking blast radius prediction for proposed file or symbol deletions and renames.

> For complete in-depth guides, workflows, and API specifications, see **[DOCUMENTATION.md](DOCUMENTATION.md)**.

---

## Repository Structure

```
nous/
├── backend/
│   ├── app/
│   │   ├── analysis/       # 20+ specialized intelligence and diagnostic engines
│   │   ├── graph/          # DependencyGraph, CallGraph, and GraphStore models
│   │   ├── parsers/        # Tree-sitter grammar wrappers and AST extractors
│   │   ├── routers/        # 30 modular FastAPI REST routers (67 API endpoints)
│   │   ├── config.py       # Application settings and environment configuration
│   │   ├── git_cloner.py   # Remote repository cloning and history extraction
│   │   ├── scanner.py      # Repository scanner and AST orchestration engine
│   │   ├── state.py        # Centralized in-memory application state store
│   │   └── main.py         # FastAPI application entry point and CORS configuration
│   ├── tests/              # 44 automated integration and unit tests
│   └── pyproject.toml      # Python dependencies and build metadata
└── frontend/
    ├── src/
    │   ├── components/
    │   │   ├── canvas/     # React Flow canvas, Dagre layout, and MinimapRadarControl
    │   │   ├── dashboard/  # Telemetry dashboard and NoRepoWelcome onboarding
    │   │   ├── layout/     # Navigation header and tools dropdown menu
    │   │   └── [modals]/   # Modal dialogs for each diagnostic subsystem
    │   ├── services/       # Typed HTTP client services
    │   ├── types/          # Domain, AST, and graph type definitions
    │   ├── App.tsx         # Main application controller and routing
    │   └── main.tsx        # React application entry point
    ├── index.html          # Application HTML shell
    ├── package.json        # Frontend dependencies and build scripts
    └── vite.config.ts      # Vite build configuration
```

---

## Installation and Execution

### Prerequisites
- Python 3.11 or higher
- Node.js 18 or higher (with npm)
- Git (command-line executable available on system PATH)

---

### Backend Service Setup

```bash
# Navigate to the backend directory
cd backend

# Initialize and activate Python virtual environment
python -m venv .venv

# Windows (PowerShell):
.\.venv\Scripts\Activate.ps1
# Linux / macOS:
source .venv/bin/activate

# Install required Python dependencies
pip install -r requirements.txt

# Start the FastAPI service on port 8000
uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```

The REST API service will listen on `http://127.0.0.1:8000`.  
OpenAPI documentation is available at `http://127.0.0.1:8000/docs`.

---

### Frontend Client Setup

```bash
# Navigate to the frontend directory
cd frontend

# Install client dependencies
npm install

# Start the Vite development server
npm run dev
```

The client user interface will be accessible at `http://localhost:5173`.

---

## Quality Assurance & Verification

### Backend Automated Test Suite
```bash
cd backend
pytest -v
```

### Frontend Type Validation & Production Build
```bash
cd frontend
npm run build
```

---

## External Technologies & Acknowledgements

Nous incorporates and builds upon the following open-source frameworks and libraries:
- **Tree-sitter**: Incremental parsing system and formal language grammar ecosystem.
- **NetworkX**: Complex network creation, manipulation, and graph-theoretic analysis.
- **React Flow (@xyflow/react) & Dagre**: Interactive node-based graph rendering and hierarchical DAG layout.
- **FastAPI**: Asynchronous Python web framework for REST API implementation.
- **Lucide Icons**: Standardized technical icon library.

---

## License

This software is distributed under the terms of the MIT License. See the [LICENSE](LICENSE) file for complete details.
