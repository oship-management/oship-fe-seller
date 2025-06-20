<template>
  <div class="payment-widget-view">
    <el-card class="payment-widget-card">
      <template #header>
        <div class="card-header">
          <h2>결제하기</h2>
        </div>
      </template>
      
      <TossPayment
        v-if="paymentData"
        :payment-data="paymentData"
        @success="handlePaymentSuccess"
        @fail="handlePaymentFail"
      />
      
      <div v-else class="no-payment-data">
        <el-empty description="결제 정보가 없습니다." />
      </div>
    </el-card>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import TossPayment from '@/components/payment/TossPayment.vue'
import { ElMessage } from 'element-plus'

const route = useRoute()
const router = useRouter()

const paymentData = ref(null)

onMounted(() => {
  // URL 파라미터 또는 라우트 쿼리에서 결제 정보 가져오기
  const query = route.query
  
  // window.opener에서 paymentData 가져오기 (ShippingMethodModal에서 설정)
  if (window.opener && window.opener.paymentData) {
    paymentData.value = window.opener.paymentData
  } else if (query.orderId && query.amount) {
    paymentData.value = {
      orderId: query.orderId,
      orderName: query.orderName || '주문',
      amount: parseInt(query.amount),
      customerName: query.customerName || '고객',
      customerEmail: query.customerEmail || 'customer@example.com',
      successUrl: query.successUrl || `${window.location.origin}/payment/success`,
      failUrl: query.failUrl || `${window.location.origin}/payment/fail`
    }
  } else {
    // 결제 정보가 없으면 에러 메시지 표시
    ElMessage.error('결제 정보가 올바르지 않습니다.')
  }
})

const handlePaymentSuccess = (result) => {
  console.log('Payment success:', result)
  
  // 부모 창에 결제 성공 메시지 전송
  if (window.opener && !window.opener.closed) {
    window.opener.postMessage({
      type: 'PAYMENT_SUCCESS',
      data: {
        paymentKey: result.paymentKey,
        orderId: result.orderId || paymentData.value.orderId,
        amount: paymentData.value.amount,
        paymentType: result.paymentType
      }
    }, window.location.origin)
  }
  
  // 성공 페이지로 리다이렉트
  router.push({
    path: '/payment/success',
    query: {
      orderId: paymentData.value.orderId,
      paymentKey: result.paymentKey,
      amount: paymentData.value.amount,
      paymentType: result.paymentType
    }
  })
}

const handlePaymentFail = (error) => {
  console.error('Payment failed:', error)
  
  // 부모 창에 결제 실패 메시지 전송
  if (window.opener && !window.opener.closed) {
    window.opener.postMessage({
      type: 'PAYMENT_FAIL',
      data: {
        orderId: paymentData.value.orderId,
        message: error.message || '결제가 실패했습니다.'
      }
    }, window.location.origin)
  }
  
  // 실패 페이지로 리다이렉트
  router.push({
    path: '/payment/fail',
    query: {
      orderId: paymentData.value.orderId,
      message: error.message
    }
  })
}
</script>

<style scoped>
.payment-widget-view {
  padding: 20px;
  max-width: 800px;
  margin: 0 auto;
}

.payment-widget-card {
  margin-top: 20px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.card-header h2 {
  margin: 0;
  font-size: 20px;
  font-weight: 600;
  color: #303133;
}

.no-payment-data {
  padding: 40px 0;
}
</style>