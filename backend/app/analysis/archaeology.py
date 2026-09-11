import os
import re
import subprocess
from typing import List, Dict, Any, Optional
from pydantic import BaseModel, Field

from app.scanner import RepoScanner
from app.ai.llm_client import LLMClient, LLMMessage


class LegacyFlagItem(BaseModel):
    file: str
    line_number: int
    flag_type: str  # 'HACK', 'FIXME', 'TODO', 'LEGACY', 'DEPRECATED', 'WORKAROUND', 'DO_NOT_REMOVE'
    comment_text: str
    context: str
    severity: str = "medium"  # 'critical', 'high', 'medium', 'low'


class CommitInfo(BaseModel):
    hash: str
    short_hash: str
    author: str
    timestamp: str
    message: str


class ArchaeologyResponse(BaseModel):
    target: str
    summary: str
    origin_commit: Optional[CommitInfo] = None
    recent_changes: List[CommitInfo] = Field(default_factory=list)
    original_author: str = "Unknown"
    total_revisions: int = 0
    authors_involved: List[str] = Field(default_factory=list)
    risk_level: str = "Low"  # 'Low', 'Medium', 'High', 'Critical'
    legacy_flags: List[LegacyFlagItem] = Field(default_factory=list)
    primary_purpose: str = "General Business Logic"
    suggested_refactor_priority: str = "P3 - Low"


class LegacyFlagDetector:
    """
    Scans source code for technical debt flags and legacy safety markers.
    """

    PATTERNS = {
        "HACK": (re.compile(r'(?:#|//|/\*)\s*HACK[:\s]*(.*)', re.IGNORECASE), "high"),
        "FIXME": (re.compile(r'(?:#|//|/\*)\s*FIXME[:\s]*(.*)', re.IGNORECASE), "high"),
        "DO_NOT_REMOVE": (re.compile(r'(?:#|//|/\*)\s*(?:DO NOT REMOVE|DONT REMOVE)[:\s]*(.*)', re.IGNORECASE), "critical"),
        "DEPRECATED": (re.compile(r'(?:#|//|/\*)\s*DEPRECATED[:\s]*(.*)', re.IGNORECASE), "medium"),
        "WORKAROUND": (re.compile(r'(?:#|//|/\*)\s*WORKAROUND[:\s]*(.*)', re.IGNORECASE), "medium"),
        "LEGACY": (re.compile(r'(?:#|//|/\*)\s*LEGACY[:\s]*(.*)', re.IGNORECASE), "medium"),
        "TODO": (re.compile(r'(?:#|//|/\*)\s*TODO[:\s]*(.*)', re.IGNORECASE), "low"),
    }

    def scan_file(self, file_path: str, repo_root: str = ".") -> List[LegacyFlagItem]:
        findings: List[LegacyFlagItem] = []
        full_path = file_path if os.path.isabs(file_path) else os.path.join(repo_root, file_path)

        if not os.path.exists(full_path) or os.path.isdir(full_path):
            return findings

        try:
            with open(full_path, "r", encoding="utf-8", errors="replace") as f:
                for line_idx, line in enumerate(f, start=1):
                    for flag_name, (pattern, severity) in self.PATTERNS.items():
                        match = pattern.search(line)
                        if match:
                            raw_comment = match.group(1).strip() if match.group(1) else line.strip()
                            rel_file = os.path.relpath(full_path, repo_root) if os.path.exists(repo_root) else file_path
                            findings.append(
                                LegacyFlagItem(
                                    file=rel_file.replace("\\", "/"),
                                    line_number=line_idx,
                                    flag_type=flag_name,
                                    comment_text=raw_comment or line.strip(),
                                    context=line.strip(),
                                    severity=severity,
                                )
                            )
        except Exception:
            pass

        return findings

    def scan_repo(self, repo_root: str, file_list: Optional[List[str]] = None) -> List[LegacyFlagItem]:
        all_flags: List[LegacyFlagItem] = []
        target_files = file_list or []

        if not target_files and os.path.exists(repo_root):
            valid_exts = {".py", ".ts", ".tsx", ".js", ".jsx", ".go", ".java", ".rs", ".sql"}
            for root, dirs, files in os.walk(repo_root):
                dirs[:] = [d for d in dirs if not d.startswith(".") and d not in ("node_modules", "venv", "__pycache__", "dist")]
                for f in files:
                    ext = os.path.splitext(f)[1].lower()
                    if ext in valid_exts:
                        target_files.append(os.path.join(root, f))

        for f in target_files:
            all_flags.extend(self.scan_file(f, repo_root))

        return all_flags


class ArchaeologyEngine:
    """
    Code Archaeology Engine:
    Answers "Why does this code exist?" by mining temporal git history,
    tracing author rationale, extracting legacy safety flags, and synthesizing origin stories.
    """

    def __init__(self, scanner: Optional[RepoScanner] = None, llm_client: Optional[LLMClient] = None):
        self.scanner = scanner
        self.root_dir = scanner.root_dir if scanner else "."
        self.llm_client = llm_client or LLMClient()
        self.detector = LegacyFlagDetector()

    def investigate(self, target_file: str, symbol_name: Optional[str] = None) -> ArchaeologyResponse:
        full_path = os.path.join(self.root_dir, target_file) if not os.path.isabs(target_file) else target_file
        rel_path = os.path.relpath(full_path, self.root_dir).replace("\\", "/")

        # 1. Mine git history for target file
        commits = self._mine_git_history(rel_path)
        origin_commit = commits[-1] if commits else None
        recent_changes = commits[:8]
        authors = list(dict.fromkeys(c.author for c in commits))
        total_revisions = len(commits)

        # 2. Scan for legacy flags in file
        legacy_flags = self.detector.scan_file(full_path, self.root_dir)

        # 3. Determine risk level
        crit_flags = sum(1 for f in legacy_flags if f.severity in ("critical", "high"))
        if total_revisions > 25 or crit_flags >= 3:
            risk_level = "Critical"
            priority = "P0 - Immediate Review"
        elif total_revisions > 12 or crit_flags >= 1:
            risk_level = "High"
            priority = "P1 - High Priority"
        elif total_revisions > 4 or len(legacy_flags) > 0:
            risk_level = "Medium"
            priority = "P2 - Medium"
        else:
            risk_level = "Low"
            priority = "P3 - Low"

        # 4. Synthesize primary purpose
        purpose = self._deduce_primary_purpose(rel_path)

        # 5. Synthesize origin explanation
        summary = self._synthesize_origin_summary(rel_path, symbol_name, origin_commit, recent_changes, legacy_flags, purpose)

        original_author = origin_commit.author if origin_commit else (authors[0] if authors else "Unknown")

        return ArchaeologyResponse(
            target=f"{rel_path}::{symbol_name}" if symbol_name else rel_path,
            summary=summary,
            origin_commit=origin_commit,
            recent_changes=recent_changes,
            original_author=original_author,
            total_revisions=total_revisions,
            authors_involved=authors[:10],
            risk_level=risk_level,
            legacy_flags=legacy_flags,
            primary_purpose=purpose,
            suggested_refactor_priority=priority,
        )

    def _mine_git_history(self, rel_path: str) -> List[CommitInfo]:
        commits: List[CommitInfo] = []
        try:
            cmd = [
                "git", "log", "--follow", "--pretty=format:%H|||%h|||%an|||%ad|||%s",
                "--date=iso", "-n", "30", "--", rel_path
            ]
            res = subprocess.run(
                cmd,
                cwd=self.root_dir,
                capture_output=True,
                text=True,
                check=False,
                encoding="utf-8",
                errors="replace",
                timeout=5,
            )
            if res.returncode == 0 and res.stdout.strip():
                for line in res.stdout.strip().splitlines():
                    parts = line.split("|||")
                    if len(parts) >= 5:
                        commits.append(
                            CommitInfo(
                                hash=parts[0].strip(),
                                short_hash=parts[1].strip(),
                                author=parts[2].strip(),
                                timestamp=parts[3].strip(),
                                message=parts[4].strip(),
                            )
                        )
        except Exception:
            pass

        return commits

    def _deduce_primary_purpose(self, rel_path: str) -> str:
        low = rel_path.lower()
        if "auth" in low or "jwt" in low or "login" in low or "permission" in low:
            return "Security, Authentication & Authorization Gateway"
        elif "route" in low or "controller" in low or "api" in low or "endpoint" in low:
            return "HTTP API Ingress & Controller Routing"
        elif "service" in low or "handler" in low or "manager" in low:
            return "Domain Business Logic & Orchestration Service"
        elif "model" in low or "schema" in low or "entity" in low:
            return "Data Structure & Domain Model Entity"
        elif "db" in low or "repo" in low or "sql" in low or "migration" in low:
            return "Persistence, Query Execution & Database Access Layer"
        elif "util" in low or "helper" in low or "common" in low:
            return "Shared Utility & Algorithmic Helper"
        elif "component" in low or "view" in low or "page" in low or low.endswith((".tsx", ".jsx", ".vue")):
            return "Presentation & Interactive User Interface Component"
        elif "test" in low or "spec" in low:
            return "Verification & Automated Test Suite"
        return "Core Architecture Subsystem"

    def _synthesize_origin_summary(
        self,
        rel_path: str,
        symbol_name: Optional[str],
        origin_commit: Optional[CommitInfo],
        recent_changes: List[CommitInfo],
        legacy_flags: List[LegacyFlagItem],
        purpose: str,
    ) -> str:
        target_name = f"`{symbol_name}` in `{rel_path}`" if symbol_name else f"`{rel_path}`"

        if not origin_commit:
            flag_note = f" Contains {len(legacy_flags)} technical debt markers." if legacy_flags else ""
            return (
                f"{target_name} is classified under **{purpose}**."
                f"{flag_note} No historical Git revisions are tracked in the current branch context "
                f"(appears as an untracked working-tree file or initial repository commit)."
            )

        # Build grounded historical narrative
        narrative_parts = [
            f"{target_name} was originally authored by **{origin_commit.author}** "
            f"on {origin_commit.timestamp[:10]} in commit [`{origin_commit.short_hash}`] with message: *\"{origin_commit.message}\"*.",
            f"\n\n**Architectural Purpose**: Acts as a **{purpose}**.",
        ]

        if len(recent_changes) > 1:
            last_c = recent_changes[0]
            narrative_parts.append(
                f"\n\n**Evolution History**: It has undergone revisions across multiple commits. "
                f"Most recently touched by **{last_c.author}** on {last_c.timestamp[:10]} (*\"{last_c.message}\"*)."
            )

        if legacy_flags:
            hacks = [f for f in legacy_flags if f.flag_type in ("HACK", "FIXME", "DO_NOT_REMOVE")]
            if hacks:
                narrative_parts.append(
                    f"\n\n> [!WARNING]\n> **Critical Tribal Warning**: Found {len(hacks)} high-severity legacy markers "
                    f"({', '.join(set(h.flag_type for h in hacks))}). "
                    f"For example at line {hacks[0].line_number}: `{hacks[0].context}`."
                )
            else:
                narrative_parts.append(
                    f"\n\n> [!NOTE]\n> Contains {len(legacy_flags)} standard technical debt flags (`TODO`/`LEGACY`)."
                )

        return "".join(narrative_parts)
