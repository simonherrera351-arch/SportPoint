"""Capa de datos: MongoDB (MONGO_URI), PostgreSQL (DATABASE_URL) o SQLite (por defecto).

Reemplaza el localStorage del prototipo: misma forma de datos (users, clubs,
tournaments, ...), pero persistente y compartida por todos los usuarios.
Prioridad: si existe MONGO_URI usa MongoDB; si no, DATABASE_URL (PostgreSQL); si no, SQLite.
"""
import json
import os
import sqlite3
import threading
import time
import uuid
from datetime import datetime, timezone
from pathlib import Path

try:  # lee backend/.env si existe (MONGO_URI, MONGO_DB, SP_SECRET...)
    from dotenv import load_dotenv
    load_dotenv(Path(__file__).resolve().parent.parent / ".env")
except ImportError:
    pass

MONGO_URI = os.environ.get("MONGO_URI")  # mongodb+srv://usuario:clave@cluster.mongodb.net/
MONGO_DB = os.environ.get("MONGO_DB", "sportpoint")
USE_MONGO = bool(MONGO_URI)
DATABASE_URL = os.environ.get("DATABASE_URL")  # postgresql://usuario:clave@host:5432/sportpoint
USE_PG = bool(DATABASE_URL) and not USE_MONGO
DB_PATH = os.environ.get("SP_DB", str(Path(__file__).resolve().parent.parent / "sportpoint.db"))
_lock = threading.RLock()
_conn = None


def conn():
    """Conexión única: MongoDB si hay MONGO_URI; PostgreSQL si hay DATABASE_URL; si no, SQLite."""
    global _conn
    if _conn is None:
        if USE_MONGO:
            from pymongo import MongoClient
            client = MongoClient(MONGO_URI, serverSelectionTimeoutMS=8000)
            client.admin.command("ping")  # falla rápido si la URI/clave/IP están mal
            _conn = client[MONGO_DB]
        elif USE_PG:
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
        (_conn.client if USE_MONGO else _conn).close()
    _conn = None


def uid(prefix: str) -> str:
    return f"{prefix}_{uuid.uuid4().hex[:10]}"


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


_NO_META = {"_id": 0, "_seq": 0}  # campos internos de Mongo que no se devuelven


def all_(col: str) -> list[dict]:
    if USE_MONGO:
        return list(conn()[col].find({}, _NO_META).sort("_seq", 1))
    with _lock:
        rows = conn().execute(_q("SELECT data FROM docs WHERE col=? ORDER BY seq"), (col,)).fetchall()
    return [_load(r[0]) for r in rows]


def get(col: str, id_: str):
    if USE_MONGO:
        return conn()[col].find_one({"_id": id_}, _NO_META)
    with _lock:
        r = conn().execute(_q("SELECT data FROM docs WHERE col=? AND id=?"), (col, id_)).fetchone()
    return _load(r[0]) if r else None


def put(col: str, doc: dict) -> dict:
    if USE_MONGO:
        c = conn()[col]
        with _lock:  # conserva _seq (orden de creación) al actualizar
            old = c.find_one({"_id": doc["id"]}, {"_seq": 1})
            seq = old["_seq"] if old else time.time_ns()
            c.replace_one({"_id": doc["id"]}, {**doc, "_id": doc["id"], "_seq": seq}, upsert=True)
        return doc
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
    if USE_MONGO:
        return conn()[col].count_documents({})
    with _lock:
        return conn().execute(_q("SELECT COUNT(*) FROM docs WHERE col=?"), (col,)).fetchone()[0]


def wipe():
    if USE_MONGO:
        d = conn()
        for name in d.list_collection_names():
            d[name].delete_many({})
        return
    with _lock:
        conn().execute("DELETE FROM docs")
        if not USE_PG:
            conn().commit()


def notify(user_id: str, mensaje: str):
    put("notifications", {"id": uid("notif"), "userId": user_id, "mensaje": mensaje,
                          "fecha": now_iso(), "leido": False})
