(function() {
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
      '[data-tracking-control-name="public_jobs_topcard-org-name"]'
    ],
    description: [
      '#job-details',
      '.jobs-description__container',
      '.jobs-description-content__text',
      '[id*="job-details"]',
      '.jobs-description',
      '.show-more-less-html__markup',
      '.jobs-box__html-content'
    ]
  };

  const EXPAND_BUTTON_SELECTORS = [
    'button[aria-label*="see more" i]',
    'button[aria-label*="show more" i]',
    'button.show-more-less-html__button',
    '.artdeco-card__actions button',
    'button[data-test-show-more]',
    'button[data-test-expanded-text-button]'
  ];

  const JOB_TYPE_PATTERNS = [
    { regex: /(full[-\s]?time|fulltime|permanent)/i, label: 'Full Time' },
    { regex: /(part[-\s]?time|parttime)/i, label: 'Part-time' },
    { regex: /(contract|contractor|temporary|temp|freelance|consultant)/i, label: 'Contractor' },
    { regex: /(internship|intern|intern role)/i, label: 'Internship' },
    { regex: /(seasonal)/i, label: 'Seasonal' },
    { regex: /(volunteer)/i, label: 'Volunteer' },
  ];

  const WORK_TYPE_PATTERNS = [
    { regex: /remote|work from home|wfh|distributed/i, label: 'Remote' },
    { regex: /hybrid|partially remote|flexible/i, label: 'Hybrid' },
    { regex: /on[-\s]?site|onsite|in[-\s]?office|office based/i, label: 'Onsite' },
  ];

  function splitMetaText(value) {
    if (!value) return [];
    return value
      .replace(/\u2022/g, '•')
      .split(/•|·|\||\u00b7/)
      .map((part) => part.replace(/\s+/g, ' ').trim())
      .filter(Boolean);
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

  function collectTopCardMetaTokens() {
    const metaSelectors = [
      '.jobs-unified-top-card__primary-description-without-tagline',
      '.jobs-unified-top-card__primary-description',
      '.job-details-jobs-unified-top-card__primary-description-without-tagline',
      '.job-details-jobs-unified-top-card__primary-description',
      '.jobs-unified-top-card__job-insight',
      '.jobs-unified-top-card__job-insight-text',
      '.job-details-jobs-unified-top-card__job-insight',
      '.job-details-jobs-unified-top-card__job-insight-text',
    ];

    const tokens = [];

    metaSelectors.forEach((selector) => {
      document.querySelectorAll(selector).forEach((el) => {
        const text = el?.textContent || '';
        splitMetaText(text).forEach((part) => {
          if (part) tokens.push(part);
        });
      });
    });

    const seen = new Set();
    const unique = [];
    tokens.forEach((token) => {
      const normalized = token.replace(/\s+/g, ' ').trim();
      if (!normalized) return;
      const key = normalized.toLowerCase();
      if (seen.has(key)) return;
      seen.add(key);
      unique.push(normalized);
    });

    return unique;
  }

  function extractWorkTypeFromText(value) {
    if (!value) return '';
    const lower = value.toLowerCase();
    for (const pattern of WORK_TYPE_PATTERNS) {
      if (pattern.regex.test(lower)) {
        return pattern.label;
      }
    }
    return '';
  }

  function extractJobTypeFromToken(value) {
    if (!value) return '';
    const lower = value.toLowerCase();
    for (const pattern of JOB_TYPE_PATTERNS) {
      if (pattern.regex.test(lower)) {
        return pattern.label;
      }
    }
    return '';
  }

  function stripParenthetical(value, meta) {
    if (!value) return '';
    let result = value;
    const matches = value.match(/\(([^)]+)\)/g);
    if (matches) {
      matches.forEach((match) => {
        const inside = match.slice(1, -1);
        const work = extractWorkTypeFromText(inside);
        if (work && !meta.workType) {
          meta.workType = work;
        }
        const job = extractJobTypeFromToken(inside);
        if (job && !meta.jobType) {
          meta.jobType = job;
        }
      });
      result = value.replace(/\(([^)]+)\)/g, '').trim();
    }
    return result.trim();
  }

  function deriveMetaFromTokens(tokens, companyName = '') {
    const meta = { location: '', jobType: '', workType: '' };
    const companyLower = companyName ? companyName.toLowerCase() : '';

    tokens.forEach((token) => {
      if (!meta.workType) {
        meta.workType = extractWorkTypeFromText(token);
      }
      if (!meta.jobType) {
        meta.jobType = extractJobTypeFromToken(token);
      }
    });

    for (const token of tokens) {
      let candidate = stripParenthetical(token, meta);
      const lower = candidate.toLowerCase();
      if (!candidate) continue;
      if (companyLower && lower === companyLower) continue;
      if (extractWorkTypeFromText(candidate)) continue;
      if (extractJobTypeFromToken(candidate)) continue;
      if (/^\d/.test(lower)) continue;
      if (!meta.location) {
        meta.location = candidate;
        break;
      }
    }

    return meta;
  }

  function cleanLocationValue(value) {
    if (!value) return '';
    return value.replace(/\s+/g, ' ').trim();
  }

  function expandJobDescription() {
    try {
      EXPAND_BUTTON_SELECTORS.forEach((selector) => {
        document.querySelectorAll(selector).forEach((button) => {
          if (!button || button.getAttribute('data-expanded') === 'true') return;
          const ariaExpanded = button.getAttribute('aria-expanded');
          if (ariaExpanded === 'true') return;
          button.setAttribute('data-expanded', 'true');
          try {
            button.click();
          } catch (error) {
            const event = new MouseEvent('click', {
              view: window,
              bubbles: true,
              cancelable: true
            });
            button.dispatchEvent(event);
          }
        });
      });
    } catch (error) {
      console.warn('Failed to expand job description:', error);
    }
  }

  function extractText(selectors) {
    if (Array.isArray(selectors)) {
      for (const sel of selectors) {
        try {
        const el = document.querySelector(sel);
          if (el && el.textContent && el.textContent.trim()) {
          return el.textContent.trim();
          }
        } catch (e) {
          continue;
        }
      }
      return '';
    }
    try {
    const el = document.querySelector(selectors);
      return el && el.textContent ? el.textContent.trim() : '';
    } catch (e) {
      return '';
    }
  }

  function extractEasyApplyUrl() {
    try {
      const currentUrl = window.location.href;
      
      // First, try to extract job ID from current URL
      let jobId = null;
      const jobIdMatch = currentUrl.match(/\/jobs\/view\/(\d+)/);
      if (jobIdMatch) {
        jobId = jobIdMatch[1];
      }
      
      // Try multiple selectors for Easy Apply button - prioritize actual Easy Apply buttons
      const selectors = [
        // Easy Apply specific buttons
        'button[aria-label*="Easy Apply" i]',
        'button[aria-label*="Easy apply" i]',
        'a[aria-label*="Easy Apply" i]',
        'a[aria-label*="Easy apply" i]',
        'button[data-control-name="jobdetails_topcard_inapply"]',
        'a[data-control-name="jobdetails_topcard_inapply"]',
        // Apply buttons (might be Easy Apply)
        'button[data-control-name="jobdetails_topcard_apply"]',
        'a[data-control-name="jobdetails_topcard_apply"]',
        '.jobs-apply-button',
        'a.jobs-apply-button',
        'button.jobs-apply-button',
        // Direct apply links
        'a[href*="/jobs/apply/"]',
        'button[aria-label*="Apply"]',
        'a[href*="easyApply"]',
        'button[data-tracking-control-name*="apply"]',
        'a[href*="/jobs/collections/recommended/"]',
        '.jobs-s-apply button',
        '.jobs-s-apply a',
        'button[data-tracking-control-name="public_jobs_topcard_apply"]',
        'a[data-tracking-control-name="public_jobs_topcard_apply"]',
        // Look for buttons with "Easy Apply" text
        'button:has-text("Easy Apply")',
        'a:has-text("Easy Apply")'
      ];
      
      // First, try to find buttons/links with "Easy Apply" text
      const allButtons = document.querySelectorAll('button, a');
      for (const btn of allButtons) {
        const text = btn.textContent?.trim() || '';
        const ariaLabel = btn.getAttribute('aria-label') || '';
        if ((text.toLowerCase().includes('easy apply') || ariaLabel.toLowerCase().includes('easy apply')) && 
            !text.toLowerCase().includes('save') && !text.toLowerCase().includes('follow')) {
          // Check if it's a link
          if (btn.tagName === 'A' && btn.href) {
            if (btn.href.includes('/jobs/apply/') || btn.href.includes('linkedin.com')) {
              return btn.href.split('?')[0];
            }
          }
          // Check if button has data attributes
          if (btn.dataset.href) {
            return btn.dataset.href.split('?')[0];
          }
          // Check parent for link
          const parentLink = btn.closest('a');
          if (parentLink && parentLink.href) {
            if (parentLink.href.includes('/jobs/apply/') || parentLink.href.includes('linkedin.com')) {
              return parentLink.href.split('?')[0];
            }
          }
        }
      }
      
      for (const sel of selectors) {
        try {
          const el = document.querySelector(sel);
          if (el) {
            // Check if it's a link with direct href
            if (el.tagName === 'A' && el.href) {
              // If href contains /jobs/apply/, use it directly (preserve full URL)
              if (el.href.includes('/jobs/apply/')) {
                return el.href; // Keep full URL with any params
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
              const container = el.closest('.jobs-s-apply, .jobs-unified-top-card, .topcard, [class*="apply"]');
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
              
              // Check onclick handler for actual URL
              if (el.onclick) {
                try {
                  const onclickStr = el.onclick.toString();
                  const urlMatch = onclickStr.match(/['"](https?:\/\/[^'"]*\/jobs\/apply\/[^'"]*)['"]/);
                  if (urlMatch) {
                    return urlMatch[1]; // Keep full URL
                  }
                } catch (e) {
                  // Ignore onclick parsing errors
                }
              }
            }
          }
        } catch (e) {
          // Skip invalid selectors
          continue;
        }
      }
      
      // Try to find job ID in page data/metadata
      if (!jobId) {
        // Check for job ID in meta tags or data attributes
        const metaJobId = document.querySelector('meta[property="og:url"], meta[name="og:url"]');
        if (metaJobId && metaJobId.content) {
          const metaMatch = metaJobId.content.match(/\/jobs\/view\/(\d+)/);
          if (metaMatch) {
            jobId = metaMatch[1];
          }
        }
        
        // Check for job ID in data attributes
        const jobCard = document.querySelector('[data-job-id], [data-jobid], [data-entity-urn*="job"]');
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
      const allApplyLinks = document.querySelectorAll('a[href*="apply"], a[href*="jobs"]');
      for (const link of allApplyLinks) {
        if (link.href.includes('/jobs/apply/')) {
          return link.href.split('?')[0];
        }
        const match = link.href.match(/\/jobs\/view\/(\d+)/);
        if (match) {
          return `https://www.linkedin.com/jobs/apply/${match[1]}`;
        }
      }
      
      return '';
    } catch (e) {
      console.error('Error extracting Easy Apply URL:', e);
      // Fallback: try to extract job ID from URL
      try {
        const jobIdMatch = window.location.href.match(/\/jobs\/view\/(\d+)/);
        if (jobIdMatch) {
          return `https://www.linkedin.com/jobs/apply/${jobIdMatch[1]}`;
        }
      } catch (fallbackError) {
        console.error('Fallback extraction also failed:', fallbackError);
      }
      return '';
    }
  }

  function parseJob() {
    const title = extractText(SELECTORS.title);
    let company = '';
    
    // Try multiple approaches to extract company name
    const companyExtractionMethods = [
      // Method 1: Standard selectors (most reliable)
      () => {
        for (const sel of SELECTORS.company) {
          try {
            const el = document.querySelector(sel);
            if (el) {
              const text = el.textContent?.trim() || el.innerText?.trim() || el.getAttribute('aria-label')?.trim() || '';
              const cleanText = cleanCompanyName(text);
              if (cleanText && cleanText.length > 0 && cleanText.length < 100 && 
                  !cleanText.includes('·') && !cleanText.includes('|') && 
                  !cleanText.includes('View') && !cleanText.includes('Follow')) {
                return cleanText;
              }
            }
          } catch (e) {
            continue;
          }
        }
        return '';
      },
      // Method 2: Look for company links in top card (most reliable location)
      () => {
        try {
          const topCard = document.querySelector('.jobs-unified-top-card, .topcard, .job-details-jobs-unified-top-card');
          if (topCard) {
            // Look for company link first
            const companyLink = topCard.querySelector('a[href*="/company/"]');
            if (companyLink) {
            const text = companyLink.textContent?.trim() || companyLink.innerText?.trim() || '';
            const cleanText = cleanCompanyName(text);
              if (cleanText && cleanText.length > 0 && cleanText.length < 100 && 
                  !cleanText.includes('·') && !cleanText.includes('|')) {
                return cleanText;
              }
            }
            // Then try company name spans
            const companySpan = topCard.querySelector('.jobs-unified-top-card__company-name, .job-details-jobs-unified-top-card__company-name');
            if (companySpan) {
            const text = companySpan.textContent?.trim() || companySpan.innerText?.trim() || '';
            const cleanText = cleanCompanyName(text);
              if (cleanText && cleanText.length > 0 && cleanText.length < 100) {
                return cleanText;
              }
            }
          }
        } catch (e) {}
        return '';
      },
      // Method 3: Look for all company links and filter
      () => {
        try {
          const companyLinks = document.querySelectorAll('a[href*="/company/"]');
          for (const link of companyLinks) {
            const text = link.textContent?.trim() || link.innerText?.trim() || '';
            const cleanText = cleanCompanyName(text);
            // Filter out navigation links, follow buttons, etc.
            if (cleanText && cleanText.length > 0 && cleanText.length < 100 && 
                !cleanText.includes('·') && !cleanText.includes('|') &&
                !cleanText.toLowerCase().includes('view') && 
                !cleanText.toLowerCase().includes('follow') &&
                !cleanText.toLowerCase().includes('company page') &&
                cleanText.match(/^[A-Za-z0-9\s&.,\-]+$/)) { // Only alphanumeric, spaces, and common punctuation
              return cleanText;
            }
          }
        } catch (e) {}
        return '';
      },
      // Method 4: Look in job details header
      () => {
        try {
          const jobDetailsCard = document.querySelector('.jobs-details-top-card, .job-details-jobs-unified-top-card');
          if (jobDetailsCard) {
            const companyEl = jobDetailsCard.querySelector('a[href*="/company/"], .jobs-details-top-card__company-name');
            if (companyEl) {
              const text = companyEl.textContent?.trim() || companyEl.innerText?.trim() || '';
              const cleanText = cleanCompanyName(text);
              if (cleanText && cleanText.length > 0 && cleanText.length < 100) {
                return cleanText;
              }
            }
          }
        } catch (e) {}
        return '';
      },
      // Method 5: Look for data attributes
      () => {
        try {
          const orgLink = document.querySelector('[data-tracking-control-name="public_jobs_topcard-org-name"], [data-tracking-control-name*="org-name"]');
          if (orgLink) {
            const text = orgLink.textContent?.trim() || orgLink.innerText?.trim() || orgLink.getAttribute('aria-label')?.trim() || '';
            const cleanText = cleanCompanyName(text);
            if (cleanText && cleanText.length > 0 && cleanText.length < 100) {
              return cleanText;
            }
          }
        } catch (e) {}
        return '';
      }
    ];
    
    // Try each method until we find a company name
    for (const method of companyExtractionMethods) {
      try {
        const result = method();
        if (result) {
          company = result;
          break;
        }
      } catch (e) {
        continue;
      }
    }
    company = cleanCompanyName(company);

    const metaTokens = collectTopCardMetaTokens();
    const derivedMeta = deriveMetaFromTokens(metaTokens, company);
    
    expandJobDescription();
    let descNode = null;
    for (const sel of SELECTORS.description) {
      try {
      descNode = document.querySelector(sel);
      if (descNode) break;
      } catch (e) {
        continue;
      }
    }
    const content = descNode ? descNode.innerText.trim() : '';
    const url = locationOriginUrl();
    const easyApplyUrl = extractEasyApplyUrl();
    
    if (easyApplyUrl) {
      console.log('✅ Content script extracted Easy Apply URL:', easyApplyUrl);
    } else {
      console.log('⚠️ Content script: No Easy Apply URL found');
    }
    
    if (company) {
      console.log('✅ Content script extracted Company:', company);
    } else {
      console.log('⚠️ Content script: No Company found');
      console.log('Debug: Trying to find company in page...');
      // Debug: Log what we found
      const debugLinks = document.querySelectorAll('a[href*="/company/"]');
      console.log(`Found ${debugLinks.length} company links`);
      debugLinks.forEach((link, idx) => {
        if (idx < 5) {
          const linkText = link.textContent?.trim() || link.innerText?.trim() || '';
          console.log(`  Link ${idx}: "${linkText}" - ${link.href}`);
        }
      });
      // Also check top card
      const topCard = document.querySelector('.jobs-unified-top-card, .topcard, .job-details-jobs-unified-top-card');
      if (topCard) {
        const companyEl = topCard.querySelector('a[href*="/company/"], .jobs-unified-top-card__company-name');
        if (companyEl) {
          console.log('  Found in top card:', companyEl.textContent?.trim());
        }
      }
    }
    
    // Try to extract location for better work type detection
    let location = cleanLocationValue(derivedMeta.location);
    try {
      if (!location) {
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
          // Look in job card bullets
          '.jobs-unified-top-card__job-insight-text',
          '.jobs-unified-top-card__secondary-description'
        ];
        
        for (const sel of locationSelectors) {
          try {
            const el = document.querySelector(sel);
            if (el) {
              const locText = el.textContent?.trim() || el.innerText?.trim() || '';
              if (!locText) continue;
              const cleaned = cleanLocationValue(stripParenthetical(locText, derivedMeta));
              if (cleaned) {
                location = cleaned;
                break;
              }
            }
          } catch (e) {
            continue;
          }
        }
      }

      if (!location) {
        try {
          const insightsContainer = document.querySelector('.jobs-unified-top-card__job-insights, .job-details-jobs-unified-top-card__job-insights');
          if (insightsContainer) {
            const allText = insightsContainer.textContent?.trim() || '';
            const cleaned = cleanLocationValue(stripParenthetical(allText, derivedMeta));
            if (cleaned) {
              location = cleaned;
            }
          }
        } catch (e) {}
      }
    } catch (e) {
      // Ignore location extraction errors
    }
    
    if (location) {
      console.log('✅ Content script extracted Location:', location);
    } else {
      console.log('⚠️ Content script: No Location found');
    }

    const jobTypeMeta = derivedMeta.jobType || '';
    const workTypeMeta = derivedMeta.workType || '';

    const skills = extractSkills(content);
    const responsibilities = extractResponsibilities(content);

    return { title, company, content, url, easyApplyUrl, skills, responsibilities, location, jobType: jobTypeMeta, workType: workTypeMeta };
  }

  function locationOriginUrl() { try { return window.location.href.split('?')[0]; } catch(e){ return window.location.href; } }

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
    'others', 'various', 'variety', 'multiple', 'different', 'across'
  ]);

  const NOISE_PATTERNS = [
    /^\d+$/, /^\d+(?:\+|%|k)$/, /^experience$/, /^years?$/, /^strong$/, /^excellent$/, /^related$/, /^relevant$/,
    /^must$/, /^should$/, /^ability$/, /^capability$/
  ];

  const SECTION_HINTS = [
    { pattern: /(responsibil|you will|day[- ]to[- ]day|what you['’]ll do|in this role)/i, weight: 0.75 },
    { pattern: /(requirements|qualifications|must have|you['’]ll need|ideal candidate|who you are)/i, weight: 1.1 },
    { pattern: /(skills|technical|experience|stack|technology|technologies)/i, weight: 1 },
    { pattern: /(preferred|nice to have|bonus|good to have)/i, weight: 0.4 }
  ];

  const MAX_KEYWORD_RESULTS = 40;

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

  function extractResponsibilities(text) {
    const bullets = text.match(/(^|\n)[\-•\*]\s+.+/g) || [];
    return bullets.map((b) => b.replace(/^[\n\-•\*]\s+/, '').trim()).slice(0, 30);
  }

  const SOFT_SKILL_KEYWORDS = [
    'communication', 'verbal', 'written', 'presentation', 'leadership', 'mentoring', 'coaching', 'teamwork',
    'collaboration', 'stakeholder', 'problem solving', 'analytical', 'critical thinking', 'troubleshooting',
    'adaptability', 'flexible', 'time management', 'prioritization', 'project management', 'initiative',
    'self-motivated', 'customer focus', 'client-facing', 'detail-oriented', 'attention to detail'
  ];

  const ACTION_VERBS = [
    'achieved', 'built', 'created', 'delivered', 'designed', 'developed', 'engineered', 'implemented', 'improved',
    'launched', 'led', 'managed', 'optimized', 'orchestrated', 'produced', 'reduced', 'resolved', 'scaled',
    'streamlined'
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

  function buildPanel(job) {
    const panel = document.createElement('div');
    panel.id = 'editresume-job-panel';
    panel.style.cssText = 'position:fixed;right:16px;bottom:16px;z-index:2147483647;background:#fff;border:1px solid #e5e7eb;border-radius:12px;box-shadow:0 10px 24px rgba(0,0,0,0.12);padding:12px;width:360px;font-family:Inter,system-ui,sans-serif;';
    panel.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
        <div style="font-weight:700;color:#111827">Save to editresume.io</div>
        <button id="er-close" style="background:transparent;border:none;font-size:18px;cursor:pointer">×</button>
      </div>
      <div style="display:grid;gap:8px;">
        <input id="er-title" placeholder="Job Title" value="${escapeHtml(job.title)}" style="padding:8px;border:1px solid #e5e7eb;border-radius:8px;" />
        <input id="er-company" placeholder="Company" value="${escapeHtml(job.company)}" style="padding:8px;border:1px solid #e5e7eb;border-radius:8px;" />
        <input id="er-url" placeholder="URL" value="${escapeHtml(job.url)}" style="padding:8px;border:1px solid #e5e7eb;border-radius:8px;" />
        <textarea id="er-content" placeholder="Job Description" style="padding:8px;border:1px solid #e5e7eb;border-radius:8px;height:140px;">${escapeHtml(job.content)}</textarea>
        <div style="display:flex;gap:8px;justify-content:flex-end;">
          <button id="er-auth" style="padding:8px 10px;border:1px solid #d1d5db;border-radius:8px;background:#fff;cursor:pointer">Sign In</button>
          <button id="er-save" style="padding:8px 12px;border:none;border-radius:8px;background:#2563eb;color:#fff;cursor:pointer">Save</button>
        </div>
        <div id="er-status" style="font-size:12px;color:#6b7280;"></div>
      </div>`;

    panel.querySelector('#er-close').onclick = () => panel.remove();
    panel.querySelector('#er-auth').onclick = async () => {
      const cfg = await chrome.storage.sync.get({ token: '' });
      if (cfg.token) {
        setStatus('Signed in (token present)');
      } else {
        chrome.runtime.sendMessage({ type: 'OPEN_AUTH' });
      }
    };
    panel.querySelector('#er-save').onclick = async () => {
      const contentValue = panel.querySelector('#er-content').value;
      const skills = extractSkills(contentValue);
      const keywords = extractTopKeywords(contentValue);
      const softSkills = extractSoftSkillsFromText(contentValue);
      const atsInsights = extractAtsInsightsFromText(contentValue);
      const keywordFrequency = buildKeywordFrequencyMap([...skills, ...keywords]);
      const highFrequencyKeywords = keywords.map((keyword, idx) => ({
        keyword,
        frequency: keywordFrequency[keyword.toLowerCase()] || 1,
        importance: idx < 5 ? 'high' : idx < 10 ? 'medium' : 'low'
      }));
      const priorityKeywords = Array.from(new Set(highFrequencyKeywords.map(item => item.keyword))).slice(0, 10);

      const payload = {
        title: panel.querySelector('#er-title').value,
        company: panel.querySelector('#er-company').value,
        url: panel.querySelector('#er-url').value,
        content: contentValue,
        location: job.location || '',
        easy_apply_url: job.easyApplyUrl || '',
        source: 'extension',
        extracted_keywords: {
          technical_keywords: skills.map(skill => skill.toLowerCase()),
          general_keywords: keywords.map(keyword => keyword.toLowerCase()),
          soft_skills: softSkills,
          high_frequency_keywords: highFrequencyKeywords,
          ats_keywords: atsInsights,
          keyword_frequency: keywordFrequency,
          total_keywords: Object.values(keywordFrequency).reduce((sum, count) => sum + count, 0)
        },
        priority_keywords: priorityKeywords,
        soft_skills: softSkills,
        high_frequency_keywords: highFrequencyKeywords,
        ats_insights: atsInsights,
      };
      setStatus('Saving...');
      try {
        const cfg = await chrome.storage.sync.get({ appBase: 'https://editresume.io', token: '' });
        
        // Migration disabled - respect user's saved settings
        // if (cfg.appBase && (cfg.appBase.includes('staging.editresume.io') || cfg.appBase.includes('localhost'))) {
        //   cfg.appBase = 'https://editresume.io';
        //   cfg.apiBase = 'https://editresume-api-prod.onrender.com';
        //   await chrome.storage.sync.set({ 
        //     appBase: cfg.appBase,
        //     apiBase: cfg.apiBase
        //   });
        // }
        
        const resolvedApiBase = cfg.apiBase || (cfg.appBase && cfg.appBase.includes('editresume.io') && !cfg.appBase.includes('staging') 
          ? 'https://editresume-api-prod.onrender.com' 
          : cfg.appBase && cfg.appBase.includes('staging.editresume.io')
          ? 'https://editresume-staging.onrender.com'
          : cfg.appBase && cfg.appBase.includes('localhost:3000')
          ? 'http://localhost:8000'
          : 'https://editresume-api-prod.onrender.com');
        cfg.apiBase = resolvedApiBase;
        if (!cfg.token) { setStatus('Please sign in first.'); return; }
        const res = await fetch(`${cfg.apiBase}/api/job-descriptions`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${cfg.token}` },
          body: JSON.stringify({ ...payload })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.detail || 'Failed to save');
        setStatus(`Saved ✓ (id: ${data.id})`);
        // Job saved successfully - no navigation needed
      } catch (e) {
        setStatus('Error: ' + e.message);
      }
      function setStatus(t){ panel.querySelector('#er-status').textContent = t; }
    };
    return panel;
  }

  function escapeHtml(s){ return (s||'').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#39;'}[c])); }

  // Panel disabled - using popup only
  // function ensurePanel(){
  //   if (document.getElementById('editresume-job-panel')) return;
  //   const job = parseJob();
  //   if (!job.title && !job.content) return;
  //   document.body.appendChild(buildPanel(job));
  // }

  // const observer = new MutationObserver(() => {
  //   ensurePanel();
  // });
  // observer.observe(document.documentElement, { childList: true, subtree: true });
  // ensurePanel();

  // Respond to popup requests
  chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    if (msg && msg.type === 'GET_JOB_DATA') {
      try {
        const job = parseJob();
        sendResponse({ ok: true, job });
      } catch (e) {
        console.error('Extension error parsing job:', e);
        sendResponse({ ok: false, error: e.message });
      }
      return true;
    }
    return false;
  });
})();

