const path = require('path');
const express = require('express');

const { simulerEcartPension } = require('./server/simulate');
const { simulerDeces } = require('./server/simulate_deces');
const { simulerIncapacite } = require('./server/simulate_incapacite');
const { simulerSante } = require('./server/simulate_sante');
const leadsRouter = require('./server/leads');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.post('/api/simulate', (req, res) => {
  try {
    const result = simulerEcartPension(req.body || {});
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.post('/api/simulate-deces', (req, res) => {
  try {
    const result = simulerDeces(req.body || {});
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.post('/api/simulate-incapacite', (req, res) => {
  try {
    const result = simulerIncapacite(req.body || {});
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.post('/api/simulate-sante', (req, res) => {
  try {
    const result = simulerSante(req.body || {});
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.use('/api/leads', leadsRouter);

// express.static a deja servi le PDF s'il est present : on n'arrive ici que s'il
// manque. Un prospect qui vient de remplir le formulaire merite mieux qu'un 404.
app.get('/downloads/kit-serenite-transmission.pdf', (req, res) => {
  res.status(503).type('html').send(
    `<p style="font-family:sans-serif;max-width:40em;margin:3em auto;line-height:1.6">
       Le Kit n'est pas encore disponible au téléchargement — tes coordonnées sont bien
       enregistrées et il te sera envoyé par email très vite.
       <br><a href="/kit.html">Retour</a>
     </p>`
  );
});

app.get('/health', (req, res) => res.json({ ok: true }));

app.listen(PORT, () => {
  console.log(`leadcommercial en ecoute sur http://localhost:${PORT}`);
});
