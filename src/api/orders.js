import apiClient from './index'

export const orderApi = {
  // 주문 목록 조회
  getOrders: (params) => {
    return apiClient.get('/v1/orders', { params })
  },
  
  // 주문 상세 조회
  getOrder: (id) => {
    return apiClient.get(`/v1/orders/${id}`)
  },
  
  // 주문 생성
  createOrder: (data) => {
    return apiClient.post('/v1/orders', data)
  },
  
  // 주문 수정
  updateOrder: (id, data) => {
    return apiClient.patch(`/v1/orders/${id}`, data)
  },
  
  // 주문 삭제
  deleteOrder: (id) => {
    return apiClient.delete(`/v1/orders/${id}`)
  },
  
  // 주문 통계
  getOrderStats: (params) => {
    return apiClient.get('/v1/seller-stats/monthly', { params })
  },
  
  // 엑셀 업로드
  uploadExcel: (file) => {
    const formData = new FormData()
    formData.append('file', file)
    return apiClient.post('/v1/orders/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      },
      timeout: 600000 // 10분으로 타임아웃 증가
    })
  }
}