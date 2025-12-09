import { NextRequest, NextResponse } from 'next/server'

function getBackendUrl(): string {
  // Priority 1: Use explicit server-side environment variable (not exposed to client)
  // This allows overriding the backend URL for server-side proxy only
  if (process.env.BACKEND_URL) {
    return process.env.BACKEND_URL
  }
  
  // Priority 2: Use NEXT_PUBLIC_API_BASE if it's a full URL (not a relative path)
  if (process.env.NEXT_PUBLIC_API_BASE && 
      process.env.NEXT_PUBLIC_API_BASE !== '/api/proxy' &&
      !process.env.NEXT_PUBLIC_API_BASE.startsWith('/') &&
      process.env.NEXT_PUBLIC_API_BASE.startsWith('http')) {
    return process.env.NEXT_PUBLIC_API_BASE
  }
  
  // Priority 3: Check if we're running in Docker container
  // (Next.js server-side code runs in Node.js, so we can check hostname)
  const hostname = process.env.HOSTNAME || ''
  const isInDocker = hostname.includes('container') || 
                     hostname.includes('editresume_frontend') ||
                     process.env.DOCKER_CONTAINER === 'true'
  
  if (isInDocker) {
    // In Docker, use the service name from docker-compose
    return 'http://editresume_backend:8000'
  }
  
  // Priority 4: Local development - backend in Docker with port mapping
  // Backend container exposes port 8000 to host, so localhost:8000 should work
  // This is the most common case: frontend runs locally, backend runs in Docker
  return 'http://localhost:8000'
}

const BACKEND_URL = getBackendUrl()

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, PATCH, OPTIONS',
      'Access-Control-Allow-Headers': '*',
    },
  })
}

export async function GET(
  request: NextRequest,
  { params }: { params: { path: string[] } }
) {
  return handleRequest(request, params.path, 'GET')
}

export async function POST(
  request: NextRequest,
  { params }: { params: { path: string[] } }
) {
  return handleRequest(request, params.path, 'POST')
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { path: string[] } }
) {
  return handleRequest(request, params.path, 'PUT')
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { path: string[] } }
) {
  return handleRequest(request, params.path, 'DELETE')
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { path: string[] } }
) {
  return handleRequest(request, params.path, 'PATCH')
}

async function handleRequest(
  request: NextRequest,
  pathSegments: string[],
  method: string
) {
  try {
    const path = pathSegments.join('/')
    const url = new URL(request.url)
    const searchParams = url.searchParams.toString()
    const backendBase = BACKEND_URL.endsWith('/') ? BACKEND_URL.slice(0, -1) : BACKEND_URL
    const pathPrefix = path.startsWith('/') ? path : `/${path}`
    const targetUrl = `${backendBase}${pathPrefix}${searchParams ? `?${searchParams}` : ''}`

    if (process.env.NODE_ENV === 'development') {
      console.log(`[Proxy] ${method} ${targetUrl}`)
      console.log(`[Proxy] Backend URL: ${BACKEND_URL}, Path segments: ${JSON.stringify(pathSegments)}`)
      console.log(`[Proxy] Environment check - HOSTNAME: ${process.env.HOSTNAME}, NODE_ENV: ${process.env.NODE_ENV}`)
    }

    const headers: HeadersInit = {}
    
    request.headers.forEach((value, key) => {
      const lowerKey = key.toLowerCase()
      if (
        lowerKey !== 'host' &&
        lowerKey !== 'connection' &&
        lowerKey !== 'content-length' &&
        lowerKey !== 'transfer-encoding'
      ) {
        headers[key] = value
      }
    })

    let body: string | undefined
    if (method !== 'GET' && method !== 'DELETE') {
      const contentType = request.headers.get('content-type') || ''
      if (contentType.includes('multipart/form-data')) {
        const formData = await request.formData()
        body = undefined
        const fetchBody = formData
        const response = await fetch(targetUrl, {
          method,
          headers: {
            ...Object.fromEntries(
              Object.entries(headers).filter(([k]) => 
                k.toLowerCase() !== 'content-type'
              )
            ),
          },
          body: fetchBody,
        })
        const responseData = await response.arrayBuffer()
        return new NextResponse(responseData, {
          status: response.status,
          headers: {
            'Content-Type': response.headers.get('Content-Type') || 'application/octet-stream',
          },
        })
      } else {
        body = await request.text()
      }
    }

    let response: Response
    try {
      response = await fetch(targetUrl, {
        method,
        headers,
        body,
      })
    } catch (fetchError) {
      const isConnectionError = fetchError instanceof TypeError && 
        (fetchError.message.includes('fetch failed') || 
         fetchError.message.includes('ECONNREFUSED') ||
         fetchError.message.includes('network'))
      
      console.error('[Proxy] Fetch error:', {
        error: fetchError instanceof Error ? fetchError.message : String(fetchError),
        targetUrl,
        isConnectionError
      })
      
      return NextResponse.json(
        { 
          error: 'Backend connection failed', 
          message: isConnectionError 
            ? `Cannot connect to backend at ${BACKEND_URL}. Please ensure the backend server is running on port 8000.`
            : (fetchError instanceof Error ? fetchError.message : 'Unknown network error'),
          backendUrl: BACKEND_URL,
          targetUrl
        },
        { status: 503 }
      )
    }

    const contentType = response.headers.get('Content-Type') || ''
    
    if (contentType.includes('application/json')) {
      const responseData = await response.text()
      let jsonData
      try {
        jsonData = JSON.parse(responseData)
      } catch {
        jsonData = responseData
      }

      return NextResponse.json(jsonData, {
        status: response.status,
        headers: {
          'Content-Type': 'application/json',
        },
      })
    } else {
      const responseData = await response.arrayBuffer()
      return new NextResponse(responseData, {
        status: response.status,
        headers: {
          'Content-Type': contentType || 'application/octet-stream',
        },
      })
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    const errorStack = error instanceof Error ? error.stack : undefined
    
    console.error('[Proxy] Error proxying request:', {
      error: errorMessage,
      stack: errorStack,
      backendUrl: BACKEND_URL,
      path: pathSegments.join('/'),
      method
    })
    
    return NextResponse.json(
      { 
        error: 'Proxy request failed', 
        message: errorMessage,
        backendUrl: BACKEND_URL,
        targetPath: pathSegments.join('/'),
        details: process.env.NODE_ENV === 'development' ? {
          stack: errorStack,
          fullError: String(error)
        } : undefined
      },
      { status: 500 }
    )
  }
}

