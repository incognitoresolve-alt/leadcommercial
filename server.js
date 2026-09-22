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

app.get('/health', (req, res) => res.json({ ok: true }));

app.listen(PORT, () => {
  console.log(`leadcommercial en ecoute sur http://localhost:${PORT}`);
});
