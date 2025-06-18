import apiClient from './index'

export const shipmentApi = {
  // 배송 생성
  createShipment: (data) => {
    return apiClient.post('/v1/shipping/orders', data)
  },
  
  // 배송 정보 조회
  getShipment: (id) => {
    return apiClient.get(`/v1/shipping/shipment/${id}`)
  },
  
  // 바코드 유효성 검사
  validateBarcode: (barcode) => {
    return apiClient.get(`/v1/shipping/barcode?barcode=${barcode}`)
  },
  
  // 바코드 프린트
  printBarcode: (orderId) => {
    return apiClient.patch(`/v1/shipping/orders/${orderId}/barcode-printed`)
  }
}