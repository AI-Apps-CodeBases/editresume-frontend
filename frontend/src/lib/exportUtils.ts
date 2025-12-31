function cleanCSS(css: string): string {
  return css
    .replace(/var\([^)]+\)/g, '') // Remove CSS variables
    .replace(/box-shadow:[^;]+;?/gi, '') // Remove box-shadow
    .replace(/filter:[^;]+;?/gi, '') // Remove filter
    .replace(/backdrop-filter:[^;]+;?/gi, '') // Remove backdrop-filter
    .replace(/outline-offset:[^;]+;?/gi, '') // Remove outline-offset
    .replace(/mask-image:[^;]+;?/gi, '') // Remove mask-image
    .replace(/color-scheme:[^;]+;?/gi, '') // Remove color-scheme
    .replace(/inset:[^;]+;?/gi, '') // Remove inset
    .replace(/@media\s+\([^)]+\)\s*\{[^}]*\}/g, '') // Remove media queries
    .replace(/::placeholder[^{]*\{[^}]*\}/g, '') // Remove placeholder pseudo-elements
    .replace(/\.placeholder\\:[^{]*\{[^}]*\}/g, '') // Remove placeholder classes
}

function extractComputedStyles(element: HTMLElement): string {
  const styles = window.getComputedStyle(element)
  const importantStyles: string[] = []
  
  const properties = [
    'font-family', 'font-size', 'font-weight', 'font-style',
    'color', 'background-color', 'background',
    'padding', 'padding-top', 'padding-right', 'padding-bottom', 'padding-left',
    'margin', 'margin-top', 'margin-right', 'margin-bottom', 'margin-left',
    'border', 'border-top', 'border-right', 'border-bottom', 'border-left',
    'border-width', 'border-style', 'border-color',
    'width', 'max-width', 'min-width',
    'height', 'max-height', 'min-height',
    'line-height', 'letter-spacing', 'text-align', 'text-transform',
    'display', 'flex-direction', 'justify-content', 'align-items', 'gap',
    'grid-template-columns', 'grid-column-gap', 'grid-row-gap',
    'flex', 'flex-basis', 'flex-grow', 'flex-shrink',
  ]
  
  properties.forEach(prop => {
    const value = styles.getPropertyValue(prop)
    if (value && value !== 'none' && !value.includes('var(')) {
      // Preserve flex and grid layouts especially
      if (prop === 'display' && (value.includes('flex') || value.includes('grid'))) {
        importantStyles.push(`${prop}: ${value}`)
      } else if (prop.startsWith('flex') || prop.startsWith('grid')) {
        importantStyles.push(`${prop}: ${value}`)
      } else if (value && value !== 'none' && value !== 'auto' && value !== 'normal') {
        importantStyles.push(`${prop}: ${value}`)
      }
    }
  })
  
  return importantStyles.join('; ')
}

function inlineStyles(element: HTMLElement, depth: number = 0, maxDepth: number = 50): void {
  if (depth > maxDepth) {
    return
  }
  
  try {
    const style = extractComputedStyles(element)
    if (style) {
      element.setAttribute('style', style)
    }
    
    Array.from(element.children).forEach(child => {
      if (child instanceof HTMLElement) {
        inlineStyles(child, depth + 1, maxDepth)
      }
    })
  } catch (e) {
    console.warn('Error inlining styles:', e)
  }
}

function preserveFlexLayout(originalElement: HTMLElement, clonedElement: HTMLElement): void {
  // Map original elements to cloned elements by traversing both trees
  const originalElements: HTMLElement[] = []
  const clonedElements: HTMLElement[] = []
  
  function collectElements(parent: HTMLElement, array: HTMLElement[]): void {
    array.push(parent)
    Array.from(parent.children).forEach(child => {
      if (child instanceof HTMLElement) {
        collectElements(child, array)
      }
    })
  }
  
  collectElements(originalElement, originalElements)
  collectElements(clonedElement, clonedElements)
  
  // Now match and copy flex-related styles
  for (let i = 0; i < Math.min(originalElements.length, clonedElements.length); i++) {
    const original = originalElements[i]
    const cloned = clonedElements[i]
    const computedStyle = window.getComputedStyle(original)
    let currentStyle = cloned.getAttribute('style') || ''
    
    // Handle flex containers
    if (original.classList.contains('flex') || computedStyle.display === 'flex') {
      // Ensure display: flex
      if (!currentStyle.includes('display: flex') && !currentStyle.includes('display:flex')) {
        currentStyle = `display: flex; ${currentStyle}`
      }
      
      // Preserve gap
      const gap = computedStyle.gap
      if (gap && gap !== 'normal' && gap !== '0px' && !currentStyle.includes('gap:')) {
        currentStyle = `${currentStyle} gap: ${gap};`
      }
      
      // Preserve flex-direction if not default
      const flexDirection = computedStyle.flexDirection
      if (flexDirection && flexDirection !== 'row' && !currentStyle.includes('flex-direction:')) {
        currentStyle = `${currentStyle} flex-direction: ${flexDirection};`
      }
      
      cloned.setAttribute('style', currentStyle.trim())
    }
    
    // Preserve width percentages for columns (critical for two-column layout)
    const width = computedStyle.width
    if (width && width.includes('%')) {
      if (!currentStyle.includes('width:')) {
        cloned.setAttribute('style', `${currentStyle} width: ${width};`.trim())
      } else {
        // Update existing width to ensure it's correct
        currentStyle = currentStyle.replace(/width:\s*[^;]+/g, `width: ${width}`)
        cloned.setAttribute('style', currentStyle)
      }
    }
    
    // Preserve flex-basis if set (for flex layouts)
    const flexBasis = computedStyle.flexBasis
    if (flexBasis && flexBasis !== 'auto' && flexBasis.includes('%')) {
      if (!currentStyle.includes('flex-basis:')) {
        cloned.setAttribute('style', `${currentStyle} flex-basis: ${flexBasis};`.trim())
      }
    }
  }
}

function ensureAllStyles(element: HTMLElement, original: HTMLElement): void {
  const computed = window.getComputedStyle(original)
  let style = element.getAttribute('style') || ''
  
  // Critical styles that must be preserved
  const criticalProps = [
    'display', 'flex-direction', 'flex-wrap', 'gap',
    'width', 'max-width', 'min-width',
    'height', 'max-height', 'min-height',
    'padding', 'padding-top', 'padding-right', 'padding-bottom', 'padding-left',
    'margin', 'margin-top', 'margin-right', 'margin-bottom', 'margin-left',
    'border', 'border-top', 'border-right', 'border-bottom', 'border-left',
    'border-width', 'border-style', 'border-color',
    'font-family', 'font-size', 'font-weight', 'font-style',
    'color', 'background-color', 'background',
    'line-height', 'letter-spacing', 'text-align', 'text-transform',
    'flex', 'flex-basis', 'flex-grow', 'flex-shrink',
  ]
  
  criticalProps.forEach(prop => {
    const value = computed.getPropertyValue(prop)
    if (value && value !== 'none' && value !== 'auto' && value !== 'normal' && !value.includes('var(')) {
      const propName = prop.replace(/-([a-z])/g, (_, letter) => letter.toUpperCase())
      if (!style.includes(`${propName}:`) && !style.includes(`${prop}:`)) {
        style = `${style} ${prop}: ${value};`.trim()
      }
    }
  })
  
  if (style) {
    element.setAttribute('style', style)
  }
  
  // Recursively apply to children
  Array.from(element.children).forEach((child, idx) => {
    if (child instanceof HTMLElement && original.children[idx] instanceof HTMLElement) {
      ensureAllStyles(child, original.children[idx] as HTMLElement)
    }
  })
}

function inlineAllComputedStyles(element: HTMLElement, original: HTMLElement): void {
  const computed = window.getComputedStyle(original)
  let style = element.getAttribute('style') || ''
  
  // Get all important styles - including gradients, backgrounds, positioning
  const allProps = [
    'display', 'flex-direction', 'flex-wrap', 'gap',
    'width', 'max-width', 'min-width', 'flex-basis',
    'height', 'max-height', 'min-height',
    'padding', 'padding-top', 'padding-right', 'padding-bottom', 'padding-left',
    'margin', 'margin-top', 'margin-right', 'margin-bottom', 'margin-left',
    'border', 'border-top', 'border-right', 'border-bottom', 'border-left',
    'border-width', 'border-style', 'border-color', 'border-radius',
    'font-family', 'font-size', 'font-weight', 'font-style',
    'color', 'background-color', 'background', 'background-image', 'background-size', 'background-position',
    'line-height', 'letter-spacing', 'text-align', 'text-transform',
    'vertical-align', 'text-decoration',
    'position', 'top', 'left', 'right', 'bottom',
    'box-shadow', 'opacity', 'overflow', 'overflow-wrap', 'word-wrap', 'word-break',
    'white-space', 'text-overflow', 'list-style', 'list-style-type',
  ]
  
  allProps.forEach(prop => {
    try {
      const value = computed.getPropertyValue(prop)
      // For background-image, also check getPropertyValue with important
      let finalValue = value
      if (prop === 'background-image' && !value) {
        // Try to get background-image from background shorthand
        const bg = computed.getPropertyValue('background')
        if (bg && bg.includes('gradient')) {
          finalValue = bg
        }
      }
      
      if (finalValue && finalValue !== 'none' && finalValue !== 'auto' && finalValue !== 'normal' && 
          finalValue !== '0px' && finalValue !== '0' && !finalValue.includes('var(') && finalValue.trim()) {
        // Check if this property is already in style
        const propRegex = new RegExp(`${prop.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}:\\s*[^;]+`, 'i')
        if (!propRegex.test(style)) {
          style = `${style} ${prop}: ${finalValue};`.trim()
        } else {
          // Update existing value if it's a gradient or important style
          if (finalValue.includes('gradient') || prop === 'background' || prop === 'background-image') {
            style = style.replace(propRegex, `${prop}: ${finalValue}`)
          }
        }
      }
    } catch (e) {
      // Skip if property access fails
    }
  })
  
  // Special handling for background gradients - preserve the full background value
  try {
    const bg = computed.getPropertyValue('background')
    if (bg && bg.includes('gradient') && !style.includes('background:')) {
      style = `${style} background: ${bg};`.trim()
    }
    // Also preserve background-image separately if it's a gradient
    const bgImage = computed.getPropertyValue('background-image')
    if (bgImage && bgImage !== 'none' && bgImage.includes('gradient')) {
      if (!style.includes('background-image:')) {
        style = `${style} background-image: ${bgImage};`.trim()
      }
    }
  } catch (e) {
    // Skip if fails
  }
  
  if (style) {
    element.setAttribute('style', style)
  }
  
  // Recursively apply to children
  Array.from(element.children).forEach((child, idx) => {
    if (child instanceof HTMLElement && idx < original.children.length && original.children[idx] instanceof HTMLElement) {
      inlineAllComputedStyles(child, original.children[idx] as HTMLElement)
    }
  })
}

export async function capturePreviewHTML(): Promise<string> {
  // Wait a bit for React to finish rendering
  await new Promise(resolve => setTimeout(resolve, 500))
  
  // Try multiple selectors to find the preview element
  let previewElement: HTMLElement | null = null
  
  // First, try to find the preview-resume-container (used by BaseTemplate)
  previewElement = document.querySelector('.preview-resume-container') as HTMLElement
  
  // If not found, try finding it within the a4-page-view wrapper
  if (!previewElement) {
    const pageView = document.querySelector('.a4-page-view')
    if (pageView) {
      previewElement = pageView.querySelector('.preview-resume-container') as HTMLElement
    }
  }
  
  // Try alternative selectors if main one fails
  if (!previewElement) {
    previewElement = document.querySelector('#resume-preview-container') as HTMLElement
  }
  
  // Try finding any element with preview-resume-container class, even if nested
  if (!previewElement) {
    const allContainers = document.querySelectorAll('.preview-resume-container')
    if (allContainers.length > 0) {
      // Get the last one (most likely the visible one)
      previewElement = allContainers[allContainers.length - 1] as HTMLElement
    }
  }
  
  // Last resort: try to find the preview panel wrapper
  if (!previewElement) {
    const previewPanel = document.querySelector('[class*="preview"], [class*="Preview"]')
    if (previewPanel) {
      previewElement = previewPanel.querySelector('.preview-resume-container') as HTMLElement || previewPanel as HTMLElement
    }
  }
  
  if (!previewElement) {
    console.error('Available elements:', {
      previewResumeContainers: document.querySelectorAll('.preview-resume-container').length,
      a4PageViews: document.querySelectorAll('.a4-page-view').length,
      allDivs: document.querySelectorAll('div').length
    })
    throw new Error('Preview element not found. Make sure the resume preview is visible.')
  }

  // Check if element has content
  if (!previewElement.textContent || previewElement.textContent.trim().length === 0) {
    console.warn('Preview element found but appears empty. Waiting longer...')
    // Wait a bit more for content to load
    await new Promise(resolve => setTimeout(resolve, 1000))
    
    // Check again
    if (!previewElement.textContent || previewElement.textContent.trim().length === 0) {
      throw new Error('Preview element is empty. Please wait for the resume to load and try again.')
    }
  }
  
  console.log('Found preview element:', {
    className: previewElement.className,
    textLength: previewElement.textContent?.length,
    childrenCount: previewElement.children.length,
    innerHTML: previewElement.innerHTML.substring(0, 200)
  })
  
  // Ensure the preview element is visible and scrolled into view
  previewElement.scrollIntoView({ behavior: 'instant', block: 'center' })
  
  // Wait a moment for any layout shifts
  await new Promise(resolve => setTimeout(resolve, 200))

  try {
    // Create a deep clone
    const clone = previewElement.cloneNode(true) as HTMLElement
    
    // Remove any hidden elements
    const hiddenElements = clone.querySelectorAll('[style*="display: none"], [style*="visibility: hidden"], [hidden]')
    hiddenElements.forEach(el => el.remove())
    
    // Function to recursively copy ALL computed styles from original to clone
    function copyAllStylesRecursive(original: HTMLElement, cloned: HTMLElement): void {
      // Get computed styles from original
      const computed = window.getComputedStyle(original)
      let style = cloned.getAttribute('style') || ''
      
      // Critical properties that MUST be preserved
      const criticalProps = [
        'background', 'background-image', 'background-color', 'background-size', 'background-position',
        'color', 'font-family', 'font-size', 'font-weight', 'font-style',
        'text-align', 'line-height', 'letter-spacing',
        'padding', 'padding-top', 'padding-right', 'padding-bottom', 'padding-left',
        'margin', 'margin-top', 'margin-right', 'margin-bottom', 'margin-left',
        'border', 'border-top', 'border-right', 'border-bottom', 'border-left',
        'border-radius', 'border-color', 'border-style', 'border-width',
        'width', 'height', 'max-width', 'min-width', 'max-height', 'min-height',
        'display', 'position', 'top', 'left', 'right', 'bottom',
        'box-shadow', 'opacity', 'overflow', 'text-transform',
        'flex-direction', 'flex-wrap', 'gap', 'justify-content', 'align-items',
        'vertical-align', 'white-space', 'word-wrap', 'word-break', 'overflow-wrap',
      ]
      
      // Copy all critical properties
      criticalProps.forEach(prop => {
        try {
          const value = computed.getPropertyValue(prop)
          if (value && value !== 'none' && value !== 'auto' && value !== 'normal' && 
              value !== '0px' && value !== '0' && !value.includes('var(') && value.trim()) {
            // Check if property already exists in style
            const propRegex = new RegExp(`${prop.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}:\\s*[^;]+`, 'i')
            if (!propRegex.test(style)) {
              style = `${style} ${prop}: ${value};`.trim()
            } else if (value.includes('gradient') || prop === 'background' || prop === 'background-image') {
              // Update gradient/background values even if they exist
              style = style.replace(propRegex, `${prop}: ${value}`)
            }
          }
        } catch (e) {
          // Skip if property access fails
        }
      })
      
      // Special handling for gradients - get the full background value
      try {
        const bg = computed.getPropertyValue('background')
        if (bg && bg.includes('gradient')) {
          // Remove any existing background properties
          style = style.replace(/background[^:]*:\s*[^;]+/gi, '')
          style = `${style} background: ${bg};`.trim()
        }
        const bgImage = computed.getPropertyValue('background-image')
        if (bgImage && bgImage !== 'none' && bgImage.includes('gradient')) {
          style = style.replace(/background-image[^:]*:\s*[^;]+/gi, '')
          style = `${style} background-image: ${bgImage};`.trim()
        }
      } catch (e) {
        // Skip if fails
      }
      
      // Add print-color-adjust to preserve colors
      if (!style.includes('print-color-adjust') && !style.includes('color-adjust')) {
        style = `${style} -webkit-print-color-adjust: exact; print-color-adjust: exact;`.trim()
      }
      
      if (style) {
        cloned.setAttribute('style', style)
      }
      
      // Recursively process children
      Array.from(cloned.children).forEach((child, idx) => {
        if (child instanceof HTMLElement && idx < original.children.length && original.children[idx] instanceof HTMLElement) {
          copyAllStylesRecursive(original.children[idx] as HTMLElement, child)
        }
      })
    }
    
    // Copy ALL styles recursively
    copyAllStylesRecursive(previewElement, clone)
    
    // Also run the inlineAllComputedStyles for any missed styles
    inlineAllComputedStyles(clone, previewElement)
    
    // NOTE: WeasyPrint 60+ supports flexbox and grid, so we DON'T convert them to tables
    // This preserves the original layout exactly as shown in the preview
    
    // Additional pass: ensure critical styles are preserved (backgrounds, gradients, text-align)
    function ensureCriticalStyles(original: HTMLElement, cloned: HTMLElement): void {
      const computed = window.getComputedStyle(original)
      let style = cloned.getAttribute('style') || ''
      
      // Remove any display:none or visibility:hidden
      style = style.replace(/display:\s*none/gi, '').trim()
      style = style.replace(/visibility:\s*hidden/gi, '').trim()
      
      // Preserve background/gradients - critical for styled templates
      const background = computed.getPropertyValue('background')
      if (background && background !== 'none' && background !== 'rgba(0, 0, 0, 0)' && !style.includes('background:')) {
        style = `${style} background: ${background};`.trim()
      }
      
      const bgImage = computed.getPropertyValue('background-image')
      if (bgImage && bgImage !== 'none' && !style.includes('background-image:')) {
        style = `${style} background-image: ${bgImage};`.trim()
      }
      
      // Ensure color is set
      const color = computed.color
      if (color && color !== 'rgba(0, 0, 0, 0)' && color !== 'transparent') {
        if (!style.includes('color:')) {
          style = `${style} color: ${color};`.trim()
        }
      }
      
      // Ensure text-align is preserved (critical for centering)
      const textAlign = computed.textAlign
      if (textAlign && textAlign !== 'start' && !style.includes('text-align:')) {
        style = `${style} text-align: ${textAlign};`.trim()
      }
      
      // Ensure font-size is set
      const fontSize = computed.fontSize
      if (fontSize && fontSize !== '0px' && !style.includes('font-size:')) {
        style = `${style} font-size: ${fontSize};`.trim()
      }
      
      // Ensure display is visible
      const display = computed.display
      if (display === 'none') {
        style = style.replace(/display:\s*none/gi, '').trim()
        style = `${style} display: block;`.trim()
      } else if (!style.includes('display:') && display !== 'inline') {
        style = `${style} display: ${display};`.trim()
      }
      
      if (style) {
        cloned.setAttribute('style', style)
      }
      
      // Recursively process children
      Array.from(cloned.children).forEach((child, idx) => {
        if (child instanceof HTMLElement && idx < original.children.length && original.children[idx] instanceof HTMLElement) {
          ensureCriticalStyles(original.children[idx] as HTMLElement, child)
        }
      })
    }
    
    // Final pass: ensure critical styles are preserved
    ensureCriticalStyles(previewElement, clone)
    
    // Verify clone has content
    if (!clone.textContent || clone.textContent.trim().length === 0) {
      throw new Error('Failed to capture resume content. Please try again.')
    }
    
    // Remove max-width constraints to use full A4 width
    function removeMaxWidthConstraints(element: HTMLElement): void {
      let style = element.getAttribute('style') || ''
      style = style
        .replace(/max-width:\s*[^;]+/gi, '')
        .replace(/maxWidth:\s*[^;]+/gi, '')
        .trim()
      if (style && !style.includes('width:')) {
        style = `${style} width: 100%;`.trim()
      } else if (!style.includes('width: 100%')) {
        style = `${style} width: 100%;`.trim()
      }
      element.setAttribute('style', style)
      
      // Recursively process children
      Array.from(element.children).forEach(child => {
        if (child instanceof HTMLElement) {
          removeMaxWidthConstraints(child)
        }
      })
    }
    
    // Remove max-width from container and all children
    removeMaxWidthConstraints(clone)
    
    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    @page {
      size: A4;
      margin: 0;
    }
    * {
      box-sizing: border-box;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
      color-adjust: exact !important;
    }
    html, body {
      margin: 0;
      padding: 0;
      width: 100%;
      height: 100%;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      color: #000;
      background: white;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    .preview-resume-container {
      width: 100% !important;
      max-width: none !important;
      margin: 0 !important;
      padding: 0.5cm !important;
      background: white;
      color: #000;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
      box-sizing: border-box;
    }
    /* Remove any max-width constraints - use full A4 width */
    * {
      max-width: none !important;
    }
    .preview-resume-container * {
      max-width: none !important;
    }
    /* Preserve all inline styles - don't override them */
    [style] {
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    /* Ensure gradients and backgrounds are preserved */
    [style*="gradient"],
    [style*="background"],
    [style*="background-image"] {
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
      background-image: inherit !important;
      background: inherit !important;
    }
    /* Preserve colors */
    [style*="color"] {
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    /* WeasyPrint 60+ supports flexbox and grid - preserve them */
    .flex {
      display: flex !important;
    }
    div[style*="display: flex"], div[style*="display:flex"] {
      /* Preserve flex display */
    }
    div[style*="display: grid"], div[style*="display:grid"] {
      /* Preserve grid display */
    }
    .space-y-4 > * + * {
      margin-top: 1rem !important;
    }
    .space-y-2 > * + * {
      margin-top: 0.5rem !important;
    }
    .mb-2 {
      margin-bottom: 0.5rem !important;
    }
    .mb-6 {
      margin-bottom: 1.5rem !important;
    }
    .mb-8 {
      margin-bottom: 2rem !important;
    }
    h1, h2, h3, h4, h5, h6 {
      margin: 0;
      font-weight: bold;
      color: #000;
    }
    ul, ol {
      margin: 0;
      padding-left: 1.5rem;
      list-style: none;
    }
    li {
      margin-bottom: 0.25rem;
      color: #000;
    }
    p {
      margin: 0;
      color: #000;
    }
    section {
      margin-bottom: 1rem;
    }
    span, div {
      color: inherit;
    }
    strong {
      font-weight: bold;
    }
  </style>
</head>
<body>
  ${clone.outerHTML}
</body>
</html>
    `

    console.log('Captured HTML length:', html.length)
    console.log('Clone text content preview:', clone.textContent?.substring(0, 500))
    console.log('HTML preview (first 2000 chars):', html.substring(0, 2000))
    
    // Debug: Check for flex/grid in HTML
    const hasFlex = html.includes('display: flex') || html.includes('display:flex')
    const hasGrid = html.includes('display: grid') || html.includes('display:grid')
    console.log('Layout check:', { hasFlex, hasGrid })

    return html
  } catch (error) {
    console.error('Error capturing preview HTML:', error)
    throw new Error(`Failed to capture preview: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

export async function exportPreviewAsPDF(filename: string = 'resume.pdf', apiBase?: string): Promise<void> {
  try {
    const html = await capturePreviewHTML()
    let baseUrl = apiBase || process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:8000'
    baseUrl = baseUrl.replace(/\/$/, '')
    
    const response = await fetch(`${baseUrl}/api/resume/export/html-to-pdf`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ html, filename })
    })

    if (!response.ok) {
      throw new Error(`Export failed: ${response.status}`)
    }

    const blob = await response.blob()
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    window.URL.revokeObjectURL(url)
  } catch (error) {
    console.error('Export error:', error)
    throw error
  }
}

