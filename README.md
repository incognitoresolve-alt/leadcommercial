# leadcommercial — Mon Écart Pension

Outil de génération de leads pour un funnel indépendants/professions de santé (pension) et transmission de patrimoine (Kit Sérénité & Transmission).

## Ce que contient l'outil

- **Simulateur "Mon Écart Pension"** (`/`) : compare le revenu net actuel à la pension BRUTE moyenne officielle du statut (salarié/indépendant/fonctionnaire — PensionStat.be 2025), puis capture le lead (DM "ÉCART" équivalent web).
- **Page Kit Sérénité & Transmission** (`/kit.html`) : simulateur de droits de succession par région (Wallonie/Bruxelles/Flandre) + coût moyen des obsèques, puis capture de lead pour le guide 44 pages (DM "KIT").
- **Page Bilan gratuit** (`/bilan.html`) : capture de lead pour un bilan protection (incapacité, maladie, décès, comparatif salarié) — DM "BILAN".
- **Page Solutions** (`/solutions.html`) : hub vers les 6 pages produit ci-dessous, chacune avec son propre mot-clé DM — pensées pour recevoir le trafic des carrousels Instagram/TikTok et transformer les DM en leads trackés :
  - `/epargne-pension.html` — DM "ÉPARGNE"
  - `/epargne-long-terme.html` — DM "PLAN"
  - `/epargne-enfant.html` — DM "ENFANT"
  - `/couverture-sante.html` — DM "SANTÉ" (avec simulateur de reste à charge hospitalisation)
  - `/couverture-obseques.html` — DM "OBSÈQUES"
  - `/incapacite-salarie.html` — DM "INCAPACITÉ" (avec simulateur salarié/indépendant, taux INAMI)
- **Admin leads** (`/admin.html`) : liste des leads capturés (protégée par `ADMIN_TOKEN`) + export CSV.

## Lancer le projet

```bash
npm install
cp .env.example .env   # puis remplir les valeurs
npm start
```

Le serveur écoute sur `http://localhost:3000` et charge automatiquement `.env` (via `node --env-file-if-exists`). Les leads sont stockés dans `data/leads.db` (SQLite, créé automatiquement, non versionné).

`.env` n'est **pas versionné** — il faut le recréer sur le serveur de déploiement :

| Variable | Rôle |
|---|---|
| `WEB3FORMS_KEY` | Envoie un email à chaque nouveau lead. La clé du projet Boussole Prévoyance (OVB) est reprise telle quelle, pour garder un seul flux de leads vers la même boîte mail. Sans elle, les leads sont quand même enregistrés en base et visibles sur `/admin.html`. |
| `ADMIN_TOKEN` | Protège `/admin.html` et l'export CSV. Voir « Protéger l'admin » ci-dessous. |
| `PORT` | Port d'écoute (3000 par défaut). |

Si Web3Forms refuse une notification, la raison exacte est loggée côté serveur (`Web3Forms a refusé la notification : …`) — le lead, lui, reste toujours enregistré en base.

## Protéger l'admin (`ADMIN_TOKEN`)

`/admin.html` affiche tous les leads captés (nom, email, téléphone) : c'est la page la plus sensible du site. Elle est protégée par un simple mot de passe, `ADMIN_TOKEN`.

1. Génère une valeur aléatoire (ne choisis pas un mot de passe « à la main ») :

   ```bash
   node -e "console.log(require('crypto').randomBytes(24).toString('base64url'))"
   ```

2. Colle-la dans `.env` :

   ```
   ADMIN_TOKEN=la-valeur-generee
   ```

3. Redémarre le serveur (`npm start`) — les variables de `.env` ne sont lues qu'au démarrage.
4. Ouvre `/admin.html` et saisis cette valeur dans le champ token.

Tant que `ADMIN_TOKEN` est vide ou vaut encore `change-moi`, l'API admin répond **503** et la liste des leads reste inaccessible : pas de valeur par défaut devinable. Au déploiement, définis la variable dans la configuration de l'hébergeur (et non dans un fichier versionné) ; `.env` est ignoré par git.

## Livraison du Kit Sérénité & Transmission

Après avoir rempli le formulaire sur `/kit.html`, le prospect voit apparaître un bouton de téléchargement immédiat pointant vers :

```
public/downloads/kit-serenite-transmission.pdf
```

Le PDF (44 pages, « Volume 2 ») est versionné dans le dépôt, il n'y a donc rien à déposer manuellement au déploiement. Si le fichier venait à manquer, un prospect qui clique reçoit un message d'attente explicite (HTTP 503) plutôt qu'une erreur 404 — voir la route de repli dans `server.js`.

## API

- `POST /api/simulate` — `{ profil: 'salarie'|'independant'|'fonctionnaire', age, revenuMensuel }` → `{ pensionMoyenne, ecartEstime, anneesRestantes, epargnePensionRecuperee, epargneLongTermeRecuperee, ... }`
- `POST /api/simulate-deces` — `{ region: 'wallonie'|'bruxelles'|'flandre', patrimoine }` → `{ droitsSuccession, coutTotalMin, coutTotalMax, ... }`
- `POST /api/simulate-incapacite` — `{ statut: 'salarie'|'independant', revenuMensuel, famille: 'famille'|'isole'|'cohabitant' }` → `{ perteMensuelle, ... }` (salarié : mois garanti + primaire + invalidité ; indépendant : forfait journalier INAMI)
- `POST /api/simulate-sante` — `{ chambre: 'individuelle'|'commune', jours }` → `{ resteAChargeMin, resteAChargeMax, ... }`
- `POST /api/leads` — `{ pilier: 'ECART'|'KIT'|'BILAN'|'EPARGNE'|'PLAN'|'ENFANT'|'SANTE'|'OBSEQUES'|'INCAPACITE', nom, email, telephone, ... }`. Les 6 pages produit utilisent un handler générique (`public/js/produit-lead.js`) qui lit `data-pilier` / `data-source` / `data-success-message` sur le `<form>`. Chaque lead créé déclenche aussi une notification par email via Web3Forms si la variable d'environnement `WEB3FORMS_KEY` est définie (clé gratuite sur web3forms.com, associée à l'adresse email de destination) — sans elle, les leads restent visibles uniquement sur `/admin.html`.
- `GET /api/leads?token=...` — liste des leads (JSON)
- `GET /api/leads/export.csv?token=...` — export CSV
- `PATCH /api/leads/:id?token=...` — mise à jour `statut` / `notes`

## Générer les vidéos

Les vidéos ne sont **pas** publiées par le site : ce sont des fichiers à poster sur TikTok/Instagram. Les 3 vidéos sont générées dans `content/videos/` à partir de `scripts/video_data.json` (texte issu du document `Scripts_Videos_Pretes_A_Publier.md`) :

```bash
apt-get install -y ffmpeg espeak-ng mbrola mbrola-fr4   # dépendances système
pip install pillow
python3 scripts/generate_videos.py
```

Pipeline par ligne du script : synthèse vocale FR (espeak-ng + voix mbrola `mb-fr4`), image de fond générée (PIL) avec le texte à l'écran synchronisé, puis assemblage ffmpeg en un MP4 vertical 1080×1920. Le script `scripts/generate_reels.py` produit de la même façon des Reels 1080×1920 dans `content/reels/`, à partir des slides des carrousels (voir section suivante) + voix off. Les fichiers `.mp4` ne sont pas versionnés (voir `.gitignore`) — relancer le script après clonage.

**Important** : la voix off est générée par synthèse vocale (robotique), pas une voix humaine enregistrée. Pour un rendu plus naturel, remplace la voix off par un enregistrement réel (le texte mot pour mot et le minutage sont dans `scripts/video_data.json`) avant publication, ou utilise ces vidéos telles quelles comme gabarit (visuel + timing + sous-titres) que tu doubles ensuite dans CapCut/InShot.

## Générer les carrousels Instagram / TikTok (salariés)

`content/carousels/<theme>/slide-N.png` (+ un `.zip` par thème) sont générés à partir de `scripts/carousels_data.json` : 6 thématiques ciblant les salariés pour générer du lead sur l'épargne et la protection — épargne pension, épargne à long terme, épargne enfant, couverture santé, couverture obsèques, incapacité de travail (salarié). Chaque thème est un carrousel complet de 7 slides (pas juste une couverture) : accroche, contexte, chiffre-clé, mythe vs réalité, liste, erreur fréquente, puis CTA — pensé pour retenir l'attention jusqu'au bout et convertir en DM.

```bash
pip install pillow   # ffmpeg non requis ici, seulement Pillow
python3 scripts/generate_carousels.py
```

Format 1080×1350 (4:5), compatible carrousel Instagram et post photo TikTok. Design : couverture et CTA en navy dramatique, slides de contenu en ivoire pour la lisibilité, une couleur d'accent par thème, points de progression en bas de chaque slide. Les images et zips ne sont pas versionnés (voir `.gitignore`) — relancer le script après clonage.

## Hypothèses des simulateurs

Tous les simulateurs (`server/simulate*.js`) sont des **estimations indicatives sourcées sur des données publiques officielles** — pas des calculs personnalisés ni un conseil réglementé :

- **Pension** : pension BRUTE moyenne par statut (PensionStat.be 2025 — SPF Pensions/Sigedis/INASTI), âge légal 66 ans, plafonds épargne-pension/épargne long terme (SPF Finances) et PLCI sociale (INASTI 2026).
- **Décès & succession** : barèmes progressifs par région avec abattement de base, ligne directe/conjoints uniquement (SPW Fiscalité, Bruxelles Fiscalité, VLABEL, Fédération royale du notariat belge). Ne couvre pas les exonérations spécifiques (logement familial, clauses bénéficiaires, donations antérieures) — un notaire reste nécessaire pour un montant exact.
- **Incapacité de travail** : taux et forfaits INAMI (salaire garanti 1 mois, primaire 60%, invalidité 65/55/40% selon la situation familiale pour un salarié ; forfait journalier fixe pour un indépendant).
- **Santé** : suppléments de chambre individuelle (moyennes hôpital public vs clinique privée) et mécanisme du ticket modérateur (Wikifin.be/INAMI).

Un rappel FSMA (les simulations sont des estimations générales ; la mise en œuvre passe par un expert agréé) est affiché en pied de page sur tout le site — voir `public/css/style.css` (`.legal`) et le footer de chaque page.
