const express = require('express');
const fs = require('fs');
const path = require('path');
const { nanoid } = require('nanoid');
const cors = require('cors');
const app = express();
app.use(cors());
app.use(express.json());

const DB_FILE = path.join(__dirname, 'links.json');

function readDB() {
  if (!fs.existsSync(DB_FILE)) fs.writeFileSync(DB_FILE, JSON.stringify({}));
  return JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
}

function writeDB(data) {
  fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
}

const API_KEY = process.env.API_KEY || 'tacos-12345';

function auth(req, res, next) {
  const key = req.headers['x-api-key'];
  if (key !== API_KEY) return res.status(401).json({ error: 'No autorizado' });
  next();
}

app.get('/r/:id', (req, res) => {
  const db = readDB();
  const link = db[req.params.id];
  if (!link) return res.status(404).send('Link no encontrado');
  link.clicks += 1;
  link.ultimo_click = new Date().toISOString();
  writeDB(db);
  res.redirect(link.url);
});

app.post('/links', auth, (req, res) => {
  const { url, nombre } = req.body;
  if (!url) return res.status(400).json({ error: 'url es requerido' });
  const db = readDB();
  const id = nanoid(8);
  db[id] = { id, nombre: nombre || url, url, clicks: 0, creado_at: new Date().toISOString(), ultimo_click: null };
  writeDB(db);
  const baseUrl = process.env.BASE_URL || 'http://localhost:3000';
  res.json({ ...db[id], link_corto: baseUrl + '/r/' + id });
});

app.get('/links', auth, (req, res) => {
  const db = readDB();
  const links = Object.values(db).sort((a, b) => b.clicks - a.clicks);
  res.json({ total_links: links.length, links });
});

app.get('/links/:id', auth, (req, res) => {
  const db = readDB();
  const link = db[req.params.id];
  if (!link) return res.status(404).json({ error: 'Link no encontrado' });
  res.json(link);
});

app.delete('/links/:id', auth, (req, res) => {
  const db = readDB();
  if (!db[req.params.id]) return res.status(404).json({ error: 'Link no encontrado' });
  delete db[req.params.id];
  writeDB(db);
  res.json({ mensaje: 'Link eliminado' });
});

app.get('/panel', (req, res) => {
  const html = fs.readFileSync(path.join(__dirname, 'panel.html'), 'utf8');
  res.send(html);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log('Link Tracker corriendo en puerto ' + PORT);
  console.log('API Key: ' + API_KEY);
});
