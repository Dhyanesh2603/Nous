import os
import re
from pathlib import Path
from typing import Dict, List, Optional, Any
from pydantic import BaseModel, Field

from app.parsers.symbol_types import FileAST


class ComponentInfo(BaseModel):
    name: str
    framework: str  # 'React', 'Vue', 'Svelte', 'Next.js'
    file_path: str
    relative_path: str
    line_number: int
    props: List[str] = Field(default_factory=list)
    hooks_used: List[str] = Field(default_factory=list)
    child_components: List[str] = Field(default_factory=list)


class BackendLayerMap(BaseModel):
    controllers: List[Dict[str, Any]] = Field(default_factory=list)
    services: List[Dict[str, Any]] = Field(default_factory=list)
    repositories: List[Dict[str, Any]] = Field(default_factory=list)
    middleware_chain: List[str] = Field(default_factory=list)


class FrameworkOverviewReport(BaseModel):
    detected_frameworks: List[str] = Field(default_factory=list)
    frontend_components: List[ComponentInfo] = Field(default_factory=list)
    backend_layers: BackendLayerMap = Field(default_factory=BackendLayerMap)
    routes_map: List[Dict[str, Any]] = Field(default_factory=list)


class FrameworkAnalyzer:
    def __init__(self, root_dir: str, file_asts: Optional[Dict[str, FileAST]] = None):
        self.root_dir = os.path.abspath(root_dir)
        self.file_asts = file_asts or {}

    def analyze(self) -> FrameworkOverviewReport:
        frameworks = set()
        components: List[ComponentInfo] = []
        controllers = []
        services = []
        repositories = []
        middleware_chain = []
        routes_map = []

        if not os.path.exists(self.root_dir):
            return FrameworkOverviewReport()

        for file_path, ast in self.file_asts.items():
            rel_path = ast.relative_path
            content = ast.raw_content or ""
            
            # 1. Detect Frameworks & Frontend Components
            if "React" in content or "useState" in content or "jsx" in rel_path or "tsx" in rel_path:
                frameworks.add("React")
                self._extract_react_components(file_path, rel_path, content, ast, components)

            if "vue" in rel_path or "<template>" in content:
                frameworks.add("Vue")

            if "FastAPI" in content or "@app." in content:
                frameworks.add("FastAPI (Python)")

            if "express" in content or "express()" in content:
                frameworks.add("Express (Node.js)")

            if "next" in content or "/app/" in rel_path or "/pages/" in rel_path:
                frameworks.add("Next.js")

            # 2. Map Backend Architectural Layers
            # Controllers / Routers
            if "router" in rel_path.lower() or "controller" in rel_path.lower() or "routes" in rel_path.lower():
                controllers.append({
                    "name": Path(rel_path).stem,
                    "file": rel_path,
                    "symbols": [s.name for s in ast.symbols],
                    "endpoints_count": len([s for s in ast.symbols if s.decorators]),
                })

            # Services
            if "service" in rel_path.lower() or "manager" in rel_path.lower() or "handler" in rel_path.lower():
                services.append({
                    "name": Path(rel_path).stem,
                    "file": rel_path,
                    "symbols": [s.name for s in ast.symbols],
                })

            # Repositories / DAOs / Models
            if "repo" in rel_path.lower() or "model" in rel_path.lower() or "dao" in rel_path.lower():
                repositories.append({
                    "name": Path(rel_path).stem,
                    "file": rel_path,
                    "symbols": [s.name for s in ast.symbols],
                })

            # Middleware detection
            if "middleware" in rel_path.lower() or "add_middleware" in content or "app.use(" in content:
                mw_matches = re.findall(r"(?:add_middleware|app\.use)\s*\(\s*([A-Za-z0-9_]+)", content)
                for mw in mw_matches:
                    if mw not in middleware_chain:
                        middleware_chain.append(mw)

        return FrameworkOverviewReport(
            detected_frameworks=sorted(list(frameworks)),
            frontend_components=components,
            backend_layers=BackendLayerMap(
                controllers=controllers,
                services=services,
                repositories=repositories,
                middleware_chain=middleware_chain,
            ),
            routes_map=routes_map,
        )

    def _extract_react_components(
        self, file_path: str, rel_path: str, content: str, ast: FileAST, components: List[ComponentInfo]
    ):
        for sym in ast.symbols:
            # Check if symbol starts with uppercase (React component convention)
            if sym.name and sym.name[0].isupper() and sym.kind in ("function", "class"):
                # Extract hooks used in component
                hooks = re.findall(r"\b(use[A-Z][A-Za-z0-9_]+)\b", sym.code_content or "")
                # Extract child JSX elements
                jsx_tags = re.findall(r"<([A-Z][A-Za-z0-9_]+)", sym.code_content or "")

                components.append(
                    ComponentInfo(
                        name=sym.name,
                        framework="React",
                        file_path=file_path,
                        relative_path=rel_path,
                        line_number=sym.start_line,
                        props=sym.parameters,
                        hooks_used=list(set(hooks)),
                        child_components=list(set(jsx_tags)),
                    )
                )
