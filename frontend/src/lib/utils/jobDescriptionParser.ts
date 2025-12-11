export interface JobMetadata {
  title?: string;
  company?: string;
  jobType?: string | null;
  remoteStatus?: string | null;
  location?: string;
  budget?: string | null;
  skills?: string[];
  keywords?: string[];
  soft_skills?: string[];
  high_frequency_keywords?: Array<{ keyword: string, frequency: number, importance: string }>;
  ats_insights?: {
    action_verbs?: string[];
    metrics?: string[];
    industry_terms?: string[];
  };
  easy_apply_url?: string;
}

const extractJobType = (text: string): string | null => {
  if (!text) return null;
  const lowerText = text.toLowerCase();
  
  if (/\bfull[-\s]?time\b|\bft\b|permanent\b/i.test(lowerText)) {
    if (!/\bpart[-\s]?time\b/i.test(lowerText)) {
      return 'Full Time';
    }
  }
  
  if (/\bcth\b|contract[-\s]?to[-\s]?hire|contract-to-hire/i.test(lowerText)) return 'Contractor';
  if (/\bcontractor\b|contract\s+basis\b/i.test(lowerText)) return 'Contractor';
  if (/\bcontract\b|temporary\b|temp\b/i.test(lowerText)) {
    if (!/\bcontract[-\s]?to[-\s]?hire/i.test(lowerText)) {
      return 'Contractor';
    }
  }
  
  if (/\bpart[-\s]?time\b|\bpt\b/i.test(lowerText)) return 'Part-time';
  if (/\bintern\b|internship\b/i.test(lowerText)) return 'Internship';
  
  return 'Full Time';
};

const extractWorkType = (text: string, locationText: string = ''): string | null => {
  if (!text && !locationText) return null;

  const combinedText = ((text || '') + ' ' + (locationText || '')).toLowerCase();

  if (locationText) {
    const locationLower = locationText.toLowerCase().trim();
    if (locationLower === 'remote' || locationLower === 'remote work') {
      return 'Remote';
    }
    if (locationLower === 'hybrid' || locationLower === 'hybrid work') {
      return 'Hybrid';
    }
    if (locationLower === 'onsite' || locationLower === 'on-site' || locationLower === 'on site') {
      return 'Onsite';
    }
    if (locationLower.includes('(remote)') || locationLower.match(/\(remote\)/i)) {
      return 'Remote';
    }
    if (locationLower.includes('(hybrid)') || locationLower.match(/\(hybrid\)/i)) {
      return 'Hybrid';
    }
    if (locationLower.includes('(on-site)') || locationLower.includes('(onsite)') || locationLower.match(/\(on.?site\)/i)) {
      return 'Onsite';
    }
  }

  if (/remote|work from home|wfh|fully remote|work remotely|remote work|100% remote|fully distributed/i.test(combinedText)) {
    if (/hybrid|partially remote|some remote|flexible|2-3 days|3 days|few days/i.test(combinedText)) {
      return 'Hybrid';
    }
    return 'Remote';
  }

  if (/hybrid|partially remote|some remote|flexible remote|remote.*office|office.*remote|2-3 days remote|3 days remote|few days remote/i.test(combinedText)) {
    return 'Hybrid';
  }

  if (/on.?site|on.?premise|on.?premises|in.?office|in.?person|at office|in office|office based/i.test(combinedText) &&
    !/remote|hybrid|work from home|wfh/i.test(combinedText)) {
    return 'Onsite';
  }

  return null;
};

const extractBudget = (text: string): string | null => {
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
};

const extractTopKeywords = (text: string): string[] => {
  if (!text) return [];
  const commonWords = new Set([
    'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 
    'is', 'are', 'was', 'were', 'be', 'been', 'have', 'has', 'had', 'do', 'does', 'did', 
    'will', 'would', 'should', 'could', 'may', 'might', 'must', 'can', 'this', 'that', 
    'these', 'those', 'i', 'you', 'he', 'she', 'it', 'we', 'they',
    'opportunity', 'opportunities', 'position', 'positions', 'join', 'seeking', 'hiring',
    'apply', 'applicant', 'applicants', 'job', 'jobs', 'career', 'careers', 'employment',
    'employee', 'employees', 'description', 'posting', 'opening', 'openings', 'vacancy',
    'offer', 'offers', 'provide', 'provides', 'providing', 'day', 'days', 'week', 'weeks',
    'month', 'months', 'time', 'times', 'people', 'person', 'individual', 'individuals',
    'successful', 'success', 'ideal', 'perfect', 'best', 'top', 'leading', 'premier',
    'world', 'class', 'award', 'winning', 'innovative', 'dynamic', 'growing', 'established',
    'well', 'known', 'recognized', 'industry', 'industries', 'sector', 'sectors', 'field',
    'fields', 'candidate', 'candidates', 'looking', 'work', 'team', 'role', 'company',
    'your', 'our', 'able', 'also', 'ensure', 'using', 'use', 'make', 'year', 'years',
    'plus', 'nice', 'preferred', 'strong', 'excellent', 'great', 'good', 'fast', 'paced',
    'environment', 'responsible', 'responsibilities', 'requirements', 'requirement',
    'qualification', 'qualifications', 'skills', 'experience', 'experiences'
  ]);
  
  const words = text.toLowerCase().match(/\b[a-z]{4,}\b/gi) || [];
  const wordCount: Record<string, number> = {};
  
  words.forEach(word => {
    const w = word.toLowerCase();
    if (commonWords.has(w)) return;
    if (/\d/.test(w)) return;
    if (/^\d+$/.test(w)) return;
    wordCount[w] = (wordCount[w] || 0) + 1;
  });
  
  return Object.entries(wordCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 12)
    .map(([word]) => word.charAt(0).toUpperCase() + word.slice(1));
};

const extractSkills = (text: string): string[] => {
  if (!text) return [];
  const skillKeywords = [
    'python', 'javascript', 'react', 'node', 'aws', 'docker', 'kubernetes', 'terraform',
    'typescript', 'java', 'sql', 'mongodb', 'postgresql', 'redis', 'graphql', 'rest',
    'ci/cd', 'jenkins', 'git', 'linux', 'bash', 'shell', 'agile', 'scrum',
    'devops', 'sre', 'microservices', 'api', 'security', 'cybersecurity', 'compliance',
    'monitoring', 'observability', 'prometheus', 'grafana', 'elasticsearch', 'splunk'
  ];
  const foundSkills: string[] = [];
  const lowerText = text.toLowerCase();
  skillKeywords.forEach(skill => {
    const regex = new RegExp(`\\b${skill}\\b`, 'i');
    if (regex.test(lowerText)) {
      foundSkills.push(skill.charAt(0).toUpperCase() + skill.slice(1));
    }
  });
  return [...new Set(foundSkills)].slice(0, 15);
};

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

const extractSoftSkillsFromText = (text: string): string[] => {
  if (!text) return [];
  const lower = text.toLowerCase();
  const found = new Set<string>();
  SOFT_SKILL_KEYWORDS.forEach(skill => {
    if (lower.includes(skill)) {
      found.add(skill.charAt(0).toUpperCase() + skill.slice(1));
    }
  });
  return Array.from(found);
};

const extractAtsInsightsFromText = (text: string) => {
  if (!text) {
    return { action_verbs: [], metrics: [], industry_terms: [] };
  }
  const lower = text.toLowerCase();
  const actionVerbs = ACTION_VERBS.filter(verb => lower.includes(verb));
  const metrics = METRIC_TERMS.filter(term => lower.includes(term));
  const industryTerms = INDUSTRY_TERMS.filter(term => lower.includes(term));
  return {
    action_verbs: Array.from(new Set(actionVerbs.map(v => v.charAt(0).toUpperCase() + v.slice(1)))),
    metrics: Array.from(new Set(metrics.map(v => v.charAt(0).toUpperCase() + v.slice(1)))),
    industry_terms: Array.from(new Set(industryTerms.map(v => v.charAt(0).toUpperCase() + v.slice(1))))
  };
};

const extractLineValue = (patterns: RegExp[], text: string): string | null => {
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match && match[1]) {
      return match[1].trim();
    }
  }
  return null;
};

const GENERIC_HEADINGS = new Set([
  'about the job',
  'job description',
  'job summary',
  'role overview',
  'about this role',
  'responsibilities',
  'what you will do',
  'about us',
  'position overview',
  'about company',
]);

const COMMON_TITLE_WORDS = new Set([
  'senior', 'junior', 'lead', 'principal', 'staff', 'head', 'chief', 'executive', 'director',
  'manager', 'engineer', 'developer', 'designer', 'analyst', 'architect', 'consultant', 'scientist',
  'specialist', 'coordinator', 'administrator', 'associate', 'assistant', 'officer', 'strategist',
  'technician', 'advisor', 'intern', 'fellow', 'product', 'project', 'program', 'operations',
  'marketing', 'sales', 'support', 'customer', 'success', 'experience', 'quality', 'security',
  'compliance', 'platform', 'cloud', 'devops', 'sre', 'site', 'reliability', 'software',
  'hardware', 'data', 'analytics', 'ai', 'ml', 'machine', 'learning', 'finance', 'accounting',
  'people', 'talent', 'human', 'resources', 'hr', 'information', 'technology', 'it', 'systems',
  'full', 'stack', 'full-stack', 'fullstack', 'frontend', 'backend', 'mobile', 'ios', 'android',
  'ux', 'ui', 'creative', 'content', 'editor', 'writer', 'copywriter', 'engineers',
]);

const TITLE_STOP_TOKENS = new Set([
  'to', 'for', 'with', 'in', 'on', 'who', 'that', 'which', 'while', 'where',
  'responsible', 'responsibilities', 'support', 'manage', 'managing', 'lead', 'leading',
  'develop', 'developing', 'design', 'designing', 'build', 'building', 'create', 'creating',
]);

const TITLE_INTRO_PATTERNS = [
  /^we\s+are\s+(?:looking\s+for|seeking|hiring)\s+(?:a|an)?\s*/i,
  /^looking\s+for\s+(?:a|an)?\s*/i,
  /^seeking\s+(?:a|an)?\s*/i,
  /^hiring\s+(?:a|an)?\s*/i,
  /^join\s+our\s+team\s+as\s+(?:a|an)?\s*/i,
  /^the\s+ideal\s+candidate\s+is\s+(?:an?\s+)?/i,
];

const isLikelyTitleToken = (token: string) => {
  if (!token) return false;
  const cleaned = token.replace(/^[^a-z0-9+#/&-]+|[^a-z0-9+#/&-]+$/gi, '');
  if (!cleaned) return false;
  const lower = cleaned.toLowerCase();
  if (COMMON_TITLE_WORDS.has(lower)) return true;
  if (cleaned.length <= 5 && cleaned === cleaned.toUpperCase()) return true;
  if (/[+/&-]/.test(cleaned)) return true;
  return /^[A-Z]/.test(cleaned);
};

const extractJobTitleFromSentence = (value?: string | null): string | null => {
  if (!value) return null;
  let text = value.replace(/\s+/g, ' ').trim();
  if (!text) return null;

  for (const pattern of TITLE_INTRO_PATTERNS) {
    if (pattern.test(text)) {
      text = text.replace(pattern, '').trim();
      break;
    }
  }

  const punctuationIndex = text.search(/[.,;:]/);
  if (punctuationIndex > 0) {
    text = text.slice(0, punctuationIndex).trim();
  }

  const rawTokens = text
    .split(/\s+/)
    .map((token) => token.replace(/^[^a-z0-9+#/&-]+|[^a-z0-9+#/&-]+$/gi, ''))
    .filter(Boolean);

  if (rawTokens.length === 0) return null;

  let start = rawTokens.findIndex((token) => {
    const lower = token.toLowerCase();
    return /^[A-Z]/.test(token) || COMMON_TITLE_WORDS.has(lower);
  });
  if (start === -1) {
    start = 0;
  }

  const selected: string[] = [];
  for (let i = start; i < rawTokens.length; i++) {
    const token = rawTokens[i];
    const lower = token.toLowerCase();
    
    if (TITLE_STOP_TOKENS.has(lower) && selected.length > 0) {
      break;
    }
    
    if (isLikelyTitleToken(token)) {
      selected.push(token);
    } else if (selected.length > 0) {
      selected.push(token);
    } else if (i === start) {
      selected.push(token);
    }
    
    if (selected.length >= 8) break;
  }

  if (selected.length === 0) return null;
  return selected.join(' ');
};

export const deriveJobMetadataFromText = (text: string): JobMetadata | null => {
  if (!text?.trim()) return null;
  const normalized = text.replace(/\r\n?/g, '\n');
  const lines = normalized.split('\n').map((line) => line.trim()).filter(Boolean);

  const metadata: JobMetadata = {};
  const assignTitleFromCandidate = (candidate?: string | null) => {
    if (!candidate) return false;
    const cleaned = extractJobTitleFromSentence(candidate);
    if (cleaned) {
      metadata.title = cleaned;
      return true;
    }
    return false;
  };

  let titleFromLabel = extractLineValue([
    /(?:position|job title|title|role)\s*[:\-]\s*([^\n]+)/i,
    /(?:hiring|seeking|looking for)\s+(?:a|an)?\s*([A-Z][^\n]{3,80})/i,
  ], normalized);

  if (titleFromLabel && GENERIC_HEADINGS.has(titleFromLabel.toLowerCase())) {
    titleFromLabel = null;
  }

  if (titleFromLabel) {
    assignTitleFromCandidate(titleFromLabel);
  }

  const companyFromLabel = extractLineValue([
    /(?:company|employer|organization)\s*[:\-]\s*([^\n]+)/i,
    /(?:at|@)\s*([A-Z][\w\s&.,'-]{2,70})/i,
  ], normalized);

  if (!metadata.title && lines.length > 0) {
    for (let i = 0; i < Math.min(10, lines.length); i++) {
      const line = lines[i];
      if (!line || line.length < 5) continue;
      
      const lineLower = line.toLowerCase();
      if (GENERIC_HEADINGS.has(lineLower)) continue;
      if (/^(logo|show more|apply|save|reposted|people|company|alumni)/i.test(line)) continue;
      if (/^\$[\d,]+/i.test(line)) continue;
      if (/^\d+\s*(days?|hours?|weeks?|months?)\s+ago/i.test(line)) continue;
      
      const seniorTitlePattern = /^(Senior|Lead|Principal|Staff|Junior|Mid-level|Mid|Entry-level|Entry|Associate|Assistant)\s+([A-Z][A-Za-z\s/&-]{2,80}(?:Engineer|Developer|Architect|Manager|Analyst|Specialist|Consultant|Designer|Scientist|Administrator|Coordinator|Director|Executive|Officer|Representative|Technician|Technologist|Advisor|Strategist|Planner|Supervisor|Head|Chief|VP|Vice President|President|CEO|CTO|CFO|COO))(?:\s+at\s+[A-Z][^\n]*)?$/i;
      const seniorMatch = line.match(seniorTitlePattern);
      if (seniorMatch) {
        const fullTitle = seniorMatch[0].replace(/\s+at\s+.*$/i, '').trim();
        if (assignTitleFromCandidate(fullTitle)) {
          break;
        }
      }
      
      const directTitlePattern = /^([A-Z][A-Za-z\s/&-]{3,80}(?:Engineer|Developer|Architect|Manager|Analyst|Specialist|Consultant|Designer|Scientist|Administrator|Coordinator|Director|Executive|Officer|Representative|Associate|Assistant|Technician|Technologist|Advisor|Strategist|Planner|Coordinator|Supervisor|Lead|Head|Chief|VP|Vice President|President|CEO|CTO|CFO|COO))(?:\s+at\s+[A-Z][^\n]*)?$/i;
      const directMatch = line.match(directTitlePattern);
      if (directMatch) {
        const fullTitle = directMatch[1].trim();
        if (fullTitle.split(/\s+/).length >= 2) {
          if (assignTitleFromCandidate(fullTitle)) {
            break;
          }
        }
      }
      
      if (/^[A-Z][a-z]+(\s+[A-Z][a-z]+)+\s+(Engineer|Developer|Architect|Manager|Analyst|Specialist|Consultant|Designer|Scientist|Administrator|Coordinator|Director|Executive|Officer|Representative|Associate|Assistant|Technician|Technologist|Advisor|Strategist|Planner|Coordinator|Supervisor|Lead|Head|Chief)/i.test(line)) {
        const words = line.split(/\s+/);
        let jobTypeIndex = -1;
        for (let j = 0; j < words.length; j++) {
          if (/^(Engineer|Developer|Architect|Manager|Analyst|Specialist|Consultant|Designer|Scientist|Administrator|Coordinator|Director|Executive|Officer|Representative|Associate|Assistant|Technician|Technologist|Advisor|Strategist|Planner|Coordinator|Supervisor|Lead|Head|Chief)/i.test(words[j])) {
            jobTypeIndex = j;
            break;
          }
        }
        if (jobTypeIndex > 0 && jobTypeIndex < words.length) {
          const titleCandidate = words.slice(0, jobTypeIndex + 1).join(' ').replace(/\s+at\s+.*$/i, '').trim();
          if (titleCandidate.length >= 5 && titleCandidate.length <= 80) {
            if (assignTitleFromCandidate(titleCandidate)) {
              break;
            }
          }
        }
      }
    }
  }

  if (!metadata.title && lines.length > 0) {
    const firstLine = lines[0];
    const titleCompanyMatch = firstLine.match(/^([^@\-•]{3,120}?)(?:\s+(?:at|@)\s+(.+))?$/i);
    if (titleCompanyMatch) {
      const [, possibleTitle, possibleCompany] = titleCompanyMatch;
      if (possibleTitle?.trim()) {
        const normalizedTitle = possibleTitle.trim();
        if (!GENERIC_HEADINGS.has(normalizedTitle.toLowerCase())) {
          assignTitleFromCandidate(normalizedTitle);
        }
      }
      if (!metadata.company && !companyFromLabel && possibleCompany?.trim()) {
        metadata.company = possibleCompany.trim();
      }
    } else {
      if (!GENERIC_HEADINGS.has(firstLine.toLowerCase())) {
        assignTitleFromCandidate(firstLine);
      }
    }
  }

  if (!metadata.title && titleFromLabel) {
    const cleanedLabelTitle = extractJobTitleFromSentence(titleFromLabel) || titleFromLabel;
    if (cleanedLabelTitle && !GENERIC_HEADINGS.has(cleanedLabelTitle.toLowerCase())) {
      metadata.title = cleanedLabelTitle;
    }
  }
  if (companyFromLabel) {
    metadata.company = companyFromLabel;
  }

  const locationFromLabel = extractLineValue([
    /(?:location|based in|located|city|office location)\s*[:\-]\s*([^\n]+)/i,
    /(?:location)\s*\|\s*([^\n]+)/i,
    /([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*,\s*[A-Z]{2})\b/i,
  ], normalized);
  
  if (locationFromLabel) {
    const locationLower = locationFromLabel.toLowerCase().trim();
    const isWorkTypeKeyword = locationLower === 'remote' || 
                              locationLower === 'remote work' ||
                              locationLower === 'hybrid' || 
                              locationLower === 'hybrid work' ||
                              locationLower === 'onsite' || 
                              locationLower === 'on-site' ||
                              locationLower === 'on site';
    
    if (isWorkTypeKeyword) {
      metadata.location = '';
    } else {
      metadata.location = locationFromLabel;
    }
  }

  metadata.remoteStatus = extractWorkType(normalized, locationFromLabel ?? '');
  
  if (!metadata.location || metadata.location.trim() === '') {
    const alternativeLocation = extractLineValue([
      /(?:based in|located in|headquarters|office)\s*[:\-]\s*([^\n]+)/i,
      /(?:city|state|country)\s*[:\-]\s*([^\n]+)/i,
    ], normalized);
    if (alternativeLocation && alternativeLocation.toLowerCase().trim() !== metadata.remoteStatus?.toLowerCase()) {
      metadata.location = alternativeLocation;
    }
  }

  metadata.jobType = extractJobType(normalized);
  metadata.budget = extractBudget(normalized);
  metadata.skills = extractSkills(normalized);
  metadata.keywords = extractTopKeywords(normalized);
  metadata.soft_skills = extractSoftSkillsFromText(normalized);
  metadata.high_frequency_keywords = extractTopKeywords(normalized).map((keyword, idx) => ({
    keyword,
    frequency: idx < 5 ? 3 : idx < 10 ? 2 : 1,
    importance: idx < 5 ? 'high' : idx < 10 ? 'medium' : 'low'
  }));
  metadata.ats_insights = extractAtsInsightsFromText(normalized);

  if (!metadata.title) {
    for (let i = 0; i < Math.min(lines.length, 12); i += 1) {
      const candidate = lines[i];
      if (!candidate) continue;
      if (GENERIC_HEADINGS.has(candidate.toLowerCase())) continue;
      if (candidate.startsWith('•') || candidate.startsWith('-')) continue;
      if (candidate.length < 4) continue;
      if (/^(responsibilities|requirements|qualifications|about|role|skills)\b/i.test(candidate.toLowerCase())) continue;
      if (assignTitleFromCandidate(candidate)) {
        break;
      }
    }
  }

  return metadata;
};

