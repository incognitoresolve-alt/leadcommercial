const path = require('path');
const express = require('express');

const { simulerEcartPension } = require('./server/simulate');
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

app.use('/api/leads', leadsRouter);

app.get('/health', (req, res) => res.json({ ok: true }));

app.listen(PORT, () => {
  console.log(`leadcommercial en ecoute sur http://localhost:${PORT}`);
});
