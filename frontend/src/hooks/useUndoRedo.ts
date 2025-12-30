import { useState, useCallback, useRef, useMemo } from 'react'

type ResumeData = {
  name: string
  title: string
  email: string
  phone: string
  location: string
  summary: string
  sections: Array<{
    id: string
    title: string
    bullets: Array<{
      id: string
      text: string
      params: Record<string, string>
    }>
  }>
}

const MAX_HISTORY_SIZE = 50

const deepClone = <T>(obj: T): T => {
  return JSON.parse(JSON.stringify(obj))
}

export function useUndoRedo(initialState: ResumeData) {
  const [history, setHistory] = useState<ResumeData[]>([deepClone(initialState)])
  const [currentIndex, setCurrentIndex] = useState(0)
  const isPushingRef = useRef(false)

  const canUndo = currentIndex > 0
  const canRedo = currentIndex < history.length - 1

  const currentState = useMemo(() => {
    return history[currentIndex] ? deepClone(history[currentIndex]) : initialState
  }, [history, currentIndex, initialState])

  const pushState = useCallback((state: ResumeData) => {
    if (isPushingRef.current) return
    
    setHistory(prev => {
      const newHistory = prev.slice(0, currentIndex + 1)
      const clonedState = deepClone(state)
      
      newHistory.push(clonedState)
      
      if (newHistory.length > MAX_HISTORY_SIZE) {
        newHistory.shift()
        setCurrentIndex(prev => prev - 1)
        return newHistory
      }
      
      return newHistory
    })
    
    setCurrentIndex(prev => {
      const newIndex = Math.min(prev + 1, MAX_HISTORY_SIZE - 1)
      return newIndex
    })
  }, [currentIndex])

  const undo = useCallback(() => {
    if (!canUndo) return
    
    setCurrentIndex(prev => prev - 1)
  }, [canUndo])

  const redo = useCallback(() => {
    if (!canRedo) return
    
    setCurrentIndex(prev => prev + 1)
  }, [canRedo])

  const setState = useCallback((state: ResumeData, skipHistory = false) => {
    if (skipHistory) {
      isPushingRef.current = true
      setHistory(prev => {
        const newHistory = [...prev]
        newHistory[currentIndex] = deepClone(state)
        return newHistory
      })
      setTimeout(() => {
        isPushingRef.current = false
      }, 0)
    } else {
      pushState(state)
    }
  }, [currentIndex, pushState])

  const clearRedoStack = useCallback(() => {
    setHistory(prev => prev.slice(0, currentIndex + 1))
  }, [currentIndex])

  return {
    currentState,
    undo,
    redo,
    pushState,
    setState,
    clearRedoStack,
    canUndo,
    canRedo,
  }
}

