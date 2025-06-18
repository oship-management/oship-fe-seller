<template>
  <div class="toss-payment">
    <div class="payment-info">
      <h3>결제 정보</h3>
      <el-descriptions :column="1" border>
        <el-descriptions-item label="주문명">{{ paymentData.orderName }}</el-descriptions-item>
        <el-descriptions-item label="결제 금액">{{ formatCurrency(paymentData.amount) }}</el-descriptions-item>
        <el-descriptions-item label="고객명">{{ paymentData.customerName }}</el-descriptions-item>
      </el-descriptions>
    </div>

    <div class="payment-widget" ref="paymentWidgetRef">
      <div id="payment-widget" style="width: 100%"></div>
      <div id="agreement" style="width: 100%"></div>
    </div>

    <div class="payment-actions">
      <el-button @click="handleCancel">취소</el-button>
      <el-button 
        type="primary" 
        :loading="paymentProcessing"
        @click="handlePayment"
      >
        결제하기
      </el-button>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'

const props = defineProps({
  paymentData: {
    type: Object,
    required: true
  }
})

const emit = defineEmits(['success', 'fail'])

const paymentWidgetRef = ref()
const paymentProcessing = ref(false)
let paymentWidget = null

const clientKey = 'test_ck_D5GePWvyJnrK0W0k6q8gLzN97Eoq' // 테스트 키

const formatCurrency = (amount) => {
  return new Intl.NumberFormat('ko-KR', {
    style: 'currency',
    currency: 'KRW'
  }).format(amount || 0)
}

const initializePaymentWidget = async () => {
  try {
    // 토스페이먼트 위젯 초기화
    if (window.PaymentWidget) {
      paymentWidget = new window.PaymentWidget(clientKey, props.paymentData.orderId)

      // 결제 수단 렌더링
      await paymentWidget.renderPaymentMethods({
        selector: '#payment-widget',
        variantKey: 'DEFAULT'
      })

      // 약관 렌더링
      await paymentWidget.renderAgreement({
        selector: '#agreement',
        variantKey: 'AGREEMENT'
      })
    } else {
      throw new Error('TossPayments widget not loaded')
    }

  } catch (error) {
    console.error('Payment widget initialization failed:', error)
    emit('fail', error)
  }
}

const handlePayment = async () => {
  if (!paymentWidget) {
    emit('fail', new Error('Payment widget not initialized'))
    return
  }

  try {
    paymentProcessing.value = true

    // 실제로는 토스페이먼트 결제 요청
    // 여기서는 시뮬레이션으로 성공 처리
    setTimeout(() => {
      const mockPaymentResult = {
        paymentKey: `test_payment_key_${Date.now()}`,
        orderId: props.paymentData.orderId,
        amount: props.paymentData.amount
      }
      
      emit('success', mockPaymentResult)
      paymentProcessing.value = false
    }, 2000)

    /* 실제 토스페이먼트 연동 시 사용할 코드
    await paymentWidget.requestPayment({
      orderId: props.paymentData.orderId,
      orderName: props.paymentData.orderName,
      customerName: props.paymentData.customerName,
      customerEmail: props.paymentData.customerEmail || 'test@example.com',
      successUrl: props.paymentData.successUrl,
      failUrl: props.paymentData.failUrl,
      amount: {
        currency: 'KRW',
        value: props.paymentData.amount
      }
    })
    */

  } catch (error) {
    console.error('Payment request failed:', error)
    paymentProcessing.value = false
    emit('fail', error)
  }
}

const handleCancel = () => {
  emit('fail', new Error('Payment cancelled by user'))
}

onMounted(() => {
  // 위젯 로딩 대기 후 초기화
  setTimeout(() => {
    initializePaymentWidget()
  }, 500)
})

onUnmounted(() => {
  // 결제 위젯 정리
  if (paymentWidget) {
    paymentWidget = null
  }
})
</script>

<style scoped>
.toss-payment {
  padding: 16px 0;
}

.payment-info {
  margin-bottom: 32px;
}

.payment-info h3 {
  margin-bottom: 16px;
  color: #303133;
  font-size: 16px;
  font-weight: 600;
}

.payment-widget {
  margin-bottom: 32px;
  min-height: 400px;
  border: 1px solid #e4e7ed;
  border-radius: 8px;
  padding: 20px;
  background: #fafafa;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
}

.payment-widget::before {
  content: "토스페이먼트 위젯 영역";
  color: #666;
  font-size: 18px;
  margin-bottom: 16px;
}

.payment-widget::after {
  content: "실제 환경에서는 토스페이먼트 결제 위젯이 표시됩니다";
  color: #999;
  font-size: 14px;
  margin-top: 16px;
}

.payment-actions {
  display: flex;
  justify-content: flex-end;
  gap: 16px;
  padding-top: 24px;
  border-top: 1px solid #e4e7ed;
}

/* 토스 페이먼트 위젯 스타일 커스터마이징 */
:deep(#payment-widget) {
  margin-bottom: 20px;
}

:deep(#agreement) {
  margin-bottom: 20px;
}
</style>