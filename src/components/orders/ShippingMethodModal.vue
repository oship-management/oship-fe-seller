<template>
  <!-- Shipping Modal -->
  <el-dialog
    :model-value="modelValue"
    :title="currentStep === 'selection' ? '배송 방법 선택' : '바코드 생성 완료'"
    :width="currentStep === 'barcode' ? '1200px' : '800px'"
    :before-close="handleClose"
    @update:model-value="$emit('update:modelValue', $event)"
  >
    <!-- 로딩 상태 -->
    <div v-if="loading || processing" style="text-align: center; padding: 40px;">
      <el-icon class="is-loading"><Loading /></el-icon>
      {{ processing ? '배송 처리 중입니다...' : '배송 요금을 조회하는 중입니다...' }}
    </div>
    
    <!-- 배송 방법 선택 단계 -->
    <div v-else-if="currentStep === 'selection' && carrierRates.length > 0" class="shipping-methods">
      <div 
        v-for="rate in carrierRates"
        :key="`${rate.carrierId}-${rate.partnerId}`"
        class="shipping-option"
        :class="{ selected: selectedShippingMethod === `${rate.carrierId}-${rate.partnerId}` }"
        @click="selectShippingMethod(`${rate.carrierId}-${rate.partnerId}`, rate.totalAmount)"
      >
        <div class="shipping-info">
          <div class="shipping-logo">{{ rate.carrierName }}</div>
          <div class="shipping-details">
            <h4>{{ rate.partnerName }}</h4>
            <div class="shipping-meta">
              <span v-for="(order, index) in rate.orders" :key="order.orderId">
                주문 #{{ order.orderId }} ({{ order.kg }}kg, {{ order.countryCode }}){{ index < rate.orders.length - 1 ? ', ' : '' }}
              </span>
            </div>
          </div>
        </div>
        <div class="shipping-price">
          <div class="price-amount">₩{{ formatNumber(rate.totalAmount) }}</div>
          <div class="price-breakdown">
            <small v-for="order in rate.orders" :key="order.orderId">
              #{{ order.orderId }}: ₩{{ formatNumber(order.amount) }}<br>
            </small>
          </div>
        </div>
      </div>
    </div>
    
    <!-- 바코드 생성 완료 단계 -->
    <div v-else-if="currentStep === 'barcode'" class="barcode-section">
      <div class="barcode-grid">
        <div 
          v-for="barcode in generatedBarcodes" 
          :key="barcode.orderId"
          class="barcode-item"
        >
          <!-- Master No를 바코드로 변환 -->
          <div class="barcode-display">
            <canvas 
              :id="`barcode-${barcode.orderId}`" 
              class="barcode-canvas"
              width="500"
              height="120"
            ></canvas>
          </div>
          
          <!-- 주문 정보 -->
          <div class="order-info">
            <div class="master-no">{{ barcode.masterNo }}/{{ barcode.parcelCount }}</div>
            <div class="recipient-name">수취인: {{ barcode.recipientName }}</div>
            <div class="order-no">주문번호: {{ barcode.orderNo }}</div>
          </div>
        </div>
      </div>
    </div>
    
    <el-empty v-else description="배송 가능한 옵션이 없습니다." />

    <template #footer>
      <div class="dialog-footer-wrapper">
        <!-- 배송 방법 선택 단계 -->
        <template v-if="currentStep === 'selection'">
          <div class="total-price-info" v-if="selectedShippingMethod">
            <span class="total-label">선택된 배송비 총액:</span>
            <span class="total-amount">₩{{ formatNumber(selectedShippingPrice) }}</span>
          </div>
          <div class="dialog-footer">
            <el-button @click="handleClose">취소</el-button>
            <el-button 
              type="primary" 
              @click="confirmShipping"
              :disabled="!selectedShippingMethod || processing"
              :loading="processing"
            >
              배송 처리
            </el-button>
          </div>
        </template>
        
        <!-- 바코드 생성 완료 단계 -->
        <template v-else-if="currentStep === 'barcode'">
          <div class="barcode-summary">
            <span>{{ generatedBarcodes.length }}개 주문의 바코드가 생성되었습니다.</span>
          </div>
          <div class="dialog-footer">
            <el-button @click="handleClose">닫기</el-button>
            <el-button 
              type="success" 
              @click="printBarcodes"
              :loading="printing"
            >
              <el-icon><Printer /></el-icon>
              {{ printing ? '프린트 중...' : '프린트' }}
            </el-button>
          </div>
        </template>
      </div>
    </template>
  </el-dialog>
</template>

<script setup>
import { ref, watch, nextTick } from 'vue'
import { Loading, Printer } from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { shipmentApi } from '@/api/shipments'
import JsBarcode from 'jsbarcode'

const props = defineProps({
  // 모달 표시 여부
  modelValue: {
    type: Boolean,
    default: false
  },
  // 배송업체 요금 목록
  carrierRates: {
    type: Array,
    default: () => []
  },
  // 로딩 상태
  loading: {
    type: Boolean,
    default: false
  },
  // 선택된 주문 수
  selectedOrdersCount: {
    type: Number,
    default: 0
  },
  // 선택된 주문들
  selectedOrders: {
    type: Array,
    default: () => []
  }
})

const emit = defineEmits([
  'update:modelValue',    // 모달 닫기
  'confirm',             // 배송 처리 확인
  'close',               // 모달 닫기 이벤트
  'refresh-orders'       // 오더 리스트 새로고침
])

// Local state
const selectedShippingMethod = ref(null)
const selectedShippingPrice = ref(0)
const currentStep = ref('selection') // 'selection' | 'barcode'
const processing = ref(false)
const printing = ref(false)
const generatedBarcodes = ref([])

// Watch for modal close to reset selection
watch(() => props.modelValue, (visible) => {
  if (!visible) {
    resetSelection()
  }
})

// Methods
const selectShippingMethod = (method, price) => {
  selectedShippingMethod.value = method
  selectedShippingPrice.value = price
}

const handleClose = () => {
  resetSelection()
  emit('update:modelValue', false)
  emit('close')
}

const resetSelection = () => {
  selectedShippingMethod.value = null
  selectedShippingPrice.value = 0
  currentStep.value = 'selection'
  processing.value = false
  printing.value = false
  generatedBarcodes.value = []
}

const confirmShipping = async () => {
  if (!selectedShippingMethod.value) {
    ElMessage.warning('배송 방법을 선택해주세요.')
    return
  }
  
  try {
    processing.value = true
    
    // selectedShippingMethod는 "carrierId-partnerId" 형식
    const [carrierId, partnerId] = selectedShippingMethod.value.split('-')
    const selectedRate = props.carrierRates.find(
      rate => rate.carrierId == carrierId && rate.partnerId == partnerId
    )
    
    if (!selectedRate) {
      ElMessage.error('선택한 배송 옵션을 찾을 수 없습니다.')
      return
    }
    
    // 각 주문에 대해 shipment 생성
    const shipmentPromises = props.selectedOrders.map(order => 
      shipmentApi.createOrderShipment(order.id, parseInt(carrierId))
    )
    
    console.log(`Creating shipments for ${props.selectedOrders.length} orders with carrier ${carrierId}`)
    
    await Promise.all(shipmentPromises)
    
    // 바코드 데이터 생성
    generatedBarcodes.value = props.selectedOrders.map(order => ({
      orderId: order.id,
      masterNo: order.oshopMasterNo,
      recipientName: order.recipientName,
      orderNo: order.orderNo || order.oshopMasterNo,
      parcelCount: order.parcelCount || 1
    }))
    
    console.log('Generated barcodes data:', generatedBarcodes.value)
    
    // 바코드 생성 단계로 전환
    currentStep.value = 'barcode'
    
    // 바코드 렌더링
    await nextTick()
    setTimeout(() => {
      console.log('Starting barcode rendering...')
      renderBarcodes()
    }, 100)
    
    ElMessage.success(
      `${props.selectedOrdersCount}개 주문이 ${selectedRate.carrierName} (${selectedRate.partnerName})로 배송 처리되었습니다.`
    )
    
    // 부모 컴포넌트에 배송 처리 완료 알림
    const shippingData = {
      carrierId: parseInt(carrierId),
      partnerId: parseInt(partnerId),
      selectedRate,
      totalAmount: selectedShippingPrice.value
    }
    emit('confirm', shippingData)
    
  } catch (error) {
    console.error('Shipping confirmation failed:', error)
    ElMessage.error('배송 처리에 실패했습니다.')
    currentStep.value = 'selection'
  } finally {
    processing.value = false
  }
}

// 바코드 렌더링 함수
const renderBarcodes = () => {
  // DOM이 완전히 렌더링될 때까지 대기
  setTimeout(() => {
    generatedBarcodes.value.forEach(barcode => {
      const canvasId = `barcode-${barcode.orderId}`
      const canvas = document.getElementById(canvasId)
      console.log(`Looking for canvas: ${canvasId}`, canvas)
      
      if (canvas) {
        try {
          // 기존 내용 클리어
          const ctx = canvas.getContext('2d')
          ctx.clearRect(0, 0, canvas.width, canvas.height)
          
          // 바코드 생성 (MasterNo/PackageCount 형식)
          const barcodeText = `${barcode.masterNo}/${barcode.parcelCount}`
          JsBarcode(canvas, barcodeText, {
            format: "CODE128",
            width: 2,
            height: 80,
            displayValue: true,
            fontSize: 14,
            margin: 10,
            background: "#ffffff",
            lineColor: "#000000"
          })
          console.log(`Barcode generated for order ${barcode.orderId} with masterNo: ${barcode.masterNo}`)
        } catch (error) {
          console.error(`Failed to generate barcode for order ${barcode.orderId}:`, error)
        }
      } else {
        console.error(`Canvas not found for order ${barcode.orderId}`)
        // 다시 한 번 더 시도
        setTimeout(() => {
          const retryCanvas = document.getElementById(canvasId)
          if (retryCanvas) {
            try {
              const barcodeText = `${barcode.masterNo}/${barcode.parcelCount}`
              JsBarcode(retryCanvas, barcodeText, {
                format: "CODE128",
                width: 2,
                height: 80,
                displayValue: true,
                fontSize: 14,
                margin: 10,
                background: "#ffffff",
                lineColor: "#000000"
              })
              console.log(`Barcode generated on retry for order ${barcode.orderId}`)
            } catch (error) {
              console.error(`Failed to generate barcode on retry for order ${barcode.orderId}:`, error)
            }
          }
        }, 200)
      }
    })
  }, 200)
}

// 프린트 함수
const printBarcodes = async () => {
  try {
    printing.value = true
    
    // 이미 프린트된 바코드 확인
    const alreadyPrintedBarcodes = generatedBarcodes.value.filter(barcode => 
      props.selectedOrders.find(order => order.id === barcode.orderId)?.isPrintBarcode
    )
    
    // 이미 프린트된 바코드가 있는 경우 확인
    if (alreadyPrintedBarcodes.length > 0) {
      const confirmMessage = `이미 프린트된 바코드가 ${alreadyPrintedBarcodes.length}개 있습니다.\n다시 프린트하시겠습니까?\n\n프린트된 바코드:\n${alreadyPrintedBarcodes.map(b => `- ${b.masterNo} (${b.recipientName})`).join('\n')}`
      
      try {
        await ElMessageBox.confirm(confirmMessage, '바코드 재프린트 확인', {
          confirmButtonText: '프린트',
          cancelButtonText: '취소',
          type: 'warning',
          dangerouslyUseHTMLString: false
        })
      } catch (error) {
        printing.value = false
        return // 사용자가 취소한 경우
      }
    }
    
    // 각 주문에 대해 바코드 프린트 API 호출
    const printPromises = generatedBarcodes.value.map(barcode => 
      shipmentApi.printBarcode(barcode.orderId)
    )
    
    console.log(`Printing barcodes for ${generatedBarcodes.value.length} orders`)
    
    await Promise.all(printPromises)
    
    // 모든 바코드를 한 번에 프린트 (페이지별로 구분)
    await printAllBarcodesWithPages()
    
    ElMessage.success('바코드가 프린트되었습니다.')
    
    // 프린트 완료 후 모달 닫기
    handleClose()
    
    // 오더 리스트 새로고침을 위해 부모 컴포넌트에 알림
    emit('refresh-orders')
    
  } catch (error) {
    console.error('Print failed:', error)
    ElMessage.error('바코드 프린트에 실패했습니다.')
  } finally {
    printing.value = false
  }
}

// 개별 바코드 프린트 함수
const printSingleBarcode = (barcode) => {
  return new Promise((resolve, reject) => {
    try {
      // 새 창 생성
      const printWindow = window.open('', '_blank', 'width=800,height=600')
      
      if (!printWindow) {
        console.error('팝업이 차단되었습니다.')
        reject(new Error('팝업이 차단되었습니다.'))
        return
      }
      
      // 바코드 HTML 생성
      const canvas = document.getElementById(`barcode-${barcode.orderId}`)
      if (!canvas) {
        console.error(`Canvas not found for barcode ${barcode.orderId}`)
        reject(new Error(`Canvas not found for barcode ${barcode.orderId}`))
        return
      }
      
      const barcodeDataUrl = canvas.toDataURL('image/png')
      console.log(`Canvas data URL length: ${barcodeDataUrl.length}`)
      
      const printContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>바코드 - ${barcode.masterNo}</title>
        <style>
          body {
            margin: 0;
            padding: 20px;
            font-family: Arial, sans-serif;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            height: 100vh;
          }
          .barcode-container {
            text-align: center;
            border: 2px solid #000;
            padding: 30px;
            border-radius: 8px;
            background: white;
          }
          .barcode-image {
            margin-bottom: 20px;
          }
          .barcode-image img {
            max-width: 100%;
            height: auto;
          }
          .master-no {
            font-size: 24px;
            font-weight: bold;
            color: #000;
            margin-bottom: 15px;
          }
          .info-line {
            font-size: 16px;
            color: #333;
            margin-bottom: 8px;
          }
          @media print {
            body { margin: 0; padding: 0; }
            .barcode-container { border: 2px solid #000; }
          }
        </style>
      </head>
      <body>
        <div class="barcode-container">
          <div class="barcode-image">
            <img src="${barcodeDataUrl}" alt="Barcode ${barcode.masterNo}" />
          </div>
          <div class="master-no">${barcode.masterNo}/${barcode.parcelCount}</div>
          <div class="info-line">수취인: ${barcode.recipientName}</div>
          <div class="info-line">주문번호: ${barcode.orderNo}</div>
        </div>
      </body>
      </html>
    `
    
      printWindow.document.write(printContent)
      printWindow.document.close()
      
      // 페이지 로드 완료 후 프린트
      printWindow.onload = () => {
        setTimeout(() => {
          try {
            printWindow.print()
            setTimeout(() => {
              printWindow.close()
              resolve()
            }, 100)
          } catch (error) {
            console.error('Print error:', error)
            printWindow.close()
            reject(error)
          }
        }, 500)
      }
      
      // 에러 처리
      printWindow.onerror = (error) => {
        console.error('Print window error:', error)
        printWindow.close()
        reject(error)
      }
      
    } catch (error) {
      console.error('Print setup error:', error)
      reject(error)
    }
  })
}

// 모든 바코드를 페이지별로 프린트하는 함수
const printAllBarcodesWithPages = () => {
  return new Promise((resolve, reject) => {
    try {
      // 새 창 생성
      const printWindow = window.open('', '_blank', 'width=800,height=600')
      
      if (!printWindow) {
        console.error('팝업이 차단되었습니다.')
        reject(new Error('팝업이 차단되었습니다.'))
        return
      }
      
      // 모든 바코드 이미지 데이터 수집
      const barcodeDataUrls = []
      
      generatedBarcodes.value.forEach(barcode => {
        const canvas = document.getElementById(`barcode-${barcode.orderId}`)
        if (canvas) {
          const barcodeDataUrl = canvas.toDataURL('image/png')
          barcodeDataUrls.push({
            ...barcode,
            dataUrl: barcodeDataUrl
          })
        }
      })
      
      // 멀티페이지 프린트 HTML 생성
      const printContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>바코드 프린트</title>
        <style>
          @page {
            margin: 20mm;
            size: A4;
          }
          
          body {
            margin: 0;
            padding: 0;
            font-family: Arial, sans-serif;
          }
          
          .barcode-page {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: flex-start;
            height: 100vh;
            page-break-after: always;
            box-sizing: border-box;
            padding: 40px 40px 20px 40px;
          }
          
          .barcode-page:last-child {
            page-break-after: auto;
          }
          
          .barcode-container {
            text-align: center;
            border: 2px solid #000;
            padding: 30px;
            border-radius: 8px;
            background: white;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
            width: 100%;
            max-width: 400px;
            margin-bottom: 20px;
          }
          
          .barcode-image {
            margin-bottom: 20px;
          }
          
          .barcode-image img {
            max-width: 100%;
            height: auto;
          }
          
          .master-no {
            font-size: 24px;
            font-weight: bold;
            color: #000;
            margin-bottom: 15px;
          }
          
          .info-line {
            font-size: 18px;
            color: #333;
            margin-bottom: 8px;
            font-weight: 500;
          }
          
          @media print {
            body { 
              margin: 0; 
              padding: 0; 
            }
            
            .barcode-page {
              height: auto;
              min-height: 100vh;
              margin: 0;
              padding: 40px 40px 20px 40px;
              justify-content: flex-start;
            }
            
            .barcode-container { 
              border: 2px solid #000; 
              box-shadow: none;
            }
          }
        </style>
      </head>
      <body>
        ${barcodeDataUrls.map(barcode => `
          <div class="barcode-page">
            <div class="barcode-container">
              <div class="barcode-image">
                <img src="${barcode.dataUrl}" alt="Barcode ${barcode.masterNo}" />
              </div>
              <div class="master-no">${barcode.masterNo}/${barcode.parcelCount}</div>
              <div class="info-line">수취인: ${barcode.recipientName}</div>
              <div class="info-line">주문번호: ${barcode.orderNo}</div>
            </div>
          </div>
        `).join('')}
      </body>
      </html>
    `
    
      printWindow.document.write(printContent)
      printWindow.document.close()
      
      // 페이지 로드 완료 후 프린트
      printWindow.onload = () => {
        setTimeout(() => {
          try {
            printWindow.print()
            setTimeout(() => {
              printWindow.close()
              resolve()
            }, 1000)
          } catch (error) {
            console.error('Print error:', error)
            printWindow.close()
            reject(error)
          }
        }, 500)
      }
      
      // 에러 처리
      printWindow.onerror = (error) => {
        console.error('Print window error:', error)
        printWindow.close()
        reject(error)
      }
      
    } catch (error) {
      console.error('Print setup error:', error)
      reject(error)
    }
  })
}

// 숫자 포맷팅 유틸리티 함수
const formatNumber = (num) => {
  if (!num && num !== 0) return '0'
  return new Intl.NumberFormat('ko-KR').format(num)
}
</script>

<style scoped>
.shipping-methods {
  display: grid;
  gap: 15px;
}

.shipping-option {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px;
  background: #f8f9fa;
  border-radius: 8px;
  border: 2px solid transparent;
  cursor: pointer;
  transition: all 0.3s ease;
}

.shipping-option:hover {
  border-color: #409eff;
  background: #ecf5ff;
}

.shipping-option.selected {
  border-color: #409eff;
  background: #ecf5ff;
}

.shipping-info {
  display: flex;
  align-items: center;
  gap: 15px;
}

.shipping-logo {
  padding: 8px 16px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: bold;
  background: #4B0082;
  color: white;
  font-size: 14px;
  min-width: 80px;
}

.shipping-details h4 {
  color: #303133;
  font-size: 16px;
  font-weight: 600;
  margin-bottom: 5px;
}

.shipping-meta {
  color: #909399;
  font-size: 14px;
}

.shipping-price {
  text-align: right;
}

.price-amount {
  font-size: 20px;
  font-weight: 700;
  color: #303133;
}

.price-breakdown {
  margin-top: 5px;
  color: #909399;
  font-size: 12px;
  line-height: 1.4;
}

.dialog-footer-wrapper {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
}

.total-price-info {
  display: flex;
  align-items: center;
  gap: 12px;
}

.total-label {
  font-size: 14px;
  color: #606266;
}

.total-amount {
  font-size: 24px;
  font-weight: 700;
  color: #409eff;
}

.dialog-footer {
  display: flex;
  gap: 10px;
}

/* 바코드 섹션 스타일 */
.barcode-section {
  padding: 20px;
}

.barcode-grid {
  display: flex;
  flex-direction: column;
  gap: 20px;
  align-items: center;
}

.barcode-item {
  border: 1px solid #e4e7ed;
  border-radius: 8px;
  padding: 20px;
  background: white;
  text-align: center;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  width: 100%;
  max-width: 600px;
}

.barcode-display {
  margin-bottom: 15px;
}

.barcode-canvas {
  border: 1px solid #e0e0e0;
  border-radius: 4px;
}

.order-info {
  text-align: center;
}

.master-no {
  font-size: 18px;
  font-weight: bold;
  color: #303133;
  margin-bottom: 8px;
}

.recipient-name, .order-no {
  font-size: 14px;
  color: #606266;
  margin-bottom: 4px;
}

.barcode-summary {
  font-size: 14px;
  color: #606266;
}

/* 프린트 스타일 */
@media print {
  .el-dialog {
    position: static !important;
    margin: 0 !important;
    padding: 0 !important;
    box-shadow: none !important;
    border: none !important;
  }
  
  .el-dialog__header,
  .el-dialog__footer {
    display: none !important;
  }
  
  .barcode-grid {
    grid-template-columns: repeat(2, 1fr);
    gap: 30px;
    page-break-inside: avoid;
  }
  
  .barcode-item {
    page-break-inside: avoid;
    margin-bottom: 30px;
    box-shadow: none;
    border: 2px solid #000;
  }
}
</style>