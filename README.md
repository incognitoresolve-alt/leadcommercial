# leadcommercial — Mon Écart Pension

Outil de génération de leads pour un funnel indépendants/professions de santé (pension) et transmission de patrimoine (Kit Sérénité & Transmission).

## Ce que contient l'outil

- **Simulateur "Mon Écart Pension"** (`/`) : calcule un écart pension indicatif à partir de l'âge, du revenu net mensuel et des années d'activité déjà prestées, puis capture le lead (DM "ÉCART" équivalent web).
- **Page Kit Sérénité & Transmission** (`/kit.html`) : capture de lead pour le guide 58 pages (DM "KIT" équivalent web).
- **Page Vidéos** (`/videos.html`) : les vidéos verticales générées à partir des scripts, prévisualisables et téléchargeables.
- **Admin leads** (`/admin.html`) : liste des leads capturés (protégée par `ADMIN_TOKEN`) + export CSV.

## Lancer le projet

```bash
npm install
ADMIN_TOKEN=change-moi npm start
```

Le serveur écoute sur `http://localhost:3000`. Les leads sont stockés dans `data/leads.db` (SQLite, créé automatiquement, non versionné).

## API

- `POST /api/simulate` — `{ age, revenuMensuel, anneesActivite, profil }` → `{ pensionEstimee, ecartEstime, ... }`
- `POST /api/leads` — `{ pilier: 'ECART'|'KIT', nom, email, telephone, ... }`
- `GET /api/leads?token=...` — liste des leads (JSON)
- `GET /api/leads/export.csv?token=...` — export CSV
- `PATCH /api/leads/:id?token=...` — mise à jour `statut` / `notes`

## Générer les vidéos

Les 3 vidéos (`public/downloads/*.mp4`) sont générées à partir de `scripts/video_data.json` (texte issu du document `Scripts_Videos_Pretes_A_Publier.md`) :

```bash
apt-get install -y ffmpeg espeak-ng mbrola mbrola-fr4   # dépendances système
pip install pillow
python3 scripts/generate_videos.py
```

Pipeline par ligne du script : synthèse vocale FR (espeak-ng + voix mbrola `mb-fr4`), image de fond générée (PIL) avec le texte à l'écran synchronisé, puis assemblage ffmpeg en un MP4 vertical 1080×1920. Les fichiers `.mp4` ne sont pas versionnés (voir `.gitignore`) — relancer le script après clonage, ou récupérer les fichiers livrés séparément.

**Important** : la voix off est générée par synthèse vocale (robotique), pas une voix humaine enregistrée. Pour un rendu plus naturel, remplace la voix off par un enregistrement réel (le texte mot pour mot et le minutage sont dans `scripts/video_data.json`) avant publication, ou utilise ces vidéos telles quelles comme gabarit (visuel + timing + sous-titres) que tu doubles ensuite dans CapCut/InShot.

## Hypothèses du simulateur

Le calcul d'écart pension est une **estimation indicative simplifiée** (âge légal 67 ans, carrière de référence 45 ans, taux de remplacement moyen 42% du revenu actuel, plancher pension minimum garantie) — voir `server/simulate.js`. Ce n'est pas un calcul officiel ; un renvoi vers mypension.be est affiché à l'utilisateur.
