import os
import re
from enum import Enum
from typing import List, Dict, Any, Set, Optional
from pydantic import BaseModel, Field

from app.parsers.symbol_types import FileAST, SymbolKind
from app.graph.graph_store import GraphStore
from app.facts.fact_store import FactStore


class ArchitectureStyle(str, Enum):
    MVC = "MVC"
    MVVM = "MVVM"
    CLEAN = "Clean Architecture"
    HEXAGONAL = "Hexagonal Architecture (Ports & Adapters)"
    ONION = "Onion Architecture"
    DDD = "Domain-Driven Design (DDD)"
    LAYERED = "Layered Architecture (3-Tier / N-Tier)"
    MICROSERVICES = "Microservices Architecture"
    EVENT_DRIVEN = "Event-Driven Architecture"


class DetectedStyle(BaseModel):
    style: ArchitectureStyle
    confidence_score: float  # 0.0 - 1.0
    matched_patterns: List[str]
    evidence_directories: List[str]
    evidence_files: List[str]
    description: str


class LayerItem(BaseModel):
    layer_name: str
    file_count: int
    files: List[str]
    description: str


class LayerBoundaryViolation(BaseModel):
    from_layer: str
    to_layer: str
    from_file: str
    to_file: str
    rule_description: str
    severity: str  # 'high', 'medium', 'low'


class ArchitectureDetectionReport(BaseModel):
    primary_style: ArchitectureStyle
    primary_confidence: float
    detected_styles: List[DetectedStyle] = Field(default_factory=list)
    architectural_layers: List[LayerItem] = Field(default_factory=list)
    layer_boundary_violations: List[LayerBoundaryViolation] = Field(default_factory=list)
    recommendations: List[str] = Field(default_factory=list)


class ArchitectureDetector:
    """
    Automatic Architecture Style & Pattern Detector:
    Analyzes project directory layouts, naming conventions, inheritance patterns,
    and dependency graphs to classify codebase architecture into:
    MVC, MVVM, Clean Architecture, Hexagonal, Onion, DDD, Layered, Microservices, Event-Driven.
    """

    def __init__(
        self,
        graph_store: Optional[GraphStore] = None,
        fact_store: Optional[FactStore] = None,
        file_asts: Optional[Dict[str, FileAST]] = None,
        root_dir: str = "",
    ):
        self.graph_store = graph_store
        self.fact_store = fact_store
        self.file_asts = file_asts or {}
        self.root_dir = root_dir

    def analyze(self) -> ArchitectureDetectionReport:
        rel_files = [ast.relative_path.replace("\\", "/").lower() for ast in self.file_asts.values()]
        dirs_present = {os.path.dirname(f) for f in rel_files if os.path.dirname(f)}

        detected_styles: List[DetectedStyle] = []

        # 1. Clean Architecture Detection
        clean_dirs = [d for d in dirs_present if any(term in d for term in ("domain", "usecases", "use_cases", "entities", "adapters", "infrastructure", "core"))]
        if len(clean_dirs) >= 2:
            score = min(0.95, 0.40 + len(clean_dirs) * 0.15)
            detected_styles.append(
                DetectedStyle(
                    style=ArchitectureStyle.CLEAN,
                    confidence_score=round(score, 2),
                    matched_patterns=["domain/entities core isolation", "use_cases application layer", "infrastructure/adapters boundaries"],
                    evidence_directories=clean_dirs[:5],
                    evidence_files=[f for f in rel_files if any(d in f for d in clean_dirs)][:6],
                    description="Separation of concerns using concentric layers where business domain entities have zero external dependencies.",
                )
            )

        # 2. Hexagonal Architecture (Ports & Adapters)
        hex_dirs = [d for d in dirs_present if any(term in d for term in ("ports", "adapters", "inbound", "outbound", "driven", "driving"))]
        if len(hex_dirs) >= 2 or any("port" in d for d in dirs_present):
            score = min(0.92, 0.50 + len(hex_dirs) * 0.20)
            detected_styles.append(
                DetectedStyle(
                    style=ArchitectureStyle.HEXAGONAL,
                    confidence_score=round(score, 2),
                    matched_patterns=["inbound/outbound ports interfaces", "infrastructure adapters"],
                    evidence_directories=hex_dirs[:5],
                    evidence_files=[f for f in rel_files if any(d in f for d in hex_dirs)][:6],
                    description="Decoupled application core communicating via explicit input/output Ports implemented by Adapters.",
                )
            )

        # 3. MVC (Model-View-Controller)
        mvc_patterns = [
            ("models" in d or "model" in d) for d in dirs_present
        ] + [
            ("views" in d or "view" in d or "templates" in d) for d in dirs_present
        ] + [
            ("controllers" in d or "controller" in d) for d in dirs_present
        ]
        if sum(mvc_patterns) >= 2:
            score = min(0.95, 0.45 + sum(mvc_patterns) * 0.18)
            detected_styles.append(
                DetectedStyle(
                    style=ArchitectureStyle.MVC,
                    confidence_score=round(score, 2),
                    matched_patterns=["controllers/ directory", "models/ schema data layer", "views/ UI presentation layer"],
                    evidence_directories=[d for d in dirs_present if any(t in d for t in ("model", "view", "controller"))][:5],
                    evidence_files=[f for f in rel_files if any(t in f for t in ("model", "view", "controller"))][:6],
                    description="Classic Model-View-Controller pattern separating data representations, UI rendering, and user action routing.",
                )
            )

        # 4. Domain-Driven Design (DDD)
        ddd_dirs = [d for d in dirs_present if any(term in d for term in ("aggregates", "value_objects", "repositories", "domain_events", "bounded_contexts"))]
        if len(ddd_dirs) >= 2 or any("aggregate" in f for f in rel_files):
            score = min(0.90, 0.45 + len(ddd_dirs) * 0.20)
            detected_styles.append(
                DetectedStyle(
                    style=ArchitectureStyle.DDD,
                    confidence_score=round(score, 2),
                    matched_patterns=["aggregates & value objects", "repository interfaces", "domain events"],
                    evidence_directories=ddd_dirs[:5],
                    evidence_files=[f for f in rel_files if any(d in f for d in ddd_dirs)][:6],
                    description="Domain-Driven Design structuring software around business models, bounded contexts, and ubiquitous domain events.",
                )
            )

        # 5. Event-Driven Architecture
        event_indicators = [
            f for f in rel_files
            if any(t in f for t in ("event", "subscriber", "publisher", "consumer", "producer", "listener", "handler", "queue", "kafka", "rabbitmq"))
        ]
        if len(event_indicators) >= 2:
            score = min(0.88, 0.35 + len(event_indicators) * 0.08)
            detected_styles.append(
                DetectedStyle(
                    style=ArchitectureStyle.EVENT_DRIVEN,
                    confidence_score=round(score, 2),
                    matched_patterns=["event publishers/subscribers", "async message consumers", "event bus handlers"],
                    evidence_directories=[os.path.dirname(f) for f in event_indicators[:4]],
                    evidence_files=event_indicators[:6],
                    description="Asynchronous publish-subscribe messaging topology coordinating independent services via domain events.",
                )
            )

        # 6. MVVM
        mvvm_indicators = [f for f in rel_files if "viewmodel" in f or "view_model" in f or "viewmodels" in f]
        if len(mvvm_indicators) >= 1:
            detected_styles.append(
                DetectedStyle(
                    style=ArchitectureStyle.MVVM,
                    confidence_score=0.85,
                    matched_patterns=["viewmodel state bindings", "observable model views"],
                    evidence_directories=[os.path.dirname(f) for f in mvvm_indicators[:4]],
                    evidence_files=mvvm_indicators[:6],
                    description="Model-View-ViewModel separating graphical user interface development from business and state logic.",
                )
            )

        # 7. Layered Architecture (Default fallback if multi-directory structured)
        layered_dirs = [d for d in dirs_present if any(t in d for t in ("routers", "routes", "api", "services", "service", "db", "database", "models", "utils"))]
        if len(layered_dirs) >= 2:
            score = min(0.92, 0.50 + len(layered_dirs) * 0.10)
            detected_styles.append(
                DetectedStyle(
                    style=ArchitectureStyle.LAYERED,
                    confidence_score=round(score, 2),
                    matched_patterns=["presentation/routers layer", "business/services layer", "persistence/database layer"],
                    evidence_directories=layered_dirs[:5],
                    evidence_files=[f for f in rel_files if any(d in f for d in layered_dirs)][:6],
                    description="Multi-tier layered architecture enforcing unidirectional flow from API endpoints through business services to persistence.",
                )
            )

        # 8. Microservices
        pkg_manifests = [f for f in rel_files if f.endswith(("docker-compose.yml", "docker-compose.yaml", "service.yaml", "manifest.yaml"))]
        if len(pkg_manifests) >= 1 or len([d for d in dirs_present if "services/" in d or "microservices/" in d]) >= 2:
            detected_styles.append(
                DetectedStyle(
                    style=ArchitectureStyle.MICROSERVICES,
                    confidence_score=0.80,
                    matched_patterns=["independent service directories", "container orchestration manifests"],
                    evidence_directories=[d for d in dirs_present if "service" in d][:4],
                    evidence_files=pkg_manifests[:4],
                    description="Distributed microservices architecture composed of small, independently deployable autonomous services.",
                )
            )

        # Sort detected styles by confidence
        detected_styles.sort(key=lambda s: s.confidence_score, reverse=True)

        primary_style = detected_styles[0].style if detected_styles else ArchitectureStyle.LAYERED
        primary_conf = detected_styles[0].confidence_score if detected_styles else 0.70

        # Construct Architectural Layers Map
        layers_map: List[LayerItem] = []
        presentation_files = [f for f in rel_files if any(t in f for t in ("route", "router", "controller", "view", "api", "page", "component"))]
        service_files = [f for f in rel_files if any(t in f for t in ("service", "usecase", "use_case", "manager", "pipeline", "processor", "logic"))]
        data_files = [f for f in rel_files if any(t in f for t in ("model", "schema", "entity", "database", "db", "repository", "dao"))]
        infra_files = [f for f in rel_files if any(t in f for t in ("config", "util", "client", "adapter", "middleware", "auth"))]

        if presentation_files:
            layers_map.append(LayerItem(layer_name="Presentation & API Layer", file_count=len(presentation_files), files=presentation_files[:10], description="Inbound HTTP REST routes, controllers, and UI components"))
        if service_files:
            layers_map.append(LayerItem(layer_name="Domain & Application Services", file_count=len(service_files), files=service_files[:10], description="Core business workflows, orchestration, and domain rules"))
        if data_files:
            layers_map.append(LayerItem(layer_name="Persistence & Data Layer", file_count=len(data_files), files=data_files[:10], description="Database entities, ORM tables, schemas, and queries"))
        if infra_files:
            layers_map.append(LayerItem(layer_name="Infrastructure & Utilities", file_count=len(infra_files), files=infra_files[:10], description="Cross-cutting configurations, authentication guards, and adapters"))

        # Check for Layer Boundary Violations (e.g. Data layer importing Presentation layer)
        violations: List[LayerBoundaryViolation] = []
        if self.graph_store and self.graph_store.dep_builder:
            for u, v, data in self.graph_store.dep_graph.edges(data=True):
                u_ast = self.file_asts.get(u)
                v_ast = self.file_asts.get(v)
                if not u_ast or not v_ast:
                    continue
                u_rel = u_ast.relative_path.replace("\\", "/").lower()
                v_rel = v_ast.relative_path.replace("\\", "/").lower()

                # Violation: Database/Domain model importing Router/Controller
                if any(t in u_rel for t in ("model", "schema", "entity")) and any(t in v_rel for t in ("router", "route", "controller")):
                    violations.append(
                        LayerBoundaryViolation(
                            from_layer="Data/Entity Layer",
                            to_layer="Presentation Layer",
                            from_file=u_ast.relative_path,
                            to_file=v_ast.relative_path,
                            rule_description="Domain models should never import presentation controllers or HTTP routers.",
                            severity="high",
                        )
                    )

        recommendations = [
            f"Adhere to strict unidirectional dependencies from {layers_map[0].layer_name if layers_map else 'Presentation'} down to {layers_map[-1].layer_name if layers_map else 'Infrastructure'}.",
            "Maintain pure domain models without framework or database query coupling.",
            "Use dependency injection or interface ports for external network and database clients.",
        ]

        return ArchitectureDetectionReport(
            primary_style=primary_style,
            primary_confidence=primary_conf,
            detected_styles=detected_styles,
            architectural_layers=layers_map,
            layer_boundary_violations=violations,
            recommendations=recommendations,
        )
