require('dotenv').config();
const express = require('express');
const cors    = require('cors');

const searchRouter     = require('./routes/search');
const ordersRouter     = require('./routes/orders');
const pharmaciesRouter = require('./routes/pharmacies');

const app  = express();
const PORT = process.env.PORT || 3001;

// ── Middleware ────────────────────────────────────────────
app.use(cors({
  origin: ['http://localhost:5173', 'http://127.0.0.1:5173'],
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  credentials: true,
}));
app.use(express.json());

// ── Routes ────────────────────────────────────────────────
app.use('/api/search',     searchRouter);
// attach the logged-in user to new orders (guests still work)
const jwt = require('jsonwebtoken');
const pool = require('./db/pool');
app.post('/api/orders', (req, res, next) => {
  let uid = null;
  try { const h = req.headers.authorization || ''; if (h.startsWith('Bearer ')) uid = jwt.verify(h.slice(7), process.env.JWT_SECRET).id; } catch {}
  if (!uid) return next();
  const send = res.json.bind(res);
  res.json = body => {
    if (res.statusCode < 300 && body && body.id) pool.query('UPDATE orders SET user_id=$1 WHERE id=$2', [uid, body.id]).catch(console.error).finally(() => send(body));
    else send(body);
    return res;
  };
  next();
});
app.use('/api/orders',     ordersRouter);
app.use('/api/pharmacies', pharmaciesRouter);
app.use('/api/catalog', require('./routes/catalog'));
app.use('/api/auth', require('./routes/auth'));
app.use('/api/me', require('./routes/me'));
app.use('/api/owner', require('./routes/owner'));

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

// ── 404 ───────────────────────────────────────────────────
app.use((_req, res) => res.status(404).json({ error: 'Not found.' }));

// ── Start ─────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`\n🚀  Medlify API running on http://localhost:${PORT}`);
  console.log(`    Health: http://localhost:${PORT}/api/health\n`);
});
