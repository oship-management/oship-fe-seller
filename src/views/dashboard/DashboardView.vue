<template>
  <div class="dashboard">
    <div class="page-header">
      <h1>대시보드</h1>
      <p>O-Ship 셀러 대시보드에 오신 것을 환영합니다</p>
    </div>

    <div class="stats-grid" v-loading="statsLoading">
      <el-card class="stat-card">
        <div class="stat-content">
          <div class="stat-icon orders">
            <el-icon><Document /></el-icon>
          </div>
          <div class="stat-info">
            <h3>{{ stats.totalOrders || 0 }}</h3>
            <p>총 주문수</p>
          </div>
        </div>
      </el-card>

      <el-card class="stat-card">
        <div class="stat-content">
          <div class="stat-icon pending">
            <el-icon><Clock /></el-icon>
          </div>
          <div class="stat-info">
            <h3>{{ stats.pendingOrders || 0 }}</h3>
            <p>대기중 주문</p>
          </div>
        </div>
      </el-card>

      <el-card class="stat-card">
        <div class="stat-content">
          <div class="stat-icon shipped">
            <el-icon><Van /></el-icon>
          </div>
          <div class="stat-info">
            <h3>{{ stats.shippedOrders || 0 }}</h3>
            <p>배송중 주문</p>
          </div>
        </div>
      </el-card>

      <el-card class="stat-card">
        <div class="stat-content">
          <div class="stat-icon revenue">
            <el-icon><CreditCard /></el-icon>
          </div>
          <div class="stat-info">
            <h3>{{ formatCurrency(stats.totalRevenue) }}</h3>
            <p>총 매출</p>
          </div>
        </div>
      </el-card>
    </div>

    <div class="dashboard-content">
      <el-row :gutter="24">
        <!-- 최근 주문 -->
        <el-col :span="16">
          <el-card>
            <template #header>
              <div class="card-header">
                <h3>최근 주문</h3>
                <el-button type="primary" @click="$router.push('/orders')">
                  모든 주문 보기
                </el-button>
              </div>
            </template>
            
            <el-table :data="recentOrders" style="width: 100%" v-loading="ordersLoading">
              <el-table-column prop="id" label="주문 ID" width="100" />
              <el-table-column prop="oshopMasterNo" label="마스터 번호" width="150" />
              <el-table-column prop="orderStatus" label="상태" width="120">
                <template #default="scope">
                  <el-tag :type="getLatestTrackingStatusType(scope.row)">
                    {{ getLatestTrackingStatus(scope.row) }}
                  </el-tag>
                </template>
              </el-table-column>
              <el-table-column prop="recipientName" label="수신자" width="120">
                <template #default="scope">
                  {{ scope.row.recipientName || '-' }}
                </template>
              </el-table-column>
              <el-table-column prop="createdAt" label="생성일">
                <template #default="scope">
                  {{ formatDate(scope.row.createdAt) }}
                </template>
              </el-table-column>
            </el-table>
          </el-card>
        </el-col>

        <!-- 빠른 작업 -->
        <el-col :span="8">
          <el-card>
            <template #header>
              <h3>빠른 작업</h3>
            </template>
            
            <div class="quick-actions">
              <el-button 
                type="primary" 
                size="large" 
                class="action-button"
                @click="$router.push('/orders')"
              >
                <el-icon><Plus /></el-icon>
                새 주문 생성
              </el-button>
              
              <el-button 
                type="success" 
                size="large" 
                class="action-button"
                @click="$router.push('/payments')"
              >
                <el-icon><CreditCard /></el-icon>
                결제내역 확인
              </el-button>
              
              <el-upload
                :show-file-list="false"
                :before-upload="handleExcelUpload"
                accept=".xlsx,.xls"
              >
                <el-button 
                  type="warning" 
                  size="large" 
                  class="action-button"
                >
                  <el-icon><Upload /></el-icon>
                  엑셀 업로드
                </el-button>
              </el-upload>
            </div>
          </el-card>
        </el-col>
      </el-row>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { orderApi } from '@/api/orders'
import { ElMessage } from 'element-plus'

const authStore = useAuthStore()

const statsLoading = ref(false)
const ordersLoading = ref(false)

const stats = ref({
  totalOrders: 0,
  pendingOrders: 0,
  shippedOrders: 0,
  totalRevenue: 0
})

const recentOrders = ref([])

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
  return `${year}-${month}-${day}`
}

const getStatusType = (status) => {
  const typeMap = {
    'PENDING': 'warning',
    'PROCESSING': 'primary',
    'SHIPPED': 'success',
    'DELIVERED': 'success',
    'CANCELLED': 'danger'
  }
  return typeMap[status] || 'info'
}

const getStatusText = (status) => {
  const textMap = {
    'PENDING': '대기중',
    'PROCESSING': '처리중',
    'SHIPPED': '배송중',
    'DELIVERED': '배송완료',
    'CANCELLED': '취소됨'
  }
  return textMap[status] || status
}

// 주문의 최신 상태 추적 (트래킹 라스트값)
const getLatestTrackingStatus = (order) => {
  // 1. 배송 상태가 있으면 우선 확인
  if (order.shipmentStatus) {
    return getShipmentStatusText(order.shipmentStatus)
  }
  
  // 2. 추적 이벤트가 있으면 최신 이벤트 상태 확인
  if (order.trackingEvents && order.trackingEvents.length > 0) {
    const latestEvent = order.trackingEvents[order.trackingEvents.length - 1]
    return getTrackingEventText(latestEvent.eventType || latestEvent.status)
  }
  
  // 3. 기본 주문 상태
  return getStatusText(order.orderStatus)
}

// 최신 추적 상태에 따른 태그 타입
const getLatestTrackingStatusType = (order) => {
  // 1. 배송 상태가 있으면 우선 확인
  if (order.shipmentStatus) {
    return getShipmentStatusType(order.shipmentStatus)
  }
  
  // 2. 추적 이벤트가 있으면 최신 이벤트 상태 확인
  if (order.trackingEvents && order.trackingEvents.length > 0) {
    const latestEvent = order.trackingEvents[order.trackingEvents.length - 1]
    return getTrackingEventType(latestEvent.eventType || latestEvent.status)
  }
  
  // 3. 기본 주문 상태
  return getStatusType(order.orderStatus)
}

// 추적 이벤트 텍스트 매핑
const getTrackingEventText = (eventType) => {
  const eventTextMap = {
    'LABEL_CREATED': '라벨 생성됨',
    'PICKED_UP': '픽업 완료',
    'IN_TRANSIT': '운송중',
    'OUT_FOR_DELIVERY': '배송중',
    'DELIVERED': '배송완료',
    'EXCEPTION': '배송 지연',
    'CUSTOMS_CLEARANCE': '통관 진행중',
    'CUSTOMS_CLEARED': '통관 완료'
  }
  return eventTextMap[eventType] || eventType
}

// 추적 이벤트 타입 매핑
const getTrackingEventType = (eventType) => {
  const eventTypeMap = {
    'LABEL_CREATED': 'info',
    'PICKED_UP': 'primary',
    'IN_TRANSIT': 'primary',
    'OUT_FOR_DELIVERY': 'warning',
    'DELIVERED': 'success',
    'EXCEPTION': 'danger',
    'CUSTOMS_CLEARANCE': 'warning',
    'CUSTOMS_CLEARED': 'primary'
  }
  return eventTypeMap[eventType] || 'info'
}

// 배송 상태 텍스트 매핑
const getShipmentStatusText = (status) => {
  const textMap = {
    'LABEL_CREATED': '라벨 생성됨',
    'PICKUP_SCHEDULED': '픽업 예약됨',
    'IN_TRANSIT': '운송중',
    'DELIVERED': '배송완료',
    'EXCEPTION': '예외상황'
  }
  return textMap[status] || status
}

// 배송 상태 타입 매핑
const getShipmentStatusType = (status) => {
  const typeMap = {
    'LABEL_CREATED': 'info',
    'PICKUP_SCHEDULED': 'warning',
    'IN_TRANSIT': 'primary',
    'DELIVERED': 'success',
    'EXCEPTION': 'danger'
  }
  return typeMap[status] || 'info'
}

const handleExcelUpload = async (file) => {
  try {
    await orderApi.uploadExcel(file)
    ElMessage.success('엑셀 파일이 업로드되었습니다')
    fetchData() // 데이터 새로고침
  } catch (error) {
    console.error('Excel upload failed:', error)
    ElMessage.error('엑셀 업로드에 실패했습니다')
  }
  return false // 자동 업로드 방지
}

const fetchStats = async () => {
  try {
    statsLoading.value = true
    
    const currentMonth = new Date().toISOString().slice(0, 7) // YYYY-MM 형식
    const sellerId = authStore.user?.id || 1
    
    console.log('Fetching stats for seller:', sellerId, 'month:', currentMonth)
    
    const response = await orderApi.getOrderStats({
      sellerId: sellerId,
      month: currentMonth
    })
    
    console.log('Stats response:', response)
    
    if (response.data && response.data.data) {
      const statsData = response.data.data
      stats.value = {
        totalOrders: statsData.totalOrders || 0,
        pendingOrders: statsData.statusCounts?.PENDING || 0,
        shippedOrders: statsData.statusCounts?.SHIPPED || 0,
        totalRevenue: statsData.totalOrderValue?.amount || 0
      }
    } else {
      // 통계 데이터가 없으면 기본값 설정
      stats.value = {
        totalOrders: 0,
        pendingOrders: 0,
        shippedOrders: 0,
        totalRevenue: 0
      }
    }
  } catch (error) {
    console.error('Fetch stats failed:', error)
    console.error('Error response:', error.response?.data)
    
    // 통계 API가 없거나 에러 시 기본값 설정
    stats.value = {
      totalOrders: 0,
      pendingOrders: 0,
      shippedOrders: 0,
      totalRevenue: 0
    }
    
    // 404가 아닌 에러인 경우 로그만 출력 (에러 메시지는 표시하지 않음)
    if (error.response?.status !== 404) {
      console.warn('Stats API error, using default values')
    }
  } finally {
    statsLoading.value = false
  }
}

const fetchRecentOrders = async () => {
  try {
    ordersLoading.value = true
    const sellerId = authStore.user?.id || 1
    
    // Spring Boot Pageable 형식에 맞게 파라미터 구성
    const params = {
      page: 0,
      size: 5,
      sort: 'createdAt,desc' // 최신순 정렬
    }
    
    // sellerId 추가
    if (sellerId) {
      params.sellerId = sellerId
    }
    
    console.log('Fetching recent orders with params:', params)
    
    const response = await orderApi.getOrders(params)
    console.log('Recent orders response:', response)
    
    if (response.data && response.data.data) {
      const responseData = response.data.data
      
      // 주문 목록 페이지와 동일한 구조로 파싱
      if (responseData.data && Array.isArray(responseData.data)) {
        recentOrders.value = responseData.data
      } else if (responseData.content && Array.isArray(responseData.content)) {
        recentOrders.value = responseData.content
      } else if (Array.isArray(responseData)) {
        recentOrders.value = responseData
      } else {
        recentOrders.value = []
      }
    } else {
      recentOrders.value = []
    }
  } catch (error) {
    console.error('Fetch recent orders failed:', error)
    console.error('Error response:', error.response?.data)
    
    // 상세한 에러 로깅
    if (error.response) {
      console.error('Response status:', error.response.status)
      console.error('Response data:', error.response.data)
      console.error('Request URL:', error.config?.url)
      console.error('Request params:', error.config?.params)
    }
    
    recentOrders.value = []
  } finally {
    ordersLoading.value = false
  }
}

const fetchData = async () => {
  // API 호출을 개별적으로 처리하여 하나가 실패해도 다른 것은 로드되도록 함
  const promises = [
    fetchStats().catch(error => {
      console.error('Failed to fetch stats:', error)
      return null
    }),
    fetchRecentOrders().catch(error => {
      console.error('Failed to fetch recent orders:', error)
      return null
    })
  ]
  
  await Promise.all(promises)
}

onMounted(() => {
  fetchData()
})
</script>

<style scoped>
.dashboard {
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

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 24px;
  margin-bottom: 24px;
}

.stat-card {
  border: none;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
}

.stat-content {
  display: flex;
  align-items: center;
  gap: 16px;
}

.stat-icon {
  width: 48px;
  height: 48px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
  color: white;
}

.stat-icon.orders {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.stat-icon.pending {
  background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
}

.stat-icon.shipped {
  background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
}

.stat-icon.revenue {
  background: linear-gradient(135deg, #43e97b 0%, #38f9d7 100%);
}

.stat-info h3 {
  font-size: 24px;
  font-weight: 600;
  margin: 0;
  color: #333;
}

.stat-info p {
  font-size: 14px;
  color: #666;
  margin: 4px 0 0 0;
}

.dashboard-content {
  display: grid;
  grid-template-columns: 1fr;
  gap: 24px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.card-header h3 {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
}

.quick-actions {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.action-button {
  width: 100%;
  height: 48px;
  font-size: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}
</style>