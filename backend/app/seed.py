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


NOMBRES = ["Camila", "Juan", "Valentina", "Santiago", "Sofía", "Mateo", "Isabella", "Samuel", "Daniela", "Emmanuel",
           "Mariana", "Nicolás", "Luciana", "Tomás", "Gabriela", "Sebastián", "Paula", "Felipe", "Laura", "Andrés",
           "Manuela", "Simón", "Salomé", "Alejandro", "Antonia", "Julián", "Juliana", "David", "Sara", "Esteban",
           "María José", "Miguel", "Natalia", "Cristian", "Karen", "Jhon", "Lorena", "Brayan", "Yuliana", "Kevin"]
APELLIDOS = ["Gómez", "Rodríguez", "Martínez", "López", "García", "Hernández", "Ospina", "Restrepo", "Zapata", "Cardona",
             "Vélez", "Monsalve", "Arango", "Henao", "Mejía", "Londoño", "Ríos", "Giraldo", "Torres", "Castaño"]


def seed_demo():
    """Datos extra para la entrega: muchos usuarios, clubes y torneos en distintos estados del fixture.

    Es idempotente (si ya existe `deportista01@sportpoint.co` no hace nada).
    Uso:  python -m app.seed --demo
    """
    if any(u["email"] == "deportista01@sportpoint.co" for u in db.all_("users")):
        print("Los datos de demo ya existen. Usa --reset --demo para recrearlos.")
        return
    from . import main as api  # reutiliza la lógica real de inscripción, fixture y marcadores

    rnd = random.Random(2026)
    hoy = datetime.now(timezone.utc).date()
    d = lambda n: (hoy + timedelta(days=n)).isoformat()
    ph = hash_password("1234")  # un solo hash: las 60+ cuentas usan la clave 1234

    def mk_user(nombre, email, rol, fnac=None, doc=True):
        return db.put("users", {
            "id": db.uid("u"), "nombre": nombre, "email": email, "passHash": ph, "rol": rol,
            "telefono": f"300 {rnd.randint(100, 999)} {rnd.randint(1000, 9999)}", "estado": "activo",
            "fechaRegistro": db.now_iso(), "docSubido": doc, "fechaNacimiento": fnac, "carnet": {},
        })

    def nacimiento(edad):
        return (hoy - timedelta(days=edad * 365 + rnd.randint(30, 300))).isoformat()

    # ── Deportistas: 40 (edades repartidas para probar Sub-12 / Sub-15 / Sub-20 / Abierta) ──
    edades = [11, 12, 14, 15, 17, 18, 19, 20, 22, 24, 26, 28, 30]
    atletas = []
    for i in range(1, 41):
        nombre = f"{NOMBRES[i - 1]} {APELLIDOS[(i * 3) % len(APELLIDOS)]}"
        if i <= 14:
            edad = rnd.choice([13, 14, 15])          # Sub-15
        elif i <= 22:
            edad = rnd.choice([16, 17, 18, 19])      # Sub-20
        elif i <= 28:
            edad = rnd.choice([9, 10, 11, 12])       # Sub-12
        else:
            edad = rnd.choice(edades[8:])            # adultos (categoría Abierta)
        atletas.append(mk_user(nombre, f"deportista{i:02d}@sportpoint.co", "Deportista", nacimiento(edad),
                               doc=i not in (39, 40)))  # 39 y 40 sin documento verificado (para mostrar el bloqueo)

    # ── Administradores de club y organizadores ──
    admins = [mk_user(n, f"adminclub{i:02d}@sportpoint.co", "Admin. Club") for i, n in enumerate(
        ["Carlos Mejía", "Luz Marina Ospina", "Jorge Arango", "Diana Cardona", "Héctor Londoño"], start=1)]
    orgs = [mk_user(n, f"organizador{i:02d}@sportpoint.co", "Organizador") for i, n in enumerate(
        ["Paola Restrepo", "Ricardo Zapata"], start=2)]
    org1 = next(u for u in db.all_("users") if u["email"] == "organizador@sportpoint.co")
    club_base = next(u for u in db.all_("users") if u["email"] == "club@sportpoint.co")
    sys_admin = next(u for u in db.all_("users") if u["rol"] == "Admin. Sistema")

    # ── Clubes: aprobados con plantilla y solicitudes pendientes, pendientes de validar y uno rechazado ──
    def mk_club(nombre, disciplina, comuna, estado, admin, miembros=(), solicitudes=(), reviews=(), motivo=""):
        return db.put("clubs", {
            "id": db.uid("c"), "nombre": nombre, "disciplina": disciplina, "comuna": comuna,
            "direccion": f"Carrera {rnd.randint(30, 90)} # {rnd.randint(20, 79)}-{rnd.randint(10, 89)}",
            "horarios": rnd.choice(["Lun-Vie 4:00pm-6:00pm", "Mar-Jue 5:00pm-7:00pm", "Sáb 8:00am-12:00m"]),
            "entrenadores": ["Prof. " + nombre.split()[1] if len(nombre.split()) > 1 else "Prof. " + nombre],
            "cuota": rnd.choice([0, 40000, 60000, 90000]), "logo": None, "estado": estado, "motivoRechazo": motivo,
            "adminId": admin["id"], "documentos": [f"ficha_{db.uid('doc')}.pdf"],
            "miembros": [a["id"] for a in miembros], "solicitudes": [a["id"] for a in solicitudes],
            "reviews": [{"id": db.uid("rev"), "autorId": a["id"], "estrellas": e, "comentario": c,
                         "fecha": db.now_iso()} for a, e, c in reviews],
        })

    mk_club("Halcones Fútbol Club", "Fútbol", "Comuna 10 - La Candelaria", "Aprobado", admins[0],
            atletas[0:9], atletas[20:24],
            [(atletas[0], 5, "Excelentes entrenadores."), (atletas[1], 4, "Buen ambiente."), (atletas[2], 5, "")])
    mk_club("Voleibol Laureles", "Voleibol", "Comuna 11 - Laureles-Estadio", "Aprobado", admins[1],
            atletas[9:17], atletas[24:27], [(atletas[9], 5, "Muy organizados."), (atletas[10], 4, "")])
    mk_club("Baloncesto Guayabal", "Baloncesto", "Comuna 15 - Guayabal", "Aprobado", admins[2],
            atletas[17:25], atletas[28:30], [(atletas[17], 4, "Buenas instalaciones.")])
    mk_club("Tenis Club Poblado", "Tenis", "Comuna 14 - Poblado", "Aprobado", admins[3],
            atletas[30:36], [], [(atletas[30], 5, "Canchas en excelente estado.")])
    mk_club("Patinaje Belén Sobre Ruedas", "Patinaje", "Comuna 16 - Belén", "Aprobado", club_base,
            atletas[3:7], atletas[34:37])
    mk_club("Atletismo Popular Medellín", "Atletismo", "Comuna 1 - Popular", "Pendiente", admins[4])
    mk_club("Natación Delfines Guayabal", "Natación", "Comuna 15 - Guayabal", "Pendiente", admins[3])
    mk_club("Ciclismo Los Cóndores", "Ciclismo", "Comuna 4 - Aranjuez", "Rechazado", admins[2],
            motivo="La documentación del club está incompleta (falta el acta de constitución).")

    # ── Torneos en todos los estados del fixture (todos del organizador de demo) ──
    def mk_torneo(nombre, disciplina, categoria, formato, cupo, ini, fin, org=org1, costo=0, patro=""):
        return db.put("tournaments", {
            "id": db.uid("t"), "nombre": nombre, "disciplina": disciplina, "categoria": categoria,
            "fechaInicio": ini, "fechaFin": fin, "sede": f"Unidad Deportiva {disciplina}", "cupo": cupo,
            "cuposOcupados": 0, "costo": costo, "reglamento": "Reglamento estándar SportPoint.",
            "estado": "Abierto", "formato": formato, "organizadorId": org["id"], "teams": [], "bracket": None,
            "matches": [], "standings": None, "sponsors": [{"nombre": patro}] if patro else [],
            "waitlist": [], "encuestaEnviada": False,
        })

    def inscribir(t, gente):
        for a in gente:
            api.register_tournament(t["id"], a)
        return db.get("tournaments", t["id"])

    def jugar(t, org, max_partidos=None):
        """Registra marcadores sin empates hasta terminar (o hasta `max_partidos`)."""
        jugados = 0
        while max_partidos is None or jugados < max_partidos:
            t = db.get("tournaments", t["id"])
            pend = [m for m in t["matches"] if m["estado"] == "Programado"
                    and api.is_real(m["local"]) and api.is_real(m["visitante"])]
            if not pend:
                break
            m = pend[0]
            a, b = rnd.sample(range(0, 6), 2)
            api.score_match(t["id"], m["id"], {"local": a, "visitante": b}, org)
            jugados += 1

    sub15 = atletas[0:14]
    sub20 = atletas[14:22]
    libres = [a for a in atletas if a["docSubido"]]

    # 1) Cerrado con 8 inscritos y SIN fixture → en la demo el organizador pulsa "Generar fixture"
    t1 = mk_torneo("Copa Medellín Fútbol Sub-15", "Fútbol", "Sub-15", "eliminacion", 8, d(7), d(14),
                   costo=20000, patro="Bebidas Aburrá")
    inscribir(t1, sub15[:8])
    # 2) Abierto con 6 de 8 cupos y SIN fixture → inscribir en vivo y generar con BYE (6 no es potencia de 2)
    t2 = mk_torneo("Copa Aburrá Baloncesto Libre", "Baloncesto", "Abierta", "eliminacion", 8, d(10), d(12))
    inscribir(t2, libres[10:16])
    # 3) Todos contra todos: 6 equipos, 5 partidos jugados → tabla de posiciones viva
    t3 = mk_torneo("Liga Comunal de Voleibol", "Voleibol", "Abierta", "todos", 6, d(-6), d(25), org=orgs[0])
    inscribir(t3, libres[16:22])
    api.generate_bracket(t3["id"], orgs[0])
    jugar(t3, orgs[0], max_partidos=5)
    # 4) Eliminación completa y Finalizado → llave con todos los marcadores
    t4 = mk_torneo("Copa Verano Fútbol Sala", "Fútbol", "Sub-20", "eliminacion", 8, d(-20), d(-12), org=orgs[1],
                   patro="Deportes El Estadio")
    inscribir(t4, sub20[:8])
    api.generate_bracket(t4["id"], orgs[1])
    jugar(t4, orgs[1])
    # 5) Llave grande de 16 con la primera ronda jugada → torneo "En curso"
    t5 = mk_torneo("Torneo Abierto de Tenis", "Tenis", "Abierta", "eliminacion", 16, d(-2), d(9))
    inscribir(t5, libres[:16])
    api.generate_bracket(t5["id"], org1)
    jugar(t5, org1, max_partidos=8)
    # 6) Torneo infantil abierto, vacío → para inscribir en vivo
    mk_torneo("Festival Infantil de Natación", "Natación", "Sub-12", "todos", 12, d(15), d(15))

    db.put("news", {"id": db.uid("n"), "titulo": "Arranca la Liga Comunal de Voleibol",
                    "contenido": "Seis equipos juegan todos contra todos. Sigue la tabla de posiciones en vivo.",
                    "fecha": db.now_iso(), "autorId": sys_admin["id"]})
    db.put("news", {"id": db.uid("n"), "titulo": "Cierran inscripciones de la Copa Medellín Sub-15",
                    "contenido": "Los ocho cupos están completos; el organizador generará el fixture esta semana.",
                    "fecha": db.now_iso(), "autorId": sys_admin["id"]})
    print(f"Demo lista: {len(atletas)} deportistas, {len(admins)} admins de club, {len(orgs)} organizadores, "
          "8 clubes y 6 torneos.")


if __name__ == "__main__":
    import sys
    seed(force="--reset" in sys.argv)
    if "--demo" in sys.argv:
        seed_demo()
    print("Datos de demo listos." if "--reset" not in sys.argv else "Base de datos reiniciada con datos de demo.")
