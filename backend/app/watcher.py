import os
import threading
import time
from pathlib import Path
from typing import Optional, Dict, Any

from app.state import app_state


class RepoWatcher:
    def __init__(self):
        self.is_watching = False
        self.watched_path: Optional[str] = None
        self._thread: Optional[threading.Thread] = None
        self._stop_event = threading.Event()
        self._mtimes: Dict[str, float] = {}

    def start_watching(self, path: str):
        if self.is_watching and self.watched_path == path:
            return

        self.stop_watching()
        self.watched_path = path
        self.is_watching = True
        self._stop_event.clear()
        self._scan_mtimes()

        self._thread = threading.Thread(target=self._watch_loop, daemon=True)
        self._thread.start()
        print(f"[RepoWatcher] Started watching: {path}")

    def stop_watching(self):
        if self.is_watching:
            self._stop_event.set()
            self.is_watching = False
            self.watched_path = None
            print("[RepoWatcher] Stopped watching.")

    def _scan_mtimes(self):
        self._mtimes.clear()
        if not self.watched_path or not os.path.exists(self.watched_path):
            return

        for dirpath, dirnames, filenames in os.walk(self.watched_path):
            dirnames[:] = [d for d in dirnames if not d.startswith(".") and d not in ("node_modules", "dist", "build", ".venv", "venv", ".git")]
            for f in filenames:
                ext = Path(f).suffix.lower()
                if ext in (".py", ".ts", ".tsx", ".js", ".jsx", ".go", ".rs", ".c", ".cpp", ".cs"):
                    full_p = os.path.join(dirpath, f)
                    try:
                        self._mtimes[full_p] = os.path.getmtime(full_p)
                    except Exception:
                        pass

    def _watch_loop(self):
        while not self._stop_event.is_set():
            time.sleep(1.5)
            if not self.watched_path or not os.path.exists(self.watched_path):
                continue

            changed = False
            for dirpath, dirnames, filenames in os.walk(self.watched_path):
                dirnames[:] = [d for d in dirnames if not d.startswith(".") and d not in ("node_modules", "dist", "build", ".venv", "venv", ".git")]
                for f in filenames:
                    ext = Path(f).suffix.lower()
                    if ext in (".py", ".ts", ".tsx", ".js", ".jsx", ".go", ".rs", ".c", ".cpp", ".cs"):
                        full_p = os.path.join(dirpath, f)
                        try:
                            mtime = os.path.getmtime(full_p)
                            if full_p not in self._mtimes or self._mtimes[full_p] != mtime:
                                self._mtimes[full_p] = mtime
                                changed = True
                        except Exception:
                            pass

            if changed and app_state.current_repo_path == self.watched_path:
                print(f"[RepoWatcher] Detected file changes in {self.watched_path}. Incrementally reloading...")
                try:
                    app_state.load_repository(self.watched_path)
                except Exception as e:
                    print(f"[RepoWatcher] Reload error: {e}")


repo_watcher = RepoWatcher()
