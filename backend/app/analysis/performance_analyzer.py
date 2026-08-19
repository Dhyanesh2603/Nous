import os
import re
from pathlib import Path
from typing import Dict, List, Optional, Any
from pydantic import BaseModel, Field

from app.parsers.symbol_types import FileAST


class PerformanceIssue(BaseModel):
    id: str
    title: str
    issue_type: str  # 'n_plus_one_query', 'blocking_async_io', 'nested_loop_complexity', 'memory_heavy_operation'
    severity: str  # 'high', 'medium', 'low'
    file_path: str
    relative_path: str
    line_number: int
    matched_snippet: str
    explanation: str
    optimization_tip: str


class PerformanceReport(BaseModel):
    performance_score: int  # 0 - 100
    grade: str  # 'A', 'B', 'C', 'D', 'F'
    total_issues: int
    n_plus_one_count: int
    blocking_io_count: int
    nested_loop_count: int
    issues: List[PerformanceIssue] = Field(default_factory=list)


ORM_QUERY_PATTERNS = [
    r"\.query\s*\(",
    r"\.find(?:One|Many|Unique)?\s*\(",
    r"\.select\s*\(",
    r"\.execute\s*\(",
    r"\.filter\s*\(",
    r"\.get\s*\(",
    r"axios\.(?:get|post|put|delete)\s*\(",
    r"fetch\s*\(",
    r"requests\.(?:get|post)\s*\(",
]

BLOCKING_IO_PATTERNS = [
    (r"\btime\.sleep\s*\(", "Synchronous sleep in async context", "Use await asyncio.sleep() instead of blocking time.sleep()."),
    (r"\bopen\s*\([^)]*\)\.read", "Synchronous file I/O in async context", "Use aiofiles or offload blocking file reads to asyncio.to_thread()."),
    (r"\brequests\.(?:get|post|put|delete)\s*\(", "Synchronous requests HTTP call in async context", "Use httpx.AsyncClient or aiohttp for non-blocking HTTP requests."),
]


class PerformanceAnalyzer:
    def __init__(self, root_dir: str, file_asts: Optional[Dict[str, FileAST]] = None):
        self.root_dir = os.path.abspath(root_dir)
        self.file_asts = file_asts or {}

    def analyze(self) -> PerformanceReport:
        issues: List[PerformanceIssue] = []

        if not os.path.exists(self.root_dir):
            return PerformanceReport(
                performance_score=100,
                grade="A",
                total_issues=0,
                n_plus_one_count=0,
                blocking_io_count=0,
                nested_loop_count=0,
            )

        for dirpath, dirnames, filenames in os.walk(self.root_dir):
            dirnames[:] = [d for d in dirnames if not d.startswith(".") and d not in ("node_modules", "dist", "build", ".venv", "venv")]
            for f in filenames:
                ext = Path(f).suffix.lower()
                if ext in (".py", ".ts", ".tsx", ".js", ".jsx", ".go", ".rs", ".cs"):
                    file_path = os.path.join(dirpath, f)
                    self._scan_file_performance(file_path, issues)

        n_plus_one_count = sum(1 for i in issues if i.issue_type == "n_plus_one_query")
        blocking_io_count = sum(1 for i in issues if i.issue_type == "blocking_async_io")
        nested_loop_count = sum(1 for i in issues if i.issue_type == "nested_loop_complexity")

        # Score penalty
        penalty = (n_plus_one_count * 15) + (blocking_io_count * 10) + (nested_loop_count * 8)
        performance_score = max(0, 100 - penalty)

        if performance_score >= 90:
            grade = "A"
        elif performance_score >= 80:
            grade = "B"
        elif performance_score >= 70:
            grade = "C"
        elif performance_score >= 60:
            grade = "D"
        else:
            grade = "F"

        return PerformanceReport(
            performance_score=performance_score,
            grade=grade,
            total_issues=len(issues),
            n_plus_one_count=n_plus_one_count,
            blocking_io_count=blocking_io_count,
            nested_loop_count=nested_loop_count,
            issues=issues,
        )

    def _scan_file_performance(self, file_path: str, issues: List[PerformanceIssue]):
        try:
            rel_path = os.path.relpath(file_path, self.root_dir)
            with open(file_path, "r", encoding="utf-8", errors="replace") as f:
                lines = f.readlines()

            in_loop_stack = []  # list of indentations
            in_async_func = False

            for line_idx, line in enumerate(lines, 1):
                stripped = line.strip()
                if not stripped or stripped.startswith(("#", "//", "/*", "*")):
                    continue

                indent = len(line) - len(line.lstrip())

                # Track loop depth
                while in_loop_stack and in_loop_stack[-1] >= indent:
                    in_loop_stack.pop()

                # Check if entering async function
                if re.match(r"(?:async\s+def|async\s+function|async\s*\(|[A-Za-z0-9_]+\s*:\s*async)", stripped):
                    in_async_func = True

                # Check loop header
                if re.match(r"(?:for\s+|while\s+|for\s*\(|while\s*\(|\.forEach|\.map\s*\()", stripped):
                    in_loop_stack.append(indent)
                    
                    # 1. Check Deeply Nested Loop (>= 3 levels)
                    if len(in_loop_stack) >= 3:
                        issues.append(
                            PerformanceIssue(
                                id=f"PERF_{len(issues)+1}",
                                title="High Algorithmic Complexity: 3+ Level Nested Loop",
                                issue_type="nested_loop_complexity",
                                severity="medium",
                                file_path=file_path,
                                relative_path=rel_path,
                                line_number=line_idx,
                                matched_snippet=stripped[:120],
                                explanation=f"Detected {len(in_loop_stack)} levels of nested iteration, causing potential O(n^{len(in_loop_stack)}) execution latency.",
                                optimization_tip="Consider indexing datasets in a hash map (Dict/Set) or vectorizing computations before the inner loop.",
                            )
                        )

                # 2. Check N+1 Database Query inside loop
                if in_loop_stack:
                    for pattern in ORM_QUERY_PATTERNS:
                        if re.search(pattern, stripped):
                            issues.append(
                                PerformanceIssue(
                                    id=f"PERF_{len(issues)+1}",
                                    title="Potential N+1 Database / API Query Inside Loop",
                                    issue_type="n_plus_one_query",
                                    severity="high",
                                    file_path=file_path,
                                    relative_path=rel_path,
                                    line_number=line_idx,
                                    matched_snippet=stripped[:120],
                                    explanation="Invoking database queries or HTTP endpoints inside an iterative loop triggers repeated round-trips (N+1 bottleneck).",
                                    optimization_tip="Batch retrieve data before the loop with IN queries (e.g. SELECT WHERE id IN (...)) or JOIN / prefetch_related.",
                                )
                            )
                            break

                # 3. Check Blocking I/O in Async functions
                if in_async_func:
                    for pattern, title, tip in BLOCKING_IO_PATTERNS:
                        if re.search(pattern, stripped):
                            issues.append(
                                PerformanceIssue(
                                    id=f"PERF_{len(issues)+1}",
                                    title=title,
                                    issue_type="blocking_async_io",
                                    severity="high",
                                    file_path=file_path,
                                    relative_path=rel_path,
                                    line_number=line_idx,
                                    matched_snippet=stripped[:120],
                                    explanation="Synchronous blocking calls block the event loop and prevent all other concurrent requests from progressing.",
                                    optimization_tip=tip,
                                )
                            )

        except Exception as e:
            print(f"[PerformanceAnalyzer] Error scanning {file_path}: {e}")
