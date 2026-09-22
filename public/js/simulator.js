const simForm = document.getElementById('sim-form');
const resultBox = document.getElementById('result');
const ecartValue = document.getElementById('ecart-value');
const ecartSub = document.getElementById('ecart-sub');
const simExtra = document.getElementById('sim-extra');
const disclaimer = document.getElementById('disclaimer');
const sourcesEl = document.getElementById('sources');
const leadCard = document.getElementById('lead-card');
const leadForm = document.getElementById('lead-form');
const leadStatus = document.getElementById('lead-status');

let lastSimulation = null;

function fmtEUR(n) {
  return new Intl.NumberFormat('fr-BE', { maximumFractionDigits: 0 }).format(n) + ' €';
}

simForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const payload = {
    profil: document.getElementById('profil').value,
    age: document.getElementById('age').value,
    revenuMensuel: document.getElementById('revenuMensuel').value,
  };

  const res = await fetch('/api/simulate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const data = await res.json();

  if (!res.ok) {
    alert(data.error || 'Erreur de calcul');
    return;
  }

  lastSimulation = data;
  const risk = data.ecartEstime > 0;
  ecartValue.textContent = (risk ? '− ' : '+ ') + fmtEUR(Math.abs(data.ecartEstime)) + ' / mois';
  ecartValue.style.color = risk ? 'var(--danger)' : 'var(--green)';
  ecartSub.textContent = `Pension moyenne officielle — ${data.profilLabel} : ${fmtEUR(data.pensionMoyenne)} brut/mois. Il vous reste environ ${data.anneesRestantes} an(s) avant l'âge légal (${data.ageLegalPension} ans).`;

  let extra = `<div class="callout">Se constituer un complément via l'épargne-pension et l'épargne à long terme réduit cet écart tout en donnant un avantage fiscal immédiat :</div>`;
  extra += `<div class="stat-row"><span class="stat-label">Épargne-pension (1.050 €/an, réduction fixe de 30%)</span><span class="stat-value good">${fmtEUR(data.epargnePensionRecuperee)} récupérés</span></div>`;
  extra += `<div class="stat-row"><span class="stat-label">Épargne long terme (2.450 €/an, réduction fixe de 30%)</span><span class="stat-value good">${fmtEUR(data.epargneLongTermeRecuperee)} récupérés</span></div>`;
  if (data.plciSocialePlafond) {
    extra += `<div class="stat-row"><span class="stat-label">PLCI sociale (jusqu'à ${fmtEUR(data.plciSocialePlafond)}/an)</span><span class="stat-value good">jusqu'à 70% récupérés (fiscal + social)</span></div>`;
  }
  simExtra.innerHTML = extra;

  disclaimer.textContent = data.disclaimer;
  sourcesEl.textContent = 'Sources : ' + data.sources;
  resultBox.classList.add('show');
  leadCard.style.display = 'block';
  leadCard.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
});

leadForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const nom = document.getElementById('nom').value;
  const email = document.getElementById('email').value;
  const telephone = document.getElementById('telephone').value;

  if (!email && !telephone) {
    leadStatus.textContent = 'Merci de renseigner un email ou un téléphone.';
    leadStatus.className = 'status-msg err';
    return;
  }

  const payload = {
    pilier: 'ECART',
    nom, email, telephone,
    profil: lastSimulation?.profil,
    age: lastSimulation?.age,
    revenuMensuel: lastSimulation?.revenuMensuel,
    ecartEstime: lastSimulation?.ecartEstime,
    pensionEstimee: lastSimulation?.pensionMoyenne,
    source: 'simulateur-web',
  };

  const res = await fetch('/api/leads', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (res.ok) {
    leadStatus.textContent = 'Merci ! Ton calcul détaillé arrive par email/téléphone très vite.';
    leadStatus.className = 'status-msg ok';
    leadForm.reset();
  } else {
    const data = await res.json();
    leadStatus.textContent = data.error || 'Erreur, réessaie.';
    leadStatus.className = 'status-msg err';
  }
});
