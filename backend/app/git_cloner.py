import os
import re
import shutil
import subprocess
from pathlib import Path
from typing import Optional, Tuple


class GitCloner:
    def __init__(self, base_cache_dir: Optional[str] = None):
        if base_cache_dir:
            self.cache_dir = Path(base_cache_dir)
        else:
            self.cache_dir = Path(__file__).resolve().parent.parent / ".cloned_repos"
        self.cache_dir.mkdir(parents=True, exist_ok=True)

    def is_git_url(self, text: str) -> bool:
        trimmed = text.strip()
        if (
            trimmed.startswith("http://")
            or trimmed.startswith("https://")
            or trimmed.startswith("git@")
            or trimmed.endswith(".git")
            or "github.com/" in trimmed
            or "gitlab.com/" in trimmed
            or "bitbucket.org/" in trimmed
        ):
            return True
        return False

    def normalize_url(self, raw_url: str) -> str:
        trimmed = raw_url.strip()
        if not trimmed.startswith("http://") and not trimmed.startswith("https://") and not trimmed.startswith("git@"):
            # e.g., github.com/owner/repo -> https://github.com/owner/repo
            if "github.com" in trimmed or "gitlab.com" in trimmed:
                trimmed = f"https://{trimmed}"
        return trimmed

    def clone_repository(self, git_url: str, branch: Optional[str] = None) -> Tuple[str, str]:
        """
        Clones a remote git repository shallowly (--depth 1).
        Returns (local_cloned_dir, repo_name).
        """
        normalized_url = self.normalize_url(git_url)
        
        # Derive a clean directory name from URL
        # e.g., https://github.com/fastapi/fastapi -> fastapi_fastapi
        clean_name = re.sub(r"[^a-zA-Z0-9_\-]", "_", normalized_url.replace("https://", "").replace("http://", "").replace("github.com/", "").replace(".git", ""))
        clean_name = clean_name.strip("_") or "cloned_repo"
        target_dir = self.cache_dir / clean_name

        # If repo directory exists, remove or update
        if target_dir.exists():
            try:
                # Try pull first
                pull_cmd = ["git", "-C", str(target_dir), "pull", "--ff-only"]
                res = subprocess.run(pull_cmd, capture_output=True, text=True, timeout=30)
                if res.returncode == 0:
                    return str(target_dir.resolve()), clean_name
            except Exception:
                pass
            
            # If pull fails or not clean, remove and re-clone
            try:
                shutil.rmtree(target_dir, ignore_errors=True)
            except Exception:
                pass

        # Execute git clone --depth 50 (retrieves recent commit history for Time Machine & Drift)
        cmd = ["git", "clone", "--depth", "50"]
        if branch:
            cmd.extend(["--branch", branch])
        cmd.extend([normalized_url, str(target_dir)])

        try:
            proc = subprocess.run(cmd, capture_output=True, text=True, timeout=120)
            if proc.returncode != 0:
                raise RuntimeError(f"Git clone failed: {proc.stderr or proc.stdout}")
        except subprocess.TimeoutExpired:
            raise RuntimeError("Git clone timed out after 120 seconds.")
        except FileNotFoundError:
            raise RuntimeError("'git' command not found on host system. Please ensure git is installed.")

        if not target_dir.exists():
            raise RuntimeError(f"Failed to clone repository from {normalized_url}")

        return str(target_dir.resolve()), clean_name
