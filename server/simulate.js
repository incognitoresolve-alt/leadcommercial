/**
 * Estimation indicative de la pension et de l'ecart pension pour un independant belge.
 *
 * Hypotheses simplifiees (a but pedagogique / lead magnet, PAS un calcul officiel) :
 * - Age legal de la pension : 67 ans
 * - Carriere complete de reference : 45 ans
 * - Taux de remplacement moyen pour un independant en fin de carriere complete : 42%
 *   du revenu net mensuel actuel (regime independant historiquement moins genereux
 *   que le regime salarie), applique au prorata des annees de carriere projetees
 * - Plancher : pension minimum garantie indexee au prorata carriere (base 1500 EUR
 *   pour une carriere complete)
 *
 * Ces hypotheses sont volontairement simples et doivent etre presentees comme une
 * estimation, avec un renvoi vers mypension.be pour un calcul officiel.
 */

const AGE_LEGAL_PENSION = 67;
const CARRIERE_COMPLETE_ANNEES = 45;
const TAUX_REMPLACEMENT = 0.42;
const PENSION_MIN_CARRIERE_COMPLETE = 1500;

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function simulerEcartPension({ age, revenuMensuel, anneesActivite, profil }) {
  const ageNum = Number(age);
  const revenu = Number(revenuMensuel);
  const anneesDejaPrestees = Number(anneesActivite) || 0;

  if (!Number.isFinite(ageNum) || ageNum < 18 || ageNum > 70) {
    throw new Error('Age invalide (doit etre entre 18 et 70 ans).');
  }
  if (!Number.isFinite(revenu) || revenu <= 0) {
    throw new Error('Revenu mensuel invalide.');
  }

  const anneesRestantes = Math.max(0, AGE_LEGAL_PENSION - ageNum);
  const anneesCarriereProjetee = clamp(anneesDejaPrestees + anneesRestantes, 0, CARRIERE_COMPLETE_ANNEES);
  const prorataCarriere = anneesCarriereProjetee / CARRIERE_COMPLETE_ANNEES;

  const pensionParTaux = revenu * TAUX_REMPLACEMENT * prorataCarriere;
  const pensionPlancher = PENSION_MIN_CARRIERE_COMPLETE * prorataCarriere;
  const pensionEstimee = Math.round(Math.max(pensionParTaux, pensionPlancher));

  const ecartEstime = Math.round(revenu - pensionEstimee);

  return {
    profil: profil || 'independant',
    age: ageNum,
    revenuMensuel: revenu,
    anneesActivite: anneesDejaPrestees,
    anneesCarriereProjetee: Math.round(anneesCarriereProjetee * 10) / 10,
    pensionEstimee,
    ecartEstime,
    hypotheses: {
      ageLegalPension: AGE_LEGAL_PENSION,
      carriereCompleteAnnees: CARRIERE_COMPLETE_ANNEES,
      tauxRemplacement: TAUX_REMPLACEMENT,
      pensionMinCarriereComplete: PENSION_MIN_CARRIERE_COMPLETE,
    },
    disclaimer:
      'Estimation indicative simplifiee, non contractuelle. Ne remplace pas un calcul officiel via mypension.be ni un bilan personnalise.',
  };
}

module.exports = { simulerEcartPension };
