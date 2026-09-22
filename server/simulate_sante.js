/**
 * Estimation indicative du reste a charge en cas d'hospitalisation, selon
 * le type de chambre choisi.
 *
 * La mutuelle couvre le socle legal (ticket moderateur limite en chambre
 * commune/double). En chambre individuelle, le supplement de chambre et les
 * depassements d'honoraires restent largement a charge, sauf assurance
 * hospitalisation complementaire.
 *
 * Sources : moyennes sectorielles (hopitaux publics vs cliniques privees),
 * recoupees auprès de mutualites et assureurs sante ; Wikifin.be / INAMI
 * pour le mecanisme du ticket moderateur.
 */

const SUPPLEMENT_JOUR_PUBLIC = 61;
const SUPPLEMENT_JOUR_PRIVE = 170;

function simulerSante({ chambre, jours }) {
  const chambreNorm = chambre === 'commune' ? 'commune' : 'individuelle';
  const joursNum = Number(jours);

  if (!Number.isFinite(joursNum) || joursNum < 1) {
    throw new Error('Duree de sejour invalide.');
  }

  const result = {
    chambre: chambreNorm,
    jours: joursNum,
    sources: 'Wikifin.be · INAMI · moyennes sectorielles mutualités/assureurs',
  };

  if (chambreNorm === 'individuelle') {
    const min = Math.round(SUPPLEMENT_JOUR_PUBLIC * joursNum);
    const max = Math.round(SUPPLEMENT_JOUR_PRIVE * joursNum);
    Object.assign(result, {
      supplementJourPublic: SUPPLEMENT_JOUR_PUBLIC,
      supplementJourPrive: SUPPLEMENT_JOUR_PRIVE,
      resteAChargeMin: min,
      resteAChargeMax: max,
      disclaimer:
        "A cela peuvent s'ajouter des supplements d'honoraires medicaux, pratique courante en chambre individuelle, qui peuvent alourdir significativement la facture -- la mutuelle ne les rembourse pas, seule une assurance hospitalisation complementaire le fait.",
    });
  } else {
    Object.assign(result, {
      disclaimer:
        "En chambre commune ou double, le ticket moderateur (part restant apres intervention de la mutuelle) reste generalement limite. C'est le passage en chambre individuelle qui fait grimper la facture.",
    });
  }

  return result;
}

module.exports = { simulerSante, SUPPLEMENT_JOUR_PUBLIC, SUPPLEMENT_JOUR_PRIVE };
