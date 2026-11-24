"""SportPoint API — FastAPI.

Toda la lógica de negocio que vivía en sportpoint.js (inscripciones, brackets,
marcadores, validación de clubes, etc.) ahora corre en el servidor, con las
validaciones de rol y propiedad aplicadas aquí (no solo ocultando botones).
"""
import random
from contextlib import asynccontextmanager
import re
import secrets
import time
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional

from fastapi import Body, Depends, FastAPI, Header, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field

from . import db
from .security import hash_password, make_token, read_token, verify_password
from .seed import seed

COMUNAS = ["Comuna 1 - Popular", "Comuna 4 - Aranjuez", "Comuna 10 - La Candelaria",
           "Comuna 11 - Laureles-Estadio", "Comuna 14 - Poblado", "Comuna 15 - Guayabal", "Comuna 16 - Belén"]
DEPORTES = ["Fútbol", "Baloncesto", "Voleibol", "Natación", "Ciclismo", "Atletismo", "Tenis", "Patinaje"]
CATEGORIAS = ["Sub-12", "Sub-15", "Sub-20", "Abierta"]
ROLES = ["Deportista", "Admin. Club", "Organizador", "Admin. Sistema"]
CATEGORIA_EDAD = {"Sub-12": (0, 12), "Sub-15": (13, 15), "Sub-20": (16, 20), "Abierta": (0, 999)}

@asynccontextmanager
async def lifespan(_app):
    seed()
    yield


app = FastAPI(title="SportPoint API", lifespan=lifespan)
app.add_middleware(CORSMiddleware, allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
                   allow_methods=["*"], allow_headers=["*"])


# ───────────────────────── utilidades ─────────────────────────
def calc_age(fecha: Optional[str]):
    if not fecha:
        return None
    b = datetime.fromisoformat(fecha[:10]).date()
    t = datetime.now(timezone.utc).date()
    return t.year - b.year - ((t.month, t.day) < (b.month, b.day))


def user_out(u: dict) -> dict:
    return {k: v for k, v in u.items() if k != "passHash"}


def optional_user(authorization: Optional[str] = Header(None)):
    if not authorization or not authorization.startswith("Bearer "):
        return None
    data = read_token(authorization[7:])
    return db.get("users", data["sub"]) if data else None


def auth(*roles):
    """Dependencia: exige sesión válida y (opcional) uno de los roles dados."""
    def dep(user=Depends(optional_user)):
        if not user:
            raise HTTPException(401, "Inicia sesión para continuar.")
        if roles and user["rol"] not in roles:
            raise HTTPException(403, f"Esta acción requiere el rol: {' / '.join(roles)}.")
        return user
    return dep


def need(col, id_, msg):
    doc = db.get(col, id_)
    if not doc:
        raise HTTPException(404, msg)
    return doc


def rating_of(c):
    rs = c.get("reviews") or []
    return round(sum(r["estrellas"] for r in rs) / len(rs), 1) if rs else None


def club_out(c: dict, viewer=None) -> dict:
    out = {k: v for k, v in c.items() if k not in ("miembros", "solicitudes")}
    admin = db.get("users", c["adminId"])
    out.update({
        "numMiembros": len(c.get("miembros", [])),
        "rating": rating_of(c),
        "adminNombre": admin["nombre"] if admin else "",
        "soyMiembro": bool(viewer and viewer["id"] in c.get("miembros", [])),
        "solicitudEnviada": bool(viewer and viewer["id"] in c.get("solicitudes", [])),
        "numSolicitudes": len(c.get("solicitudes", [])),
        "reviews": [{"estrellas": r["estrellas"], "comentario": r.get("comentario", ""), "fecha": r["fecha"]}
                    for r in c.get("reviews", [])],
    })
    return out


def torneo_out(t: dict, viewer=None) -> dict:
    out = {k: v for k, v in t.items() if k != "waitlist"}
    out["numListaEspera"] = len(t.get("waitlist", []))
    out["enLista"] = bool(viewer and viewer["id"] in t.get("waitlist", []))
    out["yaInscrito"] = bool(viewer and any(r["tournamentId"] == t["id"] and r["athleteId"] == viewer["id"]
                                            for r in db.all_("registrations")))
    out["esOrganizador"] = bool(viewer and viewer["id"] == t["organizadorId"])
    return out


# ───────────────────────── meta / home ─────────────────────────
@app.get("/api/meta")
def meta():
    return {"comunas": COMUNAS, "deportes": DEPORTES, "categorias": CATEGORIAS, "roles": ROLES}


@app.get("/api/home")
def home():
    clubs, torneos = db.all_("clubs"), db.all_("tournaments")
    news = sorted(db.all_("news"), key=lambda n: n["fecha"], reverse=True)
    return {
        "stats": {
            "clubes": sum(c["estado"] == "Aprobado" for c in clubs),
            "torneos": sum(t["estado"] != "Finalizado" for t in torneos),
            "deportistas": sum(u["rol"] == "Deportista" for u in db.all_("users")),
            "comunas": len(COMUNAS),
        },
        "torneos": [torneo_out(t) for t in torneos if t["estado"] == "Abierto"][:3],
        "noticias": news[:2],
    }


# ───────────────────────── autenticación ─────────────────────────
class RegisterIn(BaseModel):
    nombre: str
    email: str
    password: str
    rol: str = "Deportista"
    fechaNacimiento: Optional[str] = None
    docSubido: bool = False


class LoginIn(BaseModel):
    email: str
    password: str


EMAIL_RE = re.compile(r"^[^\s@]+@[^\s@]+\.[^\s@]+$")


@app.post("/api/auth/register")
def register(p: RegisterIn):
    nombre, email = p.nombre.strip(), p.email.strip().lower()
    if not nombre or not email or not p.password:
        raise HTTPException(400, "Completa todos los campos obligatorios.")
    if not EMAIL_RE.match(email):
        raise HTTPException(400, "Correo electrónico no válido.")
    if len(p.password) < 4:
        raise HTTPException(400, "La contraseña debe tener al menos 4 caracteres.")
    if p.rol not in ("Deportista", "Admin. Club", "Organizador"):  # nadie se auto-registra como Admin. Sistema
        raise HTTPException(400, "Rol no permitido en el registro.")
    if any(u["email"] == email for u in db.all_("users")):
        raise HTTPException(400, "Ya existe una cuenta con ese correo.")
    fnac, doc = None, False
    if p.rol == "Deportista":
        fnac, doc = p.fechaNacimiento or None, p.docSubido
        if not fnac:
            raise HTTPException(400, "Ingresa tu fecha de nacimiento.")
    user = db.put("users", {"id": db.uid("u"), "nombre": nombre, "email": email,
                            "passHash": hash_password(p.password), "rol": p.rol, "telefono": "",
                            "estado": "activo", "fechaRegistro": db.now_iso(), "fechaNacimiento": fnac,
                            "docSubido": doc, "carnet": {}})
    return {"token": make_token(user), "user": user_out(user)}


@app.post("/api/auth/login")
def login(p: LoginIn):
    user = next((u for u in db.all_("users") if u["email"] == p.email.strip().lower()), None)
    if not user or not verify_password(p.password, user["passHash"]):
        raise HTTPException(401, "Credenciales inválidas. Verifica tu correo y contraseña.")
    return {"token": make_token(user), "user": user_out(user)}


@app.get("/api/auth/me")
def me(user=Depends(auth())):
    return user_out(user)


_recoveries: dict[str, dict] = {}


@app.post("/api/auth/recover")
def recover(body: dict = Body(...)):
    email = (body.get("email") or "").strip().lower()
    if not any(u["email"] == email for u in db.all_("users")):
        raise HTTPException(404, "No existe una cuenta con ese correo.")
    token = secrets.token_hex(3).upper()
    _recoveries[email] = {"token": token, "expires": time.time() + 15 * 60}
    # Simulado como en el prototipo: se devuelve el token en vez de enviarlo por correo.
    return {"token": token, "expiresIn": 15 * 60}


@app.post("/api/auth/recover/confirm")
def recover_confirm(body: dict = Body(...)):
    email = (body.get("email") or "").strip().lower()
    rec = _recoveries.get(email)
    if not rec or time.time() > rec["expires"] or rec["token"] != (body.get("token") or "").upper():
        raise HTTPException(400, "El token expiró o no es válido, solicita uno nuevo.")
    pw = body.get("password") or ""
    if len(pw) < 4:
        raise HTTPException(400, "La contraseña debe tener al menos 4 caracteres.")
    user = next(u for u in db.all_("users") if u["email"] == email)
    user["passHash"] = hash_password(pw)
    db.put("users", user)
    _recoveries.pop(email, None)
    return {"ok": True}


# ───────────────────────── perfil / carnet / mis cosas ─────────────────────────
@app.put("/api/me")
def update_me(body: dict = Body(...), user=Depends(auth())):
    user["nombre"] = (body.get("nombre") or "").strip() or user["nombre"]
    user["telefono"] = (body.get("telefono") or "").strip()
    if "fechaNacimiento" in body:
        user["fechaNacimiento"] = body["fechaNacimiento"] or None
    db.put("users", user)
    return user_out(user)


HEX_RE = re.compile(r"^#[0-9a-fA-F]{6}$")


@app.put("/api/me/carnet")
def update_carnet(body: dict = Body(...), user=Depends(auth("Deportista"))):
    cfg = user.get("carnet") or {}
    for k in ("deporte", "posicion", "categoria"):
        if k in body:
            cfg[k] = str(body[k] or "").strip()[:30]
    if "colorHex" in body:
        if not HEX_RE.match(body["colorHex"] or ""):
            raise HTTPException(400, "Color no válido. Usa el formato #1db954.")
        cfg["colorHex"] = body["colorHex"].lower()
    if body.get("foto"):
        if not str(body["foto"]).startswith("data:image/") or len(body["foto"]) > 600_000:
            raise HTTPException(400, "Foto no válida o demasiado pesada.")
        cfg["foto"] = body["foto"]
    if body.get("quitarFoto"):
        cfg.pop("foto", None)
    user["carnet"] = cfg
    db.put("users", user)
    return user_out(user)


@app.get("/api/me/clubs")
def my_clubs(user=Depends(auth("Deportista"))):
    clubs = db.all_("clubs")
    return {
        "miembro": [club_out(c, user) for c in clubs if user["id"] in c.get("miembros", [])],
        "solicitudes": [club_out(c, user) for c in clubs if user["id"] in c.get("solicitudes", [])],
    }


@app.get("/api/me/registrations")
def my_registrations(user=Depends(auth("Deportista"))):
    out = []
    for r in db.all_("registrations"):
        if r["athleteId"] == user["id"]:
            t = db.get("tournaments", r["tournamentId"])
            out.append({**r, "torneo": t["nombre"] if t else "—"})
    return out


def _is_me(team, uid_):
    return bool(team and team.get("id") == uid_)


@app.get("/api/me/history")
def my_history(user=Depends(auth("Deportista"))):
    out = []
    for t in db.all_("tournaments"):
        if any(tm["id"] == user["id"] for tm in t["teams"]):
            mine = [m for m in t["matches"] if _is_me(m["local"], user["id"]) or _is_me(m["visitante"], user["id"])]
            out.append({"id": t["id"], "nombre": t["nombre"], "fechaInicio": t["fechaInicio"], "estado": t["estado"],
                        "jugados": sum(m["estado"] == "Jugado" for m in mine)})
    return out


@app.get("/api/me/stats")
def my_stats(user=Depends(auth("Deportista"))):
    pj = pg = pp = 0
    for t in db.all_("tournaments"):
        for m in t["matches"]:
            if m["estado"] != "Jugado":
                continue
            if _is_me(m["local"], user["id"]):
                pj += 1
                pg += m["marcadorLocal"] > m["marcadorVisitante"]
                pp += m["marcadorLocal"] <= m["marcadorVisitante"]
            if _is_me(m["visitante"], user["id"]):
                pj += 1
                pg += m["marcadorVisitante"] > m["marcadorLocal"]
                pp += m["marcadorVisitante"] <= m["marcadorLocal"]
    return {"pj": pj, "pg": pg, "pp": pp}


# ───────────────────────── notificaciones ─────────────────────────
@app.get("/api/notifications")
def notifications(user=Depends(auth())):
    items = [n for n in db.all_("notifications") if n["userId"] == user["id"]]
    items.sort(key=lambda n: n["fecha"], reverse=True)
    return {"items": items, "unread": sum(not n["leido"] for n in items)}


@app.post("/api/notifications/read")
def notifications_read(user=Depends(auth())):
    for n in db.all_("notifications"):
        if n["userId"] == user["id"] and not n["leido"]:
            n["leido"] = True
            db.put("notifications", n)
    return {"ok": True}


# ───────────────────────── clubes ─────────────────────────
class ClubIn(BaseModel):
    nombre: str
    disciplina: str = "Fútbol"
    comuna: str = COMUNAS[0]
    direccion: str = ""
    horarios: str = ""
    entrenadores: list[str] = []
    cuota: Optional[float] = None
    documentos: list[str] = []


@app.get("/api/clubs")
def list_clubs(texto: str = "", deporte: str = "", comuna: str = "", costo: str = "",
               viewer=Depends(optional_user)):
    items = [c for c in db.all_("clubs") if c["estado"] == "Aprobado"]
    if texto:
        items = [c for c in items if texto.lower() in c["nombre"].lower()]
    if deporte:
        items = [c for c in items if c["disciplina"] == deporte]
    if comuna:
        items = [c for c in items if c["comuna"] == comuna]
    if costo:
        lo, hi = (float(x) for x in costo.split("-"))
        items = [c for c in items if lo <= c["cuota"] <= hi]
    return [club_out(c, viewer) for c in items]


@app.get("/api/clubs/mine")
def my_club_list(user=Depends(auth("Admin. Club"))):
    return [club_out(c, user) for c in db.all_("clubs") if c["adminId"] == user["id"]]


@app.get("/api/clubs/all")
def all_clubs(user=Depends(auth("Admin. Sistema"))):
    return [club_out(c, user) for c in db.all_("clubs")]


@app.get("/api/clubs/{club_id}")
def club_detail(club_id: str, viewer=Depends(optional_user)):
    return club_out(need("clubs", club_id, "Club no encontrado."), viewer)


@app.post("/api/clubs")
def create_club(p: ClubIn, user=Depends(auth("Admin. Club"))):
    if not p.nombre.strip():
        raise HTTPException(400, "El nombre del club es obligatorio.")
    if p.cuota is None:
        raise HTTPException(400, "Indica la cuota mensual (puede ser 0).")
    c = db.put("clubs", {"id": db.uid("c"), **p.model_dump(exclude={"nombre", "cuota"}), "nombre": p.nombre.strip(),
                         "cuota": p.cuota, "logo": None, "estado": "Pendiente", "motivoRechazo": "",
                         "adminId": user["id"], "miembros": [], "solicitudes": [], "reviews": []})
    return club_out(c, user)


@app.put("/api/clubs/{club_id}")
def edit_club(club_id: str, p: ClubIn, user=Depends(auth("Admin. Club"))):
    c = need("clubs", club_id, "Club no encontrado.")
    if c["adminId"] != user["id"]:
        raise HTTPException(403, "Solo el administrador del club puede editarlo.")
    if not p.nombre.strip() or p.cuota is None:
        raise HTTPException(400, "Nombre y cuota son obligatorios.")
    c.update(p.model_dump(exclude={"documentos"}))
    c["nombre"] = p.nombre.strip()
    if p.documentos:
        c["documentos"] = c.get("documentos", []) + p.documentos
    db.put("clubs", c)
    return club_out(c, user)


@app.post("/api/clubs/{club_id}/approve")
def approve_club(club_id: str, user=Depends(auth("Admin. Sistema"))):
    c = need("clubs", club_id, "Club no encontrado.")
    c["estado"], c["motivoRechazo"] = "Aprobado", ""
    db.put("clubs", c)
    db.notify(c["adminId"], f'Tu club "{c["nombre"]}" fue APROBADO y ya es visible públicamente.')
    return club_out(c, user)


@app.post("/api/clubs/{club_id}/reject")
def reject_club(club_id: str, body: dict = Body(...), user=Depends(auth("Admin. Sistema"))):
    motivo = (body.get("motivo") or "").strip()
    if not motivo:
        raise HTTPException(400, "Indica el motivo del rechazo.")
    c = need("clubs", club_id, "Club no encontrado.")
    c["estado"], c["motivoRechazo"] = "Rechazado", motivo
    db.put("clubs", c)
    db.notify(c["adminId"], f'Tu club "{c["nombre"]}" fue RECHAZADO. Motivo: {motivo}')
    return club_out(c, user)


@app.post("/api/clubs/{club_id}/apply")
def apply_club(club_id: str, user=Depends(auth("Deportista"))):
    c = need("clubs", club_id, "Este club no está disponible.")
    if c["estado"] != "Aprobado":
        raise HTTPException(400, "Este club no está disponible.")
    if user["id"] in c["miembros"]:
        raise HTTPException(400, "Ya perteneces a este club.")
    if user["id"] in c["solicitudes"]:
        raise HTTPException(400, "Ya enviaste tu solicitud.")
    c["solicitudes"].append(user["id"])
    db.put("clubs", c)
    db.notify(c["adminId"], f'{user["nombre"]} quiere unirse a tu club "{c["nombre"]}". '
                            "Revísalo en Plantilla de Deportistas.")
    return club_out(c, user)


@app.delete("/api/clubs/{club_id}/apply")
def cancel_apply(club_id: str, user=Depends(auth("Deportista"))):
    c = need("clubs", club_id, "Club no encontrado.")
    c["solicitudes"] = [i for i in c["solicitudes"] if i != user["id"]]
    db.put("clubs", c)
    return club_out(c, user)


def own_club(club_id, user):
    c = need("clubs", club_id, "Club no encontrado.")
    if c["adminId"] != user["id"]:
        raise HTTPException(403, "Solo el administrador del club puede gestionar su plantilla.")
    return c


@app.get("/api/clubs/{club_id}/roster")
def roster(club_id: str, user=Depends(auth("Admin. Club"))):
    c = own_club(club_id, user)
    pick = lambda ids: [{"id": u["id"], "nombre": u["nombre"], "email": u["email"]}
                        for u in (db.get("users", i) for i in ids) if u]
    return {"miembros": pick(c["miembros"]), "solicitudes": pick(c["solicitudes"])}


@app.post("/api/clubs/{club_id}/requests/{athlete_id}")
def answer_request(club_id: str, athlete_id: str, body: dict = Body(...), user=Depends(auth("Admin. Club"))):
    c = own_club(club_id, user)
    aceptar = bool(body.get("aceptar"))
    c["solicitudes"] = [i for i in c["solicitudes"] if i != athlete_id]
    if aceptar and athlete_id not in c["miembros"]:
        c["miembros"].append(athlete_id)
    db.put("clubs", c)
    db.notify(athlete_id, f'¡Fuiste aceptado en el club "{c["nombre"]}"!' if aceptar
              else f'Tu solicitud al club "{c["nombre"]}" no fue aceptada.')
    return {"ok": True}


@app.post("/api/clubs/{club_id}/members")
def link_member(club_id: str, body: dict = Body(...), user=Depends(auth("Admin. Club"))):
    c = own_club(club_id, user)
    email = (body.get("email") or "").strip().lower()
    at = next((u for u in db.all_("users") if u["email"] == email and u["rol"] == "Deportista"), None)
    if not at:
        raise HTTPException(404, "No se encontró un deportista con ese correo.")
    if at["id"] in c["miembros"]:
        raise HTTPException(400, "Ese deportista ya pertenece al club.")
    c["miembros"].append(at["id"])
    db.put("clubs", c)
    db.notify(at["id"], f'Fuiste vinculado al club "{c["nombre"]}".')
    return {"nombre": at["nombre"]}


@app.delete("/api/clubs/{club_id}/members/{athlete_id}")
def unlink_member(club_id: str, athlete_id: str, user=Depends(auth("Admin. Club"))):
    c = own_club(club_id, user)
    c["miembros"] = [i for i in c["miembros"] if i != athlete_id]
    db.put("clubs", c)
    return {"ok": True}


@app.post("/api/clubs/{club_id}/reviews")
def review_club(club_id: str, body: dict = Body(...), user=Depends(auth("Deportista"))):
    stars = int(body.get("estrellas") or 0)
    if not 1 <= stars <= 5:
        raise HTTPException(400, "Selecciona una calificación de 1 a 5 estrellas.")
    c = need("clubs", club_id, "Club no encontrado.")
    c["reviews"].append({"id": db.uid("rev"), "autorId": user["id"], "estrellas": stars,
                         "comentario": (body.get("comentario") or "").strip(), "fecha": db.now_iso()})
    db.put("clubs", c)
    return club_out(c, user)


# ───────────────────────── torneos ─────────────────────────
class TorneoIn(BaseModel):
    nombre: str
    disciplina: str = "Fútbol"
    categoria: str = "Abierta"
    fechaInicio: str
    fechaFin: str
    sede: str = ""
    cupo: int = 8
    costo: float = 0
    formato: str = "eliminacion"
    reglamento: str = ""
    patrocinador: str = ""


@app.get("/api/tournaments")
def list_tournaments(texto: str = "", deporte: str = "", categoria: str = "", estado: str = "",
                     viewer=Depends(optional_user)):
    items = db.all_("tournaments")
    if texto:
        items = [t for t in items if texto.lower() in t["nombre"].lower()]
    if deporte:
        items = [t for t in items if t["disciplina"] == deporte]
    if categoria:
        items = [t for t in items if t["categoria"] == categoria]
    if estado:
        items = [t for t in items if t["estado"] == estado]
    return [torneo_out(t, viewer) for t in items]


@app.get("/api/tournaments/mine")
def my_tournaments(user=Depends(auth("Organizador"))):
    return [torneo_out(t, user) for t in db.all_("tournaments") if t["organizadorId"] == user["id"]]


@app.get("/api/tournaments/{tid}")
def tournament_detail(tid: str, viewer=Depends(optional_user)):
    return torneo_out(need("tournaments", tid, "Torneo no encontrado."), viewer)


@app.post("/api/tournaments")
def create_tournament(p: TorneoIn, user=Depends(auth("Organizador"))):
    if not p.nombre.strip() or not p.fechaInicio or not p.fechaFin:
        raise HTTPException(400, "Completa nombre y fechas del torneo.")
    if p.fechaFin < p.fechaInicio:
        raise HTTPException(400, "La fecha fin no puede ser anterior a la fecha de inicio.")
    if p.cupo < 2:
        raise HTTPException(400, "El cupo máximo debe ser al menos 2.")
    if p.formato not in ("eliminacion", "todos"):
        raise HTTPException(400, "Formato no válido.")
    t = db.put("tournaments", {
        "id": db.uid("t"), "nombre": p.nombre.strip(), "disciplina": p.disciplina, "categoria": p.categoria,
        "fechaInicio": p.fechaInicio, "fechaFin": p.fechaFin, "sede": p.sede or "Por definir",
        "cupo": p.cupo, "cuposOcupados": 0, "costo": p.costo, "reglamento": p.reglamento, "estado": "Abierto",
        "formato": p.formato, "organizadorId": user["id"], "teams": [], "bracket": None, "matches": [],
        "standings": None, "sponsors": [{"nombre": p.patrocinador.strip()}] if p.patrocinador.strip() else [],
        "waitlist": [], "encuestaEnviada": False})
    return torneo_out(t, user)


@app.post("/api/tournaments/{tid}/register")
def register_tournament(tid: str, user=Depends(auth("Deportista"))):
    t = need("tournaments", tid, "Torneo no encontrado.")
    if t["estado"] != "Abierto":
        raise HTTPException(400, "Inscripciones cerradas.")
    if any(r["tournamentId"] == tid and r["athleteId"] == user["id"] for r in db.all_("registrations")):
        raise HTTPException(400, "Ya estás inscrito en este torneo.")
    edad = calc_age(user.get("fechaNacimiento"))
    lo, hi = CATEGORIA_EDAD.get(t["categoria"], (0, 999))
    if edad is None:
        raise HTTPException(400, "Tu perfil no tiene fecha de nacimiento registrada; no se puede validar la categoría.")
    if not lo <= edad <= hi:
        raise HTTPException(400, f"No cumples el rango de edad para la categoría {t['categoria']} "
                                 f"(tienes {edad} años). Inscripción bloqueada.")
    if not user.get("docSubido"):
        raise HTTPException(400, "Debes tener tu documento de identidad verificado para inscribirte.")
    if t["cuposOcupados"] >= t["cupo"]:
        raise HTTPException(400, "El torneo ya no tiene cupos disponibles.")
    db.put("registrations", {"id": db.uid("reg"), "tournamentId": tid, "athleteId": user["id"],
                             "estado": "Pendiente", "fecha": db.now_iso()})
    t["cuposOcupados"] += 1
    t["teams"].append({"id": user["id"], "nombre": user["nombre"]})
    if t["waitlist"] and user["id"] in t["waitlist"]:
        t["waitlist"].remove(user["id"])
    if t["cuposOcupados"] >= t["cupo"]:
        t["estado"] = "Cerrado"
    db.put("tournaments", t)
    db.notify(t["organizadorId"], f'{user["nombre"]} se inscribió al torneo "{t["nombre"]}".')
    return torneo_out(t, user)


@app.post("/api/tournaments/{tid}/waitlist")
def join_waitlist(tid: str, user=Depends(auth("Deportista"))):
    t = need("tournaments", tid, "Torneo no encontrado.")
    if user["id"] not in t["waitlist"]:
        t["waitlist"].append(user["id"])
        db.put("tournaments", t)
    return torneo_out(t, user)


def own_tournament(tid, user):
    t = need("tournaments", tid, "Torneo no encontrado.")
    if t["organizadorId"] != user["id"]:
        raise HTTPException(403, "Solo el organizador del torneo puede hacer esto.")
    return t


@app.post("/api/tournaments/{tid}/bracket")
def generate_bracket(tid: str, user=Depends(auth("Organizador"))):
    t = own_tournament(tid, user)
    if len(t["teams"]) < 2:
        raise HTTPException(400, "Se necesitan al menos 2 inscritos para generar el fixture.")
    teams = list(t["teams"])
    random.shuffle(teams)

    def match(ronda, local, visitante):
        return {"id": db.uid("m"), "ronda": ronda, "local": local, "visitante": visitante,
                "marcadorLocal": None, "marcadorVisitante": None, "estado": "Programado"}

    if t["formato"] == "todos":
        t["matches"] = [match(1, teams[i], teams[j]) for i in range(len(teams)) for j in range(i + 1, len(teams))]
        t["bracket"] = None
        t["standings"] = [{"id": x["id"], "nombre": x["nombre"], "pj": 0, "pg": 0, "pe": 0, "pp": 0, "pts": 0}
                          for x in teams]
    else:
        size = 1
        while size < len(teams):
            size *= 2
        teams += [{"id": None, "nombre": "BYE"}] * (size - len(teams))
        rounds, matches, current, ronda = [], [], teams, 1
        while len(current) > 1:
            round_matches = []
            for i in range(0, len(current), 2):
                m = match(ronda, current[i], current[i + 1])
                if m["visitante"]["id"] is None:  # BYE: avanza automáticamente
                    m["estado"], m["marcadorLocal"], m["marcadorVisitante"] = "Bye", 1, 0
                round_matches.append(m)
                matches.append(m)
            rounds.append(round_matches)
            current = [m["local"] if m["estado"] == "Bye" else
                       {"id": "TBD_" + m["id"], "nombre": f"Ganador partido {matches.index(m) + 1}"}
                       for m in round_matches]
            ronda += 1
        t["bracket"], t["matches"], t["standings"] = rounds, matches, None
        # El bracket anida los mismos partidos que `matches`; se re-sincroniza al guardar (ver sync_bracket).
    t["estado"] = "En curso"
    db.put("tournaments", t)
    for tm in t["teams"]:
        db.notify(tm["id"], f'Se generó el fixture del torneo "{t["nombre"]}". ¡Revisa tu llave!')
    return torneo_out(t, user)


def sync_bracket(t):
    """`bracket` y `matches` se guardan como JSON; tras mutar matches se reconstruyen las rondas."""
    if not t.get("bracket"):
        return
    by_id = {m["id"]: m for m in t["matches"]}
    t["bracket"] = [[by_id[m["id"]] for m in rnd] for rnd in t["bracket"]]


def is_real(team):
    return bool(team and team.get("id") and not str(team["id"]).startswith("TBD_"))


@app.post("/api/tournaments/{tid}/matches/{mid}/score")
def score_match(tid: str, mid: str, body: dict = Body(...), user=Depends(auth("Organizador"))):
    t = own_tournament(tid, user)
    m = next((x for x in t["matches"] if x["id"] == mid), None)
    if not m:
        raise HTTPException(404, "Partido no encontrado.")
    if m["estado"] != "Programado" or not (is_real(m["local"]) and is_real(m["visitante"])):
        raise HTTPException(400, "Este partido aún no está listo para registrar marcador.")
    try:
        sl, sv = int(body.get("local")), int(body.get("visitante"))
    except (TypeError, ValueError):
        raise HTTPException(400, "Marcador no válido.")
    if sl < 0 or sv < 0:
        raise HTTPException(400, "Marcador no válido.")
    m["marcadorLocal"], m["marcadorVisitante"], m["estado"] = sl, sv, "Jugado"

    if t["formato"] == "eliminacion":
        ganador = m["local"] if sl >= sv else m["visitante"]
        for x in t["matches"]:
            if x["local"].get("id") == "TBD_" + m["id"]:
                x["local"] = ganador
            if x["visitante"].get("id") == "TBD_" + m["id"]:
                x["visitante"] = ganador
        sync_bracket(t)
    else:
        st = {s["id"]: {**s, "pj": 0, "pg": 0, "pe": 0, "pp": 0, "pts": 0} for s in t["standings"]}
        for x in (x for x in t["matches"] if x["estado"] == "Jugado"):
            l, v = st.get(x["local"]["id"]), st.get(x["visitante"]["id"])
            if not l or not v:
                continue
            l["pj"] += 1
            v["pj"] += 1
            if x["marcadorLocal"] > x["marcadorVisitante"]:
                l["pg"] += 1; l["pts"] += 3; v["pp"] += 1
            elif x["marcadorLocal"] < x["marcadorVisitante"]:
                v["pg"] += 1; v["pts"] += 3; l["pp"] += 1
            else:
                l["pe"] += 1; v["pe"] += 1; l["pts"] += 1; v["pts"] += 1
        t["standings"] = sorted(st.values(), key=lambda s: -s["pts"])

    if t["matches"] and all(x["estado"] in ("Jugado", "Bye") for x in t["matches"]) and t["estado"] != "Finalizado":
        t["estado"] = "Finalizado"
        if not t["encuestaEnviada"]:
            t["encuestaEnviada"] = True
            for tm in t["teams"]:
                db.notify(tm["id"], f'El torneo "{t["nombre"]}" finalizó. 📋 Encuesta de satisfacción: '
                                    "¿cómo calificarías la organización?")
    db.put("tournaments", t)
    return torneo_out(t, user)


# ───────────────────────── noticias / usuarios / mensajes / reportes ─────────────────────────
@app.get("/api/news")
def list_news():
    return sorted(db.all_("news"), key=lambda n: n["fecha"], reverse=True)


@app.post("/api/news")
def create_news(body: dict = Body(...), user=Depends(auth("Admin. Sistema"))):
    titulo, contenido = (body.get("titulo") or "").strip(), (body.get("contenido") or "").strip()
    if not titulo or not contenido:
        raise HTTPException(400, "Completa título y contenido.")
    return db.put("news", {"id": db.uid("n"), "titulo": titulo, "contenido": contenido,
                           "fecha": db.now_iso(), "autorId": user["id"]})


@app.get("/api/users")
def list_users(user=Depends(auth("Admin. Sistema"))):
    return [user_out(u) for u in db.all_("users")]


@app.put("/api/users/{user_id}/role")
def change_role(user_id: str, body: dict = Body(...), admin=Depends(auth("Admin. Sistema"))):
    rol = body.get("rol")
    if rol not in ROLES:
        raise HTTPException(400, "Rol no válido.")
    u = need("users", user_id, "Usuario no encontrado.")
    u["rol"] = rol
    db.put("users", u)
    db.notify(u["id"], f"Tu rol fue actualizado a {rol} por un Administrador del Sistema.")
    return user_out(u)


@app.get("/api/messages/targets")
def message_targets(user=Depends(auth("Organizador", "Admin. Club"))):
    if user["rol"] == "Organizador":
        return [{"label": t["nombre"], "type": "torneo", "id": t["id"], "n": len(t["teams"])}
                for t in db.all_("tournaments") if t["organizadorId"] == user["id"]]
    return [{"label": c["nombre"], "type": "club", "id": c["id"], "n": len(c["miembros"])}
            for c in db.all_("clubs") if c["adminId"] == user["id"]]


@app.post("/api/messages")
def send_message(body: dict = Body(...), user=Depends(auth("Organizador", "Admin. Club"))):
    contenido = (body.get("contenido") or "").strip()
    if not contenido:
        raise HTTPException(400, "Escribe un mensaje.")
    kind, target = body.get("type"), body.get("id")
    if kind == "torneo":
        dest = [tm["id"] for tm in own_tournament(target, user)["teams"] if tm["id"]]
    elif kind == "club":
        dest = list(own_club(target, user)["miembros"])
    else:
        raise HTTPException(400, "Destino no válido.")
    db.put("messages", {"id": db.uid("msg"), "type": kind, "target": target, "contenido": contenido,
                        "fecha": db.now_iso(), "destinatarios": dest})
    for d in dest:
        db.notify(d, f"📢 Mensaje: {contenido}")
    return {"enviados": len(dest)}


def _in_range(value, desde, hasta):
    day = (value or "")[:10]
    return (not desde or day >= desde) and (not hasta or day <= hasta)


@app.get("/api/reports/{tipo}")
def report(tipo: str, desde: str = "", hasta: str = "", user=Depends(auth("Admin. Club", "Admin. Sistema"))):
    if tipo == "clubes":
        rows = [{"Nombre": c["nombre"], "Disciplina": c["disciplina"], "Comuna": c["comuna"],
                 "Estado": c["estado"], "Miembros": len(c["miembros"])} for c in db.all_("clubs")]
    elif tipo == "torneos":
        rows = [{"Nombre": t["nombre"], "Disciplina": t["disciplina"], "Estado": t["estado"],
                 "Inscritos": t["cuposOcupados"], "Cupo": t["cupo"]}
                for t in db.all_("tournaments") if _in_range(t["fechaInicio"], desde, hasta)]
    elif tipo == "inscripciones":
        rows = []
        for r in db.all_("registrations"):
            if not _in_range(r["fecha"], desde, hasta):
                continue
            t, a = db.get("tournaments", r["tournamentId"]), db.get("users", r["athleteId"])
            rows.append({"Torneo": t["nombre"] if t else "—", "Deportista": a["nombre"] if a else "—",
                         "Fecha": r["fecha"][:10], "Estado": r["estado"]})
    else:
        raise HTTPException(404, "Tipo de reporte no válido.")
    db.put("reports", {"id": db.uid("rep"), "tipo": tipo, "fecha": db.now_iso(), "userId": user["id"]})
    return rows


# ───────────────────────── dashboard por rol ─────────────────────────
@app.get("/api/dashboard")
def dashboard(user=Depends(auth())):
    clubs, torneos = db.all_("clubs"), db.all_("tournaments")
    rol = user["rol"]
    if rol == "Admin. Sistema":
        counts = {c: 0 for c in COMUNAS}
        for c in clubs:
            if c["estado"] == "Aprobado":
                counts[c["comuna"]] = counts.get(c["comuna"], 0) + 1
        users = db.all_("users")
        now = datetime.now(timezone.utc)
        return {"rol": rol,
                "clubesActivos": sum(c["estado"] == "Aprobado" for c in clubs),
                "clubesPendientes": sum(c["estado"] == "Pendiente" for c in clubs),
                "torneosCurso": sum(t["estado"] == "En curso" for t in torneos),
                "deportistas": sum(u["rol"] == "Deportista" for u in users),
                "crecimientoMes": sum((now - datetime.fromisoformat(u["fechaRegistro"])).days < 30 for u in users),
                "comunas": counts,
                "auditoria": [{"nombre": c["nombre"], "estado": c["estado"]} for c in clubs[-4:][::-1]]}
    if rol == "Admin. Club":
        mine = [c for c in clubs if c["adminId"] == user["id"]]
        return {"rol": rol, "clubes": [club_out(c, user) for c in mine],
                "afiliados": sum(len(c["miembros"]) for c in mine),
                "aprobados": sum(c["estado"] == "Aprobado" for c in mine)}
    if rol == "Organizador":
        mine = [t for t in torneos if t["organizadorId"] == user["id"]]
        return {"rol": rol, "torneos": [torneo_out(t, user) for t in mine],
                "abiertos": sum(t["estado"] == "Abierto" for t in mine),
                "inscripciones": sum(t["cuposOcupados"] for t in mine)}
    return {"rol": rol,
            "inscripciones": sum(r["athleteId"] == user["id"] for r in db.all_("registrations")),
            "clubes": sum(user["id"] in c["miembros"] for c in clubs),
            "edad": calc_age(user.get("fechaNacimiento")),
            "torneosAbiertos": [torneo_out(t, user) for t in torneos if t["estado"] == "Abierto"][:3]}


# ───────────────────────── frontend compilado (producción) ─────────────────────────
DIST = Path(__file__).resolve().parent.parent.parent / "frontend" / "dist"
if DIST.exists():
    app.mount("/assets", StaticFiles(directory=DIST / "assets"), name="assets")

    @app.get("/{path:path}")
    def spa(path: str):
        f = DIST / path
        return FileResponse(f if path and f.is_file() else DIST / "index.html")
