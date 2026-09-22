/**
 * Estimation indicative de la pension et de l'ecart pension en Belgique.
 *
 * Compare le revenu net mensuel actuel a la pension BRUTE moyenne officielle
 * du meme statut professionnel (PensionStat.be, donnees 2025 : SPF Pensions /
 * Sigedis / INASTI). L'ecart n'est donc pas une projection individuelle de
 * carriere (pour ca, voir mypension.be), mais une comparaison a la moyenne
 * de son statut -- suffisant pour un declic, pas pour un montant exact.
 *
 * Sources :
 * - PensionStat.be : moyennes de pension par statut, age legal
 * - SPF Finances : plafonds epargne-pension / epargne long terme (revenus 2025-2026)
 * - INASTI : plafond PLCI sociale (2026, indexe)
 */

const PENSION_MOYENNE = {
  salarie: 1714,
  independant: 1243,
  fonctionnaire: 3588,
}; // PensionStat.be, brut mensuel moyen, donnees 2025

const AGE_LEGAL_PENSION = 66; // depuis le 1er janvier 2025

const PLAFOND_EPARGNE_PENSION = 1050; // EUR/an, SPF Finances (inchange revenus 2025-2026)
const PLAFOND_EPARGNE_LONG_TERME = 2450; // EUR/an, SPF Finances
const TAUX_REDUCTION_EPARGNE = 0.30; // taux fixe, quel que soit le revenu
const PLAFOND_PLCI_SOCIALE = 4701.54; // EUR/an, INASTI 2026 (9,40% des revenus pro nets)

const STATUT_LABELS = {
  salarie: 'salarié',
  independant: 'indépendant',
  fonctionnaire: 'fonctionnaire',
};

function simulerEcartPension({ age, revenuMensuel, profil }) {
  const ageNum = Number(age);
  const revenu = Number(revenuMensuel);
  const statut = PENSION_MOYENNE[profil] !== undefined ? profil : 'salarie';

  if (!Number.isFinite(ageNum) || ageNum < 18 || ageNum > 70) {
    throw new Error('Age invalide (doit etre entre 18 et 70 ans).');
  }
  if (!Number.isFinite(revenu) || revenu <= 0) {
    throw new Error('Revenu mensuel invalide.');
  }

  const pensionMoyenne = PENSION_MOYENNE[statut];
  const ecartEstime = Math.round(revenu - pensionMoyenne);
  const anneesRestantes = Math.max(0, AGE_LEGAL_PENSION - ageNum);

  const epargnePensionRecuperee = Math.round(PLAFOND_EPARGNE_PENSION * TAUX_REDUCTION_EPARGNE);
  const epargneLongTermeRecuperee = Math.round(PLAFOND_EPARGNE_LONG_TERME * TAUX_REDUCTION_EPARGNE);

  const result = {
    profil: statut,
    profilLabel: STATUT_LABELS[statut],
    age: ageNum,
    revenuMensuel: revenu,
    pensionMoyenne,
    ecartEstime,
    anneesRestantes,
    ageLegalPension: AGE_LEGAL_PENSION,
    epargnePensionRecuperee,
    epargneLongTermeRecuperee,
    disclaimer:
      "Estimation indicative : comparaison entre votre revenu net actuel et la pension BRUTE moyenne officielle de votre statut (PensionStat.be, 2025), pas une projection de votre carriere personnelle. Simulez votre pension reelle sur mypension.be.",
    sources: 'PensionStat.be (SPF Pensions / Sigedis / INASTI) · SPF Finances · INASTI',
  };

  if (statut === 'independant') {
    result.plciSocialePlafond = PLAFOND_PLCI_SOCIALE;
  }

  return result;
}

module.exports = { simulerEcartPension, PENSION_MOYENNE, AGE_LEGAL_PENSION };
