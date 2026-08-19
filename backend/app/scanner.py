import os
from pathlib import Path
from typing import Dict, List, Set, Optional, Tuple, Any
from app.config import settings
from app.parsers.factory import ParserFactory
from app.parsers.symbol_types import FileAST
from app.graph.graph_store import GraphStore
from app.search.hybrid_search import HybridSearchEngine
from app.analysis.metrics import CodeQualityAnalyzer
from app.analysis.git_analytics import GitChurnAnalyzer
from app.analysis.clone_detector import CodeCloneDetector
from app.graph.sequence_generator import SequenceDiagramGenerator
from app.analysis.rules_engine import ArchitectureRulesEngine
from app.analysis.pattern_detector import DesignPatternDetector
from app.facts.fact_extractor import FactExtractor
from app.facts.fact_store import FactStore


class RepoScanner:
    def __init__(self, root_dir: str):
        self.root_dir = os.path.abspath(root_dir)
        self.is_single_file = os.path.isfile(self.root_dir)
        self.factory = ParserFactory()
        self.file_asts: Dict[str, FileAST] = {}
        
        # In single file mode, root_dir parent is used for path relativity
        base_dir = os.path.dirname(self.root_dir) if self.is_single_file else self.root_dir
        self.graph_store = GraphStore(base_dir)
        self.search_engine = HybridSearchEngine(base_dir)
        self.analyzer = CodeQualityAnalyzer(self.graph_store)
        self.git_analyzer = GitChurnAnalyzer(base_dir, self.graph_store)
        self.clone_detector = CodeCloneDetector(self.graph_store)
        self.sequence_generator = SequenceDiagramGenerator(self.graph_store)
        self.rules_engine = ArchitectureRulesEngine(self.graph_store)
        self.pattern_detector = DesignPatternDetector(self.graph_store)
        
        # RipEx Fact Extraction & Relational Store
        self.fact_extractor = FactExtractor()
        self.fact_store = FactStore()

    def scan_and_index(self) -> Dict[str, Any]:
        self.file_asts.clear()
        
        # 1. Single file scan
        if self.is_single_file:
            self._process_file(self.root_dir)
        else:
            # 2. Directory walk
            for dirpath, dirnames, filenames in os.walk(self.root_dir):
                # Prune ignored directories in-place
                dirnames[:] = [
                    d for d in dirnames
                    if d not in settings.DEFAULT_IGNORE_DIRS and not d.startswith(".")
                ]
                
                for filename in filenames:
                    file_path = os.path.join(dirpath, filename)
                    ext = Path(filename).suffix.lower()
                    
                    if ext in settings.SUPPORTED_EXTENSIONS:
                        self._process_file(file_path)

        # Update graph and search indexes
        self.graph_store.set_file_asts(self.file_asts)
        self.search_engine.index_repository(self.file_asts)

        # RipEx Fact Extraction & Relational Store Loading
        facts, routes = self.fact_extractor.extract_facts(self.file_asts)
        self.fact_store.load_facts(facts, routes)
        
        return {
            "root_dir": self.root_dir,
            "is_single_file": self.is_single_file,
            "total_files_parsed": len(self.file_asts),
            "total_symbols": len(self.search_engine.symbols),
            "total_chunks": len(self.search_engine.chunks),
            "total_facts": len(self.fact_store.facts),
            "total_routes": len(self.fact_store.routes),
            "languages": list({ast.language for ast in self.file_asts.values()}),
        }

    def _process_file(self, file_path: str):
        try:
            stat = os.stat(file_path)
            if stat.st_size > settings.MAX_FILE_SIZE_BYTES:
                return

            with open(file_path, "r", encoding="utf-8", errors="replace") as f:
                content = f.read()

            base_dir = os.path.dirname(self.root_dir) if self.is_single_file else self.root_dir
            rel_path = os.path.relpath(file_path, base_dir)
            parser = self.factory.get_parser_for_file(file_path)
            if parser:
                ast = parser.parse_file(file_path, rel_path, content)
                self.file_asts[file_path] = ast
        except Exception as e:
            print(f"[Scanner] Error parsing {file_path}: {e}")
