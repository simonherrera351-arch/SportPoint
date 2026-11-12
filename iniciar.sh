#!/usr/bin/env bash
# Arranca SportPoint (API Python + frontend React ya compilado) en http://localhost:8000
set -e
cd "$(dirname "$0")/backend"
[ -d .venv ] || python3 -m venv .venv
.venv/bin/python -m pip install -q -r requirements.txt
echo "SportPoint en http://localhost:8000  (Ctrl+C para detener)"
.venv/bin/python -m uvicorn app.main:app --port 8000
