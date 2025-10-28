'use client'
import { useState, useEffect } from 'react'
import { exportAnalyticsService, ExportAnalytics, ExportRecord } from '@/lib/services/exportAnalytics'
import { useAuth } from '@/contexts/AuthContext'

interface ExportAnalyticsDashboardProps {
  isOpen: boolean
  onClose: () => void
}

export default function ExportAnalyticsDashboard({ isOpen, onClose }: ExportAnalyticsDashboardProps) {
  const { user } = useAuth()
  const [analytics, setAnalytics] = useState<ExportAnalytics | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (isOpen && user) {
      loadAnalytics()
    }
  }, [isOpen, user])

  const loadAnalytics = async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await exportAnalyticsService.getExportAnalytics()
      setAnalytics(data)
    } catch (err) {
      setError('Failed to load analytics')
      console.error('Failed to load analytics:', err)
    } finally {
      setLoading(false)
    }
  }

  const formatFileSize = (bytes: number) => exportAnalyticsService.formatFileSize(bytes)
  const formatDate = (dateString: string) => exportAnalyticsService.formatDate(dateString)

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-6xl w-full max-h-[90vh] overflow-hidden">
        <div className="p-4 border-b">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">Export Analytics</h2>
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

        <div className="overflow-y-auto max-h-[calc(90vh-80px)] p-4">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <span className="ml-3 text-gray-600">Loading analytics...</span>
            </div>
          ) : error ? (
            <div className="text-center py-12 text-red-600">
              <p>{error}</p>
              <button
                onClick={loadAnalytics}
                className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                Retry
              </button>
            </div>
          ) : analytics ? (
            <div className="space-y-6">
              {/* Summary Cards */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-blue-50 p-4 rounded-lg">
                  <div className="text-2xl font-bold text-blue-600">{analytics.total_exports}</div>
                  <div className="text-sm text-blue-800">Total Exports</div>
                </div>
                <div className="bg-red-50 p-4 rounded-lg">
                  <div className="text-2xl font-bold text-red-600">{analytics.pdf_exports}</div>
                  <div className="text-sm text-red-800">PDF Exports</div>
                </div>
                <div className="bg-green-50 p-4 rounded-lg">
                  <div className="text-2xl font-bold text-green-600">{analytics.docx_exports}</div>
                  <div className="text-sm text-green-800">DOCX Exports</div>
                </div>
                <div className="bg-purple-50 p-4 rounded-lg">
                  <div className="text-2xl font-bold text-purple-600">{analytics.recent_exports}</div>
                  <div className="text-sm text-purple-800">Last 30 Days</div>
                </div>
              </div>

              {/* Template Usage */}
              {Object.keys(analytics.template_usage).length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold mb-3">Template Usage</h3>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {Object.entries(analytics.template_usage).map(([template, count]) => (
                      <div key={template} className="bg-gray-50 p-3 rounded-lg">
                        <div className="font-medium capitalize">{template}</div>
                        <div className="text-sm text-gray-600">{count} exports</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Export History */}
              <div>
                <h3 className="text-lg font-semibold mb-3">Export History</h3>
                {analytics.exports.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <p>No exports found</p>
                    <p className="text-sm">Start exporting resumes to see analytics</p>
                  </div>
                ) : (
                  <div className="bg-gray-50 rounded-lg overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead className="bg-gray-100">
                          <tr>
                            <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Resume</th>
                            <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Format</th>
                            <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Template</th>
                            <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Size</th>
                            <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Date</th>
                            <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                          {analytics.exports.map((export_record) => (
                            <tr key={export_record.id} className="hover:bg-gray-50">
                              <td className="px-4 py-3 text-sm text-gray-900">
                                {export_record.resume_name}
                              </td>
                              <td className="px-4 py-3 text-sm">
                                <span className={`px-2 py-1 rounded text-xs font-medium ${
                                  export_record.format === 'pdf' 
                                    ? 'bg-red-100 text-red-800' 
                                    : 'bg-green-100 text-green-800'
                                }`}>
                                  {export_record.format.toUpperCase()}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-sm text-gray-900 capitalize">
                                {export_record.template}
                              </td>
                              <td className="px-4 py-3 text-sm text-gray-900">
                                {formatFileSize(export_record.file_size)}
                              </td>
                              <td className="px-4 py-3 text-sm text-gray-900">
                                {formatDate(export_record.created_at)}
                              </td>
                              <td className="px-4 py-3 text-sm">
                                <span className={`px-2 py-1 rounded text-xs font-medium ${
                                  export_record.success 
                                    ? 'bg-green-100 text-green-800' 
                                    : 'bg-red-100 text-red-800'
                                }`}>
                                  {export_record.success ? 'Success' : 'Failed'}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="text-center py-12 text-gray-500">
              <p>No analytics data available</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

