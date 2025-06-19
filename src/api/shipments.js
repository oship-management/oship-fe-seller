import apiClient from './index'

export const shipmentApi = {
  // 배송 생성
  createShipment: (data) => {
    return apiClient.post('/v1/shipping/orders', data)
  },
  
  // 특정 주문과 운송업체 연결하여 shipment 생성
  createOrderShipment: (orderId, carrierId) => {
    return apiClient.post(`/v1/shipping/orders/${orderId}/carriers/${carrierId}`)
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
  },
  
  // 배송 추적 이벤트 조회
  getTrackingEvents: (orderId) => {
    return apiClient.get(`/v1/shipping/orders/${orderId}/tracking-events`)
  }
}