'use client'
import { useState, useEffect, useCallback } from 'react'
import { useSearchParams } from 'next/navigation'
import ResumeForm from '@/components/editor/ResumeForm'
import PreviewPanel from '@/components/editor/PreviewPanel'
import GlobalReplacements from '@/components/editor/GlobalReplacements'
import TemplateSelector from '@/components/editor/TemplateSelector'
import TwoColumnEditor from '@/components/editor/TwoColumnEditor'
import NewResumeWizard from '@/components/editor/NewResumeWizard'
import AuthModal from '@/components/auth/AuthModal'
import CollaborationPanel from '@/components/editor/CollaborationPanel'
import VisualResumeEditor from '@/components/editor/VisualResumeEditor'
import AIWizard from '@/components/editor/AIWizard'
import ImproveResumeButton from '@/components/editor/ImproveResumeButton'
import CoverLetterGenerator from '@/components/editor/CoverLetterGenerator'
import ATSScoreWidget from '@/components/editor/ATSScoreWidget'
import { useAuth } from '@/contexts/AuthContext'
import { useCollaboration } from '@/hooks/useCollaboration'

export default function EditorPage() {
  const { user, isAuthenticated, login, logout, checkPremiumAccess } = useAuth()
  const searchParams = useSearchParams()
  const [showAuthModal, setShowAuthModal] = useState(false)
  const [showWizard, setShowWizard] = useState(true)
  const [showAIWizard, setShowAIWizard] = useState(false)
  const [showCoverLetterGenerator, setShowCoverLetterGenerator] = useState(false)
  const [showATSScore, setShowATSScore] = useState(false)
  const [roomId, setRoomId] = useState<string | null>(null)
  const [previewKey, setPreviewKey] = useState(0)
  const [userName, setUserName] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('userName') || ''
    }
    return ''
  })
  const [selectedTemplate, setSelectedTemplate] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('selectedTemplate') || 'tech'
    }
    return 'tech'
  })
  const [editorMode, setEditorMode] = useState<'visual'>('visual')

  const collaboration = useCollaboration()
  
  const [resumeData, setResumeData] = useState({
    name: '',
    title: '',
    email: '',
    phone: '',
    location: '',
    summary: '',
    sections: [] as Array<{
      id: string
      title: string
      bullets: Array<{
        id: string
        text: string
        params: Record<string, string>
      }>
    }>
  })

  const [replacements, setReplacements] = useState<Record<string, string>>({})
  const [isExporting, setIsExporting] = useState(false)

  const handleWizardComplete = (data: any, template: string, layoutConfig?: any) => {
    console.log('Wizard complete:', { data, template, layoutConfig })
    
    const newResumeData = {
      name: data.name || '',
      title: data.title || '',
      email: data.email || '',
      phone: data.phone || '',
      location: data.location || '',
      summary: data.summary || '',
      sections: data.sections || []
    }
    
    setResumeData(newResumeData)
    
    setEditorMode('visual')
    setSelectedTemplate(template === 'visual' ? 'tech' : template)
    if (typeof window !== 'undefined') {
      localStorage.setItem('editorMode', 'visual')
      localStorage.setItem('selectedTemplate', template === 'visual' ? 'tech' : template)
    }
    
    if (data.detected_variables) {
      setReplacements(data.detected_variables)
    }

    if (layoutConfig && template === 'two-column') {
      localStorage.setItem('twoColumnLeft', JSON.stringify(layoutConfig.leftSections))
      localStorage.setItem('twoColumnRight', JSON.stringify(layoutConfig.rightSections))
      localStorage.setItem('twoColumnLeftWidth', String(layoutConfig.leftWidth))
    }
    
    setShowWizard(false)
  }

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const hasExistingResume = localStorage.getItem('resumeData')
      if (hasExistingResume) {
        setShowWizard(false)
      }
      
      const urlRoomId = searchParams.get('room')
      if (urlRoomId) {
        setRoomId(urlRoomId)
        setShowWizard(false)
        
        if (!userName) {
          const name = prompt('Enter your name for collaboration:')
          if (name) {
            setUserName(name)
            localStorage.setItem('userName', name)
          }
        }
      }
    }
  }, [searchParams, userName])

  useEffect(() => {
    if (roomId && userName) {
      collaboration.connect(roomId, userName)
      
      collaboration.onRemoteUpdate((data, remoteUserName) => {
        console.log(`Update from ${remoteUserName}:`, data)
        setResumeData(data)
      })
    }
    
    return () => {
      if (roomId) {
        collaboration.disconnect()
      }
    }
  }, [roomId, userName, collaboration])

  const handleResumeDataChange = useCallback((newData: any) => {
    console.log('=== handleResumeDataChange called ===')
    console.log('Previous resume data:', resumeData)
    console.log('New resume data:', newData)
    console.log('Setting new resume data...')
    
    setResumeData(newData)
    setPreviewKey(prev => prev + 1) // Force preview re-render
    
    if (roomId && collaboration.isConnected) {
      console.log('Sending collaboration update...')
      collaboration.sendUpdate(newData)
    }
    
    console.log('handleResumeDataChange completed')
  }, [roomId, collaboration, resumeData])

  const handleCreateRoom = async () => {
    try {
      const response = await fetch('http://localhost:8000/api/collab/room/create')
      const data = await response.json()
      const name = userName || prompt('Enter your name:')
      if (name) {
        setUserName(name)
        localStorage.setItem('userName', name)
        setRoomId(data.room_id)
        window.history.pushState({}, '', `/editor?room=${data.room_id}`)
      }
    } catch (error) {
      console.error('Failed to create room:', error)
      alert('Failed to create collaboration room')
    }
  }

  const handleJoinRoom = (roomIdToJoin: string) => {
    const name = userName || prompt('Enter your name:')
    if (name) {
      setUserName(name)
      localStorage.setItem('userName', name)
      setRoomId(roomIdToJoin)
      window.history.pushState({}, '', `/editor?room=${roomIdToJoin}`)
    }
  }

  const handleLeaveRoom = () => {
    collaboration.disconnect()
    setRoomId(null)
    window.history.pushState({}, '', '/editor')
  }

  const saveToHistory = () => {
    if (!resumeData.name) return
    
    const history = localStorage.getItem('resumeHistory')
    const resumes = history ? JSON.parse(history) : []
    const newResume = {
      id: Date.now().toString(),
      name: resumeData.name,
      lastModified: new Date().toLocaleString(),
      template: selectedTemplate
    }
    resumes.unshift(newResume)
    localStorage.setItem('resumeHistory', JSON.stringify(resumes.slice(0, 10)))
  }

  const handleExport = async (format: 'pdf' | 'docx') => {
    console.log('Export requested:', format)
    console.log('Resume data:', resumeData)
    console.log('Is authenticated:', isAuthenticated)
    
    const premiumMode = process.env.NEXT_PUBLIC_PREMIUM_MODE === 'true'
    
    if (premiumMode && !isAuthenticated) {
      console.log('Premium mode - showing auth modal')
      setShowAuthModal(true)
      return
    }

    if (premiumMode && !checkPremiumAccess()) {
      console.log('Premium mode - access denied')
      alert('⭐ Premium feature! Upgrade to export resumes.')
      return
    }

    saveToHistory()
    
    if (isAuthenticated && user?.email) {
      try {
        await fetch(`${process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:8000'}/api/user/track-export`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: user.email })
        })
      } catch (e) {
        console.log('Failed to track export')
      }
    }

    setIsExporting(true)
    try {
      const exportUrl = `${process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:8000'}/api/resume/export/${format}`
      console.log('Export URL:', exportUrl)
      
      const exportData = {
        name: resumeData.name,
        title: resumeData.title,
        email: resumeData.email,
        phone: resumeData.phone,
        location: resumeData.location,
        summary: resumeData.summary,
        sections: resumeData.sections,
        replacements,
        template: selectedTemplate,
        two_column_left: localStorage.getItem('twoColumnLeft') ? JSON.parse(localStorage.getItem('twoColumnLeft')!) : [],
        two_column_right: localStorage.getItem('twoColumnRight') ? JSON.parse(localStorage.getItem('twoColumnRight')!) : [],
        two_column_left_width: localStorage.getItem('twoColumnLeftWidth') ? Number(localStorage.getItem('twoColumnLeftWidth')!) : 50
      }
      
      console.log('Export data:', exportData)
      
      const response = await fetch(exportUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(exportData)
      })
      
      console.log('Export response status:', response.status)
      console.log('Export response ok:', response.ok)
      
      // Debug logging
      const debugInfo = {
        template: selectedTemplate,
        left: localStorage.getItem('twoColumnLeft'),
        right: localStorage.getItem('twoColumnRight'),
        width: localStorage.getItem('twoColumnLeftWidth'),
        allLocalStorage: Object.keys(localStorage).reduce((obj, key) => {
          if (key.startsWith('twoColumn')) {
            obj[key] = localStorage.getItem(key)
          }
          return obj
        }, {} as Record<string, string | null>)
      }
      console.log('Export payload two-column settings:', debugInfo)

      if (response.ok) {
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `${resumeData.name || 'resume'}.${format}`
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)
        document.body.removeChild(a)
      } else {
        const errorText = await response.text()
        console.error('Export failed:', response.status, errorText)
        alert(`Export failed (${response.status}): ${errorText}`)
      }
    } catch (error) {
      console.error('Export error:', error)
      alert(`Export failed: ${error.message}. Make sure backend is running.`)
    } finally {
      setIsExporting(false)
    }
  }

  const [previewScale, setPreviewScale] = useState(0.6)
  const [fullscreenPreview, setFullscreenPreview] = useState(false)

  const handleAddContent = (newContent: any) => {
    console.log('=== AI WIZARD ADDING CONTENT ===')
    console.log('New content from AI wizard:', newContent)
    console.log('Content type:', newContent.type)
    console.log('Content data:', newContent.content)
    console.log('Position:', newContent.position)
    console.log('Current resume data before update:', resumeData)
    
    try {
      if (newContent.type === 'job') {
        // Add new job experience
        const workExperienceSection = resumeData.sections.find(s => 
          s.title.toLowerCase().includes('experience') || 
          s.title.toLowerCase().includes('work') ||
          s.title.toLowerCase().includes('employment') ||
          s.title.toLowerCase().includes('professional')
        )
        
        console.log('Available sections:', resumeData.sections.map(s => s.title))
        console.log('Found work experience section:', workExperienceSection)
        
        if (newContent.content) {
          let targetSection = workExperienceSection
          
          // If no work experience section found, create one
          if (!targetSection) {
            console.log('No work experience section found, creating one...')
            targetSection = {
              id: Date.now().toString(),
              title: 'Work Experience',
              bullets: []
            }
            // Add the new section to the beginning of sections array
            resumeData.sections.unshift(targetSection)
          }
          const content = newContent.content
          const bullets = content.bullets || []
          
          console.log('Content bullets:', bullets)
          
          console.log('Content validation:', {
            company: content.company,
            role: content.role,
            duration: content.duration,
            bullets: bullets,
            fullContent: content
          })
          
          // Handle undefined values with fallbacks
          const company = content.company || 'Unknown Company'
          const role = content.role || 'Unknown Role'
          const duration = content.duration || 'Unknown Duration'
          
          console.log('Using fallbacks:', { company, role, duration })
          
          const newBullets = [
            { 
              id: Date.now().toString(), 
              text: `**${company} / ${role} / ${duration}**`, 
              params: {} 
            },
            ...bullets.filter((bullet: any) => bullet && bullet.trim()).map((bullet: string) => ({
              id: Date.now().toString() + Math.random(),
              text: `• ${bullet}`,
              params: {}
            }))
          ]
          
          console.log('New bullets to add:', newBullets)
          
          // Clean up existing placeholder entries
          const cleanExistingBullets = (bullets: any[]) => {
            return bullets.filter(bullet => 
              bullet.text && 
              bullet.text.trim() && 
              !bullet.text.includes('Company / Role / Duration') &&
              !bullet.text.includes('**Company**') &&
              !bullet.text.includes('**Role**') &&
              !bullet.text.includes('**Duration**')
            )
          }
          
          const updatedSections = resumeData.sections.map(section => {
            if (section.id === targetSection.id) {
              let updatedBullets
              const cleanedExistingBullets = cleanExistingBullets(section.bullets)
              
              if (newContent.position === 'beginning') {
                updatedBullets = [...newBullets, ...cleanedExistingBullets]
              } else if (newContent.position === 'middle') {
                const middleIndex = Math.floor(cleanedExistingBullets.length / 2)
                const newBulletsList = [...cleanedExistingBullets]
                newBulletsList.splice(middleIndex, 0, ...newBullets)
                updatedBullets = newBulletsList
              } else {
                updatedBullets = [...cleanedExistingBullets, ...newBullets]
              }
              
              console.log('Updated bullets for section:', updatedBullets)
              return { ...section, bullets: updatedBullets }
            }
            return section
          })
          
          console.log('Updated sections:', updatedSections)
          const newResumeData = { ...resumeData, sections: updatedSections }
          console.log('New resume data:', newResumeData)
          console.log('Calling handleResumeDataChange to update preview...')
          handleResumeDataChange(newResumeData)
          console.log('handleResumeDataChange completed')
        } else {
          console.log('No content provided')
        }
      } else if (newContent.type === 'project') {
        // Add new project
        const projectsSection = resumeData.sections.find(s => 
          s.title.toLowerCase().includes('project')
        ) || resumeData.sections[0]
        
        console.log('Found projects section:', projectsSection)
        
        if (newContent.content) {
          const content = newContent.content
          const bullets = content.bullets || []
          
          const newBullets = [
            { id: Date.now().toString(), text: `**${content.name || 'Project Name'}**`, params: {} },
            { id: Date.now().toString() + '1', text: content.description || 'Project description', params: {} },
            ...bullets.map((bullet: string) => ({
              id: Date.now().toString() + Math.random(),
              text: `• ${bullet}`,
              params: {}
            }))
          ]
          
          console.log('New project bullets:', newBullets)
          
          const updatedSections = resumeData.sections.map(section => {
            if (section.id === projectsSection.id) {
              const updatedBullets = [...section.bullets, ...newBullets]
              console.log('Updated project bullets:', updatedBullets)
              return { ...section, bullets: updatedBullets }
            }
            return section
          })
          
          const newResumeData = { ...resumeData, sections: updatedSections }
          console.log('New resume data with project:', newResumeData)
          handleResumeDataChange(newResumeData)
        }
      } else if (newContent.type === 'skill') {
        // Add new skills section
        if (newContent.content && newContent.content.categories) {
          const categories = newContent.content.categories
          const skillBullets = Object.entries(categories).map(([category, skills]) => 
            `**${category}:** ${Array.isArray(skills) ? skills.join(', ') : skills}`
          )
          
          const newSection = {
            id: Date.now().toString(),
            title: 'Skills',
            bullets: skillBullets.map(skill => ({
              id: Date.now().toString() + Math.random(),
              text: skill,
              params: {}
            }))
          }
          
          console.log('New skills section:', newSection)
          
          const newResumeData = { 
            ...resumeData, 
            sections: [...resumeData.sections, newSection] 
          }
          console.log('New resume data with skills:', newResumeData)
          handleResumeDataChange(newResumeData)
        }
      } else if (newContent.type === 'education') {
        // Add new education section
        if (newContent.content) {
          const content = newContent.content
          const educationBullets = [
            `**${content.institution || 'Institution'}**`,
            `${content.degree || 'Degree'} - ${content.year || 'Year'}`,
            ...(content.coursework || []).map((course: string) => `• ${course}`),
            ...(content.honors || []).map((honor: string) => `• ${honor}`)
          ]
          
          const newSection = {
            id: Date.now().toString(),
            title: 'Education',
            bullets: educationBullets.map(edu => ({
              id: Date.now().toString() + Math.random(),
              text: edu,
              params: {}
            }))
          }
          
          console.log('New education section:', newSection)
          
          const newResumeData = { 
            ...resumeData, 
            sections: [...resumeData.sections, newSection] 
          }
          console.log('New resume data with education:', newResumeData)
          handleResumeDataChange(newResumeData)
        }
      }
    } catch (error) {
      console.error('Error adding content:', error)
      alert('Failed to add content: ' + (error as Error).message)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {!showWizard && (
        <header className="bg-white border-b sticky top-0 z-20 shadow-sm">
          <div className="mx-auto max-w-[1600px] px-4 py-3">
            <div className="flex items-center justify-between">
              <a href="/" className="text-xl font-bold text-primary">editresume.io</a>
              <div className="flex gap-3 items-center">
                {isAuthenticated ? (
                  <div className="flex items-center gap-3">
                    <a
                      href="/profile"
                      className="text-sm text-gray-600 hover:text-blue-600 transition-colors flex items-center gap-1"
                    >
                      👋 {user?.name}
                      {user?.isPremium && <span className="ml-1 text-xs bg-gradient-to-r from-purple-600 to-pink-600 text-white px-2 py-0.5 rounded-full">PRO</span>}
                    </a>
                    <button
                      onClick={logout}
                      className="text-sm px-4 py-2 rounded-lg border-2 border-gray-300 hover:border-red-400 hover:bg-red-50 transition-all font-semibold"
                    >
                      Logout
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setShowAuthModal(true)}
                    className="text-sm px-4 py-2 rounded-lg bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:shadow-lg transform hover:scale-105 transition-all font-semibold"
                  >
                    🔐 Sign In
                  </button>
                )}
                <button
                  onClick={() => setShowCoverLetterGenerator(true)}
                  className="text-sm px-4 py-2 rounded-lg border-2 border-gray-300 hover:border-green-400 hover:bg-green-50 transition-all font-semibold"
                >
                  📝 Cover Letter
                </button>
                <button
                  onClick={() => {
                    console.log('New Resume button clicked')
                    setShowWizard(true)
                  }}
                  className="text-sm px-4 py-2 rounded-lg border-2 border-gray-300 hover:border-blue-400 hover:bg-blue-50 transition-all font-semibold"
                >
                  ✨ New Resume
                </button>
                
                {!resumeData.name && (
                  <span className="text-xs text-gray-500 italic">
                    Enter your name to enable export →
                  </span>
                )}
                
                <button 
                  onClick={() => handleExport('docx')}
                  disabled={isExporting || !resumeData.name}
                  className="text-sm px-5 py-2.5 rounded-xl bg-gradient-to-r from-green-600 to-emerald-600 text-white hover:shadow-lg transform hover:scale-105 disabled:opacity-40 disabled:cursor-not-allowed disabled:transform-none transition-all font-semibold"
                  title={!resumeData.name ? "Enter your name first" : "Export as DOCX"}
                >
                  📄 Export DOCX
                </button>
                <button 
                  onClick={() => handleExport('pdf')}
                  disabled={isExporting || !resumeData.name}
                  className="text-sm px-5 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:shadow-lg transform hover:scale-105 disabled:opacity-40 disabled:cursor-not-allowed disabled:transform-none transition-all font-semibold shadow-md"
                  title={!resumeData.name ? "Enter your name first" : "Export as PDF"}
                >
                  {isExporting ? '⏳ Exporting...' : '📥 Export PDF'}
                </button>
              </div>
            </div>
          </div>
        </header>
      )}

      <div className="mx-auto max-w-[1800px] px-4 py-4">
        {showWizard ? (
          <NewResumeWizard
            onComplete={handleWizardComplete}
            onCancel={() => setShowWizard(false)}
          />
        ) : (
          <div className="space-y-4">
            {/* Collaboration Panel */}
            <CollaborationPanel
              isConnected={collaboration.isConnected}
              activeUsers={collaboration.activeUsers}
              roomId={roomId}
              onCreateRoom={handleCreateRoom}
              onJoinRoom={handleJoinRoom}
              onLeaveRoom={handleLeaveRoom}
            />

            {/* Top Bar - Template Info */}
            <div className="bg-white rounded-xl shadow-sm border p-4">
              <div className="flex items-center gap-6">
                <div className="flex-1">
                  <label className="text-sm font-semibold text-gray-700 mb-2 block">
                    🎨 Visual Editor
                  </label>
                  <div className="flex items-center gap-4">
                    <div className="text-sm text-gray-600">
                      <span className="font-medium">Template:</span> {selectedTemplate}
                    </div>
                    <div className="text-xs text-gray-500">
                      Template selected during setup
                    </div>
                    <button
                      onClick={() => {
                        console.log('=== MANUAL PREVIEW REFRESH ===')
                        setPreviewKey(prev => prev + 1)
                        console.log('Preview key updated to:', previewKey + 1)
                      }}
                      className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs font-semibold hover:bg-blue-200"
                    >
                      🔄 Refresh Preview
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Visual Editor */}
            <div className="space-y-4">
              <div className="bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200 rounded-xl p-4">
                <div>
                  <h2 className="text-lg font-bold text-emerald-900 mb-1">🎨 Visual Editor</h2>
                  <p className="text-sm text-emerald-700">Click any text to edit • Drag sections/bullets to reorder • Select text for AI improvements</p>
                </div>
              </div>
                
                {/* Two Column Layout for Visual Editor */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Left - Visual Editor (Larger) */}
                  <div className="lg:col-span-2 space-y-4">
                <div className="overflow-y-auto" style={{ maxHeight: 'calc(100vh - 200px)' }}>
                  <VisualResumeEditor
                    data={resumeData}
                    onChange={handleResumeDataChange}
                    template={selectedTemplate}
                    onAddContent={handleAddContent}
                    onAIImprove={async (text: string) => {
                      try {
                        console.log('AI Improve requested for:', text)
                        const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:8000'}/api/openai/improve-bullet`, {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ bullet: text, tone: 'professional' })
                        })
                        
                        if (!response.ok) {
                          throw new Error(`HTTP error! status: ${response.status}`)
                        }
                        
                        const data = await response.json()
                        console.log('AI Improve response:', data)
                        
                        let improved = data.improved || data.improved_bullet || text
                        improved = improved.replace(/^["']|["']$/g, '')
                        
                        console.log('Final improved text:', improved)
                        return improved
                      } catch (error) {
                        console.error('AI improvement failed:', error)
                        alert('AI improvement failed: ' + (error as Error).message)
                        return text
                      }
                    }}
                  />
                </div>
                  </div>

                  {/* Right - Live Preview (Smaller) */}
                  <div className="lg:col-span-1">
                    <div className="sticky top-4">
                      <div className="bg-white rounded-xl shadow-lg p-4 border">
                        <div className="flex items-center justify-between mb-3">
                          <h3 className="text-sm font-bold text-gray-700">📄 Live Preview</h3>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => setFullscreenPreview(true)}
                              className="px-3 py-1.5 rounded-lg bg-primary text-white hover:bg-primary-dark text-xs font-semibold transition-all flex items-center gap-1"
                              title="View fullscreen preview"
                            >
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                              </svg>
                              Full Page
                            </button>
                            <button
                              onClick={() => setPreviewScale(Math.max(0.4, previewScale - 0.1))}
                              className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-gray-100 text-sm font-semibold"
                            >
                              −
                            </button>
                            <span className="text-xs text-gray-600 min-w-[45px] text-center">{Math.round(previewScale * 100)}%</span>
                            <button
                              onClick={() => setPreviewScale(Math.min(1, previewScale + 0.1))}
                              className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-gray-100 text-sm font-semibold"
                            >
                              +
                            </button>
                          </div>
                        </div>
                        <div 
                          className="overflow-y-auto overflow-x-hidden border-2 rounded-lg bg-gray-50 flex justify-center" 
                          style={{ 
                            maxHeight: 'calc(100vh - 300px)',
                            minHeight: '400px'
                          }}
                        >
                          <div style={{ 
                            transform: `scale(${previewScale})`,
                            transformOrigin: 'top center',
                            width: '850px',
                            margin: '0 auto'
                          }}>
                            <PreviewPanel
                              key={previewKey}
                              data={resumeData}
                              replacements={replacements}
                              template={selectedTemplate}
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* AI Content Wizard */}
                <div className="bg-gradient-to-r from-purple-50 to-pink-50 border border-purple-200 rounded-xl p-4">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="text-lg font-bold text-purple-900 mb-1">🤖 AI Content Wizard</h3>
                      <p className="text-sm text-purple-700">Add new content to your resume with AI assistance</p>
                    </div>
                    <button
                      onClick={() => setShowAIWizard(true)}
                      className="px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg font-semibold hover:shadow-lg transition-all flex items-center gap-2"
                    >
                      ✨ Open AI Wizard
                    </button>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-white rounded-lg p-4 border border-purple-200 text-center">
                      <div className="text-2xl mb-2">💼</div>
                      <h4 className="font-semibold text-gray-900 mb-1">Add Jobs</h4>
                      <p className="text-xs text-gray-600">Add work experience with AI-generated content</p>
                    </div>
                    <div className="bg-white rounded-lg p-4 border border-purple-200 text-center">
                      <div className="text-2xl mb-2">🚀</div>
                      <h4 className="font-semibold text-gray-900 mb-1">Add Projects</h4>
                      <p className="text-xs text-gray-600">Create project entries with technical details</p>
                    </div>
                    <div className="bg-white rounded-lg p-4 border border-purple-200 text-center">
                      <div className="text-2xl mb-2">🛠️</div>
                      <h4 className="font-semibold text-gray-900 mb-1">Add Skills</h4>
                      <p className="text-xs text-gray-600">Generate categorized skills sections</p>
                    </div>
                  </div>

                  <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
                    <p className="text-xs text-blue-700">
                      💡 <strong>How it works:</strong> Tell the AI what you want to add (e.g., "Add a DevOps job at Google with Jenkins and Kubernetes experience"), and it will generate realistic content that fits your resume perfectly.
                      </p>
                    </div>
                  
                </div>


                {/* Cover Letter Generator */}
                <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-xl p-4">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="text-lg font-bold text-green-900 mb-1">📝 Cover Letter Generator</h3>
                      <p className="text-sm text-green-700">Generate tailored cover letters with AI that match your resume to specific job applications</p>
                    </div>
                    <button
                      onClick={() => setShowCoverLetterGenerator(true)}
                      className="px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-lg font-semibold hover:shadow-lg transition-all flex items-center gap-2"
                    >
                      ✨ Generate Cover Letter
                    </button>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-white rounded-lg p-4 border border-green-200 text-center">
                      <div className="text-2xl mb-2">🎯</div>
                      <h4 className="font-semibold text-gray-900 mb-1">Tailored Content</h4>
                      <p className="text-xs text-gray-600">AI matches your experience to job requirements</p>
                    </div>
                    <div className="bg-white rounded-lg p-4 border border-green-200 text-center">
                      <div className="text-2xl mb-2">✏️</div>
                      <h4 className="font-semibold text-gray-900 mb-1">Customizable</h4>
                      <p className="text-xs text-gray-600">Edit each paragraph to your preference</p>
                    </div>
                    <div className="bg-white rounded-lg p-4 border border-green-200 text-center">
                      <div className="text-2xl mb-2">📄</div>
                      <h4 className="font-semibold text-gray-900 mb-1">Export Ready</h4>
                      <p className="text-xs text-gray-600">Export as PDF or DOCX with your resume</p>
                    </div>
                  </div>

                  <div className="mt-4 p-3 bg-green-50 rounded-lg border border-green-200">
                    <p className="text-xs text-green-700">
                      💡 <strong>How it works:</strong> Enter the company name, job title, and job description. Choose your preferred tone (professional, friendly, or concise), and AI will generate a personalized cover letter that highlights your relevant experience.
                    </p>
                  </div>
                </div>
              </div>
          </div>
        )}
      </div>

      {/* Fullscreen Preview Modal */}
      {fullscreenPreview && (
        <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-8">
          <div className="relative w-full h-full max-w-[900px] max-h-full flex flex-col">
            {/* Controls */}
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-white text-lg font-bold">Full Page Preview - {selectedTemplate}</h2>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setPreviewScale(Math.max(0.5, previewScale - 0.1))}
                  className="w-9 h-9 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center text-white text-lg font-semibold"
                >
                  −
                </button>
                <span className="text-white font-semibold min-w-[60px] text-center">{Math.round(previewScale * 100)}%</span>
                <button
                  onClick={() => setPreviewScale(Math.min(1.5, previewScale + 0.1))}
                  className="w-9 h-9 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center text-white text-lg font-semibold"
                >
                  +
                </button>
                <button
                  onClick={() => setFullscreenPreview(false)}
                  className="ml-4 px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-white font-semibold flex items-center gap-2"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  Close
                </button>
              </div>
            </div>
            
            {/* Preview Content */}
            <div className="flex-1 overflow-auto bg-gray-900 rounded-lg p-8 flex justify-center">
              <div 
                className="bg-white shadow-2xl"
                style={{ 
                  transform: `scale(${previewScale})`,
                  transformOrigin: 'top center',
                  width: '850px',
                  margin: '0 auto'
                }}
              >
                <PreviewPanel
                  data={resumeData}
                  replacements={replacements}
                  template={selectedTemplate}
                />
              </div>
            </div>

            {/* Quick Actions */}
            <div className="flex items-center justify-center gap-3 mt-4">
              <button
                onClick={() => handleExport('pdf')}
                disabled={isExporting}
                className="px-6 py-3 bg-primary text-white rounded-lg font-semibold hover:bg-primary-dark disabled:opacity-50 flex items-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Export PDF
              </button>
              <button
                onClick={() => handleExport('docx')}
                disabled={isExporting}
                className="px-6 py-3 bg-white text-gray-900 rounded-lg font-semibold hover:bg-gray-100 disabled:opacity-50 flex items-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Export DOCX
              </button>
            </div>
          </div>
        </div>
      )}

      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        onAuthSuccess={login}
      />

      {/* Cover Letter Generator */}
      {showCoverLetterGenerator && (
        <CoverLetterGenerator
          resumeData={resumeData}
          onClose={() => setShowCoverLetterGenerator(false)}
        />
      )}

      {/* AI Content Wizard */}
      {showAIWizard && (
        <AIWizard
          data={resumeData}
          onAddContent={(newContent) => {
            console.log('=== AI WIZARD ADDING CONTENT ===')
            console.log('New content from AI wizard:', newContent)
            console.log('Content type:', newContent.type)
            console.log('Content data:', newContent.content)
            console.log('Position:', newContent.position)
            console.log('Current resume data before update:', resumeData)
            
            try {
              if (newContent.type === 'job') {
                // Add new job experience
                const workExperienceSection = resumeData.sections.find(s => 
                  s.title.toLowerCase().includes('experience') || 
                  s.title.toLowerCase().includes('work') ||
                  s.title.toLowerCase().includes('employment') ||
                  s.title.toLowerCase().includes('professional')
                )
                
                console.log('Available sections:', resumeData.sections.map(s => s.title))
                console.log('Found work experience section:', workExperienceSection)
                
                if (newContent.content) {
                  let targetSection = workExperienceSection
                  
                  // If no work experience section found, create one
                  if (!targetSection) {
                    console.log('No work experience section found, creating one...')
                    targetSection = {
                      id: Date.now().toString(),
                      title: 'Work Experience',
                      bullets: []
                    }
                    // Add the new section to the beginning of sections array
                    resumeData.sections.unshift(targetSection)
                  }
                  const content = newContent.content
                  const bullets = content.bullets || []
                  
                  console.log('Content bullets:', bullets)
                  
                  console.log('Content validation:', {
                    company: content.company,
                    role: content.role,
                    duration: content.duration,
                    bullets: bullets,
                    fullContent: content
                  })
                  
                  // Handle undefined values with fallbacks
                  const company = content.company || 'Unknown Company'
                  const role = content.role || 'Unknown Role'
                  const duration = content.duration || 'Unknown Duration'
                  
                  console.log('Using fallbacks:', { company, role, duration })
                  
                  const newBullets = [
                    { 
                      id: Date.now().toString(), 
                      text: `**${company} / ${role} / ${duration}**`, 
                      params: {} 
                    },
                    ...bullets.filter(bullet => bullet && bullet.trim()).map((bullet: string) => ({
                      id: Date.now().toString() + Math.random(),
                      text: `• ${bullet}`,
                      params: {}
                    }))
                  ]
                  
                  console.log('New bullets to add:', newBullets)
                  
                  // Clean up existing placeholder entries
                  const cleanExistingBullets = (bullets: any[]) => {
                    return bullets.filter(bullet => 
                      bullet.text && 
                      bullet.text.trim() && 
                      !bullet.text.includes('Company / Role / Duration') &&
                      !bullet.text.includes('**Company**') &&
                      !bullet.text.includes('**Role**') &&
                      !bullet.text.includes('**Duration**')
                    )
                  }
                  
                  const updatedSections = resumeData.sections.map(section => {
                    if (section.id === targetSection.id) {
                      let updatedBullets
                      const cleanedExistingBullets = cleanExistingBullets(section.bullets)
                      
                      if (newContent.position === 'beginning') {
                        updatedBullets = [...newBullets, ...cleanedExistingBullets]
                      } else if (newContent.position === 'middle') {
                        const middleIndex = Math.floor(cleanedExistingBullets.length / 2)
                        const newBulletsList = [...cleanedExistingBullets]
                        newBulletsList.splice(middleIndex, 0, ...newBullets)
                        updatedBullets = newBulletsList
                      } else {
                        updatedBullets = [...cleanedExistingBullets, ...newBullets]
                      }
                      
                      console.log('Updated bullets for section:', updatedBullets)
                      return { ...section, bullets: updatedBullets }
                    }
                    return section
                  })
                  
                  console.log('Updated sections:', updatedSections)
                  const newResumeData = { ...resumeData, sections: updatedSections }
                  console.log('New resume data:', newResumeData)
                  console.log('Calling handleResumeDataChange to update preview...')
                  handleResumeDataChange(newResumeData)
                  console.log('handleResumeDataChange completed')
                } else {
                  console.log('No content provided')
                }
              } else if (newContent.type === 'project') {
                // Add new project
                const projectsSection = resumeData.sections.find(s => 
                  s.title.toLowerCase().includes('project')
                ) || resumeData.sections[0] // fallback to first section
                
                console.log('Found projects section:', projectsSection)
                
                if (newContent.content) {
                  const content = newContent.content
                  const bullets = content.bullets || []
                  
                  const newBullets = [
                    { id: Date.now().toString(), text: `**${content.name || 'Project Name'}**`, params: {} },
                    { id: Date.now().toString() + '1', text: content.description || 'Project description', params: {} },
                    ...bullets.map((bullet: string) => ({
                      id: Date.now().toString() + Math.random(),
                      text: `• ${bullet}`,
                      params: {}
                    }))
                  ]
                  
                  console.log('New project bullets:', newBullets)
                  
                  const updatedSections = resumeData.sections.map(section => {
                    if (section.id === projectsSection.id) {
                      const updatedBullets = [...section.bullets, ...newBullets]
                      console.log('Updated project bullets:', updatedBullets)
                      return { ...section, bullets: updatedBullets }
                    }
                    return section
                  })
                  
                  const newResumeData = { ...resumeData, sections: updatedSections }
                  console.log('New resume data with project:', newResumeData)
                  handleResumeDataChange(newResumeData)
                }
              } else if (newContent.type === 'skill') {
                // Add new skills section
                if (newContent.content && newContent.content.categories) {
                  const categories = newContent.content.categories
                  const skillBullets = Object.entries(categories).map(([category, skills]) => 
                    `**${category}:** ${Array.isArray(skills) ? skills.join(', ') : skills}`
                  )
                  
                  const newSection = {
                    id: Date.now().toString(),
                    title: 'Skills',
                    bullets: skillBullets.map(skill => ({
                      id: Date.now().toString() + Math.random(),
                      text: skill,
                      params: {}
                    }))
                  }
                  
                  console.log('New skills section:', newSection)
                  
                  const newResumeData = { 
                    ...resumeData, 
                    sections: [...resumeData.sections, newSection] 
                  }
                  console.log('New resume data with skills:', newResumeData)
                  handleResumeDataChange(newResumeData)
                }
              } else if (newContent.type === 'education') {
                // Add new education section
                if (newContent.content) {
                  const content = newContent.content
                  const educationBullets = [
                    `**${content.institution || 'Institution'}**`,
                    `${content.degree || 'Degree'} - ${content.year || 'Year'}`,
                    ...(content.coursework || []).map(course => `• ${course}`),
                    ...(content.honors || []).map(honor => `• ${honor}`)
                  ]
                  
                  const newSection = {
                    id: Date.now().toString(),
                    title: 'Education',
                    bullets: educationBullets.map(edu => ({
                      id: Date.now().toString() + Math.random(),
                      text: edu,
                      params: {}
                    }))
                  }
                  
                  console.log('New education section:', newSection)
                  
                  const newResumeData = { 
                    ...resumeData, 
                    sections: [...resumeData.sections, newSection] 
                  }
                  console.log('New resume data with education:', newResumeData)
                  handleResumeDataChange(newResumeData)
                }
              }
              
              setShowAIWizard(false)
            } catch (error) {
              console.error('Error adding content:', error)
              alert('Failed to add content: ' + (error as Error).message)
            }
          }}
          onClose={() => setShowAIWizard(false)}
        />
      )}

      {/* ATS Score Widget */}
      {showATSScore && (
        <ATSScoreWidget
          resumeData={resumeData}
          onClose={() => setShowATSScore(false)}
        />
      )}
    </div>
  )
}

