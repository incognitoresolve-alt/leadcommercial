const kitForm = document.getElementById('kit-form');
const kitStatus = document.getElementById('kit-status');
const kitDownload = document.getElementById('kit-download');

kitForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const simResult = window.__lastSimResult || {};
  const payload = {
    pilier: 'KIT',
    nom: document.getElementById('nom').value,
    email: document.getElementById('email').value,
    telephone: document.getElementById('telephone').value,
    source: 'kit-web',
    notes: simResult.notes,
  };

  const res = await fetch('/api/leads', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (res.ok) {
    kitStatus.textContent = '';
    kitStatus.className = 'status-msg';
    kitForm.reset();
    kitDownload.classList.add('show');
    kitDownload.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  } else {
    const data = await res.json();
    kitStatus.textContent = data.error || 'Erreur, réessaie.';
    kitStatus.className = 'status-msg err';
  }
});
