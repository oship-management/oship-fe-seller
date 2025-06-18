<template>
  <div class="barcode-print">
    <div class="print-header">
      <h3>바코드 프린트</h3>
      <p>배송 처리가 완료된 주문들의 바코드를 프린트할 수 있습니다.</p>
    </div>

    <div class="orders-list">
      <el-table :data="orders" style="width: 100%">
        <el-table-column prop="id" label="주문 ID" width="100" />
        <el-table-column prop="masterNo" label="마스터 번호" width="150" />
        <el-table-column label="바코드" width="200">
          <template #default="scope">
            <div class="barcode-display">
              <span class="barcode-text">{{ getBarcodeText(scope.row) }}</span>
            </div>
          </template>
        </el-table-column>
        <el-table-column prop="recipient" label="수취인" width="120">
          <template #default="scope">
            {{ scope.row.recipient?.name }}
          </template>
        </el-table-column>
        <el-table-column label="상태" width="100">
          <template #default="scope">
            <el-tag :type="scope.row.barcodeGenerated ? 'success' : 'warning'">
              {{ scope.row.barcodeGenerated ? '생성완료' : '대기중' }}
            </el-tag>
          </template>
        </el-table-column>
      </el-table>
    </div>

    <div class="barcode-preview" v-if="orders.length > 0">
      <h4>바코드 미리보기</h4>
      <div class="barcode-grid">
        <div 
          v-for="order in orders" 
          :key="order.id"
          class="barcode-item"
        >
          <div class="barcode-visual">
            <svg 
              :width="barcodeWidth" 
              :height="barcodeHeight"
              class="barcode-svg"
            >
              <!-- 간단한 바코드 시각화 (실제로는 JsBarcode 등 라이브러리 사용 권장) -->
              <g v-for="(bar, index) in generateBarcodePattern(order)" :key="index">
                <rect 
                  :x="index * 2" 
                  y="0" 
                  :width="bar ? 2 : 1" 
                  :height="barcodeHeight - 20"
                  :fill="bar ? '#000' : '#fff'"
                />
              </g>
              <text 
                :x="barcodeWidth / 2" 
                :y="barcodeHeight - 5" 
                text-anchor="middle" 
                font-size="12"
                font-family="monospace"
              >
                {{ getBarcodeText(order) }}
              </text>
            </svg>
          </div>
          <div class="order-info">
            <p><strong>주문:</strong> {{ order.masterNo }}</p>
            <p><strong>수취인:</strong> {{ order.recipient?.name }}</p>
          </div>
        </div>
      </div>
    </div>

    <div class="print-actions">
      <el-button @click="$emit('cancel')">취소</el-button>
      <el-button 
        type="success" 
        :loading="printLoading"
        @click="handleGenerateBarcodes"
        v-if="!allBarcodesGenerated"
      >
        <el-icon><Tickets /></el-icon>
        바코드 생성
      </el-button>
      <el-button 
        type="primary" 
        @click="handlePrint"
        v-if="allBarcodesGenerated"
      >
        <el-icon><Printer /></el-icon>
        프린트
      </el-button>
      <el-button 
        type="primary" 
        @click="handleComplete"
        v-if="allBarcodesGenerated"
      >
        완료
      </el-button>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { shipmentApi } from '@/api/shipments'
import { ElMessage } from 'element-plus'

const props = defineProps({
  orders: {
    type: Array,
    required: true
  }
})

const emit = defineEmits(['success', 'cancel'])

const printLoading = ref(false)
const barcodeWidth = 200
const barcodeHeight = 80

// 각 주문에 바코드 생성 상태 추가
const orders = ref(props.orders.map(order => ({
  ...order,
  barcodeGenerated: false
})))

const allBarcodesGenerated = computed(() => {
  return orders.value.every(order => order.barcodeGenerated)
})

const getBarcodeText = (order) => {
  // MasterNo + /1 (1개 상자 고정)
  return `${order.masterNo}/1`
}

const generateBarcodePattern = (order) => {
  // 간단한 바코드 패턴 생성 (실제로는 더 복잡한 알고리즘 사용)
  const text = getBarcodeText(order)
  const pattern = []
  
  for (let i = 0; i < text.length; i++) {
    const charCode = text.charCodeAt(i)
    // 문자 코드를 기반으로 바 패턴 생성
    for (let j = 0; j < 8; j++) {
      pattern.push((charCode >> j) & 1)
    }
  }
  
  return pattern.slice(0, 100) // 100개 바로 제한
}

const handleGenerateBarcodes = async () => {
  try {
    printLoading.value = true
    
    // 각 주문에 대해 바코드 생성 API 호출
    const promises = orders.value.map(async (order) => {
      try {
        await shipmentApi.printBarcode(order.id)
        order.barcodeGenerated = true
        return { success: true, orderId: order.id }
      } catch (error) {
        console.error(`Barcode generation failed for order ${order.id}:`, error)
        return { success: false, orderId: order.id, error }
      }
    })
    
    const results = await Promise.all(promises)
    
    const successCount = results.filter(r => r.success).length
    const failCount = results.filter(r => !r.success).length
    
    if (failCount === 0) {
      ElMessage.success('모든 바코드가 생성되었습니다')
    } else {
      ElMessage.warning(`${successCount}개 바코드 생성 완료, ${failCount}개 실패`)
    }
    
  } catch (error) {
    console.error('Barcode generation failed:', error)
    ElMessage.error('바코드 생성 중 오류가 발생했습니다')
  } finally {
    printLoading.value = false
  }
}

const handlePrint = () => {
  // 프린트 기능 구현
  const printWindow = window.open('', '_blank')
  const printContent = generatePrintContent()
  
  printWindow.document.write(printContent)
  printWindow.document.close()
  printWindow.print()
  
  ElMessage.success('프린트가 시작되었습니다')
}

const generatePrintContent = () => {
  const barcodeItems = orders.value.map(order => {
    return `
      <div class="print-barcode-item">
        <div class="barcode-visual">
          <svg width="${barcodeWidth}" height="${barcodeHeight}">
            ${generateBarcodePattern(order).map((bar, index) => 
              `<rect x="${index * 2}" y="0" width="${bar ? 2 : 1}" height="${barcodeHeight - 20}" fill="${bar ? '#000' : '#fff'}"/>`
            ).join('')}
            <text x="${barcodeWidth / 2}" y="${barcodeHeight - 5}" text-anchor="middle" font-size="12" font-family="monospace">
              ${getBarcodeText(order)}
            </text>
          </svg>
        </div>
        <div class="order-info">
          <p><strong>주문:</strong> ${order.masterNo}</p>
          <p><strong>수취인:</strong> ${order.recipient?.name}</p>
        </div>
      </div>
    `
  }).join('')

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <title>바코드 프린트</title>
      <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .print-barcode-item { 
          margin-bottom: 30px; 
          page-break-inside: avoid;
          border: 1px solid #ccc;
          padding: 15px;
        }
        .order-info p { margin: 5px 0; }
        @media print {
          .print-barcode-item { break-inside: avoid; }
        }
      </style>
    </head>
    <body>
      <h1>O-Ship 바코드 라벨</h1>
      ${barcodeItems}
    </body>
    </html>
  `
}

const handleComplete = () => {
  emit('success')
}

onMounted(() => {
  // 컴포넌트가 마운트될 때 바코드 생성 상태 확인
  // 실제로는 서버에서 바코드 생성 상태를 확인해야 함
})
</script>

<style scoped>
.barcode-print {
  padding: 16px 0;
}

.print-header {
  margin-bottom: 24px;
}

.print-header h3 {
  margin-bottom: 8px;
  color: #303133;
  font-size: 18px;
  font-weight: 600;
}

.print-header p {
  color: #666;
  margin: 0;
}

.orders-list {
  margin-bottom: 32px;
}

.barcode-display {
  font-family: monospace;
  background: #f5f5f5;
  padding: 4px 8px;
  border-radius: 4px;
}

.barcode-text {
  font-weight: bold;
  font-size: 14px;
}

.barcode-preview {
  margin-bottom: 32px;
}

.barcode-preview h4 {
  margin-bottom: 16px;
  color: #303133;
  font-size: 16px;
  font-weight: 600;
}

.barcode-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 20px;
}

.barcode-item {
  border: 1px solid #e4e7ed;
  border-radius: 8px;
  padding: 16px;
  background: white;
}

.barcode-visual {
  display: flex;
  justify-content: center;
  margin-bottom: 12px;
}

.barcode-svg {
  border: 1px solid #ddd;
  background: white;
}

.order-info p {
  margin: 4px 0;
  font-size: 14px;
  color: #666;
}

.order-info strong {
  color: #303133;
}

.print-actions {
  display: flex;
  justify-content: flex-end;
  gap: 16px;
  padding-top: 24px;
  border-top: 1px solid #e4e7ed;
}
</style>