export async function validateAndSavePDF(
  blob: Blob,
  filename: string,
  contentType?: string | null
): Promise<void> {
  if (!blob || blob.size === 0) {
    throw new Error('PDF file is empty or invalid')
  }

  const decoder = new TextDecoder()
  
  if (contentType && !contentType.includes('application/pdf')) {
    const preview = decoder.decode(await blob.slice(0, 200).arrayBuffer())
    console.error('Invalid content type:', contentType, 'Preview:', preview.substring(0, 100))
    throw new Error(`Invalid file type: ${contentType}. Expected PDF. The server may have returned an error message.`)
  }

  const firstBytes = await blob.slice(0, 5).arrayBuffer()
  const header = decoder.decode(firstBytes)

  if (!header.startsWith('%PDF-')) {
    const errorPreview = decoder.decode(await blob.slice(0, 500).arrayBuffer())
    const blobSize = blob.size
    console.error('❌ Invalid PDF detected!')
    console.error('   Header:', header)
    console.error('   Blob size:', blobSize, 'bytes')
    console.error('   Content-Type:', contentType)
    console.error('   Preview:', errorPreview.substring(0, 200))
    
    if (errorPreview.trim().startsWith('{')) {
      try {
        const errorJson = JSON.parse(errorPreview)
        throw new Error(`Server error: ${errorJson.detail || errorJson.message || 'Unknown error'}. Please check your resume content and try again.`)
      } catch {
        throw new Error('Server returned a JSON error instead of a PDF file. Please check your resume content and try again.')
      }
    }
    
    if (errorPreview.trim().startsWith('<!')) {
      throw new Error('Server returned an HTML error page instead of a PDF file. Please check your resume content and try again.')
    }
    
    throw new Error(`Downloaded file is not a valid PDF (got "${header}" instead of "%PDF-"). The file may be corrupted or the server returned an error.`)
  }

  const url = window.URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  window.URL.revokeObjectURL(url)
  document.body.removeChild(a)
}

