'use client'
import { useState, useEffect } from 'react'
import config from '@/lib/config';
import { useCollaboration } from '@/hooks/useCollaboration'

interface Comment {
  id: string
  user_name: string
  text: string
  timestamp: string
  target_type: string
  target_id: string
  resolved: boolean
}

interface Props {
  roomId: string | null
  targetType: string
  targetId: string
  onAddComment: (text: string, targetType: string, targetId: string) => void
  onResolveComment: (commentId: string) => void
  onDeleteComment: (commentId: string) => void
}

export default function Comments({ 
  roomId, 
  targetType, 
  targetId, 
  onAddComment, 
  onResolveComment, 
  onDeleteComment 
}: Props) {
  const [comments, setComments] = useState<Comment[]>([])
  const [showInput, setShowInput] = useState(false)
  const [commentText, setCommentText] = useState('')
  const [loading, setLoading] = useState(false)
  const collaboration = useCollaboration()

  useEffect(() => {
    if (roomId) {
      loadComments()
    }
  }, [roomId, targetId])

  // Set up real-time comment updates
  useEffect(() => {
    if (roomId) {
      collaboration.onCommentAdded((comment) => {
        if (comment.target_id === targetId) {
          setComments(prev => [...prev, comment])
        }
      })

      collaboration.onCommentResolved((commentId) => {
        setComments(prev => prev.map(c => 
          c.id === commentId ? { ...c, resolved: true } : c
        ))
      })

      collaboration.onCommentDeleted((commentId) => {
        setComments(prev => prev.filter(c => c.id !== commentId))
      })
    }
  }, [roomId, targetId, collaboration])

  const loadComments = async () => {
    if (!roomId) return
    try {
      const response = await fetch(
        `${config.apiBase}/api/collab/room/${roomId}/comments?target_id=${targetId}`
      )
      const data = await response.json()
      setComments(data.comments || [])
    } catch (error) {
      console.error('Failed to load comments:', error)
    }
  }

  const handleAddComment = async () => {
    if (!commentText.trim() || !roomId) return
    
    setLoading(true)
    try {
      // Use collaboration hook for real-time updates
      collaboration.addComment(commentText, targetType, targetId)
      onAddComment(commentText, targetType, targetId)
      setCommentText('')
      setShowInput(false)
    } catch (error) {
      console.error('Failed to add comment:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleResolveComment = (commentId: string) => {
    collaboration.resolveComment(commentId)
    onResolveComment(commentId)
  }

  const handleDeleteComment = (commentId: string) => {
    collaboration.deleteComment(commentId)
    onDeleteComment(commentId)
  }

  const activeComments = comments.filter(c => !c.resolved)
  const resolvedComments = comments.filter(c => c.resolved)

  return (
    <div className="space-y-3">
      {activeComments.length > 0 && (
        <div className="space-y-3">
          {activeComments.map(comment => (
            <div key={comment.id} className="bg-yellow-50 border-2 border-yellow-300 rounded-lg p-4 text-sm shadow-sm">
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-yellow-500 rounded-full flex items-center justify-center text-white font-bold text-sm touch-target">
                    {comment.user_name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div className="font-bold text-gray-900 text-sm">{comment.user_name}</div>
                    <div className="text-xs text-gray-500">
                      {new Date(comment.timestamp).toLocaleString()}
                    </div>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleResolveComment(comment.id)}
                    className="text-xs px-3 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors touch-target"
                    title="Mark as resolved"
                  >
                    ✓ Resolve
                  </button>
                  <button
                    onClick={() => handleDeleteComment(comment.id)}
                    className="text-xs px-3 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors touch-target"
                    title="Delete"
                  >
                    × Delete
                  </button>
                </div>
              </div>
              <p className="text-gray-700 whitespace-pre-wrap leading-relaxed">{comment.text}</p>
            </div>
          ))}
        </div>
      )}

      {resolvedComments.length > 0 && (
        <details className="text-sm">
          <summary className="cursor-pointer text-gray-500 hover:text-gray-700 py-2 px-3 bg-gray-100 rounded-lg touch-target">
            <div className="flex items-center gap-2">
              <span className="text-green-600">✓</span>
              <span>{resolvedComments.length} resolved comments</span>
              <svg className="w-4 h-4 ml-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </summary>
          <div className="mt-3 space-y-3">
            {resolvedComments.map(comment => (
              <div key={comment.id} className="bg-gray-50 border border-gray-300 rounded-lg p-3 opacity-75">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-6 h-6 bg-gray-400 rounded-full flex items-center justify-center text-white font-bold text-xs">
                    {comment.user_name.charAt(0).toUpperCase()}
                  </div>
                  <span className="font-bold text-gray-600 text-sm">{comment.user_name}</span>
                  <span className="text-green-600 text-xs">✓ Resolved</span>
                </div>
                <p className="text-gray-600 text-sm leading-relaxed">{comment.text}</p>
              </div>
            ))}
          </div>
        </details>
      )}

      {!showInput ? (
        <button
          onClick={() => setShowInput(true)}
          className="w-full py-3 border-2 border-dashed border-yellow-300 rounded-lg text-sm text-yellow-700 hover:border-yellow-400 hover:bg-yellow-50 transition-all flex items-center justify-center gap-2 touch-target"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
          Add Comment
        </button>
      ) : (
        <div className="bg-yellow-50 border-2 border-yellow-300 rounded-lg p-4">
          <textarea
            value={commentText}
            onChange={(e) => setCommentText(e.target.value)}
            placeholder="Leave a comment or suggestion..."
            className="w-full px-4 py-3 border rounded-lg text-sm resize-none mb-3 mobile-input"
            rows={4}
            autoFocus
          />
          <div className="flex gap-3">
            <button
              onClick={() => {
                setShowInput(false)
                setCommentText('')
              }}
              className="flex-1 py-3 bg-gray-200 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-300 transition-colors touch-target"
            >
              Cancel
            </button>
            <button
              onClick={handleAddComment}
              disabled={loading || !commentText.trim()}
              className="flex-1 py-3 bg-yellow-500 text-white rounded-lg text-sm font-semibold hover:bg-yellow-600 disabled:opacity-50 transition-colors touch-target"
            >
              {loading ? 'Posting...' : 'Post Comment'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// Removed unused CommentBadge component

