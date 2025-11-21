document.addEventListener('DOMContentLoaded', async () => {
  try {
    const cfg = await chrome.storage.sync.get({ apiBase: 'https://editresume-staging.onrender.com', appBase:'https://staging.editresume.io', token: '' });
    const apiBaseEl = document.getElementById('apiBase');
    const appBaseEl = document.getElementById('appBase');
    const tokenEl = document.getElementById('token');
    const saveBtn = document.getElementById('save');
    const statusEl = document.getElementById('status');

    apiBaseEl.value = cfg.apiBase || '';
    appBaseEl.value = cfg.appBase || '';
    tokenEl.value = cfg.token || '';
    tokenEl.readOnly = true;

    saveBtn.addEventListener('click', async () => {
      const apiBase = apiBaseEl.value.trim();
      const appBase = appBaseEl.value.trim();
      await chrome.storage.sync.set({ apiBase, appBase });
      statusEl.textContent = 'Saved';
      // optional: ping backend
      try {
        const res = await fetch(apiBase.replace(/\/$/, '') + '/health');
        if (res.ok) {
          statusEl.textContent = 'Saved (API OK)';
        }
      } catch (_) {}
      setTimeout(() => { statusEl.textContent = ''; }, 2000);
    });
  } catch (e) {
    console.error('Options init error', e);
  }
});


