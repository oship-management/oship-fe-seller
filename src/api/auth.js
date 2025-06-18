import apiClient from './index'

export const authApi = {
  login: (credentials) => {
    return apiClient.post('/v1/auth/login', credentials)
  },
  
  logout: () => {
    return apiClient.post('/v1/auth/logout')
  },
  
  refresh: () => {
    return apiClient.post('/v1/auth/refresh')
  },
  
  getSellerInfo: () => {
    return apiClient.get('/v1/sellers')
  },
  
  signup: (data) => {
    return apiClient.post('/v1/auth/sellers/signup', data)
  }
}