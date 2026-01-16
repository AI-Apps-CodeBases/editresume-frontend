'use client'
import React, { useState, useEffect, useRef, useCallback } from 'react'
import PreviewPanel from '@/components/Resume/PreviewPanel'
import {
  LayoutDashboard,
  Maximize2,
  X,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  ChevronLeft,
  ChevronRight,
  FileText,
  Presentation,
  SidebarOpen,
  CheckCircle2
} from 'lucide-react'
import Tooltip from '@/components/Shared/Tooltip'

type ViewMode = 'side-by-side' | 'overlay' | 'fullscreen' | 'presentation'

interface EnhancedPreviewPanelProps {
  data: any
  replacements?: Record<string, string>
  template?: 'clean' | 'two-column' | 'compact' | 'minimal' | 'modern' | 'tech' | 'modern-one' | 'classic-one' | 'minimal-one' | 'executive-one' | 'classic' | 'creative' | 'ats-friendly' | 'executive'
  templateConfig?: any
  onExport?: (format: 'pdf' | 'docx' | 'cover-letter') => void
  isExporting?: boolean
  hasResumeName?: boolean
}

export default function EnhancedPreviewPanel({
  data,
  replacements = {},
  template = 'clean',
  templateConfig,
  onExport,
  isExporting = false,
  hasResumeName = false
}: EnhancedPreviewPanelProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('side-by-side' as ViewMode)
  const [zoom, setZoom] = useState(100)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [isAnimating, setIsAnimating] = useState(false)
  const [showControls, setShowControls] = useState(true)
  const containerRef = useRef<HTMLDivElement>(null)
  const previewRef = useRef<HTMLDivElement>(null)
  const hideControlsTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Auto-hide controls in presentation mode
  useEffect(() => {
    if (viewMode === 'presentation') {
      const handleMouseMove = () => {
        setShowControls(true)
        if (hideControlsTimeoutRef.current) {
          clearTimeout(hideControlsTimeoutRef.current)
        }
        hideControlsTimeoutRef.current = setTimeout(() => {
          setShowControls(false)
        }, 3000)
      }

      handleMouseMove()
      window.addEventListener('mousemove', handleMouseMove)
      return () => {
        window.removeEventListener('mousemove', handleMouseMove)
        if (hideControlsTimeoutRef.current) {
          clearTimeout(hideControlsTimeoutRef.current)
        }
      }
    } else {
      setShowControls(true)
    }
  }, [viewMode])

  // Count pages from preview container
  useEffect(() => {
    const countPages = () => {
      if (previewRef.current || containerRef.current) {
        const container = previewRef.current || containerRef.current
        if (container) {
          const pages = container.querySelectorAll('.a4-page-view')
          const count = Math.max(pages.length, 1)
          setTotalPages(count)
          if (currentPage > count) {
            setCurrentPage(1)
          }
        }
      }
    }

    const timeoutId = setTimeout(countPages, 100)
    const intervalId = setInterval(countPages, 500)
    return () => {
      clearTimeout(timeoutId)
      clearInterval(intervalId)
    }
  }, [data, template, templateConfig, currentPage])

  // Handle keyboard shortcuts
  useEffect(() => {
    if (viewMode === 'presentation' || viewMode === 'fullscreen') {
      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
          e.preventDefault()
          setCurrentPage(prev => Math.max(1, prev - 1))
        } else if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
          e.preventDefault()
          setCurrentPage(prev => Math.min(totalPages, prev + 1))
        } else if (e.key === 'Escape') {
          e.preventDefault()
          setViewMode('side-by-side')
        } else         if (e.key === 'f' || e.key === 'F') {
          e.preventDefault()
          setViewMode((viewMode === 'presentation' ? 'side-by-side' : 'presentation') as ViewMode)
        }
      }

      window.addEventListener('keydown', handleKeyDown)
      return () => window.removeEventListener('keydown', handleKeyDown)
    }
  }, [viewMode, totalPages])

  // Prevent body scroll in fullscreen/presentation modes
  useEffect(() => {
    if (viewMode === 'fullscreen' || viewMode === 'presentation') {
      document.body.style.overflow = 'hidden'
      return () => {
        document.body.style.overflow = ''
      }
    }
  }, [viewMode])

  const handleZoomIn = () => {
    setZoom(prev => Math.min(200, prev + 10))
    setIsAnimating(true)
    setTimeout(() => setIsAnimating(false), 300)
  }

  const handleZoomOut = () => {
    setZoom(prev => Math.max(25, prev - 10))
    setIsAnimating(true)
    setTimeout(() => setIsAnimating(false), 300)
  }

  const handleZoomReset = () => {
    setZoom(100)
    setIsAnimating(true)
    setTimeout(() => setIsAnimating(false), 300)
  }

  const handlePageChange = (direction: 'prev' | 'next') => {
    if (direction === 'prev' && currentPage > 1) {
      setCurrentPage(prev => prev - 1)
    } else if (direction === 'next' && currentPage < totalPages) {
      setCurrentPage(prev => prev + 1)
    }
    setIsAnimating(true)
    setTimeout(() => setIsAnimating(false), 300)
  }

  const handleViewModeChange = (mode: ViewMode) => {
    setViewMode(mode as ViewMode)
    setIsAnimating(true)
    setTimeout(() => setIsAnimating(false), 500)
    if (mode === 'fullscreen' || mode === 'presentation') {
      setZoom(100)
    }
  }

  const scrollToPage = useCallback((page: number) => {
    if (previewRef.current && viewMode !== 'presentation') {
      const pages = previewRef.current.querySelectorAll('.a4-page-view')
      const targetPage = pages[page - 1]
      if (targetPage) {
        targetPage.scrollIntoView({ behavior: 'smooth', block: 'center' })
        setCurrentPage(page)
      }
    } else if (viewMode === 'presentation') {
      setCurrentPage(page)
    }
  }, [viewMode])

  useEffect(() => {
    scrollToPage(currentPage)
  }, [currentPage, scrollToPage])

  const getZoomScale = () => zoom / 100

  // Helper function to get button state without type narrowing
  const getButtonActive = (buttonMode: ViewMode) => viewMode === buttonMode

  if (viewMode === 'fullscreen' || viewMode === 'presentation') {
    return (
      <div className="fixed inset-0 z-50 bg-gray-900 flex flex-col transition-all duration-300 ease-out">
        {/* Top Controls Bar */}
        <div
          className={`absolute top-0 left-0 right-0 z-50 bg-black/80 backdrop-blur-md border-b border-gray-800 transition-all duration-300 ${
            showControls || viewMode === 'fullscreen' ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-full pointer-events-none'
          }`}
        >
          <div className="flex items-center justify-between px-6 py-3">
            <div className="flex items-center gap-4">
              <Tooltip text="Exit full screen (Esc)" color="gray" position="bottom">
                <button
                  onClick={() => handleViewModeChange('side-by-side')}
                  className="p-2 text-gray-300 hover:text-white hover:bg-white/10 rounded-md transition-all duration-200"
                >
                  <X className="w-5 h-5" />
                </button>
              </Tooltip>

              {viewMode === 'presentation' && (
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-gray-300">
                    {currentPage} / {totalPages}
                  </span>
                </div>
              )}

              {onExport && (
                <div className="flex items-center gap-2 ml-4 pl-4 border-l border-gray-700">
                  <Tooltip text="Export as PDF" color="gray" position="bottom">
                    <button
                      onClick={() => onExport('pdf')}
                      disabled={!hasResumeName || isExporting}
                      className="px-3 py-1.5 text-sm font-medium text-gray-300 hover:text-white hover:bg-white/10 rounded-md transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                      <FileText className="w-4 h-4" />
                      <span>PDF</span>
                    </button>
                  </Tooltip>
                  <Tooltip text="Export as DOCX" color="gray" position="bottom">
                    <button
                      onClick={() => onExport('docx')}
                      disabled={!hasResumeName || isExporting}
                      className="px-3 py-1.5 text-sm font-medium text-gray-300 hover:text-white hover:bg-white/10 rounded-md transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                      <FileText className="w-4 h-4" />
                      <span>DOCX</span>
                    </button>
                  </Tooltip>
                </div>
              )}
            </div>

            <div className="flex items-center gap-2">
              {viewMode === 'fullscreen' && (
                <>
                  <Tooltip text="Zoom Out (-)" color="gray" position="bottom">
                    <button
                      onClick={handleZoomOut}
                      className="p-2 text-gray-300 hover:text-white hover:bg-white/10 rounded-md transition-all duration-200"
                    >
                      <ZoomOut className="w-5 h-5" />
                    </button>
                  </Tooltip>
                  <span className="text-sm font-medium text-gray-300 min-w-[60px] text-center">
                    {zoom}%
                  </span>
                  <Tooltip text="Zoom In (+)" color="gray" position="bottom">
                    <button
                      onClick={handleZoomIn}
                      className="p-2 text-gray-300 hover:text-white hover:bg-white/10 rounded-md transition-all duration-200"
                    >
                      <ZoomIn className="w-5 h-5" />
                    </button>
                  </Tooltip>
                  <Tooltip text="Reset Zoom (0)" color="gray" position="bottom">
                    <button
                      onClick={handleZoomReset}
                      className="p-2 text-gray-300 hover:text-white hover:bg-white/10 rounded-md transition-all duration-200"
                    >
                      <RotateCcw className="w-5 h-5" />
                    </button>
                  </Tooltip>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Preview Content */}
        <div className="flex-1 overflow-hidden flex items-center justify-center p-8">
          {viewMode === 'presentation' ? (
            // Presentation Mode - Single page view
            <div
              className="transition-all duration-500 ease-out relative"
              style={{
                transform: `scale(${getZoomScale()})`,
                opacity: isAnimating ? 0.7 : 1
              }}
            >
              <div
                className="bg-white rounded-lg shadow-2xl overflow-hidden relative"
                style={{
                  width: '8.27in',
                  height: '11.69in',
                  maxHeight: '90vh'
                }}
              >
                <div ref={previewRef} className="relative w-full h-full" style={{ overflow: 'hidden' }}>
                  <div
                    style={{
                      transform: `translateY(-${(currentPage - 1) * 11.69 * 96}px)`,
                      transition: 'transform 0.5s ease-out',
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      right: 0
                    }}
                  >
                    <PreviewPanel
                      key={`preview-${template}-${JSON.stringify(data?.sections?.map((s: any) => s.id))}`}
                      data={data}
                      replacements={replacements}
                      template={template}
                      templateConfig={templateConfig}
                      constrained={false}
                    />
                  </div>
                </div>
              </div>
            </div>
          ) : (
            // Fullscreen Mode - Scrollable with zoom
            <div className="w-full h-full overflow-auto custom-scrollbar">
              <div className="flex flex-col items-center py-8" ref={previewRef}>
                <div
                  className={`transition-opacity duration-300 w-full max-w-full ${
                    isAnimating ? 'opacity-50' : 'opacity-100'
                  }`}
                  style={{
                    transform: `scale(${getZoomScale()})`,
                    transformOrigin: 'top center',
                    maxWidth: '100%'
                  }}
                >
                  <PreviewPanel
                    key={`preview-${template}-${JSON.stringify(data?.sections?.map((s: any) => s.id))}`}
                    data={data}
                    replacements={replacements}
                    template={template}
                    templateConfig={templateConfig}
                    constrained={true}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Page Navigation - Presentation Mode */}
          {viewMode === 'presentation' && totalPages > 1 && (
            <>
              {currentPage > 1 && (
                <button
                  onClick={() => handlePageChange('prev')}
                  className={`absolute left-4 top-1/2 -translate-y-1/2 z-40 p-3 bg-black/60 hover:bg-black/80 text-white rounded-full backdrop-blur-sm transition-all duration-300 ${
                    showControls ? 'opacity-100' : 'opacity-0 pointer-events-none'
                  }`}
                  aria-label="Previous page"
                >
                  <ChevronLeft className="w-6 h-6" />
                </button>
              )}
              {currentPage < totalPages && (
                <button
                  onClick={() => handlePageChange('next')}
                  className={`absolute right-4 top-1/2 -translate-y-1/2 z-40 p-3 bg-black/60 hover:bg-black/80 text-white rounded-full backdrop-blur-sm transition-all duration-300 ${
                    showControls ? 'opacity-100' : 'opacity-0 pointer-events-none'
                  }`}
                  aria-label="Next page"
                >
                  <ChevronRight className="w-6 h-6" />
                </button>
              )}
              {/* Page Indicators */}
              <div
                className={`absolute bottom-6 left-1/2 -translate-x-1/2 z-40 flex items-center gap-2 transition-all duration-300 ${
                  showControls ? 'opacity-100' : 'opacity-0 pointer-events-none'
                }`}
              >
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                  <button
                    key={page}
                    onClick={() => setCurrentPage(page)}
                    className={`h-2 rounded-full transition-all duration-200 ${
                      currentPage === page
                        ? 'bg-white w-8'
                        : 'bg-white/40 hover:bg-white/60 w-2'
                    }`}
                    title={`Page ${page}`}
                    aria-label={`Go to page ${page}`}
                  />
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    )
  }

  if (viewMode === 'overlay') {
    return (
      <div className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm flex items-center justify-center transition-all duration-300 ease-out">
        <div className="relative w-[90vw] max-w-4xl h-[90vh] bg-white rounded-xl shadow-2xl overflow-hidden flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-white">
            <div className="flex items-center gap-3">
              <h3 className="text-lg font-semibold text-text-primary">Preview</h3>
              <span className="px-2 py-1 bg-primary-100 text-primary-700 text-xs rounded-full font-medium capitalize">
                {template}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Tooltip text="Exit overlay" color="gray" position="bottom">
                <button
                  onClick={() => handleViewModeChange('side-by-side')}
                  className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-md transition-all duration-200"
                >
                  <X className="w-5 h-5" />
                </button>
              </Tooltip>
            </div>
          </div>

          {/* Preview Content */}
          <div className="flex-1 overflow-auto custom-scrollbar bg-slate-50 p-6">
            <div className="flex justify-center items-start min-h-full">
              <div
                className="transition-all duration-300 w-full"
                style={{
                  transform: `scale(${getZoomScale()})`,
                  transformOrigin: 'top center',
                  maxWidth: '100%'
                }}
              >
                <div ref={previewRef} className="w-full">
                  <PreviewPanel
                    key={`preview-${template}-${JSON.stringify(data?.sections?.map((s: any) => s.id))}`}
                    data={data}
                    replacements={replacements}
                    template={template}
                    templateConfig={templateConfig}
                    constrained={true}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Bottom Controls */}
          <div className="flex items-center justify-between px-6 py-3 border-t border-gray-200 bg-white">
            <div className="flex items-center gap-2">
              <Tooltip text="Zoom Out" color="gray" position="top">
                <button
                  onClick={handleZoomOut}
                  className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-md transition-all duration-200"
                >
                  <ZoomOut className="w-4 h-4" />
                </button>
              </Tooltip>
              <span className="text-sm font-medium text-gray-700 min-w-[60px] text-center">
                {zoom}%
              </span>
              <Tooltip text="Zoom In" color="gray" position="top">
                <button
                  onClick={handleZoomIn}
                  className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-md transition-all duration-200"
                >
                  <ZoomIn className="w-4 h-4" />
                </button>
              </Tooltip>
              <Tooltip text="Reset Zoom" color="gray" position="top">
                <button
                  onClick={handleZoomReset}
                  className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-md transition-all duration-200"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>
              </Tooltip>
            </div>

            {onExport && (
              <div className="flex items-center gap-2">
                <Tooltip text="Export as PDF" color="gray" position="top">
                  <button
                    onClick={() => onExport('pdf')}
                    disabled={!hasResumeName || isExporting}
                    className="px-3 py-1.5 text-sm font-medium text-primary-600 hover:text-primary-700 hover:bg-primary-50 rounded-md transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    <FileText className="w-4 h-4" />
                    <span>PDF</span>
                  </button>
                </Tooltip>
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }

  // Side-by-side mode (default)
  return (
    <div ref={containerRef} className="h-full flex flex-col">
      {/* Header with Controls */}
      <div className="flex-shrink-0 sticky top-0 z-10 bg-white/95 backdrop-blur-md px-4 pt-3 pb-2 border-b border-border-subtle shadow-sm">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-green-500" />
            <span className="text-sm font-semibold text-text-primary">Preview</span>
            <span className="px-2 py-0.5 bg-primary-100 text-primary-700 text-xs rounded-full font-medium capitalize shadow-sm">
              {template}
            </span>
          </div>

          {/* View Mode Toggle */}
          <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
            <Tooltip text="Side-by-side view" color="gray" position="bottom">
              <button
                onClick={() => handleViewModeChange('side-by-side')}
                className={`p-1.5 rounded-md transition-all duration-200 ${
                  getButtonActive('side-by-side')
                    ? 'bg-white text-primary-600 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-white/50'
                }`}
              >
                <LayoutDashboard className="w-4 h-4" />
              </button>
            </Tooltip>
            <Tooltip text="Overlay view" color="gray" position="bottom">
              <button
                onClick={() => handleViewModeChange('overlay')}
                className={`p-1.5 rounded-md transition-all duration-200 ${
                  getButtonActive('overlay')
                    ? 'bg-white text-primary-600 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-white/50'
                }`}
              >
                <SidebarOpen className="w-4 h-4" />
              </button>
            </Tooltip>
            <Tooltip text="Full screen" color="gray" position="bottom">
              <button
                onClick={() => handleViewModeChange('fullscreen')}
                className={`p-1.5 rounded-md transition-all duration-200 ${
                  getButtonActive('fullscreen')
                    ? 'bg-white text-primary-600 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-white/50'
                }`}
              >
                <Maximize2 className="w-4 h-4" />
              </button>
            </Tooltip>
            <Tooltip text="Presentation mode (F)" color="gray" position="bottom">
              <button
                onClick={() => handleViewModeChange('presentation')}
                className={`p-1.5 rounded-md transition-all duration-200 ${
                  getButtonActive('presentation')
                    ? 'bg-white text-primary-600 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-white/50'
                }`}
              >
                <Presentation className="w-4 h-4" />
              </button>
            </Tooltip>
          </div>
        </div>

        {/* Secondary Controls */}
        <div className="flex items-center justify-between">
          <p className="text-xs text-text-muted">Live updates as you edit</p>
          <div className="flex items-center gap-3">
            {/* Zoom Controls */}
            <div className="flex items-center gap-1 bg-gray-50 rounded-md px-2 py-1">
              <Tooltip text="Zoom Out" color="gray" position="top">
                <button
                  onClick={handleZoomOut}
                  disabled={zoom <= 25}
                  className="p-1 text-gray-600 hover:text-gray-900 hover:bg-white rounded transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <ZoomOut className="w-3.5 h-3.5" />
                </button>
              </Tooltip>
              <span className="text-xs font-medium text-gray-700 min-w-[45px] text-center">
                {zoom}%
              </span>
              <Tooltip text="Zoom In" color="gray" position="top">
                <button
                  onClick={handleZoomIn}
                  disabled={zoom >= 200}
                  className="p-1 text-gray-600 hover:text-gray-900 hover:bg-white rounded transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <ZoomIn className="w-3.5 h-3.5" />
                </button>
              </Tooltip>
              <Tooltip text="Reset Zoom" color="gray" position="top">
                <button
                  onClick={handleZoomReset}
                  className="p-1 text-gray-600 hover:text-gray-900 hover:bg-white rounded transition-all duration-200"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
              </Tooltip>
            </div>

            {/* Page Navigation */}
            {totalPages > 1 && (
              <div className="flex items-center gap-2 bg-gray-50 rounded-md px-2 py-1">
                <Tooltip text="Previous page" color="gray" position="top">
                  <button
                    onClick={() => handlePageChange('prev')}
                    disabled={currentPage === 1}
                    className="p-1 text-gray-600 hover:text-gray-900 hover:bg-white rounded transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" />
                  </button>
                </Tooltip>
                <span className="text-xs font-medium text-gray-700 min-w-[50px] text-center">
                  {currentPage} / {totalPages}
                </span>
                <Tooltip text="Next page" color="gray" position="top">
                  <button
                    onClick={() => handlePageChange('next')}
                    disabled={currentPage === totalPages}
                    className="p-1 text-gray-600 hover:text-gray-900 hover:bg-white rounded transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </Tooltip>
              </div>
            )}

            {/* Export Options */}
            {onExport && (
              <div className="flex items-center gap-1">
                <Tooltip text="Export as PDF" color="gray" position="top">
                  <button
                    onClick={() => onExport('pdf')}
                    disabled={!hasResumeName || isExporting}
                    className="px-2 py-1 text-xs font-medium text-primary-600 hover:text-primary-700 hover:bg-primary-50 rounded-md transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
                  >
                    <FileText className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">PDF</span>
                  </button>
                </Tooltip>
                <Tooltip text="Export as DOCX" color="gray" position="top">
                  <button
                    onClick={() => onExport('docx')}
                    disabled={!hasResumeName || isExporting}
                    className="px-2 py-1 text-xs font-medium text-primary-600 hover:text-primary-700 hover:bg-primary-50 rounded-md transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
                  >
                    <FileText className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">DOCX</span>
                  </button>
                </Tooltip>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Preview Content */}
      <div
        className="flex-1 overflow-auto custom-scrollbar bg-slate-50 transition-all duration-300"
        ref={previewRef}
      >
        <div className="flex items-start justify-center py-6 px-4 min-h-full w-full">
          <div
            className="bg-white rounded-lg shadow-2xl transition-all duration-300 w-full"
            style={{
              transform: `scale(${getZoomScale()})`,
              transformOrigin: 'top center',
              opacity: isAnimating ? 0.95 : 1,
              maxWidth: '100%'
            }}
          >
            <PreviewPanel
              key={`preview-${template}-${JSON.stringify(data?.sections?.map((s: any) => s.id))}`}
              data={data}
              replacements={replacements}
              template={template}
              templateConfig={templateConfig}
              constrained={true}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
