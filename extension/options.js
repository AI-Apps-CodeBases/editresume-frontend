document.addEventListener('DOMContentLoaded', async () => {
  try {
    const cfg = await chrome.storage.sync.get({ 
      apiBase: 'https://editresume-api-prod.onrender.com', 
      appBase: 'https://editresume.io', 
      token: '',
      extensionMode: 'popup'
    });
    
    const apiBaseEl = document.getElementById('apiBase');
    const appBaseEl = document.getElementById('appBase');
    const tokenEl = document.getElementById('token');
    const modePopupEl = document.getElementById('modePopup');
    const modeSidepanelEl = document.getElementById('modeSidepanel');
    const saveBtn = document.getElementById('save');
    const statusEl = document.getElementById('status');
    const toggleTokenBtn = document.getElementById('toggleToken');
    const copyTokenBtn = document.getElementById('copyToken');
    const tokenStatusEl = document.getElementById('tokenStatus');
    const advancedToggle = document.getElementById('advancedToggle');
    const advancedAccordion = document.getElementById('advancedAccordion');
    
    // Initialize form values
    apiBaseEl.value = cfg.apiBase || '';
    appBaseEl.value = cfg.appBase || '';
    tokenEl.value = cfg.token || '';
    tokenEl.readOnly = true;
    
    // Set extension mode
    const extensionMode = cfg.extensionMode || 'popup';
    if (modePopupEl) modePopupEl.checked = extensionMode === 'popup';
    if (modeSidepanelEl) modeSidepanelEl.checked = extensionMode === 'sidepanel';
    updateModeCards(extensionMode);
    
    // Token status update function
    function updateTokenStatus() {
      const token = tokenEl.value;
      if (token && token.length > 20) {
        tokenStatusEl.classList.remove('hidden');
      } else {
        tokenStatusEl.classList.add('hidden');
      }
    }
    
    // Show token status if token exists and is valid
    updateTokenStatus();
    
    // Mode card selection
    document.querySelectorAll('.mode-card').forEach(card => {
      card.addEventListener('click', () => {
        const mode = card.dataset.mode;
        if (mode === 'popup') {
          modePopupEl.checked = true;
        } else {
          modeSidepanelEl.checked = true;
        }
        updateModeCards(mode);
      });
    });
    
    function updateModeCards(selectedMode) {
      document.querySelectorAll('.mode-card').forEach(card => {
        if (card.dataset.mode === selectedMode) {
          card.classList.add('selected');
        } else {
          card.classList.remove('selected');
        }
      });
    }
    
    // Token toggle (show/hide)
    let tokenVisible = false;
    toggleTokenBtn.addEventListener('click', () => {
      tokenVisible = !tokenVisible;
      tokenEl.type = tokenVisible ? 'text' : 'password';
      
      // Update icon
      const icon = toggleTokenBtn.querySelector('svg');
      if (tokenVisible) {
        icon.innerHTML = `
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
        `;
      } else {
        icon.innerHTML = `
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
        `;
      }
    });
    
    // Copy token
    copyTokenBtn.addEventListener('click', async () => {
      if (!tokenEl.value) {
        showStatus('No token to copy', 'error');
        return;
      }
      
      try {
        await navigator.clipboard.writeText(tokenEl.value);
        showStatus('Token copied to clipboard', 'success');
      } catch (err) {
        // Fallback for older browsers
        tokenEl.select();
        document.execCommand('copy');
        showStatus('Token copied to clipboard', 'success');
      }
    });
    
    // Advanced settings accordion
    advancedToggle.addEventListener('click', () => {
      advancedAccordion.classList.toggle('open');
    });
    
    // Monitor storage changes
    chrome.storage.onChanged.addListener((changes, areaName) => {
      if (areaName === 'sync') {
        if (changes.token) {
          tokenEl.value = changes.token.newValue || '';
          updateTokenStatus();
        }
        if (changes.appBase) {
          appBaseEl.value = changes.appBase.newValue || '';
        }
        if (changes.apiBase) {
          apiBaseEl.value = changes.apiBase.newValue || '';
        }
        if (changes.extensionMode) {
          const mode = changes.extensionMode.newValue || 'popup';
          if (mode === 'popup') {
            modePopupEl.checked = true;
          } else {
            modeSidepanelEl.checked = true;
          }
          updateModeCards(mode);
        }
        if (changes.appBase || changes.apiBase) {
          showStatus('Settings were updated externally', 'warning');
        }
      }
    });
    
    function updateTokenStatus() {
      const token = tokenEl.value;
      if (token && token.length > 20) {
        tokenStatusEl.classList.remove('hidden');
      } else {
        tokenStatusEl.classList.add('hidden');
      }
    }
    
    // Save button handler
    saveBtn.addEventListener('click', async () => {
      let apiBase = apiBaseEl.value.trim();
      let appBase = appBaseEl.value.trim();
      const extensionMode = modePopupEl?.checked ? 'popup' : (modeSidepanelEl?.checked ? 'sidepanel' : 'popup');
      
      // Force HTTP for localhost to avoid SSL errors
      if (apiBase.includes('localhost')) {
        apiBase = apiBase.replace(/^https?:\/\//, 'http://');
      }
      if (appBase.includes('localhost')) {
        appBase = appBase.replace(/^https?:\/\//, 'http://');
      }
      
      // Validate URLs
      if (!apiBase || !appBase) {
        showStatus('Error: Both URLs are required', 'error');
        return;
      }
      
      // Warn if staging appBase doesn't pair with staging apiBase (but allow it)
      if (appBase.includes('staging.editresume.io') && !apiBase.includes('staging') && !apiBase.includes('localhost')) {
        console.warn('Options: Staging appBase detected but apiBase is not staging:', { appBase, apiBase });
      }
      if (!appBase.includes('staging') && !appBase.includes('localhost') && apiBase.includes('staging')) {
        console.warn('Options: Production appBase detected but apiBase is staging:', { appBase, apiBase });
      }
      
      // Get all existing storage to preserve other keys (like token)
      const existing = await chrome.storage.sync.get();
      
      // Update only the URL fields and extension mode, preserving everything else
      const updated = {
        ...existing,
        apiBase,
        appBase,
        extensionMode,
        _settingsLocked: true,
        _lastSaved: Date.now()
      };
      
      console.log('Options: Saving URLs:', { appBase, apiBase, extensionMode });
      
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
      await new Promise(resolve => setTimeout(resolve, 100));
      const saved = await chrome.storage.sync.get(['apiBase', 'appBase', 'extensionMode']);
      
      if (saved.apiBase === apiBase && saved.appBase === appBase && saved.extensionMode === extensionMode) {
        // Optional: ping backend
        try {
          const res = await fetch(apiBase.replace(/\/$/, '') + '/health');
          if (res.ok) {
            showStatus('Settings saved (API OK)', 'success');
          } else {
            showStatus('Settings saved (API unreachable)', 'success');
          }
        } catch (_) {
          showStatus('Settings saved (API unreachable)', 'success');
        }
      } else {
        showStatus('Error: Settings not saved correctly', 'error');
        console.error('Settings mismatch:', { saved, expected: { apiBase, appBase, extensionMode } });
      }
    });
    
      function showStatus(message, type) {
        statusEl.textContent = message;
        statusEl.className = `status-message ${type}`;
        statusEl.classList.remove('hidden');
        
        setTimeout(() => {
          statusEl.classList.add('hidden');
          statusEl.textContent = '';
          statusEl.className = 'status-message hidden';
        }, 3000);
      }
      
  } catch (e) {
    console.error('Options init error', e);
  }
});

