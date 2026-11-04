/* ══════════════════════════════════════════════════════════
   SPORTPOINT — PROTOTIPO FUNCIONAL (localStorage como BD simulada)
   Cumple RF-001 a RF-027 (SRS + Matriz de Requisitos)
   ══════════════════════════════════════════════════════════ */

const DB_KEY = 'sportpoint_db_v1';
const SESSION_KEY = 'sportpoint_session_v1';
const COMUNAS = ['Comuna 1 - Popular','Comuna 4 - Aranjuez','Comuna 10 - La Candelaria','Comuna 11 - Laureles-Estadio','Comuna 14 - Poblado','Comuna 15 - Guayabal','Comuna 16 - Belén'];
const DEPORTES = ['Fútbol','Baloncesto','Voleibol','Natación','Ciclismo','Atletismo','Tenis','Patinaje'];

/* Detecta si localStorage está realmente disponible (Firefox lo bloquea en file:// por defecto) */
function storageAvailable(){
  try {
    const k = '__sp_test__';
    localStorage.setItem(k, '1');
    localStorage.removeItem(k);
    return true;
  } catch(e){ return false; }
}

function uid(prefix){ return prefix + '_' + Math.random().toString(36).slice(2,9) + Date.now().toString(36).slice(-4); }
function nowISO(){ return new Date().toISOString(); }
function fmtDate(iso){ if(!iso) return '—'; const d = new Date(iso); return d.toLocaleDateString('es-CO',{day:'2-digit',month:'short',year:'numeric'}); }
function fmtMoney(n){ n = Number(n)||0; if(n===0) return 'Gratis'; return '$' + n.toLocaleString('es-CO'); }
function calcAge(fechaNacISO){ if(!fechaNacISO) return null; const b = new Date(fechaNacISO); const t = new Date(); let age = t.getFullYear()-b.getFullYear(); const m = t.getMonth()-b.getMonth(); if(m<0 || (m===0 && t.getDate()<b.getDate())) age--; return age; }

function toast(msg, type){
  type = type || 'success';
  const icon = type==='success' ? 'bi-check-circle' : type==='danger' ? 'bi-x-circle' : 'bi-info-circle';
  const colors = {success:'#1db954', danger:'#e0453f', info:'#2b8fe0'};
  const el = document.createElement('div');
  el.className = 'toast align-items-center text-white border-0 show mb-2';
  el.style.background = '#1a1a1a';
  el.style.borderLeft = '4px solid ' + colors[type];
  el.style.minWidth = '280px';
  el.innerHTML = `<div class="d-flex"><div class="toast-body"><i class="bi ${icon} me-2" style="color:${colors[type]}"></i>${msg}</div>
    <button type="button" class="btn-close btn-close-white me-2 m-auto" onclick="this.closest('.toast').remove()"></button></div>`;
  document.getElementById('toastArea').appendChild(el);
  setTimeout(()=>{ if(el.parentNode) el.remove(); }, 4500);
}

/* ---------- DB persistence ---------- */
function loadDB(){
  let raw = localStorage.getItem(DB_KEY);
  if(!raw){ seedDB(); raw = localStorage.getItem(DB_KEY); }
  return JSON.parse(raw);
}
function saveDB(db){
  try { localStorage.setItem(DB_KEY, JSON.stringify(db)); return true; }
  catch(e){ toast('No se pudo guardar (almacenamiento local no disponible).', 'danger'); return false; }
}
function getSession(){ const r = localStorage.getItem(SESSION_KEY); return r ? JSON.parse(r) : null; }
function setSession(s){ localStorage.setItem(SESSION_KEY, JSON.stringify(s)); }
function clearSession(){ localStorage.removeItem(SESSION_KEY); }

function currentUser(){
  const s = getSession();
  if(!s) return null;
  if(new Date(s.expires) < new Date()){ clearSession(); return null; }
  const db = loadDB();
  return db.users.find(u=>u.id===s.userId) || null;
}

/* Simulated JWT: base64 payload, not cryptographically real — for prototype purposes */
function fakeJWT(user){
  const payload = { sub:user.id, rol:user.rol, iat:Date.now() };
  return btoa(JSON.stringify(payload));
}

/* ---------- Seed data ---------- */
function seedDB(){
  const db = { users:[], clubs:[], tournaments:[], registrations:[], notifications:[], news:[], messages:[], reviews:[], reports:[] };

  const mkUser = (nombre, email, rol, extra) => ({
    id: uid('u'), nombre, email, passHash: btoa('1234'), rol, telefono:'300 000 0000',
    estado:'activo', fechaRegistro: nowISO(), docSubido:false, fechaNacimiento: extra&&extra.fnac || null, ...extra
  });

  const uDeportista = mkUser('Camila Ríos', 'deportista@sportpoint.co', 'Deportista', {fnac:'2008-04-12', docSubido:true});
  const uClub = mkUser('Andrés Muñoz', 'club@sportpoint.co', 'Admin. Club', {});
  const uOrg = mkUser('Laura Gómez', 'organizador@sportpoint.co', 'Organizador', {});
  const uAdmin = mkUser('Sistema Admin', 'admin@sportpoint.co', 'Admin. Sistema', {});
  const uDeportista2 = mkUser('Juan Pablo Vélez', 'juanp@sportpoint.co', 'Deportista', {fnac:'2011-09-01', docSubido:true});
  db.users.push(uDeportista, uClub, uOrg, uAdmin, uDeportista2);

  const mkClub = (nombre, disciplina, comuna, adminId, estado) => ({
    id: uid('c'), nombre, disciplina, comuna, direccion:'Calle ' + (10+Math.floor(Math.random()*80)) + ' # ' + (20+Math.floor(Math.random()*60)) + '-' + (10+Math.floor(Math.random()*80)),
    horarios:'Lun-Vie 4:00pm-6:00pm', entrenadores:['Prof. ' + nombre.split(' ')[0]], cuota: [0,40000,60000,90000,120000][Math.floor(Math.random()*5)],
    logo:null, estado, motivoRechazo:'', adminId, documentos:['ficha_' + uid('doc') + '.pdf'], miembros: [], rating:0, reviews: []
  });
  const clubAprobado = mkClub('Club Deportivo Águilas', 'Fútbol', 'Comuna 11 - Laureles-Estadio', uClub.id, 'Aprobado');
  clubAprobado.miembros = [uDeportista.id];
  const clubAprobado2 = mkClub('Estrellas del Poblado Baloncesto', 'Baloncesto', 'Comuna 14 - Poblado', uClub.id, 'Aprobado');
  const clubPendiente = mkClub('Natación Aranjuez', 'Natación', 'Comuna 4 - Aranjuez', uClub.id, 'Pendiente');
  const clubOtro = mkClub('Ciclomontañismo Belén', 'Ciclismo', 'Comuna 16 - Belén', uClub.id, 'Aprobado');
  db.clubs.push(clubAprobado, clubAprobado2, clubPendiente, clubOtro);

  const mkTorneo = (nombre, disciplina, categoria, estado, formato, cupo) => ({
    id: uid('t'), nombre, disciplina, categoria, fechaInicio: null, fechaFin: null, sede:'Unidad Deportiva ' + disciplina,
    cupo, cuposOcupados:0, costo: [0,20000,30000][Math.floor(Math.random()*3)], reglamento:'Reglamento estándar SportPoint.',
    estado, formato, organizadorId: uOrg.id, teams:[], bracket:null, matches:[], standings:null, sponsors:[], waitlist:[], encuestaEnviada:false
  });
  const d = new Date();
  const in10 = new Date(d.getTime()+10*86400000).toISOString().slice(0,10);
  const in20 = new Date(d.getTime()+20*86400000).toISOString().slice(0,10);
  const past5 = new Date(d.getTime()-5*86400000).toISOString().slice(0,10);

  const t1 = mkTorneo('Copa SportPoint Sub-15', 'Fútbol', 'Sub-15', 'Abierto', 'eliminacion', 8);
  t1.fechaInicio = in10; t1.fechaFin = in20;
  const t2 = mkTorneo('Torneo Relámpago Baloncesto', 'Baloncesto', 'Abierta', 'Abierto', 'eliminacion', 4);
  t2.fechaInicio = in10; t2.fechaFin = in10;
  const t3 = mkTorneo('Liga Escolar de Natación', 'Natación', 'Sub-12', 'En curso', 'todos', 6);
  t3.fechaInicio = past5; t3.fechaFin = in20;
  db.tournaments.push(t1, t2, t3);

  db.news.push(
    { id: uid('n'), titulo:'SportPoint llega a Medellín', contenido:'La plataforma facilita el descubrimiento de clubes y torneos en Medellín.', fecha: nowISO(), autorId: uAdmin.id },
    { id: uid('n'), titulo:'Inscripciones abiertas: Copa SportPoint Sub-15', contenido:'Ya puedes inscribir a tu equipo en la Copa SportPoint Sub-15. Cupos limitados.', fecha: nowISO(), autorId: uAdmin.id }
  );

  saveDB(db);
}

function resetDemo(){
  localStorage.removeItem(DB_KEY);
  localStorage.removeItem(SESSION_KEY);
  location.reload();
}
/* ══════════════ AUTENTICACIÓN (RF-001, RF-002, RF-003/008, RF-009, RF-021) ══════════════ */

let selectedRegRole = 'Deportista';
let pendingRecovery = null; // {email, token, expires}
let recoveryTimer = null;

function switchModal(fromId, toId){
  const fromEl = document.getElementById(fromId);
  const fromModal = bootstrap.Modal.getOrCreateInstance(fromEl);
  fromModal.hide();
  setTimeout(()=>{ bootstrap.Modal.getOrCreateInstance(document.getElementById(toId)).show(); }, 200);
}

function selectRole(btn){
  document.querySelectorAll('#regRolePills .category-pill').forEach(b=>b.classList.remove('active'));
  btn.classList.add('active');
  selectedRegRole = btn.dataset.role;
  document.getElementById('regDeportistaExtra').style.display = selectedRegRole==='Deportista' ? 'flex' : 'none';
  document.getElementById('regDocHint').style.display = selectedRegRole==='Deportista' ? 'block' : 'none';
}

function showAuthErr(elId, msg){
  const el = document.getElementById(elId);
  el.textContent = msg; el.classList.remove('d-none');
}

/* RF-001: Registro de usuarios con rol. RF-021: doc de identidad para deportistas */
function doRegister(){
  const db = loadDB();
  const nombre = document.getElementById('regName').value.trim();
  const email = document.getElementById('regEmail').value.trim().toLowerCase();
  const pass = document.getElementById('regPass').value;
  document.getElementById('regError').classList.add('d-none');

  if(!nombre || !email || !pass){ showAuthErr('regError','Completa todos los campos obligatorios.'); return; }
  if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)){ showAuthErr('regError','Correo electrónico no válido.'); return; }
  if(pass.length < 4){ showAuthErr('regError','La contraseña debe tener al menos 4 caracteres.'); return; }
  if(db.users.find(u=>u.email===email)){ showAuthErr('regError','Ya existe una cuenta con ese correo.'); return; }

  let fechaNacimiento = null, docSubido = false;
  if(selectedRegRole === 'Deportista'){
    fechaNacimiento = document.getElementById('regFechaNac').value || null;
    const docFile = document.getElementById('regDoc').files[0];
    docSubido = !!docFile;
    if(!fechaNacimiento){ showAuthErr('regError','Ingresa tu fecha de nacimiento.'); return; }
  }

  const user = {
    id: uid('u'), nombre, email, passHash: btoa(pass), rol: selectedRegRole,
    telefono:'', estado:'activo', fechaRegistro: nowISO(), fechaNacimiento, docSubido
  };
  db.users.push(user);
  saveDB(db);
  toast(`Cuenta creada como <strong>${selectedRegRole}</strong>. ¡Bienvenido a SportPoint!`);
  loginAs(user);
  bootstrap.Modal.getOrCreateInstance(document.getElementById('registerModal')).hide();
}

/* RF-002: Autenticación */
function doLogin(){
  const email = document.getElementById('loginEmail').value.trim().toLowerCase();
  const pass = document.getElementById('loginPass').value;
  document.getElementById('loginError').classList.add('d-none');
  const db = loadDB();
  const user = db.users.find(u=>u.email===email);
  if(!user || user.passHash !== btoa(pass)){ showAuthErr('loginError','Credenciales inválidas. Verifica tu correo y contraseña.'); return; }
  loginAs(user);
  bootstrap.Modal.getOrCreateInstance(document.getElementById('loginModal')).hide();
}

function quickLogin(email){
  const db = loadDB();
  const user = db.users.find(u=>u.email===email);
  if(user){ loginAs(user); bootstrap.Modal.getOrCreateInstance(document.getElementById('loginModal')).hide(); }
}

function loginAs(user){
  const token = fakeJWT(user);
  const expires = new Date(Date.now() + 8*3600*1000).toISOString();
  setSession({ userId: user.id, token, expires });
  sessionStorage.setItem('sp_flash', `Sesión iniciada como ${user.nombre} (${user.rol}).`);
  location.href = 'panel.html';
}

function logout(){
  clearSession();
  sessionStorage.setItem('sp_flash', 'Sesión cerrada.');
  location.href = 'index.html';
}

/* RF-003 / RF-008: Recuperación de contraseña con token temporal */
function sendRecovery(){
  const email = document.getElementById('recoverEmail').value.trim().toLowerCase();
  const db = loadDB();
  const user = db.users.find(u=>u.email===email);
  if(!user){ toast('No existe una cuenta con ese correo.', 'danger'); return; }
  const token = Math.random().toString(36).slice(2,8).toUpperCase();
  pendingRecovery = { email, token, expiresAt: Date.now() + 15*60*1000 };
  document.getElementById('recoverTokenShow').textContent = token;
  document.getElementById('recoverStep1').classList.add('d-none');
  document.getElementById('recoverStep2').classList.remove('d-none');
  toast('Enlace de recuperación simulado enviado a tu correo.', 'info');
  if(recoveryTimer) clearInterval(recoveryTimer);
  recoveryTimer = setInterval(()=>{
    const remain = pendingRecovery.expiresAt - Date.now();
    if(remain <= 0){
      document.getElementById('recoverCountdown').textContent = 'Expirado';
      clearInterval(recoveryTimer); pendingRecovery = null; return;
    }
    const mm = Math.floor(remain/60000), ss = Math.floor((remain%60000)/1000);
    document.getElementById('recoverCountdown').textContent = mm+':'+String(ss).padStart(2,'0');
  }, 1000);
}

function confirmRecovery(){
  if(!pendingRecovery || Date.now() > pendingRecovery.expiresAt){ toast('El token expiró, solicita uno nuevo.', 'danger'); return; }
  const newPass = document.getElementById('recoverNewPass').value;
  if(newPass.length < 4){ toast('La contraseña debe tener al menos 4 caracteres.', 'danger'); return; }
  const db = loadDB();
  const user = db.users.find(u=>u.email===pendingRecovery.email);
  user.passHash = btoa(newPass);
  saveDB(db);
  pendingRecovery = null;
  if(recoveryTimer) clearInterval(recoveryTimer);
  toast('Contraseña actualizada. Ya puedes iniciar sesión.');
  document.getElementById('recoverStep1').classList.remove('d-none');
  document.getElementById('recoverStep2').classList.add('d-none');
  switchModal('recoverModal','loginModal');
}

/* RF-009: gestión de roles y permisos (Admin Sistema) */
function openRoleModal(userId){
  const db = loadDB();
  const u = db.users.find(x=>x.id===userId);
  document.getElementById('roleUserId').value = userId;
  document.getElementById('roleUserLabel').textContent = `${u.nombre} — ${u.email}`;
  document.getElementById('roleSelect').value = u.rol;
  bootstrap.Modal.getOrCreateInstance(document.getElementById('roleModal')).show();
}
function confirmRoleChange(){
  const db = loadDB();
  const userId = document.getElementById('roleUserId').value;
  const u = db.users.find(x=>x.id===userId);
  const nuevoRol = document.getElementById('roleSelect').value;
  u.rol = nuevoRol;
  saveDB(db);
  pushNotification(u.id, `Tu rol fue actualizado a ${nuevoRol} por un Administrador del Sistema.`);
  sessionStorage.setItem('sp_flash', `Rol de ${u.nombre} actualizado a ${nuevoRol}.`);
  location.reload();
}

function requireRole(roles, cb){
  const u = currentUser();
  if(!u){ toast('Inicia sesión para continuar.', 'info'); bootstrap.Modal.getOrCreateInstance(document.getElementById('loginModal')).show(); return; }
  if(roles && roles.length && !roles.includes(u.rol)){ toast(`Esta acción requiere el rol: ${roles.join(' / ')}.`, 'danger'); return; }
  cb();
}
/* ══════════════ NAVBAR / SIDEBAR / GUARDS (navegación real por páginas) ══════════════ */

let CURRENT_PAGE = document.body.dataset.page || '';

function qs(param){ return new URLSearchParams(location.search).get(param); }

function showFlashIfAny(){
  const msg = sessionStorage.getItem('sp_flash');
  if(msg){ toast(msg); sessionStorage.removeItem('sp_flash'); }
}

function renderAuthArea(){
  const area = document.getElementById('navAuthArea');
  if(!area) return;
  const u = currentUser();
  if(!u){
    area.innerHTML = `
      <button class="btn-sp-outline btn-sm" data-bs-toggle="modal" data-bs-target="#loginModal">Ingresar</button>
      <button class="btn-green-submit btn-sm" data-bs-toggle="modal" data-bs-target="#registerModal">Crear cuenta</button>`;
    return;
  }
  const unread = loadDB().notifications.filter(n=>n.userId===u.id && !n.leido).length;
  area.innerHTML = `
    <div class="dropdown position-relative">
      <button class="btn btn-sm btn-sp-outline position-relative" data-bs-toggle="dropdown"><i class="bi bi-bell"></i>${unread?'<span class="notif-dot"></span>':''}</button>
      <div class="dropdown-menu dropdown-menu-end bg-card border-secondary p-0" style="width:min(320px,92vw);max-height:360px;overflow:auto" id="notifDropdown"></div>
    </div>
    <div class="dropdown">
      <button class="btn btn-sm btn-sp-green dropdown-toggle" data-bs-toggle="dropdown"><i class="bi bi-person-circle me-1"></i>${u.nombre.split(' ')[0]} <span class="opacity-75">(${u.rol})</span></button>
      <ul class="dropdown-menu dropdown-menu-end bg-card border-secondary">
        <li><a class="dropdown-item text-white" href="panel.html"><i class="bi bi-speedometer2 me-2"></i>Mi Panel</a></li>
        <li><hr class="dropdown-divider border-secondary"></li>
        <li><a class="dropdown-item text-danger" onclick="logout()" style="cursor:pointer"><i class="bi bi-box-arrow-right me-2"></i>Cerrar sesión</a></li>
      </ul>
    </div>`;
  document.getElementById('notifDropdown').addEventListener('click', e=>e.stopPropagation());
  renderNotifDropdown();
  // highlight active top-nav link
  document.querySelectorAll('#navMain .nav-link[data-page]').forEach(l=>{
    l.classList.toggle('active', l.dataset.page === CURRENT_PAGE);
  });
}

function renderNotifDropdown(){
  const dd = document.getElementById('notifDropdown');
  if(!dd) return;
  const u = currentUser(); if(!u) return;
  const db = loadDB();
  const items = db.notifications.filter(n=>n.userId===u.id).sort((a,b)=> new Date(b.fecha)-new Date(a.fecha));
  if(!items.length){ dd.innerHTML = '<div class="p-3 small text-muted-sp">Sin notificaciones aún.</div>'; return; }
  dd.innerHTML = items.map(n=>`<div class="notif-item ${n.leido?'':'unread'}"><div>${n.mensaje}</div><small class="text-muted-sp">${fmtDate(n.fecha)}</small></div>`).join('');
  items.forEach(n=>n.leido=true);
  saveDB(db);
}

function pushNotification(userId, mensaje){
  const db = loadDB();
  db.notifications.push({ id: uid('notif'), userId, mensaje, fecha: nowISO(), leido:false });
  saveDB(db);
}

function goToRoleHome(){ location.href = 'panel.html'; }
function goHome(){ location.href = 'index.html'; }

/* ---------- Sidebar del panel privado (hipervínculos reales por sección) ---------- */
const SIDEBAR_MENUS = {
  'Deportista': [
    {sec:'General'},
    {page:'panel.html', label:'Mi Panel', icon:'bi-speedometer2'},
    {page:'perfil.html', label:'Mi Perfil', icon:'bi-person'},
    {sec:'Actividad'},
    {page:'mis-clubes.html', label:'Mis Clubes', icon:'bi-shield-check'},
    {page:'mis-inscripciones.html', label:'Mis Inscripciones', icon:'bi-clipboard-check'},
    {page:'mi-historial.html', label:'Historial de Torneos', icon:'bi-clock-history'},
    {page:'mis-estadisticas.html', label:'Mis Estadísticas', icon:'bi-bar-chart'},
  ],
  'Admin. Club': [
    {sec:'General'},
    {page:'panel.html', label:'Mi Panel', icon:'bi-speedometer2'},
    {sec:'Mi Club'},
    {page:'mi-club.html', label:'Ficha del Club', icon:'bi-building'},
    {page:'plantilla.html', label:'Plantilla de Deportistas', icon:'bi-people'},
    {page:'reportes.html', label:'Reportes', icon:'bi-file-earmark-bar-graph'},
    {page:'mensajes.html', label:'Mensajería', icon:'bi-chat-dots'},
  ],
  'Organizador': [
    {sec:'General'},
    {page:'panel.html', label:'Mi Panel', icon:'bi-speedometer2'},
    {sec:'Torneos'},
    {page:'mis-torneos.html', label:'Mis Torneos', icon:'bi-trophy'},
    {page:'mensajes.html', label:'Mensajería', icon:'bi-chat-dots'},
  ],
  'Admin. Sistema': [
    {sec:'General'},
    {page:'panel.html', label:'Panel KPIs', icon:'bi-speedometer2'},
    {sec:'Administración'},
    {page:'validacion-clubes.html', label:'Validación de Clubes', icon:'bi-patch-check'},
    {page:'usuarios.html', label:'Usuarios y Roles', icon:'bi-people-fill'},
    {page:'noticias-admin.html', label:'Noticias', icon:'bi-newspaper'},
    {page:'reportes.html', label:'Reportes', icon:'bi-file-earmark-bar-graph'},
  ],
};

function renderSidebar(){
  const nav = document.getElementById('sidebarNav');
  if(!nav) return;
  const u = currentUser();
  if(!u){ nav.innerHTML = ''; return; }
  const menu = SIDEBAR_MENUS[u.rol] || [];
  nav.innerHTML = `<div class="px-3 pb-3 mb-2 border-bottom border-secondary">
      <div class="fw-bold">${u.nombre}</div><div class="small text-green">${u.rol}</div>
    </div>` +
    menu.map(item => item.sec
      ? `<div class="side-section">${item.sec}</div>`
      : `<a class="side-link d-block text-decoration-none ${item.page===CURRENT_PAGE?'active':''}" href="${item.page}"><i class="bi ${item.icon}"></i> ${item.label}</a>`
    ).join('') +
    `<a class="side-link text-danger mt-3 d-block text-decoration-none" href="#" onclick="logout();return false;"><i class="bi bi-box-arrow-right"></i> Cerrar sesión</a>`;
}

/* Protege páginas del panel privado. roles=null → cualquier usuario autenticado. */
function pageGuard(roles){
  const u = currentUser();
  const box = document.getElementById('privateContent');
  if(!u){
    location.href = 'index.html?login=1';
    return null;
  }
  if(roles && roles.length && !roles.includes(u.rol)){
    if(box) box.innerHTML = `<div class="alert alert-warning">Esta sección es exclusiva para el rol <strong>${roles.join(' / ')}</strong>. Tu rol actual es <strong>${u.rol}</strong>. <a href="panel.html" class="text-green">Volver a Mi Panel</a></div>`;
    return null;
  }
  return u;
}

/* Auto-abre el modal de login si venimos redirigidos de una sección protegida */
function maybeAutoLogin(){
  if(qs('login') === '1'){
    setTimeout(()=>{ bootstrap.Modal.getOrCreateInstance(document.getElementById('loginModal')).show(); }, 300);
  }
}
/* ══════════════ CLUBES (RF-004,005,006,007 SRS · RF-002,006,011,012 matriz) ══════════════ */

function populateSelectOptions(){
  const db = loadDB();
  ['fClubDeporte','tfDisciplina','cfDisciplina','fTorneoDeporte','fCalDeporte','fMapaDeporte'].forEach(id=>{
    const sel = document.getElementById(id); if(!sel) return;
    if(id==='tfDisciplina' || id==='cfDisciplina') return; // already static options
    DEPORTES.forEach(d=>{ const o=document.createElement('option'); o.value=d; o.textContent=d; sel.appendChild(o); });
  });
  ['fClubComuna','fMapaComuna'].forEach(id=>{
    const sel = document.getElementById(id); if(!sel) return;
    COMUNAS.forEach(c=>{ const o=document.createElement('option'); o.value=c; o.textContent=c; sel.appendChild(o); });
  });
  const clubSel = document.getElementById('fCalClub');
  if(clubSel){ db.clubs.filter(c=>c.estado==='Aprobado').forEach(c=>{ const o=document.createElement('option'); o.value=c.id; o.textContent=c.nombre; clubSel.appendChild(o); }); }
}

function badgeEstado(estado){
  const map = { Aprobado:'aprobado', Pendiente:'pendiente', Rechazado:'rechazado', Abierto:'abierto', Cerrado:'cerrado', 'En curso':'curso', Finalizado:'finalizado', activo:'activo' };
  const cls = map[estado] || 'pendiente';
  return `<span class="badge-estado badge-${cls}">${estado}</span>`;
}

function clubCardHTML(c){
  const rating = c.reviews && c.reviews.length ? (c.reviews.reduce((a,r)=>a+r.estrellas,0)/c.reviews.length).toFixed(1) : null;
  return `<div class="col-md-4">
    <a href="club.html?id=${c.id}" class="club-card h-100 d-block text-white text-decoration-none">
      <div class="card-cover"><i class="bi bi-shield-fill-check"></i></div>
      <div class="p-3">
        <div class="d-flex justify-content-between align-items-start mb-1">
          <h6 class="fw-bold mb-0">${c.nombre}</h6>${badgeEstado(c.estado)}
        </div>
        <p class="small text-muted-sp mb-1"><i class="bi bi-award me-1"></i>${c.disciplina} &nbsp; <i class="bi bi-geo-alt me-1"></i>${c.comuna.split(' - ')[1]||c.comuna}</p>
        <p class="small text-muted-sp mb-1"><i class="bi bi-cash-coin me-1"></i>${fmtMoney(c.cuota)}/mes</p>
        ${rating ? `<p class="small mb-0"><i class="bi bi-star-fill text-warning me-1"></i>${rating} (${c.reviews.length})</p>` : `<p class="small text-muted-sp mb-0">Sin reseñas aún</p>`}
      </div>
    </a></div>`;
}

function renderClubesGrid(reset){
  const db = loadDB();
  if(reset) populateSelectOptions();
  const texto = (document.getElementById('fClubTexto')?.value || '').toLowerCase();
  const deporte = document.getElementById('fClubDeporte')?.value || '';
  const comuna = document.getElementById('fClubComuna')?.value || '';
  const costoRange = document.getElementById('fClubCosto')?.value || '';
  let list = db.clubs.filter(c=>c.estado==='Aprobado');
  if(texto) list = list.filter(c=>c.nombre.toLowerCase().includes(texto));
  if(deporte) list = list.filter(c=>c.disciplina===deporte);
  if(comuna) list = list.filter(c=>c.comuna===comuna);
  if(costoRange){ const [min,max] = costoRange.split('-').map(Number); list = list.filter(c=>c.cuota>=min && c.cuota<=max); }
  const grid = document.getElementById('clubesGrid');
  grid.innerHTML = list.length ? list.map(clubCardHTML).join('') : '<div class="col-12 text-center text-muted-sp py-5"><i class="bi bi-search fs-1 d-block mb-2"></i>No se encontraron clubes con esos filtros.</div>';
}

function clubDetailHTML(c){
  const u = currentUser();
  const rating = c.reviews && c.reviews.length ? (c.reviews.reduce((a,r)=>a+r.estrellas,0)/c.reviews.length).toFixed(1) : '—';
  const isOwner = u && u.id === c.adminId;
  return `
    <a class="text-green small" href="clubes.html"><i class="bi bi-arrow-left me-1"></i>Volver al directorio</a>
    <div class="row g-4 mt-1">
      <div class="col-lg-8">
        <div class="d-flex justify-content-between align-items-start">
          <h2 class="font-display fs-1 mb-1">${c.nombre}</h2>${badgeEstado(c.estado)}
        </div>
        <p class="text-muted-sp mb-3"><i class="bi bi-award me-1"></i>${c.disciplina} &nbsp;·&nbsp; <i class="bi bi-geo-alt me-1"></i>${c.comuna} &nbsp;·&nbsp; <i class="bi bi-star-fill text-warning me-1"></i>${rating}</p>
        <div class="bg-card rounded-xl p-4 mb-3">
          <div class="row g-3">
            <div class="col-md-6"><strong>Dirección de sede</strong><p class="text-muted-sp mb-0">${c.direccion||'—'}</p></div>
            <div class="col-md-6"><strong>Horarios</strong><p class="text-muted-sp mb-0">${c.horarios||'—'}</p></div>
            <div class="col-md-6"><strong>Entrenadores</strong><p class="text-muted-sp mb-0">${(c.entrenadores||[]).join(', ')||'—'}</p></div>
            <div class="col-md-6"><strong>Cuota mensual</strong><p class="text-muted-sp mb-0">${fmtMoney(c.cuota)}</p></div>
            <div class="col-md-6"><strong>Deportistas afiliados</strong><p class="text-muted-sp mb-0">${(c.miembros||[]).length}</p></div>
            <div class="col-md-6"><strong>Documentos</strong><p class="text-muted-sp mb-0">${(c.documentos||[]).length} archivo(s) cargado(s)</p></div>
          </div>
        </div>
        <div class="d-flex gap-2 flex-wrap">
          ${isOwner ? `<button class="btn-sp-outline btn-sm" onclick="openClubForm('${c.id}')"><i class="bi bi-pencil me-1"></i>Editar ficha</button>` : ''}
          ${clubAplicarBtnHTML(c, u)}
          ${u && u.rol==='Deportista' ? `<button class="btn-sp-outline btn-sm" onclick="openReviewModal('${c.id}')"><i class="bi bi-star me-1"></i>Calificar club</button>` : ''}
        </div>
      </div>
      <div class="col-lg-4">
        <div class="bg-card rounded-xl p-3">
          <h6 class="fw-bold mb-3">Reseñas (${(c.reviews||[]).length})</h6>
          ${(c.reviews||[]).length ? c.reviews.map(r=>`<div class="mb-2 pb-2 border-bottom border-secondary">
              <div>${'★'.repeat(r.estrellas)}${'☆'.repeat(5-r.estrellas)}</div>
              <small class="text-muted-sp">${r.comentario||''}</small></div>`).join('') : '<p class="small text-muted-sp">Aún no hay reseñas.</p>'}
        </div>
      </div>
    </div>`;
}

/* Inicializa la página club.html leyendo ?id= de la URL */
function initClubDetailPage(){
  const id = qs('id');
  const db = loadDB();
  const c = db.clubs.find(x=>x.id===id);
  const box = document.getElementById('clubDetalleContent');
  if(!c){ box.innerHTML = '<p class="text-muted-sp">Club no encontrado. <a href="clubes.html" class="text-green">Volver al directorio</a></p>'; return; }
  box.innerHTML = clubDetailHTML(c);
}

/* RF-004 / RF-006(matriz): Registro / edición de ficha de club */
function openClubForm(clubId){
  const u = currentUser();
  if(!u){ toast('Inicia sesión (rol Admin. Club) para registrar un club.', 'info'); bootstrap.Modal.getOrCreateInstance(document.getElementById('loginModal')).show(); return; }
  if(u.rol !== 'Admin. Club'){ toast('Solo el rol Admin. Club puede registrar/editar clubes.', 'danger'); return; }
  document.getElementById('clubFormId').value = clubId || '';
  document.getElementById('clubFormTitle').textContent = clubId ? 'Editar Club' : 'Registrar Club';
  if(clubId){
    const db = loadDB(); const c = db.clubs.find(x=>x.id===clubId);
    document.getElementById('cfNombre').value = c.nombre;
    document.getElementById('cfDisciplina').value = c.disciplina;
    document.getElementById('cfComuna').value = c.comuna;
    document.getElementById('cfDireccion').value = c.direccion || '';
    document.getElementById('cfHorarios').value = c.horarios || '';
    document.getElementById('cfEntrenadores').value = (c.entrenadores||[]).join(', ');
    document.getElementById('cfCuota').value = c.cuota || 0;
  } else {
    ['cfNombre','cfDireccion','cfHorarios','cfEntrenadores'].forEach(id=>document.getElementById(id).value='');
    document.getElementById('cfCuota').value = '';
  }
  bootstrap.Modal.getOrCreateInstance(document.getElementById('clubFormModal')).show();
}

function saveClubForm(){
  const u = currentUser();
  const db = loadDB();
  const id = document.getElementById('clubFormId').value;
  const nombre = document.getElementById('cfNombre').value.trim();
  const cuota = document.getElementById('cfCuota').value;
  if(!nombre){ toast('El nombre del club es obligatorio.', 'danger'); return; }
  if(cuota === ''){ toast('Indica la cuota mensual (puede ser 0).', 'danger'); return; }

  const docFiles = document.getElementById('cfDocs').files;
  for(const f of docFiles){ if(f.size > 10*1024*1024){ toast(`El archivo ${f.name} supera 10MB.`, 'danger'); return; } }

  const payload = {
    nombre, disciplina: document.getElementById('cfDisciplina').value, comuna: document.getElementById('cfComuna').value,
    direccion: document.getElementById('cfDireccion').value, horarios: document.getElementById('cfHorarios').value,
    entrenadores: document.getElementById('cfEntrenadores').value.split(',').map(s=>s.trim()).filter(Boolean),
    cuota: Number(cuota)
  };

  if(id){
    const c = db.clubs.find(x=>x.id===id);
    Object.assign(c, payload);
    toast('Ficha del club actualizada.');
  } else {
    const c = { id: uid('c'), ...payload, logo:null, estado:'Pendiente', motivoRechazo:'', adminId:u.id,
      documentos: Array.from(docFiles).map(f=>f.name), miembros:[], rating:0, reviews:[] };
    db.clubs.push(c);
    toast('Club registrado. Queda en estado PENDIENTE para validación.', 'info');
  }
  saveDB(db);
  bootstrap.Modal.getOrCreateInstance(document.getElementById('clubFormModal')).hide();
  sessionStorage.setItem('sp_flash', 'Ficha del club guardada.');
  location.reload();
}

/* RF-005: Validación de clubes (Admin Sistema) */
function approveClub(clubId){
  const db = loadDB();
  const c = db.clubs.find(x=>x.id===clubId);
  c.estado = 'Aprobado'; c.motivoRechazo='';
  saveDB(db);
  pushNotification(c.adminId, `Tu club "${c.nombre}" fue APROBADO y ya es visible públicamente.`);
  sessionStorage.setItem('sp_flash', `Club "${c.nombre}" aprobado.`);
  location.reload();
}
function openRejectClub(clubId){
  document.getElementById('rejectClubId').value = clubId;
  document.getElementById('rejectMotivo').value = '';
  bootstrap.Modal.getOrCreateInstance(document.getElementById('rejectClubModal')).show();
}
function confirmRejectClub(){
  const clubId = document.getElementById('rejectClubId').value;
  const motivo = document.getElementById('rejectMotivo').value.trim();
  if(!motivo){ toast('Indica el motivo del rechazo.', 'danger'); return; }
  const db = loadDB();
  const c = db.clubs.find(x=>x.id===clubId);
  c.estado = 'Rechazado'; c.motivoRechazo = motivo;
  saveDB(db);
  pushNotification(c.adminId, `Tu club "${c.nombre}" fue RECHAZADO. Motivo: ${motivo}`);
  sessionStorage.setItem('sp_flash', `Club "${c.nombre}" rechazado.`);
  bootstrap.Modal.getOrCreateInstance(document.getElementById('rejectClubModal')).hide();
  location.reload();
}


/* -------- Aplicar a un club (deportista) -------- */
function clubAplicarBtnHTML(c, u){
  if(c.estado !== 'Aprobado') return '';
  if(!u) return `<button class="btn-sp-green btn-sm" onclick="aplicarAClub('${c.id}')"><i class="bi bi-person-plus me-1"></i>Aplicar al club</button>`;
  if(u.rol !== 'Deportista') return '';
  if((c.miembros||[]).includes(u.id)) return `<span class="badge-estado badge-activo align-self-center"><i class="bi bi-check-circle me-1"></i>Ya perteneces a este club</span>`;
  if((c.solicitudes||[]).includes(u.id)) return `<button class="btn-sp-outline btn-sm" onclick="cancelarSolicitudClub('${c.id}')"><i class="bi bi-hourglass-split me-1"></i>Solicitud enviada · Cancelar</button>`;
  return `<button class="btn-sp-green btn-sm" onclick="aplicarAClub('${c.id}')"><i class="bi bi-person-plus me-1"></i>Aplicar al club</button>`;
}
function aplicarAClub(clubId){
  const u = currentUser();
  if(!u){ toast('Inicia sesión como deportista para aplicar.', 'info'); bootstrap.Modal.getOrCreateInstance(document.getElementById('loginModal')).show(); return; }
  if(u.rol !== 'Deportista'){ toast('Solo los deportistas pueden aplicar a un club.', 'info'); return; }
  const db = loadDB();
  const c = db.clubs.find(x=>x.id===clubId);
  if(!c || c.estado !== 'Aprobado'){ toast('Este club no está disponible.', 'danger'); return; }
  c.miembros = c.miembros || []; c.solicitudes = c.solicitudes || [];
  if(c.miembros.includes(u.id)){ toast('Ya perteneces a este club.', 'info'); return; }
  if(c.solicitudes.includes(u.id)){ toast('Ya enviaste tu solicitud.', 'info'); return; }
  c.solicitudes.push(u.id);
  saveDB(db);
  pushNotification(c.adminId, `${u.nombre} quiere unirse a tu club "${c.nombre}". Revísalo en Plantilla de Deportistas.`);
  sessionStorage.setItem('sp_flash', `Solicitud enviada a "${c.nombre}". Te avisaremos cuando la respondan.`);
  location.reload();
}
function cancelarSolicitudClub(clubId){
  const u = currentUser();
  const db = loadDB();
  const c = db.clubs.find(x=>x.id===clubId);
  c.solicitudes = (c.solicitudes||[]).filter(id=>id!==u.id);
  saveDB(db);
  sessionStorage.setItem('sp_flash', 'Solicitud cancelada.');
  location.reload();
}
function responderSolicitudClub(clubId, athleteId, aceptar){
  const db = loadDB();
  const c = db.clubs.find(x=>x.id===clubId);
  const at = db.users.find(x=>x.id===athleteId);
  c.solicitudes = (c.solicitudes||[]).filter(id=>id!==athleteId);
  if(aceptar && !c.miembros.includes(athleteId)) c.miembros.push(athleteId);
  saveDB(db);
  pushNotification(athleteId, aceptar ? `¡Fuiste aceptado en el club "${c.nombre}"!` : `Tu solicitud al club "${c.nombre}" no fue aceptada.`);
  sessionStorage.setItem('sp_flash', aceptar ? `${at?at.nombre:'Deportista'} fue aceptado en la plantilla.` : 'Solicitud rechazada.');
  location.reload();
}

/* RF-006(SRS): plantilla de deportistas */
function vincularDeportista(clubId){
  const db = loadDB();
  const email = prompt('Correo del deportista a vincular:');
  if(!email) return;
  const at = db.users.find(u=>u.email===email.trim().toLowerCase() && u.rol==='Deportista');
  if(!at){ toast('No se encontró un deportista con ese correo.', 'danger'); return; }
  const c = db.clubs.find(x=>x.id===clubId);
  if(c.miembros.includes(at.id)){ toast('Ese deportista ya pertenece al club.', 'info'); return; }
  c.miembros.push(at.id);
  saveDB(db);
  pushNotification(at.id, `Fuiste vinculado al club "${c.nombre}".`);
  sessionStorage.setItem('sp_flash', `${at.nombre} vinculado a la plantilla.`);
  location.reload();
}
function desvincularDeportista(clubId, athleteId){
  const db = loadDB();
  const c = db.clubs.find(x=>x.id===clubId);
  c.miembros = c.miembros.filter(id=>id!==athleteId);
  saveDB(db);
  sessionStorage.setItem('sp_flash', 'Deportista desvinculado de la plantilla.');
  location.reload();
}

/* RF-011(matriz): reseñas y valoraciones */
function openReviewModal(clubId){
  document.getElementById('reviewClubId').value = clubId;
  document.getElementById('reviewComentario').value = '';
  document.querySelectorAll('#reviewStars .star').forEach(s=>s.classList.remove('filled','bi-star-fill'));
  document.querySelectorAll('#reviewStars .star').forEach(s=>{ s.classList.add('bi-star'); s.classList.remove('bi-star-fill'); });
  bootstrap.Modal.getOrCreateInstance(document.getElementById('reviewModal')).show();
}
document.addEventListener('click', function(e){
  if(e.target.closest('#reviewStars .star')){
    const star = e.target.closest('.star'); const v = Number(star.dataset.v);
    document.querySelectorAll('#reviewStars .star').forEach(s=>{
      const sv = Number(s.dataset.v);
      s.classList.toggle('filled', sv<=v);
      s.classList.toggle('bi-star-fill', sv<=v);
      s.classList.toggle('bi-star', sv>v);
    });
    document.getElementById('reviewStars').dataset.value = v;
  }
});
function submitReview(){
  const u = currentUser();
  const clubId = document.getElementById('reviewClubId').value;
  const val = Number(document.getElementById('reviewStars').dataset.value || 0);
  if(!val){ toast('Selecciona una calificación de 1 a 5 estrellas.', 'danger'); return; }
  const db = loadDB();
  const c = db.clubs.find(x=>x.id===clubId);
  c.reviews.push({ id: uid('rev'), autorId: u.id, estrellas: val, comentario: document.getElementById('reviewComentario').value.trim(), fecha: nowISO() });
  saveDB(db);
  sessionStorage.setItem('sp_flash', '¡Gracias por tu reseña!');
  bootstrap.Modal.getOrCreateInstance(document.getElementById('reviewModal')).hide();
  location.reload();
}
/* ══════════════ TORNEOS (RF-007..015 SRS · RF-003,004,005,010,017,020,022,023,026,027 matriz) ══════════════ */

function torneoCardHTML(t){
  const cuposLeft = t.cupo - t.cuposOcupados;
  return `<div class="col-md-4">
    <a href="torneo.html?id=${t.id}" class="torneo-card h-100 d-block text-white text-decoration-none">
      <div class="card-cover"><i class="bi bi-trophy-fill"></i></div>
      <div class="p-3">
        <div class="d-flex justify-content-between align-items-start mb-1">
          <h6 class="fw-bold mb-0">${t.nombre}</h6>${badgeEstado(t.estado)}
        </div>
        <p class="small text-muted-sp mb-1"><i class="bi bi-award me-1"></i>${t.disciplina} &nbsp; <i class="bi bi-people me-1"></i>${t.categoria}</p>
        <p class="small text-muted-sp mb-1"><i class="bi bi-calendar-event me-1"></i>${fmtDate(t.fechaInicio)} → ${fmtDate(t.fechaFin)}</p>
        <p class="small mb-0"><i class="bi bi-ticket-perforated me-1"></i>${fmtMoney(t.costo)} &nbsp;·&nbsp; <span class="${cuposLeft<=0?'text-danger':'text-green'}">${Math.max(cuposLeft,0)} cupos libres</span></p>
      </div>
    </a></div>`;
}

function renderTorneosGrid(reset){
  const db = loadDB();
  if(reset) populateSelectOptions2();
  const texto = (document.getElementById('fTorneoTexto')?.value || '').toLowerCase();
  const deporte = document.getElementById('fTorneoDeporte')?.value || '';
  const categoria = document.getElementById('fTorneoCategoria')?.value || '';
  const estado = document.getElementById('fTorneoEstado')?.value || '';
  let list = db.tournaments.slice();
  if(texto) list = list.filter(t=>t.nombre.toLowerCase().includes(texto));
  if(deporte) list = list.filter(t=>t.disciplina===deporte);
  if(categoria) list = list.filter(t=>t.categoria===categoria);
  if(estado) list = list.filter(t=>t.estado===estado);
  const grid = document.getElementById('torneosGrid');
  grid.innerHTML = list.length ? list.map(torneoCardHTML).join('') : '<div class="col-12 text-center text-muted-sp py-5"><i class="bi bi-search fs-1 d-block mb-2"></i>No se encontraron torneos con esos filtros.</div>';
}

function populateSelectOptions2(){
  const catSel = document.getElementById('fTorneoCategoria');
  if(catSel && !catSel.dataset.filled){ ['Sub-12','Sub-15','Sub-20','Abierta'].forEach(c=>{ const o=document.createElement('option'); o.value=c; o.textContent=c; catSel.appendChild(o); }); catSel.dataset.filled='1'; }
}

/* RF-009(SRS): creación de torneos */
function openTorneoForm(){
  ['tfNombre','tfSede','tfReglamento','tfPatrocinador'].forEach(id=>document.getElementById(id).value='');
  document.getElementById('tfFechaInicio').value=''; document.getElementById('tfFechaFin').value='';
  document.getElementById('tfCupo').value = 8; document.getElementById('tfCosto').value = 0;
  bootstrap.Modal.getOrCreateInstance(document.getElementById('torneoFormModal')).show();
}
function saveTorneoForm(){
  const u = currentUser();
  const nombre = document.getElementById('tfNombre').value.trim();
  const fi = document.getElementById('tfFechaInicio').value;
  const ff = document.getElementById('tfFechaFin').value;
  const cupo = Number(document.getElementById('tfCupo').value);
  if(!nombre || !fi || !ff){ toast('Completa nombre y fechas del torneo.', 'danger'); return; }
  if(new Date(ff) < new Date(fi)){ toast('La fecha fin no puede ser anterior a la fecha de inicio.', 'danger'); return; }
  if(!cupo || cupo < 2){ toast('El cupo máximo debe ser al menos 2.', 'danger'); return; }
  const db = loadDB();
  const sponsorName = document.getElementById('tfPatrocinador').value.trim();
  const t = {
    id: uid('t'), nombre, disciplina: document.getElementById('tfDisciplina').value, categoria: document.getElementById('tfCategoria').value,
    fechaInicio: fi, fechaFin: ff, sede: document.getElementById('tfSede').value || 'Por definir',
    cupo, cuposOcupados: 0, costo: Number(document.getElementById('tfCosto').value)||0,
    reglamento: document.getElementById('tfReglamento').value, estado:'Abierto', formato: document.getElementById('tfFormato').value,
    organizadorId: u.id, teams:[], bracket:null, matches:[], standings:null,
    sponsors: sponsorName ? [{nombre:sponsorName}] : [], waitlist:[], encuestaEnviada:false
  };
  db.tournaments.push(t);
  saveDB(db);
  sessionStorage.setItem('sp_flash', `Torneo "${nombre}" publicado y disponible para inscripciones.`);
  bootstrap.Modal.getOrCreateInstance(document.getElementById('torneoFormModal')).hide();
  location.href = 'mis-torneos.html';
}

function torneoDetailHTML(t){
  const u = currentUser();
  const db = loadDB();
  const isOwner = u && u.id === t.organizadorId;
  const cuposLeft = t.cupo - t.cuposOcupados;
  const yaInscrito = u && db.registrations.some(r=>r.tournamentId===t.id && r.athleteId===u.id);
  const enLista = u && t.waitlist.includes(u.id);

  let inscBtn = '';
  if(!u){
    inscBtn = `<button class="btn-green-submit" onclick="toast('Inicia sesión para inscribirte.','info'); bootstrap.Modal.getOrCreateInstance(document.getElementById('loginModal')).show();"><i class="bi bi-pencil-square me-2"></i>Inscribirme</button>`;
  } else if(u.rol !== 'Deportista'){
    inscBtn = `<span class="small text-muted-sp">Solo deportistas pueden inscribirse.</span>`;
  } else if(yaInscrito){
    inscBtn = `<span class="badge-estado badge-aprobado"><i class="bi bi-check2 me-1"></i>Ya estás inscrito</span>`;
  } else if(enLista){
    inscBtn = `<span class="badge-estado badge-pendiente"><i class="bi bi-hourglass-split me-1"></i>En lista de espera</span>`;
  } else if(t.estado !== 'Abierto'){
    inscBtn = `<span class="small text-muted-sp">Inscripciones cerradas.</span>`;
  } else if(cuposLeft <= 0){
    inscBtn = `<button class="btn-sp-outline" onclick="joinWaitlist('${t.id}')"><i class="bi bi-hourglass me-2"></i>Unirme a lista de espera</button>`;
  } else {
    inscBtn = `<button class="btn-green-submit" onclick="inscribirse('${t.id}')"><i class="bi bi-pencil-square me-2"></i>Inscribirme (${cuposLeft} cupos)</button>`;
  }

  return `
    <a class="text-green small" href="torneos.html"><i class="bi bi-arrow-left me-1"></i>Volver a torneos</a>
    <div class="d-flex justify-content-between align-items-start flex-wrap gap-2 mt-2">
      <div><h2 class="font-display fs-1 mb-1">${t.nombre}</h2>
      <p class="text-muted-sp mb-2"><i class="bi bi-award me-1"></i>${t.disciplina} &nbsp;·&nbsp; <i class="bi bi-people me-1"></i>${t.categoria} &nbsp;·&nbsp; <i class="bi bi-geo-alt me-1"></i>${t.sede}</p></div>
      ${badgeEstado(t.estado)}
    </div>
    <div class="row g-2 mb-3">
      <div class="col-auto small text-muted-sp"><i class="bi bi-calendar-event me-1"></i>${fmtDate(t.fechaInicio)} → ${fmtDate(t.fechaFin)}</div>
      <div class="col-auto small text-muted-sp"><i class="bi bi-ticket-perforated me-1"></i>${fmtMoney(t.costo)}</div>
      <div class="col-auto small text-muted-sp"><i class="bi bi-people-fill me-1"></i>${t.cuposOcupados}/${t.cupo} cupos</div>
    </div>
    <div class="d-flex gap-2 flex-wrap mb-4">
      ${inscBtn}
      ${isOwner ? `<button class="btn-sp-outline" onclick="generateBracket('${t.id}')"><i class="bi bi-diagram-3 me-2"></i>Generar Fixture/Bracket</button>` : ''}
      ${isOwner ? `<button class="btn-sp-outline" onclick="openMessageModal('torneo','${t.id}')"><i class="bi bi-megaphone me-2"></i>Mensaje a inscritos</button>` : ''}
    </div>
    ${t.reglamento ? `<div class="bg-card rounded-xl p-3 mb-4"><strong>Reglamento:</strong> <span class="text-muted-sp">${t.reglamento}</span></div>` : ''}
    ${t.sponsors && t.sponsors.length ? `<div class="mb-4"><strong class="small">Patrocinadores:</strong> ${t.sponsors.map(s=>`<span class="badge-estado badge-curso ms-1">${s.nombre}</span>`).join('')}</div>` : ''}
    <ul class="nav nav-tabs border-secondary mb-3" id="torneoTabs">
      <li class="nav-item"><a class="nav-link active text-white" data-tab="bracket" onclick="switchTorneoTab('${t.id}','bracket')" style="cursor:pointer">Bracket / Fixture</a></li>
      <li class="nav-item"><a class="nav-link text-white" data-tab="posiciones" onclick="switchTorneoTab('${t.id}','posiciones')" style="cursor:pointer">Tabla de posiciones</a></li>
      <li class="nav-item"><a class="nav-link text-white" data-tab="inscritos" onclick="switchTorneoTab('${t.id}','inscritos')" style="cursor:pointer">Inscritos</a></li>
    </ul>
    <div id="torneoTabContent"></div>`;
}

function initTorneoDetailPage(){
  const id = qs('id');
  const db = loadDB();
  const t = db.tournaments.find(x=>x.id===id);
  const box = document.getElementById('torneoDetalleContent');
  if(!t){ box.innerHTML = '<p class="text-muted-sp">Torneo no encontrado. <a href="torneos.html" class="text-green">Volver a torneos</a></p>'; return; }
  box.innerHTML = torneoDetailHTML(t);
  switchTorneoTab(id, 'bracket');
}

function switchTorneoTab(torneoId, tab){
  document.querySelectorAll('#torneoTabs .nav-link').forEach(l=>l.classList.toggle('active', l.dataset.tab===tab));
  const db = loadDB();
  const t = db.tournaments.find(x=>x.id===torneoId);
  const el = document.getElementById('torneoTabContent');
  if(tab==='bracket') el.innerHTML = renderBracketHTML(t);
  if(tab==='posiciones') el.innerHTML = renderStandingsHTML(t);
  if(tab==='inscritos') el.innerHTML = renderInscritosHTML(t);
}

/* RF-012(SRS)/RF-004(matriz): inscripción con RF-013 validación edad/categoría + RF-020 control cupos + RF-023 lista de espera */
const CATEGORIA_EDAD = { 'Sub-12':[0,12], 'Sub-15':[13,15], 'Sub-20':[16,20], 'Abierta':[0,999] };
function inscribirse(torneoId){
  const u = currentUser();
  const db = loadDB();
  const t = db.tournaments.find(x=>x.id===torneoId);

  const edad = calcAge(u.fechaNacimiento);
  const rango = CATEGORIA_EDAD[t.categoria] || [0,999];
  if(edad===null){ toast('Tu perfil no tiene fecha de nacimiento registrada; no se puede validar la categoría.', 'danger'); return; }
  if(edad < rango[0] || edad > rango[1]){
    toast(`No cumples el rango de edad para la categoría ${t.categoria} (tienes ${edad} años). Inscripción bloqueada.`, 'danger');
    return;
  }
  if(!u.docSubido){ toast('Debes tener tu documento de identidad verificado para inscribirte.', 'danger'); return; }
  if(t.cuposOcupados >= t.cupo){ toast('El torneo ya no tiene cupos disponibles.', 'danger'); return; }

  db.registrations.push({ id: uid('reg'), tournamentId: torneoId, athleteId: u.id, estado:'Pendiente', fecha: nowISO() });
  t.cuposOcupados++;
  t.teams.push({ id: u.id, nombre: u.nombre });
  if(t.cuposOcupados >= t.cupo){ t.estado = 'Cerrado'; }
  saveDB(db);
  pushNotification(t.organizadorId, `${u.nombre} se inscribió al torneo "${t.nombre}".`);
  sessionStorage.setItem('sp_flash', 'Inscripción registrada en estado PENDIENTE.');
  location.reload();
}
function joinWaitlist(torneoId){
  const u = currentUser();
  if(!u){ toast('Inicia sesión primero.', 'info'); return; }
  const db = loadDB();
  const t = db.tournaments.find(x=>x.id===torneoId);
  if(!t.waitlist.includes(u.id)){ t.waitlist.push(u.id); saveDB(db); sessionStorage.setItem('sp_flash','Te uniste a la lista de espera. Te avisaremos si se libera un cupo.'); }
  location.reload();
}

function renderInscritosHTML(t){
  if(!t.teams.length) return '<p class="text-muted-sp">Aún no hay equipos/deportistas inscritos.</p>';
  return `<div class="table-responsive"><table class="table table-sp"><thead><tr><th>#</th><th>Nombre</th></tr></thead><tbody>
    ${t.teams.map((team,i)=>`<tr><td>${i+1}</td><td>${team.nombre}</td></tr>`).join('')}
  </tbody></table></div>` + (t.waitlist.length ? `<p class="small text-muted-sp mt-2"><i class="bi bi-hourglass-split me-1"></i>${t.waitlist.length} persona(s) en lista de espera.</p>` : '');
}

/* RF-010(SRS)/RF-022(matriz): generación automática de brackets/fixture */
function generateBracket(torneoId){
  const db = loadDB();
  const t = db.tournaments.find(x=>x.id===torneoId);
  if(t.teams.length < 2){ toast('Se necesitan al menos 2 inscritos para generar el fixture.', 'danger'); return; }

  let teams = t.teams.slice();
  // shuffle
  for(let i=teams.length-1;i>0;i--){ const j = Math.floor(Math.random()*(i+1)); [teams[i],teams[j]]=[teams[j],teams[i]]; }

  if(t.formato === 'todos'){
    const matches = [];
    for(let i=0;i<teams.length;i++) for(let j=i+1;j<teams.length;j++){
      matches.push({ id: uid('m'), ronda:1, local: teams[i], visitante: teams[j], marcadorLocal:null, marcadorVisitante:null, estado:'Programado' });
    }
    t.matches = matches; t.bracket = null;
    t.standings = teams.map(tm=>({id:tm.id, nombre:tm.nombre, pj:0,pg:0,pe:0,pp:0,pts:0}));
  } else {
    // eliminación directa: completar a potencia de 2 con "BYE"
    let size = 1; while(size < teams.length) size *= 2;
    while(teams.length < size) teams.push({id:null, nombre:'BYE'});
    const rounds = [];
    let currentRoundTeams = teams;
    let roundNum = 1;
    const matches = [];
    while(currentRoundTeams.length > 1){
      const roundMatches = [];
      for(let i=0;i<currentRoundTeams.length;i+=2){
        const m = { id: uid('m'), ronda:roundNum, local: currentRoundTeams[i], visitante: currentRoundTeams[i+1], marcadorLocal:null, marcadorVisitante:null, estado:'Programado' };
        if(m.visitante.id===null){ m.estado='Bye'; m.marcadorLocal=1; m.marcadorVisitante=0; } // auto-advance
        roundMatches.push(m); matches.push(m);
      }
      rounds.push(roundMatches);
      currentRoundTeams = roundMatches.map(m=> m.estado==='Bye' ? m.local : {id:'TBD_'+m.id, nombre:'Ganador partido ' + (matches.indexOf(m)+1)});
      roundNum++;
    }
    t.bracket = rounds;
    t.matches = matches;
    t.standings = null;
  }
  t.estado = 'En curso';
  saveDB(db);
  sessionStorage.setItem('sp_flash', 'Fixture / bracket generado automáticamente.');
  (t.teams||[]).forEach(tm=> tm.id && pushNotification(tm.id, `Se generó el fixture del torneo "${t.nombre}". ¡Revisa tu llave!`));
  location.reload();
}

function renderBracketHTML(t){
  if(t.formato==='todos'){
    if(!t.matches.length) return '<p class="text-muted-sp">El organizador aún no genera el fixture (todos contra todos).</p>';
    return renderMatchesTable(t);
  }
  if(!t.bracket) return '<p class="text-muted-sp">El organizador aún no genera el bracket de eliminación directa.</p>';
  return `<div class="bracket-wrap">` + t.bracket.map((round, ri)=>`
    <div class="bracket-round">
      <div class="bracket-round-title">${ri===t.bracket.length-1 ? 'Final' : 'Ronda ' + (ri+1)}</div>
      ${round.map(m=>`
        <div class="bracket-match">
          <div class="bracket-team ${m.estado==='Jugado'&&m.marcadorLocal>m.marcadorVisitante?'winner':''} ${m.local.nombre==='BYE'?'pending':''}">${m.local.nombre} <span>${m.marcadorLocal ?? ''}</span></div>
          <div class="bracket-team ${m.estado==='Jugado'&&m.marcadorVisitante>m.marcadorLocal?'winner':''} ${m.visitante.nombre==='BYE'||m.visitante.nombre.startsWith('Ganador')?'pending':''}">${m.visitante.nombre} <span>${m.marcadorVisitante ?? ''}</span></div>
          ${m.estado==='Programado' && m.local.id && m.visitante.id ? `<button class="btn btn-sm btn-sp-outline w-100 mt-1" style="font-size:.7rem;padding:2px 6px" onclick="openScoreModal('${t.id}','${m.id}')">Registrar marcador</button>` : ''}
        </div>`).join('')}
    </div>`).join('') + `</div>`;
}
function renderMatchesTable(t){
  return `<div class="table-responsive"><table class="table table-sp"><thead><tr><th>Local</th><th>Visitante</th><th>Marcador</th><th>Estado</th><th></th></tr></thead><tbody>
    ${t.matches.map(m=>`<tr><td>${m.local.nombre}</td><td>${m.visitante.nombre}</td>
      <td>${m.marcadorLocal!==null ? m.marcadorLocal+' - '+m.marcadorVisitante : '—'}</td>
      <td>${badgeEstado(m.estado==='Jugado'?'Aprobado':'Pendiente')}</td>
      <td>${m.estado!=='Jugado' ? `<button class="btn btn-sm btn-sp-outline" onclick="openScoreModal('${t.id}','${m.id}')">Marcador</button>` : ''}</td></tr>`).join('')}
  </tbody></table></div>`;
}

/* RF-011(SRS)/RF-005(matriz): marcadores y tabla de posiciones en tiempo real */
let scoreCtx = null;
function openScoreModal(torneoId, matchId){
  const db = loadDB();
  const t = db.tournaments.find(x=>x.id===torneoId);
  const m = t.matches.find(x=>x.id===matchId);
  scoreCtx = { torneoId, matchId };
  document.getElementById('scoreModalBody').innerHTML = `
    <div class="row g-2 align-items-center">
      <div class="col-5 text-center"><strong>${m.local.nombre}</strong><input type="number" min="0" class="form-control text-center mt-2" id="scoreLocal" value="0"></div>
      <div class="col-2 text-center fs-4">VS</div>
      <div class="col-5 text-center"><strong>${m.visitante.nombre}</strong><input type="number" min="0" class="form-control text-center mt-2" id="scoreVisitante" value="0"></div>
    </div>`;
  bootstrap.Modal.getOrCreateInstance(document.getElementById('scoreModal')).show();
}
function confirmScore(){
  const { torneoId, matchId } = scoreCtx;
  const sl = Number(document.getElementById('scoreLocal').value);
  const sv = Number(document.getElementById('scoreVisitante').value);
  const db = loadDB();
  const t = db.tournaments.find(x=>x.id===torneoId);
  const m = t.matches.find(x=>x.id===matchId);
  m.marcadorLocal = sl; m.marcadorVisitante = sv; m.estado = 'Jugado';

  if(t.formato==='eliminacion'){
    advanceBracketWinner(t, m);
  } else {
    recalcStandingsAllPlay(t);
  }
  checkTorneoFinalizado(t);
  saveDB(db);
  sessionStorage.setItem('sp_flash', 'Marcador registrado. Tabla de posiciones actualizada al instante.');
  bootstrap.Modal.getOrCreateInstance(document.getElementById('scoreModal')).hide();
  location.reload();
}
function advanceBracketWinner(t, playedMatch){
  const ganador = playedMatch.marcadorLocal >= playedMatch.marcadorVisitante ? playedMatch.local : playedMatch.visitante;
  for(const round of t.bracket){
    for(const m of round){
      if(m.local.id && String(m.local.id).startsWith('TBD_'+playedMatch.id)) m.local = ganador;
      if(m.visitante.id && String(m.visitante.id).startsWith('TBD_'+playedMatch.id)) m.visitante = ganador;
      if(m.local.nombre === 'Ganador partido ' + (t.matches.indexOf(playedMatch)+1)) m.local = ganador;
      if(m.visitante.nombre === 'Ganador partido ' + (t.matches.indexOf(playedMatch)+1)) m.visitante = ganador;
    }
  }
}
function recalcStandingsAllPlay(t){
  const st = {}; t.standings.forEach(s=> st[s.id] = {...s, pj:0,pg:0,pe:0,pp:0,pts:0});
  t.matches.filter(m=>m.estado==='Jugado').forEach(m=>{
    const l = st[m.local.id], v = st[m.visitante.id];
    if(!l||!v) return;
    l.pj++; v.pj++;
    if(m.marcadorLocal > m.marcadorVisitante){ l.pg++; l.pts+=3; v.pp++; }
    else if(m.marcadorLocal < m.marcadorVisitante){ v.pg++; v.pts+=3; l.pp++; }
    else { l.pe++; v.pe++; l.pts+=1; v.pts+=1; }
  });
  t.standings = Object.values(st).sort((a,b)=>b.pts-a.pts);
}
function checkTorneoFinalizado(t){
  const allPlayed = t.matches.length && t.matches.every(m=>m.estado==='Jugado' || m.estado==='Bye');
  if(allPlayed && t.estado !== 'Finalizado'){
    t.estado = 'Finalizado';
    if(!t.encuestaEnviada){
      t.encuestaEnviada = true;
      (t.teams||[]).forEach(tm=> tm.id && pushNotification(tm.id, `El torneo "${t.nombre}" finalizó. 📋 Encuesta de satisfacción: ¿cómo calificarías la organización?`));
    }
  }
}
function renderStandingsHTML(t){
  if(t.formato==='eliminacion') return '<p class="text-muted-sp">Este torneo es de eliminación directa: consulta el bracket para ver avances.</p>';
  if(!t.standings) return '<p class="text-muted-sp">Aún no hay tabla de posiciones (genera el fixture primero).</p>';
  return `<div class="table-responsive"><table class="table table-sp"><thead><tr><th>#</th><th>Equipo</th><th>PJ</th><th>PG</th><th>PE</th><th>PP</th><th>Pts</th></tr></thead><tbody>
    ${t.standings.map((s,i)=>`<tr><td>${i+1}</td><td>${s.nombre}</td><td>${s.pj}</td><td>${s.pg}</td><td>${s.pe}</td><td>${s.pp}</td><td class="fw-bold text-green">${s.pts}</td></tr>`).join('')}
  </tbody></table></div>`;
}

/* ---------- Calendario público (RF-010 matriz) ---------- */
function renderCalendario(reset){
  const db = loadDB();
  const deporte = document.getElementById('fCalDeporte')?.value || '';
  const clubId = document.getElementById('fCalClub')?.value || '';
  let list = db.tournaments.slice().sort((a,b)=> new Date(a.fechaInicio) - new Date(b.fechaInicio));
  if(deporte) list = list.filter(t=>t.disciplina===deporte);
  const el = document.getElementById('calendarioList');
  if(!list.length){ el.innerHTML = '<p class="text-muted-sp">No hay eventos programados.</p>'; return; }
  el.innerHTML = list.map(t=>`
    <a href="torneo.html?id=${t.id}" class="bg-card rounded-xl p-3 mb-2 d-flex justify-content-between align-items-center flex-wrap gap-2 text-white text-decoration-none">
      <div><strong>${fmtDate(t.fechaInicio)}</strong> — ${t.nombre} <span class="text-muted-sp small">(${t.disciplina}, ${t.categoria})</span></div>
      ${badgeEstado(t.estado)}
    </a>`).join('');
}

/* ---------- Mapa (RF-014 matriz) ---------- */
const COMUNA_COORDS = {
  'Comuna 1 - Popular': [12,18], 'Comuna 4 - Aranjuez': [30,15], 'Comuna 10 - La Candelaria':[45,45],
  'Comuna 11 - Laureles-Estadio':[25,50], 'Comuna 14 - Poblado':[55,68], 'Comuna 15 - Guayabal':[30,72], 'Comuna 16 - Belén':[18,75]
};
function renderMapa(reset){
  const db = loadDB();
  const deporte = document.getElementById('fMapaDeporte')?.value || '';
  const comuna = document.getElementById('fMapaComuna')?.value || '';
  let list = db.clubs.filter(c=>c.estado==='Aprobado');
  if(deporte) list = list.filter(c=>c.disciplina===deporte);
  if(comuna) list = list.filter(c=>c.comuna===comuna);
  const map = document.getElementById('miniMap');
  let html = Object.entries(COMUNA_COORDS).map(([name,[x,y]])=>`<div class="comuna-zone" style="left:${x-6}%;top:${y-4}%">${name.split(' - ')[1]}</div>`).join('');
  list.forEach(c=>{
    const coords = COMUNA_COORDS[c.comuna] || [50,50];
    const jitterX = coords[0] + (Math.random()*6-3), jitterY = coords[1] + (Math.random()*6-3);
    html += `<a href="club.html?id=${c.id}" class="map-pin" style="left:${jitterX}%;top:${jitterY}%" title="${c.nombre}"><i class="bi bi-geo-alt-fill"></i></a>`;
  });
  map.innerHTML = html;
}

/* ---------- Noticias (RF-019 matriz) ---------- */
function renderNoticias(){
  const db = loadDB();
  const list = db.news.slice().sort((a,b)=> new Date(b.fecha)-new Date(a.fecha));
  document.getElementById('noticiasGrid').innerHTML = list.map(n=>`
    <div class="col-md-6"><div class="bg-card news-card rounded-xl p-3 h-100">
      <h6 class="fw-bold">${n.titulo}</h6><p class="small mb-2">${n.contenido}</p>
      <small>${fmtDate(n.fecha)}</small>
    </div></div>`).join('');
}
function openNoticiaForm(){ bootstrap.Modal.getOrCreateInstance(document.getElementById('noticiaFormModal')).show(); }
function saveNoticia(){
  const u = currentUser();
  const titulo = document.getElementById('nfTitulo').value.trim();
  const contenido = document.getElementById('nfContenido').value.trim();
  if(!titulo || !contenido){ toast('Completa título y contenido.', 'danger'); return; }
  const db = loadDB();
  db.news.unshift({ id: uid('n'), titulo, contenido, fecha: nowISO(), autorId: u.id });
  saveDB(db);
  sessionStorage.setItem('sp_flash', 'Noticia publicada en la página principal.');
  bootstrap.Modal.getOrCreateInstance(document.getElementById('noticiaFormModal')).hide();
  location.reload();
}

/* ---------- Home ---------- */
function renderHome(){
  const db = loadDB();
  document.getElementById('homeStatsRow').innerHTML = `
    <div class="col-6"><div class="kpi-num">${db.clubs.filter(c=>c.estado==='Aprobado').length}</div><div class="kpi-label">Clubes activos</div></div>
    <div class="col-6"><div class="kpi-num">${db.tournaments.filter(t=>t.estado!=='Finalizado').length}</div><div class="kpi-label">Torneos vigentes</div></div>
    <div class="col-6"><div class="kpi-num">${db.users.filter(u=>u.rol==='Deportista').length}</div><div class="kpi-label">Deportistas</div></div>
    <div class="col-6"><div class="kpi-num">${COMUNAS.length}</div><div class="kpi-label">Comunas cubiertas</div></div>`;
  document.getElementById('homeTorneosPreview').innerHTML = db.tournaments.filter(t=>t.estado==='Abierto').slice(0,3).map(torneoCardHTML).join('') || '<p class="text-muted-sp">No hay torneos abiertos por ahora.</p>';
  document.getElementById('homeNoticiasPreview').innerHTML = db.news.slice(0,2).map(n=>`
    <div class="col-md-6"><div class="bg-card rounded-xl p-3 h-100"><h6 class="fw-bold">${n.titulo}</h6><p class="text-muted-sp small mb-0">${n.contenido}</p></div></div>`).join('');
}
/* ══════════════ VISTAS PRIVADAS POR ROL ══════════════ */

function viewHeader(icon, title, subtitle){
  return `<div class="mb-4"><h2 class="font-display fs-1 mb-0"><i class="bi ${icon} text-green me-2"></i>${title}</h2>${subtitle?`<p class="text-muted-sp">${subtitle}</p>`:''}</div>`;
}

/* -------- Dashboard (RF-014 SRS / RF-024 matriz para Admin Sistema; resumen por rol) -------- */
function renderDashboard(content){
  const u = currentUser(); const db = loadDB();
  if(u.rol === 'Admin. Sistema'){
    const clubesActivos = db.clubs.filter(c=>c.estado==='Aprobado').length;
    const clubesPendientes = db.clubs.filter(c=>c.estado==='Pendiente').length;
    const torneosCurso = db.tournaments.filter(t=>t.estado==='En curso').length;
    const deportistas = db.users.filter(u2=>u2.rol==='Deportista').length;
    const crecimientoMes = db.users.filter(u2=> (Date.now() - new Date(u2.fechaRegistro)) < 30*86400000).length;

    // simple heat by comuna
    const comunaCounts = {};
    COMUNAS.forEach(c=>comunaCounts[c]=0);
    db.clubs.filter(c=>c.estado==='Aprobado').forEach(c=> comunaCounts[c.comuna] = (comunaCounts[c.comuna]||0)+1);
    const maxCount = Math.max(1, ...Object.values(comunaCounts));

    content.innerHTML = viewHeader('bi-speedometer2', 'Panel de Métricas KPI', 'Indicadores clave en tiempo real del sistema.') + `
      <div class="row g-3 mb-4">
        <div class="col-md-3"><div class="kpi-card"><div class="kpi-num">${clubesActivos}</div><div class="kpi-label">Clubes activos</div></div></div>
        <div class="col-md-3"><div class="kpi-card"><div class="kpi-num">${clubesPendientes}</div><div class="kpi-label">Clubes por validar</div></div></div>
        <div class="col-md-3"><div class="kpi-card"><div class="kpi-num">${torneosCurso}</div><div class="kpi-label">Torneos en ejecución</div></div></div>
        <div class="col-md-3"><div class="kpi-card"><div class="kpi-num">${deportistas}</div><div class="kpi-label">Deportistas registrados</div></div></div>
      </div>
      <div class="row g-3">
        <div class="col-lg-7">
          <div class="bg-card rounded-xl p-3">
            <h6 class="fw-bold mb-3">Mapa de calor — clubes por comuna</h6>
            ${Object.entries(comunaCounts).map(([name,count])=>`
              <div class="d-flex align-items-center gap-2 mb-2">
                <div style="width:180px" class="small text-muted-sp">${name.split(' - ')[1]||name}</div>
                <div class="flex-fill" style="background:#222;border-radius:6px;overflow:hidden;height:16px;">
                  <div style="width:${(count/maxCount*100)||0}%;background:var(--sp-green);height:100%;"></div>
                </div><div class="small">${count}</div>
              </div>`).join('')}
          </div>
        </div>
        <div class="col-lg-5">
          <div class="bg-card rounded-xl p-3">
            <h6 class="fw-bold mb-3">Crecimiento (últimos 30 días)</h6>
            <div class="kpi-num">+${crecimientoMes}</div><div class="kpi-label">Nuevos usuarios</div>
            <hr class="border-secondary">
            <h6 class="fw-bold mb-2">Auditoría reciente</h6>
            <ul class="small text-muted-sp mb-0">
              ${db.clubs.slice(-4).reverse().map(c=>`<li>${c.nombre} — ${badgeEstado(c.estado)}</li>`).join('')}
            </ul>
          </div>
        </div>
      </div>`;
    return;
  }

  if(u.rol === 'Admin. Club'){
    const misClubes = db.clubs.filter(c=>c.adminId===u.id);
    content.innerHTML = viewHeader('bi-speedometer2', `Bienvenido, ${u.nombre.split(' ')[0]}`, 'Resumen de tu(s) club(es).') + `
      <div class="row g-3 mb-4">
        <div class="col-md-4"><div class="kpi-card"><div class="kpi-num">${misClubes.length}</div><div class="kpi-label">Clubes registrados</div></div></div>
        <div class="col-md-4"><div class="kpi-card"><div class="kpi-num">${misClubes.reduce((a,c)=>a+c.miembros.length,0)}</div><div class="kpi-label">Deportistas afiliados</div></div></div>
        <div class="col-md-4"><div class="kpi-card"><div class="kpi-num">${misClubes.filter(c=>c.estado==='Aprobado').length}</div><div class="kpi-label">Clubes aprobados</div></div></div>
      </div>
      <div class="row g-3">${misClubes.map(clubCardHTML).join('') || '<p class="text-muted-sp px-3">Aún no has registrado ningún club.</p>'}</div>`;
    return;
  }

  if(u.rol === 'Organizador'){
    const misTorneos = db.tournaments.filter(t=>t.organizadorId===u.id);
    content.innerHTML = viewHeader('bi-speedometer2', `Bienvenido, ${u.nombre.split(' ')[0]}`, 'Resumen de tus torneos.') + `
      <div class="row g-3 mb-4">
        <div class="col-md-4"><div class="kpi-card"><div class="kpi-num">${misTorneos.length}</div><div class="kpi-label">Torneos creados</div></div></div>
        <div class="col-md-4"><div class="kpi-card"><div class="kpi-num">${misTorneos.filter(t=>t.estado==='Abierto').length}</div><div class="kpi-label">Abiertos a inscripción</div></div></div>
        <div class="col-md-4"><div class="kpi-card"><div class="kpi-num">${misTorneos.reduce((a,t)=>a+t.cuposOcupados,0)}</div><div class="kpi-label">Inscripciones totales</div></div></div>
      </div>
      <div class="row g-3">${misTorneos.map(torneoCardHTML).join('') || '<p class="text-muted-sp px-3">Aún no has creado ningún torneo.</p>'}</div>`;
    return;
  }

  // Deportista
  const misInscripciones = db.registrations.filter(r=>r.athleteId===u.id);
  const misClubesId = db.clubs.filter(c=>c.miembros.includes(u.id));
  content.innerHTML = viewHeader('bi-speedometer2', `Hola, ${u.nombre.split(' ')[0]}`, 'Tu resumen deportivo.') + `
    <div class="row g-3 mb-4">
      <div class="col-md-4"><div class="kpi-card"><div class="kpi-num">${misInscripciones.length}</div><div class="kpi-label">Inscripciones</div></div></div>
      <div class="col-md-4"><div class="kpi-card"><div class="kpi-num">${misClubesId.length}</div><div class="kpi-label">Clubes afiliado</div></div></div>
      <div class="col-md-4"><div class="kpi-card"><div class="kpi-num">${calcAge(u.fechaNacimiento) ?? '—'}</div><div class="kpi-label">Edad</div></div></div>
    </div>
    <div class="bg-card rounded-xl p-3">
      <h6 class="fw-bold mb-2">Próximos torneos disponibles</h6>
      <div class="row g-2">${db.tournaments.filter(t=>t.estado==='Abierto').slice(0,3).map(torneoCardHTML).join('') || '<p class="text-muted-sp">No hay torneos abiertos.</p>'}</div>
    </div>`;
}

/* -------- Perfil deportista (edición + RF-025 compartir) -------- */
function renderPerfilDeportista(content){
  const u = currentUser();
  content.innerHTML = viewHeader('bi-person', 'Mi Perfil') + `
    <div class="bg-card rounded-xl p-3 p-lg-4 mb-3">
      <div class="row g-4 align-items-start">
        <div class="col-12 col-lg-5 col-xl-4">
          <h6 class="fw-bold mb-3"><i class="bi bi-person-badge text-green me-2"></i>Carnet virtual</h6>
          <div id="carnetWrap">${carnetDeportistaHTML(u)}</div>
          <button class="btn-sp-outline btn-sm mt-3" onclick="imprimirCarnet()"><i class="bi bi-printer me-1"></i>Imprimir / guardar como PDF</button>
        </div>
        <div class="col-12 col-lg-7 col-xl-8" id="carnetPanelWrap">${carnetPanelHTML(u)}</div>
      </div>
    </div>
    <div class="bg-card rounded-xl p-3 p-lg-4">
      <h6 class="fw-bold mb-3"><i class="bi bi-person text-green me-2"></i>Mis datos</h6>
      <div class="row g-3">
        <div class="col-md-6"><label class="form-label">Nombre</label><input class="form-control" value="${u.nombre}" id="pfNombre"></div>
        <div class="col-md-6"><label class="form-label">Correo</label><input class="form-control" value="${u.email}" disabled></div>
        <div class="col-md-6"><label class="form-label">Teléfono</label><input class="form-control" value="${u.telefono||''}" id="pfTelefono"></div>
        <div class="col-md-6"><label class="form-label">Fecha de nacimiento</label><input class="form-control" type="date" value="${u.fechaNacimiento||''}" id="pfFecha"></div>
      </div>
      <p class="small text-muted-sp mt-3 mb-3">${u.docSubido ? '<i class="bi bi-patch-check text-green me-1"></i>Documento de identidad verificado.' : '<i class="bi bi-exclamation-triangle text-warning me-1"></i>Sin documento de identidad verificado.'}</p>
      <div class="d-flex flex-wrap gap-2 align-items-center">
        <button class="btn-green-submit" style="width:auto;padding:8px 22px" onclick="savePerfil()">Guardar cambios</button>
        <span class="text-muted-sp small ms-lg-3">Compartir perfil:</span>
        <button class="btn-sp-outline btn-sm" onclick="shareProfile('whatsapp')"><i class="bi bi-whatsapp me-1"></i>WhatsApp</button>
        <button class="btn-sp-outline btn-sm" onclick="shareProfile('copy')"><i class="bi bi-link-45deg me-1"></i>Copiar enlace</button>
      </div>
    </div>`;
}

/* -------- Carnet virtual del deportista -------- */
const CARNET_COLORES = {
  verde:   {a:'#1db954', ink:'#05170b'},
  azul:    {a:'#2f80ed', ink:'#ffffff'},
  naranja: {a:'#f2994a', ink:'#1f1200'},
  morado:  {a:'#9b51e0', ink:'#ffffff'},
  rojo:    {a:'#eb5757', ink:'#ffffff'}
};
function carnetHexValido(h){ return /^#[0-9a-fA-F]{6}$/.test(h||''); }
function carnetTinta(hex){
  const r = parseInt(hex.slice(1,3),16), g = parseInt(hex.slice(3,5),16), b = parseInt(hex.slice(5,7),16);
  return (0.299*r + 0.587*g + 0.114*b) > 150 ? '#0b0b0b' : '#ffffff';
}
function carnetColorDe(cfg){
  if(carnetHexValido(cfg.colorHex)) return {a: cfg.colorHex.toLowerCase(), ink: carnetTinta(cfg.colorHex)};
  return CARNET_COLORES[cfg.color] || CARNET_COLORES.verde;
}
function carnetEsc(s){ return String(s==null?'':s).replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
function carnetHash(str){ let h = 2166136261; for(let i=0;i<str.length;i++){ h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); } return h>>>0; }
function carnetCodigo(u){ return 'SP-' + String(carnetHash(u.id) % 1000000).padStart(6,'0'); }
function carnetBarras(codigo){
  /* Barras decorativas deterministas a partir del código (no es un estándar de código de barras real). */
  let seed = carnetHash(codigo), x = 0, bars = '';
  for(let i=0;i<46;i++){
    seed = (Math.imul(seed, 1103515245) + 12345) >>> 0;
    const w = 1 + (seed % 3), gap = 1 + ((seed >> 4) % 2);
    bars += `<rect x="${x}" y="0" width="${w}" height="34" fill="#f5f5f5"/>`;
    x += w + gap;
  }
  return `<svg viewBox="0 0 ${x} 34" preserveAspectRatio="none" width="100%" height="34" aria-hidden="true">${bars}</svg>`;
}
function carnetDeportistaHTML(u){
  const db = loadDB();
  const cfg = u.carnet || {};
  const col = carnetColorDe(cfg);
  const clubs = db.clubs.filter(c => (c.miembros||[]).includes(u.id) && c.estado==='Aprobado');
  const clubTxt = clubs.length ? clubs.map(c=>carnetEsc(c.nombre)).join(' · ') : 'Sin club vinculado';
  const disc = cfg.deporte ? carnetEsc(cfg.deporte) : (clubs.length ? [...new Set(clubs.map(c=>c.disciplina))].map(carnetEsc).join(' · ') : '—');
  const edad = calcAge(u.fechaNacimiento);
  const iniciales = (u.nombre||'?').trim().split(/\s+/).slice(0,2).map(p=>p[0]).join('').toUpperCase();
  const codigo = carnetCodigo(u);
  const vigencia = '31 dic ' + new Date().getFullYear();
  const verificado = !!u.docSubido;
  const foto = cfg.foto ? `<img src="${cfg.foto}" alt="Foto del deportista">` : carnetEsc(iniciales);
  const extra = [cfg.posicion && ('Posición: ' + carnetEsc(cfg.posicion)), cfg.categoria && ('Categoría: ' + carnetEsc(cfg.categoria))].filter(Boolean);
  return `
  <div class="carnet-sp" id="carnetSP" style="--carnet-accent:${col.a};--carnet-ink:${col.ink}">
    <div class="carnet-head">
      <span class="carnet-brand">Sport<span>Point</span></span>
      <span class="carnet-tipo">Carnet de deportista</span>
    </div>
    <div class="carnet-body">
      <div class="carnet-foto">${foto}</div>
      <div class="carnet-datos">
        <div class="carnet-nombre">${carnetEsc(u.nombre)}</div>
        <div class="carnet-fila"><i class="bi bi-people"></i>${clubTxt}</div>
        <div class="carnet-fila"><i class="bi bi-trophy"></i>${disc}</div>
        ${extra.map(t=>`<div class="carnet-fila"><i class="bi bi-person-lines-fill"></i>${t}</div>`).join('')}
        <div class="carnet-fila"><i class="bi bi-calendar3"></i>${edad===null ? 'Edad no registrada' : edad + ' años'}</div>
      </div>
    </div>
    <div class="carnet-estado ${verificado ? 'ok' : 'pend'}">
      <i class="bi ${verificado ? 'bi-patch-check-fill' : 'bi-exclamation-triangle-fill'} me-1"></i>
      ${verificado ? 'Identidad verificada' : 'Verificación pendiente'}
    </div>
    <div class="carnet-pie">
      <div class="carnet-meta">
        <div><small>ID</small><strong>${codigo}</strong></div>
        <div><small>Vigencia</small><strong>${vigencia}</strong></div>
      </div>
      <div class="carnet-barras">${carnetBarras(codigo)}</div>
    </div>
  </div>`;
}
function carnetPanelHTML(u){
  const cfg = u.carnet || {};
  const col = carnetColorDe(cfg);
  const hex = col.a;
  const rgb = [1,3,5].map(i=>parseInt(hex.slice(i,i+2),16));
  const presets = Object.keys(CARNET_COLORES).map(k =>
    `<button type="button" class="carnet-swatch" style="background:${CARNET_COLORES[k].a}" title="${k}" aria-label="Color ${k}" onclick="carnetColorGuardar('${CARNET_COLORES[k].a}')"></button>`).join('');
  const slider = (n, i, color) => `
    <div class="d-flex align-items-center gap-2 mb-1">
      <span class="carnet-rgb-l" style="color:${color}">${n}</span>
      <input type="range" min="0" max="255" value="${rgb[i]}" class="carnet-range" id="cnRgb${n}" style="--c:${color}"
        oninput="carnetColorDesdeRGB()" onchange="carnetColorDesdeRGB(true)">
      <span class="small text-muted-sp" id="cnRgbV${n}" style="width:28px;text-align:right">${rgb[i]}</span>
    </div>`;
  return `
  <div class="carnet-panel">
    <h6 class="fw-bold mb-3"><i class="bi bi-palette text-green me-2"></i>Personalizar carnet</h6>
    <div class="row g-3">
      <div class="col-12 col-xl-6">
        <label class="form-label small">Foto</label>
        <div class="d-flex flex-wrap gap-2 mb-3">
          <label class="btn-sp-outline btn-sm mb-0" style="cursor:pointer"><i class="bi bi-upload me-1"></i>Subir foto
            <input type="file" accept="image/*" hidden onchange="carnetFoto(this)"></label>
          ${cfg.foto ? `<button type="button" class="btn-sp-outline btn-sm" onclick="carnetQuitarFoto()"><i class="bi bi-trash me-1"></i>Quitar</button>` : ''}
        </div>
        <label class="form-label small">Datos del carnet</label>
        <div class="row g-2">
          <div class="col-12"><input class="form-control form-control-sm" id="cnDeporte" maxlength="30" value="${carnetEsc(cfg.deporte||'')}" placeholder="Deporte (ej: Fútbol)"></div>
          <div class="col-6"><input class="form-control form-control-sm" id="cnPosicion" maxlength="30" value="${carnetEsc(cfg.posicion||'')}" placeholder="Posición"></div>
          <div class="col-6"><input class="form-control form-control-sm" id="cnCategoria" maxlength="30" value="${carnetEsc(cfg.categoria||'')}" placeholder="Categoría"></div>
        </div>
        <button type="button" class="btn-green-submit mt-3" style="width:auto;padding:8px 20px" onclick="carnetGuardarCampos()">Guardar datos</button>
      </div>
      <div class="col-12 col-xl-6">
        <label class="form-label small">Color y tonalidad</label>
        <div class="d-flex align-items-center gap-2 mb-2">
          <input type="color" id="cnColor" class="carnet-color-input" value="${hex}" oninput="carnetColorLive(this.value)" onchange="carnetColorGuardar(this.value)" title="Elige un color">
          <input class="form-control form-control-sm" id="cnHex" maxlength="7" value="${hex}" style="width:96px;font-family:monospace" onchange="carnetColorDesdeHex(this.value)">
          <span class="small text-muted-sp">Toca el cuadro para abrir la paleta</span>
        </div>
        ${slider('R',0,'#ff6b6b')}${slider('G',1,'#51d88a')}${slider('B',2,'#5aa9ff')}
        <div class="d-flex flex-wrap gap-2 mt-2">${presets}</div>
      </div>
    </div>
  </div>`;
}
function carnetActualizar(mutar, sinPanel){
  const db = loadDB(); const u = currentUser();
  const user = db.users.find(x=>x.id===u.id);
  user.carnet = user.carnet || {};
  mutar(user.carnet);
  if(!saveDB(db)) return false;
  const u2 = currentUser();
  const wrap = document.getElementById('carnetWrap');
  if(wrap) wrap.innerHTML = carnetDeportistaHTML(u2);
  const pw = document.getElementById('carnetPanelWrap');
  if(pw && !sinPanel) pw.innerHTML = carnetPanelHTML(u2);
  return true;
}
function carnetAplicarColorVista(hex){
  const el = document.getElementById('carnetSP');
  if(el){ el.style.setProperty('--carnet-accent', hex); el.style.setProperty('--carnet-ink', carnetTinta(hex)); }
  const rgb = [1,3,5].map(i=>parseInt(hex.slice(i,i+2),16));
  ['R','G','B'].forEach((n,i)=>{ const r = document.getElementById('cnRgb'+n), v = document.getElementById('cnRgbV'+n); if(r) r.value = rgb[i]; if(v) v.textContent = rgb[i]; });
  const c = document.getElementById('cnColor'); if(c) c.value = hex;
  const h = document.getElementById('cnHex'); if(h) h.value = hex;
}
function carnetColorLive(hex){ if(carnetHexValido(hex)) carnetAplicarColorVista(hex.toLowerCase()); }
function carnetColorGuardar(hex){
  if(!carnetHexValido(hex)) return;
  hex = hex.toLowerCase();
  carnetAplicarColorVista(hex);
  carnetActualizar(c => { c.colorHex = hex; delete c.color; }, true);
}
function carnetColorDesdeHex(v){
  v = (v||'').trim(); if(v[0] !== '#') v = '#' + v;
  if(!carnetHexValido(v)){ toast('Color no válido. Usa el formato #1db954.', 'danger'); const c = document.getElementById('cnColor'); if(c) carnetAplicarColorVista(c.value); return; }
  carnetColorGuardar(v);
}
function carnetColorDesdeRGB(guardar){
  const g = n => Math.max(0, Math.min(255, parseInt(document.getElementById('cnRgb'+n).value,10) || 0));
  const hex = '#' + [g('R'),g('G'),g('B')].map(x=>x.toString(16).padStart(2,'0')).join('');
  if(guardar) carnetColorGuardar(hex); else carnetAplicarColorVista(hex);
}
function carnetQuitarFoto(){ carnetActualizar(c => { delete c.foto; }); }
function carnetGuardarCampos(){
  const v = id => (document.getElementById(id).value || '').trim().slice(0,30);
  const ok = carnetActualizar(c => { c.deporte = v('cnDeporte'); c.posicion = v('cnPosicion'); c.categoria = v('cnCategoria'); });
  if(ok) toast('Carnet actualizado.', 'success');
}
function carnetFoto(input){
  const file = input.files && input.files[0];
  if(!file) return;
  if(!file.type.startsWith('image/')){ toast('Elige un archivo de imagen.', 'danger'); return; }
  const reader = new FileReader();
  reader.onload = () => {
    const img = new Image();
    img.onload = () => {
      /* Recorte cuadrado centrado a 320×320 y compresión JPEG para no llenar el almacenamiento */
      const S = 320, side = Math.min(img.width, img.height);
      const cv = document.createElement('canvas'); cv.width = S; cv.height = S;
      cv.getContext('2d').drawImage(img, (img.width-side)/2, (img.height-side)/2, side, side, 0, 0, S, S);
      const data = cv.toDataURL('image/jpeg', 0.82);
      if(carnetActualizar(c => { c.foto = data; })) toast('Foto actualizada.', 'success');
    };
    img.onerror = () => toast('No se pudo leer la imagen.', 'danger');
    img.src = reader.result;
  };
  reader.readAsDataURL(file);
}
function imprimirCarnet(){ window.print(); }

function savePerfil(){
  const u = currentUser(); const db = loadDB();
  const user = db.users.find(x=>x.id===u.id);
  user.nombre = document.getElementById('pfNombre').value.trim() || user.nombre;
  user.telefono = document.getElementById('pfTelefono').value.trim();
  user.fechaNacimiento = document.getElementById('pfFecha').value;
  saveDB(db);
  sessionStorage.setItem('sp_flash', 'Perfil actualizado.');
  location.reload();
}
function shareProfile(via){
  const u = currentUser();
  const link = location.origin + location.pathname + '#perfil/' + u.id;
  if(via==='copy'){ navigator.clipboard?.writeText(link); toast('Enlace de perfil copiado.'); }
  if(via==='whatsapp'){ window.open('https://wa.me/?text=' + encodeURIComponent('Mira mi perfil en SportPoint: ' + link), '_blank'); }
}

/* -------- Mis inscripciones / historial / estadísticas (RF-013,018 matriz) -------- */
/* -------- Mis clubes (Deportista) -------- */
function renderMisClubes(content){
  const u = currentUser(); const db = loadDB();
  const mios = db.clubs.filter(c=>(c.miembros||[]).includes(u.id));
  const pendientes = db.clubs.filter(c=>(c.solicitudes||[]).includes(u.id));
  const fila = (icon, label, val) => `<div class="col-12 col-sm-6"><div class="small text-muted-sp"><i class="bi ${icon} me-1 text-green"></i>${label}</div><div>${val||'—'}</div></div>`;
  const card = c => {
    const rating = c.reviews && c.reviews.length ? (c.reviews.reduce((a,r)=>a+r.estrellas,0)/c.reviews.length).toFixed(1) : null;
    const admin = db.users.find(x=>x.id===c.adminId);
    return `<div class="col-12 col-xl-6"><div class="bg-card rounded-xl p-3 p-lg-4 h-100">
      <div class="d-flex justify-content-between align-items-start gap-2 mb-1">
        <h5 class="fw-bold mb-0">${c.nombre}</h5>${badgeEstado(c.estado)}
      </div>
      <p class="text-muted-sp small mb-3"><i class="bi bi-award me-1"></i>${c.disciplina} &nbsp;·&nbsp; <i class="bi bi-geo-alt me-1"></i>${c.comuna}${rating ? ` &nbsp;·&nbsp; <i class="bi bi-star-fill text-warning me-1"></i>${rating}` : ''}</p>
      <div class="row g-3 mb-3">
        ${fila('bi-pin-map','Dirección de sede', c.direccion)}
        ${fila('bi-clock','Horarios', c.horarios)}
        ${fila('bi-person-workspace','Entrenadores', (c.entrenadores||[]).join(', '))}
        ${fila('bi-cash-coin','Cuota mensual', fmtMoney(c.cuota))}
        ${fila('bi-people','Deportistas afiliados', (c.miembros||[]).length)}
        ${fila('bi-person-badge','Administrador', admin ? admin.nombre : '')}
      </div>
      <div class="d-flex flex-wrap gap-2">
        <a class="btn-sp-green btn-sm text-decoration-none" href="club.html?id=${c.id}"><i class="bi bi-eye me-1"></i>Ver ficha completa</a>
        <button class="btn-sp-outline btn-sm" onclick="openReviewModal('${c.id}')"><i class="bi bi-star me-1"></i>Calificar club</button>
      </div>
    </div></div>`;
  };
  content.innerHTML = viewHeader('bi-shield-check', 'Mis Clubes', 'Los clubes a los que perteneces y su información.') +
    (mios.length
      ? `<div class="row g-3 mb-4">${mios.map(card).join('')}</div>`
      : `<div class="bg-card rounded-xl p-4 mb-4 text-center">
           <i class="bi bi-shield fs-1 text-green d-block mb-2"></i>
           <p class="mb-3 text-muted-sp">Aún no perteneces a ningún club.</p>
           <a class="btn-sp-green text-decoration-none" href="clubes.html"><i class="bi bi-search me-1"></i>Explorar clubes</a>
         </div>`) +
    (pendientes.length ? `
      <h6 class="fw-bold mb-2"><i class="bi bi-hourglass-split text-green me-2"></i>Solicitudes enviadas</h6>
      <div class="table-responsive"><table class="table table-sp"><thead><tr><th>Club</th><th>Disciplina</th><th>Estado</th><th></th></tr></thead><tbody>
        ${pendientes.map(c=>`<tr><td><a class="text-white" href="club.html?id=${c.id}">${c.nombre}</a></td><td>${c.disciplina}</td><td>${badgeEstado('Pendiente')}</td><td class="text-end"><button class="btn btn-sm btn-sp-outline" onclick="cancelarSolicitudClub('${c.id}')">Cancelar</button></td></tr>`).join('')}
      </tbody></table></div>` : '');
}

function renderMisInscripciones(content){
  const u = currentUser(); const db = loadDB();
  const regs = db.registrations.filter(r=>r.athleteId===u.id);
  content.innerHTML = viewHeader('bi-clipboard-check', 'Mis Inscripciones') +
    (regs.length ? `<div class="table-responsive"><table class="table table-sp"><thead><tr><th>Torneo</th><th>Fecha</th><th>Estado</th></tr></thead><tbody>
      ${regs.map(r=>{ const t = db.tournaments.find(x=>x.id===r.tournamentId); return `<tr><td>${t?t.nombre:'—'}</td><td>${fmtDate(r.fecha)}</td><td>${badgeEstado(r.estado)}</td></tr>`; }).join('')}
    </tbody></table></div>` : '<p class="text-muted-sp">Aún no te has inscrito a ningún torneo.</p>');
}
function renderMiHistorial(content){
  const u = currentUser(); const db = loadDB();
  const torneosParticipados = db.tournaments.filter(t=> t.teams.some(tm=>tm.id===u.id));
  content.innerHTML = viewHeader('bi-clock-history', 'Historial de Torneos') +
    (torneosParticipados.length ? `<div class="table-responsive"><table class="table table-sp"><thead><tr><th>Torneo</th><th>Fecha</th><th>Resultado</th></tr></thead><tbody>
      ${torneosParticipados.map(t=>{
        const misPartidos = t.matches.filter(m=> m.local.id===u.id || m.visitante.id===u.id);
        const jugados = misPartidos.filter(m=>m.estado==='Jugado').length;
        return `<tr><td>${t.nombre}</td><td>${fmtDate(t.fechaInicio)}</td><td>${badgeEstado(t.estado)} — ${jugados} partido(s) jugado(s)</td></tr>`;
      }).join('')}
    </tbody></table></div>` : '<p class="text-muted-sp">Sin historial todavía.</p>');
}
function renderMisEstadisticas(content){
  const u = currentUser(); const db = loadDB();
  let pj=0,pg=0,pp=0;
  db.tournaments.forEach(t=> t.matches.forEach(m=>{
    if(m.estado!=='Jugado') return;
    if(m.local.id===u.id){ pj++; if(m.marcadorLocal>m.marcadorVisitante) pg++; else pp++; }
    if(m.visitante.id===u.id){ pj++; if(m.marcadorVisitante>m.marcadorLocal) pg++; else pp++; }
  }));
  content.innerHTML = viewHeader('bi-bar-chart', 'Mis Estadísticas') + `
    <div class="row g-3">
      <div class="col-md-4"><div class="kpi-card"><div class="kpi-num">${pj}</div><div class="kpi-label">Partidos jugados</div></div></div>
      <div class="col-md-4"><div class="kpi-card"><div class="kpi-num">${pg}</div><div class="kpi-label">Victorias</div></div></div>
      <div class="col-md-4"><div class="kpi-card"><div class="kpi-num">${pp}</div><div class="kpi-label">Derrotas</div></div></div>
    </div>`;
}

/* -------- Mi club (Admin Club) -------- */
function renderMiClub(content){
  const u = currentUser(); const db = loadDB();
  const clubes = db.clubs.filter(c=>c.adminId===u.id);
  content.innerHTML = viewHeader('bi-building', 'Ficha del Club', 'Registra y actualiza la información pública de tu club.') +
    `<button class="btn-sp-green mb-3" onclick="openClubForm()"><i class="bi bi-plus-lg me-1"></i>Registrar nuevo club</button>
    <div class="row g-3">` +
    clubes.map(c=>`
      <div class="col-md-6"><div class="bg-card rounded-xl p-3">
        <div class="d-flex justify-content-between align-items-start"><h6 class="fw-bold">${c.nombre}</h6>${badgeEstado(c.estado)}</div>
        <p class="small text-muted-sp mb-1">${c.disciplina} · ${c.comuna}</p>
        ${c.estado==='Rechazado' ? `<p class="small text-danger">Motivo: ${c.motivoRechazo}</p>` : ''}
        <div class="d-flex gap-2 mt-2">
          <button class="btn btn-sm btn-sp-outline" onclick="openClubForm('${c.id}')"><i class="bi bi-pencil"></i> Editar</button>
          <a class="btn btn-sm btn-sp-outline" href="club.html?id=${c.id}"><i class="bi bi-eye"></i> Ver ficha</a>
        </div>
      </div></div>`).join('') + `</div>` +
    (clubes.length===0 ? '<p class="text-muted-sp">Aún no tienes clubes registrados.</p>' : '');
}

/* -------- Plantilla de deportistas (RF-006 SRS) -------- */
function renderPlantilla(content){
  const u = currentUser(); const db = loadDB();
  const clubes = db.clubs.filter(c=>c.adminId===u.id && c.estado==='Aprobado');
  if(!clubes.length){ content.innerHTML = viewHeader('bi-people', 'Plantilla de Deportistas') + '<p class="text-muted-sp">Necesitas al menos un club aprobado para gestionar su plantilla.</p>'; return; }
  content.innerHTML = viewHeader('bi-people', 'Plantilla de Deportistas') +
    clubes.map(c=>`
      <div class="bg-card rounded-xl p-3 mb-3">
        <div class="d-flex justify-content-between align-items-center mb-2">
          <h6 class="fw-bold mb-0">${c.nombre}</h6>
          <button class="btn btn-sm btn-sp-green" onclick="vincularDeportista('${c.id}')"><i class="bi bi-person-plus"></i> Vincular deportista</button>
        </div>
        ${(c.solicitudes||[]).length ? `<div class="mb-3"><h6 class="small fw-bold text-green mb-2"><i class="bi bi-inbox me-1"></i>Solicitudes pendientes (${c.solicitudes.length})</h6>
          <table class="table table-sp mb-0"><thead><tr><th>Nombre</th><th>Correo</th><th></th></tr></thead><tbody>
          ${c.solicitudes.map(sid=>{ const at = db.users.find(x=>x.id===sid); return `<tr><td>${at?at.nombre:'—'}</td><td>${at?at.email:'—'}</td><td class="text-end text-nowrap"><button class="btn btn-sm btn-sp-green me-1" onclick="responderSolicitudClub('${c.id}','${sid}',true)">Aceptar</button><button class="btn btn-sm btn-sp-danger" onclick="responderSolicitudClub('${c.id}','${sid}',false)">Rechazar</button></td></tr>`; }).join('')}
          </tbody></table></div>` : ''}
        ${c.miembros.length ? `<table class="table table-sp mb-0"><thead><tr><th>Nombre</th><th>Correo</th><th></th></tr></thead><tbody>
          ${c.miembros.map(mid=>{ const at = db.users.find(x=>x.id===mid); return `<tr><td>${at?at.nombre:'—'}</td><td>${at?at.email:'—'}</td><td><button class="btn btn-sm btn-sp-danger" onclick="desvincularDeportista('${c.id}','${mid}')">Quitar</button></td></tr>`; }).join('')}
        </tbody></table>` : '<p class="small text-muted-sp mb-0">Sin deportistas vinculados.</p>'}
      </div>`).join('');
}

/* -------- Mis torneos (Organizador) -------- */
function renderMisTorneos(content){
  const u = currentUser(); const db = loadDB();
  const torneos = db.tournaments.filter(t=>t.organizadorId===u.id);
  content.innerHTML = viewHeader('bi-trophy', 'Mis Torneos') +
    `<button class="btn-sp-green mb-3" onclick="openTorneoForm()"><i class="bi bi-plus-lg me-1"></i>Crear torneo</button>
    <div class="row g-3">${torneos.map(torneoCardHTML).join('') || '<p class="text-muted-sp px-3">Aún no has creado torneos.</p>'}</div>`;
}

/* -------- Validación de clubes (RF-005 SRS) -------- */
function renderValidacionClubes(content){
  const db = loadDB();
  const pendientes = db.clubs.filter(c=>c.estado==='Pendiente');
  const otros = db.clubs.filter(c=>c.estado!=='Pendiente');
  content.innerHTML = viewHeader('bi-patch-check', 'Validación de Clubes', 'Aprueba o rechaza el registro de clubes con base en sus documentos.') +
    `<h6 class="fw-bold mb-2">Pendientes (${pendientes.length})</h6>` +
    (pendientes.length ? `<div class="table-responsive mb-4"><table class="table table-sp"><thead><tr><th>Club</th><th>Disciplina</th><th>Documentos</th><th></th></tr></thead><tbody>
      ${pendientes.map(c=>`<tr><td>${c.nombre}</td><td>${c.disciplina}</td><td>${c.documentos.length} archivo(s)</td>
        <td class="d-flex gap-2"><button class="btn btn-sm btn-sp-green" onclick="approveClub('${c.id}')"><i class="bi bi-check2"></i> Aprobar</button>
        <button class="btn btn-sm btn-sp-danger" onclick="openRejectClub('${c.id}')"><i class="bi bi-x"></i> Rechazar</button></td></tr>`).join('')}
    </tbody></table></div>` : '<p class="text-muted-sp mb-4">No hay clubes pendientes.</p>') +
    `<h6 class="fw-bold mb-2">Historial</h6>
    <div class="table-responsive"><table class="table table-sp"><thead><tr><th>Club</th><th>Estado</th></tr></thead><tbody>
      ${otros.map(c=>`<tr><td>${c.nombre}</td><td>${badgeEstado(c.estado)}</td></tr>`).join('')}
    </tbody></table></div>`;
}

/* -------- Usuarios y roles (RF-009 matriz) -------- */
function renderUsuariosView(content){
  const db = loadDB();
  content = content || document.getElementById('privateContent');
  content.innerHTML = viewHeader('bi-people-fill', 'Usuarios y Roles', 'Administra el rol asignado a cada usuario del sistema.') +
    `<div class="table-responsive"><table class="table table-sp"><thead><tr><th>Nombre</th><th>Correo</th><th>Rol</th><th></th></tr></thead><tbody>
      ${db.users.map(u=>`<tr><td>${u.nombre}</td><td>${u.email}</td><td>${badgeEstado('activo')} ${u.rol}</td>
        <td><button class="btn btn-sm btn-sp-outline" onclick="openRoleModal('${u.id}')"><i class="bi bi-pencil"></i> Cambiar rol</button></td></tr>`).join('')}
    </tbody></table></div>`;
}

/* -------- Noticias admin -------- */
function renderNoticiasAdmin(content){
  const db = loadDB();
  content.innerHTML = viewHeader('bi-newspaper', 'Noticias') +
    `<button class="btn-sp-green mb-3" onclick="openNoticiaForm()"><i class="bi bi-plus-lg me-1"></i>Publicar noticia</button>
    <div class="row g-3">${db.news.map(n=>`<div class="col-md-6"><div class="bg-card news-card rounded-xl p-3 h-100"><h6 class="fw-bold">${n.titulo}</h6><p class="small mb-0">${n.contenido}</p></div></div>`).join('')}</div>`;
}

/* -------- Mensajería interna (RF-016 matriz) -------- */
let msgCtx = null;
function openMessageModal(type, id){
  msgCtx = { type, id };
  const db = loadDB();
  let label = '';
  if(type==='torneo'){ const t = db.tournaments.find(x=>x.id===id); label = `Se enviará a los ${t.teams.length} inscrito(s) del torneo "${t.nombre}".`; }
  if(type==='club'){ const c = db.clubs.find(x=>x.id===id); label = `Se enviará a los ${c.miembros.length} miembro(s) del club "${c.nombre}".`; }
  document.getElementById('msgTargetLabel').textContent = label;
  document.getElementById('msgContenido').value = '';
  bootstrap.Modal.getOrCreateInstance(document.getElementById('messageModal')).show();
}
function sendMassMessage(){
  const contenido = document.getElementById('msgContenido').value.trim();
  if(!contenido){ toast('Escribe un mensaje.', 'danger'); return; }
  const db = loadDB();
  let destinatarios = [];
  if(msgCtx.type==='torneo'){ const t = db.tournaments.find(x=>x.id===msgCtx.id); destinatarios = t.teams.map(tm=>tm.id).filter(Boolean); }
  if(msgCtx.type==='club'){ const c = db.clubs.find(x=>x.id===msgCtx.id); destinatarios = c.miembros; }
  db.messages.push({ id: uid('msg'), ...msgCtx, contenido, fecha: nowISO(), destinatarios });
  destinatarios.forEach(uid_=> pushNotification(uid_, `📢 Mensaje: ${contenido}`));
  saveDB(db);
  toast(`Mensaje enviado a ${destinatarios.length} destinatario(s).`);
  bootstrap.Modal.getOrCreateInstance(document.getElementById('messageModal')).hide();
}
function renderMensajesView(content){
  const u = currentUser(); const db = loadDB();
  let items = [];
  if(u.rol==='Organizador') items = db.tournaments.filter(t=>t.organizadorId===u.id).map(t=>({label:t.nombre, type:'torneo', id:t.id}));
  if(u.rol==='Admin. Club') items = db.clubs.filter(c=>c.adminId===u.id).map(c=>({label:c.nombre, type:'club', id:c.id}));
  content.innerHTML = viewHeader('bi-chat-dots', 'Mensajería Interna', 'Envía mensajes masivos a tus inscritos o miembros.') +
    (items.length ? items.map(it=>`<div class="bg-card rounded-xl p-3 mb-2 d-flex justify-content-between align-items-center">
      <span>${it.label}</span><button class="btn btn-sm btn-sp-outline" onclick="openMessageModal('${it.type}','${it.id}')"><i class="bi bi-megaphone"></i> Enviar mensaje</button></div>`).join('')
      : '<p class="text-muted-sp">No tienes torneos/clubes activos para enviar mensajes.</p>');
}

/* -------- Reportes (RF-015 SRS/matriz) -------- */
function renderReportesView(content){
  content.innerHTML = viewHeader('bi-file-earmark-bar-graph', 'Reportes', 'Genera y descarga reportes en PDF o Excel.') +
    `<button class="btn-sp-green" data-bs-toggle="modal" data-bs-target="#reportModal"><i class="bi bi-plus-lg me-1"></i>Generar reporte</button>`;
}
function generateReport(format){
  const tipo = document.getElementById('repTipo').value;
  const desde = document.getElementById('repDesde').value;
  const hasta = document.getElementById('repHasta').value;
  const db = loadDB();
  let rows = [];
  if(tipo==='clubes') rows = db.clubs.map(c=>({Nombre:c.nombre, Disciplina:c.disciplina, Comuna:c.comuna, Estado:c.estado, Miembros:c.miembros.length}));
  if(tipo==='torneos') rows = db.tournaments.map(t=>({Nombre:t.nombre, Disciplina:t.disciplina, Estado:t.estado, Inscritos:t.cuposOcupados, Cupo:t.cupo}));
  if(tipo==='inscripciones') rows = db.registrations.map(r=>{ const t=db.tournaments.find(x=>x.id===r.tournamentId); const a=db.users.find(x=>x.id===r.athleteId); return {Torneo:t?t.nombre:'—', Deportista:a?a.nombre:'—', Fecha:fmtDate(r.fecha), Estado:r.estado}; });

  if(!rows.length){ toast('No hay datos para el reporte seleccionado.', 'danger'); return; }

  if(format==='excel'){
    const headers = Object.keys(rows[0]);
    const csv = [headers.join(',')].concat(rows.map(r=>headers.map(h=>`"${String(r[h]).replace(/"/g,'""')}"`).join(','))).join('\n');
    downloadBlob(csv, `reporte_${tipo}.csv`, 'text/csv;charset=utf-8;');
  } else {
    const win = window.open('', '_blank');
    const headers = Object.keys(rows[0]);
    win.document.write(`<html><head><title>Reporte ${tipo}</title>
      <style>body{font-family:Arial;padding:24px;color:#111} h1{color:#1db954} table{width:100%;border-collapse:collapse;margin-top:16px} th,td{border:1px solid #ccc;padding:6px 8px;font-size:13px;text-align:left} th{background:#f0f0f0}</style>
      </head><body><h1>SportPoint — Reporte de ${tipo}</h1><p>Rango: ${desde||'—'} a ${hasta||'—'} · Generado: ${new Date().toLocaleString('es-CO')}</p>
      <table><thead><tr>${headers.map(h=>`<th>${h}</th>`).join('')}</tr></thead><tbody>
      ${rows.map(r=>`<tr>${headers.map(h=>`<td>${r[h]}</td>`).join('')}</tr>`).join('')}
      </tbody></table></body></html>`);
    win.document.close();
    setTimeout(()=>win.print(), 400);
  }
  toast(`Reporte de ${tipo} generado en formato ${format.toUpperCase()}.`);
  db.reports.push({ id: uid('rep'), tipo, format, fecha: nowISO() });
  saveDB(db);
}
function downloadBlob(content, filename, type){
  const blob = new Blob([content], {type});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

/* ---------- Footer global (se inyecta en todas las páginas) ---------- */
function renderFooter(){
  if(document.getElementById('spFooter')) return;
  const f = document.createElement('footer');
  f.id = 'spFooter';
  f.className = 'sp-footer';
  f.innerHTML = `
    <svg class="sp-footer-wave" viewBox="0 0 1440 60" preserveAspectRatio="none" aria-hidden="true">
      <path class="fill" d="M0,38 C150,66 330,6 560,22 C780,38 900,64 1100,38 C1250,18 1360,6 1440,28 L1440,60 L0,60 Z"/>
      <path class="line" d="M0,38 C150,66 330,6 560,22 C780,38 900,64 1100,38 C1250,18 1360,6 1440,28"/>
    </svg>
    <div class="sp-footer-body">
      <div class="container-fluid px-4">
        <div class="d-flex flex-wrap align-items-center justify-content-between gap-3">
          <div class="sp-footer-brand">Sport<span>Point</span></div>
          <div class="sp-footer-msg d-flex flex-wrap align-items-center gap-2">
            <span>Una plataforma <b>en camino con el INDER</b></span>
            <a class="sp-footer-btn" href="https://www.inder.gov.co" target="_blank" rel="noopener noreferrer">inder.gov.co <i class="bi bi-box-arrow-up-right ms-1"></i></a>
          </div>
          <div class="sp-footer-links d-flex gap-3">
            <a href="clubes.html">Clubes</a>
            <a href="torneos.html">Torneos</a>
            <a href="noticias.html">Noticias</a>
          </div>
        </div>
        <div class="sp-footer-copy text-center mt-3">© ${new Date().getFullYear()} SportPoint · Medellín, Colombia · Prototipo académico</div>
      </div>
    </div>`;
  const anchor = document.getElementById('toastArea');
  if(anchor && anchor.parentNode === document.body) document.body.insertBefore(f, anchor);
  else document.body.appendChild(f);
}
document.addEventListener('DOMContentLoaded', renderFooter);
