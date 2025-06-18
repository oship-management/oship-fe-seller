<template>
  <div class="payment-detail">
    <el-descriptions :column="2" border>
      <el-descriptions-item label="결제 ID">{{ payment.id }}</el-descriptions-item>
      <el-descriptions-item label="Toss 주문 ID">{{ payment.tossOrderId }}</el-descriptions-item>
      <el-descriptions-item label="결제 키">{{ payment.paymentKey }}</el-descriptions-item>
      <el-descriptions-item label="주문 ID">{{ payment.orderId }}</el-descriptions-item>
      <el-descriptions-item label="결제 방법">
        <el-tag :type="getMethodType(payment.method)">
          {{ getMethodText(payment.method) }}
        </el-tag>
      </el-descriptions-item>
      <el-descriptions-item label="상태">
        <el-tag :type="getStatusType(payment.status)">
          {{ getStatusText(payment.status) }}
        </el-tag>
      </el-descriptions-item>
      <el-descriptions-item label="결제 금액">{{ formatCurrency(payment.totalAmount) }}</el-descriptions-item>
      <el-descriptions-item label="승인일">{{ formatDate(payment.approvedAt) }}</el-descriptions-item>
      <el-descriptions-item label="결제 수단" v-if="payment.card">
        {{ payment.card.company }} {{ payment.card.number }}
      </el-descriptions-item>
      <el-descriptions-item label="취소 가능 금액">{{ formatCurrency(payment.balanceAmount) }}</el-descriptions-item>
    </el-descriptions>

    <!-- 취소 내역이 있는 경우 -->
    <div v-if="payment.cancelHistory && payment.cancelHistory.length > 0" class="cancel-history">
      <h3>취소 내역</h3>
      <el-table :data="payment.cancelHistory" style="width: 100%">
        <el-table-column prop="cancelReason" label="취소 사유" />
        <el-table-column prop="cancelAmount" label="취소 금액">
          <template #default="scope">
            {{ formatCurrency(scope.row.cancelAmount) }}
          </template>
        </el-table-column>
        <el-table-column prop="canceledAt" label="취소일">
          <template #default="scope">
            {{ formatDate(scope.row.canceledAt) }}
          </template>
        </el-table-column>
      </el-table>
    </div>

    <div class="actions">
      <el-button @click="$emit('close')">닫기</el-button>
    </div>
  </div>
</template>

<script setup>
const props = defineProps({
  payment: {
    type: Object,
    required: true
  }
})

const emit = defineEmits(['close'])

const getMethodType = (method) => {
  const typeMap = {
    'CARD': 'primary',
    'VIRTUAL_ACCOUNT': 'warning',
    'TRANSFER': 'success'
  }
  return typeMap[method] || 'info'
}

const getMethodText = (method) => {
  const textMap = {
    'CARD': '카드',
    'VIRTUAL_ACCOUNT': '가상계좌',
    'TRANSFER': '계좌이체'
  }
  return textMap[method] || method
}

const getStatusType = (status) => {
  const typeMap = {
    'PENDING': 'warning',
    'DONE': 'success',
    'CANCELED': 'danger',
    'PARTIAL_CANCELED': 'warning',
    'FAILED': 'danger'
  }
  return typeMap[status] || 'info'
}

const getStatusText = (status) => {
  const textMap = {
    'PENDING': '대기중',
    'DONE': '완료',
    'CANCELED': '취소됨',
    'PARTIAL_CANCELED': '부분취소',
    'FAILED': '실패'
  }
  return textMap[status] || status
}

const formatCurrency = (amount) => {
  return new Intl.NumberFormat('ko-KR', {
    style: 'currency',
    currency: 'KRW'
  }).format(amount || 0)
}

const formatDate = (dateString) => {
  if (!dateString) return '-'
  return new Date(dateString).toLocaleString('ko-KR')
}
</script>

<style scoped>
.payment-detail {
  padding: 16px 0;
}

.cancel-history {
  margin-top: 24px;
}

.cancel-history h3 {
  margin-bottom: 16px;
  color: #303133;
  font-size: 16px;
}

.actions {
  display: flex;
  justify-content: flex-end;
  margin-top: 24px;
}
</style>