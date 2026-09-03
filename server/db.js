const path = require('path');
const fs = require('fs');
const Database = require('better-sqlite3');

const DATA_DIR = path.join(__dirname, '..', 'data');
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

const db = new Database(path.join(DATA_DIR, 'leads.db'));
db.pragma('journal_mode = WAL');

db.exec(`
  CREATE TABLE IF NOT EXISTS leads (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    pilier TEXT NOT NULL,               -- 'ECART' ou 'KIT'
    nom TEXT,
    email TEXT,
    telephone TEXT,
    profil TEXT,                        -- ex: independant, sante
    age INTEGER,
    revenu_mensuel REAL,
    annees_activite INTEGER,
    ecart_estime REAL,
    pension_estimee REAL,
    source TEXT,                        -- ex: video-1, landing, manuel
    notes TEXT,
    statut TEXT NOT NULL DEFAULT 'nouveau' -- nouveau, contacte, qualifie, client, perdu
  );
`);

module.exports = db;
