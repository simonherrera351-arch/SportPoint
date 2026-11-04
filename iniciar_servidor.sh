#!/bin/bash
echo "============================================"
echo "  Iniciando SportPoint en servidor local..."
echo "============================================"
cd "$(dirname "$0")"
( sleep 1 && (open http://localhost:8000/index.html 2>/dev/null || xdg-open http://localhost:8000/index.html 2>/dev/null) ) &
python3 -m http.server 8000 || python -m http.server 8000
