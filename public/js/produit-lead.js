document.querySelectorAll('form[data-pilier]').forEach((form) => {
  const statusEl = form.querySelector('.status-msg');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const email = form.querySelector('[name="email"]')?.value || '';
    const telephone = form.querySelector('[name="telephone"]')?.value || '';
    if (!email && !telephone) {
      if (statusEl) {
        statusEl.textContent = 'Merci de renseigner un email ou un téléphone.';
        statusEl.className = 'status-msg err';
      }
      return;
    }

    const payload = {
      pilier: form.dataset.pilier,
      nom: form.querySelector('[name="nom"]')?.value || '',
      email,
      telephone,
      source: form.dataset.source || 'produit-web',
    };

    const res = await fetch('/api/leads', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (res.ok) {
      if (statusEl) {
        statusEl.textContent = form.dataset.successMessage || 'Merci ! On te recontacte très vite.';
        statusEl.className = 'status-msg ok';
      }
      form.reset();
    } else {
      const data = await res.json().catch(() => ({}));
      if (statusEl) {
        statusEl.textContent = data.error || 'Erreur, réessaie.';
        statusEl.className = 'status-msg err';
      }
    }
  });
});
