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

// 토스페이먼츠 공식 테스트 클라이언트 키
const clientKey = 'test_gck_docs_Ovk5rk1EwkEbP0W43n07xlzm'

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
      // 고객 키 생성 - UUID 부분만 사용
      const customerKey = props.paymentData.orderId.substring(0, 20)
      console.log('Initializing PaymentWidget with:', { clientKey, customerKey })
      
      paymentWidget = new window.PaymentWidget(clientKey, customerKey)

      // 결제 수단 렌더링 - 금액 포함
      const amount = parseInt(props.paymentData.amount)
      await paymentWidget.renderPaymentMethods(
        '#payment-widget',
        { 
          value: amount,
          currency: 'KRW',
          variantKey: 'DEFAULT' 
        }
      )

      // 약관 렌더링
      await paymentWidget.renderAgreement('#agreement')
      
      console.log('Payment widget initialized with amount:', amount)
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

    // 금액 확인 및 정수 변환
    const amount = parseInt(props.paymentData.amount)
    console.log('Payment amount:', amount, 'Type:', typeof amount)
    
    // 금액 유효성 검증
    if (!amount || amount <= 0) {
      throw new Error(`유효하지 않은 결제 금액입니다: ${props.paymentData.amount}`)
    }

    // 결제 요청 데이터 로깅
    const paymentRequest = {
      orderId: props.paymentData.orderId,
      orderName: props.paymentData.orderName,
      customerName: props.paymentData.customerName,
      customerEmail: props.paymentData.customerEmail || 'test@example.com',
      successUrl: props.paymentData.successUrl || `${window.location.origin}/payment/success`,
      failUrl: props.paymentData.failUrl || `${window.location.origin}/payment/fail`
    }
    console.log('Payment request data:', paymentRequest)

    // 토스페이먼트 결제 요청 - amount는 별도로 전달
    await paymentWidget.requestPayment({
      ...paymentRequest,
      amount: amount
    })

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
  background: #ffffff;
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