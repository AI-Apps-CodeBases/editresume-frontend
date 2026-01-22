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
})()

