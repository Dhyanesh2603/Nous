import os
import re
from enum import Enum
from typing import List, Dict, Any, Set, Optional
from pydantic import BaseModel, Field

from app.parsers.symbol_types import FileAST
from app.facts.fact_store import FactStore
from app.facts.fact_types import FactKind


class ApiProtocol(str, Enum):
    REST = "REST"
    GRAPHQL = "GraphQL"
    GRPC = "gRPC"
    WEBSOCKET = "WebSocket"
    INTERNAL = "Internal"


class ApiEndpoint(BaseModel):
    id: str
    protocol: ApiProtocol
    method: str  # GET, POST, Query, Mutation, RPC, WS
    path: str
    handler_name: str
    file_path: str
    relative_path: str
    line_number: int
    auth_required: bool = False
    inbound_payload_model: Optional[str] = None
    response_model: Optional[str] = None
    service_module: str


class ApiClientCall(BaseModel):
    id: str
    caller_symbol: str
    caller_file: str
    relative_path: str
    line_number: int
    target_url_or_service: str
    http_method: str
    protocol: ApiProtocol
    is_internal_call: bool = False


class ApiDependencyEdge(BaseModel):
    source_service: str
    target_endpoint: str
    protocol: ApiProtocol
    caller_file: str
    call_count: int = 1


class ApiDependencyGraphReport(BaseModel):
    total_endpoints: int
    total_client_calls: int
    total_dependencies: int
    protocol_distribution: Dict[str, int]
    endpoints: List[ApiEndpoint] = Field(default_factory=list)
    client_calls: List[ApiClientCall] = Field(default_factory=list)
    dependency_edges: List[ApiDependencyEdge] = Field(default_factory=list)
    service_nodes: List[Dict[str, Any]] = Field(default_factory=list)
    graph_nodes: List[Dict[str, Any]] = Field(default_factory=list)
    graph_edges: List[Dict[str, Any]] = Field(default_factory=list)


class ApiDependencyMapper:
    """
    API Dependency Mapping Engine:
    Detects REST, GraphQL, gRPC, WebSocket, and Internal APIs.
    Discovers client-side outbound HTTP/RPC calls and builds full API dependency graphs.
    """

    GRAPHQL_PATTERNS = [
        (r"(?:@Query|@Mutation|@Subscription|type\s+(?:Query|Mutation|Subscription))\s*\{?", "GraphQL Definition"),
        (r"(?:buildSchema|graphqlHTTP|ApolloServer|createHandler)\s*\(", "GraphQL Server Entry"),
        (r"(?:gql`|graphql\()", "GraphQL Query Tag"),
    ]

    GRPC_PATTERNS = [
        (r"(?:add_.*_to_server|grpc\.server|grpc\.insecure_channel|ServerCredentials)", "gRPC Python/Node Server"),
        (r"(?:service\s+\w+\s*\{|\brpc\s+\w+\s*\(.*?\)\s*returns)", "gRPC Protobuf Service Definition"),
    ]

    WEBSOCKET_PATTERNS = [
        (r"(?:@app\.websocket|@router\.websocket|ws:\/\/|wss:\/\/|new\s+WebSocket|io\.on\(['\"]connection['\"])", "WebSocket Route Handler"),
    ]

    OUTBOUND_HTTP_PATTERNS = [
        (r"(?:requests\.(get|post|put|delete|patch)|axios\.(get|post|put|delete|patch)|fetch)\s*\(\s*['\"]([^'\"]+)['\"]", "Explicit URL Call"),
        (r"(?:requests\.(get|post|put|delete|patch)|axios\.(get|post|put|delete|patch)|fetch)\s*\(\s*([a-zA-Z0-9_\.]+)", "Dynamic Variable URL Call"),
    ]

    def __init__(
        self,
        fact_store: Optional[FactStore] = None,
        file_asts: Optional[Dict[str, FileAST]] = None,
        root_dir: str = "",
    ):
        self.fact_store = fact_store
        self.file_asts = file_asts or {}
        self.root_dir = root_dir

    def analyze(self) -> ApiDependencyGraphReport:
        endpoints: List[ApiEndpoint] = []
        client_calls: List[ApiClientCall] = []
        dependency_edges: List[ApiDependencyEdge] = []
        protocol_dist: Dict[str, int] = {
            "REST": 0,
            "GraphQL": 0,
            "gRPC": 0,
            "WebSocket": 0,
            "Internal": 0,
        }

        # 1. Detect REST APIs from FactStore and Route Decorators
        if self.fact_store:
            for route in self.fact_store.routes:
                ast = self.file_asts.get(route.file_path)
                rel = ast.relative_path.replace("\\", "/") if ast else os.path.basename(route.file_path)
                service_mod = os.path.dirname(rel) if os.path.dirname(rel) else "root"

                # Check if auth required in code
                auth_req = False
                if ast:
                    matching_sym = next((s for s in ast.symbols if s.name == route.handler_name), None)
                    if matching_sym and matching_sym.decorators:
                        auth_req = any("auth" in d.lower() or "guard" in d.lower() or "login" in d.lower() for d in matching_sym.decorators)

                endpoints.append(
                    ApiEndpoint(
                        id=f"rest::{route.http_method}::{route.route_path}",
                        protocol=ApiProtocol.REST,
                        method=route.http_method,
                        path=route.route_path,
                        handler_name=route.handler_name,
                        file_path=route.file_path,
                        relative_path=rel,
                        line_number=route.line_number,
                        auth_required=auth_req,
                        service_module=service_mod,
                    )
                )
                protocol_dist["REST"] += 1

        # 2. Scan all files for GraphQL, gRPC, WebSocket, and Outbound Client Calls
        for file_path, ast in self.file_asts.items():
            rel = ast.relative_path.replace("\\", "/")
            service_mod = os.path.dirname(rel) if os.path.dirname(rel) else "root"
            content = ast.raw_content or ""
            lines = content.splitlines()

            # GraphQL Detection
            for pat, desc in self.GRAPHQL_PATTERNS:
                for match in re.finditer(pat, content, re.MULTILINE):
                    line_no = content[:match.start()].count("\n") + 1
                    gql_kind = "Query" if "Query" in match.group(0) else ("Mutation" if "Mutation" in match.group(0) else "Schema")
                    ep_id = f"graphql::{gql_kind}::{rel}:L{line_no}"
                    if not any(e.id == ep_id for e in endpoints):
                        endpoints.append(
                            ApiEndpoint(
                                id=ep_id,
                                protocol=ApiProtocol.GRAPHQL,
                                method=gql_kind,
                                path=f"/graphql ({gql_kind})",
                                handler_name=f"GraphQL_{gql_kind}_L{line_no}",
                                file_path=file_path,
                                relative_path=rel,
                                line_number=line_no,
                                auth_required=False,
                                service_module=service_mod,
                            )
                        )
                        protocol_dist["GraphQL"] += 1

            # gRPC Detection
            for pat, desc in self.GRPC_PATTERNS:
                for match in re.finditer(pat, content, re.MULTILINE):
                    line_no = content[:match.start()].count("\n") + 1
                    ep_id = f"grpc::RPC::{rel}:L{line_no}"
                    if not any(e.id == ep_id for e in endpoints):
                        endpoints.append(
                            ApiEndpoint(
                                id=ep_id,
                                protocol=ApiProtocol.GRPC,
                                method="RPC",
                                path=f"gRPC Service [{os.path.basename(file_path)}]",
                                handler_name=f"gRPC_Service_L{line_no}",
                                file_path=file_path,
                                relative_path=rel,
                                line_number=line_no,
                                auth_required=False,
                                service_module=service_mod,
                            )
                        )
                        protocol_dist["gRPC"] += 1

            # WebSocket Detection
            for pat, desc in self.WEBSOCKET_PATTERNS:
                for match in re.finditer(pat, content, re.MULTILINE):
                    line_no = content[:match.start()].count("\n") + 1
                    ep_id = f"ws::{rel}:L{line_no}"
                    if not any(e.id == ep_id for e in endpoints):
                        endpoints.append(
                            ApiEndpoint(
                                id=ep_id,
                                protocol=ApiProtocol.WEBSOCKET,
                                method="WS",
                                path="/ws (WebSocket stream)",
                                handler_name=f"ws_handler_L{line_no}",
                                file_path=file_path,
                                relative_path=rel,
                                line_number=line_no,
                                auth_required=False,
                                service_module=service_mod,
                            )
                        )
                        protocol_dist["WebSocket"] += 1

            # Outbound HTTP Client Call Detection
            for idx, line in enumerate(lines):
                for pat, desc in self.OUTBOUND_HTTP_PATTERNS:
                    m = re.search(pat, line, re.IGNORECASE)
                    if m:
                        method = m.group(1).upper() if len(m.groups()) >= 1 and m.group(1) else "GET"
                        url = m.group(2) if len(m.groups()) >= 2 and m.group(2) else "/api"

                        # Check if internal service call
                        is_internal = any(ep.path in url or (url.startswith("/") and ep.path.startswith(url)) for ep in endpoints)
                        if is_internal:
                            protocol_dist["Internal"] += 1

                        client_calls.append(
                            ApiClientCall(
                                id=f"call_{len(client_calls) + 1}",
                                caller_symbol=f"L{idx + 1}",
                                caller_file=file_path,
                                relative_path=rel,
                                line_number=idx + 1,
                                target_url_or_service=url,
                                http_method=method,
                                protocol=ApiProtocol.INTERNAL if is_internal else ApiProtocol.REST,
                                is_internal_call=is_internal,
                            )
                        )

        # 3. Construct Service-to-API Dependency Edges
        service_names: Set[str] = set()
        for ep in endpoints:
            service_names.add(ep.service_module)

        for call in client_calls:
            caller_service = os.path.dirname(call.relative_path) if os.path.dirname(call.relative_path) else "root"
            target_match = next((ep for ep in endpoints if ep.path in call.target_url_or_service or call.target_url_or_service.startswith(ep.path)), None)
            target_name = target_match.path if target_match else call.target_url_or_service

            dependency_edges.append(
                ApiDependencyEdge(
                    source_service=caller_service,
                    target_endpoint=target_name,
                    protocol=call.protocol,
                    caller_file=call.relative_path,
                    call_count=1,
                )
            )

        # 4. Generate Graph Nodes & Edges for Visual React Flow Canvas
        graph_nodes: List[Dict[str, Any]] = []
        graph_edges: List[Dict[str, Any]] = []
        seen_nodes: Set[str] = set()

        # Add Service Group Nodes
        for idx, s_name in enumerate(sorted(service_names)):
            s_id = f"svc_{s_name}"
            seen_nodes.add(s_id)
            graph_nodes.append({
                "id": s_id,
                "type": "moduleNode",
                "data": {"label": f"Service: {s_name}", "kind": "service"},
                "position": {"x": 50 + (idx % 3) * 260, "y": 50 + (idx // 3) * 160},
            })

        # Add Endpoint Nodes
        for idx, ep in enumerate(endpoints[:30]):
            ep_node_id = f"ep_{idx}"
            seen_nodes.add(ep_node_id)
            graph_nodes.append({
                "id": ep_node_id,
                "type": "fileNode",
                "data": {
                    "label": f"[{ep.method}] {ep.path}",
                    "protocol": ep.protocol.value,
                    "handler": ep.handler_name,
                    "authRequired": ep.auth_required,
                },
                "position": {"x": 80 + (idx % 4) * 220, "y": 300 + (idx // 4) * 90},
            })

            # Connect Service to Endpoint
            svc_id = f"svc_{ep.service_module}"
            if svc_id in seen_nodes:
                graph_edges.append({
                    "id": f"e_svc_ep_{idx}",
                    "source": svc_id,
                    "target": ep_node_id,
                    "label": "exposes",
                    "animated": False,
                })

        # Add Client Call Edges
        for idx, call in enumerate(client_calls[:20]):
            caller_svc_id = f"svc_{os.path.dirname(call.relative_path) or 'root'}"
            # Find matching endpoint node
            target_ep_node = next((n["id"] for n in graph_nodes if call.target_url_or_service in n["data"].get("label", "")), None)
            if target_ep_node and caller_svc_id in seen_nodes:
                graph_edges.append({
                    "id": f"e_client_call_{idx}",
                    "source": caller_svc_id,
                    "target": target_ep_node,
                    "label": f"calls [{call.http_method}]",
                    "animated": True,
                })

        return ApiDependencyGraphReport(
            total_endpoints=len(endpoints),
            total_client_calls=len(client_calls),
            total_dependencies=len(dependency_edges),
            protocol_distribution=protocol_dist,
            endpoints=endpoints,
            client_calls=client_calls,
            dependency_edges=dependency_edges,
            service_nodes=[{"name": s} for s in service_names],
            graph_nodes=graph_nodes,
            graph_edges=graph_edges,
        )
