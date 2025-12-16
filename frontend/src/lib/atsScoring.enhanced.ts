import {
  EnhancedATSScoreResult,
  ExtensionKeywordData,
  ResumeData,
  WeightedKeyword,
  KeywordSectionMapping,
  MatchLevel,
} from './atsScoring.types';

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

function extractResumeContent(resumeData: ResumeData): {
  summary: string;
  experience: string;
  education: string;
  skills: string;
  projects: string;
  certificates: string;
  allText: string;
  sections: Array<{ title: string; content: string; type: string }>;
} {
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
          .filter((bullet: any) => bullet?.params?.visible !== false)
          .forEach((bullet: any) => {
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

function mapKeywordsToSections(
  keywords: WeightedKeyword[],
  resumeContent: ReturnType<typeof extractResumeContent>
): KeywordSectionMapping[] {
  const mappings: KeywordSectionMapping[] = [];

  keywords.forEach((kw) => {
    const keyword = kw.keyword.toLowerCase();
    const hasSpecialChars = /[\/\-_]/g.test(keyword);
    const escaped = escapeRegExp(keyword);
    const pattern = hasSpecialChars
      ? new RegExp(escaped, 'gi')
      : new RegExp(`\\b${escaped}\\b`, 'gi');

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
  resumeContent: ReturnType<typeof extractResumeContent>
): { score: number; details: string } {
  if (technicalKeywords.length === 0) {
    return { score: 0, details: 'No technical keywords provided' };
  }

  const allText = resumeContent.allText;
  let totalWeight = 0;
  let matchingWeight = 0;
  let requiredTotalWeight = 0;
  let requiredMatchingWeight = 0;
  const matchedKeywords: string[] = [];
  const missingKeywords: string[] = [];

  technicalKeywords.forEach((kw) => {
    const keyword = kw.keyword.toLowerCase();
    const weight = kw.weight || 5;
    const isRequired = kw.isRequired || false;
    
    if (isRequired) {
      requiredTotalWeight += weight * 2;
    }
    totalWeight += weight * (isRequired ? 2 : 1);

    const hasSpecialChars = /[\/\-_]/g.test(keyword);
    const escaped = escapeRegExp(keyword);
    const pattern = hasSpecialChars
      ? new RegExp(escaped, 'i')
      : new RegExp(`\\b${escaped}\\b`, 'i');

    let found = pattern.test(allText);
    
    if (!found) {
      const related = findRelatedSkills(keyword);
      for (const relatedSkill of related) {
        const relatedPattern = /[\/\-_]/g.test(relatedSkill)
          ? new RegExp(escapeRegExp(relatedSkill), 'i')
          : new RegExp(`\\b${escapeRegExp(relatedSkill)}\\b`, 'i');
        if (relatedPattern.test(allText)) {
          found = true;
          break;
        }
      }
    }

    if (found) {
      const effectiveWeight = weight * (isRequired ? 2 : 1);
      matchingWeight += effectiveWeight;
      if (isRequired) {
        requiredMatchingWeight += weight * 2;
      }
      matchedKeywords.push(kw.keyword);
    } else {
      missingKeywords.push(kw.keyword);
    }
  });

  const baseScore = totalWeight > 0 ? (matchingWeight / totalWeight) * 40 : 0;
  
  let bonus = 0;
  if (requiredTotalWeight > 0) {
    const requiredMatchPercentage = (requiredMatchingWeight / requiredTotalWeight) * 100;
    if (requiredMatchPercentage >= 90) {
      bonus = 8; // Increased from 5 to 8
    } else if (requiredMatchPercentage >= 75) {
      bonus = 4; // New tier for 75-90%
    }
  }

  const finalScore = Math.min(40, baseScore + bonus);
  const matchCount = matchedKeywords.length;
  const totalCount = technicalKeywords.length;
  const requiredCount = technicalKeywords.filter(kw => kw.isRequired).length;
  const requiredMatchCount = technicalKeywords.filter(
    kw => kw.isRequired && matchedKeywords.includes(kw.keyword)
  ).length;

  const details = `${matchCount}/${totalCount} technical skills found${requiredCount > 0 ? ` (${requiredMatchCount}/${requiredCount} required)` : ''}`;

  return {
    score: Math.round(finalScore * 100) / 100,
    details,
  };
}

function calculateExperienceRelevance(
  resumeContent: ReturnType<typeof extractResumeContent>,
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
    score += Math.min(10, quantifiedMatches.length * 2);
    details.push(`${quantifiedMatches.length} quantified achievements`);
  }

  const actionVerbMatches = Array.from(experience.matchAll(/\b(\w+ed|\w+ing)\b/gi))
    .filter(match => ACTION_VERBS.has(match[1]?.toLowerCase() || ''))
    .length;
  if (actionVerbMatches > 0) {
    score += Math.min(8, actionVerbMatches);
    details.push(`${actionVerbMatches} action verbs`);
  }

  const jdTitle = extractJobTitleFromJD(jobDescription);
  const resumeTitle = normalizeTextForATS(resumeContent.sections.find(s => s.type === 'experience')?.title || '').toLowerCase();
  if (jdTitle && resumeTitle) {
    const titleSimilarity = calculateTitleSimilarity(jdTitle, resumeTitle);
    if (titleSimilarity > 0.5) {
      score += 7;
      details.push('Job title similarity');
    }
  }

  const jdKeywords = extractIndustryKeywords(jobDescription);
  const industryMatches = jdKeywords.filter(kw => 
    new RegExp(`\\b${escapeRegExp(kw)}\\b`, 'i').test(experience)
  ).length;
  if (industryMatches > 0) {
    score += Math.min(5, industryMatches);
    details.push(`${industryMatches} industry keywords`);
  }

  return {
    score: Math.min(30, Math.round(score * 100) / 100),
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
  keywordMappings: KeywordSectionMapping[]
): { score: number; details: string } {
  const totalKeywords = matchingKeywords.length + missingKeywords.length;
  if (totalKeywords === 0) {
    return { score: 0, details: 'No keywords provided' };
  }

  const coverage = (matchingKeywords.length / totalKeywords) * 100;

  const sectionWeights: Record<string, number> = {
    skills: 1.0,
    experience: 0.9,
    summary: 0.6, // Balanced weight with 5-keyword cap to prevent excessive summary impact
    education: 0.4,
    projects: 0.4,
  };

  // Cap summary keywords to prevent over-weighting from summary-only keyword additions
  // Increased from 5 to 20 to allow more keywords from summary to contribute
  const MAX_SUMMARY_KEYWORDS = 20;
  const summaryKeywordMappings = keywordMappings.filter(m => m.section === 'summary');
  const otherMappings = keywordMappings.filter(m => m.section !== 'summary');
  
  // Track unique keywords in summary and limit to first 5
  const summaryKeywordsSeen = new Set<string>();
  const cappedSummaryMappings: KeywordSectionMapping[] = [];
  
  for (const mapping of summaryKeywordMappings) {
    const keywordLower = mapping.keyword.toLowerCase();
    if (summaryKeywordsSeen.size < MAX_SUMMARY_KEYWORDS && !summaryKeywordsSeen.has(keywordLower)) {
      summaryKeywordsSeen.add(keywordLower);
      cappedSummaryMappings.push(mapping);
    }
  }
  
  // Combine capped summary mappings with other section mappings
  const processedMappings = [...cappedSummaryMappings, ...otherMappings];

  let weightedScore = 0;
  let totalWeight = 0;

  processedMappings.forEach((mapping) => {
    const sectionWeight = sectionWeights[mapping.section] || 0.5;
    const keywordWeight = matchingKeywords.find(kw => 
      kw.keyword.toLowerCase() === mapping.keyword.toLowerCase()
    )?.weight || 5;
    
    // Cap occurrences per section to prevent over-weighting (increased from 3 to 5)
    const cappedOccurrences = Math.min(mapping.occurrences, 5);
    
    // Calculate base contribution
    const contribution = sectionWeight * keywordWeight * cappedOccurrences;
    weightedScore += contribution;
    totalWeight += keywordWeight;
  });

  const keywordOccurrences = new Map<string, number>();
  processedMappings.forEach(mapping => {
    const current = keywordOccurrences.get(mapping.keyword) || 0;
    keywordOccurrences.set(mapping.keyword, current + mapping.occurrences);
  });

  // Removed keyword stuffing penalty - allow natural keyword usage
  // Only penalize extreme cases (50+ occurrences) to prevent abuse
  let stuffingPenalty = 0;
  keywordOccurrences.forEach((count, keyword) => {
    // Only penalize extreme keyword stuffing (50+ occurrences)
    if (count > 50) {
      stuffingPenalty += (count - 50) * 0.05; // Very minimal penalty for extreme cases
    }
  });

  // Calculate base score with improved keyword contribution
  // Increased max from 27 to 40 to allow higher scores with more keywords
  const baseScore = totalWeight > 0 ? (weightedScore / totalWeight) * 40 : 0;
  
  // Apply bonus for keyword occurrences - each occurrence contributes meaningfully
  // Calculate bonus based on total occurrences
  const totalKeywordOccurrences = processedMappings.reduce((sum, m) => sum + Math.min(m.occurrences, 5), 0);
  
  // Each occurrence should contribute 2-5 points to total score
  // Keyword coverage max is 40, so to get 2-5 points per occurrence:
  // (bonus / 40) * 100 = 2-5 points → bonus = (2-5) * 40 / 100 = 0.8 - 2.0
  const minBonusPerOccurrence = 0.8; // Minimum: ~2 points in total score
  const maxBonusPerOccurrence = 2.0; // Maximum: ~5 points in total score
  
  // Calculate bonus: ensure at least 2 points per occurrence, but cap at 5 points
  // Use a progressive bonus: start with minimum, but allow up to maximum based on keyword weight
  const baseBonus = totalKeywordOccurrences * minBonusPerOccurrence;
  const maxPossibleBonus = totalKeywordOccurrences * maxBonusPerOccurrence;
  
  // If base score is low, use minimum bonus. If base score is higher, allow more bonus
  // This ensures each occurrence contributes meaningfully while preventing over-scoring
  const bonusToAdd = Math.min(
    maxPossibleBonus,
    Math.max(baseBonus, baseScore * 0.20) // At least minimum bonus, or 20% of base score
  );
  
  // Apply minimal stuffing penalty (only for extreme cases)
  let finalScore = Math.max(0, baseScore - stuffingPenalty);
  
  // Add bonus (ensures minimum 2 points per occurrence, max 5 points)
  finalScore = finalScore + bonusToAdd;
  
  // Cap keyword coverage score at 40 (increased from 27)
  finalScore = Math.min(40, finalScore);

  return {
    score: Math.round(finalScore * 100) / 100,
    details: `${Math.round(coverage)}% keyword match`,
  };
}

function calculateEducationAndCertifications(
  resumeContent: ReturnType<typeof extractResumeContent>,
  jobDescription: string,
  resumeData?: any
): { score: number; details: string } {
  let educationScore = 0;
  let certScore = 0;
  const details: string[] = [];

  const jdLower = jobDescription.toLowerCase();
  const degreePatterns = [
    /\b(bachelor|b\.?s\.?|b\.?a\.?|master|m\.?s\.?|m\.?a\.?|ph\.?d|doctorate)\b/gi,
    /\b(degree|diploma|certification)\b/gi,
  ];

  // Patterns to detect schools/universities
  const schoolPatterns = [
    /\b(university|college|school|institute|academy)\b/gi,
  ];

  const hasDegreeRequirement = degreePatterns.some(pattern => pattern.test(jdLower));
  
  // Count number of education bullet points (school entries)
  let schoolBulletCount = 0;
  if (resumeData?.sections && Array.isArray(resumeData.sections)) {
    resumeData.sections.forEach((section: any) => {
      const sectionTitle = (section.title || '').toLowerCase();
      if (sectionTitle.includes('education') || sectionTitle.includes('academic')) {
        if (section.bullets && Array.isArray(section.bullets)) {
          // Count visible bullets that contain school-related content
          section.bullets
            .filter((bullet: any) => bullet?.params?.visible !== false && bullet?.text)
            .forEach((bullet: any) => {
              const bulletText = normalizeTextForATS(bullet.text || '').toLowerCase();
              // Check if bullet contains school/university keywords or is substantial content
              const hasSchoolKeyword = schoolPatterns.some(pattern => pattern.test(bulletText));
              const hasSubstantialContent = bulletText.trim().length > 5; // At least 5 chars
              
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
    
    // Give 3 points per school bullet point (minimum)
    if (schoolBulletCount > 0) {
      const baseScore = schoolBulletCount * 3;
      educationScore = baseScore;
      details.push(`${schoolBulletCount} school entr${schoolBulletCount === 1 ? 'y' : 'ies'} found (${baseScore} points)`);
      
      // Add bonus for degree keywords
      if (hasDegree) {
        educationScore += 2;
        details.push('Degree keywords detected (+2 bonus)');
      }
      
      // Cap at 10 points max (education section max)
      educationScore = Math.min(10, educationScore);
    } else {
      // Fallback to old logic if no bullets counted
      if (hasDegreeRequirement) {
        if (hasDegree) {
          educationScore = 8;
          details.push('Degree requirement met');
        } else if (hasSchool && educationLength > 20) {
          educationScore = 5;
          details.push('Education content found (degree keywords not detected)');
        } else if (educationLength > 10) {
          educationScore = 2;
          details.push('Limited education information');
        }
      } else {
        if (hasDegree) {
          educationScore = 6;
          details.push('Degree information present');
        } else if (hasSchool && educationLength > 20) {
          educationScore = 5;
          details.push('Education section with school information');
        } else if (educationLength > 10) {
          educationScore = 3;
          details.push('Education section present');
        } else if (educationLength > 0) {
          educationScore = 1;
          details.push('Minimal education information');
        }
      }
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
        certScore = 4;
        details.push('Relevant certifications found');
      }
    } else {
      certScore = 2;
      details.push('Certifications section present');
    }
  }

  return {
    score: Math.round((educationScore + certScore) * 100) / 100,
    details: details.join(', ') || 'No education/certifications data',
  };
}

function calculateATSCompatibility(
  resumeContent: ReturnType<typeof extractResumeContent>
): { score: number; details: string } {
  let score = 0;
  const details: string[] = [];

  const sectionTitles = resumeContent.sections.map(s => s.title.toLowerCase());
  const foundHeaders = STANDARD_SECTION_HEADERS.filter(header =>
    sectionTitles.some(title => title.includes(header))
  );

  if (foundHeaders.length >= 3) {
    score = 5;
    details.push('Standard section headers found');
  } else if (foundHeaders.length > 0) {
    score = 2;
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
  resumeContent: ReturnType<typeof extractResumeContent>
): string[] {
  const recommendations: string[] = [];

  const missingTechnical = technicalKeywords.filter(kw => {
    const pattern = new RegExp(
      /[\/\-_]/g.test(kw.keyword) 
        ? escapeRegExp(kw.keyword)
        : `\\b${escapeRegExp(kw.keyword)}\\b`,
      'i'
    );
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

export function calculateEnhancedATSScore(
  resumeData: ResumeData,
  jobDescription: string,
  extensionData?: ExtensionKeywordData
): EnhancedATSScoreResult {
  const normalizedData = normalizeExtensionData(extensionData);
  const resumeContent = extractResumeContent(resumeData);
  const keywordMappings = mapKeywordsToSections(
    [...normalizedData.matchingKeywords, ...normalizedData.missingKeywords],
    resumeContent
  );

  const skillsMatch = calculateSkillsMatch(normalizedData.technicalKeywords, resumeContent);
  const experienceRelevance = calculateExperienceRelevance(resumeContent, jobDescription);
  const keywordCoverage = calculateKeywordCoverage(
    normalizedData.matchingKeywords,
    normalizedData.missingKeywords,
    keywordMappings
  );
  const education = calculateEducationAndCertifications(resumeContent, jobDescription, resumeData);
  const atsCompatibility = calculateATSCompatibility(resumeContent);

  // Calculate scores from other categories (non-keyword contributions)
  const nonKeywordScore = Math.round(
    skillsMatch.score +
    experienceRelevance.score +
    education.score +
    atsCompatibility.score
  );

  // Allow keyword coverage to contribute fully - no artificial cap
  // Scores can reach 100 with strong keyword matching
  const cappedKeywordScore = keywordCoverage.score;

  const totalScore = Math.round(
    nonKeywordScore + cappedKeywordScore
  );

  const recommendations = generateRecommendations(
    normalizedData.technicalKeywords,
    normalizedData.missingKeywords,
    resumeContent
  );

  // Total score can go up to 100, but keyword improvements are capped at 95
  return {
    totalScore: Math.min(100, Math.max(0, totalScore)),
    breakdown: {
      skillsMatch: { ...skillsMatch, max: 40 },
      experienceRelevance: { ...experienceRelevance, max: 30 },
      keywordCoverage: { ...keywordCoverage, max: 40 },
      education: { ...education, max: 10 },
      atsCompatibility: { ...atsCompatibility, max: 5 },
    },
    recommendations,
    matchLevel: getMatchLevel(totalScore),
  };
}

