'use client'
import { useState } from 'react'

interface ParsedJob {
  company: string
  role: string
  date: string
  bullets: string[]
}

interface ParsedSection {
  title: string
  content: string[]
  type: 'work' | 'project' | 'skill' | 'certificate' | 'education' | 'other'
}

interface AIResumeParserProps {
  onParseComplete: (jobs: ParsedJob[], sections: ParsedSection[]) => void
  isParsing: boolean
  setIsParsing: (parsing: boolean) => void
}

export default function AIResumeParser({ onParseComplete, isParsing, setIsParsing }: AIResumeParserProps) {
  const [resumeText, setResumeText] = useState('')
  const [parsingStep, setParsingStep] = useState('')

  const parseResumeWithAI = async () => {
    if (!resumeText.trim()) return

    setIsParsing(true)
    setParsingStep('Analyzing resume structure...')

    try {
      // Use the existing AI parsing endpoint
      setParsingStep('Sending to AI for analysis...')
      const response = await fetch('/api/resume/parse-text', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: resumeText
        })
      })
      
      if (!response.ok) {
        throw new Error('Failed to parse resume')
      }
      
      const result = await response.json()
      
      if (!result.success) {
        throw new Error(result.error || 'Parsing failed')
      }
      
      setParsingStep('Processing AI results...')
      
      // Convert the AI parsed data to our format
      const jobs: ParsedJob[] = []
      const otherSections: ParsedSection[] = []
      
      // Process work experience section
      const workSection = result.data.sections?.find((s: any) => 
        s.title.toLowerCase().includes('experience') || 
        s.title.toLowerCase().includes('work')
      )
      
      if (workSection) {
        let currentJob: ParsedJob | null = null
        
        for (const bullet of workSection.bullets) {
          // Check if this is a company header (starts with **)
          if (bullet.startsWith('**') && bullet.includes('**', 2)) {
            // Save previous job
            if (currentJob) {
              jobs.push(currentJob)
            }
            
            // Parse new job header
            const headerText = bullet.replace(/\*\*/g, '').trim()
            const parts = headerText.split(' / ')
            
            if (parts.length >= 3) {
              currentJob = {
                company: parts[0]?.trim() || 'Unknown Company',
                role: parts[1]?.trim() || 'Unknown Role',
                date: parts[2]?.trim() || '',
                bullets: []
              }
            }
          } else if (currentJob && bullet.startsWith('•')) {
            // Add bullet point to current job
            const bulletText = bullet.replace('•', '').trim()
            if (bulletText) {
              currentJob.bullets.push(bulletText)
            }
          }
        }
        
        // Add last job
        if (currentJob) {
          jobs.push(currentJob)
        }
      }
      
      // Process other sections
      for (const section of result.data.sections || []) {
        if (!section.title.toLowerCase().includes('experience') && 
            !section.title.toLowerCase().includes('work')) {
          
          otherSections.push({
            title: section.title,
            content: section.bullets.filter((b: string) => b.trim()),
            type: getSectionType(section.title)
          })
        }
      }
      
      setParsingStep('Finalizing parsed data...')
      onParseComplete(jobs, otherSections)
      
    } catch (error) {
      console.error('Error parsing resume:', error)
      setParsingStep('Error occurred during parsing')
    } finally {
      setIsParsing(false)
      setParsingStep('')
    }
  }

  const getSectionType = (title: string): 'work' | 'project' | 'skill' | 'certificate' | 'education' | 'other' => {
    const lower = title.toLowerCase()
    if (lower.includes('project')) return 'project'
    if (lower.includes('skill')) return 'skill'
    if (lower.includes('certificate') || lower.includes('certification')) return 'certificate'
    if (lower.includes('education') || lower.includes('academic')) return 'education'
    if (lower.includes('experience') || lower.includes('work')) return 'work'
    return 'other'
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">🤖 AI Resume Parser</h3>
        <p className="text-sm text-gray-600">
          Paste your resume text below and AI will automatically detect jobs, sections, and bullet points.
        </p>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Resume Text
          </label>
          <textarea
            value={resumeText}
            onChange={(e) => setResumeText(e.target.value)}
            className="w-full p-3 border border-gray-300 rounded-lg text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            rows={8}
            placeholder="Paste your resume text here..."
            disabled={isParsing}
          />
        </div>

        {isParsing && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <div className="flex items-center gap-2">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
              <span className="text-sm text-blue-800">{parsingStep}</span>
            </div>
          </div>
        )}

        <button
          onClick={parseResumeWithAI}
          disabled={isParsing || !resumeText.trim()}
          className="w-full py-3 bg-gradient-to-r from-purple-500 to-blue-600 text-white font-semibold rounded-lg hover:from-purple-600 hover:to-blue-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-md hover:shadow-lg"
        >
          {isParsing ? '🤖 Parsing Resume...' : '🚀 Parse Resume with AI'}
        </button>
      </div>

      <div className="mt-4 text-xs text-gray-500">
        <p><strong>What AI will do:</strong></p>
        <ul className="list-disc list-inside space-y-1 mt-2">
          <li>Detect each individual job and create separate sections</li>
          <li>Extract company names, roles, and dates</li>
          <li>Parse all bullet points for each job</li>
          <li>Identify other sections (Projects, Skills, Certificates)</li>
          <li>Organize content into proper resume structure</li>
        </ul>
      </div>
    </div>
  )
}