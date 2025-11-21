const DEFAULTS = {
  apiBase: 'https://editresume-staging.onrender.com',
  appBase: 'https://staging.editresume.io',
  token: '',
  tokenFetchedAt: 0
}

const TOKEN_TTL_MS = 45 * 60 * 1000 // 45 minutes

chrome.runtime.onInstalled.addListener(async () => {
  const current = await chrome.storage.sync.get()
  const next = { ...DEFAULTS }
  let needsUpdate = false

  Object.entries(DEFAULTS).forEach(([key, defaultValue]) => {
    if (current[key] === undefined) {
      next[key] = defaultValue
      needsUpdate = true
    } else {
      next[key] = current[key]
    }
  })

  if (needsUpdate) {
    chrome.storage.sync.set(next)
  }
})

const normalizeBaseUrl = (value) => {
  if (!value) return DEFAULTS.appBase
  let url = value.trim()
  if (!/^https?:\/\//i.test(url)) {
    url = `https://${url}`
  }
  return url.replace(/\/+$/, '')
}

const waitForTabComplete = (tabId) =>
  new Promise((resolve, reject) => {
    let resolved = false

    const cleanup = () => {
      chrome.tabs.onUpdated.removeListener(handleUpdated)
      chrome.tabs.onRemoved.removeListener(handleRemoved)
    }

    const handleUpdated = (updatedTabId, info) => {
      if (updatedTabId !== tabId || info.status !== 'complete') return
      if (resolved) return
      resolved = true
      cleanup()
      resolve()
    }

    const handleRemoved = (removedTabId) => {
      if (removedTabId !== tabId || resolved) return
      resolved = true
      cleanup()
      reject(new Error('tab_closed'))
    }

    chrome.tabs.onUpdated.addListener(handleUpdated)
    chrome.tabs.onRemoved.addListener(handleRemoved)

    chrome.tabs.get(tabId, (tab) => {
      if (chrome.runtime.lastError) {
        cleanup()
        reject(new Error(chrome.runtime.lastError.message))
        return
      }
      if (tab?.status === 'complete') {
        cleanup()
        resolve()
      }
    })
  })

const requestTokenViaApp = async () => {
  const { appBase } = await chrome.storage.sync.get({ appBase: DEFAULTS.appBase })
  const normalizedBase = normalizeBaseUrl(appBase)
  const urlPattern = `${normalizedBase}/*`

  const existingTabs = await chrome.tabs.query({ url: urlPattern })
  let targetTab = existingTabs[0]
  let createdTempTab = false

  if (!targetTab) {
    targetTab = await chrome.tabs.create({
      url: `${normalizedBase}/?extensionAuth=1`,
      active: false
    })
    createdTempTab = true
  }

  if (!targetTab?.id) {
    throw new Error('unable_to_open_app_tab')
  }

  await waitForTabComplete(targetTab.id)

  try {
    await chrome.scripting.executeScript({
      target: { tabId: targetTab.id },
      files: ['appBridge.js']
    })
  } catch (err) {
    console.warn('Failed to inject appBridge.js', err)
  }

  const response = await new Promise((resolve, reject) => {
    chrome.tabs.sendMessage(
      targetTab.id,
      { type: 'REQUEST_TOKEN_FROM_PAGE' },
      (res) => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message))
          return
        }
        if (!res) {
          reject(new Error('no_response'))
          return
        }
        resolve(res)
      }
    )
  })

  if (response.ok && response.token) {
    if (createdTempTab) {
      chrome.tabs.remove(targetTab.id, () => chrome.runtime.lastError)
    }
    return response.token
  }

  if (createdTempTab && response.error === 'not_authenticated') {
    chrome.tabs.update(targetTab.id, { active: true })
  }

  throw new Error(response.error || 'token_request_failed')
}

const ensureFreshToken = async (forceRefresh = false) => {
  const { token, tokenFetchedAt } = await chrome.storage.sync.get({
    token: '',
    tokenFetchedAt: 0
  })

  if (!forceRefresh && token && Date.now() - tokenFetchedAt < TOKEN_TTL_MS) {
    return token
  }

  const freshToken = await requestTokenViaApp()
  await chrome.storage.sync.set({ token: freshToken, tokenFetchedAt: Date.now() })
  return freshToken
}

const clearStoredToken = async () => {
  await chrome.storage.sync.set({ token: '', tokenFetchedAt: 0 })
}

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (!msg || typeof msg !== 'object') {
    return false
  }

  if (msg.type === 'OPEN_AUTH') {
    chrome.runtime.openOptionsPage()
    sendResponse({ ok: true })
    return true
  }

  if (msg.type === 'GET_FIREBASE_TOKEN') {
    ensureFreshToken(Boolean(msg.forceRefresh))
      .then((token) => sendResponse({ ok: true, token }))
      .catch(async (error) => {
        if (error.message === 'not_authenticated') {
          await clearStoredToken()
        }
        sendResponse({ ok: false, error: error.message })
      })
    return true
  }

  return false
})
