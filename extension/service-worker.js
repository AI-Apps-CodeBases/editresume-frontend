const DEFAULTS = {
  appBase: 'https://editresume.io',
  token: '',
  tokenFetchedAt: 0
}

const TOKEN_TTL_MS = 45 * 60 * 1000 // 45 minutes

const getApiBaseFromAppBase = (appBase) => {
  if (!appBase) return 'https://editresume-api-prod.onrender.com'
  if (appBase.includes('editresume.io') && !appBase.includes('staging')) {
    return 'https://editresume-api-prod.onrender.com'
  }
  if (appBase.includes('staging.editresume.io')) {
    return 'https://editresume-staging.onrender.com'
  }
  if (appBase.includes('localhost:3000')) {
    return 'http://localhost:8000'
  }
  return 'https://editresume-api-prod.onrender.com'
}

// Migration disabled - allow staging URLs to persist
const migrateStagingToProduction = async () => {
  // No longer forcing migration - respect user's saved settings
  return false
}

chrome.runtime.onInstalled.addListener(async (details) => {
  // Only set defaults on first install, not on updates or reloads
  if (details.reason !== 'install') {
    return
  }
  
  const current = await chrome.storage.sync.get()
  
  // Don't override if settings are locked (user has explicitly saved)
  if (current._settingsLocked) {
    console.log('Extension: Settings are locked, skipping defaults')
    return
  }
  
  // Only set defaults if both appBase and apiBase are missing
  // Don't auto-derive if apiBase is explicitly set (even if empty string, user might have cleared it)
  if (!current.appBase && !current.apiBase) {
    const defaults = {
      ...current, // Preserve existing keys
      appBase: DEFAULTS.appBase,
      apiBase: getApiBaseFromAppBase(DEFAULTS.appBase)
    }
    await chrome.storage.sync.set(defaults)
    console.log('Extension: Set default URLs on first install')
  } else if (!current.appBase && current.apiBase) {
    // If apiBase exists but appBase doesn't, set default appBase
    const updated = {
      ...current, // Preserve existing keys
      appBase: DEFAULTS.appBase
    }
    await chrome.storage.sync.set(updated)
    console.log('Extension: Set default appBase, preserving existing apiBase')
  }
  // Don't auto-derive apiBase if it's missing - let resolveApiBase() handle it at runtime
  // This prevents overwriting user's explicit settings
})

chrome.runtime.onStartup.addListener(async () => {
  // Migration disabled - respect user's saved settings
  // await migrateStagingToProduction()
})

// Migration disabled - respect user's saved settings
// migrateStagingToProduction()

// Monitor storage changes to prevent unauthorized overwrites
chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName === 'sync') {
    if (changes.appBase || changes.apiBase) {
      console.log('Extension: Storage changed', {
        appBase: changes.appBase,
        apiBase: changes.apiBase,
        source: changes._lastSaved ? 'user_save' : 'unknown',
        timestamp: changes._lastSaved?.newValue
      })
      
      // If settings were just saved by user, don't allow overwrites for 5 seconds
      if (changes._lastSaved?.newValue) {
        const saveTime = changes._lastSaved.newValue
        const now = Date.now()
        if (now - saveTime < 5000) {
          console.log('Extension: Settings recently saved by user, protecting from overwrites')
        }
      }
    }
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

let tokenRequestInProgress = false
let tokenRequestPromise = null

const requestTokenViaApp = async (retries = 3) => {
  if (tokenRequestInProgress && tokenRequestPromise) {
    return tokenRequestPromise
  }
  
  tokenRequestInProgress = true
  tokenRequestPromise = (async () => {
    try {
  const { appBase } = await chrome.storage.sync.get({ appBase: DEFAULTS.appBase })
  let resolvedAppBase = appBase || DEFAULTS.appBase
  
  // Allow staging URLs - don't force migration
  // if (resolvedAppBase.includes('staging.editresume.io') || resolvedAppBase.includes('localhost')) {
  //   resolvedAppBase = DEFAULTS.appBase
  //   await chrome.storage.sync.set({ 
  //     appBase: DEFAULTS.appBase,
  //     apiBase: getApiBaseFromAppBase(DEFAULTS.appBase)
  //   })
  // }
  
  const normalizedBase = normalizeBaseUrl(resolvedAppBase)
  const urlPattern = `${normalizedBase}/*`

  const existingTabs = await chrome.tabs.query({ url: urlPattern })
  let targetTab = existingTabs.find(tab => {
    try {
      const url = new URL(tab.url)
      return url.searchParams.get('extensionAuth') === '1'
    } catch {
      return false
    }
  }) || existingTabs[0]
  let createdTempTab = false

  if (!targetTab) {
    targetTab = await chrome.tabs.create({
      url: `${normalizedBase}/?extensionAuth=1`,
      active: false
    })
    createdTempTab = true
  } else {
    const tabUrl = new URL(targetTab.url)
    if (tabUrl.searchParams.get('extensionAuth') !== '1') {
      await chrome.tabs.update(targetTab.id, {
        url: `${normalizedBase}/?extensionAuth=1`
      })
    }
  }

  if (!targetTab?.id) {
    throw new Error('unable_to_open_app_tab')
  }

  await waitForTabComplete(targetTab.id)

  await new Promise(resolve => setTimeout(resolve, 1000))

  const tabStatus = await chrome.tabs.get(targetTab.id).catch(() => null)
  if (!tabStatus) {
    throw new Error('tab_not_found')
  }

  if (tabStatus.status !== 'complete' || !tabStatus.url) {
    throw new Error('tab_not_ready')
  }

  try {
    const url = new URL(tabStatus.url)
    if (url.protocol === 'chrome-error:' || url.protocol === 'chrome-extension-error:' || url.protocol === 'about:') {
      if (createdTempTab) {
        chrome.tabs.remove(targetTab.id, () => {})
      }
      throw new Error(`error_page_detected: ${tabStatus.url}`)
    }
  } catch (urlErr) {
    if (urlErr.message?.startsWith('error_page_detected')) {
      throw urlErr
    }
    throw new Error('invalid_url')
  }

  try {
    await chrome.scripting.executeScript({
      target: { tabId: targetTab.id },
      files: ['appBridge.js']
    })
  } catch (err) {
    if (err.message?.includes('error page') || err.message?.includes('Frame') || err.message?.includes('frameId')) {
      if (createdTempTab) {
        chrome.tabs.remove(targetTab.id, () => {})
      }
      throw new Error(`cannot_inject_into_error_page: ${tabStatus.url}. Please check if ${normalizedBase} is accessible.`)
    }
    throw err
  }

  await new Promise(resolve => setTimeout(resolve, 500))

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

  if (response.error === 'not_authenticated') {
    if (createdTempTab) {
      chrome.tabs.update(targetTab.id, { active: true })
    }
    if (retries > 0) {
      await new Promise(resolve => setTimeout(resolve, 2000))
      return requestTokenViaApp(retries - 1)
    }
  }

  throw new Error(response.error || 'token_request_failed')
    } finally {
      tokenRequestInProgress = false
      tokenRequestPromise = null
    }
  })()
  
  return tokenRequestPromise
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
  // Preserve existing settings when updating token
  const current = await chrome.storage.sync.get()
  await chrome.storage.sync.set({ 
    ...current,
    token: freshToken, 
    tokenFetchedAt: Date.now() 
  })
  return freshToken
}

const clearStoredToken = async () => {
  // Preserve existing settings when clearing token
  const current = await chrome.storage.sync.get()
  await chrome.storage.sync.set({ 
    ...current,
    token: '', 
    tokenFetchedAt: 0 
  })
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
    const isSilent = Boolean(msg.silent)
    
    if (isSilent) {
      chrome.storage.sync.get({
        token: '',
        tokenFetchedAt: 0
      }).then(({ token, tokenFetchedAt }) => {
        if (token && Date.now() - tokenFetchedAt < TOKEN_TTL_MS) {
          sendResponse({ ok: true, token })
        } else {
          sendResponse({ ok: false, error: 'not_authenticated' })
        }
      }).catch(() => {
        sendResponse({ ok: false, error: 'not_authenticated' })
      })
      return true
    }
    
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

const handleExtensionAuthTab = async (tabId) => {
  try {
    const tabStatus = await chrome.tabs.get(tabId).catch(() => null)
    if (!tabStatus || tabStatus.status !== 'complete' || !tabStatus.url) {
      return false
    }

    try {
      const url = new URL(tabStatus.url)
      if (url.protocol === 'chrome-error:' || url.protocol === 'chrome-extension-error:' || url.protocol === 'about:') {
        return false
      }
    } catch {
      return false
    }

    const injected = await chrome.scripting.executeScript({
      target: { tabId },
      files: ['appBridge.js']
    }).catch(() => null)
    
    if (!injected) return false
    
    await new Promise(resolve => setTimeout(resolve, 2000))
    
    let attempts = 0
    const maxAttempts = 8
    
    const tryGetToken = async () => {
      attempts++
      const response = await new Promise((resolve) => {
        chrome.tabs.sendMessage(
          tabId,
          { type: 'REQUEST_TOKEN_FROM_PAGE' },
          (res) => {
            if (chrome.runtime.lastError) {
              resolve({ ok: false, error: chrome.runtime.lastError.message })
              return
            }
            resolve(res || { ok: false, error: 'no_response' })
          }
        )
      })

        if (response?.ok && response.token) {
          // Preserve existing settings when updating token
          const current = await chrome.storage.sync.get()
          await chrome.storage.sync.set({ 
            ...current,
            token: response.token, 
            tokenFetchedAt: Date.now() 
          })
          console.log('Extension: Token successfully obtained and stored')
          return true
        }
      
      if (response?.error === 'not_authenticated' && attempts < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, 1500))
        return tryGetToken()
      }
      
      return false
    }
    
    return await tryGetToken()
  } catch (err) {
    console.warn('Auto-retry token request failed:', err)
    return false
  }
}

chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  if (changeInfo.status !== 'complete' || !tab?.url) return
  
  try {
    const url = new URL(tab.url)
    if (url.searchParams.get('extensionAuth') !== '1') return
    
    const { appBase } = await chrome.storage.sync.get({ appBase: DEFAULTS.appBase })
    const normalizedBase = normalizeBaseUrl(appBase)
    if (!tab.url.startsWith(normalizedBase)) return
    
    setTimeout(() => handleExtensionAuthTab(tabId), 2000)
  } catch (err) {
    // Ignore invalid URLs
  }
})
