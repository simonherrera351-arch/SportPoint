@echo off
cd /d "%~dp0backend"
if not exist .venv (
  py -3.13 -m venv .venv 2>nul || py -3.14 -m venv .venv 2>nul || py -m venv .venv
)
.venv\Scripts\python -m pip install -q -r requirements.txt
if errorlevel 1 (
  echo.
  echo ERROR instalando librerias. Revisa el mensaje de arriba.
  pause
  exit /b 1
)
echo SportPoint en http://localhost:8000  (Ctrl+C para detener)
.venv\Scripts\python -m uvicorn app.main:app --port 8000
