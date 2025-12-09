document.addEventListener('DOMContentLoaded', async () => {
  try {
    const cfg = await chrome.storage.sync.get({ apiBase: 'https://editresume-api-prod.onrender.com', appBase:'https://editresume.io', token: '' });
    const apiBaseEl = document.getElementById('apiBase');
    const appBaseEl = document.getElementById('appBase');
    const tokenEl = document.getElementById('token');
    const saveBtn = document.getElementById('save');
    const statusEl = document.getElementById('status');

    apiBaseEl.value = cfg.apiBase || '';
    appBaseEl.value = cfg.appBase || '';
    tokenEl.value = cfg.token || '';
    tokenEl.readOnly = true;
    
    // Monitor storage changes to detect if settings are being overwritten
    chrome.storage.onChanged.addListener((changes, areaName) => {
      if (areaName === 'sync' && (changes.appBase || changes.apiBase)) {
        console.log('Options page: Storage changed', changes);
        // Update UI if changed externally
        if (changes.appBase) {
          appBaseEl.value = changes.appBase.newValue || '';
        }
        if (changes.apiBase) {
          apiBaseEl.value = changes.apiBase.newValue || '';
        }
        if (changes.appBase || changes.apiBase) {
          statusEl.textContent = 'Settings were changed externally';
          statusEl.style.color = 'orange';
          setTimeout(() => {
            statusEl.textContent = '';
            statusEl.style.color = '';
          }, 3000);
        }
      }
    });

    saveBtn.addEventListener('click', async () => {
      let apiBase = apiBaseEl.value.trim();
      let appBase = appBaseEl.value.trim();
      
      // Force HTTP for localhost to avoid SSL errors
      if (apiBase.includes('localhost')) {
        apiBase = apiBase.replace(/^https?:\/\//, 'http://');
      }
      if (appBase.includes('localhost')) {
        appBase = appBase.replace(/^https?:\/\//, 'http://');
      }
      
      // Validate URLs
      if (!apiBase || !appBase) {
        statusEl.textContent = 'Error: Both URLs are required';
        statusEl.style.color = 'red';
        setTimeout(() => { 
          statusEl.textContent = '';
          statusEl.style.color = '';
        }, 3000);
        return;
      }
      
      // Get all existing storage to preserve other keys (like token)
      const existing = await chrome.storage.sync.get();
      
      // Update only the URL fields, preserving everything else
      const updated = {
        ...existing,
        apiBase,
        appBase,
        // Add a flag to prevent overwrites
        _settingsLocked: true,
        _lastSaved: Date.now()
      };
      
      // Save settings
      await chrome.storage.sync.set(updated);
      
      // Update UI with normalized values
      if (apiBase.includes('localhost')) {
        apiBaseEl.value = apiBase;
      }
      if (appBase.includes('localhost')) {
        appBaseEl.value = appBase;
      }
      
      // Wait a bit and verify they were saved
      await new Promise(resolve => setTimeout(resolve, 200));
      
      // Verify settings were actually persisted
      const saved = await chrome.storage.sync.get(['apiBase', 'appBase', '_lastSaved']);
      console.log('Options: Settings saved, verifying...', { 
        saved: { apiBase: saved.apiBase, appBase: saved.appBase },
        expected: { apiBase, appBase }
      });
      
      if (saved.apiBase === apiBase && saved.appBase === appBase) {
        statusEl.textContent = 'Saved successfully!';
        statusEl.style.color = 'green';
        
        // Verify API is reachable
        try {
          const healthUrl = apiBase.replace(/\/$/, '') + '/health';
          console.log('Options: Testing API connection to:', healthUrl);
          const res = await fetch(healthUrl, { method: 'GET', signal: AbortSignal.timeout(5000) });
          if (res.ok) {
            statusEl.textContent = 'Saved ✓ (API reachable)';
            console.log('Options: API health check passed');
          } else {
            statusEl.textContent = 'Saved ✓ (API returned error)';
            console.warn('Options: API health check failed with status:', res.status);
          }
        } catch (err) {
          statusEl.textContent = 'Saved ✓ (API unreachable)';
          console.warn('Options: API health check failed:', err.message);
        }
      } else {
        statusEl.textContent = 'Error: Settings not saved correctly';
        statusEl.style.color = 'red';
        console.error('Options: Settings verification failed:', { 
          saved: { apiBase: saved.apiBase, appBase: saved.appBase },
          expected: { apiBase, appBase },
          lastSaved: saved._lastSaved
        });
        
        // Try to re-save
        console.log('Options: Attempting to re-save settings...');
        await chrome.storage.sync.set(updated);
        await new Promise(resolve => setTimeout(resolve, 200));
        const retrySaved = await chrome.storage.sync.get(['apiBase', 'appBase']);
        if (retrySaved.apiBase === apiBase && retrySaved.appBase === appBase) {
          statusEl.textContent = 'Saved on retry ✓';
          statusEl.style.color = 'green';
        }
      }
      
      setTimeout(() => { 
        statusEl.textContent = '';
        statusEl.style.color = '';
      }, 3000);
    });
  } catch (e) {
    console.error('Options init error', e);
  }
});


