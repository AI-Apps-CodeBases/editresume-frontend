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
  
  // Get all important styles
  const allProps = [
    'display', 'flex-direction', 'flex-wrap', 'gap',
    'width', 'max-width', 'min-width', 'flex-basis',
    'height', 'max-height', 'min-height',
    'padding', 'padding-top', 'padding-right', 'padding-bottom', 'padding-left',
    'margin', 'margin-top', 'margin-right', 'margin-bottom', 'margin-left',
    'border', 'border-top', 'border-right', 'border-bottom', 'border-left',
    'border-width', 'border-style', 'border-color',
    'font-family', 'font-size', 'font-weight', 'font-style',
    'color', 'background-color', 'background',
    'line-height', 'letter-spacing', 'text-align', 'text-transform',
    'vertical-align', 'text-decoration',
  ]
  
  allProps.forEach(prop => {
    try {
      const value = computed.getPropertyValue(prop)
      if (value && value !== 'none' && value !== 'auto' && value !== 'normal' && 
          value !== '0px' && value !== '0' && !value.includes('var(') && value.trim()) {
        // Check if this property is already in style
        const propRegex = new RegExp(`${prop.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}:\\s*[^;]+`, 'i')
        if (!propRegex.test(style)) {
          style = `${style} ${prop}: ${value};`.trim()
        }
      }
    } catch (e) {
      // Skip if property access fails
    }
  })
  
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
  
  let previewElement = document.querySelector('.preview-resume-container') as HTMLElement
  
  // Try alternative selectors if main one fails
  if (!previewElement) {
    previewElement = document.querySelector('#resume-preview-container') as HTMLElement
  }
  
  if (!previewElement) {
    throw new Error('Preview element not found. Make sure the resume preview is visible.')
  }

  // Check if element has content
  if (!previewElement.textContent || previewElement.textContent.trim().length === 0) {
    throw new Error('Preview element is empty. Please wait for the resume to load.')
  }

  try {
    // Create a deep clone
    const clone = previewElement.cloneNode(true) as HTMLElement
    
    // Remove any hidden elements
    const hiddenElements = clone.querySelectorAll('[style*="display: none"], [style*="visibility: hidden"], [hidden]')
    hiddenElements.forEach(el => el.remove())
    
    // Inline all computed styles from original to clone
    inlineAllComputedStyles(clone, previewElement)
    
    // Convert flex layouts to table layout for WeasyPrint compatibility
    const flexContainers = clone.querySelectorAll('.flex, [style*="display: flex"], [style*="display:flex"]')
    flexContainers.forEach((cloned) => {
      if (cloned instanceof HTMLElement) {
        let style = cloned.getAttribute('style') || ''
        
        // Check if it's a flex container
        if (style.includes('display: flex') || style.includes('display:flex') || cloned.classList.contains('flex')) {
          // Convert to table
          style = style.replace(/display:\s*[^;]+/gi, '').trim()
          style = `display: table; width: 100%; table-layout: fixed; ${style}`.trim()
          
          // Get gap from style or computed
          const gapMatch = style.match(/gap:\s*([^;]+)/i)
          const gapValue = gapMatch ? gapMatch[1].trim() : '0'
          
          // Convert children to table cells
          Array.from(cloned.children).forEach((child, childIdx) => {
            if (child instanceof HTMLElement) {
              let childStyle = child.getAttribute('style') || ''
              
              // Get width from style
              const widthMatch = childStyle.match(/width:\s*([^;]+)/i)
              const width = widthMatch ? widthMatch[1].trim() : null
              
              // Convert to table-cell
              childStyle = childStyle.replace(/display:\s*[^;]+/gi, '').trim()
              
              if (width && width.includes('%')) {
                childStyle = `display: table-cell; width: ${width}; vertical-align: top; ${childStyle}`.trim()
              } else {
                // Calculate width if not set
                const totalChildren = cloned.children.length
                const defaultWidth = `${100 / totalChildren}%`
                childStyle = `display: table-cell; width: ${defaultWidth}; vertical-align: top; ${childStyle}`.trim()
              }
              
              // Add gap as padding-right (except last child)
              if (gapValue !== '0' && childIdx < cloned.children.length - 1) {
                const gapNum = parseFloat(gapValue.replace('px', ''))
                if (!isNaN(gapNum)) {
                  childStyle = `${childStyle} padding-right: ${gapNum / 2}px;`.trim()
                }
              }
              
              child.setAttribute('style', childStyle)
            }
          })
          
          cloned.setAttribute('style', style)
        }
      }
    })
    
    // Convert grid layouts to table layout for WeasyPrint compatibility (critical for two-column templates)
    // We need to traverse both original and clone to get computed styles from original
    function convertGridToTable(original: HTMLElement, cloned: HTMLElement): void {
      const computedStyle = window.getComputedStyle(original)
      const display = computedStyle.display
      
      // Check if it's a grid container
      if (display === 'grid' || original.getAttribute('style')?.includes('grid-template-columns')) {
        let style = cloned.getAttribute('style') || ''
        
        // Extract grid-template-columns from computed style or inline style
        const gridCols = computedStyle.gridTemplateColumns || original.getAttribute('style')?.match(/grid-template-columns:\s*([^;]+)/i)?.[1]?.trim()
        
        // Convert to table
        style = style.replace(/display:\s*[^;]+/gi, '').trim()
        style = style.replace(/grid-template-columns:\s*[^;]+/gi, '').trim()
        style = style.replace(/grid-gap:\s*[^;]+/gi, '').trim()
        style = style.replace(/gap:\s*[^;]+/gi, '').trim()
        style = `display: table; width: 100%; table-layout: fixed; ${style}`.trim()
        
        // Get gap from computed style or inline style
        const gapValue = computedStyle.gap || original.getAttribute('style')?.match(/gap:\s*([^;]+)/i)?.[1]?.trim() || '0'
        
        // Parse grid-template-columns to get column widths
        let columnWidths: string[] = []
        if (gridCols && gridCols !== 'none') {
          // Handle formats like "50% 50%" or "1fr 1fr" or "40% 60%"
          const cols = gridCols.split(/\s+/).filter(c => c.trim())
          columnWidths = cols.map(col => {
            if (col.includes('%')) {
              return col
            } else if (col.includes('fr')) {
              // Convert fr to percentage
              const frValue = parseFloat(col.replace('fr', '')) || 1
              const totalFr = cols.reduce((sum, c) => sum + (parseFloat(c.replace('fr', '')) || 1), 0)
              return `${(frValue / totalFr) * 100}%`
            } else {
              // Default to equal distribution
              return `${100 / cols.length}%`
            }
          })
        } else {
          // Default to equal columns
          const totalChildren = cloned.children.length
          columnWidths = Array(totalChildren).fill(`${100 / totalChildren}%`)
        }
        
        // Convert children to table cells
        Array.from(cloned.children).forEach((child, childIdx) => {
          if (child instanceof HTMLElement && childIdx < original.children.length && original.children[childIdx] instanceof HTMLElement) {
            let childStyle = child.getAttribute('style') || ''
            
            // Convert to table-cell
            childStyle = childStyle.replace(/display:\s*[^;]+/gi, '').trim()
            
            const width = columnWidths[childIdx] || `${100 / cloned.children.length}%`
            childStyle = `display: table-cell; width: ${width}; vertical-align: top; ${childStyle}`.trim()
            
            // Add gap as padding-right (except last child)
            if (gapValue !== '0' && gapValue !== 'none' && childIdx < cloned.children.length - 1) {
              const gapNum = parseFloat(gapValue.replace('px', '').replace('rem', '').replace('em', ''))
              if (!isNaN(gapNum) && gapNum > 0) {
                // Convert rem/em to px if needed (approximate)
                const gapPx = gapValue.includes('rem') ? gapNum * 16 : (gapValue.includes('em') ? gapNum * 16 : gapNum)
                childStyle = `${childStyle} padding-right: ${gapPx / 2}px;`.trim()
              }
            }
            
            child.setAttribute('style', childStyle)
            
            // Recursively process children
            convertGridToTable(original.children[childIdx] as HTMLElement, child)
          }
        })
        
        cloned.setAttribute('style', style)
      } else {
        // Not a grid, but check children recursively
        Array.from(cloned.children).forEach((child, childIdx) => {
          if (child instanceof HTMLElement && childIdx < original.children.length && original.children[childIdx] instanceof HTMLElement) {
            convertGridToTable(original.children[childIdx] as HTMLElement, child)
          }
        })
      }
    }
    
    // Apply grid conversion starting from root
    convertGridToTable(previewElement, clone)
    
    // Map original elements to cloned elements and ensure styles
    function mapAndStyleElements(original: HTMLElement, cloned: HTMLElement): void {
      const computed = window.getComputedStyle(original)
      let style = cloned.getAttribute('style') || ''
      
      // Remove any display:none or visibility:hidden
      style = style.replace(/display:\s*none/gi, '').trim()
      style = style.replace(/visibility:\s*hidden/gi, '').trim()
      
      // Ensure color is set
      const color = computed.color
      if (color && color !== 'rgba(0, 0, 0, 0)' && color !== 'transparent' && color !== 'rgb(255, 255, 255)') {
        if (!style.includes('color:')) {
          style = `${style} color: ${color};`.trim()
        }
      } else if (!style.includes('color:')) {
        // Default to black
        style = `${style} color: #000000;`.trim()
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
          mapAndStyleElements(original.children[idx] as HTMLElement, child)
        }
      })
    }
    
    // Apply styles from original to clone
    mapAndStyleElements(previewElement, clone)
    
    // Verify clone has content
    if (!clone.textContent || clone.textContent.trim().length === 0) {
      throw new Error('Failed to capture resume content. Please try again.')
    }
    
    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    @page {
      size: A4;
      margin: 0.5in;
    }
    * {
      box-sizing: border-box;
    }
    body {
      margin: 0;
      padding: 0;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      color: #000;
      background: white;
    }
    .preview-resume-container {
      width: 100%;
      max-width: 8.5in;
      margin: 0 auto;
      padding: 20px;
      background: white;
      color: #000;
    }
    .flex {
      display: table !important;
      width: 100% !important;
      table-layout: fixed !important;
    }
    div[style*="display: flex"], div[style*="display:flex"] {
      display: table !important;
      width: 100% !important;
      table-layout: fixed !important;
    }
    div[style*="display: grid"], div[style*="display:grid"] {
      display: table !important;
      width: 100% !important;
      table-layout: fixed !important;
    }
    div[style*="grid-template-columns"] {
      display: table !important;
      width: 100% !important;
      table-layout: fixed !important;
    }
    div[style*="display: table"] {
      display: table !important;
      width: 100% !important;
      table-layout: fixed !important;
    }
    div[style*="display: table-cell"] {
      display: table-cell !important;
      vertical-align: top !important;
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

    return html
  } catch (error) {
    console.error('Error capturing preview HTML:', error)
    throw new Error(`Failed to capture preview: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

export async function exportPreviewAsPDF(filename: string = 'resume.pdf', apiBase?: string): Promise<void> {
  try {
    const html = await capturePreviewHTML()
    const baseUrl = apiBase || process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:8000'
    
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

