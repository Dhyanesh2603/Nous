import os
from pathlib import Path
from pydantic import BaseModel

BASE_DIR = Path(__file__).resolve().parent.parent

class Settings(BaseModel):
    APP_NAME: str = "Nous Architecture Engine"
    VERSION: str = "0.1.0"
    DEBUG: bool = True
    
    # File scanner settings
    DEFAULT_IGNORE_DIRS: set[str] = {
        "node_modules",
        ".git",
        ".github",
        "__pycache__",
        ".venv",
        "venv",
        "env",
        "dist",
        "build",
        "out",
        ".next",
        ".nuxt",
        ".turbo",
        ".pytest_cache",
        ".mypy_cache",
        ".ruff_cache",
        "coverage",
        ".idea",
        ".vscode",
    }
    
    SUPPORTED_EXTENSIONS: dict[str, str] = {
        ".py": "python",
        ".ts": "typescript",
        ".tsx": "tsx",
        ".js": "javascript",
        ".jsx": "javascript",
    }
    
    MAX_FILE_SIZE_BYTES: int = 2 * 1024 * 1024  # 2MB limit per source file
    
    FIXTURES_DIR: Path = BASE_DIR / "tests" / "fixtures"

settings = Settings()
