const decesForm = document.getElementById('deces-form');
const decesResult = document.getElementById('deces-result');

function fmtEUR(n) {
  return new Intl.NumberFormat('fr-BE', { maximumFractionDigits: 0 }).format(n) + ' €';
}

async function calcDeces() {
  const region = decesForm.querySelector('input[name="region"]:checked').value;
  const patrimoine = document.getElementById('patrimoine').value;

  const res = await fetch('/api/simulate-deces', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ region, patrimoine }),
  });
  const data = await res.json();
  if (!res.ok) {
    alert(data.error || 'Erreur de calcul');
    return;
  }

  let stats = '';
  stats += `<div class="stat-row"><span class="stat-label">Région</span><span class="stat-value">${data.regionLabel}</span></div>`;
  stats += `<div class="stat-row"><span class="stat-label">Abattement appliqué (montant fixe pour cette région)</span><span class="stat-value">${fmtEUR(data.abattement)}</span></div>`;
  stats += `<div class="stat-row"><span class="stat-label">Droits de succession estimés</span><span class="stat-value risk">${fmtEUR(data.droitsSuccession)}</span></div>`;
  stats += `<div class="stat-row"><span class="stat-label">Coût moyen des obsèques (moyenne nationale)</span><span class="stat-value">${fmtEUR(data.obsequesCoutMin)} – ${fmtEUR(data.obsequesCoutMax)}</span></div>`;
  document.getElementById('deces-stats').innerHTML = stats;

  document.getElementById('deces-hero-value').textContent = `${fmtEUR(data.coutTotalMin)} – ${fmtEUR(data.coutTotalMax)}`;

  const calloutEl = document.getElementById('deces-callout');
  if (data.approximatif) {
    calloutEl.innerHTML = `Au-delà de ${fmtEUR(200000)}, les tranches supérieures utilisées ici sont une <strong>approximation</strong> basée sur la structure historique du barème wallon. Pour un patrimoine de cette ampleur, une vérification avec un notaire est fortement recommandée.`;
  } else {
    calloutEl.innerHTML = `Ce calcul suppose une transmission simple en ligne directe ou entre conjoints/cohabitants légaux, sans exonération du logement familial ni clause bénéficiaire d'assurance-vie. Ces mécanismes peuvent réduire fortement la facture réelle — c'est justement ce qu'un conseiller peut t'aider à mettre en place.`;
  }

  document.getElementById('deces-disclaimer').textContent = data.disclaimer;
  document.getElementById('deces-sources').textContent = 'Sources : ' + data.sources;
  decesResult.classList.add('show');

  window.__lastSimResult = {
    notes: `Simulation succession : ${data.regionLabel}, patrimoine ${fmtEUR(data.patrimoine)} → droits estimés ${fmtEUR(data.droitsSuccession)} (coût total ${fmtEUR(data.coutTotalMin)} – ${fmtEUR(data.coutTotalMax)}).`,
  };
}

decesForm.addEventListener('submit', (e) => {
  e.preventDefault();
  calcDeces();
});
decesForm.addEventListener('change', calcDeces);

calcDeces();
