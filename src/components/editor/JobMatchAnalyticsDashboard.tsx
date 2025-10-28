'use client'
import { useState, useEffect } from 'react'
import { jobMatchAnalyticsService, JobMatchAnalytics, JobMatchDetails } from '@/lib/services/jobMatchAnalytics'
import { useAuth } from '@/contexts/AuthContext'

interface JobMatchAnalyticsDashboardProps {
  isOpen: boolean
  onClose: () => void
}

export default function JobMatchAnalyticsDashboard({ isOpen, onClose }: JobMatchAnalyticsDashboardProps) {
  const { user } = useAuth()
  const [analytics, setAnalytics] = useState<JobMatchAnalytics | null>(null)
  const [selectedMatch, setSelectedMatch] = useState<JobMatchDetails | null>(null)
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
      const data = await jobMatchAnalyticsService.getJobMatchAnalytics()
      setAnalytics(data)
    } catch (err) {
      setError('Failed to load analytics')
      console.error('Failed to load analytics:', err)
    } finally {
      setLoading(false)
    }
  }

  const loadMatchDetails = async (matchId: number) => {
    try {
      const details = await jobMatchAnalyticsService.getJobMatchDetails(matchId)
      setSelectedMatch(details)
    } catch (err) {
      console.error('Failed to load match details:', err)
    }
  }

  const formatDate = (dateString: string) => jobMatchAnalyticsService.formatDate(dateString)
  const formatDateShort = (dateString: string) => jobMatchAnalyticsService.formatDateShort(dateString)
  const getScoreColor = (score: number) => jobMatchAnalyticsService.getScoreColor(score)
  const getScoreLabel = (score: number) => jobMatchAnalyticsService.getScoreLabel(score)

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-6xl w-full max-h-[90vh] overflow-hidden">
        <div className="p-4 border-b">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">Job Match Analytics</h2>
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
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-blue-50 p-4 rounded-lg">
                  <div className="text-2xl font-bold text-blue-600">{analytics.total_matches}</div>
                  <div className="text-sm text-blue-800">Total Matches</div>
                </div>
                <div className="bg-green-50 p-4 rounded-lg">
                  <div className="text-2xl font-bold text-green-600">{analytics.average_score}%</div>
                  <div className="text-sm text-green-800">Average Score</div>
                </div>
                <div className="bg-purple-50 p-4 rounded-lg">
                  <div className="text-2xl font-bold text-purple-600">{analytics.top_missing_keywords.length}</div>
                  <div className="text-sm text-purple-800">Missing Keywords Tracked</div>
                </div>
              </div>

              {/* Score Trend Chart */}
              {analytics.score_trend.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold mb-3">Score Trend (Last 10 Matches)</h3>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="flex items-end space-x-2 h-32">
                      {analytics.score_trend.map((point, index) => (
                        <div key={index} className="flex-1 flex flex-col items-center">
                          <div
                            className="w-full bg-blue-500 rounded-t"
                            style={{ height: `${(point.score / 100) * 100}px` }}
                            title={`${point.resume_name}: ${point.score}%`}
                          ></div>
                          <div className="text-xs text-gray-600 mt-1 text-center">
                            {formatDateShort(point.date)}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Top Missing Keywords */}
              {analytics.top_missing_keywords.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold mb-3">Most Missing Keywords</h3>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {analytics.top_missing_keywords.map((item, index) => (
                      <div key={index} className="bg-red-50 p-3 rounded-lg">
                        <div className="font-medium text-red-800">{item.keyword}</div>
                        <div className="text-sm text-red-600">{item.count} times missing</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Improvement Areas */}
              {analytics.improvement_areas.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold mb-3">Common Improvement Areas</h3>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {analytics.improvement_areas.map((area, index) => (
                      <div key={index} className="bg-yellow-50 p-3 rounded-lg">
                        <div className="font-medium text-yellow-800">{area.area}</div>
                        <div className="text-sm text-yellow-600">{area.count} suggestions</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Recent Matches */}
              <div>
                <h3 className="text-lg font-semibold mb-3">Recent Job Matches</h3>
                {analytics.matches.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <p>No job matches found</p>
                    <p className="text-sm">Start matching your resume with job descriptions to see analytics</p>
                  </div>
                ) : (
                  <div className="bg-gray-50 rounded-lg overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead className="bg-gray-100">
                          <tr>
                            <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Resume</th>
                            <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Score</th>
                            <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Keywords</th>
                            <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Date</th>
                            <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                          {analytics.matches.map((match) => (
                            <tr key={match.id} className="hover:bg-gray-50">
                              <td className="px-4 py-3 text-sm text-gray-900">
                                {match.resume_name}
                              </td>
                              <td className="px-4 py-3 text-sm">
                                <span className={`px-2 py-1 rounded text-xs font-medium ${getScoreColor(match.match_score)}`}>
                                  {match.match_score}% - {getScoreLabel(match.match_score)}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-sm text-gray-900">
                                <div className="flex space-x-1">
                                  <span className="text-green-600">{match.keyword_matches.length} matched</span>
                                  <span className="text-gray-400">•</span>
                                  <span className="text-red-600">{match.missing_keywords.length} missing</span>
                                </div>
                              </td>
                              <td className="px-4 py-3 text-sm text-gray-900">
                                {formatDateShort(match.created_at)}
                              </td>
                              <td className="px-4 py-3 text-sm">
                                <button
                                  onClick={() => loadMatchDetails(match.id)}
                                  className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-sm hover:bg-blue-200"
                                >
                                  View Details
                                </button>
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

        {/* Match Details Modal */}
        {selectedMatch && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-60 flex items-center justify-center p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
              <div className="p-4 border-b">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold">Job Match Details</h3>
                  <button
                    onClick={() => setSelectedMatch(null)}
                    className="text-gray-500 hover:text-gray-700"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>
              <div className="p-4 overflow-y-auto max-h-[calc(90vh-80px)]">
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-blue-50 p-3 rounded-lg">
                      <div className="text-sm text-blue-600 font-medium">Match Score</div>
                      <div className={`text-2xl font-bold ${getScoreColor(selectedMatch.match_score).split(' ')[0]}`}>
                        {selectedMatch.match_score}%
                      </div>
                    </div>
                    <div className="bg-gray-50 p-3 rounded-lg">
                      <div className="text-sm text-gray-600 font-medium">Date</div>
                      <div className="text-lg">{formatDate(selectedMatch.created_at)}</div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <h4 className="font-medium text-green-800 mb-2">Matched Keywords</h4>
                      <div className="space-y-1">
                        {selectedMatch.keyword_matches.map((keyword, index) => (
                          <span key={index} className="inline-block px-2 py-1 bg-green-100 text-green-800 text-sm rounded mr-1 mb-1">
                            {keyword}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div>
                      <h4 className="font-medium text-red-800 mb-2">Missing Keywords</h4>
                      <div className="space-y-1">
                        {selectedMatch.missing_keywords.map((keyword, index) => (
                          <span key={index} className="inline-block px-2 py-1 bg-red-100 text-red-800 text-sm rounded mr-1 mb-1">
                            {keyword}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div>
                    <h4 className="font-medium mb-2">Job Description</h4>
                    <div className="bg-gray-50 p-3 rounded-lg text-sm whitespace-pre-wrap">
                      {selectedMatch.job_description}
                    </div>
                  </div>

                  {selectedMatch.improvement_suggestions.length > 0 && (
                    <div>
                      <h4 className="font-medium mb-2">Improvement Suggestions</h4>
                      <div className="space-y-2">
                        {selectedMatch.improvement_suggestions.map((suggestion, index) => (
                          <div key={index} className="bg-yellow-50 p-3 rounded-lg">
                            {typeof suggestion === 'string' ? (
                              <p className="text-sm">{suggestion}</p>
                            ) : (
                              <div>
                                <div className="font-medium text-sm">{suggestion.category}</div>
                                <div className="text-sm">{suggestion.suggestion}</div>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

