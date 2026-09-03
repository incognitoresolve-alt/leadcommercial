const express = require('express');
const db = require('./db');

const router = express.Router();

const insertLead = db.prepare(`
  INSERT INTO leads (pilier, nom, email, telephone, profil, age, revenu_mensuel, annees_activite, ecart_estime, pension_estimee, source, notes)
  VALUES (@pilier, @nom, @email, @telephone, @profil, @age, @revenu_mensuel, @annees_activite, @ecart_estime, @pension_estimee, @source, @notes)
`);

router.post('/', (req, res) => {
  const body = req.body || {};
  const pilier = String(body.pilier || '').toUpperCase();
  if (!['ECART', 'KIT'].includes(pilier)) {
    return res.status(400).json({ error: "pilier doit etre 'ECART' ou 'KIT'" });
  }
  if (!body.email && !body.telephone) {
    return res.status(400).json({ error: 'email ou telephone requis pour recontacter le lead' });
  }

  const row = {
    pilier,
    nom: body.nom || null,
    email: body.email || null,
    telephone: body.telephone || null,
    profil: body.profil || null,
    age: body.age != null ? Number(body.age) : null,
    revenu_mensuel: body.revenuMensuel != null ? Number(body.revenuMensuel) : null,
    annees_activite: body.anneesActivite != null ? Number(body.anneesActivite) : null,
    ecart_estime: body.ecartEstime != null ? Number(body.ecartEstime) : null,
    pension_estimee: body.pensionEstimee != null ? Number(body.pensionEstimee) : null,
    source: body.source || null,
    notes: body.notes || null,
  };

  const result = insertLead.run(row);
  res.status(201).json({ id: result.lastInsertRowid, ...row });
});

function requireAdmin(req, res, next) {
  const token = req.query.token || req.headers['x-admin-token'];
  const expected = process.env.ADMIN_TOKEN || 'changeme';
  if (token !== expected) {
    return res.status(401).json({ error: 'Token admin invalide. Passe ?token=... ou header X-Admin-Token.' });
  }
  next();
}

router.get('/', requireAdmin, (req, res) => {
  const rows = db.prepare('SELECT * FROM leads ORDER BY id DESC').all();
  res.json(rows);
});

router.get('/export.csv', requireAdmin, (req, res) => {
  const rows = db.prepare('SELECT * FROM leads ORDER BY id DESC').all();
  const cols = [
    'id', 'created_at', 'pilier', 'nom', 'email', 'telephone', 'profil', 'age',
    'revenu_mensuel', 'annees_activite', 'ecart_estime', 'pension_estimee', 'source', 'notes', 'statut',
  ];
  const escape = (v) => {
    if (v === null || v === undefined) return '';
    const s = String(v).replace(/"/g, '""');
    return /[",\n]/.test(s) ? `"${s}"` : s;
  };
  const lines = [cols.join(',')];
  for (const row of rows) {
    lines.push(cols.map((c) => escape(row[c])).join(','));
  }
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename="leads.csv"');
  res.send(lines.join('\n'));
});

router.patch('/:id', requireAdmin, (req, res) => {
  const id = Number(req.params.id);
  const allowed = ['statut', 'notes'];
  const updates = [];
  const params = { id };
  for (const key of allowed) {
    if (req.body[key] !== undefined) {
      updates.push(`${key} = @${key}`);
      params[key] = req.body[key];
    }
  }
  if (!updates.length) return res.status(400).json({ error: 'Rien a mettre a jour.' });
  db.prepare(`UPDATE leads SET ${updates.join(', ')} WHERE id = @id`).run(params);
  const row = db.prepare('SELECT * FROM leads WHERE id = ?').get(id);
  res.json(row);
});

module.exports = router;
