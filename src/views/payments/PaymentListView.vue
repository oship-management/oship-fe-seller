<template>
  <div class="payment-list">
    <div class="page-header">
      <h1>결제내역</h1>
      <p>결제 내역을 확인하고 관리할 수 있습니다</p>
    </div>

    <el-card class="filter-card">
      <el-form :model="filters" :inline="true" class="filter-form">
        <el-form-item label="기간">
          <el-date-picker
            v-model="dateRange"
            type="daterange"
            range-separator="~"
            start-placeholder="시작일"
            end-placeholder="종료일"
            format="YYYY-MM-DD"
            value-format="YYYY-MM-DD"
            @change="handleDateChange"
          />
        </el-form-item>
        
        <el-form-item label="검색">
          <el-input
            v-model="searchKeyword"
            placeholder="주문번호 또는 마스터번호 검색"
            clearable
            style="width: 250px"
          />
        </el-form-item>
        
        <el-form-item>
          <el-button type="primary" @click="handleSearch">
            <el-icon><Search /></el-icon>
            검색
          </el-button>
          <el-button @click="handleReset">
            <el-icon><Refresh /></el-icon>
            초기화
          </el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <el-card class="table-card">
      <div v-loading="loading">
        <div v-if="filteredPayments.length === 0" class="empty-state">
          <el-empty description="검색 결과가 없습니다" />
        </div>
        
        <div v-else class="payment-items">
          <div 
            v-for="payment in filteredPayments" 
            :key="payment.paymentId"
            class="payment-item"
          >
            <div 
              class="payment-header"
              @click="togglePayment(payment.paymentId)"
            >
              <div class="payment-info">
                <div class="payment-main">
                  <span class="payment-id">주문내역</span>
                  <el-tag :type="getStatusType(payment.paymentStatus)" size="small">
                    {{ getStatusText(payment.paymentStatus) }}
                  </el-tag>
                  <span class="payment-date">{{ formatDateTime(payment.paidAt) }}</span>
                </div>
                <div class="payment-amount">
                  <div v-if="isPartialCancel(payment)">
                    <span class="amount original-amount">{{ formatCurrency(payment.amount) }}</span>
                    <span class="amount actual-amount">{{ formatCurrency(getActualAmount(payment)) }}</span>
                  </div>
                  <span v-else class="amount">{{ formatCurrency(payment.amount) }}</span>
                  <span class="order-count">주문 {{ payment.orders.length }}건</span>
                </div>
              </div>
              <el-icon class="toggle-icon" :class="{ 'is-active': expandedPayments.includes(payment.paymentId) }">
                <ArrowDown />
              </el-icon>
            </div>
            
            <el-collapse-transition>
              <div v-show="expandedPayments.includes(payment.paymentId)" class="payment-orders">
                <div class="orders-header">
                  <span>주문 상세 내역</span>
                  <a 
                    v-if="payment.receiptUrl" 
                    :href="payment.receiptUrl" 
                    target="_blank"
                    class="receipt-link"
                  >
                    <el-icon><Document /></el-icon>
                    영수증 보기
                  </a>
                </div>
                <el-table :data="payment.orders" size="small" class="orders-table">
                  <el-table-column prop="orderNo" label="주문번호" min-width="120" />
                  <el-table-column prop="oshipMasterNo" label="마스터번호" min-width="180" />
                  <el-table-column prop="senderName" label="발송인" min-width="100" />
                  <el-table-column prop="recipientName" label="수취인" min-width="100" />
                  <el-table-column prop="parcelCount" label="박스수" width="80" align="center" />
                  <el-table-column prop="shipmentActualWeight" label="실중량(kg)" width="100" align="right">
                    <template #default="scope">
                      {{ scope.row.shipmentActualWeight || '-' }}
                    </template>
                  </el-table-column>
                  <el-table-column prop="orderStatus" label="상태" width="100" align="center">
                    <template #default="scope">
                      <el-tag :type="getOrderStatusType(scope.row.orderStatus)" size="small">
                        {{ getOrderStatusText(scope.row.orderStatus) }}
                      </el-tag>
                    </template>
                  </el-table-column>
                  <el-table-column prop="orderAmount" label="금액" min-width="120" align="right">
                    <template #default="scope">
                      {{ formatCurrency(scope.row.orderAmount) }}
                    </template>
                  </el-table-column>
                </el-table>
              </div>
            </el-collapse-transition>
          </div>
        </div>
      </div>
    </el-card>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, computed } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { ElMessage } from 'element-plus'
import { paymentApi } from '@/api/payments'
import { formatDate, formatDateTime } from '@/utils/dateUtils'
import { Search, Refresh, ArrowDown, Document } from '@element-plus/icons-vue'

const authStore = useAuthStore()

const loading = ref(false)
const payments = ref([])
const dateRange = ref([])
const searchKeyword = ref('')
const expandedPayments = ref([])

const filters = reactive({
  startDate: '',
  endDate: ''
})

// 프론트엔드 필터링된 결제 목록
const filteredPayments = computed(() => {
  if (!searchKeyword.value) {
    return payments.value
  }
  
  const keyword = searchKeyword.value.toLowerCase()
  return payments.value.filter(payment => {
    return payment.orders.some(order => 
      order.orderNo?.toLowerCase().includes(keyword) ||
      order.oshipMasterNo?.toLowerCase().includes(keyword)
    )
  })
})

// 기본 날짜 설정 (이번 달 1일 ~ 오늘)
const setDefaultDateRange = () => {
  const today = new Date()
  const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1)
  
  const formatDateString = (date) => {
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }
  
  filters.startDate = formatDateString(firstDayOfMonth)
  filters.endDate = formatDateString(today)
  dateRange.value = [filters.startDate, filters.endDate]
}

const togglePayment = (paymentId) => {
  const index = expandedPayments.value.indexOf(paymentId)
  if (index > -1) {
    expandedPayments.value.splice(index, 1)
  } else {
    expandedPayments.value.push(paymentId)
  }
}

const getStatusType = (status) => {
  const typeMap = {
    'PENDING': 'warning',
    'COMPLETE': 'success',
    'DONE': 'success',
    'CANCELED': 'danger',
    'PARTIAL_CANCELED': 'warning',
    'PARTIAL_CANCEL': 'warning',
    'FAILED': 'danger'
  }
  return typeMap[status] || 'info'
}

const getStatusText = (status) => {
  const textMap = {
    'PENDING': '대기중',
    'COMPLETE': '완료',
    'DONE': '완료',
    'CANCELED': '취소됨',
    'PARTIAL_CANCELED': '부분취소',
    'PARTIAL_CANCEL': '부분취소',
    'FAILED': '실패'
  }
  return textMap[status] || status
}

const getOrderStatusType = (status) => {
  const typeMap = {
    'CREATED': 'info',
    'PAID': 'success',
    'PROCESSING': 'warning',
    'SHIPPED': 'primary',
    'DELIVERED': 'success',
    'CANCELLED': 'danger'
  }
  return typeMap[status] || 'info'
}

const getOrderStatusText = (status) => {
  const textMap = {
    'CREATED': '생성됨',
    'PAID': '결제완료',
    'PROCESSING': '처리중',
    'SHIPPED': '배송중',
    'DELIVERED': '배송완료',
    'CANCELLED': '취소됨'
  }
  return textMap[status] || status
}

const formatCurrency = (amount) => {
  return new Intl.NumberFormat('ko-KR', {
    style: 'currency',
    currency: 'KRW'
  }).format(amount || 0)
}

const isPartialCancel = (payment) => {
  return payment.paymentStatus === 'PARTIAL_CANCELED' || payment.paymentStatus === 'PARTIAL_CANCEL'
}

const getActualAmount = (payment) => {
  if (!isPartialCancel(payment)) {
    return payment.amount
  }
  
  // 취소되지 않은 주문들의 금액 합계 계산
  const actualAmount = payment.orders
    .filter(order => order.orderStatus !== 'CANCELLED')
    .reduce((sum, order) => sum + (order.orderAmount || 0), 0)
  
  return actualAmount
}

const handleDateChange = (dates) => {
  if (dates && dates.length === 2) {
    filters.startDate = dates[0]
    filters.endDate = dates[1]
  } else {
    filters.startDate = ''
    filters.endDate = ''
  }
}

const handleSearch = () => {
  fetchPayments()
}

const handleReset = () => {
  searchKeyword.value = ''
  setDefaultDateRange()
  fetchPayments()
}

const fetchPayments = async () => {
  try {
    loading.value = true
    
    const params = {
      startDate: filters.startDate,
      endDate: filters.endDate
    }
    
    const response = await paymentApi.getMyPayments(params)
    
    if (response.data && response.data.status === 200) {
      payments.value = response.data.data || []
    }
    
  } catch (error) {
    console.error('Fetch payments failed:', error)
    ElMessage.error('결제 내역 조회 중 오류가 발생했습니다')
    payments.value = []
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  setDefaultDateRange()
  fetchPayments()
})
</script>

<style scoped>
.payment-list {
  padding: 0;
}

.page-header {
  margin-bottom: 24px;
}

.page-header h1 {
  font-size: 24px;
  font-weight: 600;
  margin-bottom: 8px;
  color: #333;
}

.page-header p {
  color: #666;
  margin: 0;
}

.filter-card {
  margin-bottom: 24px;
}

.filter-form {
  margin: 0;
}

.table-card {
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
}

.empty-state {
  padding: 60px 0;
}

.payment-items {
  padding: 8px;
}

.payment-item {
  border: 1px solid #e4e7ed;
  border-radius: 8px;
  margin-bottom: 12px;
  overflow: hidden;
  transition: all 0.3s;
}

.payment-item:hover {
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.payment-header {
  padding: 16px 20px;
  background-color: #f5f7fa;
  cursor: pointer;
  display: flex;
  justify-content: space-between;
  align-items: center;
  transition: background-color 0.3s;
}

.payment-header:hover {
  background-color: #f0f2f5;
}

.payment-info {
  flex: 1;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.payment-main {
  display: flex;
  align-items: center;
  gap: 12px;
}

.payment-id {
  font-weight: 600;
  color: #303133;
}

.payment-date {
  color: #909399;
  font-size: 14px;
}

.payment-amount {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 4px;
}

.amount {
  font-size: 18px;
  font-weight: 600;
  color: #303133;
}

.original-amount {
  text-decoration: line-through;
  color: #909399;
  font-size: 16px;
  display: block;
  margin-bottom: 4px;
}

.actual-amount {
  color: #e6a23c;
  display: block;
}

.order-count {
  font-size: 14px;
  color: #909399;
}

.toggle-icon {
  transition: transform 0.3s;
  color: #909399;
}

.toggle-icon.is-active {
  transform: rotate(180deg);
}

.payment-orders {
  padding: 20px;
  background-color: #fafafa;
  border-top: 1px solid #e4e7ed;
}

.orders-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
  font-weight: 600;
  color: #303133;
}

.receipt-link {
  display: flex;
  align-items: center;
  gap: 4px;
  color: #409eff;
  text-decoration: none;
  font-size: 14px;
  font-weight: normal;
}

.receipt-link:hover {
  color: #66b1ff;
}

.orders-table {
  width: 100%;
  background-color: white;
  border-radius: 4px;
}

:deep(.el-table__header) {
  background-color: #f5f7fa;
}

:deep(.el-table__row) {
  cursor: default;
}
</style>