'use client';

import React, { useState } from 'react';

interface ImproveResumeButtonProps {
  jobDescription: string;
  resumeData: any;
  onImprovementGenerated?: (improvements: any) => void;
  className?: string;
}

export default function ImproveResumeButton({ 
  jobDescription, 
  resumeData, 
  onImprovementGenerated,
  className = ""
}: ImproveResumeButtonProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generateImprovements = async () => {
    if (!jobDescription.trim()) {
      setError('Please enter a job description first');
      return;
    }

    setIsGenerating(true);
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
      
      if (result.success && result.improvement_suggestions) {
        if (onImprovementGenerated) {
          onImprovementGenerated(result.improvement_suggestions);
        }
      } else {
        setError('No improvement suggestions available');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate improvements');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className={className}>
      <button
        onClick={generateImprovements}
        disabled={isGenerating || !jobDescription.trim()}
        className="w-full bg-gradient-to-r from-purple-600 to-blue-600 text-white py-3 px-6 rounded-lg hover:from-purple-700 hover:to-blue-700 disabled:from-gray-400 disabled:to-gray-400 disabled:cursor-not-allowed transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
      >
        <div className="flex items-center justify-center space-x-2">
          {isGenerating ? (
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
        </div>
      </button>

      {error && (
        <div className="mt-3 p-3 bg-red-100 border border-red-400 text-red-700 rounded-lg text-sm">
          {error}
        </div>
      )}
    </div>
  );
}
