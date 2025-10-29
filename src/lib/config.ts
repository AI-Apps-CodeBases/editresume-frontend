// Centralized configuration for API URLs and environment detection
export const config = {
  // API Base URL - uses environment variable or falls back to localhost for development
  apiBase: process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:8000',
  
  // Frontend URL - uses environment variable or falls back to localhost for development
  frontendUrl: process.env.NEXT_PUBLIC_FRONTEND_URL || 'http://localhost:3000',
  
  // Environment detection
  isDevelopment: process.env.NODE_ENV === 'development',
  isProduction: process.env.NODE_ENV === 'production',
  
  // Validation helpers
  validateApiUrl: () => {
    const apiUrl = config.apiBase;
    if (apiUrl.includes('localhost') && config.isProduction) {
      console.error('❌ CRITICAL: API URL is localhost in production!', apiUrl);
      return false;
    }
    return true;
  },
  
  validateFrontendUrl: () => {
    const frontendUrl = config.frontendUrl;
    if (frontendUrl.includes('localhost') && config.isProduction) {
      console.error('❌ CRITICAL: Frontend URL is localhost in production!', frontendUrl);
      return false;
    }
    return true;
  }
};

// Validate configuration on import
if (typeof window !== 'undefined') {
  config.validateApiUrl();
  config.validateFrontendUrl();
}

export default config;
