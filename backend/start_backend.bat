@echo off
cd /d D:\Nous\backend
.\.venv\Scripts\python.exe -m uvicorn app.main:app --app-dir D:\Nous\backend --host 127.0.0.1 --port 8000
