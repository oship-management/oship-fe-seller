import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { authApi } from '@/api/auth'

export const useAuthStore = defineStore('auth', () => {
  const token = ref(localStorage.getItem('seller_token') || null)
  const refreshToken = ref(localStorage.getItem('seller_refreshToken') || null)
  const user = ref(JSON.parse(localStorage.getItem('seller_user') || 'null'))

  const isAuthenticated = computed(() => !!token.value)

  const login = async (credentials) => {
    try {
      console.log('Login attempt with:', credentials)
      const response = await authApi.login(credentials)
      console.log('Login response:', response)
      
      // API 응답 구조 확인
      if (!response.data) {
        throw new Error('Invalid API response structure')
      }
      
      const responseData = response.data.data || response.data
      console.log('Response data:', responseData)
      
      const accessToken = responseData.accessToken || responseData.token
      const newRefreshToken = responseData.refreshToken
      
      if (!accessToken) {
        throw new Error('No access token received from server')
      }
      
      token.value = accessToken
      refreshToken.value = newRefreshToken
      
      localStorage.setItem('seller_token', accessToken)
      if (newRefreshToken) {
        localStorage.setItem('seller_refreshToken', newRefreshToken)
      }
      
      // 사용자 정보 저장 - 다양한 응답 구조 대응
      const userData = responseData.user || responseData.seller || responseData
      if (userData && (userData.id || userData.email)) {
        user.value = userData
        localStorage.setItem('seller_user', JSON.stringify(userData))
        console.log('User data saved:', userData)
      } else {
        // 사용자 정보가 없으면 기본값 설정
        const defaultUser = {
          id: 1,
          email: credentials.email,
          name: '셀러'
        }
        user.value = defaultUser
        localStorage.setItem('seller_user', JSON.stringify(defaultUser))
        console.log('Default user data saved:', defaultUser)
      }
      
      return true
    } catch (error) {
      console.error('Login failed:', error)
      console.error('Error details:', error.response?.data)
      throw error
    }
  }

  const logout = async () => {
    try {
      if (token.value) {
        await authApi.logout()
      }
    } catch (error) {
      console.error('Logout failed:', error)
    } finally {
      token.value = null
      refreshToken.value = null
      user.value = null
      
      localStorage.removeItem('seller_token')
      localStorage.removeItem('seller_refreshToken')
      localStorage.removeItem('seller_user')
    }
  }

  const refreshAccessToken = async () => {
    try {
      if (!refreshToken.value) {
        throw new Error('No refresh token available')
      }
      
      const response = await authApi.refresh()
      const { accessToken } = response.data.data
      
      token.value = accessToken
      localStorage.setItem('seller_token', accessToken)
      
      return accessToken
    } catch (error) {
      console.error('Token refresh failed:', error)
      await logout()
      throw error
    }
  }

  return {
    token,
    refreshToken,
    user,
    isAuthenticated,
    login,
    logout,
    refreshAccessToken
  }
})