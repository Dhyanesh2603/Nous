from pathlib import Path
from typing import List, Set
from pydantic import BaseModel, Field


class Settings(BaseModel):
    APP_NAME: str = "Nous Architecture Engine"
    VERSION: str = "0.3.0"
    API_PREFIX: str = "/api"
    DEBUG: bool = True
    
    BASE_DIR: Path = Path(__file__).resolve().parent.parent
    FIXTURES_DIR: Path = Path(__file__).resolve().parent.parent / "tests" / "fixtures"

    # Supported Language File Extensions (via RipEx, MultiLanguageParser & Tree-sitter)
    SUPPORTED_EXTENSIONS: Set[str] = {
        # Python
        ".py", ".pyi",
        # TypeScript / JavaScript / React
        ".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs", ".mts", ".cts",
        # Frontend UI Component Frameworks & Web
        ".vue", ".svelte", ".html", ".htm", ".css", ".scss", ".sass", ".less",
        # Go
        ".go",
        # Rust
        ".rs",
        # C / C++
        ".c", ".h", ".cpp", ".hpp", ".cc", ".cxx", ".hh", ".hxx",
        # C# / .NET
        ".cs",
        # JVM Languages (Java / Kotlin / Scala)
        ".java", ".kt", ".kts", ".scala",
        # Mobile & Apple Languages (Swift / Dart / Flutter)
        ".swift", ".dart",
        # Web Backend (PHP / Ruby)
        ".php", ".rb", ".erb",
        # Schemas & Databases
        ".sql", ".prisma",
    }
    
    DEFAULT_IGNORE_DIRS: Set[str] = {
        "node_modules",
        ".git",
        ".venv",
        "venv",
        "env",
        "__pycache__",
        "dist",
        "build",
        ".next",
        ".nuxt",
        ".output",
        "coverage",
        ".pytest_cache",
        "target",
        ".system_generated",
        "bin",
        "obj",
    }
    
    MAX_FILE_SIZE_BYTES: int = 1_000_000  # 1MB max per file


settings = Settings()
