(() => {
  const MESSAGE_SOURCE = 'editresume-extension'
  const TOKEN_REQUEST = 'EDITRESUME_EXTENSION_TOKEN_REQUEST'
  const TOKEN_RESPONSE = 'EDITRESUME_EXTENSION_TOKEN_RESPONSE'
  const RESPONSE_TIMEOUT_MS = 5000

  chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
    if (!msg || msg.type !== 'REQUEST_TOKEN_FROM_PAGE') {
      return false
    }

    let settled = false
    const origin = window.location.origin

    const timeoutId = window.setTimeout(() => {
      if (settled) return
      settled = true
      window.removeEventListener('message', handleMessage)
      sendResponse({ ok: false, error: 'token_request_timeout' })
    }, RESPONSE_TIMEOUT_MS)

    function handleMessage(event) {
      if (event.origin !== origin) return
      if (!event.data || typeof event.data !== 'object') return
      const { type, source } = event.data
      if (type !== TOKEN_RESPONSE || source !== MESSAGE_SOURCE) return

      if (settled) return
      settled = true
      window.clearTimeout(timeoutId)
      window.removeEventListener('message', handleMessage)
      sendResponse(event.data)
    }

    window.addEventListener('message', handleMessage)
    window.postMessage(
      {
        type: TOKEN_REQUEST,
        source: MESSAGE_SOURCE
      },
      origin
    )

    return true
  })

  // Bridge chrome.storage to localStorage for extension-saved JD signals
  // Polls chrome.storage.local for extensionSavedJobId and writes to localStorage
  // This allows the extension (running on LinkedIn) to signal the app (running on editresume.io)
  function checkForExtensionSavedJD() {
    chrome.storage.local.get('extensionSavedJobId', (result) => {
      if (chrome.runtime.lastError) {
        console.warn('Failed to read extensionSavedJobId:', chrome.runtime.lastError);
        return;
      }
      
      const signal = result.extensionSavedJobId;
      if (!signal || signal.source !== 'extension') return;
      
      // Check if signal is recent (within last 30 seconds)
      const age = Date.now() - (signal.timestamp || 0);
      if (age > 30000) {
        // Too old, clear it
        chrome.storage.local.remove('extensionSavedJobId');
        return;
      }
      
      // Write to localStorage so the editor page can detect it
      try {
        localStorage.setItem('extensionSavedJobId', JSON.stringify(signal));
        
        // Dispatch storage event for immediate detection
        window.dispatchEvent(new StorageEvent('storage', {
          key: 'extensionSavedJobId',
          newValue: JSON.stringify(signal)
        }));
        
        // Clear from chrome.storage to prevent re-processing
        chrome.storage.local.remove('extensionSavedJobId');
      } catch (e) {
        console.warn('Failed to write extensionSavedJobId to localStorage:', e);
      }
    });
  }
  
  // Poll every 2 seconds
  setInterval(checkForExtensionSavedJD, 2000);
  
  // Check immediately on load
  checkForExtensionSavedJD();
})()

