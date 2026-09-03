const simForm = document.getElementById('sim-form');
const resultBox = document.getElementById('result');
const ecartValue = document.getElementById('ecart-value');
const ecartSub = document.getElementById('ecart-sub');
const disclaimer = document.getElementById('disclaimer');
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
    anneesActivite: document.getElementById('anneesActivite').value,
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
  ecartValue.textContent = fmtEUR(data.ecartEstime) + ' / mois';
  ecartSub.textContent = `Pension estimée : ${fmtEUR(data.pensionEstimee)}/mois sur une carrière projetée de ${data.anneesCarriereProjetee} ans (base ${data.hypotheses.carriereCompleteAnnees} ans).`;
  disclaimer.textContent = data.disclaimer;
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
    anneesActivite: lastSimulation?.anneesActivite,
    ecartEstime: lastSimulation?.ecartEstime,
    pensionEstimee: lastSimulation?.pensionEstimee,
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
