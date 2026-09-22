const express = require('express');
const db = require('./db');

const router = express.Router();

const PILIERS = [
  'ECART', 'KIT', 'BILAN',
  'EPARGNE', 'PLAN', 'ENFANT', 'SANTE', 'OBSEQUES', 'INCAPACITE',
];

// Cle Web3Forms pour notifier chaque nouveau lead par email -- a definir via la
// variable d'environnement WEB3FORMS_KEY (voir README). Sans elle, les leads sont
// toujours enregistres en base et visibles sur /admin.html, juste sans email.
const WEB3FORMS_KEY = process.env.WEB3FORMS_KEY || '';

async function notifyLead(row) {
  if (!WEB3FORMS_KEY) {
    console.warn('WEB3FORMS_KEY absente : lead enregistre en base, mais aucun email envoye.');
    return;
  }
  try {
    const response = await fetch('https://api.web3forms.com/submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({
        access_key: WEB3FORMS_KEY,
        subject: `Nouveau lead — ${row.pilier}`,
        from_name: 'Mon Écart Pension',
        Pilier: row.pilier,
        Nom: row.nom || '(non renseigné)',
        Email: row.email || '(non renseigné)',
        Téléphone: row.telephone || '(non renseigné)',
        Source: row.source || '(non renseignée)',
        Notes: row.notes || '(aucune)',
      }),
    });
    const result = await response.json().catch(() => ({}));
    if (!result.success) {
      console.error(
        'Web3Forms a refuse la notification (lead deja enregistre en base) :',
        result.message || `HTTP ${response.status}`
      );
    }
  } catch (err) {
    console.error('Notification Web3Forms echouee (lead deja enregistre en base) :', err.message);
  }
}

const insertLead = db.prepare(`
  INSERT INTO leads (pilier, nom, email, telephone, profil, age, revenu_mensuel, annees_activite, ecart_estime, pension_estimee, source, notes)
  VALUES (@pilier, @nom, @email, @telephone, @profil, @age, @revenu_mensuel, @annees_activite, @ecart_estime, @pension_estimee, @source, @notes)
`);

router.post('/', (req, res) => {
  const body = req.body || {};
  const pilier = String(body.pilier || '').toUpperCase();
  if (!PILIERS.includes(pilier)) {
    return res.status(400).json({ error: `pilier doit etre l'un de : ${PILIERS.join(', ')}` });
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
  notifyLead(row);
  res.status(201).json({ id: result.lastInsertRowid, ...row });
});

function requireAdmin(req, res, next) {
  const expected = process.env.ADMIN_TOKEN;
  // Pas de valeur par defaut : sans ADMIN_TOKEN defini, l'admin reste ferme
  // plutot que protege par un mot de passe devinable.
  if (!expected || expected === 'change-moi') {
    return res.status(503).json({
      error: "L'administration est desactivee : definis ADMIN_TOKEN dans .env avec une valeur propre, puis redemarre le serveur.",
    });
  }
  const token = req.query.token || req.headers['x-admin-token'];
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
