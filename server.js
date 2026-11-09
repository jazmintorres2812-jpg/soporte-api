require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');

const app = express();
app.use(cors());
app.use(express.json());

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

const PRIORIDADES = ['Baja', 'Media', 'Alta', 'Urgente'];

// Protege solo las rutas de escritura con una API key simple
function requireKey(req, res, next) {
  if (process.env.API_KEY && req.get('x-api-key') !== process.env.API_KEY) {
    return res.status(401).json({ error: 'API key inválida' });
  }
  next();
}

app.get('/', (_req, res) => res.json({ servicio: 'API de soporte técnico', estado: 'ok' }));

app.get('/health', async (_req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ estado: 'ok', db: 'conectada' });
  } catch (e) {
    res.status(500).json({ estado: 'error', db: e.message });
  }
});

// Registrar solicitud (el folio lo genera la base de datos)
app.post('/solicitudes', requireKey, async (req, res) => {
  const { nombre, correo, categoria, prioridad, descripcion } = req.body;
  if (!nombre || !correo || !categoria || !prioridad || !descripcion) {
    return res.status(400).json({ error: 'Faltan campos obligatorios' });
  }
  if (!PRIORIDADES.includes(prioridad)) {
    return res.status(400).json({ error: `prioridad debe ser una de: ${PRIORIDADES.join(', ')}` });
  }
  try {
    const { rows } = await pool.query(
      `INSERT INTO solicitudes (nombre, correo, categoria, prioridad, descripcion)
       VALUES ($1,$2,$3,$4,$5) RETURNING *`,
      [nombre, correo, categoria, prioridad, descripcion]
    );
    res.status(201).json(rows[0]);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Consultar todas (filtros opcionales: ?categoria=&prioridad=&estado=)
app.get('/solicitudes', async (req, res) => {
  const filtros = [];
  const valores = [];
  for (const campo of ['categoria', 'prioridad', 'estado']) {
    if (req.query[campo]) {
      valores.push(req.query[campo]);
      filtros.push(`${campo} = $${valores.length}`);
    }
  }
  const where = filtros.length ? `WHERE ${filtros.join(' AND ')}` : '';
  try {
    const { rows } = await pool.query(
      `SELECT * FROM solicitudes ${where} ORDER BY created_at DESC`, valores);
    res.json({ total: rows.length, solicitudes: rows });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Consultar por folio
app.get('/solicitudes/:folio', async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM solicitudes WHERE folio = $1', [req.params.folio]);
    if (!rows.length) return res.status(404).json({ error: 'Folio no encontrado' });
    res.json(rows[0]);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`API escuchando en puerto ${port}`));
