'use client'
import { useEffect, useRef, useState, useCallback } from 'react'

interface User {
  user_id: string
  name: string
  joined_at: string
}

interface CollaborationHook {
  isConnected: boolean
  activeUsers: User[]
  connect: (roomId: string, userName: string) => void
  disconnect: () => void
  sendUpdate: (data: any) => void
  onRemoteUpdate: (callback: (data: any, userName: string) => void) => void
  addComment: (text: string, targetType: string, targetId: string) => void
  resolveComment: (commentId: string) => void
  deleteComment: (commentId: string) => void
  onCommentAdded: (callback: (comment: any) => void) => void
  onCommentResolved: (callback: (commentId: string) => void) => void
  onCommentDeleted: (callback: (commentId: string) => void) => void
}

export function useCollaboration(): CollaborationHook {
  const [isConnected, setIsConnected] = useState(false)
  const [activeUsers, setActiveUsers] = useState<User[]>([])
  const wsRef = useRef<WebSocket | null>(null)
  const remoteUpdateCallbackRef = useRef<((data: any, userName: string) => void) | null>(null)
  const commentAddedCallbackRef = useRef<((comment: any) => void) | null>(null)
  const commentResolvedCallbackRef = useRef<((commentId: string) => void) | null>(null)
  const commentDeletedCallbackRef = useRef<((commentId: string) => void) | null>(null)
  const userIdRef = useRef<string>('')

  const connect = useCallback((roomId: string, userName: string) => {
    // Close existing connection if any
    if (wsRef.current) {
      wsRef.current.close()
      wsRef.current = null
    }

    const userId = Math.random().toString(36).substring(7)
    userIdRef.current = userId
    
    const ws = new WebSocket(`ws://localhost:8000/ws/collab/${roomId}`)
    
    ws.onopen = () => {
      ws.send(JSON.stringify({
        user_id: userId,
        user_name: userName || 'Anonymous'
      }))
      setIsConnected(true)
    }
    
    ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data)
        
        if (message.type === 'user_joined' || message.type === 'user_left') {
          setActiveUsers(message.active_users || [])
        } else if (message.type === 'resume_update') {
          if (remoteUpdateCallbackRef.current && message.user_id !== userId) {
            remoteUpdateCallbackRef.current(message.data, message.user_name)
          }
        } else if (message.type === 'comment_added') {
          if (commentAddedCallbackRef.current) {
            commentAddedCallbackRef.current(message.comment)
          }
        } else if (message.type === 'comment_resolved') {
          if (commentResolvedCallbackRef.current) {
            commentResolvedCallbackRef.current(message.comment_id)
          }
        } else if (message.type === 'comment_deleted') {
          if (commentDeletedCallbackRef.current) {
            commentDeletedCallbackRef.current(message.comment_id)
          }
        }
      } catch (e) {
        console.error('Failed to parse WebSocket message:', e)
      }
    }
    
    ws.onerror = (error) => {
      console.error('WebSocket error:', error)
      setIsConnected(false)
    }
    
    ws.onclose = () => {
      setIsConnected(false)
      wsRef.current = null
      setActiveUsers([]) // Clear active users when disconnected
    }
    
    wsRef.current = ws
  }, [])

  const disconnect = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.close()
      wsRef.current = null
      setIsConnected(false)
      setActiveUsers([])
    }
  }, [])

  const sendUpdate = useCallback((data: any) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'resume_update',
        data
      }))
    }
  }, [])

  const onRemoteUpdate = useCallback((callback: (data: any, userName: string) => void) => {
    remoteUpdateCallbackRef.current = callback
  }, [])

  const addComment = useCallback((text: string, targetType: string, targetId: string) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'add_comment',
        text,
        target_type: targetType,
        target_id: targetId
      }))
    }
  }, [])

  const resolveComment = useCallback((commentId: string) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'resolve_comment',
        comment_id: commentId
      }))
    }
  }, [])

  const deleteComment = useCallback((commentId: string) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'delete_comment',
        comment_id: commentId
      }))
    }
  }, [])

  const onCommentAdded = useCallback((callback: (comment: any) => void) => {
    commentAddedCallbackRef.current = callback
  }, [])

  const onCommentResolved = useCallback((callback: (commentId: string) => void) => {
    commentResolvedCallbackRef.current = callback
  }, [])

  const onCommentDeleted = useCallback((callback: (commentId: string) => void) => {
    commentDeletedCallbackRef.current = callback
  }, [])

  useEffect(() => {
    return () => {
      disconnect()
    }
  }, [disconnect])

  return {
    isConnected,
    activeUsers,
    connect,
    disconnect,
    sendUpdate,
    onRemoteUpdate,
    addComment,
    resolveComment,
    deleteComment,
    onCommentAdded,
    onCommentResolved,
    onCommentDeleted
  }
}

