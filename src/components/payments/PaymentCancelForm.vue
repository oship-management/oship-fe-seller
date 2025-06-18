<template>
  <el-form
    ref="formRef"
    :model="form"
    :rules="rules"
    label-width="120px"
    @submit.prevent="handleSubmit"
  >
    <el-alert
      title="결제 취소 안내"
      type="warning"
      :closable="false"
      style="margin-bottom: 24px"
    >
      결제를 취소하면 되돌릴 수 없습니다. 신중하게 결정해주세요.
    </el-alert>

    <el-descriptions :column="1" border style="margin-bottom: 24px">
      <el-descriptions-item label="결제 ID">{{ payment.id }}</el-descriptions-item>
      <el-descriptions-item label="Toss 주문 ID">{{ payment.tossOrderId }}</el-descriptions-item>
      <el-descriptions-item label="결제 키">{{ payment.paymentKey }}</el-descriptions-item>
      <el-descriptions-item label="결제 금액">{{ formatCurrency(payment.totalAmount) }}</el-descriptions-item>
      <el-descriptions-item label="취소 가능 금액">{{ formatCurrency(payment.balanceAmount || payment.totalAmount) }}</el-descriptions-item>
    </el-descriptions>

    <el-form-item label="취소 유형" prop="cancelType">
      <el-radio-group v-model="form.cancelType" @change="handleCancelTypeChange">
        <el-radio value="full">전체 취소</el-radio>
        <el-radio value="partial">부분 취소</el-radio>
      </el-radio-group>
    </el-form-item>

    <el-form-item 
      v-if="form.cancelType === 'partial'" 
      label="취소 금액" 
      prop="cancelAmount"
    >
      <el-input-number
        v-model="form.cancelAmount"
        :min="1"
        :max="payment.balanceAmount || payment.totalAmount"
        :step="1000"
        style="width: 200px"
      />
      <span style="margin-left: 8px; color: #909399;">
        (최대: {{ formatCurrency(payment.balanceAmount || payment.totalAmount) }})
      </span>
    </el-form-item>

    <el-form-item label="취소 사유" prop="cancelReason">
      <el-input
        v-model="form.cancelReason"
        type="textarea"
        :rows="3"
        placeholder="취소 사유를 입력해주세요"
      />
    </el-form-item>

    <div class="form-actions">
      <el-button @click="$emit('cancel')">취소</el-button>
      <el-button type="danger" :loading="loading" @click="handleSubmit">
        결제 취소
      </el-button>
    </div>
  </el-form>
</template>

<script setup>
import { ref, reactive } from 'vue'
import { paymentApi } from '@/api/payments'

const props = defineProps({
  payment: {
    type: Object,
    required: true
  }
})

const emit = defineEmits(['success', 'cancel'])

const formRef = ref()
const loading = ref(false)

const form = reactive({
  cancelType: 'full',
  cancelAmount: null,
  cancelReason: ''
})

const rules = reactive({
  cancelType: [
    { required: true, message: '취소 유형을 선택해주세요', trigger: 'change' }
  ],
  cancelAmount: [
    { 
      validator: (rule, value, callback) => {
        if (form.cancelType === 'partial') {
          if (!value || value <= 0) {
            callback(new Error('취소 금액을 입력해주세요'))
          } else if (value > (props.payment.balanceAmount || props.payment.totalAmount)) {
            callback(new Error('취소 가능 금액을 초과할 수 없습니다'))
          } else {
            callback()
          }
        } else {
          callback()
        }
      }, 
      trigger: 'blur' 
    }
  ],
  cancelReason: [
    { required: true, message: '취소 사유를 입력해주세요', trigger: 'blur' }
  ]
})

const handleCancelTypeChange = (value) => {
  if (value === 'full') {
    form.cancelAmount = null
  }
}

const formatCurrency = (amount) => {
  return new Intl.NumberFormat('ko-KR', {
    style: 'currency',
    currency: 'KRW'
  }).format(amount || 0)
}

const handleSubmit = async () => {
  if (!formRef.value) return
  
  try {
    const valid = await formRef.value.validate()
    if (!valid) return
    
    loading.value = true
    
    const requestData = {
      cancelReason: form.cancelReason,
      cancelAmount: form.cancelType === 'partial' ? form.cancelAmount : null
    }
    
    await paymentApi.cancelPayment(props.payment.paymentKey, requestData)
    emit('success')
    
  } catch (error) {
    console.error('Cancel payment failed:', error)
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.form-actions {
  display: flex;
  justify-content: flex-end;
  gap: 16px;
  margin-top: 24px;
  padding-top: 24px;
  border-top: 1px solid #e4e7ed;
}
</style>