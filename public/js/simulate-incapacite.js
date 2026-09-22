const incapaciteForm = document.getElementById('incapacite-form');
const incapaciteResult = document.getElementById('incapacite-result');

function fmtEUR(n) {
  return new Intl.NumberFormat('fr-BE', { maximumFractionDigits: 0 }).format(n) + ' €';
}

function meterHTML(label, value, max, cls) {
  const w = max > 0 ? Math.max(0, Math.min(100, (value / max) * 100)) : 0;
  return `<div class="meter-block"><div class="meter-label"><span>${label}</span><span class="v">${fmtEUR(value)}</span></div>
    <div class="meter-track"><div class="meter-fill${cls ? ' ' + cls : ''}" style="width:${w}%"></div></div></div>`;
}

async function calcIncapacite() {
  const statut = incapaciteForm.querySelector('input[name="statut"]:checked').value;
  const revenuMensuel = document.getElementById('revenu').value;
  const famille = incapaciteForm.querySelector('input[name="famille"]:checked').value;

  const res = await fetch('/api/simulate-incapacite', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ statut, revenuMensuel, famille }),
  });
  const data = await res.json();
  if (!res.ok) {
    alert(data.error || 'Erreur de calcul');
    return;
  }

  let meters = '';
  if (data.statut === 'salarie') {
    meters += meterHTML("1ᵉʳ mois — salaire garanti par l'employeur", data.salaireGaranti, data.revenuMensuel);
    meters += meterHTML(`Du 2ᵉ au 12ᵉ mois — indemnité primaire INAMI (${Math.round(data.tauxPrimaire * 100)}%)`, data.indemnitePrimaire, data.revenuMensuel, 'risk');
    meters += meterHTML(`Après 12 mois — invalidité (${Math.round(data.tauxInvalidite * 100)}%)`, data.indemniteInvalidite, data.revenuMensuel, 'risk');
  } else {
    meters += `<div class="stat-row"><span class="stat-label">Indemnité forfaitaire journalière INAMI (forfait fixe selon la situation familiale)</span><span class="stat-value">${fmtEUR(data.forfaitJour)}/jour</span></div>`;
    meters += meterHTML('Indemnité mensuelle estimée (incapacité primaire)', data.indemniteMensuelle, data.revenuMensuel, 'risk');
  }
  document.getElementById('incapacite-meters').innerHTML = meters;

  const perte = data.perteMensuelle;
  const risk = perte > 0;
  document.getElementById('incapacite-hero-label').textContent = risk
    ? (data.statut === 'salarie' ? 'Perte de revenu mensuelle après 12 mois d\'arrêt' : 'Perte de revenu mensuelle en cas d\'arrêt')
    : "L'indemnité dépasserait ton revenu actuel";
  document.getElementById('incapacite-hero-value').textContent = (risk ? '− ' : '+ ') + fmtEUR(Math.abs(perte));
  const heroEl = document.querySelector('#incapacite-result .stat-hero');
  heroEl.classList.toggle('risk', risk);
  heroEl.classList.toggle('good', !risk);

  document.getElementById('incapacite-callout').innerHTML = data.disclaimer;
  document.getElementById('incapacite-sources').textContent = 'Sources : ' + data.sources;
  incapaciteResult.classList.add('show');

  window.__lastSimResult = {
    notes: `Simulation incapacité : ${data.statut === 'salarie' ? 'salarié' : 'indépendant'}, ${fmtEUR(data.revenuMensuel)}/mois, ${data.familleLabel} → perte estimée ${(risk ? '-' : '+')} ${fmtEUR(Math.abs(perte))}/mois.`,
    profil: data.statut,
    revenuMensuel: data.revenuMensuel,
    ecartEstime: perte,
  };
}

incapaciteForm.addEventListener('submit', (e) => {
  e.preventDefault();
  calcIncapacite();
});
incapaciteForm.addEventListener('change', calcIncapacite);

calcIncapacite();
