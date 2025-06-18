<template>
  <div class="payment-list">
    <div class="page-header">
      <h1>결제내역</h1>
      <p>결제 내역을 확인하고 관리할 수 있습니다</p>
    </div>

    <el-card class="filter-card">
      <el-form :model="filters" :inline="true" class="filter-form">
        <el-form-item label="주문 ID">
          <el-input
            v-model="filters.orderId"
            placeholder="주문 ID 검색"
            clearable
            style="width: 200px"
          />
        </el-form-item>
        
        <el-form-item label="결제 상태">
          <el-select v-model="filters.status" placeholder="상태 선택" clearable style="width: 150px">
            <el-option label="대기중" value="PENDING" />
            <el-option label="완료" value="DONE" />
            <el-option label="취소됨" value="CANCELED" />
            <el-option label="부분취소" value="PARTIAL_CANCELED" />
            <el-option label="실패" value="FAILED" />
          </el-select>
        </el-form-item>
        
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
      <el-table
        v-loading="loading"
        :data="payments"
        style="width: 100%"
      >
        <el-table-column prop="id" label="결제 ID" width="100" />
        <el-table-column prop="tossOrderId" label="Toss 주문 ID" width="150" />
        <el-table-column prop="orderId" label="주문 ID" width="100" />
        <el-table-column prop="method" label="결제 방법" width="120">
          <template #default="scope">
            <el-tag :type="getMethodType(scope.row.method)">
              {{ getMethodText(scope.row.method) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="status" label="상태" width="120">
          <template #default="scope">
            <el-tag :type="getStatusType(scope.row.status)">
              {{ getStatusText(scope.row.status) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="totalAmount" label="결제 금액" width="120">
          <template #default="scope">
            {{ formatCurrency(scope.row.totalAmount) }}
          </template>
        </el-table-column>
        <el-table-column prop="approvedAt" label="승인일" width="180">
          <template #default="scope">
            {{ formatDate(scope.row.approvedAt) }}
          </template>
        </el-table-column>
        <el-table-column label="작업" width="150" fixed="right">
          <template #default="scope">
            <el-button
              type="primary"
              size="small"
              @click="handleView(scope.row)"
            >
              상세
            </el-button>
            <el-button
              v-if="scope.row.status === 'DONE'"
              type="warning"
              size="small"
              @click="handleCancel(scope.row)"
            >
              취소
            </el-button>
          </template>
        </el-table-column>
      </el-table>

      <div class="pagination">
        <el-pagination
          v-model:current-page="pagination.page"
          v-model:page-size="pagination.size"
          :page-sizes="[10, 20, 50, 100]"
          :total="pagination.total"
          layout="total, sizes, prev, pager, next, jumper"
          @size-change="handleSizeChange"
          @current-change="handlePageChange"
        />
      </div>
    </el-card>

    <!-- 결제 상세 다이얼로그 (임시 비활성화) -->
    <!--
    <el-dialog
      v-model="showDetailDialog"
      title="결제 상세 정보"
      width="60%"
      :close-on-click-modal="false"
    >
      <PaymentDetail
        v-if="selectedPayment"
        :payment="selectedPayment"
        @close="showDetailDialog = false"
      />
    </el-dialog>

    <el-dialog
      v-model="showCancelDialog"
      title="결제 취소"
      width="40%"
      :close-on-click-modal="false"
    >
      <PaymentCancelForm
        v-if="selectedPayment"
        :payment="selectedPayment"
        @success="handleCancelSuccess"
        @cancel="showCancelDialog = false"
      />
    </el-dialog>
    -->
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { ElMessage } from 'element-plus'

const authStore = useAuthStore()

const loading = ref(false)
const payments = ref([])
const selectedPayment = ref(null)
const showDetailDialog = ref(false)
const showCancelDialog = ref(false)
const dateRange = ref([])

const filters = reactive({
  orderId: '',
  status: '',
  startDate: '',
  endDate: ''
})

const pagination = reactive({
  page: 1,
  size: 20,
  total: 0
})

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
  const date = new Date(dateString)
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')
  const seconds = String(date.getSeconds()).padStart(2, '0')
  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`
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
  pagination.page = 1
  fetchPayments()
}

const handleReset = () => {
  Object.assign(filters, {
    orderId: '',
    status: '',
    startDate: '',
    endDate: ''
  })
  dateRange.value = []
  pagination.page = 1
  fetchPayments()
}

const handleView = (payment) => {
  selectedPayment.value = payment
  showDetailDialog.value = true
}

const handleCancel = (payment) => {
  selectedPayment.value = payment
  showCancelDialog.value = true
}

const handleCancelSuccess = () => {
  showCancelDialog.value = false
  selectedPayment.value = null
  fetchPayments()
  ElMessage.success('결제가 취소되었습니다')
}

const handlePageChange = (page) => {
  pagination.page = page
  fetchPayments()
}

const handleSizeChange = (size) => {
  pagination.size = size
  pagination.page = 1
  fetchPayments()
}

const fetchPayments = async () => {
  try {
    loading.value = true
    
    // 임시로 mockData 사용 (실제 API 구현 전까지)
    console.log('Fetching payments for seller:', authStore.user?.id)
    
    // Mock data 설정
    setTimeout(() => {
      payments.value = []
      pagination.total = 0
      loading.value = false
      console.log('Payment list loaded (mock data)')
    }, 500)
    
    /* 실제 API 호출 코드 (API 구현 후 활성화)
    const params = {
      page: pagination.page - 1,
      size: pagination.size,
      sellerId: authStore.user?.id || 1,
      ...filters
    }
    
    // 빈 값 제거
    Object.keys(params).forEach(key => {
      if (params[key] === '' || params[key] === null) {
        delete params[key]
      }
    })
    
    const response = await paymentApi.getPayments(params)
    
    if (response.data && response.data.data) {
      payments.value = response.data.data.content || []
      pagination.total = response.data.data.totalElements || 0
    }
    */
    
  } catch (error) {
    console.error('Fetch payments failed:', error)
    // 에러 발생 시 빈 배열로 설정
    payments.value = []
    pagination.total = 0
  } finally {
    loading.value = false
  }
}

onMounted(() => {
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

.pagination {
  display: flex;
  justify-content: center;
  margin-top: 24px;
}
</style>