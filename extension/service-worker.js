const DEFAULTS = {
  appBase: 'https://editresume.io',
  token: '',
  tokenFetchedAt: 0
}

const TOKEN_TTL_MS = 45 * 60 * 1000 // 45 minutes

// Guards to prevent multiple tab creation
let tabCreationInProgress = false
let processingTabs = new Set() // Track tabs being processed by handleExtensionAuthTab
let tokenRefreshInProgress = false // Prevent multiple simultaneous token refresh calls

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
  
  // Only set defaults if no settings exist - don't override user's staging settings
  if (!current.appBase) {
    const defaults = {
      ...current, // Preserve existing keys
      appBase: DEFAULTS.appBase,
      apiBase: getApiBaseFromAppBase(DEFAULTS.appBase)
    }
    await chrome.storage.sync.set(defaults)
  } else if (!current.apiBase) {
    // If appBase exists but apiBase doesn't, derive it from appBase
    const updated = {
      ...current, // Preserve existing keys
      apiBase: getApiBaseFromAppBase(current.appBase)
    }
    await chrome.storage.sync.set(updated)
  }
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

const requestTokenViaApp = async (retries = 3) => {
  const { appBase } = await chrome.storage.sync.get({ appBase: DEFAULTS.appBase })
  let resolvedAppBase = appBase || DEFAULTS.appBase
  
  const normalizedBase = normalizeBaseUrl(resolvedAppBase)
  const urlPattern = `${normalizedBase}/*`

  // Always check for existing tabs first, even on retries
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

  // Only create a new tab if:
  // 1. No existing tab found
  // 2. No tab creation is already in progress
  if (!targetTab && !tabCreationInProgress) {
    tabCreationInProgress = true
    try {
      targetTab = await chrome.tabs.create({
        url: `${normalizedBase}/?extensionAuth=1`,
        active: false
      })
      createdTempTab = true
      console.log('Extension: Created auth tab', targetTab.id)
    } finally {
      tabCreationInProgress = false
    }
  } else if (!targetTab && tabCreationInProgress) {
    // Wait for the in-progress tab creation to complete
    console.log('Extension: Tab creation in progress, waiting...')
    let waitAttempts = 0
    while (tabCreationInProgress && waitAttempts < 10) {
      await new Promise(resolve => setTimeout(resolve, 500))
      const checkTabs = await chrome.tabs.query({ url: urlPattern })
      targetTab = checkTabs.find(tab => {
        try {
          const url = new URL(tab.url)
          return url.searchParams.get('extensionAuth') === '1'
        } catch {
          return false
        }
      })
      if (targetTab) break
      waitAttempts++
    }
    if (!targetTab) {
      throw new Error('Tab creation timeout - another process may be creating a tab')
    }
  } else if (targetTab) {
    // Reuse existing tab - update URL if needed
    const tabUrl = new URL(targetTab.url)
    if (tabUrl.searchParams.get('extensionAuth') !== '1') {
      await chrome.tabs.update(targetTab.id, {
        url: `${normalizedBase}/?extensionAuth=1`
      })
    }
    console.log('Extension: Reusing existing auth tab', targetTab.id)
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
      // On retry, reuse the existing tab instead of creating a new one
      await new Promise(resolve => setTimeout(resolve, 2000))
      // Pass the existing tab ID to avoid creating a new tab
      return requestTokenViaApp(retries - 1)
    }
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

  // Prevent multiple simultaneous token refresh calls
  if (tokenRefreshInProgress) {
    console.log('Extension: Token refresh already in progress, waiting...')
    // Wait for the in-progress refresh to complete
    let waitAttempts = 0
    while (tokenRefreshInProgress && waitAttempts < 20) {
      await new Promise(resolve => setTimeout(resolve, 500))
      const current = await chrome.storage.sync.get({ token: '', tokenFetchedAt: 0 })
      // Check if token was refreshed by the other call
      if (current.token && current.tokenFetchedAt > tokenFetchedAt) {
        return current.token
      }
      waitAttempts++
    }
    // If still in progress after waiting, proceed anyway to avoid deadlock
    if (tokenRefreshInProgress) {
      console.warn('Extension: Token refresh timeout, proceeding anyway')
    }
  }

  tokenRefreshInProgress = true
  try {
    const freshToken = await requestTokenViaApp()
    // Preserve existing settings when updating token
    const current = await chrome.storage.sync.get()
    await chrome.storage.sync.set({ 
      ...current,
      token: freshToken, 
      tokenFetchedAt: Date.now() 
    })
    return freshToken
  } finally {
    tokenRefreshInProgress = false
  }
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
  // Prevent multiple simultaneous processing of the same tab
  if (processingTabs.has(tabId)) {
    console.log('Extension: Tab', tabId, 'already being processed, skipping')
    return false
  }

  processingTabs.add(tabId)
  
  try {
    const tabStatus = await chrome.tabs.get(tabId).catch(() => null)
    if (!tabStatus || tabStatus.status !== 'complete' || !tabStatus.url) {
      processingTabs.delete(tabId)
      return false
    }

    try {
      const url = new URL(tabStatus.url)
      if (url.protocol === 'chrome-error:' || url.protocol === 'chrome-extension-error:' || url.protocol === 'about:') {
        processingTabs.delete(tabId)
        return false
      }
    } catch {
      processingTabs.delete(tabId)
      return false
    }

    const injected = await chrome.scripting.executeScript({
      target: { tabId },
      files: ['appBridge.js']
    }).catch(() => null)
    
    if (!injected) {
      processingTabs.delete(tabId)
      return false
    }
    
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
        processingTabs.delete(tabId)
        return true
      }
      
      if (response?.error === 'not_authenticated' && attempts < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, 1500))
        return tryGetToken()
      }
      
      processingTabs.delete(tabId)
      return false
    }
    
    return await tryGetToken()
  } catch (err) {
    console.warn('Auto-retry token request failed:', err)
    processingTabs.delete(tabId)
    return false
  }
}

// Debounce timer for tab updates
const tabUpdateTimers = new Map()

chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  if (changeInfo.status !== 'complete' || !tab?.url) return
  
  try {
    const url = new URL(tab.url)
    if (url.searchParams.get('extensionAuth') !== '1') return
    
    const { appBase } = await chrome.storage.sync.get({ appBase: DEFAULTS.appBase })
    const normalizedBase = normalizeBaseUrl(appBase)
    if (!tab.url.startsWith(normalizedBase)) return
    
    // Clear existing timer for this tab if any
    if (tabUpdateTimers.has(tabId)) {
      clearTimeout(tabUpdateTimers.get(tabId))
    }
    
    // Debounce: only process after 2 seconds of no updates
    const timer = setTimeout(() => {
      tabUpdateTimers.delete(tabId)
      // Only process if tab is not already being processed
      if (!processingTabs.has(tabId)) {
        handleExtensionAuthTab(tabId)
      }
    }, 2000)
    
    tabUpdateTimers.set(tabId, timer)
  } catch (err) {
    // Ignore invalid URLs
  }
})
