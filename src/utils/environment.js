// 환경 유틸리티 함수들

export const isDevelopment = () => {
  return import.meta.env.VITE_APP_ENV === 'development' || import.meta.env.DEV
}

export const isProduction = () => {
  return import.meta.env.VITE_APP_ENV === 'production' || import.meta.env.PROD
}

export const isLocal = () => {
  return import.meta.env.VITE_APP_ENV === 'local'
}

export const getEnvironment = () => {
  return import.meta.env.VITE_APP_ENV || (import.meta.env.DEV ? 'development' : 'production')
}

export const getApiBaseUrl = () => {
  return import.meta.env.VITE_API_BASE_URL
}

export const getAppName = () => {
  return import.meta.env.VITE_APP_NAME || 'O-Ship Seller'
}

export const isDebugMode = () => {
  return import.meta.env.VITE_DEBUG_MODE === 'true' || isDevelopment() || isLocal()
}

// 환경 정보 로깅 (개발 환경에서만)
export const logEnvironmentInfo = () => {
  if (isDebugMode()) {
    console.group('🌍 Environment Info')
    console.log('Environment:', getEnvironment())
    console.log('Mode:', import.meta.env.MODE)
    console.log('API Base URL:', getApiBaseUrl())
    console.log('App Name:', getAppName())
    console.log('Debug Mode:', isDebugMode())
    console.log('Is Development:', isDevelopment())
    console.log('Is Production:', isProduction())
    console.log('Is Local:', isLocal())
    console.groupEnd()
  }
}