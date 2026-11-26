"""Contraseñas con PBKDF2 y tokens firmados (HMAC-SHA256) con expiración de 8 h."""
import base64
import hashlib
import hmac
import json
import os
import secrets
import time
from pathlib import Path

TOKEN_TTL = 8 * 3600
_secret_file = Path(__file__).resolve().parent.parent / ".secret"


def _secret() -> bytes:
    env = os.environ.get("SP_SECRET")
    if env:
        return env.encode()
    if not _secret_file.exists():
        _secret_file.write_text(secrets.token_hex(32))
    return _secret_file.read_text().encode()


def hash_password(password: str) -> str:
    salt = secrets.token_hex(8)
    dk = hashlib.pbkdf2_hmac("sha256", password.encode(), salt.encode(), 100_000).hex()
    return f"{salt}${dk}"


def verify_password(password: str, stored: str) -> bool:
    try:
        salt, dk = stored.split("$")
    except ValueError:
        return False
    test = hashlib.pbkdf2_hmac("sha256", password.encode(), salt.encode(), 100_000).hex()
    return hmac.compare_digest(test, dk)


def _b64(b: bytes) -> str:
    return base64.urlsafe_b64encode(b).decode().rstrip("=")


def make_token(user: dict) -> str:
    payload = _b64(json.dumps({"sub": user["id"], "rol": user["rol"], "exp": int(time.time()) + TOKEN_TTL}).encode())
    sig = _b64(hmac.new(_secret(), payload.encode(), hashlib.sha256).digest())
    return f"{payload}.{sig}"


def read_token(token: str):
    try:
        payload, sig = token.split(".")
        good = _b64(hmac.new(_secret(), payload.encode(), hashlib.sha256).digest())
        if not hmac.compare_digest(sig, good):
            return None
        data = json.loads(base64.urlsafe_b64decode(payload + "=" * (-len(payload) % 4)))
        if data["exp"] < time.time():
            return None
        return data
    except Exception:
        return None
