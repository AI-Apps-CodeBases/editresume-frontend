'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { useRouter } from 'next/navigation'
import UploadResume from '@/components/Editor/UploadResume'

const jobTitles = ['Game Developer', 'Product Designer', 'Software Engineer', 'Data Scientist', 'Marketing Manager'] as const

function calculateATSScore(formData: {
  name: string
  title: string
  description: string
}): number {
  let score = 0
  const maxScore = 100

  // Name (30 points)
  if (formData.name.trim().length > 0) {
    score += 30
  }

  // Title (30 points)
  if (formData.title.trim().length > 0) {
    score += 30
  }

  // Description quality (40 points)
  const desc = formData.description.trim()
  if (desc.length > 0) {
    score += Math.min(20, (desc.length / 15) * 2) // Length score
    // Keyword score
    const keywords = ['experience', 'developed', 'managed', 'led', 'created', 'improved', 'designed', 'implemented', 'achieved', 'optimized']
    const keywordCount = keywords.filter((kw) => desc.toLowerCase().includes(kw)).length
    score += Math.min(20, keywordCount * 3)
  }

  return Math.min(maxScore, Math.round(score))
}

type TabType = 'score' | 'job' | 'linkedin'

export default function StepsSection() {
  const [formData, setFormData] = useState({
    name: 'Sarah Chen',
    title: 'Senior Product Designer',
    description: 'Product designer with 8+ years of experience creating user-centered digital experiences. Specialized in accessibility, growth loops, and design systems. Led design initiatives that increased user engagement by 40% and improved conversion rates.',
  })

  const [atsScore, setAtsScore] = useState(() => {
    const initialData = {
      name: 'Sarah Chen',
      title: 'Senior Product Designer',
      description: 'Product designer with 8+ years of experience creating user-centered digital experiences. Specialized in accessibility, growth loops, and design systems. Led design initiatives that increased user engagement by 40% and improved conversion rates.',
    }
    return calculateATSScore(initialData)
  })
  const [isAnimating, setIsAnimating] = useState(false)
  const [activeTab, setActiveTab] = useState<TabType>('score')
  const [showUploadModal, setShowUploadModal] = useState(false)
  const router = useRouter()

  const exampleJobs = [
    {
      id: 1,
      title: 'Senior Game Developer',
      company: 'TechGames Inc.',
      location: 'San Francisco, CA',
      match: 85,
      posted: '2 days ago',
    },
    {
      id: 2,
      title: 'Product Designer',
      company: 'DesignStudio',
      location: 'Remote',
      match: 78,
      posted: '5 days ago',
    },
    {
      id: 3,
      title: 'Software Engineer',
      company: 'CodeCorp',
      location: 'New York, NY',
      match: 72,
      posted: '1 week ago',
    },
  ]

  const handleUploadSuccess = (data: any) => {
    setShowUploadModal(false)
    router.push(`/editor?resumeId=${data.id}`)
  }

  useEffect(() => {
    const score = calculateATSScore(formData)
    if (score !== atsScore) {
      setIsAnimating(true)
      const timer = setTimeout(() => {
        setAtsScore(score)
        setIsAnimating(false)
      }, 300)
      return () => clearTimeout(timer)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData])

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  const handleJobTitleClick = (title: string) => {
    setFormData((prev) => ({ ...prev, title }))
  }

  return (
    <section className="section-spacing bg-[#f4f7ff]">
      <div className="w-full px-[10%]">
        <div className="grid gap-8 lg:grid-cols-[420px_1fr] lg:items-start lg:gap-8">
          {/* Left Side - Editor Panel (Form + Tools) */}
          <div className="sticky top-8">
            <div className="rounded-2xl border border-border-subtle bg-white shadow-[0_22px_40px_rgba(15,23,42,0.06)]">
              {/* Editor Header */}
              <div className="border-b border-border-subtle bg-gradient-to-r from-primary-50 to-white p-3">
                <p className="text-[9px] font-semibold uppercase tracking-[0.15em] text-primary-600">Editor</p>
              </div>

              {/* Form Fields */}
              <div className="p-4 space-y-3 border-b border-border-subtle">
                <div>
                  <label htmlFor="demo-name" className="mb-1.5 block text-xs font-semibold text-text-primary">
                    Full Name
                  </label>
                  <input
                    id="demo-name"
                    type="text"
                    value={formData.name}
                    onChange={(e) => handleInputChange('name', e.target.value)}
                    placeholder="e.g. John Doe"
                    className="w-full rounded-lg border border-border-subtle bg-white px-3 py-2 text-sm text-text-primary outline-none transition-all focus:border-primary-500 focus:ring-2 focus:ring-primary-200"
                  />
                </div>

                <div>
                  <label htmlFor="demo-title" className="mb-1.5 block text-xs font-semibold text-text-primary">
                    Job Title
                  </label>
                  <input
                    id="demo-title"
                    type="text"
                    value={formData.title}
                    onChange={(e) => handleInputChange('title', e.target.value)}
                    placeholder="e.g. Game Developer"
                    className="w-full rounded-lg border border-border-subtle bg-white px-3 py-2 text-sm text-text-primary outline-none transition-all focus:border-primary-500 focus:ring-2 focus:ring-primary-200"
                  />
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {jobTitles.map((title) => (
                      <button
                        key={title}
                        type="button"
                        onClick={() => handleJobTitleClick(title)}
                        className={`rounded-full border px-2.5 py-0.5 text-[10px] font-medium transition-all ${
                          formData.title === title
                            ? 'border-primary-500 bg-primary-50 text-primary-700'
                            : 'border-border-subtle bg-white text-text-muted hover:border-primary-300 hover:bg-primary-50/50'
                        }`}
                      >
                        {title}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label htmlFor="demo-description" className="mb-1.5 block text-xs font-semibold text-text-primary">
                    Description / Experience
                  </label>
                  <textarea
                    id="demo-description"
                    value={formData.description}
                    onChange={(e) => handleInputChange('description', e.target.value)}
                    placeholder="E.g. Developed mobile games using Unity and C#, managed a team of 5 developers, improved game performance by 40%"
                    rows={3}
                    className="w-full resize-none rounded-lg border border-border-subtle bg-white px-3 py-2 text-sm text-text-primary outline-none transition-all focus:border-primary-500 focus:ring-2 focus:ring-primary-200"
                  />
                </div>
              </div>

              {/* Tools Section - Inside Editor */}
              <div>
                {/* Toolbar Header */}
                <div className="border-b border-border-subtle bg-gradient-to-r from-primary-50 to-white p-3">
                  <div className="flex items-center justify-between">
                    <p className="text-[9px] font-semibold uppercase tracking-[0.15em] text-primary-600">Tools</p>
                    <span className="relative flex h-1.5 w-1.5 items-center justify-center">
                      <span className="absolute h-1.5 w-1.5 animate-ping rounded-full bg-green-400 opacity-75"></span>
                      <span className="relative h-1.5 w-1.5 rounded-full bg-green-500"></span>
                    </span>
                  </div>
                </div>

                {/* Tabs - Toolbar */}
                <div className="flex border-b border-border-subtle bg-gray-50/50">
                  {[
                    { id: 'score' as TabType, label: 'Score', icon: '📊', description: 'ATS score analysis' },
                    { id: 'job' as TabType, label: 'Job', icon: '💼', description: 'Job matching' },
                    { id: 'linkedin' as TabType, label: 'LinkedIn', icon: '🔗', description: 'LinkedIn integration' },
                  ].map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`flex-1 px-2 py-2.5 text-[10px] font-semibold transition-all ${
                        activeTab === tab.id
                          ? 'text-primary-600 bg-white border-b-2 border-primary-600'
                          : 'text-text-muted hover:text-text-primary hover:bg-white/50'
                      }`}
                      title={tab.description}
                    >
                      <span className="mr-1">{tab.icon}</span>
                      {tab.label}
                    </button>
                  ))}
                </div>

                {/* Tab Content */}
                <div className="max-h-[400px] overflow-y-auto">
                {activeTab === 'score' && (
                  <div className="p-4 space-y-4">
                    {/* Tool Description */}
                    <div className="rounded-lg border border-primary-200 bg-primary-50/30 p-3">
                      <p className="text-[10px] font-semibold text-primary-700 mb-1">📊 ATS Score Tool</p>
                      <p className="text-[9px] text-text-muted leading-relaxed">
                        Get real-time ATS (Applicant Tracking System) score analysis. See how well your resume matches ATS requirements and get instant feedback on what to improve.
                      </p>
                    </div>

                    {/* ATS Score Display */}
                    <div className="rounded-lg bg-gradient-to-br from-blue-50 to-indigo-50 p-3 border border-blue-100">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-[9px] font-semibold uppercase tracking-[0.15em] text-text-muted">ATS Score</p>
                          <div
                            className={`mt-1 text-xl font-bold transition-all duration-300 ${
                              isAnimating ? 'scale-110' : 'scale-100'
                            } ${
                              atsScore >= 80
                                ? 'text-green-600'
                                : atsScore >= 60
                                  ? 'text-yellow-600'
                                  : atsScore >= 40
                                    ? 'text-orange-600'
                                    : 'text-red-600'
                            }`}
                          >
                            {atsScore}
                            <span className="text-xs text-text-muted">/100</span>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-[9px] font-semibold uppercase tracking-[0.15em] text-text-muted">Status</p>
                          <p
                            className={`mt-1 text-[10px] font-semibold ${
                              atsScore >= 80
                                ? 'text-green-600'
                                : atsScore >= 60
                                  ? 'text-yellow-600'
                                  : atsScore >= 40
                                    ? 'text-orange-600'
                                    : 'text-red-600'
                            }`}
                          >
                            {atsScore >= 80 ? 'Ready' : atsScore >= 60 ? 'Good' : atsScore >= 40 ? 'Needs Work' : 'Incomplete'}
                          </p>
                        </div>
                      </div>
                      <div className="mt-2 h-1.5 rounded-full bg-primary-100 overflow-hidden">
                        <div
                          className={`h-full rounded-full bg-gradient-to-r from-primary-600 via-primary-500 to-primary-400 transition-all duration-500 ${
                            isAnimating ? 'animate-pulse' : ''
                          }`}
                          style={{ width: `${atsScore}%` }}
                        />
                      </div>
                    </div>

                    {/* Score Breakdown */}
                    <div className="space-y-2">
                      <p className="text-[9px] font-semibold uppercase tracking-[0.15em] text-text-muted">Score Breakdown</p>
                      <div className="rounded-lg border border-amber-200 bg-amber-50/30 p-2.5">
                        <p className="text-[9px] text-amber-700 leading-relaxed">
                          <span className="font-semibold">Note:</span> ATS Score analyzes your entire CV, including experience, skills, education, and formatting. The score shown here is a simplified demo based on basic fields.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === 'job' && (
                  <div className="p-4 space-y-3">
                    {/* Tool Description */}
                    <div className="rounded-lg border border-primary-200 bg-primary-50/30 p-3">
                      <p className="text-[10px] font-semibold text-primary-700 mb-1">💼 Job Matching Tool</p>
                      <p className="text-[9px] text-text-muted leading-relaxed">
                        Upload job descriptions and get AI-powered matching analysis. See how well your resume fits each job and get personalized improvement suggestions.
                      </p>
                    </div>

                    <div className="rounded-lg border border-border-subtle bg-gradient-to-br from-purple-50 to-pink-50 p-3">
                      <div className="flex items-start gap-2">
                        <span className="text-lg">💼</span>
                        <div className="flex-1">
                          <p className="text-xs font-semibold text-text-primary mb-1">Job Matching</p>
                          <p className="text-[10px] text-text-muted leading-relaxed">
                            Match your resume with job descriptions and get instant feedback on how well you fit.
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Example Jobs List */}
                    <div className="space-y-2">
                      <p className="text-[9px] font-semibold uppercase tracking-[0.15em] text-text-muted">Saved Jobs</p>
                      <div className="space-y-2">
                        {exampleJobs.map((job) => (
                          <div
                            key={job.id}
                            className="w-full rounded-lg border border-border-subtle bg-white p-2.5"
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex-1 min-w-0">
                                <p className="text-xs font-semibold text-text-primary truncate">{job.title}</p>
                                <p className="text-[10px] text-text-muted mt-0.5">{job.company} • {job.location}</p>
                                <p className="text-[9px] text-text-muted/70 mt-1">{job.posted}</p>
                              </div>
                              <div className="flex-shrink-0">
                                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded ${
                                  job.match >= 80
                                    ? 'bg-green-100 text-green-700'
                                    : job.match >= 70
                                      ? 'bg-yellow-100 text-yellow-700'
                                      : 'bg-orange-100 text-orange-700'
                                }`}>
                                  {job.match}%
                                </span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="rounded-lg border border-border-subtle bg-white p-3">
                      <p className="text-[9px] font-semibold uppercase tracking-[0.15em] text-text-muted mb-2">How it works</p>
                      <div className="space-y-1.5">
                        <div className="flex gap-2 text-[10px]">
                          <span className="text-primary-600 font-bold">1.</span>
                          <span className="text-text-secondary">Click on a job to upload your resume</span>
                        </div>
                        <div className="flex gap-2 text-[10px]">
                          <span className="text-primary-600 font-bold">2.</span>
                          <span className="text-text-secondary">AI analyzes your resume against the job</span>
                        </div>
                        <div className="flex gap-2 text-[10px]">
                          <span className="text-primary-600 font-bold">3.</span>
                          <span className="text-text-secondary">Get personalized improvement suggestions</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === 'linkedin' && (
                  <div className="p-4 space-y-3">
                    {/* Tool Description */}
                    <div className="rounded-lg border border-primary-200 bg-primary-50/30 p-3">
                      <p className="text-[10px] font-semibold text-primary-700 mb-1">🔗 LinkedIn Extension Tool</p>
                      <p className="text-[9px] text-text-muted leading-relaxed">
                        Install our browser extension to save LinkedIn job posts with one click. Automatically match your resume and track application status.
                      </p>
                    </div>

                    <div className="rounded-lg border border-border-subtle bg-gradient-to-br from-blue-50 to-indigo-50 p-3">
                      <div className="flex items-start gap-2">
                        <span className="text-lg">🔗</span>
                        <div className="flex-1">
                          <p className="text-xs font-semibold text-text-primary mb-1">LinkedIn Extension</p>
                          <p className="text-[10px] text-text-muted leading-relaxed">
                            Save LinkedIn job posts directly to editresume.io with one click. No copy-paste needed.
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* LinkedIn Job Link Example */}
                    <div className="space-y-2">
                      <p className="text-[9px] font-semibold uppercase tracking-[0.15em] text-text-muted">Saved from LinkedIn</p>
                      <div className="w-full rounded-lg border border-border-subtle bg-white p-2.5">
                        <div className="flex items-start gap-2">
                          <span className="text-sm">🔗</span>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-semibold text-text-primary">Senior Product Designer</p>
                            <p className="text-[10px] text-text-muted mt-0.5 truncate">
                              linkedin.com/jobs/view/1234567890
                            </p>
                            <p className="text-[9px] text-text-muted/70 mt-1">Saved 3 days ago</p>
                          </div>
                          <span className="flex-shrink-0 text-[10px] font-semibold text-primary-600">Match</span>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <p className="text-[9px] font-semibold uppercase tracking-[0.15em] text-text-muted">Features</p>
                      <div className="space-y-2">
                        <div className="flex gap-2 text-[10px]">
                          <span className="text-primary-600">✓</span>
                          <span className="text-text-secondary">One-click job saving from LinkedIn</span>
                        </div>
                        <div className="flex gap-2 text-[10px]">
                          <span className="text-primary-600">✓</span>
                          <span className="text-text-secondary">Automatic resume matching</span>
                        </div>
                        <div className="flex gap-2 text-[10px]">
                          <span className="text-primary-600">✓</span>
                          <span className="text-text-secondary">Track application status</span>
                        </div>
                        <div className="flex gap-2 text-[10px]">
                          <span className="text-primary-600">✓</span>
                          <span className="text-text-secondary">Get AI-powered improvement tips</span>
                        </div>
                      </div>
                    </div>

                    <div className="rounded-lg border-2 border-dashed border-primary-200 bg-primary-50/30 p-3 text-center">
                      <p className="text-[10px] font-semibold text-primary-700 mb-1">Install Extension</p>
                      <p className="text-[9px] text-text-muted">
                        Add our Chrome extension to start saving jobs from LinkedIn instantly
                      </p>
                    </div>

                    <div className="rounded-lg border border-border-subtle bg-white p-3">
                      <p className="text-[9px] font-semibold uppercase tracking-[0.15em] text-text-muted mb-2">Quick Start</p>
                      <div className="space-y-1.5 text-[10px] text-text-secondary">
                        <p>1. Install the extension</p>
                        <p>2. Browse LinkedIn jobs</p>
                        <p>3. Click "Save to EditResume"</p>
                        <p>4. Upload resume & get matching</p>
                      </div>
                    </div>
                  </div>
                )}
                </div>
              </div>
            </div>
          </div>

          {/* Right Side - Live Preview (CV) */}
          <div className="relative z-10">
            <div className="animate-glow-pulse absolute inset-0 -z-10 rounded-[32px] bg-primary-200 blur-[100px]" />
            <div className="relative overflow-hidden rounded-[32px] border border-border-subtle bg-white shadow-card">
              {/* CV Header */}
              <div className="border-b border-border-subtle bg-gradient-to-r from-primary-50 to-white p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-primary-600 mb-2">Try AI first</p>
                    <h3 className="text-xl font-bold text-text-primary leading-tight">{formData.name}</h3>
                    <p className="mt-0.5 text-sm font-semibold text-text-secondary">{formData.title}</p>
                    <div className="mt-2 flex flex-wrap gap-x-3 gap-y-0.5 text-[10px] text-text-muted">
                      <span>sarah.chen@email.com</span>
                      <span>•</span>
                      <span>+1 (555) 123-4567</span>
                      <span>•</span>
                      <span>San Francisco, CA</span>
                    </div>
                  </div>
                  <span className="rounded-full bg-primary-50 px-3 py-0.5 text-[10px] font-semibold text-primary-700 whitespace-nowrap">
                    Live preview
                  </span>
                </div>
              </div>

              {/* CV Content */}
              <div className="p-4 space-y-4">
                {/* Professional Summary */}
                <div>
                  <h4 className="text-[10px] font-bold uppercase tracking-wide text-text-primary mb-1.5 border-b border-border-subtle pb-0.5">
                    Professional Summary
                  </h4>
                  <p className="text-[10px] leading-relaxed text-text-secondary mt-1.5">
                    {formData.description}
                  </p>
                </div>

                {/* Experience */}
                <div>
                  <h4 className="text-[10px] font-bold uppercase tracking-wide text-text-primary mb-2 border-b border-border-subtle pb-0.5">
                    Experience
                  </h4>
                  <div className="space-y-3 mt-2">
                    <div>
                      <div className="flex items-start justify-between gap-3 mb-0.5">
                        <div className="flex-1">
                          <p className="text-[10px] font-semibold text-text-primary">Senior Product Designer</p>
                          <p className="text-[10px] text-text-muted">TechCorp Inc. • San Francisco, CA</p>
                        </div>
                        <span className="text-[10px] text-text-muted whitespace-nowrap">2020 - Present</span>
                      </div>
                      <ul className="mt-1.5 space-y-0.5 ml-3">
                        <li className="text-[10px] text-text-secondary flex items-start gap-1.5">
                          <span className="text-primary-600 mt-0.5">•</span>
                          <span>Designed and shipped 15+ features improving user engagement by 40%</span>
                        </li>
                        <li className="text-[10px] text-text-secondary flex items-start gap-1.5">
                          <span className="text-primary-600 mt-0.5">•</span>
                          <span>Led accessibility initiatives ensuring WCAG 2.1 AA compliance</span>
                        </li>
                        <li className="text-[10px] text-text-secondary flex items-start gap-1.5">
                          <span className="text-primary-600 mt-0.5">•</span>
                          <span>Built growth loops that increased conversion rates by 25%</span>
                        </li>
                      </ul>
                    </div>
                    <div>
                      <div className="flex items-start justify-between gap-3 mb-0.5">
                        <div className="flex-1">
                          <p className="text-[10px] font-semibold text-text-primary">Product Designer</p>
                          <p className="text-[10px] text-text-muted">StartupXYZ • San Francisco, CA</p>
                        </div>
                        <span className="text-[10px] text-text-muted whitespace-nowrap">2018 - 2020</span>
                      </div>
                      <ul className="mt-1.5 space-y-0.5 ml-3">
                        <li className="text-[10px] text-text-secondary flex items-start gap-1.5">
                          <span className="text-primary-600 mt-0.5">•</span>
                          <span>Collaborated with cross-functional teams to launch 3 major products</span>
                        </li>
                        <li className="text-[10px] text-text-secondary flex items-start gap-1.5">
                          <span className="text-primary-600 mt-0.5">•</span>
                          <span>Established design system used across 5 product teams</span>
              </li>
            </ul>
          </div>
            </div>
            </div>

                {/* Skills */}
                <div>
                  <h4 className="text-[10px] font-bold uppercase tracking-wide text-text-primary mb-2 border-b border-border-subtle pb-0.5">
                    Skills
                  </h4>
                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                    {['Figma', 'Accessibility', 'Growth loops', 'Design Systems', 'User Research', 'Prototyping', 'HTML/CSS', 'JavaScript'].map((skill) => (
                <span
                        key={skill}
                        className="inline-flex items-center rounded border border-border-subtle bg-primary-50/50 px-2 py-0.5 text-[10px] font-medium text-primary-700"
                >
                        {skill}
                </span>
              ))}
            </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Upload Resume Modal */}
      {showUploadModal && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[10010] flex items-center justify-center p-4"
          onClick={() => setShowUploadModal(false)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-border-subtle">
              <div>
                <h2 className="text-lg font-bold text-text-primary">Upload Resume to Match</h2>
                <p className="text-sm text-text-muted mt-1">Upload your resume to start matching with job descriptions.</p>
              </div>
              <button
                onClick={() => setShowUploadModal(false)}
                className="text-text-muted hover:text-text-primary text-2xl font-bold transition-colors"
                aria-label="Close upload resume modal"
              >
                ×
              </button>
            </div>
            <div className="px-6 py-6">
              <UploadResume variant="modal" onUploadSuccess={handleUploadSuccess} />
            </div>
          </div>
        </div>
      )}
    </section>
  )
}
