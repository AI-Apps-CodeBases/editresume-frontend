'use client';

import React, { useState, useEffect } from 'react';
import ImproveResumeButton from './ImproveResumeButton';

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
  analysis_summary: {
    overall_match: string;
    technical_match: string;
  };
}

interface JobDescriptionMatcherProps {
  resumeData: any;
  onMatchResult?: (result: JobMatchResult) => void;
  onClose?: () => void;
  standalone?: boolean; // If true, renders with popup wrapper
}

export default function JobDescriptionMatcher({ resumeData, onMatchResult, onClose, standalone = true }: JobDescriptionMatcherProps) {
  const [jobDescription, setJobDescription] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [matchResult, setMatchResult] = useState<JobMatchResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const analyzeMatch = async () => {
    if (!jobDescription.trim()) {
      setError('Please enter a job description');
      return;
    }

    setIsAnalyzing(true);
    setError(null);

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:8000'}/api/ai/match_job_description`, {
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

      <div className="mb-4">
        <label htmlFor="job-description" className="block text-sm font-medium text-gray-700 mb-2">
          Job Description
        </label>
        <textarea
          id="job-description"
          value={jobDescription}
          onChange={(e) => setJobDescription(e.target.value)}
          placeholder="Paste the job description here... Example: 'We are looking for a DevOps Engineer with experience in AWS, Kubernetes, and CI/CD pipelines. The ideal candidate should have 3+ years of experience with infrastructure automation and monitoring tools.'"
          className="w-full h-32 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
        />
      </div>

      <button
        onClick={analyzeMatch}
        disabled={isAnalyzing || !jobDescription.trim()}
        className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
      >
        {isAnalyzing ? 'Analyzing...' : 'Analyze Match'}
      </button>

      {error && (
        <div className="mt-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
          {error}
        </div>
      )}

      {matchResult && (
        <div className="mt-6 space-y-6">
          {/* Overall Score */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h4 className="text-lg font-semibold text-gray-900 mb-3">Match Analysis</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="text-center">
                <div className={`inline-flex items-center justify-center w-16 h-16 rounded-full ${getScoreBgColor(matchResult.match_analysis.similarity_score)}`}>
                  <span className={`text-2xl font-bold ${getScoreColor(matchResult.match_analysis.similarity_score)}`}>
                    {matchResult.match_analysis.similarity_score}%
                  </span>
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

          {/* Matching Keywords */}
          {matchResult.match_analysis.matching_keywords.length > 0 && (
            <div>
              <h4 className="text-lg font-semibold text-gray-900 mb-3">
                Matching Keywords ({matchResult.match_analysis.match_count})
              </h4>
              <div className="flex flex-wrap gap-2">
                {matchResult.match_analysis.matching_keywords.map((keyword, index) => (
                  <span
                    key={index}
                    className="px-3 py-1 bg-green-100 text-green-800 text-sm rounded-full"
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
                    className="px-3 py-1 bg-red-100 text-red-800 text-sm rounded-full"
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
                Improvement Suggestions
              </h4>
              <div className="space-y-3">
                {matchResult.improvement_suggestions.map((suggestion, index) => (
                  <div key={index} className="bg-blue-50 border-l-4 border-blue-400 p-3">
                    <div className="flex">
                      <div className="ml-3">
                        <p className="text-sm text-blue-800">
                          <span className="font-medium">{suggestion.category}:</span> {suggestion.suggestion}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Technical Skills Analysis */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {matchResult.match_analysis.technical_matches.length > 0 && (
              <div>
                <h5 className="font-semibold text-gray-900 mb-2">Technical Skills Match</h5>
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
                <h5 className="font-semibold text-gray-900 mb-2">Missing Technical Skills</h5>
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

          {/* Improve Resume Button */}
          <div className="mt-6 pt-4 border-t border-gray-200">
            <ImproveResumeButton
              jobDescription={jobDescription}
              resumeData={resumeData}
              onImprovementGenerated={(improvements) => {
                console.log('Improvement suggestions:', improvements);
                // You can handle the improvements here, e.g., show them in a modal
              }}
              className="w-full"
            />
          </div>
        </div>
      )}
    </div>
  );

  if (standalone) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" onClick={onClose}>
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

  return content;
}
