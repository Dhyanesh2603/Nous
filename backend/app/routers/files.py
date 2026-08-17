import os
from fastapi import APIRouter, HTTPException, Query
from typing import Optional
from pydantic import BaseModel

from app.state import app_state
from app.config import settings

router = APIRouter(prefix="/api/files", tags=["Files"])


class FileContentResponse(BaseModel):
    file_path: str
    relative_path: str
    language: str
    content: str
    total_lines: int
    start_line: Optional[int] = None
    end_line: Optional[int] = None


@router.get("/content", response_model=FileContentResponse)
def get_file_content(
    file_path: str = Query(...),
    start_line: Optional[int] = Query(None, ge=1),
    end_line: Optional[int] = Query(None, ge=1),
):
    if not app_state.scanner:
        raise HTTPException(status_code=400, detail="No repository loaded.")

    # Find the matching FileAST in loaded repo
    matching_path = None
    ast = None
    
    if file_path in app_state.scanner.file_asts:
        matching_path = file_path
        ast = app_state.scanner.file_asts[file_path]
    else:
        # Check by relative path
        for p, a in app_state.scanner.file_asts.items():
            if a.relative_path == file_path or a.relative_path.replace("\\", "/") == file_path.replace("\\", "/"):
                matching_path = p
                ast = a
                break

    if not matching_path or not ast:
        # Fallback to direct path check within root_dir
        norm_path = os.path.normpath(os.path.join(app_state.scanner.root_dir, file_path)) if not os.path.isabs(file_path) else os.path.normpath(file_path)
        if os.path.exists(norm_path) and os.path.isfile(norm_path):
            with open(norm_path, "r", encoding="utf-8", errors="replace") as f:
                content = f.read()
            rel = os.path.relpath(norm_path, app_state.scanner.root_dir)
            lines = content.splitlines()
            return FileContentResponse(
                file_path=norm_path,
                relative_path=rel,
                language=norm_path.split(".")[-1],
                content=content,
                total_lines=len(lines),
                start_line=start_line,
                end_line=end_line,
            )
        raise HTTPException(status_code=404, detail=f"File not found in active repository: {file_path}")

    return FileContentResponse(
        file_path=matching_path,
        relative_path=ast.relative_path,
        language=ast.language,
        content=ast.raw_content or "",
        total_lines=ast.line_count,
        start_line=start_line,
        end_line=end_line,
    )
