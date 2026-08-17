from typing import Optional
import os
from app.scanner import RepoScanner
from app.config import settings

class AppState:
    def __init__(self):
        self.scanner: Optional[RepoScanner] = None
        self.current_repo_path: Optional[str] = None
        self.is_indexing: bool = False

    def load_repository(self, path: str) -> dict:
        self.is_indexing = True
        try:
            norm_path = os.path.abspath(path)
            if not os.path.exists(norm_path):
                raise ValueError(f"Path does not exist: {norm_path}")
                
            self.scanner = RepoScanner(norm_path)
            stats = self.scanner.scan_and_index()
            self.current_repo_path = norm_path
            return stats
        finally:
            self.is_indexing = False

app_state = AppState()
