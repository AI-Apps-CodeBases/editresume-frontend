export interface WeightedKeyword {
  keyword: string;
  weight: number;
  section?: string;
  isRequired?: boolean;
}

export interface ExtensionKeywordData {
  matchingKeywords?: Array<WeightedKeyword | string>;
  missingKeywords?: Array<WeightedKeyword | string>;
  technicalKeywords?: Array<WeightedKeyword | string>;
  generalKeywords?: Array<WeightedKeyword | string>;
  softSkills?: Array<WeightedKeyword | string>;
  priorityKeywords?: Array<WeightedKeyword | string>;
  highFrequencyKeywords?: Array<{
    keyword: string;
    frequency?: number;
    importance?: 'high' | 'medium' | 'low';
    weight?: number;
  }>;
}

export interface ResumeSection {
  id: string;
  title: string;
  bullets: Array<{
    id: string;
    text: string;
    params?: Record<string, any>;
  }>;
  params?: Record<string, any>;
}

export interface ResumeData {
  name?: string;
  title?: string;
  email?: string;
  phone?: string;
  location?: string;
  summary?: string;
  sections?: ResumeSection[];
}

export interface ScoreBreakdown {
  skillsMatch: {
    score: number;
    max: number;
    details: string;
  };
  experienceRelevance: {
    score: number;
    max: number;
    details: string;
  };
  keywordCoverage: {
    score: number;
    max: number;
    details: string;
  };
  education: {
    score: number;
    max: number;
    details: string;
  };
  atsCompatibility: {
    score: number;
    max: number;
    details: string;
  };
}

export type MatchLevel = 'Poor match' | 'Fair match' | 'Good match' | 'Excellent match' | 'Perfect match';

export interface EnhancedATSScoreResult {
  totalScore: number;
  breakdown: ScoreBreakdown;
  recommendations: string[];
  matchLevel: MatchLevel;
}

export interface LegacyATSScoreResult {
  score: number;
  matchedKeywords: string[];
  missingKeywords: string[];
  totalKeywords: number;
}

export interface KeywordSectionMapping {
  keyword: string;
  section: string;
  occurrences: number;
}

