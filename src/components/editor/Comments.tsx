'use client'
import { useState, useEffect } from 'react'

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

  useEffect(() => {
    if (roomId) {
      loadComments()
    }
  }, [roomId, targetId])

  const loadComments = async () => {
    if (!roomId) return
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:8000'}/api/collab/room/${roomId}/comments?target_id=${targetId}`
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
      onAddComment(commentText, targetType, targetId)
      setCommentText('')
      setShowInput(false)
      setTimeout(loadComments, 100)
    } catch (error) {
      console.error('Failed to add comment:', error)
    } finally {
      setLoading(false)
    }
  }

  const activeComments = comments.filter(c => !c.resolved)
  const resolvedComments = comments.filter(c => c.resolved)

  return (
    <div className="space-y-2">
      {activeComments.length > 0 && (
        <div className="space-y-2">
          {activeComments.map(comment => (
            <div key={comment.id} className="bg-yellow-50 border-2 border-yellow-300 rounded-lg p-3 text-xs">
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 bg-yellow-500 rounded-full flex items-center justify-center text-white font-bold text-[10px]">
                    {comment.user_name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div className="font-bold text-gray-900">{comment.user_name}</div>
                    <div className="text-[10px] text-gray-500">
                      {new Date(comment.timestamp).toLocaleString()}
                    </div>
                  </div>
                </div>
                <div className="flex gap-1">
                  <button
                    onClick={() => onResolveComment(comment.id)}
                    className="text-[10px] px-2 py-1 bg-green-500 text-white rounded hover:bg-green-600"
                    title="Mark as resolved"
                  >
                    ✓
                  </button>
                  <button
                    onClick={() => onDeleteComment(comment.id)}
                    className="text-[10px] px-2 py-1 bg-red-500 text-white rounded hover:bg-red-600"
                    title="Delete"
                  >
                    ×
                  </button>
                </div>
              </div>
              <p className="text-gray-700 whitespace-pre-wrap">{comment.text}</p>
            </div>
          ))}
        </div>
      )}

      {resolvedComments.length > 0 && (
        <details className="text-xs">
          <summary className="cursor-pointer text-gray-500 hover:text-gray-700">
            {resolvedComments.length} resolved comments
          </summary>
          <div className="mt-2 space-y-2">
            {resolvedComments.map(comment => (
              <div key={comment.id} className="bg-gray-50 border border-gray-300 rounded-lg p-2 opacity-60">
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-5 h-5 bg-gray-400 rounded-full flex items-center justify-center text-white font-bold text-[10px]">
                    {comment.user_name.charAt(0).toUpperCase()}
                  </div>
                  <span className="font-bold text-gray-600">{comment.user_name}</span>
                  <span className="text-green-600">✓ Resolved</span>
                </div>
                <p className="text-gray-600">{comment.text}</p>
              </div>
            ))}
          </div>
        </details>
      )}

      {!showInput ? (
        <button
          onClick={() => setShowInput(true)}
          className="w-full py-2 border-2 border-dashed border-yellow-300 rounded-lg text-xs text-yellow-700 hover:border-yellow-400 hover:bg-yellow-50 transition-all flex items-center justify-center gap-2"
        >
          💬 Add Comment
        </button>
      ) : (
        <div className="bg-yellow-50 border-2 border-yellow-300 rounded-lg p-3">
          <textarea
            value={commentText}
            onChange={(e) => setCommentText(e.target.value)}
            placeholder="Leave a comment or suggestion..."
            className="w-full px-3 py-2 border rounded-lg text-xs resize-none mb-2"
            rows={3}
            autoFocus
          />
          <div className="flex gap-2">
            <button
              onClick={() => {
                setShowInput(false)
                setCommentText('')
              }}
              className="flex-1 py-1.5 bg-gray-200 text-gray-700 rounded-lg text-xs font-medium"
            >
              Cancel
            </button>
            <button
              onClick={handleAddComment}
              disabled={loading || !commentText.trim()}
              className="flex-1 py-1.5 bg-yellow-500 text-white rounded-lg text-xs font-semibold hover:bg-yellow-600 disabled:opacity-50"
            >
              {loading ? 'Posting...' : 'Post Comment'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export function CommentBadge({ count }: { count: number }) {
  if (count === 0) return null
  
  return (
    <div className="absolute -top-2 -right-2 bg-yellow-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-[10px] font-bold shadow-lg animate-pulse">
      {count}
    </div>
  )
}

