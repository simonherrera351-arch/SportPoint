# SportPoint — React + Python + JavaScript

Migración de `sportpoint_multipagina` (HTML + localStorage) a una aplicación completa:

| Capa | Tecnología | Carpeta |
|------|------------|---------|
| Frontend | React 19 + React Router + JavaScript (Vite) — mismo `sportpoint.css`, Bootstrap y diseño | `frontend/` |
| Backend | Python 3 + FastAPI | `backend/app/` |
| Base de datos | **MongoDB** (`MONGO_URI` en `backend/.env`); o PostgreSQL (`DATABASE_URL`); si no defines nada usa SQLite (`backend/sportpoint.db`) | `backend/app/db.py` |

## Cómo correrlo

**Solo con Python (usa el frontend ya compilado en `frontend/dist`):**
- Windows: doble clic en `iniciar.bat`
- Mac/Linux: `./iniciar.sh`
- Abre http://localhost:8000

**Modo desarrollo (editar React con recarga en vivo)** — dos terminales:
```
cd backend && python -m venv .venv && .venv/bin/pip install -r requirements.txt
.venv/bin/python -m uvicorn app.main:app --reload --port 8000

cd frontend && npm install && npm run dev      # http://localhost:5173
```
Para recompilar el frontend: `cd frontend && npm run build`.

## Conectar a MongoDB (Atlas o local)
1. Atlas: crea un cluster gratis, un usuario de base de datos, y en *Network Access* agrega tu IP (o `0.0.0.0/0` para pruebas).
2. En `backend/` copia `.env.example` a `.env` y pega tu cadena de conexión en `MONGO_URI`.
   (Mongo local: `MONGO_URI=mongodb://localhost:27017`)
3. Corre `iniciar.bat` / `./iniciar.sh`: instala `pymongo` solo, crea las colecciones y carga los datos demo.
4. Verifica en Atlas → Browse Collections → base `sportpoint` (colecciones `users`, `clubs`, `tournaments`...).
Cada colección guarda los documentos tal cual (el campo `id` se usa también como `_id`). Si borras `MONGO_URI` vuelve a SQLite.

## Conectar a PostgreSQL
1. Crea la base: `CREATE DATABASE sportpoint;`
2. Instala el conector: `.venv\Scripts\python -m pip install "psycopg[binary]"` (Mac/Linux: `.venv/bin/python -m pip ...`)
3. Define la variable de entorno antes de arrancar (las tablas y los datos demo se crean solos):
   - Windows (cmd): `set DATABASE_URL=postgresql://usuario:clave@localhost:5432/sportpoint`
   - Mac/Linux: `export DATABASE_URL=postgresql://usuario:clave@localhost:5432/sportpoint`
4. Corre `iniciar.bat` / `./iniciar.sh`.

Nota: por ahora todo se guarda en una tabla `docs` (cada registro como JSONB). Funciona igual que antes, pero no hay tablas separadas con llaves foráneas.

## Datos de demo para la entrega (muchos usuarios, clubes y torneos)
Con el servidor detenido (`Ctrl+C`), en la carpeta `backend`:
- Windows: `.venv\Scripts\python -m app.seed --demo`
- Mac/Linux: `.venv/bin/python -m app.seed --demo`

Agrega a la base (Mongo o la que uses) sin borrar lo que ya hay, y se puede repetir sin duplicar:
- **40 deportistas** `deportista01@sportpoint.co` … `deportista40@sportpoint.co` (el 39 y el 40 no tienen documento verificado, para mostrar el bloqueo de inscripción)
- **5 admins de club** `adminclub01@…` … `adminclub05@` y **2 organizadores** `organizador02@…`, `organizador03@…`
- **8 clubes**: 5 aprobados con plantilla y solicitudes por aceptar/rechazar, 2 pendientes de validar (entra como `admin@sportpoint.co`) y 1 rechazado
- **6 torneos** en distintos momentos del fixture:
  - *Copa Medellín Fútbol Sub-15*: 8 inscritos, **sin fixture** → entra como `organizador@sportpoint.co` y pulsa “Generar fixture”
  - *Copa Aburrá Baloncesto Libre*: 6 de 8 cupos, abierto → inscribe a otro en vivo y genera la llave (verás los BYE)
  - *Liga Comunal de Voleibol*: todos contra todos, 5 de 15 partidos jugados, tabla de posiciones (organizador `organizador02@…`)
  - *Copa Verano Fútbol Sala*: llave completa, **Finalizado** (organizador `organizador03@…`)
  - *Torneo Abierto de Tenis*: llave de 16, primera ronda jugada
  - *Festival Infantil de Natación*: vacío, para inscribir en vivo

Todas las cuentas usan la contraseña `1234`. Para volver a empezar: `python -m app.seed --reset --demo`.

## Cuentas de prueba (contraseña `1234`)
`deportista@sportpoint.co` · `club@sportpoint.co` · `organizador@sportpoint.co` · `admin@sportpoint.co`

Reiniciar datos demo (equivale al antiguo `resetDemo()`): `cd backend && .venv/bin/python -m app.seed --reset` (agrega `--demo` para recargar también los datos de la entrega)

## Pruebas
- Backend: `cd backend && .venv/bin/python -m pip install -r requirements-dev.txt && .venv/bin/python -m pytest` (8 pruebas: roles, clubes, inscripción por edad, brackets, marcadores, reportes…)
- Frontend: con el backend corriendo, `cd frontend && npm test` (monta las 22 rutas con cada rol).

## Qué cambió respecto al prototipo
- **Los datos viven en el servidor**, ya no en el navegador: todos los usuarios ven lo mismo.
- **La seguridad se aplica en la API**, no solo ocultando botones: contraseñas con PBKDF2, token firmado de 8 h, validación de rol y de dueño (solo el organizador del torneo registra marcadores; solo el admin del club gestiona su plantilla). Nadie puede auto-registrarse como Admin. Sistema.
- **Lógica movida a Python** (`backend/app/main.py`): inscripción con validación de edad/documento/cupos, lista de espera, bracket de eliminación con BYE, todos contra todos, tabla de posiciones, finalización y encuesta, notificaciones.
- Recuperación de contraseña: ahora el token se valida en el servidor (antes se mostraba pero no se comprobaba).

## Correcciones menores sobre el original
- El bracket no mostraba los marcadores después de jugar (los partidos del bracket eran copias desactualizadas); ahora se sincronizan.
- El botón "Registrar marcador" aparecía para cualquiera y también en partidos aún sin rivales definidos; ahora solo el organizador y solo cuando ambos equipos están definidos.
- El filtro "club" del calendario no hacía nada y se quitó; el rango de fechas de los reportes ahora sí filtra (torneos por fecha de inicio, inscripciones por fecha).
- Los pines del mapa ya no saltan de posición en cada render.

## Pendiente / límites
- Subida de archivos (documento de identidad, documentos del club, logo): igual que el prototipo, solo se registra el nombre/si se subió; no se guardan los archivos.
- No pude abrir la app en un navegador real desde mi entorno: las rutas se verificaron con pruebas automáticas (jsdom) y el backend con pruebas de API. Conviene que la recorras tú una vez, sobre todo el carnet (colores/foto) y la impresión.

## Versión de Python
Usa Python **3.12, 3.13 o 3.14**. Evita 3.15 por ahora: algunas librerías aún no tienen versión lista y fallan al instalar.
