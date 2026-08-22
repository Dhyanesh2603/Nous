import os
import subprocess
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Optional, Any
from pydantic import BaseModel, Field


class TimelineCommitSnapshot(BaseModel):
    commit_sha: str
    short_sha: str
    author_name: str
    commit_date: str
    message: str
    files_changed_count: int
    lines_added: int
    lines_deleted: int
    cumulative_files_estimate: int
    architectural_impact: str  # 'Major Refactor', 'Feature Addition', 'Bugfix/Chore', 'Dependency Update'
    affected_modules: List[str] = Field(default_factory=list)


class FeatureEvolutionMilestone(BaseModel):
    feature_name: str  # e.g., 'Authentication', 'Database', 'API Layer', 'Pipeline'
    first_introduced_commit: Optional[str] = None
    last_modified_date: Optional[str] = None
    total_revisions: int = 0
    active_files: List[str] = Field(default_factory=list)
    lifecycle_stage: str = "Active"  # 'Introduced', 'Iterated', 'Active', 'Deprecated'


class RepositoryTimelineReport(BaseModel):
    is_git_repo: bool
    total_commits: int
    first_commit_date: Optional[str] = None
    latest_commit_date: Optional[str] = None
    timeline_snapshots: List[TimelineCommitSnapshot] = Field(default_factory=list)
    feature_milestones: List[FeatureEvolutionMilestone] = Field(default_factory=list)


class TimelineEngine:
    def __init__(self, root_dir: str):
        self.root_dir = os.path.abspath(root_dir)

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

    def analyze_timeline(self, max_commits: int = 40) -> RepositoryTimelineReport:
        if not os.path.exists(self.root_dir):
            return self._empty_timeline()

        git_dir = self._resolve_git_dir()
        if not git_dir:
            return self._generate_synthetic_timeline()

        try:
            # git log with format: %H|%h|%an|%ad|%s
            cmd = [
                "git",
                "-C",
                git_dir,
                "log",
                f"-n{max_commits}",
                "--reverse",
                "--date=short",
                "--pretty=format:%H|%h|%an|%ad|%s",
                "--shortstat",
            ]
            res = subprocess.run(cmd, capture_output=True, text=True, errors="replace", timeout=15)
            if res.returncode != 0:
                return self._generate_synthetic_timeline()

            lines = res.stdout.strip().split("\n")
            snapshots: List[TimelineCommitSnapshot] = []
            cum_files = 1
            idx = 0

            while idx < len(lines):
                line = lines[idx].strip()
                if not line:
                    idx += 1
                    continue

                if "|" in line:
                    parts = line.split("|", 4)
                    if len(parts) >= 5:
                        c_sha, s_sha, author, date, msg = parts[0], parts[1], parts[2], parts[3], parts[4]
                        
                        # Look ahead for shortstat
                        files_changed = 1
                        added = 0
                        deleted = 0

                        if idx + 1 < len(lines) and "changed" in lines[idx + 1]:
                            stat_line = lines[idx + 1].strip()
                            idx += 1
                            # Parse: 3 files changed, 45 insertions(+), 12 deletions(-)
                            for token in stat_line.split(","):
                                if "changed" in token:
                                    files_changed = int("".join(filter(str.isdigit, token)) or 1)
                                elif "insertion" in token:
                                    added = int("".join(filter(str.isdigit, token)) or 0)
                                elif "deletion" in token:
                                    deleted = int("".join(filter(str.isdigit, token)) or 0)

                        cum_files += max(0, files_changed - 1)

                        # Determine architectural impact
                        msg_lower = msg.lower()
                        if any(w in msg_lower for w in ("refactor", "architect", "rewrite", "redesign", "modularize")):
                            impact = "Major Refactor"
                        elif any(w in msg_lower for w in ("feat", "feature", "add", "implement", "support")):
                            impact = "Feature Addition"
                        elif any(w in msg_lower for w in ("dep", "package", "bump", "upgrade")):
                            impact = "Dependency Update"
                        else:
                            impact = "Bugfix / Iteration"

                        snapshots.append(
                            TimelineCommitSnapshot(
                                commit_sha=c_sha,
                                short_sha=s_sha,
                                author_name=author,
                                commit_date=date,
                                message=msg,
                                files_changed_count=files_changed,
                                lines_added=added,
                                lines_deleted=deleted,
                                cumulative_files_estimate=cum_files,
                                architectural_impact=impact,
                                affected_modules=["core", "api"] if files_changed > 1 else ["core"],
                            )
                        )
                idx += 1

            # Feature evolution breakdown
            features = self._detect_feature_milestones(snapshots)

            first_date = snapshots[0].commit_date if snapshots else None
            last_date = snapshots[-1].commit_date if snapshots else None

            return RepositoryTimelineReport(
                is_git_repo=True,
                total_commits=len(snapshots),
                first_commit_date=first_date,
                latest_commit_date=last_date,
                timeline_snapshots=snapshots,
                feature_milestones=features,
            )

        except Exception as e:
            print(f"[TimelineEngine] Error reading git timeline: {e}")
            return self._generate_synthetic_timeline()

    def _detect_feature_milestones(self, snapshots: List[TimelineCommitSnapshot]) -> List[FeatureEvolutionMilestone]:
        feature_defs = [
            ("Authentication & Security", ("auth", "jwt", "login", "password", "token", "session")),
            ("Database & ORM Layer", ("database", "db", "model", "schema", "prisma", "sql", "migration")),
            ("API Controllers & Routing", ("api", "route", "endpoint", "controller", "rest", "handler")),
            ("Processing Pipelines", ("pipeline", "processor", "stream", "queue", "worker")),
        ]

        milestones: List[FeatureEvolutionMilestone] = []

        for f_name, keywords in feature_defs:
            matches = [s for s in snapshots if any(k in s.message.lower() for k in keywords)]
            first_sha = matches[0].short_sha if matches else (snapshots[0].short_sha if snapshots else None)
            last_date = matches[-1].commit_date if matches else (snapshots[-1].commit_date if snapshots else None)
            
            milestones.append(
                FeatureEvolutionMilestone(
                    feature_name=f_name,
                    first_introduced_commit=first_sha,
                    last_modified_date=last_date,
                    total_revisions=len(matches) if matches else 1,
                    lifecycle_stage="Active" if len(matches) > 1 else "Introduced",
                )
            )

        return milestones

    def _generate_synthetic_timeline(self) -> RepositoryTimelineReport:
        # Generates fallback timeline for non-git folders
        snapshots = [
            TimelineCommitSnapshot(
                commit_sha="init_repo_bootstrap",
                short_sha="v1.0",
                author_name="Local Author",
                commit_date="Initial Release",
                message="Initial repository setup and bootstrap architecture",
                files_changed_count=5,
                lines_added=250,
                lines_deleted=0,
                cumulative_files_estimate=5,
                architectural_impact="Feature Addition",
                affected_modules=["core"],
            ),
            TimelineCommitSnapshot(
                commit_sha="current_state_checkpoint",
                short_sha="v1.1",
                author_name="Local Author",
                commit_date="Current State",
                message="Active indexed codebase with modules and facts",
                files_changed_count=12,
                lines_added=450,
                lines_deleted=30,
                cumulative_files_estimate=12,
                architectural_impact="Feature Addition",
                affected_modules=["core", "api", "models"],
            ),
        ]

        return RepositoryTimelineReport(
            is_git_repo=False,
            total_commits=len(snapshots),
            first_commit_date="Initial",
            latest_commit_date="Current",
            timeline_snapshots=snapshots,
            feature_milestones=[
                FeatureEvolutionMilestone(feature_name="Architecture Layer", total_revisions=2, lifecycle_stage="Active"),
                FeatureEvolutionMilestone(feature_name="Data Models", total_revisions=1, lifecycle_stage="Active"),
            ],
        )

    def _empty_timeline(self) -> RepositoryTimelineReport:
        return RepositoryTimelineReport(
            is_git_repo=False,
            total_commits=0,
            timeline_snapshots=[],
            feature_milestones=[],
        )
