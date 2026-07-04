const express = require('express');
const fs = require('fs');
const path = require('path');
const { nanoid } = require('nanoid');

const cors = require('cors');
const app = express();
app.use(cors());
app.use(express.json());

const DB_FILE = path.join(__dirname, 'links.json');

// --- Helpers de base de datos (archivo JSON) ---
function readDB() {
  if (!fs.existsSync(DB_FILE)) fs.writeFileSync(DB_FILE, JSON.stringify({}));
  return JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
}

function writeDB(data) {
  fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
}

// --- Middleware: API Key simple ---
const API_KEY = process.env.API_KEY || 'tacos-12345';

function auth(req, res, next) {
  const key = req.headers['x-api-key'];
  if (key !== API_KEY) return res.status(401).json({ error: 'No autorizado' });
  next();
}

// ─────────────────────────────────────────
// RUTAS PÚBLICAS
// ─────────────────────────────────────────

// Redirigir y contar click
app.get('/r/:id', (req, res) => {
  const db = readDB();
  const link = db[req.params.id];

  if (!link) return res.status(404).send('Link no encontrado');

  // Incrementar contador
  link.clicks += 1;
  link.ultimo_click = new Date().toISOString();
  writeDB(db);

  res.redirect(link.url);
});

// ─────────────────────────────────────────
// RUTAS DE ADMINISTRACIÓN (requieren API Key)
// ─────────────────────────────────────────

// Crear un link
app.post('/links', auth, (req, res) => {
  const { url, nombre } = req.body;
  if (!url) return res.status(400).json({ error: 'url es requerido' });

  const db = readDB();
  const id = nanoid(8);

  db[id] = {
    id,
    nombre: nombre || url,
    url,
    clicks: 0,
    creado_at: new Date().toISOString(),
    ultimo_click: null,
  };

  writeDB(db);

  const baseUrl = process.env.BASE_URL || `http://localhost:${PORT}`;
  res.json({ ...db[id], link_corto: `${baseUrl}/r/${id}` });
});

// Ver todos los links con sus clicks
app.get('/links', auth, (req, res) => {
  const db = readDB();
  const links = Object.values(db).sort((a, b) => b.clicks - a.clicks);
  res.json({ total_links: links.length, links });
});

// Ver un link específico
app.get('/links/:id', auth, (req, res) => {
  const db = readDB();
  const link = db[req.params.id];
  if (!link) return res.status(404).json({ error: 'Link no encontrado' });
  res.json(link);
});

// Eliminar un link
app.delete('/links/:id', auth, (req, res) => {
  const db = readDB();
  if (!db[req.params.id]) return res.status(404).json({ error: 'Link no encontrado' });
  delete db[req.params.id];
  writeDB(db);
  res.json({ mensaje: 'Link eliminado' });
});

// ─────────────────────────────────────────
// Panel web
app.get('/panel', (req, res) => {
  res.send(`<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Link Tracker</title>
<style>
* { box-sizing: border-box; margin: 0; padding: 0; }
body { font-family: -apple-system, sans-serif; background: #f5f5f5; color: #1a1a1a; }
.container { max-width: 800px; margin: 0 auto; padding: 2rem 1rem; }
h1 { font-size: 22px; font-weight: 600; margin-bottom: 0.25rem; }
.sub { color: #888; font-size: 14px; margin-bottom: 2rem; }
.card { background: white; border-radius: 12px; border: 1px solid #e5e5e5; padding: 1.25rem; margin-bottom: 1rem; }
.card h2 { font-size: 15px; font-weight: 500; margin-bottom: 1rem; color: #444; }
.row { display: flex; gap: 8px; flex-wrap: wrap; }
.field { flex: 1; min-width: 140px; }
label { display: block; font-size: 12px; color: #888; margin-bottom: 4px; }
input { width: 100%; padding: 8px 10px; border: 1px solid #ddd; border-radius: 8px; font-size: 14px; outline: none; }
input:focus { border-color: #2563eb; }
button { padding: 8px 16px; border-radius: 8px; font-size: 14px; cursor: pointer; border: none; white-space: nowrap; }
.btn-primary { background: #2563eb; color: white; }
.btn-primary:hover { background: #1d4ed8; }
.btn-danger { background: transparent; color: #dc2626; border: 1px solid #dc2626; }
.btn-danger:hover { background: #fef2f2; }
.btn-copy { background: transparent; color: #2563eb; border: 1px solid #2563eb; }
.btn-copy:hover { background: #eff6ff; }
.btn-sm { padding: 5px 10px; font-size: 12px; }
.stats { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-bottom: 1rem; }
.stat { background: white; border-radius: 10px; border: 1px solid #e5e5e5; padding: 1rem; }
.stat-label { font-size: 12px; color: #888; margin-bottom: 4px; }
.stat-value { font-size: 24px; font-weight: 600; }
.link-item { background: white; border-radius: 12px; border: 1px solid #e5e5e5; padding: 1.25rem; margin-bottom: 8px; }
.link-top { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 6px; }
.link-name { font-size: 16px; font-weight: 500; }
.link-clicks { font-size: 28px; font-weight: 600; color: #2563eb; text-align: right; line-height: 1; }
.link-clicks-label { font-size: 11px; color: #888; text-align: right; }
.link-url { font-size: 12px; color: #888; margin-bottom: 4px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.link-short { font-size: 12px; color: #2563eb; font-family: monospace; margin-bottom: 10px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.link-footer { display: flex; justify-content: space-between; align-items: center; }
.link-date { font-size: 11px; color: #aaa; }
.link-actions { display: flex; gap: 6px; }
.msg { padding: 10px 14px; border-radius: 8px; font-size: 13px; margin-bottom: 1rem; }
.msg-success { background: #f0fdf4; color: #166534; }
.msg-error { background: #fef2f2; color: #dc2626; }
.empty { text-align: center; padding: 2rem; color: #aaa; font-size: 14px; }
#login { max-width: 400px; margin: 4rem auto; }
</style>
</head>
<body>
<div id="login" class="card">
  <h2>Acceder al panel</h2>
  <div style="margin-top:1rem;">
    <div class="field" style="margin-bottom:8px;">
      <label>API Key</label>
      <input type="password" id="key-input" placeholder="tu-api-key" onkeydown="if(event.key==='Enter') login()" />
    </div>
    <button class="btn-primary" onclick="login()" style="width:100%; margin-top:4px;">Entrar</button>
    <div id="login-error" style="color:#dc2626; font-size:13px; margin-top:8px;"></div>
  </div>
</div>

<div id="app" style="display:none;">
<div class="container">
  <h1>Link Tracker</h1>
  <div class="sub">Seguimiento de clicks en tus links</div>
  <div id="msg-area"></div>
  <div class="stats">
    <div class="stat"><div class="stat-label">Links activos</div><div class="stat-value" id="stat-links">—</div></div>
    <div class="stat"><div class="stat-label">Clicks totales</div><div class="stat-value" id="stat-clicks">—</div></div>
    <div class="stat"><div class="stat-label">Más clickeado</div><div class="stat-value" id="stat-top" style="font-size:14px; padding-top:6px;">—</div></div>
  </div>
  <div class="card">
    <h2>Agregar link</h2>
    <div class="row">
      <div class="field" style="flex:2;">
        <label>URL destino</label>
        <input type="text" id="new-url" placeholder="https://tusitioweb.com/landing" />
      </div>
      <div class="field">
        <label>Nombre / tema</label>
        <input type="text" id="new-name" placeholder="Campaña verano" onkeydown="if(event.key==='Enter') addLink()" />
      </div>
      <button class="btn-primary" onclick="addLink()" style="align-self:flex-end;">Agregar</button>
    </div>
  </div>
  <div id="links-list"></div>
</div>
</div>

<script>
let API_KEY = '';
const BASE = window.location.origin;

function login() {
  const k = document.getElementById('key-input').value.trim();
  if (!k) return;
  fetch(BASE + '/links', { headers: { 'x-api-key': k } })
    .then(r => {
      if (r.status === 401) { document.getElementById('login-error').textContent = 'API Key incorrecta'; return; }
      return r.json().then(data => {
        API_KEY = k;
        document.getElementById('login').style.display = 'none';
        document.getElementById('app').style.display = 'block';
        renderLinks(data.links || []);
      });
    }).catch(() => { document.getElementById('login-error').textContent = 'Error de conexión'; });
}

function showMsg(text, type) {
  const a = document.getElementById('msg-area');
  a.innerHTML = '<div class="msg msg-' + type + '">' + text + '</div>';
  setTimeout(() => a.innerHTML = '', 4000);
}

function loadLinks() {
  fetch(BASE + '/links', { headers: { 'x-api-key': API_KEY } })
    .then(r => r.json()).then(d => renderLinks(d.links || []));
}

function renderLinks(links) {
  document.getElementById('stat-links').textContent = links.length;
  document.getElementById('stat-clicks').textContent = links.reduce((s,l) => s + l.clicks, 0);
  const top = links.length ? links.reduce((a,b) => a.clicks > b.clicks ? a : b) : null;
  document.getElementById('stat-top').textContent = top ? top.nombre + ' (' + top.clicks + ')' : '—';
  const c = document.getElementById('links-list');
  if (!links.length) { c.innerHTML = '<div class="empty">No tienes links aún.</div>'; return; }
  c.innerHTML = links.map(l => {
    const short = BASE + '/r/' + l.id;
    const date = new Date(l.creado_at).toLocaleDateString('es-MX', {day:'numeric',month:'short',year:'numeric'});
    return '<div class="link-item"><div class="link-top"><div><div class="link-name">' + l.nombre + '</div></div><div><div class="link-clicks">' + l.clicks + '</div><div class="link-clicks-label">clicks</div></div></div><div class="link-url">→ ' + l.url + '</div><div class="link-short">' + short + '</div><div class="link-footer"><div class="link-date">Creado: ' + date + '</div><div class="link-actions"><button class="btn-copy btn-sm" onclick="copyLink(\'' + short + '\')">Copiar</button><button class="btn-danger btn-sm" onclick="deleteLink(\'' + l.id + '\',\'' + l.nombre + '\')">Eliminar</button></div></div></div>';
  }).join('');
}

function addLink() {
  const url = document.getElementById('new-url').value.trim();
  const nombre = document.getElementById('new-name').value.trim();
  if (!url) { showMsg('Ingresa una URL', 'error'); return; }
  fetch(BASE + '/links', { method:'POST', headers:{'Content-Type':'application/json','x-api-key':API_KEY}, body: JSON.stringify({url, nombre: nombre||url}) })
    .then(r => r.json()).then(() => { document.getElementById('new-url').value=''; document.getElementById('new-name').value=''; showMsg('Link creado', 'success'); loadLinks(); });
}

function deleteLink(id, nombre) {
  if const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✅ Link Tracker corriendo en http://localhost:${PORT}`);
  console.log(`🔑 API Key: ${API_KEY}`);
});
