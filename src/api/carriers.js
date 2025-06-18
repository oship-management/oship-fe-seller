import apiClient from './index'

export const carrierApi = {
  // 운송사 목록 조회
  getCarriers: () => {
    return apiClient.get('/v1/carriers')
  },
  
  // 운송사 요금 조회
  getCarrierRates: (params) => {
    return apiClient.get('/v1/carriers/rates', { params })
  }
}