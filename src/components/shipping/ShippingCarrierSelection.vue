<template>
  <div class="shipping-carrier-selection">
    <div class="order-summary">
      <h3>선택된 주문 ({{ orders.length }}개)</h3>
      <el-table :data="orders" style="width: 100%" max-height="200">
        <el-table-column prop="id" label="ID" width="80" />
        <el-table-column prop="masterNo" label="마스터 번호" width="150" />
        <el-table-column prop="recipient" label="수취인" width="120">
          <template #default="scope">
            {{ scope.row.recipient?.name }}
          </template>
        </el-table-column>
        <el-table-column prop="totalWeight" label="무게" width="100">
          <template #default="scope">
            {{ getTotalWeight(scope.row.items) }}g
          </template>
        </el-table-column>
      </el-table>
    </div>

    <div class="carrier-rates" v-loading="ratesLoading">
      <h3>배송사별 요금</h3>
      <div v-if="carrierRates.length === 0" class="empty-rates">
        <el-empty description="배송사 요금 정보를 불러오는 중입니다..." />
      </div>
      <div v-else class="rates-grid">
        <div 
          v-for="rate in carrierRates" 
          :key="`${rate.carrierName}-${rate.serviceType}`"
          class="rate-card"
          :class="{ 'selected': selectedRate?.id === rate.id }"
          @click="selectRate(rate)"
        >
          <div class="rate-header">
            <div class="carrier-info">
              <h4>{{ getCarrierText(rate.carrierName) }}</h4>
              <span class="service-type">{{ getServiceTypeText(rate.serviceType) }}</span>
            </div>
            <div class="rate-price">
              {{ formatCurrency(rate.totalCost) }}
            </div>
          </div>
          <div class="rate-details">
            <div class="detail-row">
              <span>기본요금:</span>
              <span>{{ formatCurrency(rate.baseCost) }}</span>
            </div>
            <div class="detail-row">
              <span>무게요금:</span>
              <span>{{ formatCurrency(rate.weightCost) }}</span>
            </div>
            <div class="detail-row">
              <span>예상 배송일:</span>
              <span>{{ rate.estimatedDeliveryDays }}일</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div class="selected-summary" v-if="selectedRate">
      <h3>선택된 배송 정보</h3>
      <el-descriptions :column="2" border>
        <el-descriptions-item label="배송사">{{ getCarrierText(selectedRate.carrierName) }}</el-descriptions-item>
        <el-descriptions-item label="서비스">{{ getServiceTypeText(selectedRate.serviceType) }}</el-descriptions-item>
        <el-descriptions-item label="총 비용">{{ formatCurrency(selectedRate.totalCost) }}</el-descriptions-item>
        <el-descriptions-item label="예상 배송일">{{ selectedRate.estimatedDeliveryDays }}일</el-descriptions-item>
      </el-descriptions>
    </div>

    <div class="actions">
      <el-button @click="$emit('cancel')">취소</el-button>
      <el-button 
        type="primary" 
        :disabled="!selectedRate"
        @click="handlePayment"
      >
        결제하기
      </el-button>
    </div>

    <!-- 토스 페이먼트 다이얼로그 -->
    <el-dialog
      v-model="showPaymentDialog"
      title="결제"
      width="60%"
      :close-on-click-modal="false"
      :close-on-press-escape="false"
    >
      <TossPayment
        v-if="paymentData"
        :payment-data="paymentData"
        @success="handlePaymentSuccess"
        @fail="handlePaymentFail"
      />
    </el-dialog>

    <!-- 바코드 프린트 다이얼로그 -->
    <el-dialog
      v-model="showBarcodeDialog"
      title="바코드 프린트"
      width="50%"
      :close-on-click-modal="false"
    >
      <BarcodePrint
        v-if="completedOrders.length > 0"
        :orders="completedOrders"
        @success="handleBarcodeSuccess"
        @cancel="handleBarcodeCancel"
      />
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { carrierApi } from '@/api/carriers'
import { paymentApi } from '@/api/payments'
import { shipmentApi } from '@/api/shipments'
import { ElMessage } from 'element-plus'
import TossPayment from '@/components/payment/TossPayment.vue'
import BarcodePrint from '@/components/barcode/BarcodePrint.vue'

const props = defineProps({
  orders: {
    type: Array,
    required: true
  }
})

const emit = defineEmits(['success', 'cancel'])

const ratesLoading = ref(false)
const carrierRates = ref([])
const selectedRate = ref(null)
const showPaymentDialog = ref(false)
const showBarcodeDialog = ref(false)
const paymentData = ref(null)
const completedOrders = ref([])

const getCarrierText = (carrierName) => {
  const textMap = {
    'FEDEX': 'FedEx',
    'DHL': 'DHL',
    'UPS': 'UPS',
    'EMS': 'EMS'
  }
  return textMap[carrierName] || carrierName
}

const getServiceTypeText = (serviceType) => {
  const textMap = {
    'EXPRESS': '특급',
    'STANDARD': '표준',
    'ECONOMY': '이코노미'
  }
  return textMap[serviceType] || serviceType
}

const formatCurrency = (amount) => {
  return new Intl.NumberFormat('ko-KR', {
    style: 'currency',
    currency: 'KRW'
  }).format(amount || 0)
}

const getTotalWeight = (items) => {
  if (!items || !Array.isArray(items)) return 0
  return items.reduce((total, item) => total + (item.weight || 0), 0)
}

const selectRate = (rate) => {
  selectedRate.value = rate
}

const handlePayment = () => {
  if (!selectedRate.value) {
    ElMessage.warning('배송사를 선택해주세요')
    return
  }

  // 토스 페이먼트 데이터 생성
  paymentData.value = {
    amount: selectedRate.value.totalCost,
    orderId: `SHIPPING_${Date.now()}`,
    orderName: `배송비 결제 - ${props.orders.length}개 주문`,
    customerName: '셀러',
    successUrl: `${window.location.origin}/payment/success`,
    failUrl: `${window.location.origin}/payment/fail`,
    orders: props.orders,
    carrierInfo: selectedRate.value
  }

  showPaymentDialog.value = true
}

const handlePaymentSuccess = async (paymentResult) => {
  try {
    // 결제 승인 처리
    await paymentApi.confirmMultiPayment({
      paymentKey: paymentResult.paymentKey,
      orderId: paymentResult.orderId,
      amount: paymentResult.amount,
      orders: props.orders.map(order => order.id),
      carrierInfo: selectedRate.value
    })

    // 각 주문에 대해 배송 정보 생성
    const shipmentPromises = props.orders.map(order => 
      shipmentApi.createShipment({
        orderId: order.id,
        carrierName: selectedRate.value.carrierName,
        serviceType: selectedRate.value.serviceType,
        weight: getTotalWeight(order.items),
        estimatedDeliveryDays: selectedRate.value.estimatedDeliveryDays
      })
    )

    await Promise.all(shipmentPromises)

    showPaymentDialog.value = false
    completedOrders.value = [...props.orders]
    showBarcodeDialog.value = true

    ElMessage.success('결제가 완료되고 배송 정보가 생성되었습니다')

  } catch (error) {
    console.error('Payment confirmation failed:', error)
    ElMessage.error('결제 처리 중 오류가 발생했습니다')
  }
}

const handlePaymentFail = (error) => {
  console.error('Payment failed:', error)
  ElMessage.error('결제에 실패했습니다')
  showPaymentDialog.value = false
}

const handleBarcodeSuccess = () => {
  showBarcodeDialog.value = false
  emit('success')
  ElMessage.success('배송 처리가 완료되었습니다')
}

const handleBarcodeCancel = () => {
  showBarcodeDialog.value = false
  emit('success')
}

const fetchCarrierRates = async () => {
  try {
    ratesLoading.value = true
    
    // 모든 주문의 총 무게 계산
    const totalWeight = props.orders.reduce((total, order) => {
      return total + getTotalWeight(order.items)
    }, 0)

    // 대표 주소 사용 (첫 번째 주문의 수취인 주소)
    const sampleOrder = props.orders[0]
    
    const params = {
      fromCountry: 'KR', // 발송 국가
      toCountry: sampleOrder.recipient?.address?.countryCode || 'US', // 수취 국가
      weight: totalWeight,
      orderCount: props.orders.length
    }

    const response = await carrierApi.getCarrierRates(params)
    carrierRates.value = response.data.data || []

  } catch (error) {
    console.error('Fetch carrier rates failed:', error)
    ElMessage.error('배송사 요금 정보를 불러오는데 실패했습니다')
  } finally {
    ratesLoading.value = false
  }
}

onMounted(() => {
  fetchCarrierRates()
})
</script>

<style scoped>
.shipping-carrier-selection {
  padding: 16px 0;
}

.order-summary {
  margin-bottom: 32px;
}

.order-summary h3,
.carrier-rates h3,
.selected-summary h3 {
  margin-bottom: 16px;
  color: #303133;
  font-size: 16px;
  font-weight: 600;
}

.carrier-rates {
  margin-bottom: 32px;
}

.empty-rates {
  text-align: center;
  padding: 40px 0;
}

.rates-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 16px;
}

.rate-card {
  border: 2px solid #e4e7ed;
  border-radius: 8px;
  padding: 20px;
  cursor: pointer;
  transition: all 0.3s;
  background: white;
}

.rate-card:hover {
  border-color: #409eff;
  box-shadow: 0 4px 12px rgba(64, 158, 255, 0.1);
}

.rate-card.selected {
  border-color: #409eff;
  background-color: #f0f8ff;
  box-shadow: 0 4px 12px rgba(64, 158, 255, 0.2);
}

.rate-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 16px;
}

.carrier-info h4 {
  margin: 0 0 4px 0;
  font-size: 18px;
  font-weight: 600;
  color: #303133;
}

.service-type {
  font-size: 14px;
  color: #666;
  background: #f5f5f5;
  padding: 2px 8px;
  border-radius: 4px;
}

.rate-price {
  font-size: 20px;
  font-weight: 700;
  color: #409eff;
}

.rate-details {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.detail-row {
  display: flex;
  justify-content: space-between;
  font-size: 14px;
}

.detail-row span:first-child {
  color: #666;
}

.detail-row span:last-child {
  font-weight: 500;
  color: #303133;
}

.selected-summary {
  margin-bottom: 32px;
}

.actions {
  display: flex;
  justify-content: flex-end;
  gap: 16px;
  padding-top: 24px;
  border-top: 1px solid #e4e7ed;
}
</style>