'use client'
import { useState, useEffect } from 'react'

import config from '@/lib/config';
interface Comment {
  id: number
  commenter_name: string
  commenter_email?: string
  text: string
  target_type: string
  target_id: string
  resolved: boolean
  created_at: string
}

interface Props {
  shareToken: string
  targetType?: string
  targetId?: string
}

export default function SharedResumeComments({ shareToken, targetType = 'resume', targetId = 'resume' }: Props) {
  const [comments, setComments] = useState<Comment[]>([])
  const [showInput, setShowInput] = useState(false)
  const [commentText, setCommentText] = useState('')
  const [commenterName, setCommenterName] = useState('')
  const [commenterEmail, setCommenterEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadComments()
  }, [shareToken, targetType, targetId])

  const loadComments = async () => {
    try {
      const response = await fetch(
        `${config.apiBase}/api/resume/shared/${shareToken}/comments`
      )
      const data = await response.json()
      
      if (data.success) {
        // Filter comments by target if specified
        const filteredComments = targetType && targetId 
          ? data.comments.filter((c: Comment) => c.target_type === targetType && c.target_id === targetId)
          : data.comments
        setComments(filteredComments)
      }
    } catch (error) {
      console.error('Failed to load comments:', error)
      setError('Failed to load comments')
    }
  }

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!commentText.trim() || !commenterName.trim()) return

    setLoading(true)
    setError(null)

    try {
      const response = await fetch(
        `${config.apiBase}/api/resume/shared/${shareToken}/comments`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            commenter_name: commenterName,
            commenter_email: commenterEmail || undefined,
            text: commentText,
            target_type: targetType,
            target_id: targetId
          })
        }
      )

      const data = await response.json()
      
      if (data.success) {
        setComments(prev => [data.comment, ...prev])
        setCommentText('')
        setShowInput(false)
      } else {
        setError('Failed to add comment')
      }
    } catch (error) {
      console.error('Failed to add comment:', error)
      setError('Failed to add comment')
    } finally {
      setLoading(false)
    }
  }

  const handleResolveComment = async (commentId: number) => {
    try {
      const response = await fetch(
        `${config.apiBase}/api/resume/shared/${shareToken}/comments/${commentId}/resolve`,
        { method: 'POST' }
      )

      if (response.ok) {
        setComments(prev => prev.map(c => 
          c.id === commentId ? { ...c, resolved: true } : c
        ))
      }
    } catch (error) {
      console.error('Failed to resolve comment:', error)
    }
  }

  const handleDeleteComment = async (commentId: number) => {
    if (!confirm('Are you sure you want to delete this comment?')) return

    try {
      const response = await fetch(
        `${config.apiBase}/api/resume/shared/${shareToken}/comments/${commentId}`,
        { method: 'DELETE' }
      )

      if (response.ok) {
        setComments(prev => prev.filter(c => c.id !== commentId))
      }
    } catch (error) {
      console.error('Failed to delete comment:', error)
    }
  }

  return (
    <div className="bg-white rounded-lg border p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">Comments ({comments.length})</h3>
        <button
          onClick={() => setShowInput(!showInput)}
          className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
        >
          {showInput ? 'Cancel' : 'Add Comment'}
        </button>
      </div>

      {showInput && (
        <form onSubmit={handleAddComment} className="mb-6 p-4 bg-gray-50 rounded-lg">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Your Name *
              </label>
              <input
                type="text"
                value={commenterName}
                onChange={(e) => setCommenterName(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter your name"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email (optional)
              </label>
              <input
                type="email"
                value={commenterEmail}
                onChange={(e) => setCommenterEmail(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="your@email.com"
              />
            </div>
          </div>
          
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Comment *
            </label>
            <textarea
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows={3}
              placeholder="Add your feedback or suggestion..."
              required
            />
          </div>

          {error && (
            <div className="text-red-600 text-sm mb-4">{error}</div>
          )}

          <div className="flex gap-2">
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? 'Adding...' : 'Add Comment'}
            </button>
            <button
              type="button"
              onClick={() => setShowInput(false)}
              className="px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      <div className="space-y-4">
        {comments.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <svg className="w-12 h-12 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            <p>No comments yet. Be the first to leave feedback!</p>
          </div>
        ) : (
          comments.map((comment) => (
            <div
              key={comment.id}
              className={`p-4 rounded-lg border ${
                comment.resolved 
                  ? 'bg-green-50 border-green-200' 
                  : 'bg-gray-50 border-gray-200'
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="font-medium text-gray-900">
                      {comment.commenter_name}
                    </span>
                    {comment.resolved && (
                      <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded">
                        Resolved
                      </span>
                    )}
                    <span className="text-sm text-gray-500">
                      {new Date(comment.created_at).toLocaleString()}
                    </span>
                  </div>
                  <p className="text-gray-700 whitespace-pre-wrap">{comment.text}</p>
                </div>
                
                <div className="flex gap-2 ml-4">
                  {!comment.resolved && (
                    <button
                      onClick={() => handleResolveComment(comment.id)}
                      className="px-2 py-1 text-green-600 hover:bg-green-100 rounded text-sm"
                      title="Mark as resolved"
                    >
                      ✓
                    </button>
                  )}
                  <button
                    onClick={() => handleDeleteComment(comment.id)}
                    className="px-2 py-1 text-red-600 hover:bg-red-100 rounded text-sm"
                    title="Delete comment"
                  >
                    ×
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
