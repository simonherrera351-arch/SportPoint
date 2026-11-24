import os
import tempfile

os.environ["SP_DB"] = os.path.join(tempfile.mkdtemp(), "t.db")
os.environ["SP_SECRET"] = "test-secret"

from fastapi.testclient import TestClient  # noqa: E402

from app.main import app  # noqa: E402

client = TestClient(app)
client.__enter__()  # dispara startup (seed)


def login(email, pw="1234"):
    r = client.post("/api/auth/login", json={"email": email, "password": pw})
    assert r.status_code == 200, r.text
    return {"Authorization": "Bearer " + r.json()["token"]}


def test_login_and_roles():
    assert client.post("/api/auth/login", json={"email": "x@y.co", "password": "1"}).status_code == 401
    h = login("deportista@sportpoint.co")
    assert client.get("/api/auth/me", headers=h).json()["rol"] == "Deportista"
    assert "passHash" not in client.get("/api/auth/me", headers=h).json()
    assert client.get("/api/users", headers=h).status_code == 403
    assert client.get("/api/dashboard").status_code == 401


def test_register_rules():
    r = client.post("/api/auth/register", json={"nombre": "A", "email": "a@a.co", "password": "1234", "rol": "Admin. Sistema"})
    assert r.status_code == 400
    r = client.post("/api/auth/register", json={"nombre": "Nuevo", "email": "nuevo@a.co", "password": "1234",
                                                 "rol": "Deportista", "fechaNacimiento": "2009-01-01", "docSubido": True})
    assert r.status_code == 200 and r.json()["user"]["rol"] == "Deportista"
    assert client.post("/api/auth/register", json={"nombre": "Nuevo", "email": "nuevo@a.co", "password": "1234"}).status_code == 400


def test_club_flow():
    adm, club, dep = login("admin@sportpoint.co"), login("club@sportpoint.co"), login("deportista@sportpoint.co")
    r = client.post("/api/clubs", headers=club, json={"nombre": "Club Nuevo", "cuota": 0})
    assert r.status_code == 200 and r.json()["estado"] == "Pendiente"
    cid = r.json()["id"]
    assert all(c["id"] != cid for c in client.get("/api/clubs").json())
    assert client.post(f"/api/clubs/{cid}/approve", headers=club).status_code == 403
    assert client.post(f"/api/clubs/{cid}/approve", headers=adm).status_code == 200
    assert client.post(f"/api/clubs/{cid}/apply", headers=dep).json()["solicitudEnviada"] is True
    uid = client.get("/api/auth/me", headers=dep).json()["id"]
    assert client.post(f"/api/clubs/{cid}/requests/{uid}", headers=dep, json={"aceptar": True}).status_code == 403
    assert client.post(f"/api/clubs/{cid}/requests/{uid}", headers=club, json={"aceptar": True}).status_code == 200
    assert client.get(f"/api/clubs/{cid}", headers=dep).json()["soyMiembro"] is True
    assert client.post(f"/api/clubs/{cid}/reviews", headers=dep, json={"estrellas": 5, "comentario": "ok"}).json()["rating"] == 5.0


def test_tournament_registration_rules():
    dep, juan = login("deportista@sportpoint.co"), login("juanp@sportpoint.co")
    ts = {t["nombre"]: t for t in client.get("/api/tournaments").json()}
    copa = ts["Copa SportPoint Sub-15"]
    # Camila nació en 2008 → no entra en Sub-15
    r = client.post(f"/api/tournaments/{copa['id']}/register", headers=dep)
    assert r.status_code == 400 and "rango de edad" in r.json()["detail"]
    rel = ts["Torneo Relámpago Baloncesto"]  # Abierta, cupo 4
    assert client.post(f"/api/tournaments/{rel['id']}/register", headers=dep).status_code == 200
    assert client.post(f"/api/tournaments/{rel['id']}/register", headers=dep).status_code == 400  # duplicado


def test_bracket_and_scores_elimination():
    org, dep = login("organizador@sportpoint.co"), login("deportista@sportpoint.co")
    r = client.post("/api/tournaments", headers=org, json={
        "nombre": "Copa Test", "fechaInicio": "2030-01-01", "fechaFin": "2030-01-02", "cupo": 4, "categoria": "Abierta"})
    tid = r.json()["id"]
    assert client.post(f"/api/tournaments/{tid}/bracket", headers=org).status_code == 400  # sin inscritos
    for i in range(3):
        reg = client.post("/api/auth/register", json={"nombre": f"J{i}", "email": f"j{i}@t.co", "password": "1234",
                                                      "fechaNacimiento": "2000-01-01", "docSubido": True}).json()
        h = {"Authorization": "Bearer " + reg["token"]}
        assert client.post(f"/api/tournaments/{tid}/register", headers=h).status_code == 200
    assert client.post(f"/api/tournaments/{tid}/bracket", headers=dep).status_code == 403  # no es organizador
    t = client.post(f"/api/tournaments/{tid}/bracket", headers=org).json()
    assert t["estado"] == "En curso" and len(t["bracket"]) == 2  # 3 equipos → 4 con un BYE
    for _ in range(3):  # juega todo lo jugable hasta terminar
        t = client.get(f"/api/tournaments/{tid}").json()
        playable = [m for m in t["matches"] if m["estado"] == "Programado"
                    and m["local"]["id"] and m["visitante"]["id"]
                    and not str(m["local"]["id"]).startswith("TBD_") and not str(m["visitante"]["id"]).startswith("TBD_")]
        if not playable:
            break
        mid = playable[0]["id"]
        assert client.post(f"/api/tournaments/{tid}/matches/{mid}/score", headers=dep, json={"local": 2, "visitante": 1}).status_code == 403
        assert client.post(f"/api/tournaments/{tid}/matches/{mid}/score", headers=org, json={"local": 2, "visitante": 1}).status_code == 200
    t = client.get(f"/api/tournaments/{tid}").json()
    assert t["estado"] == "Finalizado"
    # el bracket anidado refleja los marcadores (en el prototipo se desincronizaba)
    assert all(m["estado"] != "Programado" for rnd in t["bracket"] for m in rnd)


def test_round_robin_standings():
    org = login("organizador@sportpoint.co")
    tid = client.post("/api/tournaments", headers=org, json={
        "nombre": "Liga Test", "fechaInicio": "2030-01-01", "fechaFin": "2030-02-01", "cupo": 3,
        "categoria": "Abierta", "formato": "todos"}).json()["id"]
    for i in range(3):
        reg = client.post("/api/auth/register", json={"nombre": f"L{i}", "email": f"l{i}@t.co", "password": "1234",
                                                      "fechaNacimiento": "2000-01-01", "docSubido": True}).json()
        client.post(f"/api/tournaments/{tid}/register", headers={"Authorization": "Bearer " + reg["token"]})
    t = client.post(f"/api/tournaments/{tid}/bracket", headers=org).json()
    assert len(t["matches"]) == 3 and len(t["standings"]) == 3
    for m in t["matches"]:
        t = client.post(f"/api/tournaments/{tid}/matches/{m['id']}/score", headers=org, json={"local": 1, "visitante": 1}).json()
    assert t["estado"] == "Finalizado" and all(s["pts"] == 2 for s in t["standings"])


def test_admin_and_reports_and_messages():
    adm, org, dep = login("admin@sportpoint.co"), login("organizador@sportpoint.co"), login("deportista@sportpoint.co")
    users = client.get("/api/users", headers=adm).json()
    assert all("passHash" not in u for u in users)
    uid = next(u["id"] for u in users if u["email"] == "juanp@sportpoint.co")
    assert client.put(f"/api/users/{uid}/role", headers=dep, json={"rol": "Admin. Sistema"}).status_code == 403
    assert client.get("/api/reports/clubes", headers=adm).status_code == 200
    assert client.get("/api/reports/clubes", headers=dep).status_code == 403
    assert client.post("/api/news", headers=adm, json={"titulo": "T", "contenido": "C"}).status_code == 200
    assert client.post("/api/news", headers=dep, json={"titulo": "T", "contenido": "C"}).status_code == 403
    targets = client.get("/api/messages/targets", headers=org).json()
    assert targets and client.post("/api/messages", headers=org, json={"type": "torneo", "id": targets[0]["id"], "contenido": "Hola"}).status_code == 200


def test_carnet_and_profile():
    dep = login("deportista@sportpoint.co")
    r = client.put("/api/me/carnet", headers=dep, json={"colorHex": "#2f80ed", "deporte": "Fútbol"})
    assert r.json()["carnet"]["colorHex"] == "#2f80ed"
    assert client.put("/api/me/carnet", headers=dep, json={"colorHex": "rojo"}).status_code == 400
    assert client.get("/api/me/stats", headers=dep).status_code == 200
    assert client.get("/api/notifications", headers=dep).json()["unread"] >= 0
