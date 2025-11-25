'use client';

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import config from '@/lib/config';
import { useAuth } from '@/contexts/AuthContext';
import { shouldPromptAuthentication } from '@/lib/guestAuth';

interface MatchAnalysis {
  similarity_score: number;
  technical_score: number;
  matching_keywords: string[];
  missing_keywords: string[];
  technical_matches: string[];
  technical_missing: string[];
  total_job_keywords: number;
  match_count: number;
  missing_count: number;
}

interface ImprovementSuggestion {
  category: string;
  suggestion: string;
}

interface JobMatchResult {
  success: boolean;
  match_analysis: MatchAnalysis;
  keyword_suggestions: Record<string, string[]>;
  improvement_suggestions: ImprovementSuggestion[];
  applied_improvements?: ImprovementSuggestion[];
  score_improvement?: number;
  analysis_summary: {
    overall_match: string;
    technical_match: string;
  };
}

interface JobDescriptionMatcherProps {
  resumeData: any;
  onMatchResult?: (result: JobMatchResult) => void;
  onResumeUpdate?: (updatedResume: any) => void;
  onClose?: () => void;
  standalone?: boolean; // If true, renders with popup wrapper
  initialJobDescription?: string;
  onSelectJobDescriptionId?: (id: number | null) => void;
  currentJobDescriptionId?: number | null; // Pass the current JD ID
}

const GUEST_JOB_STORAGE_KEY = 'guestSavedJobDescriptions';
const GUEST_RESUME_STORAGE_KEY = 'guestSavedResumes';

// Helper functions to extract metadata (same as extension)
const extractJobType = (text: string): string | null => {
  if (!text) return null;
  const lowerText = text.toLowerCase();
  
  // Check for explicit "Full-time" or "Full time" first (most common)
  // Use word boundaries to avoid false matches
  if (/\bfull[-\s]?time\b|\bft\b|permanent\b/i.test(lowerText)) {
    // Double-check it's not part of "part-time" or "full-time equivalent"
    if (!/\bpart[-\s]?time\b/i.test(lowerText)) {
      return 'Full Time';
    }
  }
  
  // Check for contract-to-hire patterns
  if (/\bcth\b|contract[-\s]?to[-\s]?hire|contract-to-hire/i.test(lowerText)) return 'Contractor';
  if (/\bcontractor\b|contract\s+basis\b/i.test(lowerText)) return 'Contractor';
  if (/\bcontract\b|temporary\b|temp\b/i.test(lowerText)) {
    // Make sure it's not "contract-to-hire" which we already checked
    if (!/\bcontract[-\s]?to[-\s]?hire/i.test(lowerText)) {
      return 'Contractor';
    }
  }
  
  // Check for part-time (must be explicit, not just "part" + "time" separately)
  if (/\bpart[-\s]?time\b|\bpt\b/i.test(lowerText)) return 'Part-time';
  
  // Check for internship
  if (/\bintern\b|internship\b/i.test(lowerText)) return 'Internship';
  
  // Default to Full Time if nothing matches
  return 'Full Time';
};

const extractWorkType = (text: string, locationText: string = ''): string | null => {
  if (!text && !locationText) return null;

  // Combine text and location for analysis
  const combinedText = ((text || '') + ' ' + (locationText || '')).toLowerCase();

  // Check if location text itself is a work type keyword (e.g., "Location: Remote")
  if (locationText) {
    const locationLower = locationText.toLowerCase().trim();
    // If location is just "Remote", "Hybrid", or "Onsite", treat it as work type
    if (locationLower === 'remote' || locationLower === 'remote work') {
      return 'Remote';
    }
    if (locationLower === 'hybrid' || locationLower === 'hybrid work') {
      return 'Hybrid';
    }
    if (locationLower === 'onsite' || locationLower === 'on-site' || locationLower === 'on site') {
      return 'Onsite';
    }
    // Check for explicit patterns like "(Remote)", "(Hybrid)", "(On-site)" in location text
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

  // Look for explicit remote indicators first
  if (/remote|work from home|wfh|fully remote|work remotely|remote work|100% remote|fully distributed/i.test(combinedText)) {
    // Check if hybrid is also mentioned
    if (/hybrid|partially remote|some remote|flexible|2-3 days|3 days|few days/i.test(combinedText)) {
      return 'Hybrid';
    }
    return 'Remote';
  }

  // Look for hybrid indicators
  if (/hybrid|partially remote|some remote|flexible remote|remote.*office|office.*remote|2-3 days remote|3 days remote|few days remote/i.test(combinedText)) {
    return 'Hybrid';
  }

  // Look for on-site indicators (only if remote/hybrid not mentioned)
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
  const commonWords = new Set(['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'is', 'are', 'was', 'were', 'be', 'been', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'should', 'could', 'may', 'might', 'must', 'can', 'this', 'that', 'these', 'those', 'i', 'you', 'he', 'she', 'it', 'we', 'they']);
  const words = text.toLowerCase().match(/\b[a-z]{4,}\b/gi) || [];
  const wordCount: Record<string, number> = {};
  words.forEach(word => {
    const w = word.toLowerCase();
    if (!commonWords.has(w)) {
      wordCount[w] = (wordCount[w] || 0) + 1;
    }
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

const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const prettifyKeyword = (keyword: string) => {
  const trimmed = keyword.trim();
  if (!trimmed) return '';
  if (trimmed.length <= 3) return trimmed.toUpperCase();
  return trimmed.replace(/\b\w/g, (char) => char.toUpperCase());
};

interface JobMetadata {
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


const roundScoreValue = (value?: number | null) =>
  typeof value === 'number' && !Number.isNaN(value) ? Math.round(value) : null;

// Highlight missing keywords in generated bullet text
const highlightMissingKeywords = (text: string, missingKeywords: string[]): React.ReactNode => {
  if (!missingKeywords.length || !text) return text;

  const parts: Array<React.ReactNode> = [];
  let lastIndex = 0;

  // Sort keywords by length (longest first) to avoid partial matches
  const sortedKeywords = [...missingKeywords].filter(kw => kw && kw.trim().length > 1).sort((a, b) => b.length - a.length);
  const matches: Array<{ keyword: string, index: number, length: number }> = [];

  sortedKeywords.forEach(keyword => {
    const keywordLower = keyword.toLowerCase().trim();
    try {
      // Handle special characters like "/" in "CI/CD" - don't use word boundaries for these
      const hasSpecialChars = /[\/\-_]/g.test(keywordLower);
      let regex: RegExp;
      if (hasSpecialChars) {
        // For keywords with special chars, escape and match directly (no word boundaries)
        const escaped = keywordLower.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        regex = new RegExp(escaped, 'gi');
      } else {
        // For normal keywords, use word boundaries to avoid partial matches
        const escaped = keywordLower.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        regex = new RegExp(`\\b${escaped}\\b`, 'gi');
      }
      const textMatches = text.matchAll(regex);

      for (const match of textMatches) {
        if (match.index !== undefined && match[0]) {
          matches.push({
            keyword,
            index: match.index,
            length: match[0].length
          });
        }
      }
    } catch (e) {
      console.warn('Error matching keyword:', keyword, e);
    }
  });

  // Sort matches by index and remove overlaps
  matches.sort((a, b) => a.index - b.index);
  const nonOverlapping: typeof matches = [];
  for (const match of matches) {
    const overlaps = nonOverlapping.some(m =>
      (match.index >= m.index && match.index < m.index + m.length) ||
      (match.index + match.length > m.index && match.index + match.length <= m.index + m.length)
    );
    if (!overlaps) {
      nonOverlapping.push(match);
    }
  }

  // Build highlighted parts
  nonOverlapping.forEach(match => {
    // Add text before match
    if (match.index > lastIndex) {
      parts.push(text.substring(lastIndex, match.index));
    }
    // Add highlighted match
    parts.push(
      <mark
        key={`${match.keyword}-${match.index}`}
        className="bg-yellow-300 font-semibold px-0.5 rounded"
        title={`Missing keyword: ${match.keyword}`}
      >
        {text.substring(match.index, match.index + match.length)}
      </mark>
    );
    lastIndex = match.index + match.length;
  });

  // Add remaining text
  if (lastIndex < text.length) {
    parts.push(text.substring(lastIndex));
  }

  return parts.length > 0 ? <>{parts}</> : text;
};

// Extract missing keywords found in a bullet
const getMissingKeywordsInBullet = (bulletText: string, missingKeywords: string[]): string[] => {
  const found: string[] = [];
  const bulletLower = bulletText.toLowerCase();
  
  missingKeywords.forEach(keyword => {
    const keywordLower = keyword.toLowerCase().trim();
    if (keywordLower.length > 1) {
      try {
        const escaped = keywordLower.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const regex = new RegExp(`\\b${escaped}\\b`, 'i');
        if (regex.test(bulletLower)) {
          found.push(keyword);
        }
      } catch (e) {
        // Skip invalid regex
      }
    }
  });
  
  return found;
};

const mergeMetadata = (base: JobMetadata | null, updates: JobMetadata | null): JobMetadata | null => {
  if (!updates) return base;
  const merged: JobMetadata = { ...(base || {}) };
  (Object.keys(updates) as (keyof JobMetadata)[]).forEach((key) => {
    const updateValue = updates[key];
    if (Array.isArray(updateValue)) {
      if (updateValue.length > 0) {
        (merged as any)[key] = updateValue;
      }
    } else if (updateValue && typeof updateValue === 'object') {
      (merged as any)[key] = {
        ...(merged as any)[key],
        ...updateValue,
      };
    } else if (updateValue !== undefined && updateValue !== null && updateValue !== '') {
      (merged as any)[key] = updateValue;
    }
  });
  return merged;
};

const normalizeTextForATS = (value?: string | null) => {
  if (!value) return '';
  return value
    .replace(/\r\n?/g, ' ')
    .replace(/\*\*/g, '')
    .replace(/^•\s*/gm, '')
    .replace(/•/g, '')
    .replace(/\s+/g, ' ')
    .trim();
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
  'senior',
  'junior',
  'lead',
  'principal',
  'staff',
  'head',
  'chief',
  'executive',
  'director',
  'manager',
  'engineer',
  'developer',
  'designer',
  'analyst',
  'architect',
  'consultant',
  'scientist',
  'specialist',
  'coordinator',
  'administrator',
  'associate',
  'assistant',
  'officer',
  'strategist',
  'technician',
  'advisor',
  'engineer',
  'developer',
  'consultant',
  'intern',
  'fellow',
  'product',
  'project',
  'program',
  'operations',
  'marketing',
  'sales',
  'support',
  'customer',
  'success',
  'experience',
  'quality',
  'security',
  'compliance',
  'platform',
  'cloud',
  'devops',
  'sre',
  'site',
  'reliability',
  'software',
  'hardware',
  'data',
  'analytics',
  'ai',
  'ml',
  'machine',
  'learning',
  'finance',
  'accounting',
  'people',
  'talent',
  'human',
  'resources',
  'hr',
  'information',
  'technology',
  'it',
  'systems',
  'full',
  'stack',
  'full-stack',
  'fullstack',
  'frontend',
  'backend',
  'mobile',
  'ios',
  'android',
  'ux',
  'ui',
  'creative',
  'content',
  'editor',
  'writer',
  'copywriter',
  'engineers',
]);

const TITLE_STOP_TOKENS = new Set([
  'to',
  'for',
  'with',
  'in',
  'on',
  'who',
  'that',
  'which',
  'while',
  'where',
  'responsible',
  'responsibilities',
  'support',
  'supporting',
  'help',
  'helping',
  'join',
  'joining',
  'drive',
  'driving',
  'deliver',
  'delivering',
  'ensure',
  'ensuring',
  'work',
  'working',
  'collaborate',
  'collaborating',
  'partner',
  'partnering',
  'lead',
  'leading',
  'manage',
  'managing',
  'oversee',
  'overseeing',
  'design',
  'designing',
  'develop',
  'developing',
  'build',
  'building',
  'create',
  'creating',
  'maintain',
  'maintaining',
  'implement',
  'implementing',
  'coordinate',
  'coordinating',
  'plan',
  'planning',
  'execute',
  'executing',
  'deliverables',
  'across',
  'across,',
  'and,',
  'including',
  'own',
  'owning',
  'ownership',
  'enable',
  'enabling',
  'help',
  'ensure',
]);

const TITLE_INTRO_PATTERNS = [
  /^we\s*(?:are|'re)\s*(?:looking|seeking|hiring)\s*for\s+(?:an?\s+)?/i,
  /^we\s*(?:are|'re)\s*(?:seeking|hiring)\s+(?:an?\s+)?/i,
  /^looking\s+for\s+(?:an?\s+)?/i,
  /^seeking\s+(?:an?\s+)?/i,
  /^hiring\s+(?:an?\s+)?/i,
  /^as\s+(?:an?\s+)?/i,
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
  for (let i = start; i < rawTokens.length; i += 1) {
    const token = rawTokens[i];
    if (!token) continue;
    const lower = token.toLowerCase();
    if (selected.length > 0 && TITLE_STOP_TOKENS.has(lower)) break;
    if ((lower === 'a' || lower === 'an' || lower === 'the') && selected.length === 0) continue;
    if (lower === 'and' && selected.length > 0) {
      // Allow "and" only if next token looks like part of a title
      const nextToken = rawTokens[i + 1];
      if (nextToken && isLikelyTitleToken(nextToken)) {
        selected.push('and');
        continue;
      }
      break;
    }
    selected.push(token);
    if (selected.length >= 8) break;
  }

  while (selected.length && !isLikelyTitleToken(selected[0])) {
    selected.shift();
  }
  while (selected.length && !isLikelyTitleToken(selected[selected.length - 1])) {
    selected.pop();
  }

  const candidate = selected.join(' ').trim();
  if (!candidate) return null;
  const words = candidate.split(/\s+/);
  if (words.length === 0 || words.length > 8) return null;
  if (/^(?:looking|seeking|hiring)\b/i.test(candidate)) return null;

  const formatted = words
    .map((word, idx) => {
      const lower = word.toLowerCase();
      if ((lower === 'and' || lower === 'of' || lower === 'for' || lower === 'to') && idx !== 0) {
        return lower;
      }
      if (word.toUpperCase() === word || /[A-Z]/.test(word.slice(1))) {
        return word;
      }
      if (word.includes('/')) {
        return word
          .split('/')
          .map((part) => (part ? part.charAt(0).toUpperCase() + part.slice(1).toLowerCase() : part))
          .join('/');
      }
      if (word.includes('-')) {
        return word
          .split('-')
          .map((part) => (part ? part.charAt(0).toUpperCase() + part.slice(1).toLowerCase() : part))
          .join('-');
      }
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    })
    .join(' ');

  return formatted;
};

const extractKeyPhrases = (text: string): string[] => {
  if (!text) return [];
  const cleaned = text.replace(/\r\n?/g, '\n');
  const phrases: Record<string, number> = {};
  const lines = cleaned.split('\n');
  const recordPhrase = (phrase: string) => {
    const normalized = phrase.trim().toLowerCase();
    if (!normalized) return;
    if (normalized.length < 4) return;
    if (GENERIC_HEADINGS.has(normalized)) return;
    phrases[normalized] = (phrases[normalized] || 0) + 1;
  };

  lines.forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed) return;
    const tokens = trimmed.split(/[^a-zA-Z0-9+/&]+/).filter(Boolean);
    for (let i = 0; i < tokens.length; i += 1) {
      const unigram = tokens[i];
      if (unigram && unigram.length > 3) {
        recordPhrase(unigram);
      }
      if (i + 1 < tokens.length) {
        const bigram = `${tokens[i]} ${tokens[i + 1]}`;
        recordPhrase(bigram);
      }
      if (i + 2 < tokens.length) {
        const trigram = `${tokens[i]} ${tokens[i + 1]} ${tokens[i + 2]}`;
        recordPhrase(trigram);
      }
    }
  });

  return Object.entries(phrases)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 40)
    .map(([phrase]) => phrase.split(' ').map((token) => token.charAt(0).toUpperCase() + token.slice(1)).join(' '));
};

const deriveJobMetadataFromText = (text: string): JobMetadata | null => {
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

  // Try to extract title from common patterns first
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

  // Look for title patterns in the first few lines
  // Common pattern: "Senior Dev Ops Engineer" or "Senior DevOps Engineer" at start
  if (!metadata.title && lines.length > 0) {
    // Check first 10 lines for title-like patterns (in case there are logos/headers)
    for (let i = 0; i < Math.min(10, lines.length); i++) {
      const line = lines[i];
      if (!line || line.length < 5) continue;
      
      // Skip generic headings and common non-title lines
      const lineLower = line.toLowerCase();
      if (GENERIC_HEADINGS.has(lineLower)) continue;
      if (/^(logo|show more|apply|save|reposted|people|company|alumni)/i.test(line)) continue;
      if (/^\$[\d,]+/i.test(line)) continue; // Skip salary lines
      if (/^\d+\s*(days?|hours?|weeks?|months?)\s+ago/i.test(line)) continue; // Skip time stamps
      
      // Pattern 1: Senior/Lead/etc + Tech words (Dev Ops, DevOps, etc.) + Engineer/Developer/etc
      // This catches "Senior Dev Ops Engineer", "Senior DevOps Engineer", etc.
      const seniorTitlePattern = /^(Senior|Lead|Principal|Staff|Junior|Mid-level|Mid|Entry-level|Entry|Associate|Assistant)\s+([A-Z][A-Za-z\s/&-]{2,80}(?:Engineer|Developer|Architect|Manager|Analyst|Specialist|Consultant|Designer|Scientist|Administrator|Coordinator|Director|Executive|Officer|Representative|Technician|Technologist|Advisor|Strategist|Planner|Supervisor|Head|Chief|VP|Vice President|President|CEO|CTO|CFO|COO))(?:\s+at\s+[A-Z][^\n]*)?$/i;
      const seniorMatch = line.match(seniorTitlePattern);
      if (seniorMatch) {
        const fullTitle = seniorMatch[0].replace(/\s+at\s+.*$/i, '').trim();
        if (assignTitleFromCandidate(fullTitle)) {
          break;
        }
      }
      
      // Pattern 2: Direct job title with Engineer/Developer/etc (without senior/lead prefix)
      const directTitlePattern = /^([A-Z][A-Za-z\s/&-]{3,80}(?:Engineer|Developer|Architect|Manager|Analyst|Specialist|Consultant|Designer|Scientist|Administrator|Coordinator|Director|Executive|Officer|Representative|Associate|Assistant|Technician|Technologist|Advisor|Strategist|Planner|Coordinator|Supervisor|Lead|Head|Chief|VP|Vice President|President|CEO|CTO|CFO|COO))(?:\s+at\s+[A-Z][^\n]*)?$/i;
      const directMatch = line.match(directTitlePattern);
      if (directMatch) {
        const fullTitle = directMatch[1].trim();
        // Make sure it's not just a single word
        if (fullTitle.split(/\s+/).length >= 2) {
          if (assignTitleFromCandidate(fullTitle)) {
            break;
          }
        }
      }
      
      // Pattern 3: Look for lines that start with capital words and contain job-related terms
      // This catches titles like "Dev Ops Engineer" even if not at the very start
      if (/^[A-Z][a-z]+(\s+[A-Z][a-z]+)+\s+(Engineer|Developer|Architect|Manager|Analyst|Specialist|Consultant|Designer|Scientist|Administrator|Coordinator|Director|Executive|Officer|Representative|Associate|Assistant|Technician|Technologist|Advisor|Strategist|Planner|Coordinator|Supervisor|Lead|Head|Chief)/i.test(line)) {
        const words = line.split(/\s+/);
        // Find where the job type word starts (Engineer, Developer, etc.)
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

  // Fallback: try first line if no title found yet
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
    // Pattern for "City, State" format (e.g., "Atlanta, GA")
    /([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*,\s*[A-Z]{2})\b/i,
  ], normalized);
  
  // Check if the extracted location is actually a work type keyword
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
      // Don't set as location, it will be handled as work type
      metadata.location = '';
    } else {
      metadata.location = locationFromLabel;
    }
  }

  // Extract work type first (it may use location info)
  metadata.remoteStatus = extractWorkType(normalized, locationFromLabel ?? '');
  
  // If location was a work type keyword, try to find actual location elsewhere
  if (!metadata.location || metadata.location.trim() === '') {
    // Try to extract location from other patterns
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

const normalizeMatchResult = (result: JobMatchResult | null): JobMatchResult | null => {
  if (!result) return result;
  const normalizedSimilarity = roundScoreValue(result.match_analysis?.similarity_score) ?? 0;
  const normalizedTechnical = roundScoreValue(result.match_analysis?.technical_score) ?? result.match_analysis?.technical_score ?? 0;

  return {
    ...result,
    match_analysis: {
      ...result.match_analysis,
      similarity_score: normalizedSimilarity,
      technical_score: normalizedTechnical,
      match_count: Math.round(result.match_analysis?.match_count ?? 0),
      missing_count: Math.round(result.match_analysis?.missing_count ?? 0),
      total_job_keywords: Math.round(result.match_analysis?.total_job_keywords ?? 0),
    },
  };
};

export default function JobDescriptionMatcher({ resumeData, onMatchResult, onResumeUpdate, onClose, standalone = true, initialJobDescription, onSelectJobDescriptionId, currentJobDescriptionId }: JobDescriptionMatcherProps) {
  const { user, isAuthenticated } = useAuth();
  const [jobDescription, setJobDescription] = useState(initialJobDescription || '');
  const [selectedJobMetadata, setSelectedJobMetadata] = useState<JobMetadata | null>(null);
  const [currentJDInfo, setCurrentJDInfo] = useState<{ company?: string, title?: string, easy_apply_url?: string } | null>(null);
  const [extractedKeywords, setExtractedKeywords] = useState<any>(null);
  const [isExtractingKeywords, setIsExtractingKeywords] = useState(false);
  const [keywordComparison, setKeywordComparison] = useState<{matched: string[], missing: string[]} | null>(null);

  // Load job description from localStorage if not provided via prop
  useEffect(() => {
    if (initialJobDescription) {
      setJobDescription(initialJobDescription);
    } else if (typeof window !== 'undefined' && !jobDescription.trim()) {
      const savedJD = localStorage.getItem('deepLinkedJD');
      if (savedJD) {
        setJobDescription(savedJD);
      }
    }
  }, [initialJobDescription]);

  // Also check localStorage when component mounts or when currentJobDescriptionId changes
  useEffect(() => {
    if (currentJobDescriptionId && typeof window !== 'undefined' && !jobDescription.trim()) {
      const savedJD = localStorage.getItem('deepLinkedJD');
      if (savedJD) {
        setJobDescription(savedJD);
      } else {
        // Try to fetch from API if not in localStorage
        Promise.all([
          fetch(`${config.apiBase}/api/jobs/${currentJobDescriptionId}`).then(res => {
            if (!res.ok && res.status === 404) return null;
            return res.ok ? res.json() : null;
          }).catch(() => null),
          fetch(`${config.apiBase}/api/job-descriptions/${currentJobDescriptionId}`).then(res => {
            if (!res.ok && res.status === 404) return null;
            return res.ok ? res.json() : null;
          }).catch(() => null)
        ]).then(([newJob, legacyJob]) => {
          const jobData = newJob || legacyJob;
          if (jobData) {
            const description = newJob?.description || legacyJob?.content || '';
            if (description) {
              setJobDescription(description);
              if (typeof window !== 'undefined') {
                localStorage.setItem('deepLinkedJD', description);
              }
            }
          } else {
            // Job description not found - clear stale ID from localStorage if present
            if (typeof window !== 'undefined') {
              const savedId = localStorage.getItem('activeJobDescriptionId');
              if (savedId === String(currentJobDescriptionId)) {
                localStorage.removeItem('activeJobDescriptionId');
              }
            }
          }
        }).catch(() => { });
      }
    }
  }, [currentJobDescriptionId, jobDescription]);
  useEffect(() => {
    if (!jobDescription?.trim()) return;
    const extracted = deriveJobMetadataFromText(jobDescription);
    setSelectedJobMetadata((prev) => mergeMetadata(prev, extracted));
  }, [jobDescription]);

  // Auto-extract keywords when JD is pasted/updated (debounced)
  useEffect(() => {
    if (!jobDescription?.trim() || jobDescription.length < 50) {
      setExtractedKeywords(null);
      return;
    }

    const timeoutId = setTimeout(async () => {
      setIsExtractingKeywords(true);
      try {
        const response = await fetch(`${config.apiBase}/api/ai/extract_job_keywords`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ job_description: jobDescription }),
        });

        if (response.ok) {
          const result = await response.json();
          setExtractedKeywords(result);
          
          // Update metadata with extracted keywords
          if (result.high_intensity_keywords || result.technical_keywords) {
            setSelectedJobMetadata((prev) => mergeMetadata(prev, {
              keywords: result.high_priority_keywords?.slice(0, 15) || [],
              high_frequency_keywords: result.high_intensity_keywords || [],
              skills: result.technical_keywords || [],
              soft_skills: result.soft_skills || [],
            }));
          }

          // Compare extracted keywords with resume
          if (resumeData && (result.high_priority_keywords?.length > 0 || result.technical_keywords?.length > 0)) {
            const resumeFragments: string[] = [];
            const appendText = (value?: string) => {
              const normalized = normalizeTextForATS(value);
              if (normalized) {
                resumeFragments.push(normalized.toLowerCase());
              }
            };

            appendText(resumeData.title);
            appendText(resumeData.summary);
            if (resumeData.sections && Array.isArray(resumeData.sections)) {
              resumeData.sections.forEach((section: any) => {
                appendText(section.title);
                if (section.bullets && Array.isArray(section.bullets)) {
                  section.bullets
                    .filter((bullet: any) => bullet?.params?.visible !== false)
                    .forEach((bullet: any) => appendText(bullet?.text));
                }
              });
            }

            const resumeText = resumeFragments.join(' ').replace(/\s+/g, ' ').trim().toLowerCase();
            
            const allKeywords = new Set<string>();
            (result.high_priority_keywords || []).forEach((kw: string) => allKeywords.add(kw.toLowerCase()));
            (result.technical_keywords || []).forEach((kw: string) => allKeywords.add(kw.toLowerCase()));

            const matched: string[] = [];
            const missing: string[] = [];

            allKeywords.forEach((keyword) => {
              // Handle special characters like "/" in "CI/CD" - don't use word boundaries for these
              const hasSpecialChars = /[\/\-_]/g.test(keyword);
              let pattern: RegExp;
              if (hasSpecialChars) {
                // For keywords with special chars, escape and match directly (no word boundaries)
                const escaped = keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                pattern = new RegExp(escaped, 'i');
              } else {
                // For normal keywords, use word boundaries to avoid partial matches
                pattern = new RegExp(`\\b${keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
              }
              if (pattern.test(resumeText)) {
                matched.push(keyword);
              } else {
                missing.push(keyword);
              }
            });

            setKeywordComparison({ matched, missing });
          }
        }
      } catch (error) {
        console.error('Failed to extract keywords:', error);
      } finally {
        setIsExtractingKeywords(false);
      }
    }, 1000); // Debounce 1 second

    return () => clearTimeout(timeoutId);
  }, [jobDescription, resumeData]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [matchResult, setMatchResult] = useState<JobMatchResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [currentATSScore, setCurrentATSScore] = useState<number | null>(null);
  const [updatedATSScore, setUpdatedATSScore] = useState<number | null>(null);
  const [isCalculatingATS, setIsCalculatingATS] = useState(false);
  const [previousATSScore, setPreviousATSScore] = useState<number | null>(null);
  const [scoreChange, setScoreChange] = useState<number | null>(null);

  const showGuestNotification = useCallback((title: string, message: string) => {
    if (typeof window === 'undefined') return
    const notification = document.createElement('div')
    notification.className = 'fixed top-4 right-4 bg-blue-600 text-white px-6 py-4 rounded-lg shadow-2xl z-[10001] max-w-md'
    notification.innerHTML = `
      <div class="flex items-start gap-3">
        <div class="text-2xl">✨</div>
        <div>
          <div class="font-bold text-lg">${title}</div>
          <div class="text-sm mt-1 leading-snug">${message}</div>
        </div>
        <button class="ml-4 text-white/80 hover:text-white text-xl" aria-label="Close">&times;</button>
      </div>
    `
    const closeButton = notification.querySelector('button')
    const remove = () => notification.remove()
    closeButton?.addEventListener('click', remove)
    window.setTimeout(remove, 4000)
    document.body.appendChild(notification)
  }, [])

  const saveGuestJobDescriptionLocally = useCallback((): number | null => {
    if (typeof window === 'undefined') return null
    try {
      const stored = window.localStorage.getItem(GUEST_JOB_STORAGE_KEY)
      const existing: any[] = stored ? JSON.parse(stored) : []
      const fallbackTitle = selectedJobMetadata?.title || currentJDInfo?.title || 'Job Description'
      const entryId = Date.now()
      const entry = {
        id: entryId,
        title: fallbackTitle,
        company: selectedJobMetadata?.company || currentJDInfo?.company || '',
        content: jobDescription,
        savedAt: new Date().toISOString()
      }
      existing.unshift(entry)
      window.localStorage.setItem(GUEST_JOB_STORAGE_KEY, JSON.stringify(existing.slice(0, 5)))
      showGuestNotification('Saved locally', 'We remembered this job. Create a free account to sync it across devices.')
      return entryId
    } catch (error) {
      console.error('Failed to store guest job description', error)
      showGuestNotification('Almost there', 'Please create a free account to save jobs permanently.')
      return null
    }
  }, [jobDescription, selectedJobMetadata, currentJDInfo, showGuestNotification])

  const saveGuestResumeLocally = useCallback((name: string, data: any) => {
    if (typeof window === 'undefined') return
    try {
      const stored = window.localStorage.getItem(GUEST_RESUME_STORAGE_KEY)
      const existing: any[] = stored ? JSON.parse(stored) : []
      const entry = {
        id: Date.now(),
        name,
        resume: data,
        savedAt: new Date().toISOString()
      }
      existing.unshift(entry)
      window.localStorage.setItem(GUEST_RESUME_STORAGE_KEY, JSON.stringify(existing.slice(0, 5)))
      showGuestNotification('Resume saved locally', 'Sign in when you are ready to keep versions forever.')
    } catch (error) {
      console.error('Failed to store guest resume', error)
      showGuestNotification('Almost there', 'Create a free account to save resumes to your profile.')
    }
  }, [showGuestNotification])

  const buildPrecomputedKeywordPayload = useCallback(() => {
    if (!jobDescription?.trim()) return null;

    const missingKeywords = matchResult?.match_analysis?.missing_keywords || [];
    const matchingKeywords = matchResult?.match_analysis?.matching_keywords || [];

    const baseSkills = selectedJobMetadata?.skills && selectedJobMetadata.skills.length > 0
      ? selectedJobMetadata.skills
      : extractSkills(jobDescription);

    const softSkills = selectedJobMetadata?.soft_skills && selectedJobMetadata.soft_skills.length > 0
      ? selectedJobMetadata.soft_skills
      : extractSoftSkillsFromText(jobDescription);

    const atsInsights = selectedJobMetadata?.ats_insights
      ? selectedJobMetadata.ats_insights
      : extractAtsInsightsFromText(jobDescription);

    const keyPhrases = extractKeyPhrases(jobDescription);
    const keywordImportance = new Map<string, 'high' | 'medium' | 'low'>();
    const keywordFrequency = new Map<string, number>();
    const keywordOriginal = new Map<string, string>();

    const registerKeyword = (value: string, importance: 'high' | 'medium' | 'low' = 'medium') => {
      const normalized = value.trim();
      if (!normalized) return;
      const normalizedLower = normalized.toLowerCase();
      if (GENERIC_HEADINGS.has(normalizedLower)) return;
      const currentImportance = keywordImportance.get(normalizedLower);
      if (!currentImportance || (importance === 'high') || (importance === 'medium' && currentImportance === 'low')) {
        keywordImportance.set(normalizedLower, importance);
      }
      keywordOriginal.set(normalizedLower, normalized);
      keywordFrequency.set(normalizedLower, (keywordFrequency.get(normalizedLower) || 0) + 1);
    };

    (selectedJobMetadata?.keywords || extractTopKeywords(jobDescription)).forEach((keyword) => registerKeyword(keyword, 'medium'));
    keyPhrases.forEach((phrase) => registerKeyword(phrase, 'medium'));
    matchingKeywords.forEach((keyword) => registerKeyword(keyword, 'medium'));
    missingKeywords.forEach((keyword) => registerKeyword(keyword, 'high'));
    (selectedJobMetadata?.high_frequency_keywords || []).forEach((item: any) => {
      const keyword = typeof item === 'string' ? item : item?.keyword;
      if (!keyword) return;
      const importance = typeof item === 'object' && item?.importance ? item.importance : 'high';
      registerKeyword(keyword, importance === 'medium' || importance === 'low' ? importance : 'high');
    });
    atsInsights.action_verbs?.forEach((verb) => registerKeyword(verb, 'medium'));
    atsInsights.metrics?.forEach((metric) => registerKeyword(metric, 'medium'));
    atsInsights.industry_terms?.forEach((term) => registerKeyword(term, 'medium'));

    const generalKeywords = Array.from(keywordImportance.keys());
    const freqMap = generalKeywords.reduce((acc, key) => {
      acc[key] = keywordFrequency.get(key) || 1;
      return acc;
    }, {} as Record<string, number>);

    const highFrequencyKeywords = Array.from(keywordImportance.entries())
      .map(([key, importance]) => ({
        keyword: keywordOriginal.get(key) || key,
        frequency: keywordFrequency.get(key) || 1,
        importance,
      }))
      .sort((a, b) => {
        const importanceOrder = { high: 2, medium: 1, low: 0 } as const;
        if (importanceOrder[b.importance] !== importanceOrder[a.importance]) {
          return importanceOrder[b.importance] - importanceOrder[a.importance];
        }
        return (b.frequency || 0) - (a.frequency || 0);
      })
      .slice(0, 60);

    const extractedKeywordsPayload = {
      technical_keywords: baseSkills.map((skill) => skill.toLowerCase()),
      general_keywords: generalKeywords,
      soft_skills: softSkills,
      high_frequency_keywords: highFrequencyKeywords,
      ats_keywords: atsInsights,
      keyword_frequency: freqMap,
      total_keywords: Object.values(freqMap).reduce((sum, count) => sum + count, 0)
    };

    const prioritySet = new Set<string>();
    highFrequencyKeywords.forEach((item) => {
      if (item.importance === 'high') {
        prioritySet.add(item.keyword.toLowerCase());
      }
    });
    missingKeywords.forEach((keyword) => prioritySet.add(keyword.toLowerCase()));

    if (prioritySet.size === 0) {
      generalKeywords.slice(0, 10).forEach((keyword) => prioritySet.add(keyword.toLowerCase()));
    }

    return {
      extractedKeywordsPayload,
      priorityKeywords: Array.from(prioritySet).map((keyword) => keyword.charAt(0).toUpperCase() + keyword.slice(1)),
      softSkills,
      highFrequencyKeywords,
      atsInsights
    };
  }, [jobDescription, selectedJobMetadata, matchResult]);

  const estimatedATS = useMemo(() => {
    if (!resumeData) return null;
    const keywordBundle = buildPrecomputedKeywordPayload();
    if (!keywordBundle) return null;

    const keywordSet = new Set<string>();
    const addKeyword = (value: string) => {
      if (value && value.trim()) {
        keywordSet.add(value.trim().toLowerCase());
      }
    };

    keywordBundle.extractedKeywordsPayload.general_keywords.forEach(addKeyword);
    keywordBundle.extractedKeywordsPayload.technical_keywords.forEach(addKeyword);
    keywordBundle.highFrequencyKeywords.forEach((item) => addKeyword(item.keyword));
    if (keywordBundle.atsInsights) {
      keywordBundle.atsInsights.action_verbs?.forEach(addKeyword);
      keywordBundle.atsInsights.metrics?.forEach(addKeyword);
      keywordBundle.atsInsights.industry_terms?.forEach(addKeyword);
    }

    const totalKeywords = keywordSet.size;
    if (totalKeywords === 0) {
      return null;
    }

    const resumeFragments: string[] = [];
    const appendText = (value?: string) => {
      const normalized = normalizeTextForATS(value);
      if (normalized) {
        resumeFragments.push(normalized.toLowerCase());
      }
    };

    appendText(resumeData.title);
    appendText(resumeData.summary);
    if (resumeData.sections && Array.isArray(resumeData.sections)) {
      resumeData.sections.forEach((section: any) => {
        appendText(section.title);
        if (section.bullets && Array.isArray(section.bullets)) {
          section.bullets
            .filter((bullet: any) => bullet?.params?.visible !== false)
            .forEach((bullet: any) => appendText(bullet?.text));
        }
      });
    }

    const resumeText = resumeFragments.join(' ').replace(/\s+/g, ' ').trim();
    if (!resumeText) {
      return null;
    }

    const matchedKeywords: string[] = [];
    const missingKeywords: string[] = [];

    keywordSet.forEach((keyword) => {
      // Handle special characters like "/" in "CI/CD" - don't use word boundaries for these
      const hasSpecialChars = /[\/\-_]/g.test(keyword);
      let pattern: RegExp;
      if (hasSpecialChars) {
        // For keywords with special chars, escape and match directly (no word boundaries)
        pattern = new RegExp(escapeRegExp(keyword), 'i');
      } else {
        // For normal keywords, use word boundaries to avoid partial matches
        pattern = new RegExp(`\\b${escapeRegExp(keyword)}\\b`, 'i');
      }
      if (pattern.test(resumeText)) {
        matchedKeywords.push(keyword);
      } else {
        missingKeywords.push(keyword);
      }
    });

    const score = Math.round((matchedKeywords.length / totalKeywords) * 100);

    return {
      score,
      matchedKeywords,
      missingKeywords,
      totalKeywords,
    };
  }, [resumeData, buildPrecomputedKeywordPayload]);

  const atsKeywordMetrics = useMemo(() => {
    if (!matchResult?.match_analysis) {
      return { keywordCoverage: null, matchedCount: null, totalCount: null, missingCount: null };
    }
    const analysis = matchResult.match_analysis;
    const matched =
      typeof analysis.match_count === 'number'
        ? analysis.match_count
        : analysis.matching_keywords?.length ?? 0;
    const missing =
      typeof analysis.missing_count === 'number'
        ? analysis.missing_count
        : analysis.missing_keywords?.length ?? 0;
    const total = analysis.total_job_keywords || matched + missing;
    const coverage = total ? Math.round((matched / total) * 100) : null;

    return {
      keywordCoverage: coverage,
      matchedCount: matched,
      totalCount: total || null,
      missingCount: missing,
    };
  }, [matchResult]);

  const overallATSScoreRaw = matchResult?.match_analysis?.similarity_score ?? currentATSScore ?? null;
  const overallATSScore = roundScoreValue(overallATSScoreRaw);

  const scoreSnapshotBase = useMemo(() => {
    if (!matchResult && overallATSScore === null && !estimatedATS) {
      return null;
    }

    const matchedCount =
      atsKeywordMetrics.matchedCount ?? estimatedATS?.matchedKeywords.length ?? null;
    const totalCount =
      atsKeywordMetrics.totalCount ?? (estimatedATS?.totalKeywords ?? null);
    const coverage =
      atsKeywordMetrics.keywordCoverage ??
      (totalCount && matchedCount !== null ? Math.round((matchedCount / totalCount) * 100) : null);
    const missingCount =
      atsKeywordMetrics.missingCount ??
      (totalCount !== null && matchedCount !== null ? Math.max(totalCount - matchedCount, 0) : null);
    const missingSample =
      (estimatedATS?.missingKeywords?.length
        ? estimatedATS.missingKeywords.slice(0, 5)
        : matchResult?.match_analysis?.missing_keywords?.slice(0, 5)) || [];
    const matchingSample =
      (matchResult?.match_analysis?.matching_keywords?.length
        ? matchResult.match_analysis.matching_keywords.slice(0, 5)
        : estimatedATS?.matchedKeywords?.slice(0, 5)) || [];

    if (overallATSScore === null && estimatedATS?.score == null && coverage == null) {
      return null;
    }

    return {
      overall_score: overallATSScore,
      estimated_keyword_score: estimatedATS?.score ?? null,
      keyword_coverage: coverage,
      total_keywords: totalCount,
      matched_keywords_count: matchedCount,
      missing_keywords_count: missingCount,
      missing_keywords_sample: missingSample,
      matching_keywords_sample: matchingSample,
      analysis_summary: matchResult?.analysis_summary?.overall_match || null,
      match_tier:
        overallATSScore !== null
          ? overallATSScore >= 80
            ? 'excellent'
            : overallATSScore >= 60
              ? 'strong'
              : overallATSScore >= 40
                ? 'fair'
                : 'needs_improvement'
          : null,
    };
  }, [atsKeywordMetrics, estimatedATS, matchResult, overallATSScore]);

  // Function to recalculate ATS score
  const recalculateATSScore = useCallback(async (resumeDataToUse: any, showLoading = true) => {
    if (!jobDescription || !resumeDataToUse) {
      return null;
    }

    if (showLoading) {
      setIsAnalyzing(true);
    }

    try {
      const cleanedResumeData = {
        name: resumeDataToUse.name || '',
        title: normalizeTextForATS(resumeDataToUse.title),
        email: resumeDataToUse.email || '',
        phone: resumeDataToUse.phone || '',
        location: normalizeTextForATS(resumeDataToUse.location),
        summary: normalizeTextForATS(resumeDataToUse.summary),
        sections: (resumeDataToUse.sections || []).map((section: any) => ({
          id: section.id,
          title: normalizeTextForATS(section.title),
          bullets: (section.bullets || [])
            .filter((bullet: any) => bullet?.params?.visible !== false)
            .map((bullet: any) => ({
              id: bullet.id,
              text: normalizeTextForATS(bullet.text),
              params: {}
            }))
        }))
      };

      const matchRes = await fetch(`${config.apiBase}/api/ai/match_job_description`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          job_description: jobDescription,
          resume_data: cleanedResumeData
        }),
      });

      if (matchRes.ok) {
        const matchData = await matchRes.json() as JobMatchResult;
        const normalizedMatchData = normalizeMatchResult(matchData);
        const newScore = normalizedMatchData?.match_analysis?.similarity_score ?? null;

        setMatchResult(normalizedMatchData);

        // Track score change using functional update to get current value
        setCurrentATSScore((prevScore) => {
          const previousRounded = roundScoreValue(prevScore);
          const nextRounded = roundScoreValue(newScore);

          if (previousRounded !== null && nextRounded !== null) {
            const change = nextRounded - previousRounded;
            setScoreChange(change !== 0 ? change : null);
            setPreviousATSScore(previousRounded);

            // Clear score change indicator after 5 seconds
            setTimeout(() => {
              setScoreChange(null);
              setPreviousATSScore(null);
            }, 5000);
          } else if (previousRounded === null && nextRounded !== null) {
            setPreviousATSScore(null);
            setScoreChange(null);
          }

          return nextRounded;
        });

        // Update localStorage
        if (typeof window !== 'undefined') {
          try {
            localStorage.setItem('currentMatchResult', JSON.stringify(normalizedMatchData));
            const jdKeywords = {
              matching: normalizedMatchData?.match_analysis?.matching_keywords || [],
              missing: normalizedMatchData?.match_analysis?.missing_keywords || [],
              high_frequency: selectedJobMetadata?.high_frequency_keywords || [],
              priority: (normalizedMatchData as any)?.priority_keywords || []
            };
            localStorage.setItem('currentJDKeywords', JSON.stringify(jdKeywords));
            localStorage.setItem('currentJDText', jobDescription);
          } catch (e) {
            console.error('Failed to store match result:', e);
          }
        }

        if (onMatchResult) {
          const resultForCallback = normalizedMatchData ?? matchData;
          onMatchResult(resultForCallback);
        }

        return newScore;
      }
    } catch (error) {
      console.error('Auto-update ATS score failed:', error);
      return null;
    } finally {
      if (showLoading) {
        setIsAnalyzing(false);
      }
    }

    return null;
  }, [jobDescription, selectedJobMetadata, onMatchResult]);

  const computeResumeSignature = useCallback((resume: any) => {
    if (!resume) return '';

    return JSON.stringify({
      name: resume.name || '',
      title: normalizeTextForATS(resume.title),
      summary: normalizeTextForATS(resume.summary),
      sections: (resume.sections || []).map((section: any) => ({
        id: section.id,
        title: normalizeTextForATS(section.title),
        bullets: (section.bullets || []).map((bullet: any) => ({
          id: bullet.id,
          text: normalizeTextForATS(bullet.text),
          visible: bullet?.params?.visible !== false
        }))
      }))
    });
  }, []);

  const resumeChangeTimerRef = useRef<number | null>(null);
  const lastCommittedResumeHashRef = useRef<string | null>(computeResumeSignature(resumeData));
  const pendingResumeHashRef = useRef<string | null>(null);
  const [isATSUpdatePending, setIsATSUpdatePending] = useState(false);

  // Auto-update ATS score when resume data changes (only if JD is selected)
  useEffect(() => {
    if (!jobDescription || !resumeData) {
      pendingResumeHashRef.current = null;
      setIsATSUpdatePending(false);
      return;
    }

    const signature = computeResumeSignature(resumeData);

    if (signature === lastCommittedResumeHashRef.current) {
      setIsATSUpdatePending(false);
      return;
    }

    if (pendingResumeHashRef.current === signature) {
      return;
    }

    if (resumeChangeTimerRef.current) {
      clearTimeout(resumeChangeTimerRef.current);
      resumeChangeTimerRef.current = null;
    }

    setIsATSUpdatePending(true);
    pendingResumeHashRef.current = signature;

    let isActive = true;
    const timeoutId = window.setTimeout(async () => {
      if (!isActive) {
        return;
      }

      pendingResumeHashRef.current = null;
      const result = await recalculateATSScore(resumeData, true);
      if (!isActive) {
        return;
      }

      if (result !== null) {
        lastCommittedResumeHashRef.current = signature;
      }

      setIsATSUpdatePending(false);
    }, 2500);

    resumeChangeTimerRef.current = timeoutId;

    return () => {
      isActive = false;
      if (resumeChangeTimerRef.current === timeoutId) {
        clearTimeout(timeoutId);
        resumeChangeTimerRef.current = null;
        setIsATSUpdatePending(false);
      }
    };
  }, [resumeData, jobDescription, computeResumeSignature, recalculateATSScore]);

  // Listen for resume data updates from AI improve
  useEffect(() => {
    const handleResumeDataUpdate = (event: CustomEvent) => {
      if (event.detail?.resumeData && jobDescription) {
        setIsATSUpdatePending(true);
        recalculateATSScore(event.detail.resumeData, true).then((result) => {
          if (result !== null) {
            lastCommittedResumeHashRef.current = computeResumeSignature(event.detail.resumeData);
          }
          setIsATSUpdatePending(false);
        });
      }
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('resumeDataUpdated', handleResumeDataUpdate as EventListener);
      return () => {
        window.removeEventListener('resumeDataUpdated', handleResumeDataUpdate as EventListener);
      };
    }
  }, [jobDescription, computeResumeSignature, recalculateATSScore]);

  useEffect(() => {
    lastCommittedResumeHashRef.current = null;
  }, [jobDescription]);
  const [selectedKeywords, setSelectedKeywords] = useState<Set<string>>(new Set());
  const [showBulletGenerator, setShowBulletGenerator] = useState(false);
  const [isGeneratingBullets, setIsGeneratingBullets] = useState(false);
  const [selectedWorkExpSection, setSelectedWorkExpSection] = useState<string>('');
  const [bulletGeneratorCompany, setBulletGeneratorCompany] = useState<string>('');
  const [bulletGeneratorJobTitle, setBulletGeneratorJobTitle] = useState<string>('');
  const [generatedBullets, setGeneratedBullets] = useState<string[]>([]);
  const [generatedKeywords, setGeneratedKeywords] = useState<string[]>([]); // Store keywords used to generate bullets
  const [showWorkExpSelector, setShowWorkExpSelector] = useState(false);
  const [workExpEntries, setWorkExpEntries] = useState<Array<{ sectionId: string, bulletId: string, companyName: string, jobTitle: string, dateRange: string, sectionTitle: string, sectionType: 'work' | 'project' }>>([]);
  const [selectedBulletIndices, setSelectedBulletIndices] = useState<Set<number>>(new Set<number>());
  const [bulletAssignments, setBulletAssignments] = useState<Map<number, string>>(new Map<number, string>());
  const [showSaveNameModal, setShowSaveNameModal] = useState(false);
  const [resumeSaveName, setResumeSaveName] = useState('');
  const [updatedResumeData, setUpdatedResumeData] = useState<any>(null);
  const [manualKeywordInput, setManualKeywordInput] = useState('');
  const handleAddManualKeyword = useCallback(() => {
    const trimmed = normalizeTextForATS(manualKeywordInput);
    if (!trimmed) return;
    const bulletText = trimmed.startsWith('•') ? trimmed : `• ${trimmed}`;
    setGeneratedBullets((prev) => [bulletText, ...prev]);
    setManualKeywordInput('');
  }, [manualKeywordInput]);
  const [isManualATSRefreshing, setIsManualATSRefreshing] = useState(false);

  const handleManualATSRefresh = useCallback(async () => {
    if (!resumeData) return;
    setIsManualATSRefreshing(true);
    try {
      const result = await recalculateATSScore(resumeData, true);
      if (result !== null) {
        lastCommittedResumeHashRef.current = computeResumeSignature(resumeData);
      }
    } catch (error) {
      console.error('Manual ATS refresh failed:', error);
    } finally {
      setIsManualATSRefreshing(false);
    }
  }, [resumeData, recalculateATSScore, computeResumeSignature]);

  const applyAssignmentsToResume = useCallback(
    async (assignments: Map<number, string>, keywordsUsed: string[] = []) => {
      if (!assignments.size) {
        setShowWorkExpSelector(false);
        return;
      }

      const entriesByKey = new Map<
        string,
        { entry: (typeof workExpEntries)[number]; bulletIndices: number[] }
      >();

      assignments.forEach((entryKey, bulletIdx) => {
        if (!entriesByKey.has(entryKey)) {
          const entry = workExpEntries.find(
            (e) => `${e.sectionId}-${e.bulletId}` === entryKey
          );
          if (entry) {
            entriesByKey.set(entryKey, { entry, bulletIndices: [] });
          }
        }
        entriesByKey.get(entryKey)?.bulletIndices.push(bulletIdx);
      });

      let updatedSections = [...resumeData.sections];
      const assignmentResults: string[] = [];

      entriesByKey.forEach(({ entry, bulletIndices }) => {
        // Find section in updatedSections array (may have been modified by previous iterations)
        const sectionIndex = updatedSections.findIndex(
          (s: any) => s.id === entry.sectionId
        );
        if (sectionIndex === -1) return;

        // Get the latest version of the section (may have been updated by previous iterations)
        const selectedSection = { 
          ...updatedSections[sectionIndex],
          bullets: [...updatedSections[sectionIndex].bullets] // Deep copy bullets array
        };
        
        // Find the header bullet in the current (possibly updated) bullets array
        const headerBulletIndex = selectedSection.bullets.findIndex(
          (b: any) => b.id === entry.bulletId
        );
        if (headerBulletIndex === -1) return;

        // Find the correct insert position - after existing bullets for this entry, before the next header or end
        // Start by finding where existing bullets for this entry end
        let insertIndex = headerBulletIndex + 1;
        
        // Find the next header bullet after the current header
        // All bullets between current header and next header belong to this entry
        let nextHeaderIndex = selectedSection.bullets.length; // Default to end if no next header
        for (let i = headerBulletIndex + 1; i < selectedSection.bullets.length; i++) {
          const bullet = selectedSection.bullets[i];
          // Check if this is a header (company header format)
          if (bullet.text?.startsWith('**') && bullet.text?.includes('**', 2)) {
            // Found next header - bullets for this entry end before this
            nextHeaderIndex = i;
            break;
          }
        }
        
        // Insert at the end of existing bullets for this entry (right before the next header)
        // This ensures new bullets are appended after any existing bullets for the same entry
        insertIndex = nextHeaderIndex;
        
        // Ensure insertIndex is valid: at least after the header, at most at the end
        insertIndex = Math.max(headerBulletIndex + 1, Math.min(insertIndex, selectedSection.bullets.length));

        // Check for existing bullets to avoid duplicates
        const existingTexts = new Set(
          selectedSection.bullets.map((b: any) =>
            (b.text || '').replace(/^•\s*/, '').trim().toLowerCase()
          )
        );
        const normalizedTexts: string[] = [];
        bulletIndices.forEach((bulletIdx: number) => {
          const raw = generatedBullets[bulletIdx] || '';
          const normalized = raw.replace(/^•\s*/, '').trim();
          if (!normalized) {
            return;
          }
          const lower = normalized.toLowerCase();
          if (existingTexts.has(lower)) {
            return;
          }
          existingTexts.add(lower);
          normalizedTexts.push(normalized);
        });

        if (!normalizedTexts.length) {
          assignmentResults.push(
            `Skipped duplicate bullets for ${entry.companyName}`
          );
          return;
        }

        // Map keywords to bullets - distribute keywords across bullets for this entry
        // Use keywords passed to function or from state
        const keywordsArray = keywordsUsed.length > 0 ? keywordsUsed : (generatedKeywords.length > 0 ? generatedKeywords : []);
        const newBullets = normalizedTexts.map((text, idx) => {
          // Distribute keywords across bullets - each bullet gets some keywords
          const keywordsPerBullet = keywordsArray.length > 0 ? Math.ceil(keywordsArray.length / normalizedTexts.length) : 0;
          const startIdx = idx * keywordsPerBullet;
          const endIdx = Math.min(startIdx + keywordsPerBullet, keywordsArray.length);
          const bulletKeywords = keywordsArray.slice(startIdx, endIdx);

          // Ensure text is properly formatted with bullet point
          const bulletText = text.trim();
          const formattedText = bulletText.startsWith('•') ? bulletText : `• ${bulletText}`;

          return {
            id: `bullet-${Date.now()}-${idx}-${Math.random().toString(36).substr(2, 9)}`,
            text: formattedText,
            params: {
              visible: true, // Explicitly set visible to true
              generatedKeywords: bulletKeywords // Store keywords used to generate this bullet
            },
          };
        });

        // Insert new bullets at the calculated position
        const beforeInsert = selectedSection.bullets.slice(0, insertIndex);
        const afterInsert = selectedSection.bullets.slice(insertIndex);
        
        console.log('Inserting bullets:', {
          entry: entry.companyName,
          headerBulletIndex,
          insertIndex,
          bulletsBefore: beforeInsert.length,
          bulletsAfter: afterInsert.length,
          newBulletsCount: newBullets.length,
          newBullets: newBullets.map(b => b.text.substring(0, 50))
        });
        
        selectedSection.bullets = [
          ...beforeInsert,
          ...newBullets,
          ...afterInsert,
        ];

        // Ensure we have a fresh copy of the bullets array
        selectedSection.bullets = [...selectedSection.bullets];

        // Update the section in the updatedSections array
        updatedSections[sectionIndex] = {
          ...selectedSection,
          bullets: [...selectedSection.bullets] // Ensure deep copy
        };

        console.log('After insertion:', {
          totalBullets: selectedSection.bullets.length,
          headerIndex: selectedSection.bullets.findIndex((b: any) => b.id === entry.bulletId),
          insertedBulletIds: newBullets.map((b: any) => b.id)
        });

        assignmentResults.push(
          `${newBullets.length} bullet${newBullets.length > 1 ? 's' : ''} added to ${entry.companyName}`
        );
      });

      const updatedResume = {
        ...resumeData,
        sections: updatedSections,
      };

      if (jobDescription && currentJobDescriptionId) {
        setIsCalculatingATS(true);
        try {
          const cleanedResumeData = {
            name: updatedResume.name || '',
            title: updatedResume.title || '',
            email: updatedResume.email || '',
            phone: updatedResume.phone || '',
            location: updatedResume.location || '',
            summary: updatedResume.summary || '',
            sections: updatedResume.sections.map((section: any) => ({
              id: section.id,
              title: section.title,
              bullets: section.bullets.map((bullet: any) => ({
                id: bullet.id,
                text: bullet.text,
                params: {},
              })),
            })),
          };

          const matchResponse = await fetch(
            `${config.apiBase}/api/ai/match_job_description`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                job_description: jobDescription,
                resume_data: cleanedResumeData,
              }),
            }
          );

          if (matchResponse.ok) {
            const matchData = await matchResponse.json();
            const normalizedMatchData = normalizeMatchResult(matchData);
            const newScore = roundScoreValue(matchData.match_analysis?.similarity_score);
            setUpdatedATSScore(newScore);
            setMatchResult(normalizedMatchData);
            
            // Notify parent component of updated match result
            if (onMatchResult && normalizedMatchData) {
              onMatchResult(normalizedMatchData);
            }
          }
        } catch (error) {
          console.error('Failed to recalculate ATS score:', error);
        } finally {
          setIsCalculatingATS(false);
        }
      }

      if (onResumeUpdate) {
        onResumeUpdate(updatedResume);
      }

      // Only clear if all bullets have been assigned
      const remainingUnassigned = generatedBullets.filter((_, idx) => !assignments.has(idx));
      
      if (remainingUnassigned.length === 0) {
        // All bullets assigned - clear everything and close
        setGeneratedBullets([]);
        setGeneratedKeywords([]);
        setWorkExpEntries([]);
        setSelectedBulletIndices(new Set<number>());
        setBulletAssignments(new Map<number, string>());
        setShowWorkExpSelector(false);
        setSelectedKeywords(new Set());
        setSelectedWorkExpSection('');
        setBulletGeneratorCompany('');
        setBulletGeneratorJobTitle('');
      } else {
        // Some bullets remaining - keep window open, just clear assignments state
        setSelectedBulletIndices(new Set<number>());
        // Don't clear generatedBullets - keep remaining ones visible
      }

      // Show success message
      const assignedCount = Array.from(assignments.keys()).length;
      const remainingCount = generatedBullets.filter((_, idx) => !assignments.has(idx)).length;
      
      if (remainingCount === 0) {
        // All bullets assigned
        if (assignmentResults.length) {
          alert(`✅ ${assignmentResults.join('; ')}`);
        } else {
          alert('✅ All bullet points added to your resume!');
        }
      } else {
        // Some bullets remaining
        if (assignmentResults.length) {
          alert(`✅ ${assignmentResults.join('; ')}\n\n${remainingCount} bullet${remainingCount > 1 ? 's' : ''} remaining - assign them or close the window.`);
        } else {
          alert(`✅ ${assignedCount} bullet point${assignedCount > 1 ? 's' : ''} added! ${remainingCount} remaining.`);
        }
      }
    },
    [
      resumeData,
      jobDescription,
      currentJobDescriptionId,
      config.apiBase,
      onResumeUpdate,
      generatedBullets,
      workExpEntries,
      normalizeMatchResult,
      setMatchResult,
      setIsCalculatingATS,
      setUpdatedATSScore,
      setSelectedKeywords,
    ]
  );

  // Removed auto-apply useEffect - assignments now happen on button click

  const addKeywordsToSkillsSection = useCallback(
    (keywords: string[]) => {
      if (!onResumeUpdate || !Array.isArray(resumeData.sections)) return;

      const normalizedKeywords = keywords
        .map((kw) => kw.trim())
        .filter(Boolean);

      if (!normalizedKeywords.length) return;

      const sections = [...resumeData.sections];
      let skillsSection =
        sections.find((section: any) => {
          const title = section.title?.toLowerCase?.() || '';
          return title.includes('skill') || title.includes('technical');
        }) || null;

      if (!skillsSection) {
        skillsSection = {
          id: `skills-${Date.now()}`,
          title: 'Skills',
          bullets: [],
        };
        sections.push(skillsSection);
      }

      const existingSkills = new Set(
        (skillsSection.bullets || []).map((bullet: any) =>
          (bullet.text || '').replace(/^•\s*/, '').trim().toLowerCase()
        )
      );

      const newBullets = normalizedKeywords
        .filter((keyword) => !existingSkills.has(keyword.toLowerCase()))
        .map((keyword) => ({
          id: `skill-${Date.now()}-${Math.random()}`,
          text: keyword,
          params: { visible: true },
        }));

      if (!newBullets.length) {
        alert('All selected keywords already exist in your Skills section.');
        return;
      }

      const updatedSections = sections.map((section: any) =>
        section.id === skillsSection!.id
          ? {
            ...section,
            bullets: [...(section.bullets || []), ...newBullets],
          }
          : section
      );

      onResumeUpdate({
        ...resumeData,
        sections: updatedSections,
      });

      setSelectedKeywords(new Set());
      alert(
        `✅ Added ${newBullets.length} keyword${newBullets.length > 1 ? 's' : ''
        } to your Skills section.`
      );
    },
    [onResumeUpdate, resumeData, setSelectedKeywords]
  );

  const shouldUseSingleColumnLayout = Boolean(matchResult);

  const jobSummary = useMemo(() => {
    return {
      title: selectedJobMetadata?.title || currentJDInfo?.title || initialJobDescription?.slice(0, 48) || '',
      company: selectedJobMetadata?.company || currentJDInfo?.company || '',
      location: selectedJobMetadata?.location || selectedJobMetadata?.remoteStatus || '',
      workType: selectedJobMetadata?.remoteStatus || '',
      jobType: selectedJobMetadata?.jobType || ''
    };
  }, [selectedJobMetadata, currentJDInfo, initialJobDescription]);

  const handleSaveJobDescription = async (): Promise<number | null> => {
    if (!jobDescription || !jobDescription.trim()) {
      alert('Please enter a job description to save.');
      return null;
    }

    if (!isAuthenticated || !user?.email) {
      const requireAuth = shouldPromptAuthentication('saveJobDescription', isAuthenticated)
      if (requireAuth) {
        alert('Please sign in to save job descriptions');
        return null;
      }
      return saveGuestJobDescriptionLocally();
    }

    // Extract accurate title from JD if not already analyzed
    // This ensures we always use the title extracted from the JD, even if user saves without analyzing first
    let accurateTitle = selectedJobMetadata?.title;
    if (!accurateTitle && jobDescription) {
      const metadataFromJD = deriveJobMetadataFromText(jobDescription);
      accurateTitle = metadataFromJD?.title;
    }
    // Fallback to currentJDInfo title or default
    accurateTitle = accurateTitle || currentJDInfo?.title || 'Untitled Job';

    try {
      const apiBase = config.apiBase || 'http://localhost:8000';

      const jdMetadata: any = {
        easy_apply_url: currentJDInfo?.easy_apply_url || selectedJobMetadata?.easy_apply_url || null,
        work_type: selectedJobMetadata?.remoteStatus || null,
        job_type: selectedJobMetadata?.jobType || null,
        company: currentJDInfo?.company || selectedJobMetadata?.company || null
      };

      const precomputed = buildPrecomputedKeywordPayload();
      const scoreSnapshotPayload = scoreSnapshotBase
        ? { ...scoreSnapshotBase, updated_at: new Date().toISOString() }
        : null;
      const atsInsightsPayload = scoreSnapshotPayload
        ? { ...(precomputed?.atsInsights || {}), score_snapshot: scoreSnapshotPayload }
        : precomputed?.atsInsights || null;

      // Show loading state
      const saveButton = document.querySelector('[data-save-job-btn]') as HTMLButtonElement;
      const originalButtonText = saveButton?.textContent;
      if (saveButton) {
        saveButton.disabled = true;
        saveButton.textContent = 'Saving...';
      }

      // Build payload - always include id if we have currentJobDescriptionId
      const payload: any = {
        user_email: user.email,
        title: accurateTitle, // Use accurate title from JD analysis
        company: jdMetadata.company || '',
        content: jobDescription || '',
        easy_apply_url: jdMetadata.easy_apply_url || null,
        work_type: jdMetadata.work_type || null,
        job_type: jdMetadata.job_type || null,
        source: 'app',
        url: null,
        extracted_keywords: precomputed?.extractedKeywordsPayload,
        priority_keywords: precomputed?.priorityKeywords,
        soft_skills: precomputed?.softSkills,
        high_frequency_keywords: precomputed?.highFrequencyKeywords,
        ats_insights: atsInsightsPayload
      };

      // Include id only if we have a currentJobDescriptionId (for updates)
      if (currentJobDescriptionId) {
        payload.id = currentJobDescriptionId;
      }

      const response = await fetch(`${apiBase}/api/job-descriptions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Save failed:', response.status, errorText);
        let errorData;
        try {
          errorData = JSON.parse(errorText);
        } catch {
          errorData = { detail: errorText || `HTTP ${response.status}: ${response.statusText}` };
        }
        throw new Error(errorData.detail || `Failed to save job description (HTTP ${response.status})`);
      }

      const result = await response.json();
      console.log('Job description saved successfully:', result);

      // Update currentJobDescriptionId if it was a new save or if we got a different ID back
      const savedJobId = result.id || currentJobDescriptionId;
      if (savedJobId && savedJobId !== currentJobDescriptionId && onSelectJobDescriptionId) {
        onSelectJobDescriptionId(savedJobId);
      }

      // Store the job ID in localStorage for persistence
      if (typeof window !== 'undefined' && savedJobId) {
        localStorage.setItem('activeJobDescriptionId', savedJobId.toString());
      }

      // Restore button state
      if (saveButton) {
        saveButton.disabled = false;
        saveButton.textContent = originalButtonText || 'Save to Jobs';
      }

      // Dispatch custom event to refresh jobs list everywhere
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('jobSaved', {
          detail: { jobId: result.id || currentJobDescriptionId }
        }));
      }

      // Show success notification immediately - use the accurate title that was saved
      const jobTitle = accurateTitle;
      const companyName = jdMetadata.company ? ` - ${jdMetadata.company}` : '';
      const atsScore = currentATSScore !== null ? currentATSScore : (matchResult?.match_analysis?.similarity_score || null);
      const scoreText = atsScore ? ` (ATS: ${Math.round(atsScore)}%)` : '';

      const notification = document.createElement('div');
      notification.className = 'fixed top-4 right-4 bg-green-600 text-white px-6 py-4 rounded-lg shadow-2xl z-[10001] max-w-md';
      notification.innerHTML = `
        <div class="flex items-center gap-3">
          <div class="text-2xl">✅</div>
          <div>
            <div class="font-bold text-lg">Job Saved!</div>
            <div class="text-sm mt-1">${jobTitle}${companyName}${scoreText}</div>
          </div>
          <button onclick="this.parentElement.parentElement.remove()" class="ml-4 text-white hover:text-gray-200 text-xl">×</button>
        </div>
      `;
      document.body.appendChild(notification);
      setTimeout(() => notification.remove(), 5000);

      return result.id || currentJobDescriptionId || null;

    } catch (error) {
      console.error('Failed to save job description:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      alert(`Failed to save job description: ${errorMessage}`);

      // Restore button state on error
      const saveButton = document.querySelector('[data-save-job-btn]') as HTMLButtonElement;
      if (saveButton) {
        saveButton.disabled = false;
        saveButton.textContent = 'Save to Jobs';
      }

      return null;
    }
  };

  const handleSaveResumeWithName = async (
    options?: { nameOverride?: string; resumeOverride?: any; suppressModalReset?: boolean; jobDescriptionIdOverride?: number | null }
  ): Promise<{ resumeId: number | null; versionId: number | null } | null> => {
    const rawName = options?.nameOverride ?? resumeSaveName;
    const trimmedName = rawName?.trim();

    if (!trimmedName) {
      alert('Please enter a resume name.');
      return null;
    }

    const resumePayload = options?.resumeOverride ?? updatedResumeData ?? resumeData;

    if (!resumePayload) {
      alert('No resume data to save');
      return null;
    }

    if (!isAuthenticated || !user?.email) {
      const requireAuth = shouldPromptAuthentication('saveResume', isAuthenticated)
      setResumeSaveName(trimmedName);
      if (requireAuth) {
        alert('Please sign in to save resumes to your profile');
        return null;
      }
      saveGuestResumeLocally(trimmedName, resumePayload);
      return { resumeId: null, versionId: null };
    }

    try {
      const saveName = trimmedName;
      setResumeSaveName(saveName);
      const apiBase = config.apiBase || 'http://localhost:8000';

      // Check if resume with this name already exists to show appropriate message
      let isExistingResume = false;
      let existingVersionCount = 0;
      try {
        const checkUrl = `${apiBase}/api/resumes?user_email=${encodeURIComponent(user.email)}`;
        const checkRes = await fetch(checkUrl);

        if (checkRes.ok) {
          const resumesData = await checkRes.json();
          const existingResumes = resumesData.resumes || [];
          const existingResume = existingResumes.find((r: any) => r.name === saveName);

          if (existingResume) {
            isExistingResume = true;
            existingVersionCount = existingResume.version_count || 0;
          }
        }
      } catch (error) {
        console.log('Could not check existing resumes:', error);
      }

      const url = `${apiBase}/api/resume/save?user_email=${encodeURIComponent(user.email)}`;

      // Clean resume data - remove fieldsVisible and ensure params are compatible
      const cleanedSections = (resumePayload.sections || []).map((section: any) => ({
        id: section.id,
        title: normalizeTextForATS(section.title),
        bullets: (section.bullets || [])
          .filter((bullet: any) => bullet?.params?.visible !== false)
          .map((bullet: any) => ({
            id: bullet.id,
            text: normalizeTextForATS(bullet.text),
            params: {}
          }))
      }));

      const payload = {
        name: saveName,
        title: normalizeTextForATS(resumePayload.title) || '',
        email: resumePayload.email || '',
        phone: resumePayload.phone || '',
        location: normalizeTextForATS(resumePayload.location) || '',
        summary: normalizeTextForATS(resumePayload.summary) || '',
        sections: cleanedSections,
        template: 'tech'
      };

      console.log('Saving resume with name:', saveName);

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Save failed:', response.status, errorText);
        let errorData;
        try {
          errorData = JSON.parse(errorText);
        } catch {
          errorData = { detail: errorText || `HTTP ${response.status}: ${response.statusText}` };
        }
        throw new Error(errorData.detail || `Failed to save resume (HTTP ${response.status})`);
      }

      const result = await response.json();
      console.log('Save successful:', result);

      if (!result.success) {
        throw new Error(result.message || 'Save failed on server');
      }

      const targetJobDescriptionId = options?.jobDescriptionIdOverride ?? currentJobDescriptionId;

      // Create match session if we have a job description (optional - allows saving master resumes without JDs)
      if (targetJobDescriptionId) {
        try {
          const atsScore = updatedATSScore !== null ? updatedATSScore : (matchResult?.match_analysis?.similarity_score || currentATSScore);

          const jdMetadata: any = {
            easy_apply_url: currentJDInfo?.easy_apply_url || selectedJobMetadata?.easy_apply_url || null,
            work_type: selectedJobMetadata?.remoteStatus || null,
            job_type: selectedJobMetadata?.jobType || null,
            company: currentJDInfo?.company || selectedJobMetadata?.company || null
          };
          const keywordBundle = buildPrecomputedKeywordPayload();
          const scoreSnapshotPayload = scoreSnapshotBase
            ? { ...scoreSnapshotBase, updated_at: new Date().toISOString() }
            : null;
          const atsInsightsPayload = scoreSnapshotPayload
            ? { ...(keywordBundle?.atsInsights || {}), score_snapshot: scoreSnapshotPayload }
            : keywordBundle?.atsInsights || null;

          try {
            await fetch(`${apiBase}/api/job-descriptions`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                id: targetJobDescriptionId,
                user_email: user.email,
                title: selectedJobMetadata?.title || currentJDInfo?.title || '',
                company: jdMetadata.company || '',
                content: jobDescription || '',
                easy_apply_url: jdMetadata.easy_apply_url || null,
                work_type: jdMetadata.work_type || null,
                job_type: jdMetadata.job_type || null,
                source: 'app',
                url: null,
                extracted_keywords: keywordBundle?.extractedKeywordsPayload,
                priority_keywords: keywordBundle?.priorityKeywords,
                soft_skills: keywordBundle?.softSkills,
                high_frequency_keywords: keywordBundle?.highFrequencyKeywords,
                ats_insights: atsInsightsPayload
              })
            });
            console.log('JD updated with metadata:', jdMetadata);
          } catch (jdUpdateError) {
            console.warn('Failed to update JD metadata (continuing anyway):', jdUpdateError);
          }

          const matchResponse = await fetch(`${apiBase}/api/matches`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              resumeId: result.resume_id,
              jobDescriptionId: targetJobDescriptionId,
              user_email: user.email,
              resume_name: saveName,
              resume_title: resumePayload.title || '',
              resume_snapshot: resumePayload,
              resume_version_id: result.version_id,
              ats_score: atsScore ? Math.round(atsScore) : null,
              jd_metadata: jdMetadata
            })
          });

          if (!matchResponse.ok) {
            throw new Error(`Failed to create match: ${matchResponse.status}`);
          }

          const matchSessionResult = await matchResponse.json();
          console.log('Match session created successfully:', {
            matchId: matchSessionResult.id || matchSessionResult.match_id,
            resumeId: result.resume_id,
            jobDescriptionId: targetJobDescriptionId,
            atsScore,
            jdMetadata
          });
        } catch (matchError) {
          console.error('Failed to create match session:', matchError);
          alert(`Resume saved, but failed to link with job description: ${matchError instanceof Error ? matchError.message : 'Unknown error'}`);
        }
      } else {
        console.log('Saving master resume without JD match');
      }

      if (!options?.suppressModalReset) {
        setShowSaveNameModal(false);
      }
      setResumeSaveName('');
      setUpdatedResumeData(null);
      setGeneratedBullets([]);
      setWorkExpEntries([]);
      setSelectedBulletIndices(new Set<number>());
      setBulletAssignments(new Map<number, string>());
      setSelectedKeywords(new Set());
      setSelectedWorkExpSection('');
      setBulletGeneratorCompany('');
      setBulletGeneratorJobTitle('');

      const newVersionNumber = existingVersionCount + 1;
      const atsScoreForToast = updatedATSScore !== null ? updatedATSScore : (matchResult?.match_analysis?.similarity_score || currentATSScore);
      const matchScoreText = (options?.jobDescriptionIdOverride ?? currentJobDescriptionId) && atsScoreForToast ? ` (ATS Score: ${Math.round(atsScoreForToast)}%)` : '';
      const jobInfo = currentJDInfo?.company || selectedJobMetadata?.company ? ` - ${currentJDInfo?.company || selectedJobMetadata?.company}` : '';

      const notification = document.createElement('div');
      notification.className = 'fixed top-4 right-4 bg-green-600 text-white px-6 py-4 rounded-lg shadow-2xl z-[10001] max-w-md';
      notification.innerHTML = `
        <div class="flex items-center gap-3">
          <div class="text-2xl">✅</div>
          <div>
            <div class="font-bold text-lg">Saved to Jobs!</div>
            <div class="text-sm mt-1">${saveName}${jobInfo}${matchScoreText}</div>
            ${(options?.jobDescriptionIdOverride ?? currentJobDescriptionId) ? `<div class="text-xs mt-1 text-green-100">Resume matched with JD • ATS: ${Math.round(atsScoreForToast || 0)}%</div>` : ''}
            ${isExistingResume ? `<div class="text-xs mt-1 text-green-100">Version ${newVersionNumber} created</div>` : ''}
          </div>
          <button onclick="this.parentElement.parentElement.remove()" class="ml-4 text-white hover:text-gray-200 text-xl">×</button>
        </div>
      `;
      document.body.appendChild(notification);
      setTimeout(() => notification.remove(), 5000);

      return { resumeId: result.resume_id ?? null, versionId: result.version_id ?? null };
    } catch (error) {
      console.error('Failed to save resume:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      alert(`Failed to save resume: ${errorMessage}`);
      return null;
    }
  };

  // Fetch JD info when currentJobDescriptionId changes
  useEffect(() => {
    const fetchJDInfo = async () => {
      if (currentJobDescriptionId) {
        try {
          const res = await fetch(`${config.apiBase}/api/job-descriptions/${currentJobDescriptionId}`);
          if (res.ok) {
            const jd = await res.json();
            console.log('📋 Fetched JD info:', {
              id: currentJobDescriptionId,
              company: jd.company,
              title: jd.title,
              easy_apply_url: jd.easy_apply_url
            });
            setCurrentJDInfo({
              company: jd.company || '',
              title: jd.title || '',
              easy_apply_url: jd.easy_apply_url || ''
            });
            setSelectedJobMetadata((prev) => mergeMetadata(prev, {
              title: jd.title || undefined,
              company: jd.company || undefined,
              jobType: jd.job_type || jd.jobType || undefined,
              remoteStatus: jd.work_type || jd.remoteStatus || undefined,
              location: jd.location || undefined,
              easy_apply_url: jd.easy_apply_url || undefined,
            }));
          }
        } catch (error) {
          console.error('Failed to fetch JD info:', error);
        }
      } else {
        setCurrentJDInfo(null);
      }
    };
    fetchJDInfo();
  }, [currentJobDescriptionId]);

  const analyzeMatch = async () => {
    if (!jobDescription.trim()) {
      setError('Please enter a job description');
      return;
    }

    setIsAnalyzing(true);
    setError(null);

    try {
      // Clean resume data - remove fieldsVisible and ensure compatibility with backend
      const cleanedResumeData = {
        name: resumeData.name || '',
        title: normalizeTextForATS(resumeData.title),
        email: resumeData.email || '',
        phone: resumeData.phone || '',
        location: normalizeTextForATS(resumeData.location),
        summary: normalizeTextForATS(resumeData.summary),
        sections: (resumeData.sections || []).map((section: any) => ({
          id: section.id,
          title: normalizeTextForATS(section.title),
          bullets: (section.bullets || [])
            .filter((bullet: any) => bullet?.params?.visible !== false)
            .map((bullet: any) => ({
              id: bullet.id,
              text: normalizeTextForATS(bullet.text),
              params: {}
            }))
        }))
      };

      const response = await fetch(`${config.apiBase}/api/ai/match_job_description`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          job_description: jobDescription,
          resume_data: cleanedResumeData
        }),
      });

      if (!response.ok) {
        let errorMessage = `HTTP error! status: ${response.status}`;
        try {
          const errorData = await response.json();
          errorMessage = errorData.detail || errorData.message || errorMessage;
        } catch (e) {
          // If response is not JSON, use status text
          errorMessage = response.statusText || errorMessage;
        }
        throw new Error(errorMessage);
      }

      const rawResult = await response.json() as JobMatchResult;
      const normalizedResult = normalizeMatchResult(rawResult);
      setMatchResult(normalizedResult);
      setCurrentATSScore(normalizedResult?.match_analysis?.similarity_score ?? null);
      setSelectedKeywords(new Set());
      const metadataFromText = deriveJobMetadataFromText(jobDescription);
      setSelectedJobMetadata((prev) => mergeMetadata(prev, metadataFromText));

      // Store match result and keywords in localStorage for VisualResumeEditor
      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem('currentMatchResult', JSON.stringify(normalizedResult));
          const jdKeywords = {
            matching: normalizedResult?.match_analysis?.matching_keywords || [],
            missing: normalizedResult?.match_analysis?.missing_keywords || [],
            high_frequency: selectedJobMetadata?.high_frequency_keywords || [],
            priority: (normalizedResult as any)?.priority_keywords || []
          };
          localStorage.setItem('currentJDKeywords', JSON.stringify(jdKeywords));
          localStorage.setItem('currentJDText', jobDescription);
        } catch (e) {
          console.error('Failed to store match result:', e);
        }
      }

      if (onMatchResult) {
        const resultForCallback = normalizedResult ?? rawResult;
        onMatchResult(resultForCallback);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to analyze job match');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    if (score >= 40) return 'text-orange-600';
    return 'text-red-600';
  };

  const getScoreBgColor = (score: number) => {
    if (score >= 80) return 'bg-green-100';
    if (score >= 60) return 'bg-yellow-100';
    if (score >= 40) return 'bg-orange-100';
    return 'bg-red-100';
  };

  const keywordCoverageValue =
    atsKeywordMetrics.keywordCoverage ??
    (scoreSnapshotBase?.keyword_coverage ?? null);
  const matchedKeywordCount =
    atsKeywordMetrics.matchedCount ??
    scoreSnapshotBase?.matched_keywords_count ??
    estimatedATS?.matchedKeywords.length ??
    null;
  const totalKeywordCount =
    atsKeywordMetrics.totalCount ??
    scoreSnapshotBase?.total_keywords ??
    estimatedATS?.totalKeywords ??
    null;
  const missingKeywordSample =
    (scoreSnapshotBase?.missing_keywords_sample &&
      scoreSnapshotBase.missing_keywords_sample.length > 0
      ? scoreSnapshotBase.missing_keywords_sample
      : estimatedATS?.missingKeywords?.slice(0, 3) ||
      matchResult?.match_analysis?.missing_keywords?.slice(0, 3) ||
      []) || [];
  const matchTierLabel =
    overallATSScore !== null
      ? overallATSScore >= 80
        ? 'Excellent Match'
        : overallATSScore >= 60
          ? 'Good Match'
          : overallATSScore >= 40
            ? 'Fair Match'
            : 'Needs Improvement'
      : 'Score Pending';

  const content = (
    <div className="p-6 overflow-y-auto max-h-[calc(90vh-80px)]">
      {/* Job Description Paste Area */}
      <div className="mb-6 space-y-4">
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            📋 Job Description
          </label>
          <textarea
            value={jobDescription}
            onChange={(e) => setJobDescription(e.target.value)}
            onPaste={() => {
              setTimeout(() => {
                // Keywords will be extracted via useEffect
              }, 100);
            }}
            placeholder="Paste the job description here... Keywords will be automatically extracted to help improve your ATS score."
            rows={8}
            className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all text-sm resize-y"
          />
          {isExtractingKeywords && (
            <p className="text-xs text-blue-600 mt-1 flex items-center gap-1">
              <span className="animate-spin">⏳</span> Extracting high-intensity keywords...
            </p>
          )}
        </div>
        
        {/* High-Intensity Keywords Display */}
        {extractedKeywords && extractedKeywords.success && (
          <div className="bg-gradient-to-r from-yellow-50 to-orange-50 border-2 border-yellow-300 rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                🔥 High-Intensity Keywords Extracted
              </h3>
              <span className="text-xs text-gray-600">
                {extractedKeywords.high_intensity_keywords?.length || 0} keywords
              </span>
            </div>
            <div className="flex flex-wrap gap-2 mb-3">
              {extractedKeywords.high_intensity_keywords?.slice(0, 20).map((item: any, idx: number) => (
                <span
                  key={idx}
                  className={`px-3 py-1 rounded-full text-xs font-medium text-white ${
                    item.importance === 'high'
                      ? 'bg-gradient-to-r from-red-500 to-red-600'
                      : 'bg-gradient-to-r from-orange-500 to-orange-600'
                  }`}
                  title={`Frequency: ${item.frequency} times`}
                >
                  {item.keyword} ({item.frequency})
                </span>
              ))}
            </div>
            <p className="text-xs text-gray-700 mt-2">
              <strong>💡 Tip:</strong> These keywords appear most frequently in the job description. 
              Including them in your resume will significantly improve your ATS score.
            </p>
          </div>
        )}

        {/* Keyword Comparison with Resume */}
        {keywordComparison && resumeData && (
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-300 rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                📊 Keyword Comparison with Your Resume
              </h3>
              <span className="text-xs text-gray-600">
                {keywordComparison.matched.length} / {keywordComparison.matched.length + keywordComparison.missing.length} matched
              </span>
            </div>
            
            {keywordComparison.missing.length > 0 && (
              <div className="mb-3">
                <div className="text-xs font-semibold text-red-700 mb-2">
                  ⚠️ Missing Keywords ({keywordComparison.missing.length}) - Add these to improve ATS score:
                </div>
                <div className="flex flex-wrap gap-2">
                  {keywordComparison.missing.slice(0, 15).map((keyword: string, idx: number) => (
                    <span
                      key={idx}
                      className="px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800 border border-red-300"
                    >
                      {keyword}
                    </span>
                  ))}
                  {keywordComparison.missing.length > 15 && (
                    <span className="px-2 py-1 rounded-full text-xs font-medium bg-red-50 text-red-600 border border-red-200">
                      +{keywordComparison.missing.length - 15} more
                    </span>
                  )}
                </div>
              </div>
            )}

            {keywordComparison.matched.length > 0 && (
              <div>
                <div className="text-xs font-semibold text-green-700 mb-2">
                  ✅ Matched Keywords ({keywordComparison.matched.length}):
                </div>
                <div className="flex flex-wrap gap-2">
                  {keywordComparison.matched.slice(0, 10).map((keyword: string, idx: number) => (
                    <span
                      key={idx}
                      className="px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 border border-green-300"
                    >
                      {keyword}
                    </span>
                  ))}
                  {keywordComparison.matched.length > 10 && (
                    <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-50 text-green-600 border border-green-200">
                      +{keywordComparison.matched.length - 10} more
                    </span>
                  )}
                </div>
              </div>
            )}

            <p className="text-xs text-gray-700 mt-3 pt-3 border-t border-gray-300">
              <strong>🎯 Next Step:</strong> Click "Analyze Match" below for a detailed ATS score and personalized improvement suggestions.
            </p>
          </div>
        )}
      </div>

      {/* Easy Apply Button - Always visible when JD is loaded */}
      {currentJDInfo?.easy_apply_url && (
        <div className="mb-4 flex items-center justify-end">
          <a
            href={currentJDInfo.easy_apply_url}
            target="_blank"
            rel="noopener noreferrer"
            className="px-6 py-3 bg-[#0077b5] hover:bg-[#006399] text-white text-base font-semibold rounded-lg transition-all shadow-md hover:shadow-lg flex items-center gap-2"
            onClick={(e) => {
              e.stopPropagation();
              window.open(currentJDInfo.easy_apply_url, '_blank');
            }}
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
            </svg>
            Easy Apply
          </a>
        </div>
      )}

      {/* Extension-style metadata display */}
      {selectedJobMetadata && (
        <div className="mb-4 bg-gradient-to-r from-blue-50 to-purple-50 border-l-4 border-blue-500 rounded-lg p-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Metadata Card */}
            <div className="space-y-2">
              {selectedJobMetadata.title && (
                <div className="flex items-center gap-1 mb-2">
                  <span>📌</span>
                  <strong className="text-gray-900 text-base">{selectedJobMetadata.title}</strong>
                </div>
              )}
              <div className="flex flex-wrap items-center gap-3 text-sm">
                {selectedJobMetadata.company && (
                  <div className="flex items-center gap-1">
                    <span>🏢</span>
                    <strong className="text-gray-900">{selectedJobMetadata.company}</strong>
                  </div>
                )}
                {selectedJobMetadata.jobType && (
                  <div className="flex items-center gap-1">
                    <span>💼</span>
                    <span className="text-gray-700">{selectedJobMetadata.jobType}</span>
                  </div>
                )}
                {selectedJobMetadata.remoteStatus && (
                  <div className="flex items-center gap-1">
                    <span>🌐</span>
                    <span className="text-gray-700">Work Type: {selectedJobMetadata.remoteStatus}</span>
                  </div>
                )}
                {selectedJobMetadata.budget && (
                  <div className="flex items-center gap-1">
                    <span>💰</span>
                    <span className="text-green-600 font-semibold">{selectedJobMetadata.budget}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Skills & Keywords */}
            <div className="space-y-3">
              {selectedJobMetadata.skills && selectedJobMetadata.skills.length > 0 && (
                <div>
                  <div className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2">⚙️ Technical Skills</div>
                  <div className="flex flex-wrap gap-2">
                    {selectedJobMetadata.skills.map((skill, idx) => (
                      <span key={idx} className="px-2.5 py-1 rounded-full text-xs font-medium bg-gradient-to-r from-green-500 to-green-600 text-white">
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {(selectedJobMetadata?.keywords && selectedJobMetadata.keywords.length > 0) || manualKeywordInput ? (
                <div>
                  <div className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2">📊 Top Keywords</div>
                  <div className="flex flex-wrap gap-2">
                    {selectedJobMetadata?.keywords?.map((keyword, idx) => (
                      <span key={idx} className="px-2.5 py-1 rounded-full text-xs font-medium bg-gradient-to-r from-purple-500 to-purple-600 text-white">
                        {keyword}
                      </span>
                    ))}
                    {manualKeywordInput && (
                      <button
                        onClick={() => {
                          const trimmed = manualKeywordInput.trim();
                          if (!trimmed) return;
                          setGeneratedBullets((prev) => [trimmed, ...prev]);
                          setManualKeywordInput('');
                        }}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-white border border-purple-300 text-purple-700 hover:bg-purple-50 transition"
                        title="Add manual keyword as bullet seed"
                      >
                        <span>＋</span> Add "{manualKeywordInput}"
                      </button>
                    )}
                  </div>
                  <div className="mt-2 flex gap-2">
                    <input
                      type="text"
                      value={manualKeywordInput}
                      onChange={(e) => setManualKeywordInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          const trimmed = manualKeywordInput.trim();
                          if (!trimmed) return;
                          setGeneratedBullets((prev) => [trimmed, ...prev]);
                          setManualKeywordInput('');
                        }
                      }}
                      placeholder="Type keyword or bullet seed..."
                      className="flex-1 px-3 py-2 border border-purple-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm"
                    />
                    <button
                      onClick={() => {
                        const trimmed = manualKeywordInput.trim();
                        if (!trimmed) return;
                        setGeneratedBullets((prev) => [trimmed, ...prev]);
                        setManualKeywordInput('');
                      }}
                      className="px-3 py-2 bg-purple-600 text-white rounded-lg text-sm font-semibold hover:bg-purple-700 transition"
                    >
                      Add
                    </button>
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      )}

      <div className={`grid grid-cols-1 gap-6 ${shouldUseSingleColumnLayout ? 'lg:grid-cols-1' : 'lg:grid-cols-2'}`}>
        {/* Left Column: Job Description Input */}
        <div className="space-y-4">
          {/* Analyze Button */}
          <div>
            {(!currentJobDescriptionId || !matchResult) && (
              <>
                <button
                  onClick={analyzeMatch}
                  disabled={isAnalyzing || !jobDescription.trim()}
                  className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                >
                  {isAnalyzing ? 'Analyzing...' : 'Analyze Match'}
                </button>
                {!jobDescription.trim() && (
                  <p className="text-sm text-gray-500 mt-2 text-center">
                    Paste or scan a job description above to analyze the match
                  </p>
                )}
              </>
            )}
          </div>

          {error && (
            <div className="p-3 bg-red-100 border border-red-400 text-red-700 rounded text-sm">
              {error}
            </div>
          )}
        </div>

        {/* Right Column: Metadata Graphics */}
        <div className={`space-y-4 ${shouldUseSingleColumnLayout ? 'lg:col-span-1' : ''}`}>
          {selectedJobMetadata || jobDescription ? (
            <div className="bg-gradient-to-r from-blue-50 to-purple-50 border-l-4 border-blue-500 rounded-lg p-6 space-y-6">
              {/* Job Title & Company */}
              {(selectedJobMetadata?.title || jobDescription) && (
                <div>
                  {selectedJobMetadata?.title && (
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-xl">📌</span>
                      <h3 className="text-lg font-bold text-gray-900">{selectedJobMetadata.title}</h3>
                    </div>
                  )}
                  {selectedJobMetadata?.company && (
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">🏢</span>
                        <span className="text-base font-semibold text-gray-700">{selectedJobMetadata.company}</span>
                      </div>
                      {currentJDInfo?.easy_apply_url && (
                        <a
                          href={currentJDInfo.easy_apply_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-4 py-2 bg-[#0077b5] hover:bg-[#006399] text-white text-sm font-semibold rounded-lg transition-all shadow-md hover:shadow-lg flex items-center gap-2"
                          onClick={(e) => {
                            e.stopPropagation();
                            window.open(currentJDInfo.easy_apply_url, '_blank');
                          }}
                        >
                          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
                          </svg>
                          Easy Apply
                        </a>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Job Metadata Cards */}
              <div className="grid grid-cols-2 gap-3">
                {selectedJobMetadata?.jobType && (
                  <div className="bg-white rounded-lg p-3 border border-gray-200">
                    <div className="flex items-center gap-2 mb-1">
                      <span>💼</span>
                      <span className="text-xs font-semibold text-gray-600 uppercase">Job Type</span>
                    </div>
                    <div className="text-sm font-bold text-gray-900">{selectedJobMetadata.jobType}</div>
                  </div>
                )}
                {selectedJobMetadata?.remoteStatus && (
                  <div className="bg-white rounded-lg p-3 border border-gray-200">
                    <div className="flex items-center gap-2 mb-1">
                      <span>🌐</span>
                      <span className="text-xs font-semibold text-gray-600 uppercase">Work Type</span>
                    </div>
                    <div className="text-sm font-bold text-gray-900">{selectedJobMetadata.remoteStatus}</div>
                  </div>
                )}
                {selectedJobMetadata?.budget && (
                  <div className="bg-white rounded-lg p-3 border border-gray-200 col-span-2">
                    <div className="flex items-center gap-2 mb-1">
                      <span>💰</span>
                      <span className="text-xs font-semibold text-gray-600 uppercase">Budget</span>
                    </div>
                    <div className="text-sm font-bold text-green-600">{selectedJobMetadata.budget}</div>
                  </div>
                )}
              </div>

              {/* Technical Skills */}
              {selectedJobMetadata?.skills && selectedJobMetadata.skills.length > 0 && (
                <div>
                  <div className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2 flex items-center gap-1">
                    <span>⚙️</span> Technical Skills
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {selectedJobMetadata.skills.map((skill, idx) => (
                      <span key={idx} className="px-3 py-1 rounded-full text-xs font-medium bg-gradient-to-r from-green-500 to-green-600 text-white">
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Top Keywords */}
              {selectedJobMetadata?.keywords && selectedJobMetadata.keywords.length > 0 && (
                <div>
                  <div className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2 flex items-center gap-1">
                    <span>📊</span> Top Keywords
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {selectedJobMetadata.keywords.map((keyword, idx) => (
                      <span key={idx} className="px-3 py-1 rounded-full text-xs font-medium bg-gradient-to-r from-purple-500 to-purple-600 text-white">
                        {keyword}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Soft Skills */}
              {selectedJobMetadata?.soft_skills && selectedJobMetadata.soft_skills.length > 0 && (
                <div>
                  <div className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2 flex items-center gap-1">
                    <span>🤝</span> Soft Skills
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {selectedJobMetadata.soft_skills.map((skill, idx) => (
                      <span key={idx} className="px-3 py-1 rounded-full text-xs font-medium bg-gradient-to-r from-blue-500 to-blue-600 text-white">
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* High-Frequency Keywords (Most Important for ATS) */}
              {selectedJobMetadata?.high_frequency_keywords && selectedJobMetadata.high_frequency_keywords.length > 0 && (
                <div>
                  <div className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2 flex items-center gap-1">
                    <span>🔥</span> High-Frequency Keywords (ATS Priority)
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {selectedJobMetadata.high_frequency_keywords.map((item, idx) => (
                      <span
                        key={idx}
                        className={`px-3 py-1 rounded-full text-xs font-medium text-white ${item.importance === 'high'
                          ? 'bg-gradient-to-r from-red-500 to-red-600'
                          : 'bg-gradient-to-r from-orange-500 to-orange-600'
                          }`}
                        title={`Frequency: ${item.frequency} times`}
                      >
                        {item.keyword} ({item.frequency})
                      </span>
                    ))}
                  </div>
                  <p className="text-xs text-gray-500 mt-2">
                    These keywords appear most frequently in the JD. Include them in your resume to increase ATS score.
                  </p>
                </div>
              )}

              {/* ATS Insights */}
              {selectedJobMetadata?.ats_insights && (
                <div className="space-y-3">
                  {/* Action Verbs */}
                  {selectedJobMetadata.ats_insights.action_verbs && selectedJobMetadata.ats_insights.action_verbs.length > 0 && (
                    <div>
                      <div className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2 flex items-center gap-1">
                        <span>⚡</span> Action Verbs (Use in Resume)
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {selectedJobMetadata.ats_insights.action_verbs.map((verb, idx) => (
                          <span key={idx} className="px-3 py-1 rounded-full text-xs font-medium bg-gradient-to-r from-indigo-500 to-indigo-600 text-white">
                            {verb}
                          </span>
                        ))}
                      </div>
                      <p className="text-xs text-gray-500 mt-2">
                        Use these action verbs in your resume bullet points (e.g., "Led team" instead of "Was part of team").
                      </p>
                    </div>
                  )}

                  {/* Metrics */}
                  {selectedJobMetadata.ats_insights.metrics && selectedJobMetadata.ats_insights.metrics.length > 0 && (
                    <div>
                      <div className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2 flex items-center gap-1">
                        <span>📈</span> Metrics Keywords
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {selectedJobMetadata.ats_insights.metrics.map((metric, idx) => (
                          <span key={idx} className="px-3 py-1 rounded-full text-xs font-medium bg-gradient-to-r from-teal-500 to-teal-600 text-white">
                            {metric}
                          </span>
                        ))}
                      </div>
                      <p className="text-xs text-gray-500 mt-2">
                        Include quantifiable metrics in your resume (e.g., "Improved performance by 30%").
                      </p>
                    </div>
                  )}

                  {/* Industry Terms */}
                  {selectedJobMetadata.ats_insights.industry_terms && selectedJobMetadata.ats_insights.industry_terms.length > 0 && (
                    <div>
                      <div className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2 flex items-center gap-1">
                        <span>🏭</span> Industry Terms
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {selectedJobMetadata.ats_insights.industry_terms.map((term, idx) => (
                          <span key={idx} className="px-3 py-1 rounded-full text-xs font-medium bg-gradient-to-r from-cyan-500 to-cyan-600 text-white">
                            {term}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : null}

          {/* Match Results (if available) */}
          {matchResult && (
            <div className="space-y-6 mt-6">
              {/* ATS Score Header */}
              <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-4">
                    <div className="relative inline-flex h-20 w-20 flex-shrink-0 items-center justify-center">
                      <svg viewBox="0 0 120 120" className="h-full w-full">
                        <circle
                          cx="60"
                          cy="60"
                          r="52"
                          fill="none"
                          stroke="#e5e7eb"
                          strokeWidth="8"
                        />
                        <circle
                          cx="60"
                          cy="60"
                          r="52"
                          fill="none"
                          strokeLinecap="round"
                          strokeWidth="8"
                          strokeDasharray={`${Math.max(0, Math.min(100, overallATSScore ?? 0)) * 3.27} 999`}
                          strokeDashoffset="0"
                          className={`${getScoreColor(overallATSScore ?? 0).replace('text-', 'stroke-')} drop-shadow-sm`}
                          style={{
                            transform: 'rotate(-90deg)',
                            transformOrigin: 'center',
                            transition: 'stroke-dasharray 0.6s ease-out'
                          }}
                        />
                      </svg>
                      <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <span className={`text-2xl font-bold ${getScoreColor(overallATSScore ?? 0)}`}>
                          {overallATSScore !== null ? `${overallATSScore}%` : '—'}
                        </span>
                        <span className="text-[10px] font-semibold uppercase tracking-wide text-gray-500">
                          ATS
                        </span>
                      </div>
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-gray-500 uppercase tracking-wide">
                        Match Score
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <span className={`text-3xl font-bold ${getScoreColor(overallATSScore ?? 0)}`}>
                          {overallATSScore !== null ? `${overallATSScore}%` : '—'}
                        </span>
                        {scoreChange !== null && scoreChange !== 0 && previousATSScore !== null && (
                          <span
                            className={`text-xs font-bold px-2 py-1 rounded ${scoreChange > 0
                              ? 'bg-green-100 text-green-700'
                              : 'bg-red-100 text-red-700'
                              }`}
                          >
                            {scoreChange > 0 ? '↑' : '↓'} {Math.abs(scoreChange)}%
                          </span>
                        )}
                      </div>
                      <div className="mt-1 text-sm text-gray-600">
                        {matchTierLabel}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleManualATSRefresh}
                      disabled={isManualATSRefreshing || !resumeData}
                      className="text-xs px-3 py-1.5 border border-gray-300 rounded-lg font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                    >
                      {isManualATSRefreshing ? 'Refreshing...' : 'Refresh'}
                    </button>
                    {isAnalyzing && (
                      <span className="text-xs px-3 py-1.5 bg-blue-50 text-blue-600 rounded-lg font-medium">
                        Updating...
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Key Metrics */}
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                  <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
                    Keyword Coverage
                  </div>
                  <div className="text-2xl font-bold text-gray-900 mb-1">
                    {keywordCoverageValue !== null ? `${keywordCoverageValue}%` : '—'}
                  </div>
                  {matchedKeywordCount !== null && totalKeywordCount !== null && (
                    <div className="text-xs text-gray-500">
                      {matchedKeywordCount} of {totalKeywordCount} keywords
                    </div>
                  )}
                </div>
                <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                  <div className="text-xs font-semibold text-blue-700 uppercase tracking-wide mb-1">
                    Estimated Fit
                  </div>
                  <div className="text-2xl font-bold text-blue-700 mb-1">
                    {estimatedATS ? `${estimatedATS.score}%` : '—'}
                  </div>
                  {estimatedATS && (
                    <div className="text-xs text-blue-600">
                      {estimatedATS.matchedKeywords.length} of {estimatedATS.totalKeywords} terms
                    </div>
                  )}
                </div>
              </div>

              {/* Missing Keywords Section */}
              {matchResult.match_analysis.missing_keywords.length > 0 && (
                <div className="border-t border-gray-200 pt-6">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">
                        Missing Keywords
                      </h3>
                      <p className="text-sm text-gray-500 mt-1">
                        Add these to improve your match score ({matchResult.match_analysis.missing_keywords.length} missing)
                      </p>
                    </div>
                    {selectedKeywords.size > 0 && (
                      <div className="flex gap-2">
                        <button
                          onClick={() => {
                            const workExpSections = resumeData.sections.filter((s: any) =>
                              s.title.toLowerCase().includes('experience') || s.title.toLowerCase().includes('work')
                            );
                            if (workExpSections.length > 0) {
                              setSelectedWorkExpSection(workExpSections[0].id);
                            }
                            setShowBulletGenerator(true);
                          }}
                          className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                          </svg>
                          Create Bullets ({selectedKeywords.size})
                        </button>
                        <button
                          onClick={() => addKeywordsToSkillsSection(Array.from(selectedKeywords))}
                          className="px-4 py-2 bg-emerald-600 text-white text-sm font-medium rounded-lg hover:bg-emerald-700 transition-colors flex items-center gap-2"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                          </svg>
                          Add to Skills ({selectedKeywords.size})
                        </button>
                      </div>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {matchResult.match_analysis.missing_keywords.map((keyword, index) => (
                      <label
                        key={index}
                        className={`px-3 py-1.5 text-sm rounded-lg cursor-pointer border-2 transition-all flex items-center gap-2 ${selectedKeywords.has(keyword)
                          ? 'bg-red-100 text-red-800 border-red-400 font-medium'
                          : (matchResult as any).priority_keywords?.includes?.(keyword)
                            ? 'bg-red-50 text-red-700 border-red-300 font-medium'
                            : 'bg-red-50 text-red-600 border-red-200 hover:border-red-300'
                          }`}
                      >
                        <input
                          type="checkbox"
                          checked={selectedKeywords.has(keyword)}
                          onChange={(e) => {
                            const newSelected = new Set(selectedKeywords);
                            if (e.target.checked) {
                              newSelected.add(keyword);
                            } else {
                              newSelected.delete(keyword);
                            }
                            setSelectedKeywords(newSelected);
                          }}
                          className="w-4 h-4 text-red-600 rounded focus:ring-red-500"
                        />
                        <span>{keyword}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {/* Matched Keywords Section - Keywords to reinforce */}
              {matchResult.match_analysis.matching_keywords && matchResult.match_analysis.matching_keywords.length > 0 && (
                <div className="border-t border-gray-200 pt-6">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">
                        Matched Keywords (Reinforce These)
                      </h3>
                      <p className="text-sm text-gray-500 mt-1">
                        These keywords are in the JD. Add more instances to your resume to strengthen your match ({matchResult.match_analysis.matching_keywords.length} keywords)
                      </p>
                    </div>
                    {selectedKeywords.size > 0 && (
                      <div className="flex gap-2">
                        <button
                          onClick={() => {
                            const workExpSections = resumeData.sections.filter((s: any) =>
                              s.title.toLowerCase().includes('experience') || s.title.toLowerCase().includes('work')
                            );
                            if (workExpSections.length > 0) {
                              setSelectedWorkExpSection(workExpSections[0].id);
                            }
                            setShowBulletGenerator(true);
                          }}
                          className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                          </svg>
                          Create Bullets ({selectedKeywords.size})
                        </button>
                        <button
                          onClick={() => addKeywordsToSkillsSection(Array.from(selectedKeywords))}
                          className="px-4 py-2 bg-emerald-600 text-white text-sm font-medium rounded-lg hover:bg-emerald-700 transition-colors flex items-center gap-2"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                          </svg>
                          Add to Skills ({selectedKeywords.size})
                        </button>
                      </div>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {matchResult.match_analysis.matching_keywords.slice(0, 30).map((keyword, index) => (
                      <label
                        key={index}
                        className={`px-3 py-1.5 text-sm rounded-lg cursor-pointer border-2 transition-all flex items-center gap-2 ${selectedKeywords.has(keyword)
                          ? 'bg-green-50 text-green-700 border-green-300 font-medium'
                          : 'bg-gray-50 text-gray-700 border-gray-200 hover:border-gray-300'
                          }`}
                      >
                        <input
                          type="checkbox"
                          checked={selectedKeywords.has(keyword)}
                          onChange={(e) => {
                            const newSelected = new Set(selectedKeywords);
                            if (e.target.checked) {
                              newSelected.add(keyword);
                            } else {
                              newSelected.delete(keyword);
                            }
                            setSelectedKeywords(newSelected);
                          }}
                          className="w-4 h-4 text-green-600 rounded focus:ring-green-500"
                        />
                        <span>{keyword}</span>
                      </label>
                    ))}
                  </div>
                  <p className="text-xs text-gray-500 mt-3">
                    💡 Tip: These keywords already appear in the job description. Adding them multiple times in your resume (in different contexts) will increase your ATS score.
                  </p>
                </div>
              )}

              {/* Technical Skills */}
              {matchResult.match_analysis.technical_missing.length > 0 && (
                <div className="border-t border-gray-200 pt-6">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">
                        Missing Technical Skills
                      </h3>
                      <p className="text-sm text-gray-500 mt-1">
                        Add these skills to your resume ({matchResult.match_analysis.technical_missing.length} missing)
                      </p>
                    </div>
                    <button
                      onClick={() => {
                        const currentSkills = new Set<string>()
                        resumeData.sections?.forEach((section: any) => {
                          const sectionType = section.title?.toLowerCase()
                          if (sectionType?.includes('skill') || sectionType?.includes('technical')) {
                            section.bullets?.forEach((bullet: any) => {
                              const skillText = bullet.text?.replace(/^•\s*/, '').trim()
                              if (skillText) {
                                currentSkills.add(skillText.toLowerCase())
                              }
                            })
                          }
                        })

                        let skillsSection = resumeData.sections?.find((s: any) => {
                          const title = s.title?.toLowerCase()
                          return title?.includes('skill') || title?.includes('technical')
                        })

                        if (!skillsSection) {
                          skillsSection = {
                            id: `skill-${Date.now()}`,
                            title: 'Skills',
                            bullets: []
                          }
                        }

                        const skillsToAdd = matchResult.match_analysis.technical_missing.filter(
                          (skill: string) => !currentSkills.has(skill.toLowerCase())
                        )

                        const newSkills = skillsToAdd.map((skill: string) => ({
                          id: `skill-${Date.now()}-${Math.random()}`,
                          text: skill,
                          params: { visible: true }
                        }))

                        const updatedSections = resumeData.sections?.map((s: any) =>
                          s.id === skillsSection.id
                            ? { ...s, bullets: [...s.bullets, ...newSkills] }
                            : s
                        ) || []

                        if (!resumeData.sections?.find((s: any) => s.id === skillsSection.id)) {
                          updatedSections.push(skillsSection)
                        }

                        const updatedResume = {
                          ...resumeData,
                          sections: updatedSections
                        }

                        if (onResumeUpdate) {
                          onResumeUpdate(updatedResume)
                        }

                        alert(`✅ Added ${skillsToAdd.length} missing skill${skillsToAdd.length > 1 ? 's' : ''} to your resume!`)
                      }}
                      className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                      Add All Missing Skills
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {matchResult.match_analysis.technical_missing.map((skill, index) => {
                      // Check if skill already exists in resume
                      const skillExists = resumeData.sections?.some((section: any) => {
                        const sectionType = section.title?.toLowerCase()
                        if (sectionType?.includes('skill') || sectionType?.includes('technical')) {
                          return section.bullets?.some((bullet: any) =>
                            bullet.text?.replace(/^•\s*/, '').trim().toLowerCase() === skill.toLowerCase()
                          )
                        }
                        return false
                      })

                      return (
                        <label
                          key={index}
                          className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium cursor-pointer border-2 transition-all ${skillExists
                            ? 'bg-green-100 text-green-700 border-green-300'
                            : 'bg-red-100 text-red-700 border-red-300 hover:bg-red-200'
                            }`}
                        >
                          <input
                            type="checkbox"
                            checked={false}
                            onChange={(e) => {
                              if (e.target.checked && !skillExists) {
                                // Find or create skills section
                                let skillsSection = resumeData.sections?.find((s: any) => {
                                  const title = s.title?.toLowerCase()
                                  return title?.includes('skill') || title?.includes('technical')
                                })

                                if (!skillsSection) {
                                  skillsSection = {
                                    id: `skill-${Date.now()}`,
                                    title: 'Skills',
                                    bullets: []
                                  }
                                }

                                const newSkill = {
                                  id: `skill-${Date.now()}-${Math.random()}`,
                                  text: skill,
                                  params: { visible: true }
                                }

                                const updatedSections = resumeData.sections?.map((s: any) =>
                                  s.id === skillsSection.id
                                    ? { ...s, bullets: [...s.bullets, newSkill] }
                                    : s
                                ) || []

                                if (!resumeData.sections?.find((s: any) => s.id === skillsSection.id)) {
                                  updatedSections.push({ ...skillsSection, bullets: [newSkill] })
                                }

                                const updatedResume = {
                                  ...resumeData,
                                  sections: updatedSections
                                }

                                if (onResumeUpdate) {
                                  onResumeUpdate(updatedResume)
                                }

                                // Uncheck the checkbox after adding
                                e.target.checked = false
                              }
                            }}
                            className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                            disabled={skillExists}
                          />
                          <span>{skill}</span>
                          {skillExists && <span className="text-xs">✓</span>}
                        </label>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* Save Button */}
              {matchResult && currentJobDescriptionId && (
                <div className="pt-4 border-t border-gray-200">
                  <button
                    onClick={async () => {
                      if (!isAuthenticated || !user?.email) {
                        alert('Please sign in to save resumes to your profile');
                        return;
                      }

                      let suggestedName = '';
                      if (currentJDInfo?.company) {
                        const companyName = currentJDInfo.company.trim();
                        const jobTitle = currentJDInfo.title ? ` - ${currentJDInfo.title.trim()}` : '';
                        suggestedName = `${companyName}${jobTitle} Resume`;
                      } else if (currentJDInfo?.title) {
                        suggestedName = `${currentJDInfo.title.trim()} Resume`;
                      } else if (selectedJobMetadata?.company) {
                        const companyName = selectedJobMetadata.company.trim();
                        const jobTitle = selectedJobMetadata.title ? ` - ${selectedJobMetadata.title.trim()}` : '';
                        suggestedName = `${companyName}${jobTitle} Resume`;
                      } else if (selectedJobMetadata?.title) {
                        suggestedName = `${selectedJobMetadata.title.trim()} Resume`;
                      } else {
                        suggestedName = resumeData.name ? `${resumeData.name} Resume` : 'My Resume';
                      }

                      const resumePayload = updatedResumeData ?? resumeData;
                      const savedJobId = await handleSaveJobDescription();
                      if (savedJobId) {
                        await handleSaveResumeWithName({
                          nameOverride: suggestedName,
                          resumeOverride: resumePayload,
                          suppressModalReset: true,
                          jobDescriptionIdOverride: savedJobId,
                        });
                      }
                    }}
                    data-save-job-btn
                    className="w-full bg-green-600 text-white py-2 px-4 rounded-lg hover:bg-green-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span>Save to Jobs</span>
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Estimated ATS (when no match result) */}
          {!matchResult && estimatedATS && (
            <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Estimated ATS Score</h3>
                {isATSUpdatePending && (
                  <span className="text-xs font-medium text-gray-500">Pending sync</span>
                )}
              </div>
              <div className="text-4xl font-bold text-indigo-600 mb-2">
                {estimatedATS?.score}%
              </div>
              <div className="text-sm text-gray-600 mb-4">
                Matching {estimatedATS?.matchedKeywords?.length || 0} of {estimatedATS?.totalKeywords || 0} key terms
              </div>
              {estimatedATS?.missingKeywords && estimatedATS.missingKeywords.length > 0 && (
                <div className="mt-4 p-3 bg-red-50 rounded-lg border border-red-200">
                  <div className="text-sm font-medium text-red-900 mb-2">Top Missing Keywords:</div>
                  <div className="flex flex-wrap gap-2">
                    {estimatedATS.missingKeywords.slice(0, 5).map((keyword, idx) => (
                      <span key={keyword} className="px-2 py-1 bg-white text-red-700 text-xs rounded border border-red-200">
                        {prettifyKeyword(keyword)}
                      </span>
                    ))}
                    {estimatedATS.missingKeywords.length > 5 && (
                      <span className="px-2 py-1 text-xs text-red-600">+{estimatedATS.missingKeywords.length - 5} more</span>
                    )}
                  </div>
                </div>
              )}
              <p className="text-xs text-gray-500 mt-4">
                This is an estimate. Click "Analyze Match" for a full AI-powered comparison.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  if (standalone) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999] p-4" onClick={onClose}>
        <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden" onClick={(e) => e.stopPropagation()}>
          <div className="flex items-center justify-between p-4 border-b border-gray-200">
            <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              🎯 Job Description Matcher
            </h2>
            {onClose && (
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600 text-2xl"
              >
                ×
              </button>
            )}
          </div>
          {content}
        </div>
      </div>
    );
  }

  return (
    <>
      {content}
      {/* Bullet Generator Modal */}
      {showBulletGenerator && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[10000] p-4" onClick={() => {
          setShowBulletGenerator(false);
          setSelectedWorkExpSection('');
          setBulletGeneratorCompany('');
          setBulletGeneratorJobTitle('');
        }}>
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-gradient-to-r from-blue-600 to-purple-600">
              <h2 className="text-2xl font-bold text-white">✨ Generate Bullet Points from Keywords</h2>
              <button
                onClick={() => {
                  setShowBulletGenerator(false);
                  setSelectedWorkExpSection('');
                  setBulletGeneratorCompany('');
                  setBulletGeneratorJobTitle('');
                }}
                className="text-white hover:text-gray-200 text-2xl font-bold"
              >
                ×
              </button>
            </div>

            <div className="p-6 overflow-y-auto max-h-[calc(90vh-180px)]">
              <div className="mb-4">
                <p className="text-gray-600 mb-4">
                  Selected keywords: <span className="font-semibold text-blue-600">{Array.from(selectedKeywords).join(', ')}</span>
                </p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Select Work Experience Section
                  </label>
                  <select
                    value={selectedWorkExpSection}
                    onChange={(e) => setSelectedWorkExpSection(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">-- Select a section --</option>
                    {resumeData.sections
                      .filter((s: any) => s.title.toLowerCase().includes('experience') || s.title.toLowerCase().includes('work'))
                      .map((section: any) => (
                        <option key={section.id} value={section.id}>
                          {section.title}
                        </option>
                      ))}
                  </select>
                  {resumeData.sections.filter((s: any) => s.title.toLowerCase().includes('experience') || s.title.toLowerCase().includes('work')).length === 0 && (
                    <p className="text-sm text-red-600 mt-1">No work experience section found. Please add one first.</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Company Name (Optional - for context)
                  </label>
                  <input
                    type="text"
                    value={bulletGeneratorCompany}
                    onChange={(e) => setBulletGeneratorCompany(e.target.value)}
                    placeholder="e.g., Google, Microsoft"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Job Title (Optional - for context)
                  </label>
                  <input
                    type="text"
                    value={bulletGeneratorJobTitle}
                    onChange={(e) => setBulletGeneratorJobTitle(e.target.value)}
                    placeholder="e.g., DevOps Engineer, Software Engineer"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200 bg-gray-50">
              <button
                onClick={() => {
                  setShowBulletGenerator(false);
                  setSelectedWorkExpSection('');
                  setBulletGeneratorCompany('');
                  setBulletGeneratorJobTitle('');
                }}
                className="px-6 py-2 border-2 border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 font-semibold transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  if (!selectedWorkExpSection) {
                    alert('Please select a work experience section');
                    return;
                  }

                  setIsGeneratingBullets(true);
                  try {
                    // First, check existing unmarked bullets for keywords
                    const keywordsArray = Array.from(selectedKeywords);
                    const keywordsToGenerate = new Set<string>();
                    const markedBullets: Array<{ sectionId: string, bulletId: string, keyword: string }> = [];

                    // Get all unmarked bullets (visible !== false means visible or undefined)
                    const allUnmarkedBullets: Array<{ sectionId: string, bulletId: string, text: string }> = [];
                    resumeData.sections.forEach((section: any) => {
                      section.bullets.forEach((bullet: any) => {
                        // Skip company headers (work experience headers)
                        if (!bullet.text?.startsWith('**') && bullet.text?.trim()) {
                          // Check if bullet is unmarked (visible is false or undefined, but we want unmarked = visible !== false)
                          // Actually, we want to check bullets that are currently hidden (visible === false)
                          // But the user wants to check unmarked bullets - I think they mean bullets that are currently unchecked (visible === false)
                          // Let me re-read: "existing unmarked bullet points" - I think they mean bullets that are currently hidden/unchecked
                          // So we check bullets where visible === false
                          if (bullet.params?.visible === false) {
                            allUnmarkedBullets.push({
                              sectionId: section.id,
                              bulletId: bullet.id,
                              text: bullet.text
                            });
                          }
                        }
                      });
                    });

                    // Check each keyword against existing unmarked bullets
                    keywordsArray.forEach(keyword => {
                      const keywordLower = keyword.toLowerCase();
                      let found = false;

                      for (const bullet of allUnmarkedBullets) {
                        const bulletTextLower = bullet.text.toLowerCase();
                        // Check if keyword appears in bullet text (case-insensitive)
                        if (bulletTextLower.includes(keywordLower)) {
                          markedBullets.push({
                            sectionId: bullet.sectionId,
                            bulletId: bullet.bulletId,
                            keyword: keyword
                          });
                          found = true;
                          break; // Found a match, move to next keyword
                        }
                      }

                      // If keyword not found in existing bullets, add to generation list
                      if (!found) {
                        keywordsToGenerate.add(keyword);
                      }
                    });

                    // Mark matched bullets by updating resume data
                    if (markedBullets.length > 0) {
                      const updatedSections = resumeData.sections.map((section: any) => {
                        const sectionMarkedBullets = markedBullets.filter(m => m.sectionId === section.id);
                        if (sectionMarkedBullets.length > 0) {
                          return {
                            ...section,
                            bullets: section.bullets.map((bullet: any) => {
                              const marked = sectionMarkedBullets.find(m => m.bulletId === bullet.id);
                              if (marked) {
                                // Mark bullet as visible
                                return {
                                  ...bullet,
                                  params: { ...bullet.params, visible: true }
                                };
                              }
                              return bullet;
                            })
                          };
                        }
                        return section;
                      });

                      const updatedResume = {
                        ...resumeData,
                        sections: updatedSections
                      };

                      if (onResumeUpdate) {
                        onResumeUpdate(updatedResume);
                      }
                    }

                    // Generate bullets only for keywords not found in existing bullets
                    let generatedBulletsList: string[] = [];
                    if (keywordsToGenerate.size > 0) {
                      // Limit job description size to optimize API call
                      const jobDescExcerpt = jobDescription ? jobDescription.substring(0, 2000) : '';
                      
                      const response = await fetch(`${config.apiBase}/api/ai/generate_bullets_from_keywords`, {
                        method: 'POST',
                        headers: {
                          'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({
                          keywords: Array.from(keywordsToGenerate),
                          job_description: jobDescExcerpt,
                          company_title: bulletGeneratorCompany,
                          job_title: bulletGeneratorJobTitle
                        }),
                      });

                      if (!response.ok) {
                        throw new Error(`HTTP error! status: ${response.status}`);
                      }

                      const result = await response.json();

                      if (result.success && result.bullets && result.bullets.length > 0) {
                        generatedBulletsList = result.bullets;
                        // Store keywords used for generation
                        setGeneratedKeywords(Array.from(keywordsToGenerate));
                      }
                    }

                    // Show summary if bullets were marked
                    if (markedBullets.length > 0) {
                      const summary = `✅ Found ${markedBullets.length} existing bullet${markedBullets.length > 1 ? 's' : ''} with matching keywords and marked them as visible.\n\n` +
                        (generatedBulletsList.length > 0
                          ? `Generated ${generatedBulletsList.length} new bullet${generatedBulletsList.length > 1 ? 's' : ''} for unmatched keywords.`
                          : 'All keywords were found in existing bullets - no new bullets needed.');

                      if (generatedBulletsList.length === 0) {
                        // All keywords found, just show success message
                        alert(summary);
                        setShowBulletGenerator(false);
                        setSelectedKeywords(new Set());
                        setSelectedWorkExpSection('');
                        setBulletGeneratorCompany('');
                        setBulletGeneratorJobTitle('');
                        setIsGeneratingBullets(false);
                        return;
                      } else {
                        // Show summary and continue with assignment
                        console.log(summary);
                      }
                    }

                    if (generatedBulletsList.length > 0 || markedBullets.length > 0) {
                      setGeneratedBullets(generatedBulletsList);

                      // Parse work experience and project entries from ALL sections
                      const entries: Array<{ sectionId: string, bulletId: string, companyName: string, jobTitle: string, dateRange: string, sectionTitle: string, sectionType: 'work' | 'project' }> = [];

                      resumeData.sections
                        .filter((s: any) => {
                          const title = s.title.toLowerCase();
                          return title.includes('experience') || title.includes('work') || title.includes('project');
                        })
                        .forEach((section: any) => {
                          const sectionType = section.title.toLowerCase().includes('project') ? 'project' : 'work';
                          section.bullets.forEach((bullet: any) => {
                            const isItemHeader = bullet.text?.startsWith('**') && bullet.text?.includes('**', 2);
                            if (isItemHeader) {
                              const headerText = bullet.text.replace(/\*\*/g, '').trim();
                              const parts = headerText.split(' / ');
                              const companyName = parts[0]?.trim() || 'Unknown Company';
                              const jobTitle = parts[1]?.trim() || 'Unknown Role';
                              const dateRange = parts[2]?.trim() || 'Unknown Date';

                              entries.push({
                                sectionId: section.id,
                                bulletId: bullet.id,
                                companyName,
                                jobTitle,
                                dateRange,
                                sectionTitle: section.title,
                                sectionType
                              });
                            }
                          });
                        });

                      if (entries.length === 0) {
                        // No work experience entries found, add bullets directly to selected section
                        const selectedSection = resumeData.sections.find((s: any) => s.id === selectedWorkExpSection);
                        if (!selectedSection) {
                          throw new Error('Selected section not found');
                        }
                        if (generatedBulletsList.length > 0) {
                          // No work experience entries found, add bullets directly to section
                          const existingTexts = new Set(
                            selectedSection.bullets.map((b: any) => (b.text || '').replace(/^•\s*/, '').trim().toLowerCase())
                          );
                          const sanitizedBullets = generatedBulletsList
                            .map((bulletText: string) => bulletText.replace(/^•\s*/, '').trim())
                            .filter((text: string) => text.length > 0)
                            .filter((text: string) => {
                              const lower = text.toLowerCase();
                              if (existingTexts.has(lower)) {
                                return false;
                              }
                              existingTexts.add(lower);
                              return true;
                            });

                          if (sanitizedBullets.length === 0) {
                            alert('All generated bullet points already exist in this section – nothing new to add.');
                            setShowBulletGenerator(false);
                            setSelectedKeywords(new Set());
                            setSelectedWorkExpSection('');
                            setBulletGeneratorCompany('');
                            setBulletGeneratorJobTitle('');
                            setGeneratedBullets([]);
                            setBulletAssignments(new Map<number, string>());
                            setSelectedBulletIndices(new Set<number>());
                            setWorkExpEntries([]);
                            return;
                          }

                          // Store keywords used for each bullet (distribute keywords across bullets)
                          const keywordsArray = Array.from(keywordsToGenerate);
                          const newBullets = sanitizedBullets.map((text, idx) => {
                            // Distribute keywords across bullets - each bullet gets some keywords
                            const keywordsPerBullet = Math.ceil(keywordsArray.length / sanitizedBullets.length);
                            const startIdx = idx * keywordsPerBullet;
                            const endIdx = Math.min(startIdx + keywordsPerBullet, keywordsArray.length);
                            const bulletKeywords = keywordsArray.slice(startIdx, endIdx);

                            return {
                              id: `bullet-${Date.now()}-${Math.random()}`,
                              text: text.startsWith('•') ? text : `• ${text}`,
                              params: {
                                generatedKeywords: bulletKeywords // Store keywords used to generate this bullet
                              }
                            };
                          });

                          const updatedSections = resumeData.sections.map((s: any) => {
                            if (s.id === selectedWorkExpSection) {
                              return {
                                ...s,
                                bullets: [...s.bullets, ...newBullets]
                              };
                            }
                            return s;
                          });

                          const updatedResume = {
                            ...resumeData,
                            sections: updatedSections
                          };

                          if (onResumeUpdate) {
                            onResumeUpdate(updatedResume);
                          }

                          const successMsg = markedBullets.length > 0
                            ? `✅ Marked ${markedBullets.length} existing bullet${markedBullets.length > 1 ? 's' : ''} and added ${sanitizedBullets.length} new bullet point${sanitizedBullets.length > 1 ? 's' : ''} to ${selectedSection.title}!`
                            : `✅ Successfully generated and added ${sanitizedBullets.length} bullet point${sanitizedBullets.length > 1 ? 's' : ''} to ${selectedSection.title}!`;

                          alert(successMsg);
                        } else if (markedBullets.length > 0) {
                          // Only marked existing bullets, no new ones generated
                          alert(`✅ Marked ${markedBullets.length} existing bullet${markedBullets.length > 1 ? 's' : ''} - all keywords found in your resume!`);
                        }

                        setShowBulletGenerator(false);
                        setSelectedKeywords(new Set());
                        setSelectedWorkExpSection('');
                        setBulletGeneratorCompany('');
                        setBulletGeneratorJobTitle('');
                      } else {
                        // Show work experience selector only if we have new bullets to assign
                        if (generatedBulletsList.length > 0) {
                          setWorkExpEntries(entries);
                          setSelectedBulletIndices(new Set(generatedBulletsList.map((_: any, idx: number) => idx)));
                          setBulletAssignments(new Map<number, string>());
                          setShowBulletGenerator(false);
                          setShowWorkExpSelector(true);
                        } else {
                          // All keywords found in existing bullets, just close
                          setShowBulletGenerator(false);
                          setSelectedKeywords(new Set());
                          setSelectedWorkExpSection('');
                          setBulletGeneratorCompany('');
                          setBulletGeneratorJobTitle('');
                        }
                      }
                    } else if (markedBullets.length > 0) {
                      // Only marked bullets, no generation needed
                      setShowBulletGenerator(false);
                      setSelectedKeywords(new Set());
                      setSelectedWorkExpSection('');
                      setBulletGeneratorCompany('');
                      setBulletGeneratorJobTitle('');
                    } else {
                      throw new Error('No bullet points generated or found');
                    }
                  } catch (error) {
                    console.error('Error generating bullet points:', error);
                    alert('Failed to generate bullet points: ' + (error instanceof Error ? error.message : 'Unknown error'));
                  } finally {
                    setIsGeneratingBullets(false);
                  }
                }}
                disabled={isGeneratingBullets || !selectedWorkExpSection || resumeData.sections.filter((s: any) => s.title.toLowerCase().includes('experience') || s.title.toLowerCase().includes('work')).length === 0}
                className="px-6 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed font-semibold transition-all shadow-lg"
              >
                {isGeneratingBullets ? (
                  <span className="flex items-center gap-2">
                    <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Generating...
                  </span>
                ) : (
                  'Generate & Add Bullets'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Work Experience Selector Modal */}
      {showWorkExpSelector && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[10000] p-4" onClick={() => {
          setShowWorkExpSelector(false);
          setGeneratedBullets([]);
          setWorkExpEntries([]);
        }}>
          <div className="bg-white rounded-xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-gradient-to-r from-green-600 to-blue-600">
              <h2 className="text-2xl font-bold text-white">📍 Assign Bullet Points</h2>
              <button
                onClick={() => {
                  setShowWorkExpSelector(false);
                  setGeneratedBullets([]);
                  setWorkExpEntries([]);
                }}
                className="text-white hover:text-gray-200 text-2xl font-bold"
              >
                ×
              </button>
            </div>

            <div className="p-6 overflow-y-auto max-h-[calc(90vh-180px)]">
              {/* ATS Score Display */}
              {currentATSScore !== null && (
                <div className="mb-6 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border-2 border-blue-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-xs font-semibold text-gray-600 uppercase mb-1">Current ATS Score</div>
                      <div className={`text-3xl font-bold ${getScoreColor(currentATSScore)}`}>
                        {currentATSScore}%
                      </div>
                    </div>
                    {updatedATSScore !== null && updatedATSScore !== currentATSScore && (
                      <div className="text-right">
                        <div className="text-xs font-semibold text-gray-600 uppercase mb-1">Updated ATS Score</div>
                        <div className={`text-3xl font-bold ${getScoreColor(updatedATSScore)}`}>
                          {updatedATSScore}%
                        </div>
                        <div className={`text-sm font-semibold ${updatedATSScore > currentATSScore ? 'text-green-600' : 'text-red-600'}`}>
                          {updatedATSScore > currentATSScore ? '↑' : '↓'} {Math.abs(updatedATSScore - currentATSScore)}%
                        </div>
                      </div>
                    )}
                    {isCalculatingATS && (
                      <div className="text-right">
                        <div className="text-xs font-semibold text-gray-600 uppercase mb-1">Calculating...</div>
                        <div className="animate-pulse text-xl font-bold text-gray-400">--</div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div className="mb-6">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-lg font-semibold text-gray-900">
                    Generated Bullet Points ({generatedBullets.filter((_, idx) => !bulletAssignments.has(idx)).length} remaining):
                  </h3>
                  {(() => {
                    const unassignedIndices = generatedBullets
                      .map((_, idx) => idx)
                      .filter((idx: number) => !bulletAssignments.has(idx));
                    const allSelected = unassignedIndices.length > 0 && unassignedIndices.every((idx: number) => selectedBulletIndices.has(idx));

                    return unassignedIndices.length > 0 ? (
                      <button
                        onClick={() => {
                          if (allSelected) {
                            setSelectedBulletIndices(new Set<number>());
                          } else {
                            setSelectedBulletIndices(new Set(unassignedIndices));
                          }
                        }}
                        className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                      >
                        {allSelected ? 'Deselect All' : 'Select All'}
                      </button>
                    ) : null;
                  })()}
                </div>
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-2 max-h-64 overflow-y-auto">
                  {generatedBullets
                    .map((bullet, idx) => ({ bullet, idx }))
                    .filter(({ idx }) => !bulletAssignments.has(idx))
                    .map(({ bullet, idx }) => {
                      const isSelected = selectedBulletIndices.has(idx);
                      const missingKeywords = matchResult?.match_analysis?.missing_keywords || [];
                      const foundKeywords = getMissingKeywordsInBullet(bullet, missingKeywords);
                      
                      return (
                        <div key={idx} className={`flex items-start gap-3 p-2 rounded ${isSelected ? 'bg-blue-100' : 'bg-white'}`}>
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={(e) => {
                              const newSelected = new Set(selectedBulletIndices);
                              if (e.target.checked) {
                                newSelected.add(idx);
                              } else {
                                newSelected.delete(idx);
                              }
                              setSelectedBulletIndices(newSelected);
                            }}
                            className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500 mt-1"
                          />
                          <div className="flex-1">
                            <div className="flex items-start gap-2">
                              <span className="text-blue-600 mt-1">•</span>
                              <div className="flex-1">
                                <span className="text-gray-800 text-sm">
                                  {highlightMissingKeywords(bullet, missingKeywords)}
                                </span>
                                {foundKeywords.length > 0 && (
                                  <div className="mt-1 flex flex-wrap gap-1">
                                    {foundKeywords.map((keyword, kIdx) => (
                                      <span
                                        key={kIdx}
                                        className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800 border border-green-300"
                                        title={`This bullet contains missing keyword: ${keyword}`}
                                      >
                                        ✓ {keyword}
                                      </span>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  {generatedBullets.filter((_, idx) => !bulletAssignments.has(idx)).length === 0 && (
                    <div className="text-center py-4 text-gray-500 text-sm">
                      All bullets have been assigned ✓
                    </div>
                  )}
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Assign bullets to work experience or projects:</h3>
                {workExpEntries.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <p>No work experience entries found in your resume.</p>
                    <p className="text-sm mt-2">Please add work experience entries first.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {workExpEntries.map((entry, idx) => {
                      const entryKey = `${entry.sectionId}-${entry.bulletId}`;
                      const assignedBullets = Array.from(bulletAssignments.entries())
                        .filter(([_, assignedKey]) => assignedKey === entryKey)
                        .map(([bulletIdx]) => bulletIdx);
                      return (
                        <div
                          key={idx}
                          className="w-full text-left p-4 border-2 border-gray-200 rounded-lg hover:border-blue-500 transition-all shadow-sm"
                        >
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <span className={`text-xs font-semibold px-2 py-1 rounded ${entry.sectionType === 'project'
                                  ? 'text-purple-600 bg-purple-50'
                                  : 'text-blue-600 bg-blue-50'
                                  }`}>
                                  {entry.sectionType === 'project' ? '📁' : '💼'} {entry.sectionTitle}
                                </span>
                              </div>
                              <div className="font-bold text-gray-900 text-lg">{entry.companyName}</div>
                              <div className="text-gray-600 text-sm mt-1">{entry.jobTitle}</div>
                              <div className="text-gray-500 text-xs mt-1">{entry.dateRange}</div>
                            </div>
                            <button
                              onClick={async () => {
                                const unassignedSelected = Array.from(selectedBulletIndices).filter(
                                  (idx) => !bulletAssignments.has(idx)
                                );
                                if (!unassignedSelected.length) {
                                  alert('Please select at least one unassigned bullet point');
                                  return;
                                }

                                // Create assignments for selected bullets
                                const newAssignments = new Map(bulletAssignments);
                                unassignedSelected.forEach((bulletIdx) => {
                                  newAssignments.set(bulletIdx, entryKey);
                                });

                                // Apply assignments immediately
                                setSelectedBulletIndices(new Set<number>());
                                setBulletAssignments(new Map(newAssignments));
                                await applyAssignmentsToResume(newAssignments, generatedKeywords);
                              }}
                              disabled={selectedBulletIndices.size === 0}
                              className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              Assign Selected
                            </button>
                          </div>
                          {assignedBullets.length > 0 && (
                            <div className="mt-3 pt-3 border-t border-gray-200">
                              <div className="text-xs font-semibold text-gray-600 mb-2">
                                Assigned bullets ({assignedBullets.length}):
                              </div>
                              <div className="space-y-1 max-h-32 overflow-y-auto">
                                {assignedBullets.map(bulletIdx => (
                                  <div key={bulletIdx} className="flex items-center justify-between text-xs bg-green-50 p-2 rounded">
                                    <span className="text-gray-700 flex-1">• {generatedBullets[bulletIdx]}</span>
                                    <button
                                      onClick={() => {
                                        const newAssignments = new Map(bulletAssignments);
                                        newAssignments.delete(bulletIdx);
                                        setBulletAssignments(newAssignments);
                                      }}
                                      className="text-red-600 hover:text-red-800 ml-2 font-bold"
                                      title="Remove assignment"
                                    >
                                      ×
                                    </button>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center justify-end p-6 border-t border-gray-200 bg-gray-50">
              <button
                onClick={() => {
                  setShowWorkExpSelector(false);
                  setGeneratedBullets([]);
                  setWorkExpEntries([]);
                  setSelectedBulletIndices(new Set<number>());
                  setBulletAssignments(new Map<number, string>());
                  setSelectedKeywords(new Set());
                  setSelectedWorkExpSection('');
                  setBulletGeneratorCompany('');
                  setBulletGeneratorJobTitle('');
                }}
                className="px-6 py-2 border-2 border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 font-semibold transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Save Resume Name Modal */}
      {showSaveNameModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[10001] flex items-center justify-center p-4" onClick={() => {
          setShowSaveNameModal(false);
          setResumeSaveName('');
          setUpdatedResumeData(null);
        }}>
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-gradient-to-r from-green-600 to-blue-600">
              <h2 className="text-2xl font-bold text-white">💾 Save Resume</h2>
              <button
                onClick={() => {
                  setShowSaveNameModal(false);
                  setResumeSaveName('');
                  setUpdatedResumeData(null);
                }}
                className="text-white hover:text-gray-200 text-2xl font-bold"
              >
                ×
              </button>
            </div>

            <div className="p-6">
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Resume Name
                </label>
                <input
                  type="text"
                  value={resumeSaveName}
                  onChange={(e) => setResumeSaveName(e.target.value)}
                  placeholder="e.g., Software Engineer Resume, DevOps Resume"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleSaveResumeWithName();
                    }
                  }}
                />
                <p className="text-xs text-gray-500 mt-1">
                  {currentJDInfo?.company
                    ? `Auto-generated from JD: ${currentJDInfo.company}${currentJDInfo.title ? ` - ${currentJDInfo.title}` : ''}. You can edit if needed.`
                    : 'Choose a name for this resume. You can save multiple resumes with different names.'}
                </p>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => handleSaveResumeWithName()}
                  className="flex-1 px-4 py-2 bg-gradient-to-r from-green-600 to-blue-600 text-white rounded-lg hover:from-green-700 hover:to-blue-700 font-semibold transition-all"
                >
                  Save Resume
                </button>
                <button
                  onClick={() => {
                    setShowSaveNameModal(false);
                    setResumeSaveName('');
                    setUpdatedResumeData(null);
                    // Clean up bullet generation states
                    setGeneratedBullets([]);
                    setWorkExpEntries([]);
                    setSelectedBulletIndices(new Set<number>());
                    setBulletAssignments(new Map<number, string>());
                    setSelectedKeywords(new Set());
                    setSelectedWorkExpSection('');
                    setBulletGeneratorCompany('');
                    setBulletGeneratorJobTitle('');
                  }}
                  className="px-4 py-2 border-2 border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-semibold transition-colors"
                >
                  Skip
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </>
  );
}
