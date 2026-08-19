import os
import json
import re
from pathlib import Path
from typing import Dict, List, Optional, Any
from pydantic import BaseModel, Field


class ThirdPartyDependency(BaseModel):
    name: str
    version_spec: str
    ecosystem: str  # 'npm', 'pypi', 'go', 'cargo'
    manifest_file: str
    license_category: str  # 'Permissive (MIT/Apache)', 'Copyleft (GPL)', 'Commercial', 'Unknown'
    is_dev_dependency: bool = False
    usage_count_in_code: int = 0
    imported_in_files: List[str] = Field(default_factory=list)


class SupplyChainReport(BaseModel):
    manifests_found: List[str] = Field(default_factory=list)
    total_dependencies: int = 0
    direct_dependencies_count: int = 0
    dev_dependencies_count: int = 0
    copyleft_licenses_count: int = 0
    dependencies: List[ThirdPartyDependency] = Field(default_factory=list)


class DependencyAnalyzer:
    def __init__(self, root_dir: str):
        self.root_dir = os.path.abspath(root_dir)

    def analyze(self) -> SupplyChainReport:
        dependencies: List[ThirdPartyDependency] = []
        manifests = []

        if not os.path.exists(self.root_dir):
            return SupplyChainReport()

        # 1. Check Node package.json
        pkg_json_path = os.path.join(self.root_dir, "package.json")
        frontend_pkg_path = os.path.join(self.root_dir, "frontend", "package.json")
        for p in (pkg_json_path, frontend_pkg_path):
            if os.path.exists(p):
                manifests.append(os.path.relpath(p, self.root_dir))
                self._parse_package_json(p, dependencies)

        # 2. Check Python requirements.txt / pyproject.toml
        req_path = os.path.join(self.root_dir, "requirements.txt")
        backend_req_path = os.path.join(self.root_dir, "backend", "requirements.txt")
        pyproject_path = os.path.join(self.root_dir, "pyproject.toml")
        backend_pyproject_path = os.path.join(self.root_dir, "backend", "pyproject.toml")
        
        for p in (req_path, backend_req_path):
            if os.path.exists(p):
                manifests.append(os.path.relpath(p, self.root_dir))
                self._parse_requirements_txt(p, dependencies)

        for p in (pyproject_path, backend_pyproject_path):
            if os.path.exists(p):
                manifests.append(os.path.relpath(p, self.root_dir))
                self._parse_pyproject_toml(p, dependencies)

        # 3. Check Go go.mod
        go_mod_path = os.path.join(self.root_dir, "go.mod")
        if os.path.exists(go_mod_path):
            manifests.append(os.path.relpath(go_mod_path, self.root_dir))
            self._parse_go_mod(go_mod_path, dependencies)

        # 4. Check Rust Cargo.toml
        cargo_path = os.path.join(self.root_dir, "Cargo.toml")
        if os.path.exists(cargo_path):
            manifests.append(os.path.relpath(cargo_path, self.root_dir))
            self._parse_cargo_toml(cargo_path, dependencies)

        # 5. Scan usage of packages across codebase
        self._count_package_usages(dependencies)

        dev_count = sum(1 for d in dependencies if d.is_dev_dependency)
        copyleft_count = sum(1 for d in dependencies if "Copyleft" in d.license_category)

        return SupplyChainReport(
            manifests_found=list(set(manifests)),
            total_dependencies=len(dependencies),
            direct_dependencies_count=len(dependencies) - dev_count,
            dev_dependencies_count=dev_count,
            copyleft_licenses_count=copyleft_count,
            dependencies=dependencies,
        )

    def _parse_package_json(self, file_path: str, dependencies: List[ThirdPartyDependency]):
        try:
            rel = os.path.relpath(file_path, self.root_dir)
            with open(file_path, "r", encoding="utf-8", errors="replace") as f:
                data = json.load(f)

            deps = data.get("dependencies", {})
            for name, ver in deps.items():
                dependencies.append(
                    ThirdPartyDependency(
                        name=name,
                        version_spec=ver,
                        ecosystem="npm",
                        manifest_file=rel,
                        license_category="Permissive (MIT/Apache)",
                        is_dev_dependency=False,
                    )
                )

            dev_deps = data.get("devDependencies", {})
            for name, ver in dev_deps.items():
                dependencies.append(
                    ThirdPartyDependency(
                        name=name,
                        version_spec=ver,
                        ecosystem="npm",
                        manifest_file=rel,
                        license_category="Permissive (MIT/Apache)",
                        is_dev_dependency=True,
                    )
                )
        except Exception:
            pass

    def _parse_requirements_txt(self, file_path: str, dependencies: List[ThirdPartyDependency]):
        try:
            rel = os.path.relpath(file_path, self.root_dir)
            with open(file_path, "r", encoding="utf-8", errors="replace") as f:
                for line in f:
                    stripped = line.strip()
                    if not stripped or stripped.startswith("#"):
                        continue
                    parts = re.split(r"[><=~!]", stripped, 1)
                    pkg_name = parts[0].strip()
                    pkg_ver = stripped[len(pkg_name):].strip() if len(parts) > 1 else "*"
                    if pkg_name:
                        dependencies.append(
                            ThirdPartyDependency(
                                name=pkg_name,
                                version_spec=pkg_ver or "latest",
                                ecosystem="pypi",
                                manifest_file=rel,
                                license_category="Permissive (MIT/Apache/BSD)",
                                is_dev_dependency=False,
                            )
                        )
        except Exception:
            pass

    def _parse_pyproject_toml(self, file_path: str, dependencies: List[ThirdPartyDependency]):
        try:
            rel = os.path.relpath(file_path, self.root_dir)
            with open(file_path, "r", encoding="utf-8", errors="replace") as f:
                content = f.read()

            deps_matches = re.findall(r'["\']([a-zA-Z0-9_\-]+)(?:[><=~!^].*)?["\']', content)
            for pkg in deps_matches:
                if pkg and pkg not in ("dependencies", "project", "build-system", "tool", "pytest"):
                    if not any(d.name.lower() == pkg.lower() for d in dependencies):
                        dependencies.append(
                            ThirdPartyDependency(
                                name=pkg,
                                version_spec="*",
                                ecosystem="pypi",
                                manifest_file=rel,
                                license_category="Permissive (MIT/Apache)",
                                is_dev_dependency=False,
                            )
                        )
        except Exception:
            pass

    def _parse_go_mod(self, file_path: str, dependencies: List[ThirdPartyDependency]):
        try:
            rel = os.path.relpath(file_path, self.root_dir)
            with open(file_path, "r", encoding="utf-8", errors="replace") as f:
                for line in f:
                    line = line.strip()
                    if line.startswith("require ") or (len(line.split()) == 2 and "/" in line):
                        tokens = line.replace("require ", "").split()
                        if len(tokens) >= 2:
                            dependencies.append(
                                ThirdPartyDependency(
                                    name=tokens[0],
                                    version_spec=tokens[1],
                                    ecosystem="go",
                                    manifest_file=rel,
                                    license_category="Permissive (Apache/BSD/MIT)",
                                    is_dev_dependency=False,
                                )
                            )
        except Exception:
            pass

    def _parse_cargo_toml(self, file_path: str, dependencies: List[ThirdPartyDependency]):
        try:
            rel = os.path.relpath(file_path, self.root_dir)
            with open(file_path, "r", encoding="utf-8", errors="replace") as f:
                content = f.read()

            in_deps = False
            for line in content.splitlines():
                line = line.strip()
                if line.startswith("[dependencies]"):
                    in_deps = True
                    continue
                if line.startswith("[") and in_deps:
                    in_deps = False
                    continue
                if in_deps and "=" in line:
                    parts = line.split("=", 1)
                    pkg_name = parts[0].strip()
                    pkg_ver = parts[1].strip().strip('"\'')
                    dependencies.append(
                        ThirdPartyDependency(
                            name=pkg_name,
                            version_spec=pkg_ver,
                            ecosystem="cargo",
                            manifest_file=rel,
                            license_category="Permissive (MIT/Apache)",
                            is_dev_dependency=False,
                        )
                    )
        except Exception:
            pass

    def _count_package_usages(self, dependencies: List[ThirdPartyDependency]):
        # Fast scan to see which source files import these packages
        pkg_names = {d.name.lower(): d for d in dependencies}
        for dirpath, dirnames, filenames in os.walk(self.root_dir):
            dirnames[:] = [d for d in dirnames if not d.startswith(".") and d not in ("node_modules", "dist", "build", ".venv", "venv")]
            for f in filenames:
                ext = Path(f).suffix.lower()
                if ext in (".py", ".ts", ".tsx", ".js", ".jsx", ".go", ".rs"):
                    file_path = os.path.join(dirpath, f)
                    rel = os.path.relpath(file_path, self.root_dir)
                    try:
                        with open(file_path, "r", encoding="utf-8", errors="replace") as sf:
                            code = sf.read()
                        for name, dep in pkg_names.items():
                            if name in code:
                                dep.usage_count_in_code += 1
                                if rel not in dep.imported_in_files and len(dep.imported_in_files) < 6:
                                    dep.imported_in_files.append(rel)
                    except Exception:
                        pass
