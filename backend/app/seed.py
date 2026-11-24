"""Datos de demostración (equivalentes a seedDB() del prototipo)."""
import random
from datetime import datetime, timedelta, timezone

from . import db
from .security import hash_password


def seed(force: bool = False):
    if force:
        db.wipe()
    if db.count("users"):
        return

    def mk_user(nombre, email, rol, fnac=None, doc=False):
        return db.put("users", {
            "id": db.uid("u"), "nombre": nombre, "email": email, "passHash": hash_password("1234"),
            "rol": rol, "telefono": "300 000 0000", "estado": "activo", "fechaRegistro": db.now_iso(),
            "docSubido": doc, "fechaNacimiento": fnac, "carnet": {},
        })

    depo = mk_user("Camila Ríos", "deportista@sportpoint.co", "Deportista", "2008-04-12", True)
    club_admin = mk_user("Andrés Muñoz", "club@sportpoint.co", "Admin. Club")
    org = mk_user("Laura Gómez", "organizador@sportpoint.co", "Organizador")
    mk_user("Sistema Admin", "admin@sportpoint.co", "Admin. Sistema")
    mk_user("Juan Pablo Vélez", "juanp@sportpoint.co", "Deportista", "2011-09-01", True)

    def mk_club(nombre, disciplina, comuna, estado, miembros=()):
        return db.put("clubs", {
            "id": db.uid("c"), "nombre": nombre, "disciplina": disciplina, "comuna": comuna,
            "direccion": f"Calle {random.randint(10, 89)} # {random.randint(20, 79)}-{random.randint(10, 89)}",
            "horarios": "Lun-Vie 4:00pm-6:00pm", "entrenadores": ["Prof. " + nombre.split()[0]],
            "cuota": random.choice([0, 40000, 60000, 90000, 120000]), "logo": None, "estado": estado,
            "motivoRechazo": "", "adminId": club_admin["id"], "documentos": [f"ficha_{db.uid('doc')}.pdf"],
            "miembros": list(miembros), "solicitudes": [], "reviews": [],
        })

    mk_club("Club Deportivo Águilas", "Fútbol", "Comuna 11 - Laureles-Estadio", "Aprobado", [depo["id"]])
    mk_club("Estrellas del Poblado Baloncesto", "Baloncesto", "Comuna 14 - Poblado", "Aprobado")
    mk_club("Natación Aranjuez", "Natación", "Comuna 4 - Aranjuez", "Pendiente")
    mk_club("Ciclomontañismo Belén", "Ciclismo", "Comuna 16 - Belén", "Aprobado")

    today = datetime.now(timezone.utc).date()
    d = lambda n: (today + timedelta(days=n)).isoformat()

    def mk_torneo(nombre, disciplina, categoria, estado, formato, cupo, ini, fin):
        return db.put("tournaments", {
            "id": db.uid("t"), "nombre": nombre, "disciplina": disciplina, "categoria": categoria,
            "fechaInicio": ini, "fechaFin": fin, "sede": "Unidad Deportiva " + disciplina,
            "cupo": cupo, "cuposOcupados": 0, "costo": random.choice([0, 20000, 30000]),
            "reglamento": "Reglamento estándar SportPoint.", "estado": estado, "formato": formato,
            "organizadorId": org["id"], "teams": [], "bracket": None, "matches": [], "standings": None,
            "sponsors": [], "waitlist": [], "encuestaEnviada": False,
        })

    mk_torneo("Copa SportPoint Sub-15", "Fútbol", "Sub-15", "Abierto", "eliminacion", 8, d(10), d(20))
    mk_torneo("Torneo Relámpago Baloncesto", "Baloncesto", "Abierta", "Abierto", "eliminacion", 4, d(10), d(10))
    mk_torneo("Liga Escolar de Natación", "Natación", "Sub-12", "En curso", "todos", 6, d(-5), d(20))

    admin = next(u for u in db.all_("users") if u["rol"] == "Admin. Sistema")
    db.put("news", {"id": db.uid("n"), "titulo": "SportPoint llega a Medellín",
                    "contenido": "La plataforma facilita el descubrimiento de clubes y torneos en Medellín.",
                    "fecha": db.now_iso(), "autorId": admin["id"]})
    db.put("news", {"id": db.uid("n"), "titulo": "Inscripciones abiertas: Copa SportPoint Sub-15",
                    "contenido": "Ya puedes inscribir a tu equipo en la Copa SportPoint Sub-15. Cupos limitados.",
                    "fecha": db.now_iso(), "autorId": admin["id"]})


if __name__ == "__main__":
    import sys
    seed(force="--reset" in sys.argv)
    print("Datos de demo listos." if "--reset" not in sys.argv else "Base de datos reiniciada con datos de demo.")
