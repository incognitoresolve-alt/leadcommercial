const kitForm = document.getElementById('kit-form');
const kitStatus = document.getElementById('kit-status');

kitForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const payload = {
    pilier: 'KIT',
    nom: document.getElementById('nom').value,
    email: document.getElementById('email').value,
    telephone: document.getElementById('telephone').value,
    source: 'kit-web',
  };

  const res = await fetch('/api/leads', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (res.ok) {
    kitStatus.textContent = 'Merci ! Le Kit Sérénité & Transmission arrive dans ta boîte mail.';
    kitStatus.className = 'status-msg ok';
    kitForm.reset();
  } else {
    const data = await res.json();
    kitStatus.textContent = data.error || 'Erreur, réessaie.';
    kitStatus.className = 'status-msg err';
  }
});
