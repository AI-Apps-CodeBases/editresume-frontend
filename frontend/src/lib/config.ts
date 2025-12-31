// Centralized configuration for API URLs and environment detection

/**
 * Dynamically determines the API base URL based on the current window location
 * - localhost/127.0.0.1 → http://localhost:8000
 * - staging domains → https://editresume-staging.onrender.com
 * - production domains → production API URL (to be configured)
 * - Otherwise uses environment variable or default
 */
export function getApiBaseUrl(): string {
  let baseUrl: string;
  
  // If environment variable is set, use it (highest priority)
  if (process.env.NEXT_PUBLIC_API_BASE) {
    baseUrl = process.env.NEXT_PUBLIC_API_BASE;
  } else if (typeof window !== 'undefined' && window.location) {
    try {
      const hostname = window.location.hostname;
      
      // Local development
      if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '0.0.0.0') {
        baseUrl = 'http://localhost:8000';
      }
      // Staging environment
      else if (hostname.includes('staging') || hostname.includes('staging.editresume.io')) {
        baseUrl = 'https://editresume-staging.onrender.com';
      }
      // Production environment
      else if (hostname === 'editresume.io' || hostname === 'www.editresume.io' || hostname.includes('editresume.io')) {
        // TODO: Replace with actual production API URL when available
        baseUrl = 'https://editresume-staging.onrender.com'; // Using staging for now
      } else {
        baseUrl = 'http://localhost:8000';
      }
    } catch (e) {
      // Fallback if window.location access fails
      console.warn('Failed to determine API URL from window.location:', e);
      baseUrl = 'http://localhost:8000';
    }
  } else {
    // Default fallback
    baseUrl = 'http://localhost:8000';
  }
  
  // Remove trailing slash to prevent double slashes in API paths
  return baseUrl.replace(/\/$/, '');
}

export function normalizeApiUrl(url: string): string {
  return url.replace(/\/$/, '');
}

export const config = {
  // API Base URL - dynamically determined based on environment
  get apiBase() {
    return getApiBaseUrl();
  },
  
  // Frontend URL - uses environment variable or falls back to localhost for development
  frontendUrl: process.env.NEXT_PUBLIC_FRONTEND_URL || 'http://localhost:3000',
  
  // Environment detection
  isDevelopment: process.env.NODE_ENV === 'development',
  isProduction: process.env.NODE_ENV === 'production',
  
  // Validation helpers
  validateApiUrl: () => {
    // Only validate in browser environment
    if (typeof window === 'undefined') return true;
    
    const apiUrl = config.apiBase;
    if (apiUrl.includes('localhost') && config.isProduction) {
      console.error('❌ CRITICAL: API URL is localhost in production!', apiUrl);
      return false;
    }
    return true;
  },
  
  validateFrontendUrl: () => {
    // Only validate in browser environment
    if (typeof window === 'undefined') return true;
    
    const frontendUrl = config.frontendUrl;
    if (frontendUrl.includes('localhost') && config.isProduction) {
      console.error('❌ CRITICAL: Frontend URL is localhost in production!', frontendUrl);
      return false;
    }
    return true;
  }
};

// Validate configuration (only in browser, and only when actually used)
// We don't validate on import to avoid SSR issues

export default config;
