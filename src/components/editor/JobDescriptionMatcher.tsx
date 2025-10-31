'use client';

import React, { useState, useEffect } from 'react';
import config from '@/lib/config';
import { useAuth } from '@/contexts/AuthContext';

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

// Helper functions to extract metadata (same as extension)
const extractJobType = (text: string, location: string = ''): string | null => {
  if (!text) return null;
  const lowerText = ((text || '') + ' ' + (location || '')).toLowerCase();
  if (/full.?time|ft\b|permanent/i.test(lowerText) && !/contract/i.test(lowerText)) return 'Full-time';
  if (/contract|contractor|contract-to-hire|temporary/i.test(lowerText)) return 'Contract';
  if (/part.?time|pt\b/i.test(lowerText)) return 'Part-time';
  if (/intern|internship/i.test(lowerText)) return 'Internship';
  return 'Full-time';
};

const extractRemoteStatus = (text: string, location: string = ''): string | null => {
  if (!text) return null;
  const lowerText = ((text || '') + ' ' + (location || '')).toLowerCase();
  if (/remote|work from home|wfh|fully remote/i.test(lowerText) && !/hybrid/i.test(lowerText)) return 'Remote';
  if (/hybrid|partially remote/i.test(lowerText)) return 'Hybrid';
  if (/on.?site|on.?premise|office/i.test(lowerText) && !/remote/i.test(lowerText)) return 'On-site';
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

interface JobMetadata {
  title?: string;
  company?: string;
  jobType?: string | null;
  remoteStatus?: string | null;
  location?: string;
  budget?: string | null;
  skills?: string[];
  keywords?: string[];
}

export default function JobDescriptionMatcher({ resumeData, onMatchResult, onResumeUpdate, onClose, standalone = true, initialJobDescription, onSelectJobDescriptionId, currentJobDescriptionId }: JobDescriptionMatcherProps) {
  const { user, isAuthenticated } = useAuth();
  const [jobDescription, setJobDescription] = useState(initialJobDescription || '');
  const [selectedJobMetadata, setSelectedJobMetadata] = useState<JobMetadata | null>(null);
  useEffect(() => {
    if (initialJobDescription) setJobDescription(initialJobDescription);
  }, [initialJobDescription]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [matchResult, setMatchResult] = useState<JobMatchResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [savedJDs, setSavedJDs] = useState<Array<{id:number,title:string,company?:string,created_at?:string}>>([]);
  const [isLoadingSaved, setIsLoadingSaved] = useState(false);
  const [showImprovementsModal, setShowImprovementsModal] = useState(false);
  const [pendingImprovements, setPendingImprovements] = useState<ImprovementSuggestion[]>([]);
  const [isApplying, setIsApplying] = useState(false);

  useEffect(() => {
    const load = async () => {
      setIsLoadingSaved(true);
      try {
        const res = await fetch(`${config.apiBase}/api/job-descriptions`);
        if (res.ok) {
          const items = await res.json();
          const list = Array.isArray(items) ? items : Array.isArray(items?.results) ? items.results : [];
          setSavedJDs(list);
        } else {
          setSavedJDs([]);
        }
      } catch (_) { setSavedJDs([]); }
      setIsLoadingSaved(false);
    };
    load();
  }, []);

  const analyzeMatch = async () => {
    if (!jobDescription.trim()) {
      setError('Please enter a job description');
      return;
    }

    setIsAnalyzing(true);
    setError(null);

    try {
      const response = await fetch(`${config.apiBase}/api/ai/match_job_description`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          job_description: jobDescription,
          resume_data: resumeData
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      setMatchResult(result);
      if (onMatchResult) {
        onMatchResult(result);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to analyze job match');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const parseSuggestionText = (text: string): string => {
    if (!text) return '';
    // Remove JSON code blocks and markers
    let cleaned = text
      .replace(/```json\s*/g, '')
      .replace(/```\s*/g, '')
      .replace(/^\[/g, '')
      .replace(/\]$/g, '')
      .replace(/^\{/g, '')
      .replace(/\}$/g, '')
      .replace(/["']category["']:\s*["']([^"']+)["']/g, '')
      .replace(/["']suggestion["']:\s*["']([^"']+)["']/g, '$1')
      .replace(/\\n/g, ' ')
      .trim();
    
    // If it's still JSON-like, try to extract the suggestion field
    try {
      const parsed = JSON.parse(text);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed[0].suggestion || parsed[0].description || text;
      }
      if (typeof parsed === 'object' && parsed.suggestion) {
        return parsed.suggestion;
      }
    } catch {
      // Not JSON, use cleaned text
    }
    
    // Extract text between quotes if it looks like JSON
    const quoteMatch = cleaned.match(/["']([^"']+)["']/);
    if (quoteMatch) {
      return quoteMatch[1];
    }
    
    return cleaned || text;
  };

  const applyImprovementsToResume = async (improvements: ImprovementSuggestion[]) => {
    setIsApplying(true);
    try {
      const response = await fetch(`${config.apiBase}/api/ai/improve_ats_score`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          resume_data: resumeData,
          job_description: jobDescription,
          target_role: '',
          industry: ''
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      console.log('Improvement result:', result);
      
      if (result.success && result.improved_resume) {
        // Ensure improved_resume has the correct structure
        const improvedResume = result.improved_resume;
        
        // Verify structure matches frontend expectations
        if (!improvedResume.sections || !Array.isArray(improvedResume.sections)) {
          console.error('Invalid improved_resume structure:', improvedResume);
          throw new Error('Received invalid resume structure from backend');
        }
        
        // Update resume data with improved resume structure
        if (onResumeUpdate) {
          onResumeUpdate(improvedResume);
        }
        
        // Update match result to reflect applied improvements
        if (onMatchResult && matchResult) {
          onMatchResult({
            ...matchResult,
            applied_improvements: result.applied_improvements || improvements,
            score_improvement: result.score_improvement || 0
          });
        }
        
        setShowImprovementsModal(false);
        setPendingImprovements([]);
        
        const scoreMsg = result.score_improvement ? ` ATS score improved by +${result.score_improvement} points!` : '';
        alert(`✨ Improvements applied successfully! Your resume has been updated.${scoreMsg}`);
      } else {
        throw new Error(result.error || 'Failed to apply improvements');
      }
    } catch (error) {
      console.error('Error applying improvements:', error);
      alert('Failed to apply improvements: ' + (error instanceof Error ? error.message : 'Unknown error'));
    } finally {
      setIsApplying(false);
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

  const content = (
    <div className="p-6 overflow-y-auto max-h-[calc(90vh-80px)]">
          <div className="mb-6">
            <p className="text-gray-600 text-sm">
              Paste a job description to see how well your resume matches and get improvement suggestions.
            </p>
          </div>

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
                    <span className="text-gray-700">{selectedJobMetadata.remoteStatus}</span>
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
              {selectedJobMetadata.keywords && selectedJobMetadata.keywords.length > 0 && (
                <div>
                  <div className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2">📊 Top Keywords</div>
                  <div className="flex flex-wrap gap-2">
                    {selectedJobMetadata.keywords.map((keyword, idx) => (
                      <span key={idx} className="px-2.5 py-1 rounded-full text-xs font-medium bg-gradient-to-r from-purple-500 to-purple-600 text-white">
                        {keyword}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column: Saved Jobs & Job Description Input */}
        <div className="space-y-4">
          {/* Saved Jobs (Top) */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-gray-700">Saved Jobs</label>
              <button
                onClick={async () => {
                  setIsLoadingSaved(true);
                  try {
                    const res = await fetch(`${config.apiBase}/api/job-descriptions`);
                    if (res.ok) {
                      const items = await res.json();
                      const list = Array.isArray(items) ? items : Array.isArray(items?.results) ? items.results : [];
                      setSavedJDs(list);
                    } else {
                      setSavedJDs([]);
                    }
                  } catch (_) { setSavedJDs([]); }
                  setIsLoadingSaved(false);
                }}
                className="text-xs text-blue-600 hover:underline"
              >
                Refresh
              </button>
            </div>
            {isLoadingSaved ? (
              <div className="p-3 text-sm text-gray-500 border rounded-md">Loading…</div>
            ) : savedJDs.length === 0 ? (
              <div className="p-3 text-sm text-gray-500 border rounded-md">No saved job descriptions yet.</div>
            ) : (
              <div className="border rounded-md max-h-48 overflow-y-auto">
                <ul className="divide-y">
                  {savedJDs.map((jd) => (
                    <li key={jd.id}>
                      <button
                        className="w-full text-left p-3 hover:bg-gray-50 text-sm"
                        onClick={async () => {
                          try {
                            const res = await fetch(`${config.apiBase}/api/job-descriptions/${jd.id}`);
                            if (res.ok) {
                              const full = await res.json();
                              if (full && full.content) {
                                setJobDescription(full.content);
                                
                                const location = '';
                                const metadata: JobMetadata = {
                                  title: full.title,
                                  company: full.company,
                                  jobType: extractJobType(full.content, location),
                                  remoteStatus: extractRemoteStatus(full.content, location),
                                  location: location,
                                  budget: extractBudget(full.content),
                                  keywords: extractTopKeywords(full.content),
                                  skills: extractSkills(full.content),
                                };
                                setSelectedJobMetadata(metadata);
                              }
                              if (onSelectJobDescriptionId) onSelectJobDescriptionId(jd.id)
                            }
                          } catch (_) {}
                        }}
                      >
                        <div className="text-sm font-semibold text-gray-800 line-clamp-1">{jd.title}</div>
                        {jd.company && <div className="text-xs text-gray-500">{jd.company}</div>}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* Job Description Input */}
          <div>
            <label htmlFor="job-description" className="block text-sm font-medium text-gray-700 mb-2">
              Job Description
            </label>
            <textarea
              id="job-description"
              value={jobDescription}
              onChange={(e) => {
                setJobDescription(e.target.value);
                // Extract metadata when user types
                if (e.target.value.trim()) {
                  const location = '';
                  const metadata: JobMetadata = {
                    title: undefined,
                    company: undefined,
                    jobType: extractJobType(e.target.value, location),
                    remoteStatus: extractRemoteStatus(e.target.value, location),
                    location: location,
                    budget: extractBudget(e.target.value),
                    keywords: extractTopKeywords(e.target.value),
                    skills: extractSkills(e.target.value),
                  };
                  setSelectedJobMetadata(metadata);
                } else {
                  setSelectedJobMetadata(null);
                }
              }}
              placeholder="Paste the job description here..."
              className="w-full h-96 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
            />
          </div>

          {/* Analyze Button */}
          <div>
            <button
              onClick={analyzeMatch}
              disabled={isAnalyzing || !jobDescription.trim()}
              className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
            >
              {isAnalyzing ? 'Analyzing...' : 'Analyze Match'}
            </button>
          </div>

          {error && (
            <div className="p-3 bg-red-100 border border-red-400 text-red-700 rounded text-sm">
              {error}
            </div>
          )}
        </div>

        {/* Right Column: Metadata Graphics */}
        <div className="space-y-4">
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
                    <div className="flex items-center gap-2 mb-4">
                      <span className="text-lg">🏢</span>
                      <span className="text-base font-semibold text-gray-700">{selectedJobMetadata.company}</span>
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
                      <span className="text-xs font-semibold text-gray-600 uppercase">Location</span>
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

              {/* Match Results (if available) */}
              {matchResult ? (
            <div className="space-y-6">
              {/* Overall Score + Gauge */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h4 className="text-lg font-semibold text-gray-900 mb-3">Match Analysis</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="text-center">
                <div className="relative inline-block">
                  <svg viewBox="0 0 36 36" className="w-20 h-20">
                    <path className="text-gray-200" stroke="currentColor" strokeWidth="4" fill="none" d="M18 2 a 16 16 0 1 1 0 32 a 16 16 0 1 1 0 -32" />
                    <path className={`${getScoreColor(matchResult.match_analysis.similarity_score).replace('text-','stroke-')}`} strokeLinecap="round" strokeWidth="4" fill="none"
                      strokeDasharray={`${Math.max(0, Math.min(100, matchResult.match_analysis.similarity_score))}, 100`} d="M18 2 a 16 16 0 1 1 0 32 a 16 16 0 1 1 0 -32" />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className={`text-xl font-bold ${getScoreColor(matchResult.match_analysis.similarity_score)}`}>{matchResult.match_analysis.similarity_score}%</span>
                  </div>
                </div>
                <p className="text-sm text-gray-600 mt-2">Overall Match</p>
                <p className="text-xs text-gray-500">{matchResult.analysis_summary.overall_match}</p>
              </div>
              <div className="text-center">
                <div className={`inline-flex items-center justify-center w-16 h-16 rounded-full ${getScoreBgColor(matchResult.match_analysis.technical_score)}`}>
                  <span className={`text-2xl font-bold ${getScoreColor(matchResult.match_analysis.technical_score)}`}>
                    {matchResult.match_analysis.technical_score}%
                  </span>
                </div>
                <p className="text-sm text-gray-600 mt-2">Technical Match</p>
                <p className="text-xs text-gray-500">{matchResult.analysis_summary.technical_match}</p>
              </div>
            </div>
          </div>

          {/* Matching Keywords (priority chips shown if available) */}
          {matchResult.match_analysis.matching_keywords.length > 0 && (
            <div>
              <h4 className="text-lg font-semibold text-gray-900 mb-3">
                Matching Keywords ({matchResult.match_analysis.match_count})
              </h4>
              <div className="flex flex-wrap gap-2">
                {matchResult.match_analysis.matching_keywords.map((keyword, index) => (
                  <span
                    key={index}
                    className={`px-3 py-1 text-sm rounded-full ${ (matchResult as any).priority_keywords?.includes?.(keyword) ? 'bg-purple-100 text-purple-800 border border-purple-200' : 'bg-green-100 text-green-800'}`}
                  >
                    {keyword}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Missing Keywords */}
          {matchResult.match_analysis.missing_keywords.length > 0 && (
            <div>
              <h4 className="text-lg font-semibold text-gray-900 mb-3">
                Missing Keywords ({matchResult.match_analysis.missing_count})
              </h4>
              <div className="flex flex-wrap gap-2">
                {matchResult.match_analysis.missing_keywords.map((keyword, index) => (
                  <span
                    key={index}
                    className={`px-3 py-1 text-sm rounded-full ${ (matchResult as any).priority_keywords?.includes?.(keyword) ? 'bg-red-100 text-red-800 border border-red-300' : 'bg-orange-50 text-orange-800 border border-orange-200'}`}
                  >
                    {keyword}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Improvement Suggestions */}
          {matchResult.improvement_suggestions.length > 0 && (
            <div>
              <h4 className="text-lg font-semibold text-gray-900 mb-3">
                💡 Improvement Suggestions
              </h4>
              <div className="space-y-3">
                {matchResult.improvement_suggestions.map((suggestion, index) => {
                  const cleanedSuggestion = parseSuggestionText(suggestion.suggestion);
                  return (
                    <div key={index} className="bg-gradient-to-r from-blue-50 to-indigo-50 border-l-4 border-blue-500 rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow">
                      <div className="flex items-start gap-3">
                        <div className="flex-shrink-0 w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-bold">
                          {index + 1}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-semibold">
                              {suggestion.category || 'General'}
                            </span>
                          </div>
                          <p className="text-sm text-gray-800 leading-relaxed">{cleanedSuggestion}</p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

              {/* Technical Skills Analysis */}
              <div className="grid grid-cols-1 gap-4">
                {matchResult.match_analysis.technical_matches.length > 0 && (
                  <div>
                    <h5 className="font-semibold text-gray-900 mb-2 text-sm">Technical Skills Match</h5>
                    <div className="flex flex-wrap gap-1">
                      {matchResult.match_analysis.technical_matches.map((skill, index) => (
                        <span
                          key={index}
                          className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded"
                        >
                          {skill}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {matchResult.match_analysis.technical_missing.length > 0 && (
                  <div>
                    <h5 className="font-semibold text-gray-900 mb-2 text-sm">Missing Technical Skills</h5>
                    <div className="flex flex-wrap gap-1">
                      {matchResult.match_analysis.technical_missing.map((skill, index) => (
                        <span
                          key={index}
                          className="px-2 py-1 bg-red-100 text-red-700 text-xs rounded"
                        >
                          {skill}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Improve Resume & Save Buttons */}
              <div className="pt-4 border-t border-gray-200 space-y-3">
            <button
              onClick={async () => {
                if (!jobDescription.trim()) {
                  alert('Please enter a job description first');
                  return;
                }
                setIsApplying(true);
                try {
                  await applyImprovementsToResume(matchResult.improvement_suggestions || []);
                } catch (error) {
                  console.error('Failed to improve resume:', error);
                  alert('Failed to improve resume. Please try again.');
                } finally {
                  setIsApplying(false);
                }
              }}
              disabled={isApplying || !jobDescription.trim()}
              className="w-full bg-gradient-to-r from-purple-600 to-blue-600 text-white py-3 px-6 rounded-lg hover:from-purple-700 hover:to-blue-700 disabled:from-gray-400 disabled:to-gray-400 disabled:cursor-not-allowed transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 flex items-center justify-center space-x-2"
            >
              {isApplying ? (
                <>
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <span>Generating Improvements...</span>
                </>
              ) : (
                <>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  <span>Improve My Resume for This Job</span>
                </>
              )}
            </button>
            
            {matchResult && currentJobDescriptionId && (
              <button
                onClick={async () => {
                  if (!currentJobDescriptionId) {
                    alert('Please select a job description first');
                    return;
                  }
                  
                  try {
                    // Get user email from auth context
                    if (!isAuthenticated || !user?.email) {
                      alert('Please sign in to save resumes to your profile');
                      return;
                    }
                    
                    const userEmail = user.email;
                    
                    // Save resume version
                    const saveRes = await fetch(`${config.apiBase}/api/resume/save?user_email=${encodeURIComponent(userEmail)}`, {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        name: resumeData.name,
                        title: resumeData.title,
                        email: resumeData.email,
                        phone: resumeData.phone,
                        location: resumeData.location,
                        summary: resumeData.summary,
                        template: 'tech', // Default template
                        sections: resumeData.sections || []
                      })
                    });
                    
                    if (!saveRes.ok) throw new Error('Failed to save resume');
                    
                    const saveData = await saveRes.json();
                    
                    // Create match session
                    await fetch(`${config.apiBase}/api/matches`, {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        resumeId: saveData.resume_id,
                        jobDescriptionId: currentJobDescriptionId,
                        user_email: userEmail,
                        resume_name: resumeData.name,
                        resume_title: resumeData.title,
                        resume_snapshot: resumeData,
                        resume_version_id: saveData.version_id
                      })
                    });
                    
                    alert(`✅ Resume saved to Profile/Jobs with match score: ${matchResult.match_analysis.similarity_score}%`);
                  } catch (error) {
                    console.error('Failed to save to jobs:', error);
                    alert('Failed to save resume to jobs. Please try again.');
                  }
                }}
                className="w-full bg-green-600 text-white py-2 px-4 rounded-lg hover:bg-green-700 transition-colors flex items-center justify-center space-x-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span>Save to Profile/Jobs</span>
              </button>
            )}
          </div>
                </div>
              ) : null}
            </div>
          ) : (
            <div className="bg-gradient-to-r from-blue-50 to-purple-50 border-l-4 border-blue-500 rounded-lg p-8 text-center border-2 border-dashed border-gray-300">
              <div className="text-gray-400 mb-2 text-4xl">📋</div>
              <p className="text-sm text-gray-500 font-medium">Job metadata will appear here</p>
              <p className="text-xs text-gray-400 mt-1">Paste a job description to extract information</p>
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
      {/* Improvement Suggestions Modal */}
      {showImprovementsModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" onClick={() => setShowImprovementsModal(false)}>
          <div className="bg-white rounded-xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-gradient-to-r from-purple-600 to-blue-600">
              <h2 className="text-2xl font-bold text-white">✨ AI Improvement Suggestions</h2>
              <button
                onClick={() => setShowImprovementsModal(false)}
                className="text-white hover:text-gray-200 text-2xl font-bold"
              >
                ×
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-180px)]">
              <p className="text-gray-600 mb-4">Review the AI-powered improvements below. Click "Apply All Improvements" to update your resume.</p>
              
              <div className="space-y-4">
                {pendingImprovements.map((imp, index) => (
                  <div key={index} className="bg-gradient-to-r from-purple-50 to-blue-50 border-l-4 border-purple-500 rounded-lg p-4 shadow-sm">
                    <div className="flex items-start gap-3">
                      <div className="flex-shrink-0 w-8 h-8 bg-purple-600 text-white rounded-full flex items-center justify-center font-bold text-sm">
                        {index + 1}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="px-3 py-1 bg-purple-100 text-purple-800 rounded-full text-xs font-semibold">
                            {imp.category}
                          </span>
                        </div>
                        <p className="text-gray-800 leading-relaxed">{imp.suggestion}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            
            <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200 bg-gray-50">
              <button
                onClick={() => setShowImprovementsModal(false)}
                className="px-6 py-2 border-2 border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 font-semibold transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => applyImprovementsToResume(pendingImprovements)}
                disabled={isApplying}
                className="px-6 py-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg hover:from-purple-700 hover:to-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-semibold transition-all shadow-lg"
              >
                {isApplying ? (
                  <span className="flex items-center gap-2">
                    <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Applying...
                  </span>
                ) : (
                  'Apply All Improvements'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
