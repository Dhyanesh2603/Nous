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
            rel_path = ast.relative_path.replace("\\", "/")
            content = ast.raw_content or ""
            ext = Path(file_path).suffix.lower()
            
            # 1. Detect Frontend Frameworks & Components
            if ext == ".vue" or "vue" in rel_path.lower() or "<template>" in content:
                frameworks.add("Vue")
                self._extract_vue_components(file_path, rel_path, content, ast, components)

            if ext == ".svelte" or "svelte" in rel_path.lower():
                frameworks.add("Svelte")
                self._extract_svelte_components(file_path, rel_path, content, ast, components)

            if (
                ext in (".tsx", ".jsx")
                or "React" in content
                or "useState" in content
                or "useEffect" in content
                or "from 'react'" in content
                or 'from "react"' in content
            ):
                frameworks.add("React")
                self._extract_react_components(file_path, rel_path, content, ast, components)

            if "angular" in content or "@Component(" in content or "@Injectable(" in content:
                frameworks.add("Angular")

            if "/app/" in rel_path or "/pages/" in rel_path or "next/" in content or "next.config" in rel_path:
                frameworks.add("Next.js")

            # 2. Detect Backend Frameworks
            if "FastAPI" in content or "@app." in content or "APIRouter" in content:
                frameworks.add("FastAPI (Python)")
            elif "flask" in content or "Flask(__name__)" in content:
                frameworks.add("Flask (Python)")
            elif "django" in content or "models.Model" in content:
                frameworks.add("Django (Python)")

            if "express" in content or "express()" in content or 'require("express")' in content:
                frameworks.add("Express (Node.js)")
            elif "@nestjs" in content or "@Controller(" in content:
                frameworks.add("NestJS (Node.js)")

            if "org.springframework" in content or "@SpringBootApplication" in content or "@RestController" in content:
                frameworks.add("Spring Boot (Java)")

            if "gin-gonic" in content or "gin.Default()" in content or "fiber.New()" in content:
                frameworks.add("Gin / Fiber (Go)")

            if "actix_web" in content or "rocket::" in content or "axum::" in content:
                frameworks.add("Actix / Axum (Rust)")

            # 3. Map Backend Architectural Layers
            # Controllers / Routers / Endpoints
            if any(k in rel_path.lower() for k in ("router", "controller", "routes", "endpoint", "api/")):
                controllers.append({
                    "name": Path(rel_path).stem,
                    "file": rel_path,
                    "symbols": [s.name for s in ast.symbols],
                    "endpoints_count": len([s for s in ast.symbols if s.decorators or "route" in s.name.lower()]),
                })

            # Services / Business Logic
            if any(k in rel_path.lower() for k in ("service", "manager", "handler", "usecase", "logic")):
                services.append({
                    "name": Path(rel_path).stem,
                    "file": rel_path,
                    "symbols": [s.name for s in ast.symbols],
                })

            # Repositories / DAOs / Models
            if any(k in rel_path.lower() for k in ("repo", "model", "dao", "schema", "entity")):
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
        found_names = set()
        
        # 1. From AST symbols
        for sym in ast.symbols:
            kind_str = sym.kind.value if hasattr(sym.kind, "value") else str(sym.kind)
            is_capitalized = sym.name and sym.name[0].isupper()
            if is_capitalized:
                hooks = re.findall(r"\b(use[A-Z][A-Za-z0-9_]+)\b", sym.code_content or content)
                jsx_tags = [
                    tag for tag in re.findall(r"<([A-Z][A-Za-z0-9_]+)", sym.code_content or content)
                    if tag != sym.name
                ]
                props = sym.parameters or []
                components.append(
                    ComponentInfo(
                        name=sym.name,
                        framework="React",
                        file_path=file_path,
                        relative_path=rel_path,
                        line_number=sym.start_line,
                        props=props,
                        hooks_used=list(set(hooks)),
                        child_components=list(set(jsx_tags)),
                    )
                )
                found_names.add(sym.name)

        # 2. Regex fallback for arrow function components (export const Modal = () => ...)
        for comp_match in re.finditer(
            r"(?:export\s+)?(?:const|function)\s+([A-Z][A-Za-z0-9_]+)\s*(?::\s*React\.FC(?:<[^>]*>)?\s*)?=\s*(?:\([^)]*\)|[a-zA-Z0-9_]+)\s*=>",
            content,
        ):
            c_name = comp_match.group(1)
            if c_name not in found_names:
                line_no = content[:comp_match.start(1)].count("\n") + 1
                hooks = re.findall(r"\b(use[A-Z][A-Za-z0-9_]+)\b", content)
                jsx_tags = [t for t in re.findall(r"<([A-Z][A-Za-z0-9_]+)", content) if t != c_name]
                components.append(
                    ComponentInfo(
                        name=c_name,
                        framework="React",
                        file_path=file_path,
                        relative_path=rel_path,
                        line_number=line_no,
                        props=[],
                        hooks_used=list(set(hooks)),
                        child_components=list(set(jsx_tags)),
                    )
                )
                found_names.add(c_name)

        # If file is named like a component and no component found yet
        stem = Path(file_path).stem
        if stem and stem[0].isupper() and stem not in found_names and Path(file_path).suffix.lower() in (".tsx", ".jsx"):
            hooks = re.findall(r"\b(use[A-Z][A-Za-z0-9_]+)\b", content)
            jsx_tags = [t for t in re.findall(r"<([A-Z][A-Za-z0-9_]+)", content) if t != stem]
            components.append(
                ComponentInfo(
                    name=stem,
                    framework="React",
                    file_path=file_path,
                    relative_path=rel_path,
                    line_number=1,
                    props=[],
                    hooks_used=list(set(hooks)),
                    child_components=list(set(jsx_tags)),
                )
            )

    def _extract_vue_components(
        self, file_path: str, rel_path: str, content: str, ast: FileAST, components: List[ComponentInfo]
    ):
        component_name = Path(file_path).stem
        # Extract child Vue components: <CustomComponent or <custom-component
        child_tags = re.findall(r"<([A-Z][A-Za-z0-9_]+)", content)
        props_matches = re.findall(r"(?:defineProps|props:\s*\[|props:\s*\{)\s*([A-Za-z0-9_,'\"\s]+)", content)
        props = []
        if props_matches:
            props = [p.strip().strip("'\"") for p in props_matches[0].split(",") if p.strip()]

        components.append(
            ComponentInfo(
                name=component_name,
                framework="Vue",
                file_path=file_path,
                relative_path=rel_path,
                line_number=1,
                props=props,
                hooks_used=[],
                child_components=list(set(child_tags)),
            )
        )

    def _extract_svelte_components(
        self, file_path: str, rel_path: str, content: str, ast: FileAST, components: List[ComponentInfo]
    ):
        component_name = Path(file_path).stem
        child_tags = re.findall(r"<([A-Z][A-Za-z0-9_]+)", content)
        props = re.findall(r"export\s+let\s+([A-Za-z0-9_]+)", content)

        components.append(
            ComponentInfo(
                name=component_name,
                framework="Svelte",
                file_path=file_path,
                relative_path=rel_path,
                line_number=1,
                props=props,
                hooks_used=[],
                child_components=list(set(child_tags)),
            )
        )
