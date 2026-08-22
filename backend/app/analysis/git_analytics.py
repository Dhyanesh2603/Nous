from typing import Dict, List, Set, Optional, Tuple, Any
import os
import subprocess
import math
from pydantic import BaseModel, Field

from app.parsers.symbol_types import FileAST
from app.graph.graph_store import GraphStore


class FileChurnMetric(BaseModel):
    file_path: str
    relative_path: str
    total_commits: int = 0
    lines_added: int = 0
    lines_deleted: int = 0
    total_churn: int = 0
    author_count: int = 0
    top_author: Optional[str] = None
    last_modified_date: Optional[str] = None
    complexity: int = 1
    hotspot_score: float = 0.0
    quadrant: str = "stable"  # 'critical_hotspot', 'complex_legacy', 'frequent_churn', 'stable'


class GitChurnReport(BaseModel):
    is_git_repo: bool
    total_commits_analyzed: int
    total_authors: int
    files: List[FileChurnMetric]
    critical_hotspots_count: int
    complex_legacy_count: int
    frequent_churn_count: int
    stable_count: int


class GitChurnAnalyzer:
    def __init__(self, root_dir: str, graph_store: GraphStore):
        self.root_dir = os.path.abspath(root_dir)
        self.graph_store = graph_store

    def _resolve_git_dir(self) -> Optional[str]:
        target = self.root_dir
        if os.path.isfile(target):
            target = os.path.dirname(target)
        try:
            res = subprocess.run(
                ["git", "rev-parse", "--show-toplevel"],
                cwd=target,
                capture_output=True,
                text=True,
                check=False,
                encoding="utf-8",
                errors="replace",
                timeout=5,
            )
            if res.returncode == 0 and res.stdout.strip():
                top = res.stdout.strip()
                if os.path.exists(top):
                    return top
        except Exception:
            pass

        curr = target
        while curr:
            if os.path.exists(os.path.join(curr, ".git")):
                return curr
            parent = os.path.dirname(curr)
            if parent == curr:
                break
            curr = parent
        return None

    def analyze(self) -> GitChurnReport:
        git_dir = self._resolve_git_dir()
        is_git = bool(git_dir and os.path.exists(git_dir))
        file_stats: Dict[str, Dict[str, Any]] = {}
        
        # Initialize default stats for all parsed files
        for fpath, fast in self.graph_store.file_asts.items():
            rel = fast.relative_path.replace("\\", "/")
            # Compute total cyclomatic complexity for file
            total_cc = sum(s.cyclomatic_complexity for s in fast.symbols) if fast.symbols else 1
            file_stats[rel] = {
                "file_path": fpath,
                "relative_path": rel,
                "commits": 0,
                "added": 0,
                "deleted": 0,
                "authors": set(),
                "last_modified": None,
                "complexity": total_cc,
            }

        total_commits = 0
        all_authors: Set[str] = set()

        if is_git and git_dir:
            try:
                # Query total commits count directly
                c_count_proc = subprocess.run(
                    ["git", "-C", git_dir, "rev-list", "--count", "HEAD"],
                    capture_output=True,
                    text=True,
                    encoding="utf-8",
                    errors="replace",
                    timeout=5,
                )
                if c_count_proc.returncode == 0 and c_count_proc.stdout.strip().isdigit():
                    total_commits = int(c_count_proc.stdout.strip())
            except Exception:
                pass

            try:
                # Run git log with numstat
                cmd = ["git", "-C", git_dir, "log", "--numstat", '--pretty=format:COMMIT:%H|%an|%ad', "--date=short", "-n", "100"]
                proc = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True, encoding="utf-8", errors="replace", timeout=15)
                
                if proc.returncode == 0:
                    current_author = None
                    current_date = None
                    parsed_commits_count = 0
                    
                    for line in proc.stdout.splitlines():
                        line = line.strip()
                        if not line:
                            continue
                        
                        if line.startswith("COMMIT:"):
                            parsed_commits_count += 1
                            parts = line[7:].split("|")
                            current_author = parts[1] if len(parts) > 1 else "Unknown"
                            current_date = parts[2] if len(parts) > 2 else ""
                            all_authors.add(current_author)
                        else:
                            # Numstat line: <added> <deleted> <filename>
                            numstat_parts = line.split("\t")
                            if len(numstat_parts) >= 3:
                                added_str, deleted_str, raw_rel_path = numstat_parts[0], numstat_parts[1], numstat_parts[2]
                                norm_rel = raw_rel_path.replace("\\", "/")
                                
                                added = int(added_str) if added_str.isdigit() else 0
                                deleted = int(deleted_str) if deleted_str.isdigit() else 0
                                
                                # Match in file_stats by direct or suffix path
                                for rel_key, f_entry in file_stats.items():
                                    if rel_key == norm_rel or rel_key.endswith(norm_rel) or norm_rel.endswith(rel_key):
                                        f_entry["commits"] += 1
                                        f_entry["added"] += added
                                        f_entry["deleted"] += deleted
                                        if current_author:
                                            f_entry["authors"].add(current_author)
                                        if not f_entry["last_modified"] and current_date:
                                            f_entry["last_modified"] = current_date
                    
                    if total_commits == 0:
                        total_commits = parsed_commits_count
            except Exception as e:
                print(f"[GitChurn] Log extraction error: {e}")

        # Compute hotspot scores and classify into quadrants
        metrics_list: List[FileChurnMetric] = []
        churn_values = [d["added"] + d["deleted"] for d in file_stats.values() if (d["added"] + d["deleted"]) > 0]
        median_churn = (sorted(churn_values)[len(churn_values) // 2]) if churn_values else 10

        critical_count = 0
        legacy_count = 0
        frequent_count = 0
        stable_count = 0

        for rel, data in file_stats.items():
            total_churn = data["added"] + data["deleted"]
            author_count = len(data["authors"])
            complexity = data["complexity"]
            
            # Hotspot formula: complexity * ln(churn + 2) * max(1, author_count)
            hotspot_score = round(float(complexity * math.log(total_churn + 2) * max(1, author_count)), 2)
            
            # Quadrant classification
            is_high_complexity = complexity >= 4
            is_high_churn = total_churn >= median_churn and total_churn > 0

            if is_high_complexity and is_high_churn:
                quadrant = "critical_hotspot"
                critical_count += 1
            elif is_high_complexity and not is_high_churn:
                quadrant = "complex_legacy"
                legacy_count += 1
            elif not is_high_complexity and is_high_churn:
                quadrant = "frequent_churn"
                frequent_count += 1
            else:
                quadrant = "stable"
                stable_count += 1

            top_author = list(data["authors"])[0] if data["authors"] else None

            metrics_list.append(
                FileChurnMetric(
                    file_path=data["file_path"],
                    relative_path=data["relative_path"],
                    total_commits=data["commits"],
                    lines_added=data["added"],
                    lines_deleted=data["deleted"],
                    total_churn=total_churn,
                    author_count=author_count,
                    top_author=top_author,
                    last_modified_date=data["last_modified"],
                    complexity=complexity,
                    hotspot_score=hotspot_score,
                    quadrant=quadrant,
                )
            )

        # Sort by hotspot score descending
        sorted_metrics = sorted(metrics_list, key=lambda x: x.hotspot_score, reverse=True)

        return GitChurnReport(
            is_git_repo=is_git,
            total_commits_analyzed=total_commits,
            total_authors=len(all_authors),
            files=sorted_metrics,
            critical_hotspots_count=critical_count,
            complex_legacy_count=legacy_count,
            frequent_churn_count=frequent_count,
            stable_count=stable_count,
        )
