const bilanForm = document.getElementById('bilan-form');
const bilanStatus = document.getElementById('bilan-status');

bilanForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const sujet = document.getElementById('sujet').value;
  const payload = {
    pilier: 'BILAN',
    nom: document.getElementById('nom').value,
    email: document.getElementById('email').value,
    telephone: document.getElementById('telephone').value,
    source: 'bilan-web',
    notes: `Sujet : ${sujet}`,
  };

  const res = await fetch('/api/leads', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (res.ok) {
    bilanStatus.textContent = 'Merci ! On te recontacte très vite pour fixer ton créneau.';
    bilanStatus.className = 'status-msg ok';
    bilanForm.reset();
  } else {
    const data = await res.json();
    bilanStatus.textContent = data.error || 'Erreur, réessaie.';
    bilanStatus.className = 'status-msg err';
  }
});
