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
  const [selectedKeywords, setSelectedKeywords] = useState<Set<string>>(new Set());
  const [showBulletGenerator, setShowBulletGenerator] = useState(false);
  const [isGeneratingBullets, setIsGeneratingBullets] = useState(false);
  const [selectedWorkExpSection, setSelectedWorkExpSection] = useState<string>('');
  const [bulletGeneratorCompany, setBulletGeneratorCompany] = useState<string>('');
  const [bulletGeneratorJobTitle, setBulletGeneratorJobTitle] = useState<string>('');
  const [generatedBullets, setGeneratedBullets] = useState<string[]>([]);
  const [showWorkExpSelector, setShowWorkExpSelector] = useState(false);
  const [workExpEntries, setWorkExpEntries] = useState<Array<{sectionId: string, bulletId: string, companyName: string, jobTitle: string, dateRange: string, sectionTitle: string, sectionType: 'work' | 'project'}>>([]);
  const [selectedBulletIndices, setSelectedBulletIndices] = useState<Set<number>>(new Set());
  const [bulletAssignments, setBulletAssignments] = useState<Map<number, string>>(new Map());
  const [showSaveNameModal, setShowSaveNameModal] = useState(false);
  const [resumeSaveName, setResumeSaveName] = useState('');
  const [updatedResumeData, setUpdatedResumeData] = useState<any>(null);
  const [currentJDInfo, setCurrentJDInfo] = useState<{company?: string, title?: string} | null>(null);

  const handleSaveResumeWithName = async () => {
    if (!resumeSaveName || !resumeSaveName.trim()) {
      alert('Please enter a resume name.');
      return;
    }

    if (!isAuthenticated || !user?.email) {
      alert('Please sign in to save resumes to your profile');
      return;
    }

    if (!updatedResumeData) {
      alert('No resume data to save');
      return;
    }

    try {
      const saveName = resumeSaveName.trim();
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
      const cleanedSections = (updatedResumeData.sections || []).map((section: any) => ({
        id: section.id,
        title: section.title,
        bullets: (section.bullets || []).map((bullet: any) => ({
          id: bullet.id,
          text: bullet.text,
          params: {} // Remove visible flag from params for API compatibility
        }))
      }));

      const payload = {
        name: saveName,
        title: updatedResumeData.title || '',
        email: updatedResumeData.email || '',
        phone: updatedResumeData.phone || '',
        location: updatedResumeData.location || '',
        summary: updatedResumeData.summary || '',
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

      // Create match session if we have a currentJobDescriptionId
      if (currentJobDescriptionId) {
        try {
          await fetch(`${apiBase}/api/matches`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              resumeId: result.resume_id,
              jobDescriptionId: currentJobDescriptionId,
              user_email: user.email,
              resume_name: saveName,
              resume_title: updatedResumeData.title || '',
              resume_snapshot: updatedResumeData,
              resume_version_id: result.version_id
            })
          });
          console.log('Match session created successfully');
        } catch (matchError) {
          console.error('Failed to create match session:', matchError);
          // Don't fail the save if match session creation fails
        }
      }

      // Clean up states
      setShowSaveNameModal(false);
      setResumeSaveName('');
      setUpdatedResumeData(null);
      setGeneratedBullets([]);
      setWorkExpEntries([]);
      setSelectedBulletIndices(new Set());
      setBulletAssignments(new Map());
      setSelectedKeywords(new Set());
      setSelectedWorkExpSection('');
      setBulletGeneratorCompany('');
      setBulletGeneratorJobTitle('');

      // Show appropriate success message
      const newVersionNumber = existingVersionCount + 1;
      const matchScoreText = matchResult ? ` (Match Score: ${matchResult.match_analysis.similarity_score}%)` : '';
      const successMessage = isExistingResume
        ? `✅ Resume "${saveName}" updated successfully!${matchScoreText}\n\nVersion ${newVersionNumber} created. Previous versions are preserved.\n\nWould you like to view it in your profile?`
        : `✅ Resume "${saveName}" saved successfully!${matchScoreText}\n\nWould you like to view it in your profile?`;

      const shouldNavigate = confirm(successMessage);
      if (shouldNavigate) {
        window.location.href = '/profile?tab=jobs';
      }
    } catch (error) {
      console.error('Failed to save resume:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      alert(`Failed to save resume: ${errorMessage}`);
    }
  };

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

  // Fetch JD info when currentJobDescriptionId changes
  useEffect(() => {
    const fetchJDInfo = async () => {
      if (currentJobDescriptionId) {
        try {
          const res = await fetch(`${config.apiBase}/api/job-descriptions/${currentJobDescriptionId}`);
          if (res.ok) {
            const jd = await res.json();
            setCurrentJDInfo({
              company: jd.company || '',
              title: jd.title || ''
            });
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
        title: resumeData.title || '',
        email: resumeData.email || '',
        phone: resumeData.phone || '',
        location: resumeData.location || '',
        summary: resumeData.summary || '',
        sections: resumeData.sections.map((section: any) => ({
          id: section.id,
          title: section.title,
          bullets: section.bullets.map((bullet: any) => ({
            id: bullet.id,
            text: bullet.text,
            params: {} // Remove visible flag from params for API compatibility
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
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      setMatchResult(result);
      setSelectedKeywords(new Set());
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
          resume_data: {
            name: resumeData.name || '',
            title: resumeData.title || '',
            email: resumeData.email || '',
            phone: resumeData.phone || '',
            location: resumeData.location || '',
            summary: resumeData.summary || '',
            sections: (resumeData.sections || []).map((section: any) => ({
              id: section.id,
              title: section.title,
              bullets: (section.bullets || []).map((bullet: any) => ({
                id: bullet.id,
                text: bullet.text,
                params: {}
              }))
            }))
          },
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

          {/* Analyze Button */}
          <div>
            <button
              onClick={analyzeMatch}
              disabled={isAnalyzing || !jobDescription.trim()}
              className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
            >
              {isAnalyzing ? 'Analyzing...' : 'Analyze Match'}
            </button>
            {!jobDescription.trim() && (
              <p className="text-sm text-gray-500 mt-2 text-center">
                Select a saved job description to analyze
              </p>
            )}
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
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-lg font-semibold text-gray-900">
                  Missing Keywords ({matchResult.match_analysis.missing_count})
                </h4>
                {selectedKeywords.size > 0 && (
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
                    className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    Create Bullets ({selectedKeywords.size})
                  </button>
                )}
              </div>
              <div className="flex flex-wrap gap-2">
                {matchResult.match_analysis.missing_keywords.map((keyword, index) => (
                  <label
                    key={index}
                    className={`px-3 py-1 text-sm rounded-full cursor-pointer border transition-all flex items-center gap-2 ${
                      selectedKeywords.has(keyword)
                        ? 'bg-blue-100 text-blue-800 border-blue-300'
                        : (matchResult as any).priority_keywords?.includes?.(keyword)
                        ? 'bg-red-100 text-red-800 border-red-300'
                        : 'bg-orange-50 text-orange-800 border-orange-200'
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
                      className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                    />
                    <span>{keyword}</span>
                  </label>
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
                onClick={() => {
                  if (!currentJobDescriptionId) {
                    alert('Please select a job description first');
                    return;
                  }
                  
                  if (!isAuthenticated || !user?.email) {
                    alert('Please sign in to save resumes to your profile');
                    return;
                  }

                  // Generate smart resume name based on JD
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

                  // Store current resume data and show save name modal
                  setUpdatedResumeData(resumeData);
                  setResumeSaveName(suggestedName);
                  setShowSaveNameModal(true);
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
                    const markedBullets: Array<{sectionId: string, bulletId: string, keyword: string}> = [];
                    
                    // Get all unmarked bullets (visible !== false means visible or undefined)
                    const allUnmarkedBullets: Array<{sectionId: string, bulletId: string, text: string}> = [];
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
                      const response = await fetch(`${config.apiBase}/api/ai/generate_bullets_from_keywords`, {
                        method: 'POST',
                        headers: {
                          'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({
                          keywords: Array.from(keywordsToGenerate),
                          job_description: jobDescription,
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
                      const entries: Array<{sectionId: string, bulletId: string, companyName: string, jobTitle: string, dateRange: string, sectionTitle: string, sectionType: 'work' | 'project'}> = [];
                      
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
                          const newBullets = generatedBulletsList.map((bulletText: string) => ({
                            id: `bullet-${Date.now()}-${Math.random()}`,
                            text: bulletText,
                            params: {}
                          }));

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
                            ? `✅ Marked ${markedBullets.length} existing bullet${markedBullets.length > 1 ? 's' : ''} and added ${generatedBulletsList.length} new bullet point${generatedBulletsList.length > 1 ? 's' : ''} to ${selectedSection.title}!`
                            : `✅ Successfully generated and added ${generatedBulletsList.length} bullet point${generatedBulletsList.length > 1 ? 's' : ''} to ${selectedSection.title}!`;
                          
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
                          setBulletAssignments(new Map());
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
                            setSelectedBulletIndices(new Set());
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
                              <span className="text-gray-800 text-sm">{bullet}</span>
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
                            <span className={`text-xs font-semibold px-2 py-1 rounded ${
                              entry.sectionType === 'project' 
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
                            onClick={() => {
                              const unassignedSelected = Array.from(selectedBulletIndices).filter(idx => !bulletAssignments.has(idx));
                              if (unassignedSelected.length === 0) {
                                alert('Please select at least one unassigned bullet point');
                                return;
                              }
                              
                              const newAssignments = new Map(bulletAssignments);
                              unassignedSelected.forEach(bulletIdx => {
                                newAssignments.set(bulletIdx, entryKey);
                              });
                              setBulletAssignments(newAssignments);
                              setSelectedBulletIndices(new Set());
                            }}
                            disabled={selectedBulletIndices.size === 0 || Array.from(selectedBulletIndices).every(idx => bulletAssignments.has(idx))}
                            className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            Assign Selected ({Array.from(selectedBulletIndices).filter(idx => !bulletAssignments.has(idx)).length})
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
            
            <div className="flex items-center justify-between p-6 border-t border-gray-200 bg-gray-50">
              <div className="text-sm text-gray-600">
                {bulletAssignments.size > 0 && (
                  <span>
                    {bulletAssignments.size} bullet{bulletAssignments.size > 1 ? 's' : ''} assigned
                    {generatedBullets.filter((_, idx) => !bulletAssignments.has(idx)).length > 0 && (
                      <span className="text-orange-600 ml-2">
                        ({generatedBullets.filter((_, idx) => !bulletAssignments.has(idx)).length} remaining)
                      </span>
                    )}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => {
                    setShowWorkExpSelector(false);
                    setGeneratedBullets([]);
                    setWorkExpEntries([]);
                    setSelectedBulletIndices(new Set());
                    setBulletAssignments(new Map());
                  }}
                  className="px-6 py-2 border-2 border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 font-semibold transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    if (bulletAssignments.size === 0) {
                      alert('Please assign at least one bullet point to a work experience or project entry');
                      return;
                    }
                    
                    const unassignedCount = generatedBullets.filter((_, idx) => !bulletAssignments.has(idx)).length;
                    if (unassignedCount > 0) {
                      const proceed = confirm(`${unassignedCount} bullet${unassignedCount > 1 ? 's' : ''} will not be added. Do you want to continue?`);
                      if (!proceed) return;
                    }

                    // Group bullets by work experience entry
                    const entriesByKey = new Map<string, {entry: typeof workExpEntries[0], bulletIndices: number[]}>();
                    
                    bulletAssignments.forEach((entryKey, bulletIdx) => {
                      if (!entriesByKey.has(entryKey)) {
                        const entry = workExpEntries.find(e => `${e.sectionId}-${e.bulletId}` === entryKey);
                        if (entry) {
                          entriesByKey.set(entryKey, { entry, bulletIndices: [] });
                        }
                      }
                      entriesByKey.get(entryKey)?.bulletIndices.push(bulletIdx);
                    });

                    // Update resume with all assignments
                    let updatedSections = [...resumeData.sections];
                    const assignmentResults: string[] = [];

                    entriesByKey.forEach(({ entry, bulletIndices }) => {
                      const selectedSection = updatedSections.find((s: any) => s.id === entry.sectionId);
                      if (!selectedSection) return;

                      // Find the index of the header bullet
                      const headerBulletIndex = selectedSection.bullets.findIndex((b: any) => b.id === entry.bulletId);
                      if (headerBulletIndex === -1) return;

                      // Find where to insert (after all bullets for this entry, before next header or end)
                      let insertIndex = headerBulletIndex + 1;
                      for (let i = headerBulletIndex + 1; i < selectedSection.bullets.length; i++) {
                        const bullet = selectedSection.bullets[i];
                        if (bullet.text?.startsWith('**') && bullet.text?.includes('**', 2)) {
                          insertIndex = i;
                          break;
                        }
                        insertIndex = i + 1;
                      }

                      // Create new bullet points for this entry
                      const newBullets = bulletIndices.map((bulletIdx: number) => ({
                        id: `bullet-${Date.now()}-${Math.random()}-${bulletIdx}`,
                        text: generatedBullets[bulletIdx].startsWith('•') 
                          ? generatedBullets[bulletIdx] 
                          : `• ${generatedBullets[bulletIdx]}`,
                        params: {}
                      }));

                      // Insert bullets at the correct position
                      selectedSection.bullets = [
                        ...selectedSection.bullets.slice(0, insertIndex),
                        ...newBullets,
                        ...selectedSection.bullets.slice(insertIndex)
                      ];

                      assignmentResults.push(`${bulletIndices.length} bullet${bulletIndices.length > 1 ? 's' : ''} to ${entry.companyName}`);
                    });

                    const updatedResume = {
                      ...resumeData,
                      sections: updatedSections
                    };

                    if (onResumeUpdate) {
                      onResumeUpdate(updatedResume);
                    }

                    // Generate smart resume name based on JD
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

                    // Store updated resume data and show save name modal
                    setUpdatedResumeData(updatedResume);
                    setResumeSaveName(suggestedName);
                    setShowWorkExpSelector(false);
                    setShowSaveNameModal(true);
                  }}
                  disabled={bulletAssignments.size === 0}
                  className="px-6 py-2 bg-gradient-to-r from-green-600 to-blue-600 text-white rounded-lg hover:from-green-700 hover:to-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-semibold transition-all shadow-lg"
                >
                  Save & Close ({bulletAssignments.size})
                </button>
              </div>
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
                  onClick={handleSaveResumeWithName}
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
                    setSelectedBulletIndices(new Set());
                    setBulletAssignments(new Map());
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
