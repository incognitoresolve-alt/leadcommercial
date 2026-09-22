/**
 * Estimation indicative du revenu de remplacement en cas d'incapacite de
 * travail, salarie ou independant, en Belgique.
 *
 * Salarie : 1er mois salaire garanti (100%, loi), puis indemnite primaire
 * INAMI (60% du salaire, plafonne) du 2e au 12e mois, puis invalidite (taux
 * selon situation familiale) au-dela de 12 mois.
 * Independant : forfait journalier INAMI fixe selon la situation familiale,
 * independant du revenu professionnel reel.
 *
 * Sources : INAMI (taux salaries en vigueur depuis le 1er fevrier 2025 ;
 * forfaits independants indexes +2% au 1er mars 2026), Wikifin.be.
 */

const TAUX_PRIMAIRE_SALARIE = 0.60;
const TAUX_INVALIDITE = { famille: 0.65, isole: 0.55, cohabitant: 0.40 };
const FORFAIT_JOUR_INDEPENDANT = { famille: 81.10, isole: 64.27, cohabitant: 49.29 };

const FAMILLE_LABELS = { famille: 'charge de famille', isole: 'isolé', cohabitant: 'cohabitant' };

function simulerIncapacite({ statut, revenuMensuel, famille }) {
  const statutNorm = statut === 'independant' ? 'independant' : 'salarie';
  const familleNorm = TAUX_INVALIDITE[famille] !== undefined ? famille : 'famille';
  const revenu = Number(revenuMensuel);

  if (!Number.isFinite(revenu) || revenu <= 0) {
    throw new Error('Revenu mensuel invalide.');
  }

  const result = {
    statut: statutNorm,
    familleLabel: FAMILLE_LABELS[familleNorm],
    revenuMensuel: revenu,
    sources: 'INAMI · Wikifin.be',
  };

  if (statutNorm === 'salarie') {
    const salaireGaranti = revenu;
    const indemnitePrimaire = Math.round(revenu * TAUX_PRIMAIRE_SALARIE);
    const tauxInvalidite = TAUX_INVALIDITE[familleNorm];
    const indemniteInvalidite = Math.round(revenu * tauxInvalidite);
    const perteApres12Mois = revenu - indemniteInvalidite;

    Object.assign(result, {
      salaireGaranti,
      indemnitePrimaire,
      tauxPrimaire: TAUX_PRIMAIRE_SALARIE,
      indemniteInvalidite,
      tauxInvalidite,
      perteMensuelle: perteApres12Mois,
      disclaimer:
        "Les taux de 60% et " + Math.round(tauxInvalidite * 100) + "% s'appliquent a votre salaire BRUT PLAFONNE : au-dela d'un certain revenu, le plafond legal peut reduire encore ce pourcentage. Ce simulateur applique le taux directement a votre revenu net renseigne, a titre d'approximation.",
    });
  } else {
    const forfaitJour = FORFAIT_JOUR_INDEPENDANT[familleNorm];
    const indemniteMensuelle = Math.round(forfaitJour * 30);
    const perteMensuelle = revenu - indemniteMensuelle;

    Object.assign(result, {
      forfaitJour,
      indemniteMensuelle,
      perteMensuelle,
      disclaimer:
        "Pour un independant, l'indemnite INAMI est un forfait FIXE, independant de votre revenu professionnel anterieur : que vous gagniez ce montant ou le double, l'indemnite de base reste identique. Plus votre revenu est eleve, plus la chute est brutale.",
    });
  }

  return result;
}

module.exports = { simulerIncapacite, TAUX_PRIMAIRE_SALARIE, TAUX_INVALIDITE, FORFAIT_JOUR_INDEPENDANT };
