# 🏆 SportPoint

**Plataforma web de gestión de clubes y torneos deportivos para Medellín**  
Desarrollada en alianza con el **INDER Medellín** · Proyecto formativo SENA ADSO — Ficha 3425707

---

## 📌 Descripción

SportPoint es un prototipo funcional multipágina que centraliza la oferta deportiva de Medellín: permite a deportistas explorar clubes y torneos, a administradores gestionar sus organizaciones, y a la entidad supervisora (INDER) validar y auditar el ecosistema desde un panel unificado.

Toda la lógica de negocio corre en el navegador usando **`localStorage`** como base de datos simulada — sin backend ni servidor externo requerido.

---

## 🚀 Cómo ejecutar el proyecto

### Opción A — Servidor local (recomendada)

| Sistema | Instrucción |
|---|---|
| Windows | Doble clic en `iniciar_servidor.bat` |
| Mac / Linux | `./iniciar_servidor.sh` en la terminal |

Luego abre: `http://localhost:8000/index.html`

> Requiere **Python 3** instalado. Los equipos de SENA ya lo tienen.  
> Para detener: `Ctrl + C` en la terminal.

### Opción B — Apertura directa

Doble clic en `index.html`. Funciona en **Chrome** y **Edge**.

> ⚠️ **Firefox** bloquea `localStorage` al abrir archivos locales directamente. Usa la Opción A con Firefox.

---

## 👥 Cuentas de prueba

Todas usan la contraseña **`1234`**

| Rol | Correo |
|---|---|
| Deportista | `deportista@sportpoint.co` |
| Admin. de Club | `club@sportpoint.co` |
| Organizador | `organizador@sportpoint.co` |
| Admin. del Sistema | `admin@sportpoint.co` |

---

## 🗂️ Estructura de archivos

```
sportpoint_site/
│
├── index.html                  # Página de inicio (pública)
├── clubes.html                 # Listado de clubes (pública)
├── club.html                   # Detalle de un club (pública)
├── torneos.html                # Listado de torneos (pública)
├── torneo.html                 # Detalle de un torneo (pública)
├── calendario.html             # Calendario de eventos (pública)
├── mapa.html                   # Mapa interactivo (pública)
├── noticias.html               # Noticias deportivas (pública)
│
├── panel.html                  # Panel principal (privado)
├── perfil.html                 # Perfil de usuario (privado)
├── mis-inscripciones.html      # Inscripciones del deportista (privado)
├── mi-historial.html           # Historial del deportista (privado)
├── mis-estadisticas.html       # Estadísticas del deportista (privado)
├── mis-clubes.html             # Clubes del deportista (privado)
├── mi-club.html                # Panel del admin. de club (privado)
├── plantilla.html              # Plantilla del club (privado)
├── mis-torneos.html            # Torneos del organizador (privado)
├── validacion-clubes.html      # Validación INDER / admin sistema (privado)
├── noticias-admin.html         # Gestión de noticias (privado)
├── reportes.html               # KPIs y métricas (privado)
├── mensajes.html               # Mensajería interna (privado)
│
├── sportpoint.css              # Estilos globales (no mover)
├── sportpoint.js               # Lógica global + base de datos simulada (no mover)
│
├── iniciar_servidor.bat        # Lanzador Windows
├── iniciar_servidor.sh         # Lanzador Mac/Linux
└── LEEME.txt                   # Instrucciones rápidas
```

---

## 🎭 Roles del sistema

| Rol | Capacidades principales |
|---|---|
| **Deportista** | Explorar clubes y torneos, inscribirse, ver historial y estadísticas |
| **Admin. de Club** | Registrar y gestionar ficha del club, administrar plantilla |
| **Organizador** | Crear torneos, generar brackets, publicar resultados |
| **Admin. del Sistema** | Validar clubes, gestionar roles, consultar métricas KPI |

---

## 🛠️ Tecnologías utilizadas

| Tecnología | Uso |
|---|---|
| HTML5 | Estructura de todas las páginas |
| CSS3 + Bootstrap 5.3 | Estilos y componentes UI |
| Bootstrap Icons 1.13 | Iconografía |
| JavaScript (Vanilla) | Lógica de negocio y navegación |
| localStorage | Persistencia de datos simulada (sin backend) |
| Google Fonts (Bebas Neue + Barlow) | Tipografía |

**Sin frameworks de JS. Sin dependencias npm. Sin backend.**

---

## 🎨 Identidad visual

- **Fondo:** `#0D0D0D` (negro profundo)
- **Acento principal:** `#22C55E` (verde deportivo)
- **Tipografía display:** Bebas Neue
- **Tipografía cuerpo:** Barlow
- Tema oscuro consistente en todas las páginas

---

## 🔄 Reiniciar datos de demostración

Si necesitas volver al estado inicial de los datos, abre la consola del navegador (`F12`) y ejecuta:

```javascript
resetDemo()
```

---

## ⚠️ Consideraciones importantes

- Este es un **prototipo funcional** — los datos no persisten entre navegadores ni dispositivos.
- No tiene backend real. Para producción se recomienda migrar a **PHP + MySQL** (estructura de BD documentada en el proyecto).
- El archivo `sportpoint.js` y `sportpoint.css` son compartidos por todas las páginas — **no renombrar ni mover**.
- El proyecto está diseñado para ejecutarse desde la **raíz de la carpeta** `sportpoint_site/`. No mover archivos HTML a subcarpetas.

---

## 👨‍💻 Equipo de desarrollo

Proyecto formativo — **SENA Centro de Servicios y Gestión Industrial**  
Tecnólogo en Análisis y Desarrollo de Software · Ficha **3425723**  


| Integrante | GitHub / LinkedIn |
|---|---|
| Simón Parra Herrera | [linkedin.com/in/simon-herrera-0a2630404](https://linkedin.com/in/simon-herrera-0a2630404) |

---

## 📄 Licencia

Proyecto educativo sin fines comerciales. Todos los derechos reservados © 2025 — Equipo SportPoint · SENA.
