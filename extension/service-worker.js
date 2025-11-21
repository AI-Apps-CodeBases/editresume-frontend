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

const migrateStagingToProduction = async () => {
  const current = await chrome.storage.sync.get()
  const updates = {}
  
  const hasStagingAppBase = current.appBase && (
    current.appBase.includes('staging.editresume.io') ||
    current.appBase.includes('localhost')
  )
  
  const hasStagingApiBase = current.apiBase && (
    current.apiBase.includes('staging.editresume.io') ||
    current.apiBase.includes('editresume-staging.onrender.com') ||
    current.apiBase.includes('localhost')
  )
  
  const hasProductionAppBase = current.appBase && 
    current.appBase.includes('editresume.io') && 
    !current.appBase.includes('staging')
  
  if (hasStagingAppBase || !current.appBase || !hasProductionAppBase) {
    updates.appBase = DEFAULTS.appBase
    updates.apiBase = getApiBaseFromAppBase(DEFAULTS.appBase)
  } else if (hasStagingApiBase || !current.apiBase) {
    const appBase = current.appBase || DEFAULTS.appBase
    updates.apiBase = getApiBaseFromAppBase(appBase)
  }
  
  if (Object.keys(updates).length > 0) {
    await chrome.storage.sync.set(updates)
    console.log('Extension: Force-migrated to production URLs:', updates)
    return true
  }
  return false
}

chrome.runtime.onInstalled.addListener(async () => {
  const current = await chrome.storage.sync.get()
  const next = { ...DEFAULTS }
  let needsUpdate = false
  let needsMigration = false

  const hasStagingAppBase = current.appBase && (
    current.appBase.includes('staging.editresume.io') ||
    current.appBase.includes('localhost')
  )
  
  const hasStagingApiBase = current.apiBase && (
    current.apiBase.includes('staging.editresume.io') ||
    current.apiBase.includes('editresume-staging.onrender.com') ||
    current.apiBase.includes('localhost')
  )

  if (hasStagingAppBase || !current.appBase) {
    next.appBase = DEFAULTS.appBase
    needsMigration = true
    needsUpdate = true
  } else {
    next.appBase = current.appBase
  }
  
  if (hasStagingApiBase || !current.apiBase || needsMigration) {
    next.apiBase = getApiBaseFromAppBase(next.appBase || DEFAULTS.appBase)
    needsUpdate = true
  }

  if (needsUpdate) {
    await chrome.storage.sync.set(next)
    console.log('Extension: Force-set production defaults:', next)
  }
})

chrome.runtime.onStartup.addListener(async () => {
  await migrateStagingToProduction()
})

migrateStagingToProduction()

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
  
  if (resolvedAppBase.includes('staging.editresume.io') || resolvedAppBase.includes('localhost')) {
    resolvedAppBase = DEFAULTS.appBase
    await chrome.storage.sync.set({ 
      appBase: DEFAULTS.appBase,
      apiBase: getApiBaseFromAppBase(DEFAULTS.appBase)
    })
  }
  
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

  try {
    await chrome.scripting.executeScript({
      target: { tabId: targetTab.id },
      files: ['appBridge.js']
    })
  } catch (err) {
    console.warn('Failed to inject appBridge.js', err)
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

const handleExtensionAuthTab = async (tabId) => {
  try {
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
          await chrome.storage.sync.set({ 
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
