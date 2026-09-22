const santeForm = document.getElementById('sante-form');
const santeResult = document.getElementById('sante-result');

function fmtEUR(n) {
  return new Intl.NumberFormat('fr-BE', { maximumFractionDigits: 0 }).format(n) + ' €';
}

async function calcSante() {
  const chambre = santeForm.querySelector('input[name="chambre"]:checked').value;
  const jours = document.getElementById('jours').value;

  const res = await fetch('/api/simulate-sante', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chambre, jours }),
  });
  const data = await res.json();
  if (!res.ok) {
    alert(data.error || 'Erreur de calcul');
    return;
  }

  const heroEl = document.getElementById('sante-hero');
  let stats = '';
  if (data.chambre === 'individuelle') {
    stats += `<div class="stat-row"><span class="stat-label">Supplément chambre — hôpital public</span><span class="stat-value">${fmtEUR(data.supplementJourPublic)}/jour</span></div>`;
    stats += `<div class="stat-row"><span class="stat-label">Supplément chambre — clinique privée</span><span class="stat-value">${fmtEUR(data.supplementJourPrive)}/jour</span></div>`;
    document.getElementById('sante-hero-label').textContent = `Reste à charge estimé sur ${data.jours} jour(s)`;
    document.getElementById('sante-hero-value').textContent = `${fmtEUR(data.resteAChargeMin)} – ${fmtEUR(data.resteAChargeMax)}`;
    heroEl.style.display = 'block';
  } else {
    stats += `<div class="stat-row"><span class="stat-label">Chambre commune / double</span><span class="stat-value good">Couverture de base par la mutuelle</span></div>`;
    heroEl.style.display = 'none';
  }
  document.getElementById('sante-stats').innerHTML = stats;

  document.getElementById('sante-callout').innerHTML = data.disclaimer;
  document.getElementById('sante-sources').textContent = 'Sources : ' + data.sources;
  santeResult.classList.add('show');

  window.__lastSimResult = {
    notes: data.chambre === 'individuelle'
      ? `Simulation santé : chambre individuelle, ${data.jours} jour(s) → reste à charge estimé ${fmtEUR(data.resteAChargeMin)} – ${fmtEUR(data.resteAChargeMax)}.`
      : `Simulation santé : chambre commune/double, ${data.jours} jour(s) → couverture de base par la mutuelle.`,
  };
}

santeForm.addEventListener('submit', (e) => {
  e.preventDefault();
  calcSante();
});
santeForm.addEventListener('change', calcSante);

calcSante();
