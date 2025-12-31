'use client'

import { useEffect } from 'react'

export default function MobileWebAppMeta() {
  useEffect(() => {
    const metaTag = document.querySelector('meta[name="mobile-web-app-capable"]')
    if (!metaTag) {
      const meta = document.createElement('meta')
      meta.name = 'mobile-web-app-capable'
      meta.content = 'yes'
      document.head.appendChild(meta)
    }
  }, [])

  return null
}

