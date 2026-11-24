"""Capa de datos: SQLite con una tabla de documentos JSON.

Reemplaza el localStorage del prototipo: misma forma de datos (users, clubs,
tournaments, ...), pero persistente y compartida por todos los usuarios.
"""
import json
import os
import sqlite3
import threading
import time
import uuid
from datetime import datetime, timezone
from pathlib import Path

DATABASE_URL = os.environ.get("DATABASE_URL")  # postgresql://usuario:clave@host:5432/sportpoint
USE_PG = bool(DATABASE_URL)
DB_PATH = os.environ.get("SP_DB", str(Path(__file__).resolve().parent.parent / "sportpoint.db"))
_lock = threading.RLock()
_conn = None


def conn():
    """Conexión única: PostgreSQL si hay DATABASE_URL; si no, SQLite (archivo local)."""
    global _conn
    if _conn is None:
        if USE_PG:
            import psycopg
            _conn = psycopg.connect(DATABASE_URL, autocommit=True)
            _conn.execute(
                """CREATE TABLE IF NOT EXISTS docs(
                     seq BIGSERIAL PRIMARY KEY,
                     col TEXT NOT NULL, id TEXT NOT NULL, data JSONB NOT NULL,
                     UNIQUE(col, id))"""
            )
        else:
            _conn = sqlite3.connect(DB_PATH, check_same_thread=False)
            _conn.execute(
                """CREATE TABLE IF NOT EXISTS docs(
                     seq INTEGER PRIMARY KEY AUTOINCREMENT,
                     col TEXT NOT NULL, id TEXT NOT NULL, data TEXT NOT NULL,
                     UNIQUE(col, id))"""
            )
            _conn.commit()
    return _conn


def _q(sql: str) -> str:
    return sql.replace("?", "%s") if USE_PG else sql


def _load(raw):
    return raw if isinstance(raw, dict) else json.loads(raw)  # JSONB ya llega como dict


def reset_connection():
    global _conn
    if _conn is not None:
        _conn.close()
    _conn = None


def uid(prefix: str) -> str:
    return f"{prefix}_{uuid.uuid4().hex[:10]}"


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def all_(col: str) -> list[dict]:
    with _lock:
        rows = conn().execute(_q("SELECT data FROM docs WHERE col=? ORDER BY seq"), (col,)).fetchall()
    return [_load(r[0]) for r in rows]


def get(col: str, id_: str):
    with _lock:
        r = conn().execute(_q("SELECT data FROM docs WHERE col=? AND id=?"), (col, id_)).fetchone()
    return _load(r[0]) if r else None


def put(col: str, doc: dict) -> dict:
    with _lock:
        conn().execute(
            _q("INSERT INTO docs(col,id,data) VALUES(?,?,?) "
               "ON CONFLICT(col,id) DO UPDATE SET data=excluded.data"),
            (col, doc["id"], json.dumps(doc, ensure_ascii=False)),
        )
        if not USE_PG:
            conn().commit()
    return doc


def count(col: str) -> int:
    with _lock:
        return conn().execute(_q("SELECT COUNT(*) FROM docs WHERE col=?"), (col,)).fetchone()[0]


def wipe():
    with _lock:
        conn().execute("DELETE FROM docs")
        if not USE_PG:
            conn().commit()


def notify(user_id: str, mensaje: str):
    put("notifications", {"id": uid("notif"), "userId": user_id, "mensaje": mensaje,
                          "fecha": now_iso(), "leido": False})
