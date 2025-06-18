import axios from 'axios'
import { useAuthStore } from '@/stores/auth'
import { ElMessage } from 'element-plus'

// 환경에 따른 API 기본 URL 설정
const getBaseURL = () => {
  const env = import.meta.env.VITE_APP_ENV
  const apiBaseUrl = import.meta.env.VITE_API_BASE_URL
  
  console.log('Current environment:', env)
  console.log('API Base URL:', apiBaseUrl)
  
  // 개발/로컬 환경에서는 프록시 사용, 프로덕션에서는 직접 URL 사용
  if (env === 'development' || env === 'local') {
    return '/api' // Vite 프록시 사용
  } else {
    return `${apiBaseUrl}/api` || '/api'
  }
}

const apiClient = axios.create({
  baseURL: getBaseURL(),
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json'
  }
})

apiClient.interceptors.request.use(
  (config) => {
    // localStorage에서 직접 토큰 가져오기
    const token = localStorage.getItem('seller_token')
    console.log('API Request interceptor - Token from localStorage:', !!token)
    console.log('API Request interceptor - URL:', config.url)
    
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
      console.log('Authorization header added')
    } else {
      console.log('No token available in localStorage')
    }
    return config
  },
  (error) => {
    console.error('Request interceptor error:', error)
    return Promise.reject(error)
  }
)

apiClient.interceptors.response.use(
  (response) => {
    console.log('API Response success:', response.config.url, response.status)
    return response
  },
  async (error) => {
    console.log('API Response error:', error.config?.url, error.response?.status)
    console.log('Error response data:', error.response?.data)
    
    // 에러 메시지 생성
    let message = '알 수 없는 오류가 발생했습니다'
    
    if (error.response) {
      // 서버 응답이 있는 경우
      const status = error.response.status
      const data = error.response.data
      
      switch (status) {
        case 400:
          message = `잘못된 요청입니다: ${data?.message || '요청 파라미터를 확인해주세요'}`
          break
        case 401:
          message = '인증이 필요합니다. 다시 로그인해주세요.'
          break
        case 403:
          message = '접근 권한이 없습니다.'
          break
        case 404:
          message = `요청한 리소스를 찾을 수 없습니다: ${error.config?.url}`
          break
        case 500:
          message = '서버 오류가 발생했습니다. 잠시 후 다시 시도해주세요.'
          break
        default:
          message = data?.message || `오류가 발생했습니다 (${status})`
      }
    } else if (error.request) {
      // 네트워크 오류
      message = '네트워크 연결을 확인해주세요. 서버에 연결할 수 없습니다.'
    } else {
      // 기타 오류
      message = error.message || '요청 처리 중 오류가 발생했습니다.'
    }
    
    // 401 에러가 아닌 경우에만 에러 메시지 표시
    if (error.response?.status !== 401) {
      ElMessage.error(message)
    }
    
    // 401 에러 시에도 자동 로그아웃하지 않고 에러만 반환
    console.error('API Error details:', {
      url: error.config?.url,
      status: error.response?.status,
      message: message,
      data: error.response?.data
    })
    
    return Promise.reject(error)
  }
)


export default apiClient