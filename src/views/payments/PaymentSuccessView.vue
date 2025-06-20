<template>
  <div class="payment-result">
    <div v-if="loading" class="loading-container">
      <el-icon class="is-loading" :size="50"><Loading /></el-icon>
      <p>결제를 처리하는 중입니다...</p>
    </div>
    
    <div v-else-if="error" class="result-content">
      <el-icon class="fail-icon" :size="80">
        <CircleClose />
      </el-icon>
      <h2>결제 처리 중 오류가 발생했습니다</h2>
      <p class="result-message">{{ error }}</p>
      <div class="actions">
        <el-button @click="closeWindow">닫기</el-button>
      </div>
    </div>
    
    <div v-else class="result-content">
      <el-icon class="success-icon" :size="80">
        <CircleCheck />
      </el-icon>
      <h2>결제가 완료되었습니다</h2>
      <p class="result-message">결제가 성공적으로 처리되었습니다.</p>
      
      <div class="payment-info" v-if="paymentInfo">
        <el-descriptions :column="1" border>
          <el-descriptions-item label="주문번호">{{ paymentInfo.orderId }}</el-descriptions-item>
          <el-descriptions-item label="결제금액">{{ formatCurrency(paymentInfo.amount) }}</el-descriptions-item>
          <el-descriptions-item label="결제키">{{ paymentInfo.paymentKey }}</el-descriptions-item>
        </el-descriptions>
      </div>
      
      <div class="actions">
        <el-button type="primary" @click="closeWindow">
          닫기
        </el-button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { CircleCheck, CircleClose, Loading } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'

const route = useRoute()
const paymentInfo = ref(null)
const loading = ref(true)
const error = ref('')

const formatCurrency = (amount) => {
  return new Intl.NumberFormat('ko-KR', {
    style: 'currency',
    currency: 'KRW'
  }).format(amount || 0)
}

const closeWindow = () => {
  // 부모 창에 결제 완료 메시지 전송
  if (window.opener && paymentInfo.value) {
    window.opener.postMessage({
      type: 'PAYMENT_SUCCESS',
      data: {
        orderId: paymentInfo.value.orderId,
        paymentKey: paymentInfo.value.paymentKey,
        amount: paymentInfo.value.amount,
        paymentType: paymentInfo.value.paymentType
      }
    }, window.location.origin)
  }
  window.close()
}

const processPayment = async () => {
  try {
    // URL 파라미터에서 결제 정보 추출
    const { orderId, paymentKey, amount, paymentType } = route.query
    
    if (!orderId || !paymentKey || !amount) {
      throw new Error('결제 정보가 올바르지 않습니다.')
    }
    
    paymentInfo.value = {
      orderId,
      paymentKey,
      amount: parseInt(amount),
      paymentType
    }
    
    // 부모 창에서 전달받은 데이터 확인
    const paymentData = window.opener?.paymentData
    if (!paymentData) {
      throw new Error('결제 데이터를 찾을 수 없습니다.')
    }
    
    // 결제 승인 API 호출
    const { paymentApi } = await import('@/api/payments')
    const confirmResponse = await paymentApi.confirmMultiPayment({
      paymentKey: paymentKey,
      tossOrderId: orderId,
      currency: "KRW",
      orders: paymentData.selectedRate && paymentData.selectedRate.orders 
        ? paymentData.selectedRate.orders.map(order => ({
            orderId: order.orderId,
            amount: order.amount
          }))
        : paymentData.orderIds.map(id => ({
            orderId: id,
            amount: paymentData.amount / paymentData.orderIds.length // fallback to 균등 분할
          }))
    })
    
    if (!confirmResponse.data) {
      throw new Error('결제 승인에 실패했습니다.')
    }
    
    // 결제 성공 메시지
    ElMessage.success('결제가 성공적으로 완료되었습니다.')
    loading.value = false
    
    // 2초 후 자동 닫기
    setTimeout(() => {
      closeWindow()
    }, 2000)
    
  } catch (err) {
    console.error('Payment processing failed:', err)
    error.value = err.message || '결제 처리 중 오류가 발생했습니다.'
    loading.value = false
    ElMessage.error(error.value)
  }
}

onMounted(() => {
  processPayment()
})
</script>

<style scoped>
.payment-result {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 100vh;
  padding: 20px;
  background-color: #f5f7fa;
}

.result-card {
  max-width: 600px;
  width: 100%;
}

.result-content {
  text-align: center;
  padding: 40px 20px;
}

.success-icon {
  color: #67c23a;
  margin-bottom: 20px;
}

.fail-icon {
  color: #f56c6c;
  margin-bottom: 20px;
}

.loading-container {
  text-align: center;
  padding: 60px 20px;
}

.loading-container p {
  margin-top: 20px;
  color: #606266;
  font-size: 16px;
}

.result-content h2 {
  font-size: 24px;
  margin-bottom: 10px;
  color: #303133;
}

.result-message {
  font-size: 16px;
  color: #606266;
  margin-bottom: 30px;
}

.payment-info {
  margin: 30px 0;
  text-align: left;
}

.actions {
  margin-top: 30px;
}
</style>