import apiClient from './index'

export const paymentApi = {
  // 결제 준비 - 토스 결제창 호출 전 필요한 정보 제공
  preparePayment: (data) => {
    return apiClient.post('/v1/payments/prepare', data)
  },
  
  // 결제 내역 조회
  getPayments: (params) => {
    return apiClient.get('/v1/payments', { params })
  },
  
  // 단건 결제 승인
  confirmOneTimePayment: (data) => {
    return apiClient.post('/v1/payments/one-time', data)
  },
  
  // 다건 결제 승인
  confirmMultiPayment: (data) => {
    return apiClient.post('/v1/payments/multi', data)
  },
  
  // 결제 취소
  cancelPayment: (paymentKey, data) => {
    return apiClient.post(`/v1/payments/${paymentKey}/cancel`, data)
  },
  
  // 주문별 결제 조회
  getPaymentByOrderId: (orderId) => {
    return apiClient.get(`/v1/payments/orders/${orderId}`)
  },
  
  // 나의 결제 내역 조회
  getMyPayments: (params) => {
    return apiClient.get('/v1/payments/mypayments', { params })
  }
}