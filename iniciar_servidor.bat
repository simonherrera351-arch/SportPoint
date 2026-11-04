@echo off
echo ============================================
echo   Iniciando SportPoint en servidor local...
echo ============================================
cd /d "%~dp0"
start "" http://localhost:8000/index.html
python -m http.server 8000 || py -m http.server 8000
pause
