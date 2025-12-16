import {
  EnhancedATSScoreResult,
  ExtensionKeywordData,
  ResumeData,
  WeightedKeyword,
  KeywordSectionMapping,
  MatchLevel,
} from './atsScoring.types';

// Optimized scoring weights (total = 100)
const SCORING_WEIGHTS = {
  skillsMatch: 20,      // Technical skills matching
  keywordCoverage: 45,  // Keyword presence
  experienceQuality: 25, // Experience relevance
  education: 5,         // Education & certs
  atsCompatibility: 5,   // Format/structure
} as const;

const RELATED_SKILLS_MAP: Record<string, string[]> = {
  'react': ['react.js', 'reactjs'],
  'react.js': ['react', 'reactjs'],
  'reactjs': ['react', 'react.js'],
  'node': ['node.js', 'nodejs'],
  'node.js': ['node', 'nodejs'],
  'nodejs': ['node', 'node.js'],
  'javascript': ['js', 'ecmascript'],
  'js': ['javascript', 'ecmascript'],
  'typescript': ['ts'],
  'ts': ['typescript'],
  'python': ['py'],
  'py': ['python'],
};

const ACTION_VERBS = new Set([
  'led', 'managed', 'increased', 'developed', 'created', 'built', 'designed',
  'implemented', 'improved', 'optimized', 'delivered', 'achieved', 'executed',
  'launched', 'established', 'coordinated', 'supervised', 'directed', 'oversaw',
  'transformed', 'enhanced', 'streamlined', 'reduced', 'expanded', 'generated',
  'produced', 'maintained', 'upgraded', 'migrated', 'integrated', 'deployed'
]);

const STANDARD_SECTION_HEADERS = [
  'work experience', 'experience', 'professional experience', 'employment',
  'professional summary', 'summary', 'executive summary',
  'education', 'academic background',
  'skills', 'technical skills', 'hard skills', 'soft skills',
  'certificates', 'certifications', 'certificate',
  'projects', 'project experience'
];

interface Bullet {
  id: string;
  text: string;
  params?: {
    visible?: boolean;
    [key: string]: unknown;
  };
}

interface Section {
  id: string;
  title: string;
  bullets: Bullet[];
  params?: Record<string, unknown>;
}

function normalizeTextForATS(value?: string | null): string {
  if (!value) return '';
  return value
    .replace(/\r\n?/g, ' ')
    .replace(/\*\*/g, '')
    .replace(/^•\s*/gm, '')
    .replace(/•/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function normalizeKeywordWeight(
  keyword: string | WeightedKeyword,
  defaultWeight: number = 5
): WeightedKeyword {
  if (typeof keyword === 'string') {
    return { keyword, weight: defaultWeight };
  }
  
  if (keyword.weight !== undefined) {
    return keyword;
  }
  
  return { ...keyword, weight: defaultWeight };
}

function normalizeExtensionData(
  extensionData?: ExtensionKeywordData
): {
  technicalKeywords: WeightedKeyword[];
  matchingKeywords: WeightedKeyword[];
  missingKeywords: WeightedKeyword[];
} {
  if (!extensionData) {
    return {
      technicalKeywords: [],
      matchingKeywords: [],
      missingKeywords: [],
    };
  }

  const normalizeArray = (
    arr?: Array<WeightedKeyword | string>,
    defaultWeight: number = 5
  ): WeightedKeyword[] => {
    if (!Array.isArray(arr)) return [];
    return arr.map(kw => normalizeKeywordWeight(kw, defaultWeight));
  };

  const technicalKeywords: WeightedKeyword[] = [];
  
  if (extensionData.technicalKeywords) {
    technicalKeywords.push(...normalizeArray(extensionData.technicalKeywords, 8));
  }

  if (extensionData.highFrequencyKeywords) {
    extensionData.highFrequencyKeywords.forEach(item => {
      let weight = item.weight || 5;
      if (item.frequency) {
        weight = Math.min(10, Math.max(1, Math.round(item.frequency / 10)));
      }
      if (item.importance) {
        const importanceWeights = { high: 10, medium: 5, low: 2 };
        weight = Math.max(weight, importanceWeights[item.importance] || 5);
      }
      technicalKeywords.push({
        keyword: item.keyword,
        weight,
        isRequired: weight >= 8,
      });
    });
  }

  const matchingKeywords = normalizeArray(extensionData.matchingKeywords, 5);
  const missingKeywords = normalizeArray(extensionData.missingKeywords, 5);

  return {
    technicalKeywords: technicalKeywords.filter(
      (kw, idx, arr) => arr.findIndex(k => k.keyword.toLowerCase() === kw.keyword.toLowerCase()) === idx
    ),
    matchingKeywords,
    missingKeywords,
  };
}

interface ResumeContent {
  summary: string;
  experience: string;
  education: string;
  skills: string;
  projects: string;
  certificates: string;
  allText: string;
  sections: Array<{ title: string; content: string; type: string }>;
}

function extractResumeContent(resumeData: ResumeData): ResumeContent {
  const summary = normalizeTextForATS(resumeData.summary || '');
  
  const sections: Array<{ title: string; content: string; type: string }> = [];
  let experience = '';
  let education = '';
  let skills = '';
  let projects = '';
  let certificates = '';

  if (resumeData.sections && Array.isArray(resumeData.sections)) {
    resumeData.sections.forEach((section) => {
      const sectionTitle = normalizeTextForATS(section.title || '').toLowerCase();
      const sectionContent: string[] = [];
      
      if (section.bullets && Array.isArray(section.bullets)) {
        section.bullets
          .filter((bullet) => bullet?.params?.visible !== false)
          .forEach((bullet) => {
            const text = normalizeTextForATS(bullet?.text);
            if (text) sectionContent.push(text);
          });
      }

      const content = sectionContent.join(' ').toLowerCase();
      const sectionType = detectSectionType(sectionTitle);

      sections.push({
        title: section.title || '',
        content,
        type: sectionType,
      });

      switch (sectionType) {
        case 'experience':
          experience += ' ' + content;
          break;
        case 'education':
          education += ' ' + content;
          break;
        case 'skills':
          skills += ' ' + content;
          break;
        case 'projects':
          projects += ' ' + content;
          break;
        case 'certificates':
          certificates += ' ' + content;
          break;
      }
    });
  }

  const allText = [
    normalizeTextForATS(resumeData.title || ''),
    summary,
    experience,
    education,
    skills,
    projects,
    certificates,
  ]
    .join(' ')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();

  return {
    summary: summary.toLowerCase(),
    experience: experience.trim(),
    education: education.trim(),
    skills: skills.trim(),
    projects: projects.trim(),
    certificates: certificates.trim(),
    allText,
    sections,
  };
}

function detectSectionType(sectionTitle: string): string {
  const title = sectionTitle.toLowerCase();
  
  if (title.includes('experience') || title.includes('work') || title.includes('employment')) {
    return 'experience';
  }
  if (title.includes('education') || title.includes('academic')) {
    return 'education';
  }
  if (title.includes('skill')) {
    return 'skills';
  }
  if (title.includes('project')) {
    return 'projects';
  }
  if (title.includes('certif')) {
    return 'certificates';
  }
  if (title.includes('summary') || title.includes('profile')) {
    return 'summary';
  }
  
  return 'other';
}

// Performance optimization: Cache regex patterns
interface PatternCache {
  patterns: Map<string, RegExp>;
  getPattern(keyword: string): RegExp;
}

function createPatternCache(): PatternCache {
  const patterns = new Map<string, RegExp>();
  
  return {
    patterns,
    getPattern(keyword: string): RegExp {
      if (patterns.has(keyword)) {
        return patterns.get(keyword)!;
      }
      
      const hasSpecialChars = /[\/\-_]/g.test(keyword);
      const escaped = escapeRegExp(keyword);
      const pattern = hasSpecialChars
        ? new RegExp(escaped, 'i')
        : new RegExp(`\\b${escaped}\\b`, 'i');
      
      patterns.set(keyword, pattern);
      return pattern;
    },
  };
}

function mapKeywordsToSections(
  keywords: WeightedKeyword[],
  resumeContent: ResumeContent,
  patternCache: PatternCache
): KeywordSectionMapping[] {
  const mappings: KeywordSectionMapping[] = [];

  keywords.forEach((kw) => {
    const keyword = kw.keyword.toLowerCase();
    const pattern = patternCache.getPattern(keyword);

    const sectionCounts: Record<string, number> = {};

    if (pattern.test(resumeContent.skills)) {
      sectionCounts['skills'] = (resumeContent.skills.match(pattern) || []).length;
    }
    if (pattern.test(resumeContent.experience)) {
      sectionCounts['experience'] = (resumeContent.experience.match(pattern) || []).length;
    }
    if (pattern.test(resumeContent.summary)) {
      sectionCounts['summary'] = (resumeContent.summary.match(pattern) || []).length;
    }
    if (pattern.test(resumeContent.education)) {
      sectionCounts['education'] = (resumeContent.education.match(pattern) || []).length;
    }
    if (pattern.test(resumeContent.projects)) {
      sectionCounts['projects'] = (resumeContent.projects.match(pattern) || []).length;
    }

    Object.entries(sectionCounts).forEach(([section, count]) => {
      mappings.push({
        keyword: kw.keyword,
        section,
        occurrences: count,
      });
    });
  });

  return mappings;
}

function findRelatedSkills(keyword: string): string[] {
  const lower = keyword.toLowerCase();
  return RELATED_SKILLS_MAP[lower] || [];
}

function calculateSkillsMatch(
  technicalKeywords: WeightedKeyword[],
  resumeContent: ResumeContent,
  patternCache: PatternCache
): { score: number; details: string } {
  if (technicalKeywords.length === 0) {
    return { score: 0, details: 'No technical keywords provided' };
  }

  const allText = resumeContent.allText;
  let totalWeight = 0;
  let matchingWeight = 0;
  const matchedKeywords: string[] = [];
  const missingKeywords: string[] = [];

  technicalKeywords.forEach((kw) => {
    const keyword = kw.keyword.toLowerCase();
    const weight = kw.weight || 5;
    
    totalWeight += weight;

    const pattern = patternCache.getPattern(keyword);
    let found = pattern.test(allText);
    
    if (!found) {
      const related = findRelatedSkills(keyword);
      for (const relatedSkill of related) {
        const relatedPattern = patternCache.getPattern(relatedSkill);
        if (relatedPattern.test(allText)) {
          found = true;
          break;
        }
      }
    }

    if (found) {
      matchingWeight += weight;
      matchedKeywords.push(kw.keyword);
    } else {
      missingKeywords.push(kw.keyword);
    }
  });

  const score = totalWeight > 0 
    ? (matchingWeight / totalWeight) * SCORING_WEIGHTS.skillsMatch 
    : 0;

  const matchCount = matchedKeywords.length;
  const totalCount = technicalKeywords.length;

  const details = `${matchCount}/${totalCount} technical skills found`;

  return {
    score: Math.round(score * 100) / 100,
    details,
  };
}

function calculateExperienceRelevance(
  resumeContent: ResumeContent,
  jobDescription: string
): { score: number; details: string } {
  const experience = resumeContent.experience;
  if (!experience) {
    return { score: 0, details: 'No experience section found' };
  }

  let score = 0;
  const details: string[] = [];

  const quantifiedPattern = /\b\d+%|\b\d+\s*(?:years?|months?|days?)|increased by \d+|reduced by \d+|saved \$?\d+|generated \$?\d+|improved by \d+/gi;
  const quantifiedMatches = experience.match(quantifiedPattern) || [];
  if (quantifiedMatches.length > 0) {
    const points = Math.min(8, quantifiedMatches.length * 2);
    score += points;
    details.push(`${quantifiedMatches.length} quantified achievements`);
  }

  const actionVerbMatches = Array.from(experience.matchAll(/\b(\w+ed|\w+ing)\b/gi))
    .filter(match => ACTION_VERBS.has(match[1]?.toLowerCase() || ''))
    .length;
  if (actionVerbMatches > 0) {
    const points = Math.min(7, actionVerbMatches);
    score += points;
    details.push(`${actionVerbMatches} action verbs`);
  }

  const jdTitle = extractJobTitleFromJD(jobDescription);
  const resumeTitle = normalizeTextForATS(
    resumeContent.sections.find(s => s.type === 'experience')?.title || ''
  ).toLowerCase();
  if (jdTitle && resumeTitle) {
    const titleSimilarity = calculateTitleSimilarity(jdTitle, resumeTitle);
    if (titleSimilarity > 0.5) {
      score += 5;
      details.push('Job title similarity');
    }
  }

  const jdKeywords = extractIndustryKeywords(jobDescription);
  const industryMatches = jdKeywords.filter(kw => {
    const pattern = new RegExp(`\\b${escapeRegExp(kw)}\\b`, 'i');
    return pattern.test(experience);
  }).length;
  if (industryMatches > 0) {
    const points = Math.min(5, industryMatches);
    score += points;
    details.push(`${industryMatches} industry keywords`);
  }

  const maxScore = SCORING_WEIGHTS.experienceQuality;
  return {
    score: Math.min(maxScore, Math.round(score * 100) / 100),
    details: details.join(', ') || 'Basic experience content',
  };
}

function extractJobTitleFromJD(jd: string): string | null {
  const lines = jd.split('\n').slice(0, 10);
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.length > 5 && trimmed.length < 100 && /^[A-Z]/.test(trimmed)) {
      return trimmed.toLowerCase();
    }
  }
  return null;
}

function calculateTitleSimilarity(title1: string, title2: string): number {
  const words1 = new Set(title1.toLowerCase().split(/\s+/));
  const words2 = new Set(title2.toLowerCase().split(/\s+/));
  const intersection = new Set([...words1].filter(x => words2.has(x)));
  const union = new Set([...words1, ...words2]);
  return union.size > 0 ? intersection.size / union.size : 0;
}

function extractIndustryKeywords(jd: string): string[] {
  const commonIndustryTerms = [
    'agile', 'scrum', 'devops', 'cloud', 'saas', 'fintech', 'healthcare',
    'e-commerce', 'retail', 'manufacturing', 'consulting', 'banking'
  ];
  const jdLower = jd.toLowerCase();
  return commonIndustryTerms.filter(term => jdLower.includes(term));
}

function calculateKeywordCoverage(
  matchingKeywords: WeightedKeyword[],
  missingKeywords: WeightedKeyword[],
  keywordMappings: KeywordSectionMapping[],
  patternCache: PatternCache
): { score: number; details: string } {
  const totalKeywords = matchingKeywords.length + missingKeywords.length;
  if (totalKeywords === 0) {
    return { score: 0, details: 'No keywords provided' };
  }

  const coverage = (matchingKeywords.length / totalKeywords) * 100;

  const sectionWeights: Record<string, number> = {
    skills: 1.0,
    experience: 0.9,
    summary: 0.7,
    education: 0.4,
    projects: 0.4,
  };

  // Limit summary keywords to prevent over-weighting
  const MAX_SUMMARY_KEYWORDS = 15;
  const summaryKeywordMappings = keywordMappings.filter(m => m.section === 'summary');
  const otherMappings = keywordMappings.filter(m => m.section !== 'summary');
  
  const summaryKeywordsSeen = new Set<string>();
  const cappedSummaryMappings: KeywordSectionMapping[] = [];
  
  for (const mapping of summaryKeywordMappings) {
    const keywordLower = mapping.keyword.toLowerCase();
    if (summaryKeywordsSeen.size < MAX_SUMMARY_KEYWORDS && !summaryKeywordsSeen.has(keywordLower)) {
      summaryKeywordsSeen.add(keywordLower);
      cappedSummaryMappings.push(mapping);
    }
  }
  
  const processedMappings = [...cappedSummaryMappings, ...otherMappings];

  let weightedScore = 0;
  let totalWeight = 0;

  // Create a lookup map for faster access
  const keywordWeightMap = new Map<string, number>();
  matchingKeywords.forEach(kw => {
    keywordWeightMap.set(kw.keyword.toLowerCase(), kw.weight || 5);
  });

  processedMappings.forEach((mapping) => {
    const sectionWeight = sectionWeights[mapping.section] || 0.5;
    const keywordWeight = keywordWeightMap.get(mapping.keyword.toLowerCase()) || 5;
    
    const cappedOccurrences = Math.min(mapping.occurrences, 3);
    const contribution = sectionWeight * keywordWeight * cappedOccurrences;
    weightedScore += contribution;
    totalWeight += keywordWeight;
  });

  const baseScore = totalWeight > 0 
    ? (weightedScore / totalWeight) * SCORING_WEIGHTS.keywordCoverage 
    : 0;

  // Linear scaling based on keyword match percentage
  const matchPercentage = matchingKeywords.length / totalKeywords;
  const scaledScore = baseScore * (0.7 + matchPercentage * 0.3); // Scale between 70-100% of base

  return {
    score: Math.min(SCORING_WEIGHTS.keywordCoverage, Math.round(scaledScore * 100) / 100),
    details: `${Math.round(coverage)}% keyword match`,
  };
}

function calculateEducationAndCertifications(
  resumeContent: ResumeContent,
  jobDescription: string,
  resumeData?: ResumeData
): { score: number; details: string } {
  let educationScore = 0;
  let certScore = 0;
  const details: string[] = [];

  const jdLower = jobDescription.toLowerCase();
  const degreePatterns = [
    /\b(bachelor|b\.?s\.?|b\.?a\.?|master|m\.?s\.?|m\.?a\.?|ph\.?d|doctorate)\b/gi,
    /\b(degree|diploma|certification)\b/gi,
  ];

  const schoolPatterns = [
    /\b(university|college|school|institute|academy)\b/gi,
  ];

  const hasDegreeRequirement = degreePatterns.some(pattern => pattern.test(jdLower));
  
  let schoolBulletCount = 0;
  if (resumeData?.sections && Array.isArray(resumeData.sections)) {
    resumeData.sections.forEach((section) => {
      const sectionTitle = (section.title || '').toLowerCase();
      if (sectionTitle.includes('education') || sectionTitle.includes('academic')) {
        if (section.bullets && Array.isArray(section.bullets)) {
          section.bullets
            .filter((bullet) => bullet?.params?.visible !== false && bullet?.text)
            .forEach((bullet) => {
              const bulletText = normalizeTextForATS(bullet.text || '').toLowerCase();
              const hasSchoolKeyword = schoolPatterns.some(pattern => pattern.test(bulletText));
              const hasSubstantialContent = bulletText.trim().length > 5;
              
              if (hasSchoolKeyword || hasSubstantialContent) {
                schoolBulletCount++;
              }
            });
        }
      }
    });
  }
  
  if (resumeContent.education) {
    const educationText = resumeContent.education.toLowerCase();
    const hasDegree = degreePatterns.some(pattern => pattern.test(educationText));
    const hasSchool = schoolPatterns.some(pattern => pattern.test(educationText));
    const educationLength = educationText.trim().length;
    
    if (schoolBulletCount > 0) {
      educationScore = Math.min(3, schoolBulletCount * 1);
      details.push(`${schoolBulletCount} school entr${schoolBulletCount === 1 ? 'y' : 'ies'} found`);
      
      if (hasDegree) {
        educationScore += 1;
        details.push('Degree keywords detected');
      }
      
      educationScore = Math.min(4, educationScore);
    } else if (hasDegree) {
      educationScore = 3;
      details.push('Degree information present');
    } else if (hasSchool && educationLength > 20) {
      educationScore = 2;
      details.push('Education section with school information');
    } else if (educationLength > 10) {
      educationScore = 1;
      details.push('Education section present');
    }
  }

  const certPatterns = [
    /\b(certified|certification|certificate|aws|azure|gcp|pmp|scrum|agile)\b/gi,
  ];
  
  const hasCertRequirement = certPatterns.some(pattern => pattern.test(jdLower));
  if (resumeContent.certificates) {
    if (hasCertRequirement) {
      const certMatches = certPatterns.filter(pattern => 
        pattern.test(resumeContent.certificates)
      ).length;
      if (certMatches > 0) {
        certScore = 1;
        details.push('Relevant certifications found');
      }
    } else {
      certScore = 0.5;
      details.push('Certifications section present');
    }
  }

  const maxScore = SCORING_WEIGHTS.education;
  return {
    score: Math.min(maxScore, Math.round((educationScore + certScore) * 100) / 100),
    details: details.join(', ') || 'No education/certifications data',
  };
}

function calculateATSCompatibility(
  resumeContent: ResumeContent
): { score: number; details: string } {
  let score = 0;
  const details: string[] = [];

  const sectionTitles = resumeContent.sections.map(s => s.title.toLowerCase());
  const foundHeaders = STANDARD_SECTION_HEADERS.filter(header =>
    sectionTitles.some(title => title.includes(header))
  );

  if (foundHeaders.length >= 3) {
    score = SCORING_WEIGHTS.atsCompatibility;
    details.push('Standard section headers found');
  } else if (foundHeaders.length > 0) {
    score = Math.round(SCORING_WEIGHTS.atsCompatibility * 0.4);
    details.push('Some standard headers found');
  } else {
    details.push('Non-standard section headers');
  }

  return {
    score,
    details: details.join(', ') || 'Basic formatting',
  };
}

function getMatchLevel(totalScore: number): MatchLevel {
  if (totalScore >= 96) return 'Perfect match';
  if (totalScore >= 86) return 'Excellent match';
  if (totalScore >= 71) return 'Good match';
  if (totalScore >= 51) return 'Fair match';
  return 'Poor match';
}

function generateRecommendations(
  technicalKeywords: WeightedKeyword[],
  missingKeywords: WeightedKeyword[],
  resumeContent: ResumeContent,
  patternCache: PatternCache
): string[] {
  const recommendations: string[] = [];

  const missingTechnical = technicalKeywords.filter(kw => {
    const pattern = patternCache.getPattern(kw.keyword);
    return !pattern.test(resumeContent.allText);
  });

  missingTechnical
    .sort((a, b) => (b.weight || 0) - (a.weight || 0))
    .slice(0, 5)
    .forEach(kw => {
      recommendations.push(
        `Add ${kw.keyword} experience (weighted importance: ${kw.weight || 5}/10)`
      );
    });

  if (resumeContent.experience) {
    const quantifiedPattern = /\b\d+%|\b\d+\s*(?:years?|months?)/gi;
    const quantifiedCount = (resumeContent.experience.match(quantifiedPattern) || []).length;
    if (quantifiedCount < 3) {
      recommendations.push('Include more quantified achievements in experience section');
    }
  }

  missingKeywords
    .sort((a, b) => (b.weight || 0) - (a.weight || 0))
    .slice(0, 3)
    .forEach(kw => {
      const kwStr = typeof kw === 'string' ? kw : kw.keyword;
      const weight = typeof kw === 'object' ? (kw.weight || 5) : 5;
      recommendations.push(`Add ${kwStr} (weighted importance: ${weight}/10)`);
    });

  return recommendations.slice(0, 5);
}

export function calculateEnhancedATSScoreV2(
  resumeData: ResumeData,
  jobDescription: string,
  extensionData?: ExtensionKeywordData
): EnhancedATSScoreResult {
  const normalizedData = normalizeExtensionData(extensionData);
  const resumeContent = extractResumeContent(resumeData);
  const patternCache = createPatternCache();
  
  const keywordMappings = mapKeywordsToSections(
    [...normalizedData.matchingKeywords, ...normalizedData.missingKeywords],
    resumeContent,
    patternCache
  );

  const skillsMatch = calculateSkillsMatch(normalizedData.technicalKeywords, resumeContent, patternCache);
  const experienceRelevance = calculateExperienceRelevance(resumeContent, jobDescription);
  const keywordCoverage = calculateKeywordCoverage(
    normalizedData.matchingKeywords,
    normalizedData.missingKeywords,
    keywordMappings,
    patternCache
  );
  const education = calculateEducationAndCertifications(resumeContent, jobDescription, resumeData);
  const atsCompatibility = calculateATSCompatibility(resumeContent);

  const totalScore = Math.round(
    skillsMatch.score +
    experienceRelevance.score +
    keywordCoverage.score +
    education.score +
    atsCompatibility.score
  );

  const recommendations = generateRecommendations(
    normalizedData.technicalKeywords,
    normalizedData.missingKeywords,
    resumeContent,
    patternCache
  );

  return {
    totalScore: Math.min(100, Math.max(0, totalScore)),
    breakdown: {
      skillsMatch: { ...skillsMatch, max: SCORING_WEIGHTS.skillsMatch },
      experienceRelevance: { ...experienceRelevance, max: SCORING_WEIGHTS.experienceQuality },
      keywordCoverage: { ...keywordCoverage, max: SCORING_WEIGHTS.keywordCoverage },
      education: { ...education, max: SCORING_WEIGHTS.education },
      atsCompatibility: { ...atsCompatibility, max: SCORING_WEIGHTS.atsCompatibility },
    },
    recommendations,
    matchLevel: getMatchLevel(totalScore),
  };
}

