'use client'
import { useState, useEffect } from 'react'
import { versionControlService, VersionComparison } from '@/lib/services/versionControl'
import PreviewPanel from '@/components/editor/PreviewPanel'

interface VersionComparisonModalProps {
  isOpen: boolean
  onClose: () => void
  version1Id: number
  version2Id: number
}

export default function VersionComparisonModal({ 
  isOpen, 
  onClose, 
  version1Id, 
  version2Id 
}: VersionComparisonModalProps) {
  const [comparison, setComparison] = useState<VersionComparison | null>(null)
  const [version1Data, setVersion1Data] = useState<any>(null)
  const [version2Data, setVersion2Data] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [activeTab, setActiveTab] = useState<'visual' | 'detailed'>('visual')

  useEffect(() => {
    if (isOpen && version1Id && version2Id) {
      loadComparison()
    }
  }, [isOpen, version1Id, version2Id])

  const loadComparison = async () => {
    setLoading(true)
    try {
      // Load comparison data
      const comparisonResult = await versionControlService.compareVersions(version1Id, version2Id)
      setComparison(comparisonResult)
      
      // Load individual version data for visual comparison
      const [v1Data, v2Data] = await Promise.all([
        versionControlService.getVersion(version1Id),
        versionControlService.getVersion(version2Id)
      ])
      
      setVersion1Data(v1Data)
      setVersion2Data(v2Data)
    } catch (error) {
      console.error('Failed to load comparison:', error)
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString()
  }

  const formatResumeDataForPreview = (versionData: any) => {
    return {
      name: versionData.resume_data.personalInfo?.name || '',
      title: versionData.resume_data.personalInfo?.title || '',
      email: versionData.resume_data.personalInfo?.email || '',
      phone: versionData.resume_data.personalInfo?.phone || '',
      location: versionData.resume_data.personalInfo?.location || '',
      summary: versionData.resume_data.summary || '',
      sections: versionData.resume_data.sections || []
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-7xl w-full max-h-[90vh] overflow-hidden">
        <div className="p-4 border-b">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">Version Comparison</h2>
            <div className="flex items-center space-x-4">
              <div className="flex space-x-2">
                <button
                  onClick={() => setActiveTab('visual')}
                  className={`px-3 py-1 rounded text-sm ${
                    activeTab === 'visual' 
                      ? 'bg-blue-600 text-white' 
                      : 'bg-gray-200 text-gray-700'
                  }`}
                >
                  Visual Comparison
                </button>
                <button
                  onClick={() => setActiveTab('detailed')}
                  className={`px-3 py-1 rounded text-sm ${
                    activeTab === 'detailed' 
                      ? 'bg-blue-600 text-white' 
                      : 'bg-gray-200 text-gray-700'
                  }`}
                >
                  Detailed Changes
                </button>
              </div>
              <button
                onClick={onClose}
                className="text-gray-500 hover:text-gray-700"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        </div>

        <div className="overflow-y-auto max-h-[calc(90vh-80px)]">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <span className="ml-3 text-gray-600">Loading comparison...</span>
            </div>
          ) : activeTab === 'visual' && version1Data && version2Data ? (
            <div className="p-4">
              {/* Version Headers */}
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="p-4 bg-blue-50 rounded-lg">
                  <h3 className="font-semibold text-blue-900">
                    Version {version1Data.version_number}
                  </h3>
                  <p className="text-sm text-blue-700">
                    {version1Data.change_summary || 'No description'}
                  </p>
                  <p className="text-xs text-blue-600 mt-1">
                    {formatDate(version1Data.created_at)}
                  </p>
                </div>
                <div className="p-4 bg-green-50 rounded-lg">
                  <h3 className="font-semibold text-green-900">
                    Version {version2Data.version_number}
                  </h3>
                  <p className="text-sm text-green-700">
                    {version2Data.change_summary || 'No description'}
                  </p>
                  <p className="text-xs text-green-600 mt-1">
                    {formatDate(version2Data.created_at)}
                  </p>
                </div>
              </div>

              {/* Side-by-side Resume Previews */}
              <div className="grid grid-cols-2 gap-4">
                <div className="border rounded-lg overflow-hidden">
                  <div className="p-3 bg-blue-50 border-b">
                    <h4 className="font-medium text-blue-900">Version {version1Data.version_number}</h4>
                  </div>
                  <div className="p-4">
                    <PreviewPanel
                      data={formatResumeDataForPreview(version1Data)}
                      template="tech"
                      replacements={{}}
                      key={`version-1-${version1Id}`}
                    />
                  </div>
                </div>
                <div className="border rounded-lg overflow-hidden">
                  <div className="p-3 bg-green-50 border-b">
                    <h4 className="font-medium text-green-900">Version {version2Data.version_number}</h4>
                  </div>
                  <div className="p-4">
                    <PreviewPanel
                      data={formatResumeDataForPreview(version2Data)}
                      template="tech"
                      replacements={{}}
                      key={`version-2-${version2Id}`}
                    />
                  </div>
                </div>
              </div>
            </div>
          ) : activeTab === 'detailed' && comparison ? (
            <div className="p-4">
              {/* Version Headers */}
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="p-4 bg-blue-50 rounded-lg">
                  <h3 className="font-semibold text-blue-900">
                    Version {comparison.version1.version_number}
                  </h3>
                  <p className="text-sm text-blue-700">
                    {comparison.version1.change_summary || 'No description'}
                  </p>
                  <p className="text-xs text-blue-600 mt-1">
                    {formatDate(comparison.version1.created_at)}
                  </p>
                </div>
                <div className="p-4 bg-green-50 rounded-lg">
                  <h3 className="font-semibold text-green-900">
                    Version {comparison.version2.version_number}
                  </h3>
                  <p className="text-sm text-green-700">
                    {comparison.version2.change_summary || 'No description'}
                  </p>
                  <p className="text-xs text-green-600 mt-1">
                    {formatDate(comparison.version2.created_at)}
                  </p>
                </div>
              </div>

              {/* Personal Info Changes */}
              {Object.keys(comparison.differences.personal_info).length > 0 && (
                <div className="mb-6">
                  <h4 className="text-lg font-semibold mb-3 text-gray-800">Personal Information</h4>
                  <div className="space-y-3">
                    {Object.entries(comparison.differences.personal_info).map(([field, change]) => (
                      <div key={field} className="p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-medium capitalize">{field.replace(/([A-Z])/g, ' $1')}</span>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div className="p-2 bg-red-50 rounded border-l-4 border-red-400">
                            <p className="text-xs text-red-600 font-medium mb-1">Old Value</p>
                            <p className="text-sm">{change.old || 'Empty'}</p>
                          </div>
                          <div className="p-2 bg-green-50 rounded border-l-4 border-green-400">
                            <p className="text-xs text-green-600 font-medium mb-1">New Value</p>
                            <p className="text-sm">{change.new || 'Empty'}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Summary Changes */}
              {comparison.differences.summary && (
                <div className="mb-6">
                  <h4 className="text-lg font-semibold mb-3 text-gray-800">Summary</h4>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3 bg-red-50 rounded-lg border-l-4 border-red-400">
                      <p className="text-xs text-red-600 font-medium mb-2">Old Summary</p>
                      <p className="text-sm whitespace-pre-wrap">
                        {comparison.differences.summary.old || 'Empty'}
                      </p>
                    </div>
                    <div className="p-3 bg-green-50 rounded-lg border-l-4 border-green-400">
                      <p className="text-xs text-green-600 font-medium mb-2">New Summary</p>
                      <p className="text-sm whitespace-pre-wrap">
                        {comparison.differences.summary.new || 'Empty'}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Section Changes */}
              {Object.keys(comparison.differences.sections).length > 0 && (
                <div className="mb-6">
                  <h4 className="text-lg font-semibold mb-3 text-gray-800">Sections</h4>
                  <div className="space-y-3">
                    {Object.entries(comparison.differences.sections).map(([section, change]) => (
                      <div key={section} className="p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-medium capitalize">{section}</span>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div className="p-2 bg-red-50 rounded border-l-4 border-red-400">
                            <p className="text-xs text-red-600 font-medium mb-1">Old Value</p>
                            <p className="text-sm">{JSON.stringify(change.old)}</p>
                          </div>
                          <div className="p-2 bg-green-50 rounded border-l-4 border-green-400">
                            <p className="text-xs text-green-600 font-medium mb-1">New Value</p>
                            <p className="text-sm">{JSON.stringify(change.new)}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* No Changes */}
              {Object.keys(comparison.differences.personal_info).length === 0 && 
               !comparison.differences.summary && 
               Object.keys(comparison.differences.sections).length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  <p>No differences found between these versions</p>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-12 text-gray-500">
              <p>Failed to load comparison</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
