<template>
  <!-- Orders Table -->
  <el-card class="table-card" v-loading="loading || uploadingExcel">
    <div class="custom-table-container">
      <table class="order-table">
        <thead>
          <tr>
            <th>
              <input 
                type="checkbox" 
                class="checkbox" 
                :checked="isAllSelected"
                @change="toggleAllOrders"
              >
            </th>
            <th>Master No</th>
            <th>주문번호</th>
            <th>플랫폼</th>
            <th>수신자</th>
            <th>스토어</th>
            <th>패키지</th>
            <th>상태</th>
            <th>최근 추적 이벤트</th>
            <th>바코드 출력</th>
            <th>AWB 출력</th>
            <th>작업</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="loading">
            <td colspan="12" style="text-align: center; padding: 40px;">
              <el-icon class="is-loading"><Loading /></el-icon>
              로딩 중...
            </td>
          </tr>
          <tr v-else-if="orders.length === 0">
            <td colspan="12" style="text-align: center; padding: 40px; color: #909399;">
              주문이 없습니다. 첫 번째 주문을 생성해보세요!
              <br>
              <small>Total: {{ pagination.total }}, Orders length: {{ orders.length }}</small>
            </td>
          </tr>
          <tr 
            v-for="order in orders" 
            :key="order.id" 
            v-else-if="orders.length > 0"
            @click="handleOrderDetail(order)"
            :class="['order-row', { 'paid-order': order.orderStatus === 'PAID' }]"
          >
            <td @click.stop>
              <input 
                type="checkbox" 
                class="checkbox" 
                :value="order.id"
                v-model="localSelectedOrders"
                @change="updateSelectedOrders"
              >
            </td>
            <td><strong>{{ order.oshopMasterNo }}</strong></td>
            <td>{{ order.orderNo || '-' }}</td>
            <td>{{ order.storePlatform }}</td>
            <td>{{ order.recipientName }}</td>
            <td>{{ order.storeName }}</td>
            <td>{{ order.parcelCount }}개 ({{ order.shipmentActualWeight }}kg)</td>
            <td>
              <el-tag 
                :type="getOrderStatusType(order)"
                size="small"
              >
                {{ getOrderStatusText(order) }}
              </el-tag>
            </td>
            <td>
              <el-tag 
                v-if="order.lastTrackingEvent"
                :type="getTrackingEventTagType(order.lastTrackingEvent)"
                size="small"
              >
                {{ getTrackingEventText(order.lastTrackingEvent) }}
              </el-tag>
              <span v-else style="color: #909399;">-</span>
            </td>
            <td>
              <el-tag 
                :type="order.isPrintBarcode ? 'success' : 'info'"
                size="small"
              >
                {{ order.isPrintBarcode ? '출력됨' : '미출력' }}
              </el-tag>
            </td>
            <td>
              <el-tag 
                :type="order.isPrintAwb ? 'success' : 'info'"
                size="small"
              >
                {{ order.isPrintAwb ? '출력됨' : '미출력' }}
              </el-tag>
            </td>
            <td @click.stop>
              <div class="action-icons">
                <el-button 
                  type="info" 
                  size="small"
                  circle
                  @click="handleOrderTracking(order)"
                  title="추적"
                >
                  <el-icon><View /></el-icon>
                </el-button>
                <el-button 
                  type="danger" 
                  size="small"
                  circle
                  @click="handleOrderDelete(order.id)"
                  title="삭제"
                >
                  <el-icon><Delete /></el-icon>
                </el-button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Pagination -->
    <div class="pagination-container" v-if="pagination.total > 0">
      <el-pagination
        v-model:current-page="localPagination.page"
        v-model:page-size="localPagination.size"
        :page-sizes="[10, 20, 50, 100]"
        :total="localPagination.total"
        layout="total, sizes, prev, pager, next, jumper"
        @size-change="handleSizeChange"
        @current-change="handleCurrentChange"
      />
    </div>
  </el-card>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { View, Delete, Loading } from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'

const props = defineProps({
  orders: {
    type: Array,
    default: () => []
  },
  selectedOrders: {
    type: Array,
    default: () => []
  },
  loading: {
    type: Boolean,
    default: false
  },
  uploadingExcel: {
    type: Boolean,
    default: false
  },
  pagination: {
    type: Object,
    default: () => ({
      page: 1,
      size: 20,
      total: 0
    })
  }
})

const emit = defineEmits([
  'update:selectedOrders',
  'update:pagination',
  'order-detail',
  'order-tracking',
  'order-delete',
  'page-size-change',
  'page-change'
])

// Local reactive copies
const localSelectedOrders = ref([...props.selectedOrders])
const localPagination = ref({ ...props.pagination })

// Watch for prop changes
watch(() => props.selectedOrders, (newSelected) => {
  localSelectedOrders.value = [...newSelected]
})

watch(() => props.pagination, (newPagination) => {
  localPagination.value = { ...newPagination }
}, { deep: true })

// Debug: orders prop 변경 감시
watch(() => props.orders, (newOrders) => {
  console.log('OrderTable received new orders:', newOrders.length)
  if (newOrders.length > 0) {
    console.log('First order in table:', {
      id: newOrders[0].id,
      orderStatus: newOrders[0].orderStatus,
      lastTrackingEvent: newOrders[0].lastTrackingEvent,
      orderNo: newOrders[0].orderNo
    })
  }
}, { deep: true })

// Computed
const isAllSelected = computed(() => {
  if (props.orders.length === 0) return false
  return props.orders.every(order => localSelectedOrders.value.includes(order.id))
})

// Methods
const toggleAllOrders = () => {
  if (isAllSelected.value) {
    localSelectedOrders.value = []
  } else {
    // Select all orders
    localSelectedOrders.value = props.orders.map(order => order.id)
  }
  updateSelectedOrders()
}

const updateSelectedOrders = () => {
  emit('update:selectedOrders', [...localSelectedOrders.value])
}

const handleOrderDetail = (order) => {
  emit('order-detail', order)
}

const handleOrderTracking = (order) => {
  emit('order-tracking', order)
}

const handleOrderDelete = async (orderId) => {
  try {
    await ElMessageBox.confirm('정말로 이 주문을 삭제하시겠습니까?', '주문 삭제', {
      confirmButtonText: '삭제',
      cancelButtonText: '취소',
      type: 'warning'
    })
    
    emit('order-delete', orderId)
  } catch (error) {
    // 취소 처리
  }
}

const handleSizeChange = (newSize) => {
  localPagination.value.size = newSize
  localPagination.value.page = 1
  emit('update:pagination', { ...localPagination.value })
  emit('page-size-change', newSize)
}

const handleCurrentChange = (newPage) => {
  localPagination.value.page = newPage
  emit('update:pagination', { ...localPagination.value })
  emit('page-change', newPage)
}

// Status utility functions
const getOrderStatusText = (order) => {
  // 주문 상태를 기준으로 표시
  console.log(`Getting order status for order ${order.id}:`, order.orderStatus)
  return getStatusText(order.orderStatus)
}

const getOrderStatusType = (order) => {
  // 주문 상태를 기준으로 표시
  return getStatusType(order.orderStatus)
}

const getTrackingEventText = (event) => {
  console.log('Getting tracking event text for:', event)
  const eventTexts = {
    'PACKAGE_RECEIVED': '패키지 접수',
    'IN_TRANSIT': '배송중',
    'OUT_FOR_DELIVERY': '배송 출발',
    'DELIVERED': '배송완료',
    'FAILED_ATTEMPT': '배송 시도 실패',
    'EXCEPTION': '배송 이상',
    'RETURN_TO_SENDER': '반송',
    'ORDER_PLACED': '주문 접수'  // 새로운 이벤트 추가
  }
  return eventTexts[event] || event
}

const getTrackingEventTagType = (event) => {
  const eventTypes = {
    'PACKAGE_RECEIVED': 'info',
    'IN_TRANSIT': 'warning',
    'OUT_FOR_DELIVERY': 'primary',
    'DELIVERED': 'success',
    'FAILED_ATTEMPT': 'danger',
    'EXCEPTION': 'danger',
    'RETURN_TO_SENDER': 'danger',
    'ORDER_PLACED': 'info'  // 새로운 이벤트 추가
  }
  return eventTypes[event] || 'info'
}

const getShipmentStatusText = (status) => {
  const statusTexts = {
    'PENDING': '대기중',
    'PROCESSING': '처리중',
    'SHIPPED': '배송중',
    'DELIVERED': '배송완료',
    'CANCELLED': '취소됨'
  }
  return statusTexts[status] || status
}

const getShipmentStatusType = (status) => {
  const statusTypes = {
    'PENDING': 'info',
    'PROCESSING': 'warning',
    'SHIPPED': 'primary',
    'DELIVERED': 'success',
    'CANCELLED': 'danger'
  }
  return statusTypes[status] || 'info'
}

const getStatusText = (status) => {
  const statusTexts = {
    'PENDING': '대기중',
    'PAID': '결제완료',
    'PROCESSING': '처리중',
    'SHIPPED': '배송중',
    'DELIVERED': '배송완료',
    'FAILED': '실패',
    'CANCELLED': '취소됨',
    'REFUNDED': '환불됨'
  }
  return statusTexts[status] || status
}

const getStatusType = (status) => {
  const statusTypes = {
    'PENDING': 'info',
    'PAID': 'success',
    'PROCESSING': 'warning',
    'SHIPPED': 'primary',
    'DELIVERED': 'success',
    'FAILED': 'danger',
    'CANCELLED': 'danger',
    'REFUNDED': 'warning'
  }
  return statusTypes[status] || 'info'
}
</script>

<style scoped>
.table-card {
  margin-bottom: 20px;
}

.custom-table-container {
  overflow-x: auto;
}

/* Custom Order Table Styles */
.order-table {
  width: 100%;
  border-collapse: collapse;
  background: white;
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  border: 1px solid #e4e7ed;
}

.order-table th {
  background: #f5f7fa;
  color: #303133;
  padding: 15px;
  text-align: left;
  font-weight: 600;
  border-bottom: 2px solid #e4e7ed;
  font-size: 14px;
}

.order-table td {
  padding: 12px 15px;
  border-bottom: 1px solid #f2f6fc;
  font-size: 14px;
  color: #606266;
}

.order-table .order-row {
  cursor: pointer;
}

.order-table .order-row:hover {
  background: #f5f7fa;
}

.order-table .order-row.paid-order {
  background-color: #f0f9ff;
}

.order-table .order-row.paid-order:hover {
  background-color: #e0f2fe;
}

.checkbox:disabled {
  cursor: not-allowed;
  opacity: 0.4;
}

.order-table tr:last-child td {
  border-bottom: none;
}

.checkbox {
  width: 18px;
  height: 18px;
  cursor: pointer;
}

.action-icons {
  display: flex;
  gap: 8px;
}

.pagination-container {
  display: flex;
  justify-content: center;
  margin-top: 20px;
  padding-top: 20px;
  border-top: 1px solid #e4e7ed;
}
</style>