'use client'
import { useState, useEffect } from 'react'
import { versionControlService, ResumeVersion, ResumeVersionData } from '@/lib/services/versionControl'
import { useAuth } from '@/contexts/AuthContext'
import { shouldPromptAuthentication } from '@/lib/guestAuth'
import { Skeleton, SkeletonText } from '@/components/Shared/Skeleton'

interface VersionControlPanelProps {
  resumeId?: number
  resumeData: any
  onVersionLoad: (data: any) => void
  onSaveVersion: (changeSummary: string) => void
  onCompareVersions?: (version1Id: number, version2Id: number) => void
}

export default function VersionControlPanel({ 
  resumeId, 
  resumeData, 
  onVersionLoad, 
  onSaveVersion,
  onCompareVersions
}: VersionControlPanelProps) {
  const { user, isAuthenticated } = useAuth()
  const [versions, setVersions] = useState<ResumeVersion[]>([])
  const [loading, setLoading] = useState(false)
  const [showCreateVersion, setShowCreateVersion] = useState(false)
  const [changeSummary, setChangeSummary] = useState('')
  const [selectedVersions, setSelectedVersions] = useState<number[]>([])

  useEffect(() => {
    if (resumeId) {
      loadVersions()
    }
  }, [resumeId])

  const loadVersions = async () => {
    if (!resumeId) return
    
    setLoading(true)
    try {
      const versionsData = await versionControlService.getResumeVersions(resumeId)
      setVersions(versionsData)
    } catch (error) {
      console.error('Failed to load versions:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleCreateVersion = async () => {
    if (!resumeId) return
    
    setLoading(true)
    try {
      await versionControlService.createVersion(
        resumeId, 
        resumeData, 
        changeSummary || 'Manual save',
        false
      )
      setChangeSummary('')
      setShowCreateVersion(false)
      await loadVersions()
      onSaveVersion(changeSummary || 'Manual save')
    } catch (error) {
      console.error('Failed to create version:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleLoadVersion = async (versionId: number) => {
    setLoading(true)
    try {
      const versionData = await versionControlService.getVersion(versionId)
      onVersionLoad(versionData.resume_data)
    } catch (error) {
      console.error('Failed to load version:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleRollback = async (versionId: number) => {
    if (!confirm('Are you sure you want to rollback to this version? This will create a new version with the old data.')) {
      return
    }
    
    setLoading(true)
    try {
      await versionControlService.rollbackToVersion(versionId)
      await loadVersions()
    } catch (error) {
      console.error('Failed to rollback version:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteVersion = async (versionId: number) => {
    if (!confirm('Are you sure you want to delete this version?')) {
      return
    }
    
    setLoading(true)
    try {
      await versionControlService.deleteVersion(versionId)
      await loadVersions()
    } catch (error) {
      console.error('Failed to delete version:', error)
    } finally {
      setLoading(false)
    }
  }

  const toggleVersionSelection = (versionId: number) => {
    setSelectedVersions(prev => 
      prev.includes(versionId) 
        ? prev.filter(id => id !== versionId)
        : [...prev, versionId]
    )
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString()
  }

  if (!user) {
    return (
      <div className="p-4 bg-gray-50 rounded-lg">
        <p className="text-gray-600">Please log in to use version control</p>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border">
      <div className="p-4 border-b">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">Version Control</h3>
          <button
            onClick={() => setShowCreateVersion(true)}
            className="px-3 py-1 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm"
            disabled={loading || !resumeId}
          >
            Save Version
          </button>
        </div>
      </div>

      {showCreateVersion && (
        <div className="p-4 border-b bg-gray-50">
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Change Summary
              </label>
              <input
                type="text"
                value={changeSummary}
                onChange={(e) => setChangeSummary(e.target.value)}
                placeholder="Describe what changed..."
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleCreateVersion}
                className="px-3 py-1 bg-green-600 text-white rounded-md hover:bg-green-700 text-sm"
                disabled={loading}
              >
                Create Version
              </button>
              <button
                onClick={() => {
                  setShowCreateVersion(false)
                  setChangeSummary('')
                }}
                className="px-3 py-1 bg-gray-500 text-white rounded-md hover:bg-gray-600 text-sm"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="p-4">
        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="p-4 bg-white rounded-lg border border-gray-200">
                <Skeleton variant="rounded" height={20} width="60%" className="mb-2" />
                <SkeletonText lines={2} />
              </div>
            ))}
          </div>
        ) : versions.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <p>No versions saved yet</p>
            <p className="text-sm">Create your first version to start tracking changes</p>
          </div>
        ) : (
          <div className="space-y-2">
            {versions.map((version) => (
              <div
                key={version.id}
                className={`p-3 border rounded-lg ${
                  selectedVersions.includes(version.id) ? 'bg-blue-50 border-blue-200' : 'bg-gray-50'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <input
                      type="checkbox"
                      checked={selectedVersions.includes(version.id)}
                      onChange={() => toggleVersionSelection(version.id)}
                      className="rounded"
                    />
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="font-medium">
                          Version {version.version_number}
                        </span>
                        {version.is_auto_save && (
                          <span className="px-2 py-1 bg-yellow-100 text-yellow-800 text-xs rounded">
                            Auto-save
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-600">
                        {version.change_summary || 'No description'}
                      </p>
                      <p className="text-xs text-gray-500">
                        {formatDate(version.created_at)}
                      </p>
                    </div>
                  </div>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => handleLoadVersion(version.id)}
                      className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-sm hover:bg-blue-200"
                    >
                      Load
                    </button>
                    <button
                      onClick={async () => {
                        try {
                          let apiBase = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:8000'
                          apiBase = apiBase.replace(/\/$/, '')
                          // Always require authentication for exports (for marketing/email collection)
                          if (!isAuthenticated || !user?.email) {
                            alert('Please sign in to export resumes')
                            return
                          }
                          const userEmail = user.email
                        
                          // Fetch version data
                          const versionRes = await fetch(`${apiBase}/api/resume/version/${version.id}?user_email=${encodeURIComponent(userEmail)}`)
                          if (!versionRes.ok) {
                            throw new Error('Failed to fetch version data')
                          }
                          
                          const versionData = await versionRes.json()
                          const resumeData = versionData.version.resume_data
                          
                          // Export as PDF
                          const exportUrl = `${apiBase}/api/resume/export/pdf?user_email=${encodeURIComponent(userEmail)}`
                          const exportResponse = await fetch(exportUrl, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                              name: resumeData.personalInfo?.name || resumeData.name || 'Resume',
                              title: resumeData.personalInfo?.title || resumeData.title || '',
                              email: resumeData.personalInfo?.email || resumeData.email || '',
                              phone: resumeData.personalInfo?.phone || resumeData.phone || '',
                              location: resumeData.personalInfo?.location || resumeData.location || '',
                              summary: resumeData.summary || '',
                              sections: resumeData.sections || [],
                              replacements: {},
                              template: resumeData.template || 'tech',
                              two_column_left: [],
                              two_column_right: [],
                              two_column_left_width: 50
                            })
                          })
                          
                          if (exportResponse.ok) {
                            const blob = await exportResponse.blob()
                            const url = window.URL.createObjectURL(blob)
                            const a = document.createElement('a')
                            a.href = url
                            a.download = `Resume_v${version.version_number}.pdf`
                            document.body.appendChild(a)
                            a.click()
                            document.body.removeChild(a)
                            window.URL.revokeObjectURL(url)
                          } else {
                            throw new Error(`Export failed: ${exportResponse.status}`)
                          }
                        } catch (error) {
                          console.error('Failed to export version:', error)
                          alert(`Failed to export version: ${error instanceof Error ? error.message : 'Unknown error'}`)
                        }
                      }}
                      className="px-2 py-1 bg-green-100 text-green-700 rounded text-sm hover:bg-green-200"
                      title="Export as PDF"
                    >
                      📄 PDF
                    </button>
                    <button
                      onClick={() => handleRollback(version.id)}
                      className="px-2 py-1 bg-orange-100 text-orange-700 rounded text-sm hover:bg-orange-200"
                    >
                      Rollback
                    </button>
                    {versions.length > 1 && (
                      <button
                        onClick={() => handleDeleteVersion(version.id)}
                        className="px-2 py-1 bg-red-100 text-red-700 rounded text-sm hover:bg-red-200"
                      >
                        Delete
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {selectedVersions.length === 2 && (
        <div className="p-4 border-t bg-gray-50">
          <button
            onClick={() => {
              if (onCompareVersions && selectedVersions.length === 2) {
                onCompareVersions(selectedVersions[0], selectedVersions[1])
                setSelectedVersions([])
              }
            }}
            className="w-full px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700"
          >
            Compare Selected Versions
          </button>
        </div>
      )}
    </div>
  )
}
