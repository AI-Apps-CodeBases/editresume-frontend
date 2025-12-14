let savedJDs = [];
let currentJdId = null;

const EXTENSION_AUTH_ERROR = 'not_authenticated';

async function ensureAuthToken({ silent = false, forceRefresh = false } = {}) {
  try {
    const response = await chrome.runtime.sendMessage({
      type: 'GET_FIREBASE_TOKEN',
      forceRefresh,
      silent
    });
    if (response?.ok && response.token) {
      return response.token;
    }
    if (response?.error === EXTENSION_AUTH_ERROR) {
      if (!silent) {
        throw new Error('Please sign in to editresume.io first.');
      }
      return null;
    }
    if (!silent) {
      throw new Error(response?.error || 'Authentication failed');
    }
    return null;
  } catch (error) {
    if (!silent) {
      throw error;
    }
    return null;
  }
}

async function resolveApiBase() {
  const { appBase, apiBase } = await chrome.storage.sync.get({ 
    appBase: 'https://editresume.io', 
    apiBase: 'https://editresume-api-prod.onrender.com'
  });
  
  if (apiBase && apiBase.trim()) {
    const resolved = apiBase.trim().replace(/\/$/, '');
    console.log('Extension: Using explicit apiBase:', resolved);
    return resolved;
  }
  
  let derived = 'https://editresume-api-prod.onrender.com';
  
  if (appBase && appBase.includes('localhost')) {
    if (appBase.includes('localhost:3000')) {
      derived = 'http://localhost:8000';
    } else if (appBase.includes('localhost:8000')) {
      derived = appBase.replace(/\/$/, '');
    } else {
      derived = 'http://localhost:8000';
    }
  } else if (appBase && appBase.includes('staging.editresume.io')) {
    derived = 'https://editresume-staging.onrender.com';
  } else if (appBase && appBase.includes('editresume.io') && !appBase.includes('staging')) {
    derived = 'https://editresume-api-prod.onrender.com';
  }
  
  console.log('Extension: Using derived apiBase from appBase:', derived, '(appBase:', appBase, ')');
  return derived;
}

async function fetchWithRetry(url, options = {}, maxRetries = 3) {
  let lastError;
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const response = await fetch(url, options);
      
      if (response.ok) {
        return response;
      }
      
      if (response.status === 429 || response.status >= 500) {
        const isLastAttempt = attempt === maxRetries - 1;
        if (isLastAttempt) {
          return response;
        }
        
        const delay = Math.min(1000 * Math.pow(2, attempt) + Math.random() * 1000, 10000);
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
      
      return response;
    } catch (error) {
      lastError = error;
      const isLastAttempt = attempt === maxRetries - 1;
      if (isLastAttempt) {
        throw error;
      }
      
      if (error.message?.includes('throttl') || error.message?.includes('Failed to fetch')) {
        const delay = Math.min(1000 * Math.pow(2, attempt) + Math.random() * 1000, 10000);
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
      
      throw error;
    }
  }
  
  throw lastError || new Error('Request failed after retries');
}

function cleanCompanyName(value) {
  if (!value) return '';
  let result = value.replace(/\s+/g, ' ').trim();
  result = result.replace(/\bcompany\s+logo\b/gi, '');
  result = result.replace(/\blogo\b/gi, '');
  result = result.replace(/\bfollow\b/gi, '');
  result = result.replace(/\bsee all.*$/i, '');
  result = result.replace(/\bcompany page\b/gi, '');
  result = result.replace(/\bcompany profile\b/gi, '');
  result = result.replace(/\s{2,}/g, ' ').trim();
  if (result.endsWith(',')) {
    result = result.slice(0, -1).trim();
  }
  return result;
}

async function getActiveTabId() {
  const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
  return tabs?.[0]?.id;
}

async function extractViaScript(tabId) {
  const [{ result }] = await chrome.scripting.executeScript({
    target: { tabId },
    func: () => {
      const qs = (sel) => document.querySelector(sel);
      const qsAll = (sel) => Array.from(document.querySelectorAll(sel));
      const text = (el) => (el ? el.textContent.trim() : '');

      const SELECTORS = {
        title: [
          // Modern LinkedIn selectors
          'h1.jobs-unified-top-card__job-title',
          'h1.job-details-jobs-unified-top-card__job-title',
          'h1.topcard__title',
          'h1[class*="job-title"]',
          'h1[class*="JobTitle"]',
          '.jobs-details-top-card__job-title',
          '.jobs-details-top-card__job-title-link',
          '.jobs-unified-top-card__job-title-link',
          'h1'
        ],
        company: [
          // Modern LinkedIn selectors
          'a.jobs-unified-top-card__company-name',
          'a.job-details-jobs-unified-top-card__company-name',
          'a.topcard__org-name-link',
          '.jobs-unified-top-card__company-name',
          '.jobs-details-top-card__company-name',
          'a[class*="company-name"]',
          'a[href*="/company/"]',
          '.jobs-company__box a',
          'a[data-tracking-control-name="public_jobs_topcard-org-name"]',
          '[data-tracking-control-name="public_jobs_topcard-org-name"]',
          '.jobs-unified-top-card__company-name a',
          '.jobs-unified-top-card__primary-description-without-tagline a'
        ],
        description: [
          '#job-details',
          '.jobs-description__container',
          '.jobs-description-content__text',
          '[id*="job-details"]',
          '.jobs-description',
          '.show-more-less-html__markup',
          '.jobs-box__html-content'
        ],
        easyApply: [
          'a[data-control-name="jobdetails_topcard_inapply"]',
          'a[data-control-name="jobdetails_topcard_apply"]',
          'button[data-control-name="jobdetails_topcard_inapply"]',
          'button[data-control-name="jobdetails_topcard_apply"]',
          '.jobs-apply-button',
          'a.jobs-apply-button',
          'button.jobs-apply-button',
          'a[href*="/jobs/apply/"]',
          'button[aria-label*="Easy Apply"]',
          'button[aria-label*="Apply"]'
        ]
      };

      function extractEasyApplyUrl() {
        const currentUrl = location.href;

        // First, try to extract job ID from current URL
        let jobId = null;
        const jobIdMatch = currentUrl.match(/\/jobs\/view\/(\d+)/);
        if (jobIdMatch) {
          jobId = jobIdMatch[1];
        }

        // First, try to find buttons/links with "Easy Apply" text
        const allButtons = qsAll('button, a');
        for (const btn of allButtons) {
          const text = btn.textContent?.trim() || '';
          const ariaLabel = btn.getAttribute('aria-label') || '';
          if ((text.toLowerCase().includes('easy apply') || ariaLabel.toLowerCase().includes('easy apply')) &&
            !text.toLowerCase().includes('save') && !text.toLowerCase().includes('follow')) {
            // Check if it's a link
            if (btn.tagName === 'A' && btn.href) {
              if (btn.href.includes('/jobs/apply/') || btn.href.includes('linkedin.com')) {
                return btn.href; // Keep full URL
              }
            }
            // Check if button has data attributes
            if (btn.dataset.href) {
              return btn.dataset.href; // Keep full URL
            }
            // Check parent for link
            const parentLink = btn.closest('a');
            if (parentLink && parentLink.href) {
              if (parentLink.href.includes('/jobs/apply/') || parentLink.href.includes('linkedin.com')) {
                return parentLink.href; // Keep full URL
              }
            }
          }
        }

        // Try multiple selectors for Easy Apply button
        for (const sel of SELECTORS.easyApply) {
          const el = qs(sel);
          if (el) {
            // Check if it's a link with direct href
            if (el.tagName === 'A' && el.href) {
              // If href contains /jobs/apply/, use it directly (preserve full URL)
              if (el.href.includes('/jobs/apply/')) {
                return el.href; // Keep full URL
              }
              // If it's a different LinkedIn URL, try to extract job ID from it
              const hrefMatch = el.href.match(/\/jobs\/view\/(\d+)/);
              if (hrefMatch) {
                return `https://www.linkedin.com/jobs/apply/${hrefMatch[1]}`;
              }
            }

            // Check if it's a button
            if (el.tagName === 'BUTTON') {
              // Check if button has a link as child or sibling
              const link = el.querySelector('a[href*="/jobs/apply/"]') ||
                el.parentElement?.querySelector('a[href*="/jobs/apply/"]');
              if (link && link.href) {
                return link.href; // Keep full URL
              }

              // Try to find link in parent container
              const container = el.closest('[class*="apply"], [class*="topcard"]');
              if (container) {
                const link = container.querySelector('a[href*="/jobs/apply/"]') ||
                  container.querySelector('a[href*="linkedin.com/jobs"]');
                if (link && link.href) {
                  if (link.href.includes('/jobs/apply/')) {
                    return link.href; // Keep full URL
                  }
                  const hrefMatch = link.href.match(/\/jobs\/view\/(\d+)/);
                  if (hrefMatch) {
                    return `https://www.linkedin.com/jobs/apply/${hrefMatch[1]}`;
                  }
                }
              }

              // Check data attributes
              if (el.dataset.href) {
                const dataUrl = el.dataset.href;
                if (dataUrl.includes('/jobs/apply/')) {
                  return dataUrl; // Keep full URL
                }
              }
            }
          }
        }

        // Try to find job ID in page data/metadata
        if (!jobId) {
          // Check for job ID in meta tags
          const metaJobId = qs('meta[property="og:url"], meta[name="og:url"]');
          if (metaJobId && metaJobId.content) {
            const metaMatch = metaJobId.content.match(/\/jobs\/view\/(\d+)/);
            if (metaMatch) {
              jobId = metaMatch[1];
            }
          }

          // Check for job ID in data attributes
          const jobCard = qs('[data-job-id], [data-jobid], [data-entity-urn*="job"]');
          if (jobCard) {
            const dataJobId = jobCard.dataset.jobId || jobCard.dataset.jobid;
            if (dataJobId) {
              jobId = dataJobId;
            } else if (jobCard.dataset.entityUrn) {
              const urnMatch = jobCard.dataset.entityUrn.match(/job:(\d+)/);
              if (urnMatch) {
                jobId = urnMatch[1];
              }
            }
          }
        }

        // Final fallback: construct Easy Apply URL from job ID
        if (jobId) {
          return `https://www.linkedin.com/jobs/apply/${jobId}`;
        }

        // Last resort: try to extract from any apply-related links on the page
        const allApplyLinks = qsAll('a[href*="apply"], a[href*="jobs"]');
        for (const link of allApplyLinks) {
          if (link.href.includes('/jobs/apply/')) {
            return link.href; // Keep full URL
          }
          const match = link.href.match(/\/jobs\/view\/(\d+)/);
          if (match) {
            return `https://www.linkedin.com/jobs/apply/${match[1]}`;
          }
        }

        return '';
      }

      let title = '';
      for (const sel of SELECTORS.title) {
        const el = qs(sel);
        if (el && text(el)) {
          title = text(el);
          break;
        }
      }

      let company = '';

      // Try multiple approaches to extract company name
      // Method 1: Standard selectors (most reliable)
      for (const sel of SELECTORS.company) {
        try {
          const el = qs(sel);
          if (el) {
            const txt = text(el);
            const cleanText = txt.replace(/\s+/g, ' ').trim();
            if (cleanText && cleanText.length > 0 && cleanText.length < 100 &&
              !cleanText.includes('·') && !cleanText.includes('|') &&
              !cleanText.toLowerCase().includes('view') &&
              !cleanText.toLowerCase().includes('follow')) {
              company = cleanText;
              break;
            }
          }
        } catch (e) {
          continue;
        }
      }

      // Method 2: Look in top card area (most reliable location)
      if (!company) {
        try {
          const topCard = qs('.jobs-unified-top-card, .topcard, .job-details-jobs-unified-top-card');
          if (topCard) {
            // Look for company link first
            const companyLink = topCard.querySelector('a[href*="/company/"]');
            if (companyLink) {
              const txt = text(companyLink);
              const cleanText = txt.replace(/\s+/g, ' ').trim();
              if (cleanText && cleanText.length > 0 && cleanText.length < 100 &&
                !cleanText.includes('·') && !cleanText.includes('|')) {
                company = cleanText;
              }
            }
            // Then try company name spans
            if (!company) {
              const companySpan = topCard.querySelector('.jobs-unified-top-card__company-name, .job-details-jobs-unified-top-card__company-name');
              if (companySpan) {
                const txt = text(companySpan);
                const cleanText = txt.replace(/\s+/g, ' ').trim();
                if (cleanText && cleanText.length > 0 && cleanText.length < 100) {
                  company = cleanText;
                }
              }
            }
          }
        } catch (e) { }
      }

      // Method 3: Look for all company links and filter
      if (!company) {
        try {
          const companyLinks = qsAll('a[href*="/company/"]');
          for (const link of companyLinks) {
            const txt = text(link);
            const cleanText = txt.replace(/\s+/g, ' ').trim();
            // Filter out navigation links, follow buttons, etc.
            if (cleanText && cleanText.length > 0 && cleanText.length < 100 &&
              !cleanText.includes('·') && !cleanText.includes('|') &&
              !cleanText.toLowerCase().includes('view') &&
              !cleanText.toLowerCase().includes('follow') &&
              !cleanText.toLowerCase().includes('company page') &&
              cleanText.match(/^[A-Za-z0-9\s&.,\-]+$/)) {
              company = cleanText;
              break;
            }
          }
        } catch (e) { }
      }

      // Method 4: Look in job details header
      if (!company) {
        try {
          const jobDetailsCard = qs('.jobs-details-top-card, .job-details-jobs-unified-top-card');
          if (jobDetailsCard) {
            const companyEl = jobDetailsCard.querySelector('a[href*="/company/"], .jobs-details-top-card__company-name');
            if (companyEl) {
              const txt = text(companyEl);
              const cleanText = txt.replace(/\s+/g, ' ').trim();
              if (cleanText && cleanText.length > 0 && cleanText.length < 100) {
                company = cleanText;
              }
            }
          }
        } catch (e) { }
      }

      // Method 5: Look for data attributes
      if (!company) {
        try {
          const orgLink = qs('[data-tracking-control-name="public_jobs_topcard-org-name"], [data-tracking-control-name*="org-name"]');
          if (orgLink) {
            const txt = text(orgLink) || orgLink.getAttribute('aria-label') || '';
            const cleanText = txt.replace(/\s+/g, ' ').trim();
            if (cleanText && cleanText.length > 0 && cleanText.length < 100) {
              company = cleanText;
            }
          }
        } catch (e) { }
      }

      let descNode = null;
      for (const sel of SELECTORS.description) {
        descNode = qs(sel);
        if (descNode) break;
      }

      const content = descNode ? descNode.innerText.trim() : '';
      const url = window.location.href.split('?')[0];
      const easyApplyUrl = extractEasyApplyUrl();

      // Try to extract location for better work type detection
      let extractedLocation = '';
      try {
        const locationSelectors = [
          // Primary location selectors
          '.jobs-unified-top-card__primary-description-without-tagline',
          '.job-details-jobs-unified-top-card__primary-description-without-tagline',
          '.jobs-unified-top-card__bullet',
          '.job-details-jobs-unified-top-card__bullet',
          '[data-tracking-control-name="public_jobs_topcard_location"]',
          '.topcard__flavor--bullet',
          '.jobs-details-top-card__job-insight',
          '.jobs-details-top-card__job-insight-text',
          // Look for location in job insights
          '.jobs-unified-top-card__job-insight',
          '.job-details-jobs-unified-top-card__job-insight',
          '.jobs-unified-top-card__job-insight-text',
          '.jobs-unified-top-card__secondary-description'
        ];

        // Try selectors first
        for (const sel of locationSelectors) {
          try {
            const el = qs(sel);
            if (el) {
              const locText = text(el);
              // Match location patterns: "City, State", "Remote", "Hybrid", "On-site", "Country (Remote)"
              // Examples: "United States (Remote)", "New York, NY", "Remote", "Hybrid"
              if (locText && (
                locText.match(/\(Remote\)|\(Hybrid\)|\(On-site\)/i) || // "(Remote)" pattern
                locText.includes('Remote') || locText.includes('Hybrid') || locText.includes('On-site') ||
                locText.match(/\b[A-Z][a-z]+,?\s+[A-Z]{2}\b/) || // "City, State" pattern
                locText.match(/\b(United States|USA|Canada|UK|Australia|Germany|France|India|China|Netherlands|Spain|Italy|Brazil|Mexico|Japan|South Korea)\b/i) ||
                locText.match(/[A-Z][a-z]+,\s+[A-Z][a-z]+/i) // "City, Country" pattern
              )) {
                extractedLocation = locText;
                break;
              }
            }
          } catch (e) {
            continue;
          }
        }

        // Fallback: Look for location in job insights container
        if (!extractedLocation) {
          try {
            const insightsContainer = qs('.jobs-unified-top-card__job-insights, .job-details-jobs-unified-top-card__job-insights');
            if (insightsContainer) {
              const allText = text(insightsContainer);
              // Look for location pattern in the text
              const locationMatch = allText.match(/([A-Z][a-z]+,?\s+[A-Z]{2}|United States|USA|Canada|UK|Australia)[^·]*?(Remote|Hybrid|On-site)?/i);
              if (locationMatch) {
                extractedLocation = locationMatch[0].trim();
              }
            }
          } catch (e) { }
        }
      } catch (e) {
        // Ignore location extraction errors
      }

      if (company) {
        console.log('✅ Popup extracted Company:', company);
      } else {
        console.log('⚠️ Popup: No Company found');
      }

      if (extractedLocation) {
        console.log('✅ Popup extracted Location:', extractedLocation);
      }

      return { title, company, url, content, easyApplyUrl, location: extractedLocation };
    }
  });
  return result;
}

function extractJobType(text) {
  if (!text) return null;
  const lowerText = text.toLowerCase();

  // Check for contractor patterns (most specific first)
  if (/\bcontractor\b|\bcontract-to-hire\b|\bcontract basis\b/i.test(lowerText)) return 'Contractor';
  // Check for "contract" but not "contract with" or "contract between" (legal language)
  if (/\bcontract\b(?!\s+(?:with|between))|\btemporary\b|\btemp\b/i.test(lowerText)) return 'Contractor';

  // Check for part-time
  if (/\bpart.?time\b|\bpt\b/i.test(lowerText)) return 'Part-time';

  // Check for internship (with word boundaries to avoid "international", "internal")
  // Use negative lookahead to exclude "internal" and "international"
  if (/\bintern\b(?!al|ational)|\binternship\b/i.test(lowerText)) return 'Internship';

  // Check for full-time
  if (/\bfull.?time\b|\bft\b|\bpermanent\b/i.test(lowerText)) return 'Full Time';

  // Default to Full Time
  return 'Full Time';
}

function extractWorkType(text, locationText = '') {
  if (!text && !locationText) return null;

  // Combine text and location for analysis
  const combinedText = ((text || '') + ' ' + (locationText || '')).toLowerCase();

  // PRIORITY 1: Check for explicit patterns in location text FIRST (most reliable)
  if (locationText) {
    const locationLower = locationText.toLowerCase();
    // Check for explicit parentheses patterns
    if (locationLower.includes('(remote)') || locationLower.match(/\(remote\)/i) ||
      locationLower.match(/remote\)/i) || locationLower.trim().toLowerCase() === 'remote') {
      return 'Remote';
    }
    if (locationLower.includes('(hybrid)') || locationLower.match(/\(hybrid\)/i) ||
      locationLower.match(/hybrid\)/i)) {
      return 'Hybrid';
    }
    if (locationLower.includes('(on-site)') || locationLower.includes('(onsite)') ||
      locationLower.match(/\(on.?site\)/i) || locationLower.match(/on-site\)/i) ||
      locationLower.match(/onsite\)/i)) {
      return 'Onsite';
    }
    // Check for "Remote" or "Hybrid" as standalone words in location
    if (locationLower.trim() === 'remote' || locationLower.trim() === 'remote work') {
      return 'Remote';
    }
    if (locationLower.trim() === 'hybrid' || locationLower.trim() === 'hybrid work') {
      return 'Hybrid';
    }
  }

  // PRIORITY 2: Check job description text for explicit patterns
  if (text) {
    const textLower = text.toLowerCase();
    // Look for explicit remote indicators in job description
    if (/remote\s*work|work\s*remote|fully\s*remote|100%\s*remote|remote\s*position|remote\s*role/i.test(textLower)) {
      // Check if hybrid is also mentioned
      if (/hybrid|partially\s*remote|some\s*remote|flexible|2-3\s*days|3\s*days|few\s*days/i.test(textLower)) {
        return 'Hybrid';
      }
      return 'Remote';
    }

    // Look for hybrid indicators
    if (/hybrid|partially\s*remote|some\s*remote|flexible\s*remote|remote.*office|office.*remote|2-3\s*days\s*remote|3\s*days\s*remote|few\s*days\s*remote/i.test(textLower)) {
      return 'Hybrid';
    }

    // Look for on-site indicators (only if remote/hybrid not mentioned)
    if (/on.?site|on.?premise|on.?premises|in.?office|in.?person|at\s*office|in\s*office|office\s*based/i.test(textLower) &&
      !/remote|hybrid|work\s*from\s*home|wfh/i.test(textLower)) {
      return 'Onsite';
    }
  }

  // PRIORITY 3: Check combined text for general patterns
  if (/remote|work\s*from\s*home|wfh|fully\s*remote|work\s*remotely|remote\s*work|100%\s*remote|fully\s*distributed/i.test(combinedText)) {
    // Check if hybrid is also mentioned
    if (/hybrid|partially\s*remote|some\s*remote|flexible|2-3\s*days|3\s*days|few\s*days/i.test(combinedText)) {
      return 'Hybrid';
    }
    return 'Remote';
  }

  if (/hybrid|partially\s*remote|some\s*remote|flexible\s*remote|remote.*office|office.*remote|2-3\s*days\s*remote|3\s*days\s*remote|few\s*days\s*remote/i.test(combinedText)) {
    return 'Hybrid';
  }

  // Default to Onsite if no remote/hybrid indicators found
  return 'Onsite';
}

function extractCompanyHeadquarters(text, locationText = '', companyName = '') {
  // Extract company headquarters location - only call this if work_type is NOT Remote
  // Try multiple methods to find company headquarters

  let location = '';

  // Method 1: Look for company headquarters in job description
  if (text) {
    const headquartersPatterns = [
      /(?:headquartered|headquarters|based|located)\s+(?:in|at)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*,\s*[A-Z]{2}|[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/i,
      /(?:headquartered|headquarters|based|located)\s+(?:in|at)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/i,
      /\b(United States|USA|Canada|UK|United Kingdom|Australia|Germany|France|India|China|Netherlands|Spain|Italy|Brazil|Mexico|Japan|South Korea)\b/i
    ];

    for (const pattern of headquartersPatterns) {
      const match = text.match(pattern);
      if (match) {
        location = (match[1] || match[0]).trim();
        // Clean up the location
        location = location.replace(/[.,;:!?]$/, '').trim();
        if (location && location.length > 2) {
          break;
        }
      }
    }
  }

  // Method 2: Extract from locationText if it contains actual location (not just Remote/Hybrid)
  if (!location && locationText) {
    let cleaned = locationText
      .replace(/\(Remote\)/gi, '')
      .replace(/\(Hybrid\)/gi, '')
      .replace(/\(On-site\)/gi, '')
      .replace(/\(Onsite\)/gi, '')
      .replace(/\(Remote Work\)/gi, '')
      .replace(/\(Hybrid Work\)/gi, '')
      .replace(/\bRemote\b/gi, '')
      .replace(/\bHybrid\b/gi, '')
      .replace(/\bOn-site\b/gi, '')
      .replace(/\bOnsite\b/gi, '')
      .replace(/\s+/g, ' ')
      .trim();

    // Check if cleaned text has actual location (not empty or just work arrangement)
    if (cleaned && cleaned.length > 2 && !/^(remote|hybrid|on.?site|onsite)$/i.test(cleaned)) {
      // Try to extract city/state or country
      const cityStateMatch = cleaned.match(/([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*,\s*[A-Z]{2})/);
      if (cityStateMatch) {
        location = cityStateMatch[0].trim();
      } else {
        const countryMatch = cleaned.match(/\b(United States|USA|Canada|UK|United Kingdom|Australia|Germany|France|India|China|Netherlands|Spain|Italy|Brazil|Mexico|Japan|South Korea|Sweden|Norway|Denmark|Switzerland|Austria|Belgium|Poland|Singapore|Hong Kong|Taiwan|Ireland|New Zealand)\b/i);
        if (countryMatch) {
          location = countryMatch[0].trim();
        } else if (cleaned.length < 100) {
          location = cleaned;
        }
      }
    }
  }

  // Method 3: Look for office locations in job description
  if (!location && text) {
    const officePatterns = [
      /(?:office|offices|location)\s+(?:in|at|located\s+in)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*,\s*[A-Z]{2})/i,
      /([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*,\s*[A-Z]{2})/  // City, State pattern
    ];

    for (const pattern of officePatterns) {
      const matches = text.match(new RegExp(pattern.source, 'gi'));
      if (matches && matches.length > 0) {
        // Take the first valid location
        for (const match of matches) {
          const cleanMatch = match.replace(/(?:office|offices|location)\s+(?:in|at|located\s+in)\s+/i, '').trim();
          if (cleanMatch && cleanMatch.match(/^[A-Z][a-z]+/)) {
            location = cleanMatch;
            break;
          }
        }
        if (location) break;
      }
    }
  }

  // Final validation: Make sure location is not empty and not a work arrangement keyword
  if (location) {
    location = location.trim();
    if (location.length < 2 || /^(remote|hybrid|on.?site|onsite|work|from|home)$/i.test(location)) {
      location = '';
    }
  }

  return location;
}

function extractBudget(text) {
  if (!text) return null;
  const rangePatterns = [
    /\$[\d,]+(?:k|K)?\s*[-–—]\s*\$?[\d,]+(?:k|K)?(?:\s*(?:per|\/)\s*(?:year|yr|annum))?/gi,
    /\$[\d,]+(?:k|K)?\s+to\s+\$?[\d,]+(?:k|K)?(?:\s*(?:per|\/)\s*(?:year|yr|annum))?/gi,
  ];
  for (const pattern of rangePatterns) {
    const match = text.match(pattern);
    if (match && match.length > 0) {
      const clean = match[0].replace(/\s+/g, ' ').trim();
      if (clean.includes('$') && (clean.includes('-') || clean.includes('–') || clean.includes('to'))) {
        return clean;
      }
    }
  }
  return null;
}

const STOP_WORDS = new Set([
  'the', 'and', 'for', 'with', 'from', 'your', 'our', 'you', 'will', 'can', 'able', 'work', 'team', 'role',
  'company', 'their', 'have', 'has', 'had', 'including', 'include', 'includes', 'across', 'within', 'through',
  'should', 'must', 'could', 'would', 'also', 'ensure', 'ensuring', 'using', 'use', 'make', 'least', 'year',
  'years', 'plus', 'nice', 'preferred', 'strong', 'excellent', 'great', 'good', 'fast', 'paced', 'environment',
  'responsible', 'responsibilities', 'requirements', 'requirement', 'qualification', 'qualifications', 'skills',
  'experience', 'experiences', 'deliver', 'delivering', 'support', 'supporting', 'drive', 'driving', 'focus',
  'focused', 'primary', 'duty', 'duties', 'candidate', 'candidates', 'looking', 'level', 'levels', 'new',
  'existing', 'project', 'projects', 'manage', 'managing', 'management', 'manager', 'leadership', 'business',
  'services', 'solutions', 'acumen', 'per', 'cent', 'percent', 'global', 'client', 'clients', 'customer',
  'customers', 'stakeholders', 'stakeholder', 'partners', 'partner', 'teams', 'member', 'members', 'other',
  'others', 'various', 'variety', 'multiple', 'different', 'across',
  // Additional generic job posting words
  'opportunity', 'opportunities', 'position', 'positions', 'join', 'seeking', 'hiring', 'apply', 'applicant',
  'applicants', 'job', 'jobs', 'career', 'careers', 'employment', 'employed', 'employee', 'employees',
  'description', 'posting', 'opening', 'openings', 'vacancy', 'vacancies', 'offer', 'offers', 'provide',
  'provides', 'providing', 'day', 'days', 'week', 'weeks', 'month', 'months', 'time', 'times', 'people',
  'person', 'individual', 'individuals', 'successful', 'success', 'successful', 'ideal', 'perfect', 'best',
  'top', 'leading', 'premier', 'world', 'class', 'award', 'winning', 'innovative', 'dynamic', 'growing',
  'established', 'well', 'known', 'recognized', 'industry', 'industries', 'sector', 'sectors', 'field', 'fields'
]);

const NOISE_PATTERNS = [
  /^\d+$/, /^\d+(?:\+|%|k)$/, /^experience$/, /^years?$/, /^strong$/, /^excellent$/, /^related$/, /^relevant$/,
  /^must$/, /^should$/, /^ability$/, /^capability$/
];

const SECTION_HINTS = [
  { pattern: /(responsibil|you will|day[- ]to[- ]day|what you['’]ll do|in this role)/i, weight: 0.75 },
  { pattern: /(requirements|qualifications|must have|you['’]ll need|ideal candidate|who you are)/i, weight: 2.0 }, // Increased from 1.1
  { pattern: /(skills|technical|experience|stack|technology|technologies)/i, weight: 1.5 }, // Increased from 1.0
  { pattern: /(preferred|nice to have|bonus|good to have)/i, weight: 0.4 }
];

const MAX_KEYWORD_RESULTS = 20; // Reduced from 40 for more focused ATS-relevant keywords

function normalizeToken(token) {
  if (!token) return '';
  return token
    .toLowerCase()
    .replace(/^[^a-z0-9+#/&]+/, '')
    .replace(/[^a-z0-9+#/&]+$/, '');
}

function shouldSkipTerm(term) {
  if (!term) return true;
  if (term.length < 3) return true;
  if (STOP_WORDS.has(term)) return true;
  return NOISE_PATTERNS.some((regex) => regex.test(term));
}

function shouldSkipPhrase(phrase) {
  if (!phrase) return true;
  const words = phrase.split(' ');
  if (words.length < 2) return false;
  const meaningful = words.filter((word) => !STOP_WORDS.has(word));
  return meaningful.length === 0;
}

function formatKeyword(term) {
  if (!term) return term;
  return term.split(' ').map((segment) => {
    if (!segment) return segment;
    if (segment.length <= 3 && /[a-z]/.test(segment) === false) {
      return segment.toUpperCase();
    }
    if (/^[a-z0-9]+[+/][a-z0-9]+$/.test(segment)) {
      const separator = segment.includes('/') ? '/' : '+';
      return segment.split(separator).map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(separator);
    }
    if (/^[a-z]+$/.test(segment)) {
      return segment.charAt(0).toUpperCase() + segment.slice(1);
    }
    return segment.replace(/^[a-z]/, (ch) => ch.toUpperCase());
  }).join(' ');
}

function getSectionWeight(section) {
  if (!section) return 0;
  const normalized = section.toLowerCase();
  return SECTION_HINTS.reduce((acc, { pattern, weight }) => (pattern.test(normalized) ? acc + weight : acc), 0);
}

function isSectionHeading(line) {
  if (!line) return false;
  const normalized = line.toLowerCase();
  if (normalized.length > 90) return false;
  if (SECTION_HINTS.some(({ pattern }) => pattern.test(normalized))) return true;
  if (/[A-Z]/.test(line) && line === line.toUpperCase() && normalized.length < 80) return true;
  return /[:：]$/.test(line);
}

function collectTermsFromLine(line) {
  const cleaned = line.replace(/[(),.;:!?]/g, ' ');
  const rawTokens = cleaned.split(/\s+/).map((token) => token.trim()).filter(Boolean);
  const normalizedTokens = rawTokens
    .map(normalizeToken)
    .filter((token) => token && !shouldSkipTerm(token));

  const terms = [];
  normalizedTokens.forEach((token) => terms.push(token));

  for (let i = 0; i < normalizedTokens.length - 1; i += 1) {
    const phrase = `${normalizedTokens[i]} ${normalizedTokens[i + 1]}`;
    if (!shouldSkipPhrase(phrase)) {
      terms.push(phrase);
    }
  }

  for (let i = 0; i < normalizedTokens.length - 2; i += 1) {
    const phrase = `${normalizedTokens[i]} ${normalizedTokens[i + 1]} ${normalizedTokens[i + 2]}`;
    if (!shouldSkipPhrase(phrase)) {
      terms.push(phrase);
    }
  }

  return terms;
}

function extractATSKeywords(text) {
  if (!text) return [];

  const atsKeywords = new Set();

  // Extract education requirements (e.g., "Bachelor's degree in Computer Science")
  const educationPatterns = [
    /\b(bachelor'?s?|master'?s?|phd|doctorate|mba)\s+(?:degree\s+)?(?:in\s+)?([a-z\s]+?)(?=\s*(?:or|and|,|\.|required|preferred|from|$))/gi,
    /\b(bachelor'?s?|master'?s?|phd|doctorate|mba)\b/gi
  ];

  for (const pattern of educationPatterns) {
    const matches = text.matchAll(pattern);
    for (const match of matches) {
      if (match[2] && match[2].trim().length > 3 && match[2].trim().length < 50) {
        const cleanField = match[2].trim().replace(/\s+/g, ' ');
        // Filter out generic words
        if (!/(degree|required|preferred|equivalent|related)$/i.test(cleanField)) {
          atsKeywords.add(formatKeyword(`${match[1]} ${cleanField}`));
        }
      } else if (match[1]) {
        atsKeywords.add(formatKeyword(match[1]));
      }
    }
  }

  // Extract years of experience (e.g., "5+ years experience")
  const expMatches = text.matchAll(/(\d+\+?)\s*(?:years?|yrs?)\s+(?:of\s+)?(?:experience|exp)(?:\s+(?:in|with)\s+([a-z\s/+#.]+?))?(?=\s*(?:,|\.|;|required|preferred|or|and|$))/gi);
  for (const match of expMatches) {
    if (match[2] && match[2].trim().length > 2) {
      const skill = match[2].trim().replace(/\s+/g, ' ');
      if (skill.length < 40) {
        atsKeywords.add(`${match[1]}+ years ${formatKeyword(skill)}`);
      }
    } else {
      atsKeywords.add(`${match[1]}+ years experience`);
    }
  }

  // Extract certifications (e.g., "AWS Certified", "PMP Certification")
  const certPatterns = [
    /\b([A-Z]{2,}(?:\s+[A-Z][a-z]+)?)\s+(?:certification|certified|certificate)\b/gi,
    /\b(?:certification|certified)\s+(?:in\s+)?([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)\b/gi
  ];

  for (const pattern of certPatterns) {
    const matches = text.matchAll(pattern);
    for (const match of matches) {
      if (match[1] && match[1].trim().length > 2 && match[1].trim().length < 50) {
        atsKeywords.add(formatKeyword(match[1].trim()));
      }
    }
  }

  return Array.from(atsKeywords);
}

function extractTopKeywords(text) {
  if (!text) return [];
  const normalized = text.replace(/\r\n?/g, '\n');
  const lines = normalized.split('\n');

  const scores = new Map();
  const original = new Map();
  let currentSection = '';

  lines.forEach((rawLine) => {
    const line = rawLine.trim();
    if (!line) return;

    const headingCandidate = line.replace(/^[\-•*\d\)\(]+\s*/, '').trim();
    if (isSectionHeading(headingCandidate)) {
      currentSection = headingCandidate;
      return;
    }

    let weight = 1;
    if (/^[\-•*]/.test(rawLine.trim())) {
      weight += 0.6;
    }
    weight += getSectionWeight(currentSection);
    if (/\d/.test(line)) {
      weight += 0.2;
    }

    const terms = collectTermsFromLine(line);
    terms.forEach((term) => {
      if (!term) return;
      const key = term.toLowerCase();
      const existing = scores.get(key) || 0;
      scores.set(key, existing + weight);
      if (!original.has(key)) {
        original.set(key, formatKeyword(term));
      }
    });
  });

  return Array.from(scores.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, MAX_KEYWORD_RESULTS)
    .map(([key]) => original.get(key))
    .filter(Boolean);
}

const TECH_SKILL_KEYWORDS = [
  'python', 'javascript', 'typescript', 'java', 'c++', 'c#', 'ruby', 'go', 'golang', 'php', 'swift', 'kotlin',
  'react', 'angular', 'vue', 'next.js', 'node', 'node.js', 'express', 'django', 'flask', 'spring', 'laravel',
  'aws', 'azure', 'gcp', 'google cloud', 'cloud', 'kubernetes', 'docker', 'terraform', 'ansible', 'pulumi',
  'ci/cd', 'jenkins', 'gitlab', 'github actions', 'git', 'bash', 'shell', 'linux', 'windows', 'macos', 'graphql',
  'rest', 'api', 'microservices', 'serverless', 'lambda', 'postgres', 'postgresql', 'mysql', 'sql', 'nosql',
  'mongodb', 'redis', 'dynamodb', 'elasticsearch', 'kafka', 'rabbitmq', 'snowflake', 'bigquery', 'spark',
  'hadoop', 'airflow', 'tableau', 'power bi', 'databricks', 'ml', 'machine learning', 'ai', 'nlp', 'data science',
  'data engineering', 'devops', 'sre', 'observability', 'prometheus', 'grafana', 'splunk', 'new relic',
  'datadog', 'pagerduty', 'security', 'cybersecurity', 'zero trust', 'iam', 'okta', 'auth0', 'saml', 'oauth',
  'compliance', 'soc 2', 'pci', 'hipaa', 'gdpr', 'fedramp'
];

function extractSkills(text) {
  if (!text) return [];
  const lower = text.toLowerCase();
  const found = new Set();

  TECH_SKILL_KEYWORDS.forEach((skill) => {
    if (lower.includes(skill.toLowerCase())) {
      const formatted = skill
        .split(' ')
        .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
        .join(' ');
      found.add(formatted.replace('Aws', 'AWS').replace('Gcp', 'GCP'));
    }
  });

  extractTopKeywords(text).forEach((keyword) => {
    const normalized = keyword.toLowerCase();
    TECH_SKILL_KEYWORDS.forEach((skill) => {
      if (normalized === skill.toLowerCase()) {
        found.add(keyword);
      }
    });
  });

  return Array.from(found).slice(0, 25);
}

const SOFT_SKILL_KEYWORDS = [
  'communication', 'verbal', 'written', 'presentation', 'leadership', 'mentoring', 'coaching',
  'teamwork', 'collaboration', 'stakeholder', 'problem solving', 'analytical', 'critical thinking',
  'troubleshooting', 'adaptability', 'flexible', 'time management', 'prioritization', 'project management',
  'initiative', 'self-motivated', 'customer focus', 'client-facing', 'detail-oriented', 'attention to detail'
];

const ACTION_VERBS = [
  'achieved', 'built', 'created', 'delivered', 'designed', 'developed', 'engineered', 'implemented', 'improved',
  'launched', 'led', 'managed', 'optimized', 'orchestrated', 'produced', 'reduced', 'resolved', 'scaled', 'streamlined'
];

const METRIC_TERMS = ['percent', '%', 'increase', 'decrease', 'reduction', 'performance', 'efficiency', 'revenue', 'cost', 'uptime'];
const INDUSTRY_TERMS = ['compliance', 'security', 'governance', 'sla', 'risk management', 'best practices', 'disaster recovery'];

function extractSoftSkillsFromText(text) {
  if (!text) return [];
  const lower = text.toLowerCase();
  const found = new Set();
  SOFT_SKILL_KEYWORDS.forEach((skill) => {
    if (lower.includes(skill)) {
      found.add(skill.charAt(0).toUpperCase() + skill.slice(1));
    }
  });
  return Array.from(found);
}

function extractAtsInsightsFromText(text) {
  if (!text) {
    return { action_verbs: [], metrics: [], industry_terms: [] };
  }
  const lower = text.toLowerCase();
  const actionVerbs = ACTION_VERBS.filter((verb) => lower.includes(verb));
  const metrics = METRIC_TERMS.filter((term) => lower.includes(term));
  const industryTerms = INDUSTRY_TERMS.filter((term) => lower.includes(term));
  return {
    action_verbs: Array.from(new Set(actionVerbs.map((v) => v.charAt(0).toUpperCase() + v.slice(1)))),
    metrics: Array.from(new Set(metrics.map((v) => v.charAt(0).toUpperCase() + v.slice(1)))),
    industry_terms: Array.from(new Set(industryTerms.map((v) => v.charAt(0).toUpperCase() + v.slice(1))))
  };
}

function buildKeywordFrequencyMap(items) {
  return items.reduce((acc, word) => {
    if (!word) return acc;
    const key = word.toLowerCase();
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});
}

function updateMetadata(metadata) {
  const card = document.getElementById('metadataCard');
  const placeholder = document.getElementById('metadataPlaceholder');
  const content = document.getElementById('metadataContent');

  if (!metadata || (!metadata.title && !metadata.company && !metadata.skills?.length && !metadata.keywords?.length)) {
    if (card) card.style.display = 'none';
    if (placeholder) placeholder.style.display = 'block';
    return;
  }

  if (card) card.style.display = 'block';
  if (placeholder) placeholder.style.display = 'none';

  if (!content) return;

  let html = '';

  // Title
  if (metadata.title) {
    html += `
      <div class="metadata-title">
        <span class="metadata-title-icon">📌</span>
        <span class="metadata-title-text">${escapeHtml(metadata.title)}</span>
      </div>
    `;
  }

  // Company
  if (metadata.company) {
    html += `
      <div class="metadata-company">
        <span class="metadata-company-icon">🏢</span>
        <span class="metadata-company-text">${escapeHtml(metadata.company)}</span>
      </div>
    `;
  }

  // Metadata Grid
  if (metadata.jobType || metadata.remoteStatus || metadata.budget) {
    html += '<div class="metadata-grid">';

    if (metadata.jobType) {
      html += `
        <div class="metadata-item">
          <div class="metadata-item-label">
            <span class="metadata-item-label-icon">💼</span>
            <span class="metadata-item-label-text">Job Type</span>
          </div>
          <div class="metadata-item-value">${escapeHtml(metadata.jobType)}</div>
        </div>
      `;
    }

    if (metadata.remoteStatus) {
      html += `
        <div class="metadata-item">
          <div class="metadata-item-label">
            <span class="metadata-item-label-icon">🌐</span>
            <span class="metadata-item-label-text">Work Type</span>
          </div>
          <div class="metadata-item-value">${escapeHtml(metadata.remoteStatus)}</div>
        </div>
      `;
    }

    if (metadata.budget) {
      html += `
        <div class="metadata-item full-width">
          <div class="metadata-item-label">
            <span class="metadata-item-label-icon">💰</span>
            <span class="metadata-item-label-text">Budget</span>
          </div>
          <div class="metadata-item-value budget">${escapeHtml(metadata.budget)}</div>
        </div>
      `;
    }

    html += '</div>';
  }

  // Technical Skills
  if (metadata.skills && metadata.skills.length > 0) {
    html += `
      <div>
        <div class="metadata-section-title">
          <span>⚙️</span> Technical Skills
        </div>
        <div class="metadata-chips">
          ${metadata.skills.map(skill => `<span class="metadata-chip chip-skills">${escapeHtml(skill)}</span>`).join('')}
        </div>
      </div>
    `;
  }

  // Top Keywords
  if (metadata.keywords && metadata.keywords.length > 0) {
    html += `
      <div>
        <div class="metadata-section-title">
          <span>📊</span> Top Keywords
        </div>
        <div class="metadata-chips">
          ${metadata.keywords.map(keyword => `<span class="metadata-chip chip-keywords">${escapeHtml(keyword)}</span>`).join('')}
        </div>
      </div>
    `;
  }

  content.innerHTML = html;
}

function escapeHtml(s) {
  return (s || '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', '\'': '&#39;' }[c]));
}

async function loadSavedJDs() {
  try {
    const token = await ensureAuthToken({ silent: true });
    if (!token) {
      document.getElementById('savedList').innerHTML = '<div class="empty-state">Sign in to see saved jobs</div>';
      return;
    }
    const base = await resolveApiBase();
    const res = await fetchWithRetry(`${base}/api/job-descriptions`, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });
    if (res.ok) {
      const items = await res.json();
      const list = Array.isArray(items) ? items : [];
      savedJDs = list;
      renderSavedList(list);
    } else if (res.status === 401) {
      document.getElementById('savedList').innerHTML = '<div class="empty-state">Please sign in on editresume.io</div>';
      const current = await chrome.storage.sync.get();
      await chrome.storage.sync.set({ 
        ...current,
        token: '', 
        tokenFetchedAt: 0 
      });
    } else if (res.status === 429) {
      document.getElementById('savedList').innerHTML = '<div class="empty-state">Too many requests. Please wait a moment.</div>';
    } else if (res.status >= 500) {
      document.getElementById('savedList').innerHTML = '<div class="empty-state">Server error. Please try again later.</div>';
    } else {
      document.getElementById('savedList').innerHTML = `<div class="empty-state">Failed to load (${res.status})</div>`;
    }
  } catch (e) {
    console.error('Error loading jobs:', e);
    if (e.message?.includes('throttl') || e.message?.includes('429')) {
      document.getElementById('savedList').innerHTML = '<div class="empty-state">Request throttled. Please wait a moment.</div>';
    } else if (e.message?.includes('500')) {
      document.getElementById('savedList').innerHTML = '<div class="empty-state">Server error. Please try again later.</div>';
    } else {
      document.getElementById('savedList').innerHTML = '<div class="empty-state">Error loading jobs. Check connection.</div>';
    }
  }
}

function renderSavedList(list) {
  const container = document.getElementById('savedList');
  if (list.length === 0) {
    container.innerHTML = '<div class="empty-state">No saved jobs yet</div>';
    return;
  }
  container.innerHTML = list.slice(0, 20).map(jd => {
    const scoreInfo = jd.last_match ? `<div class="saved-item-score">Score: ${jd.last_match.score}%</div>` : '';
    const isActive = currentJdId === jd.id ? 'active' : '';
    return `
      <div class="saved-item ${isActive}" data-id="${jd.id}">
        <div class="saved-item-title">${escapeHtml(jd.title || 'Untitled')}</div>
        <div class="saved-item-company">${escapeHtml(jd.company || 'Unknown Company')}</div>
        ${scoreInfo}
      </div>
    `;
  }).join('');

  container.querySelectorAll('.saved-item').forEach(item => {
    item.addEventListener('click', async () => {
      const id = parseInt(item.dataset.id);
      const jd = savedJDs.find(j => j.id === id);
      if (jd) {
        currentJdId = id;
        renderSavedList(savedJDs); // Re-render to show active state

        try {
          const token = await ensureAuthToken({ silent: true });
          if (!token) {
            console.warn('No auth token when loading saved job');
            return;
          }
          const base = await resolveApiBase();
          const res = await fetchWithRetry(`${base}/api/job-descriptions/${id}`, {
            headers: {
              Authorization: `Bearer ${token}`
            }
          });
          if (res.ok) {
            const full = await res.json();
            const locationText = full.location || '';
            const workType = full.work_type || extractWorkType(full.content || '', locationText);
            const jobType = full.job_type || extractJobType(full.content || '');

            // Combine ATS keywords with general keywords
            const atsKw = extractATSKeywords(full.content || '');
            const topKw = extractTopKeywords(full.content || '');
            const combinedKw = [...new Set([...atsKw, ...topKw])];

            const metadata = {
              title: full.title,
              company: full.company,
              jobType: jobType,
              remoteStatus: workType,
              budget: extractBudget(full.content || ''),
              keywords: combinedKw,
              skills: extractSkills(full.content || ''),
            };
            updateMetadata(metadata);
          }
        } catch (e) {
          console.error('Failed to load JD:', e);
        }
      }
    });
  });
}

function updateAuthStatus(hasToken) {
  const signInSection = document.getElementById('signInSection');
  const saveForm = document.getElementById('saveForm');
  if (!hasToken) {
    if (signInSection) signInSection.style.display = 'block';
    if (saveForm) saveForm.style.display = 'none';
  } else {
    if (signInSection) signInSection.style.display = 'none';
    if (saveForm) saveForm.style.display = 'flex';
  }
}

function setSaveStatus(message, type = '') {
  const statusEl = document.getElementById('saveStatus');
  if (!statusEl) return;
  statusEl.textContent = message;
  statusEl.className = `save-status ${type}`;
  statusEl.style.display = message ? 'block' : 'none';
}

/**
 * Extract keywords using LLM (pure AI approach)
 */
async function extractKeywordsWithLLM(content, token, apiBase) {
  const saveBtn = document.getElementById('saveBtn');
  const originalText = saveBtn ? saveBtn.textContent : '';
  
  try {
    const base = (apiBase || 'https://editresume-api-prod.onrender.com').replace(/\/$/, '');
    
    if (saveBtn) {
      saveBtn.disabled = true;
      saveBtn.textContent = 'Extracting keywords with AI...';
    }

    const response = await fetchWithRetry(`${base}/api/ai/extract_keywords_llm`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        job_description: content
      })
    }, 2);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      if (response.status === 429) {
        throw new Error('Request throttled. Please wait a moment.');
      }
      if (response.status >= 500) {
        throw new Error('Server error. Falling back to local extraction.');
      }
      throw new Error(errorData.detail || `HTTP ${response.status}`);
    }

    const data = await response.json();
    
    if (saveBtn) {
      saveBtn.disabled = false;
      saveBtn.textContent = originalText;
    }

    // Validate keywords against job description content
    const contentLower = content.toLowerCase();
    const keywordInText = (keyword) => {
      if (!keyword) return false;
      return contentLower.includes(keyword.toLowerCase().trim());
    };

    // Transform LLM response to match existing format and validate
    const technical_keywords = (data.technical_keywords || []).filter(kw => keywordInText(kw));
    const soft_skills = (data.soft_skills || []).filter(kw => keywordInText(kw));
    const general_keywords = (data.general_keywords || []).filter(kw => keywordInText(kw));
    const priority_keywords = (data.priority_keywords || []).filter(kw => keywordInText(kw));
    const high_frequency_keywords = (data.high_frequency_keywords || []).filter(item => {
      const kw = item.keyword || item;
      return keywordInText(kw);
    });

    // Combine for allKeywords
    const allKeywords = [...new Set([...priority_keywords, ...general_keywords])];
    
    // Format high_frequency_keywords
    const formattedHighFrequency = high_frequency_keywords.map(item => ({
      keyword: item.keyword || item,
      frequency: item.frequency || 1,
      importance: item.importance || 'medium'
    }));

    return {
      technical_keywords: technical_keywords,
      soft_skills: soft_skills,
      general_keywords: allKeywords,
      priority_keywords: priority_keywords.slice(0, 15),
      high_frequency_keywords: formattedHighFrequency,
      ats_insights: {
        action_verbs: [],  // LLM doesn't extract these separately
        metrics: [],
        industry_terms: []
      },
      atsKeywords: []  // LLM handles this differently
    };

  } catch (error) {
    console.error('LLM keyword extraction failed:', error);
    if (saveBtn) {
      saveBtn.disabled = false;
      saveBtn.textContent = originalText;
    }
    throw error;  // Re-throw to trigger fallback
  }
}

/**
 * Validate that keyword appears in the job description text
 */
function keywordInText(keyword, text) {
  if (!keyword || !text) return false;
  const kwLower = keyword.toLowerCase().trim();
  const textLower = text.toLowerCase();
  return textLower.includes(kwLower);
}

/**
 * Extract keywords locally (fallback method)
 */
function extractKeywordsLocally(content) {
  if (!content || !content.trim()) {
    return {
      technical_keywords: [],
      soft_skills: [],
      general_keywords: [],
      priority_keywords: [],
      high_frequency_keywords: [],
      ats_insights: { action_verbs: [], metrics: [], industry_terms: [] },
      atsKeywords: []
    };
  }

  // Extract ATS-focused keywords (education, experience, certifications)
  const atsKeywords = extractATSKeywords(content);
  const topKeywords = extractTopKeywords(content);
  const detectedSkills = extractSkills(content);
  const softSkills = extractSoftSkillsFromText(content);
  const atsInsights = extractAtsInsightsFromText(content);

  // Validate all keywords are in the content
  const validatedAtsKeywords = atsKeywords.filter(kw => keywordInText(kw, content));
  const validatedTopKeywords = topKeywords.filter(kw => keywordInText(kw, content));
  const validatedSkills = detectedSkills.filter(kw => keywordInText(kw, content));
  const validatedSoftSkills = softSkills.filter(kw => keywordInText(kw, content));

  // Combine ATS keywords with general keywords, prioritizing ATS keywords
  const allKeywords = [...new Set([...validatedAtsKeywords, ...validatedTopKeywords])];
  const priorityKeywords = allKeywords.slice(0, 15); // Top 15 most relevant for ATS

  const keywordFrequency = buildKeywordFrequencyMap([...validatedSkills, ...allKeywords]);
  const highFrequencyKeywords = allKeywords.slice(0, 20).map((keyword, idx) => ({
    keyword,
    frequency: keywordFrequency[keyword.toLowerCase()] || 1,
    importance: idx < 5 ? 'high' : idx < 10 ? 'medium' : 'low'
  }));

  return {
    technical_keywords: validatedSkills,
    soft_skills: validatedSoftSkills,
    general_keywords: allKeywords,
    priority_keywords: priorityKeywords,
    high_frequency_keywords: highFrequencyKeywords,
    ats_insights: atsInsights,
    atsKeywords: validatedAtsKeywords
  };
}

async function saveJobDescription() {
  const title = document.getElementById('saveTitle').value.trim();
  let company = document.getElementById('saveCompany').value.trim();
  company = cleanCompanyName(company);
  const url = document.getElementById('saveUrl').value.trim();
  const saveBtn = document.getElementById('saveBtn');

  // Extract content and location from current page
  let content = '';
  let extractedLocation = '';
  let extractedWorkType = '';
  let extractedJobType = '';
  try {
    const tabId = await getActiveTabId();
    if (tabId) {
      let res;
      try {
        res = await chrome.tabs.sendMessage(tabId, { type: 'GET_JOB_DATA' });
      } catch (e) {
        res = null;
      }

      let job;
      if (res && res.ok) {
        job = res.job;
      } else {
        job = await extractViaScript(tabId);
      }

      if (job) {
        if (job.content) {
          content = job.content;
        }
        if (job.location) {
          extractedLocation = job.location;
        }
        if (job.company) {
          job.company = cleanCompanyName(job.company);
        }
        if (job.workType) {
          extractedWorkType = job.workType;
        }
        if (job.jobType) {
          extractedJobType = job.jobType;
        }
      }
    }
  } catch (e) {
    console.error('Failed to extract job description:', e);
  }

  if (!title || !content) {
    setSaveStatus('Title and Job Description are required. Make sure you are on a job posting page.', 'error');
    return;
  }

  setSaveStatus('Saving...', '');
  saveBtn.disabled = true;

  try {
    const token = await ensureAuthToken();
    if (!token) {
      setSaveStatus('Please sign in on editresume.io', 'error');
      saveBtn.disabled = false;
      return;
    }

    const resolvedApiBase = await resolveApiBase();
    const apiUrl = resolvedApiBase + '/api/job-descriptions';
    console.log('Extension: Saving job description to:', apiUrl);
    console.log('Extension: Resolved API base:', resolvedApiBase);

    // Extract Easy Apply URL if available
    let easyApplyUrl = '';
    try {
      const tabId = await getActiveTabId();
      if (tabId) {
        let job;
        try {
          const res = await chrome.tabs.sendMessage(tabId, { type: 'GET_JOB_DATA' });
          if (res && res.ok && res.job) {
            job = res.job;
          }
        } catch (e) {
          job = await extractViaScript(tabId);
        }
        if (job && job.easyApplyUrl) {
          easyApplyUrl = job.easyApplyUrl;
          console.log('✅ Extracted Easy Apply URL:', easyApplyUrl);
        } else {
          console.log('⚠️ No Easy Apply URL found in job data');
        }
      }
    } catch (e) {
      console.error('Failed to extract Easy Apply URL:', e);
    }

    // FIRST: Extract work_type (Remote, Onsite, Hybrid)
    const workType = extractedWorkType || extractWorkType(content, extractedLocation);

    // SECOND: Only extract company headquarters location if work_type is NOT Remote
    let actualLocation = '';
    if (workType && workType.toLowerCase() !== 'remote') {
      actualLocation = extractCompanyHeadquarters(content, extractedLocation, company);
    } else if (extractedLocation) {
      actualLocation = extractedLocation;
    }

    // Extract job_type
    const jobType = extractedJobType || extractJobType(content);

    // Extract keywords using LLM (with fallback to local extraction)
    let keywordData;
    try {
      const apiBase = await resolveApiBase();
      keywordData = await extractKeywordsWithLLM(content, token, apiBase);
      console.log('✅ Keywords extracted using LLM');
    } catch (error) {
      console.warn('⚠️ LLM extraction failed, falling back to local extraction:', error);
      keywordData = extractKeywordsLocally(content);
    }

    const atsKeywords = keywordData.atsKeywords || [];
    const topKeywords = keywordData.general_keywords || [];
    const detectedSkills = keywordData.technical_keywords || [];
    const softSkills = keywordData.soft_skills || [];
    const atsInsights = keywordData.ats_insights || { action_verbs: [], metrics: [], industry_terms: [] };
    const priorityKeywords = keywordData.priority_keywords || [];
    const highFrequencyKeywords = keywordData.high_frequency_keywords || [];

    const allKeywords = topKeywords;
    const keywordFrequency = buildKeywordFrequencyMap([...detectedSkills, ...allKeywords]);

    console.log('📊 Extracted fields:', {
      location: actualLocation,
      workType: workType,
      jobType: jobType
    });

    const payload = {
      title,
      company,
      url,
      content,
      easy_apply_url: easyApplyUrl,
      location: actualLocation,  // Only set if NOT Remote
      work_type: workType,
      job_type: jobType,
      source: 'extension',
      extracted_keywords: {
        technical_keywords: detectedSkills.map(skill => skill.toLowerCase()),
        general_keywords: allKeywords.map(keyword => keyword.toLowerCase()),
        soft_skills: softSkills,
        high_frequency_keywords: highFrequencyKeywords,
        ats_keywords: atsInsights,
        keyword_frequency: keywordFrequency,
        total_keywords: Object.values(keywordFrequency).reduce((sum, count) => sum + count, 0)
      },
      priority_keywords: priorityKeywords,
      soft_skills: softSkills,
      high_frequency_keywords: highFrequencyKeywords,
      ats_insights: atsInsights
    };
    console.log('📤 Saving job description with payload:', { ...payload, content: content.substring(0, 100) + '...' });

    const resp = await fetchWithRetry(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify(payload)
    });

    if (!resp.ok) {
      let errorMessage = 'Failed to save';
      try {
        const errorData = await resp.json();
        errorMessage = errorData.detail || errorData.message || `HTTP ${resp.status}: ${resp.statusText}`;
      } catch (e) {
        if (resp.status === 429) {
          errorMessage = 'Too many requests. Please wait a moment and try again.';
        } else if (resp.status >= 500) {
          errorMessage = 'Server error. Please try again later.';
        } else {
          errorMessage = `HTTP ${resp.status}: ${resp.statusText}`;
        }
      }
      throw new Error(errorMessage);
    }

    const data = await resp.json();

    setSaveStatus(`Saved ✓ (ID: ${data.id})`, 'success');
    saveBtn.disabled = false;

    // Clear form
    document.getElementById('saveTitle').value = '';
    document.getElementById('saveCompany').value = '';
    document.getElementById('saveUrl').value = '';

    // Update metadata - reuse variables already extracted above
    const metadata = {
      title,
      company: cleanCompanyName(company),
      jobType: jobType,
      remoteStatus: workType,
      budget: extractBudget(content),
      keywords: topKeywords,
      skills: detectedSkills,
      soft_skills: softSkills,
      high_frequency_keywords: highFrequencyKeywords,
      ats_insights: atsInsights
    };
    updateMetadata(metadata);

    // Reload saved list immediately to show the new job
    setTimeout(() => {
      loadSavedJDs();
      // Add to saved list manually for instant feedback
      savedJDs.unshift({
        id: data.id,
        title,
        company,
        url,
        created_at: new Date().toISOString()
      });
      renderSavedList(savedJDs);
    }, 300);

    // Clear status after showing success
    setTimeout(() => {
      setSaveStatus('', '');
    }, 2000);
  } catch (e) {
    console.error('Error saving job description:', e);
    setSaveStatus('Error: ' + e.message, 'error');
    saveBtn.disabled = false;
  }
}

document.addEventListener('DOMContentLoaded', async () => {
  const signInBtn = document.getElementById('signInBtn');
  const refreshBtn = document.getElementById('refreshSaved');

  // Migration disabled - respect user's saved settings
  // const current = await chrome.storage.sync.get({ appBase: 'https://editresume.io' });
  // 
  // const hasStaging = current.appBase && (
  //   current.appBase.includes('staging.editresume.io') || 
  //   current.appBase.includes('localhost')
  // );
  // 
  // const hasStagingApi = current.apiBase && (
  //   current.apiBase.includes('staging.editresume.io') ||
  //   current.apiBase.includes('editresume-staging.onrender.com') ||
  //   current.apiBase.includes('localhost')
  // );
  // 
  // if (hasStaging || hasStagingApi || !current.appBase) {
  //   await chrome.storage.sync.set({ 
  //     appBase: 'https://editresume.io',
  //     apiBase: 'https://editresume-api-prod.onrender.com'
  //   });
  //   console.log('Extension: Force migrated to production on popup open');
  // }

  const checkAuth = async (forceRefresh = false) => {
    try {
      const token = await ensureAuthToken({ silent: true, forceRefresh });
      const hasToken = !!token;
      updateAuthStatus(hasToken);
      if (hasToken) {
        loadSavedJDs();
      }
      return hasToken;
    } catch (err) {
      updateAuthStatus(false);
      return false;
    }
  };
  
  await checkAuth();

  if (signInBtn) {
    signInBtn.addEventListener('click', async () => {
      const { appBase } = await chrome.storage.sync.get({ appBase: 'https://editresume.io' });
      let normalizedBase = appBase?.trim().replace(/\/+$/, '') || 'https://editresume.io';
      
      if (!normalizedBase.startsWith('http')) {
        chrome.runtime.openOptionsPage();
        return;
      }
      
      // Force HTTP for localhost to avoid SSL errors
      if (normalizedBase.includes('localhost')) {
        normalizedBase = normalizedBase.replace(/^https?:\/\//, 'http://');
      }
      
      chrome.tabs.create({ url: `${normalizedBase}/?extensionAuth=1` });
    });
  }

  if (refreshBtn) {
    refreshBtn.addEventListener('click', loadSavedJDs);
  }

  // Save button handler
  const saveBtn = document.getElementById('saveBtn');
  if (saveBtn) {
    saveBtn.addEventListener('click', saveJobDescription);
  }

  // Check if we're on a LinkedIn page and auto-extract
  try {
    const tabId = await getActiveTabId();
    if (tabId) {
      let res;
      try {
        res = await chrome.tabs.sendMessage(tabId, { type: 'GET_JOB_DATA' });
      } catch (e) {
        res = null;
      }

      let job;
      if (res && res.ok) {
        job = res.job;
      } else {
        job = await extractViaScript(tabId);
      }

      if (job && (job.title || job.content)) {
        // Auto-fill form
        if (document.getElementById('saveTitle')) {
          document.getElementById('saveTitle').value = job.title || '';
          const sanitizedCompany = cleanCompanyName(job.company || '');
          document.getElementById('saveCompany').value = sanitizedCompany;
          document.getElementById('saveUrl').value = job.url || '';
        }

        // Update metadata
        const locationText = job.location || '';
        const workType = job.workType || extractWorkType(job.content || '', locationText);

        // Combine ATS keywords with general keywords
        const atsKw = extractATSKeywords(job.content || '');
        const topKw = extractTopKeywords(job.content || '');
        const combinedKw = [...new Set([...atsKw, ...topKw])];

        const metadata = {
          title: job.title,
          company: sanitizedCompany,
          jobType: job.jobType || extractJobType(job.content || ''),
          remoteStatus: workType,
          budget: extractBudget(job.content || ''),
          keywords: combinedKw,
          skills: extractSkills(job.content || ''),
        };
        updateMetadata(metadata);
      }
    }
  } catch (_) { }

  // Listen for storage changes
  chrome.storage.onChanged.addListener((changes, areaName) => {
    if (areaName === 'sync' && changes.token) {
      const nextToken = changes.token.newValue;
      updateAuthStatus(!!nextToken);
      loadSavedJDs();
    }
  });
});
