/**
 * Estimation indicative des droits de succession (ligne directe / conjoints,
 * cohabitants legaux) et du cout moyen des obseques en Belgique.
 *
 * Baremes progressifs par region, abattement de base applique avant le
 * bareme. Ne couvre PAS les exonerations specifiques (logement familial,
 * clauses beneficiaires d'assurance-vie, dettes, donations anterieures) ni
 * le tarif scinde meubles/immeubles de la Flandre -- seul un notaire ou
 * l'administration fiscale regionale peut etablir un montant exact.
 *
 * Sources : SPW Fiscalite (Wallonie), Bruxelles Fiscalite, VLABEL (Flandre),
 * Federation royale du notariat belge, 2025-2026.
 */

const SUCCESSION = {
  wallonie: {
    label: 'Wallonie',
    abattement: 25000,
    brackets: [
      [12500, 0.03], [25000, 0.04], [75000, 0.05], [175000, 0.07],
      [200000, 0.10], [250000, 0.14], [350000, 0.18], [500000, 0.24], [Infinity, 0.30],
    ],
    approxAbove: 200000,
  },
  bruxelles: {
    label: 'Bruxelles-Capitale',
    abattement: 15000,
    brackets: [[50000, 0.03], [100000, 0.08], [175000, 0.09], [250000, 0.18], [500000, 0.24], [Infinity, 0.30]],
    approxAbove: null,
  },
  flandre: {
    label: 'Flandre',
    abattement: 0,
    brackets: [[50000, 0.03], [250000, 0.09], [Infinity, 0.27]],
    approxAbove: null,
  },
};

const OBSEQUES_COUT_MIN = 5000;
const OBSEQUES_COUT_MAX = 8000;

function progressiveTax(amount, brackets) {
  let tax = 0;
  let prev = 0;
  for (const [upto, rate] of brackets) {
    if (amount <= prev) break;
    const taxable = Math.min(amount, upto) - prev;
    tax += taxable * rate;
    prev = upto;
    if (amount <= upto) break;
  }
  return tax;
}

function simulerDeces({ region, patrimoine }) {
  const reg = SUCCESSION[region] ? region : 'wallonie';
  const config = SUCCESSION[reg];
  const patrimoineNum = Number(patrimoine);

  if (!Number.isFinite(patrimoineNum) || patrimoineNum < 0) {
    throw new Error('Patrimoine invalide.');
  }

  const base = Math.max(0, patrimoineNum - config.abattement);
  const droitsSuccession = Math.round(progressiveTax(base, config.brackets));
  const approximatif = config.approxAbove !== null && patrimoineNum > config.approxAbove;

  return {
    region: reg,
    regionLabel: config.label,
    patrimoine: patrimoineNum,
    abattement: config.abattement,
    droitsSuccession,
    obsequesCoutMin: OBSEQUES_COUT_MIN,
    obsequesCoutMax: OBSEQUES_COUT_MAX,
    coutTotalMin: droitsSuccession + OBSEQUES_COUT_MIN,
    coutTotalMax: droitsSuccession + OBSEQUES_COUT_MAX,
    approximatif,
    disclaimer:
      "Estimation indicative pour une transmission simple en ligne directe ou entre conjoints/cohabitants legaux, sans exoneration du logement familial ni clause beneficiaire d'assurance-vie -- ces mecanismes peuvent reduire fortement la facture reelle. Freres, soeurs et tiers sont taxes a des taux nettement superieurs, non calcules ici.",
    sources: 'SPW Fiscalité · Bruxelles Fiscalité · VLABEL · Fédération royale du notariat belge',
  };
}

module.exports = { simulerDeces, SUCCESSION };
