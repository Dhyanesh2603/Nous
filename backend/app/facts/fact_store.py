from typing import Dict, List, Set, Optional, Tuple, Any
from collections import defaultdict

from app.facts.fact_types import CodeFact, FactKind, RouteFact, FactSummary, FactQueryResponse


class FactStore:
    """
    High-performance relational Fact Store and multi-index query engine.
    Stores atomic facts and enables fast relational lookups across the codebase.
    """

    def __init__(self):
        self.facts: List[CodeFact] = []
        self.routes: List[RouteFact] = []
        
        # Multi-indexes for fast relational lookups
        self.by_subject: Dict[str, List[CodeFact]] = defaultdict(list)
        self.by_predicate: Dict[str, List[CodeFact]] = defaultdict(list)
        self.by_object: Dict[str, List[CodeFact]] = defaultdict(list)
        self.by_kind: Dict[FactKind, List[CodeFact]] = defaultdict(list)
        self.by_file: Dict[str, List[CodeFact]] = defaultdict(list)

    def load_facts(self, facts: List[CodeFact], routes: List[RouteFact]):
        self.clear()
        self.facts = facts
        self.routes = routes

        for fact in facts:
            self.by_subject[fact.subject_id].append(fact)
            self.by_predicate[fact.predicate].append(fact)
            self.by_object[fact.object_id].append(fact)
            self.by_kind[fact.kind].append(fact)
            self.by_file[fact.file_path].append(fact)

    def clear(self):
        self.facts.clear()
        self.routes.clear()
        self.by_subject.clear()
        self.by_predicate.clear()
        self.by_object.clear()
        self.by_kind.clear()
        self.by_file.clear()

    def query(
        self,
        subject: Optional[str] = None,
        predicate: Optional[str] = None,
        object_: Optional[str] = None,
        kind: Optional[FactKind] = None,
        file_path: Optional[str] = None,
        limit: int = 100,
    ) -> FactQueryResponse:
        # Start with the most specific index candidate
        candidates: Optional[List[CodeFact]] = None

        if subject:
            candidates = self.by_subject.get(subject, [])
        elif object_:
            candidates = self.by_object.get(object_, [])
        elif predicate:
            candidates = self.by_predicate.get(predicate, [])
        elif kind:
            candidates = self.by_kind.get(kind, [])
        elif file_path:
            candidates = self.by_file.get(file_path, [])
        else:
            candidates = self.facts

        results: List[CodeFact] = []
        for f in candidates:
            if subject and f.subject_id != subject and subject not in f.subject_id:
                continue
            if predicate and f.predicate != predicate:
                continue
            if object_ and f.object_id != object_ and object_ not in f.object_id:
                continue
            if kind and f.kind != kind:
                continue
            if file_path and f.file_path != file_path and file_path not in f.relative_path:
                continue
            results.append(f)
            if len(results) >= limit:
                break

        return FactQueryResponse(total_matches=len(results), facts=results)

    def get_symbol_facts(self, symbol_id: str) -> Dict[str, Any]:
        """
        Returns all relational facts where symbol_id is either the subject or the object.
        """
        outgoing = self.by_subject.get(symbol_id, [])
        incoming = self.by_object.get(symbol_id, [])
        
        # Also match by symbol short name if ID didn't match incoming
        short_name = symbol_id.split("::")[-1]
        name_incoming = [f for f in self.by_object.get(short_name, []) if f not in incoming]

        return {
            "symbol_id": symbol_id,
            "short_name": short_name,
            "total_facts": len(outgoing) + len(incoming) + len(name_incoming),
            "outgoing_facts": outgoing,
            "incoming_facts": incoming + name_incoming,
            "calls_made": [f for f in outgoing if f.kind == FactKind.CALL_REF],
            "called_by": [f for f in (incoming + name_incoming) if f.kind == FactKind.CALL_REF],
            "instantiates": [f for f in outgoing if f.kind == FactKind.INSTANTIATES_REF],
            "instantiated_by": [f for f in (incoming + name_incoming) if f.kind == FactKind.INSTANTIATES_REF],
            "inherits_from": [f for f in outgoing if f.kind == FactKind.INHERITS_REF],
            "subclasses": [f for f in (incoming + name_incoming) if f.kind == FactKind.INHERITS_REF],
        }

    def get_routes(self) -> List[RouteFact]:
        return self.routes

    def get_summary(self) -> FactSummary:
        kind_counts = {k.value: len(v) for k, v in self.by_kind.items()}
        return FactSummary(
            total_facts=len(self.facts),
            facts_by_kind=kind_counts,
            total_routes_detected=len(self.routes),
            total_instantiations=len(self.by_kind.get(FactKind.INSTANTIATES_REF, [])),
            total_inheritance_relations=len(self.by_kind.get(FactKind.INHERITS_REF, [])),
        )
