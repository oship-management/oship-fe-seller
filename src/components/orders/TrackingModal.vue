<template>
  <!-- Tracking Modal -->
  <el-dialog
    v-model="localVisible"
    title="패키지 추적"
    width="900px"
    :before-close="handleClose"
  >
    <div v-if="order">
      <div style="text-align: center; margin-bottom: 30px;">
        <el-tag 
          :type="getLatestTrackingStatusType(order)"
          size="large"
          style="padding: 12px 30px; font-size: 18px; font-weight: 700;"
        >
          {{ getLatestTrackingStatus(order) }}
        </el-tag>
        <p style="margin-top: 10px; color: #909399;">
          Tracking #: <span>{{ order.oshopMasterNo }}</span>
        </p>
        <p style="color: #909399;">
          Order: <span>{{ order.oshopMasterNo }} - {{ order.storeName }}</span>
        </p>
      </div>

      <el-row :gutter="20" style="margin-bottom: 30px;">
        <el-col :span="12">
          <el-card>
            <template #header>
              <div class="card-header">
                <el-icon><Location /></el-icon>
                <span>배송 주소</span>
              </div>
            </template>
            <div>
              <strong>{{ order.recipientName }}</strong><br>
              {{ order.storeName }}<br>
              {{ order.storePlatform }}<br>
              패키지: {{ order.parcelCount }}개<br>
              무게: {{ order.shipmentActualWeight }}kg
            </div>
          </el-card>
        </el-col>
        <el-col :span="12">
          <el-card>
            <template #header>
              <div class="card-header">
                <el-icon><Van /></el-icon>
                <span>배송 정보</span>
              </div>
            </template>
            <div>
              <strong>배송업체:</strong> 배송 업체<br>
              <strong>서비스:</strong> 표준 배송<br>
              <strong>추적번호:</strong> {{ order.oshopMasterNo }}
            </div>
          </el-card>
        </el-col>
      </el-row>

      <el-steps :active="getTrackingStep(order.orderStatus)" align-center>
        <el-step title="주문 접수" />
        <el-step title="처리중" />
        <el-step title="배송중" />
        <el-step title="배송완료" />
      </el-steps>

      <div style="margin-top: 30px;">
        <h3 style="margin-bottom: 15px;">추적 기록</h3>
        <div v-if="loadingTracking" style="text-align: center; padding: 20px;">
          <el-icon class="is-loading"><Loading /></el-icon>
          배송 추적 정보를 불러오는 중...
        </div>
        <el-timeline v-else-if="trackingEvents.length > 0">
          <el-timeline-item 
            v-for="event in trackingEvents" 
            :key="event.id"
            :timestamp="formatTrackingDate(event.createdAt)" 
            placement="top"
            :color="getTrackingEventColor(event.event)"
          >
            <el-card>
              <h4>{{ getTrackingEventText(event.event) }}</h4>
              <p v-if="event.eventDescription">{{ event.eventDescription }}</p>
              <p v-if="event.description && event.description.trim()">{{ event.description }}</p>
            </el-card>
          </el-timeline-item>
        </el-timeline>
        <el-empty v-else description="배송 추적 정보가 없습니다." />
      </div>
    </div>
  </el-dialog>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { Location, Van, Loading } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import { shipmentApi } from '@/api/shipments'

const props = defineProps({
  visible: {
    type: Boolean,
    required: true
  },
  order: {
    type: Object,
    default: null
  }
})

const emit = defineEmits(['update:visible', 'close'])

// Local data
const trackingEvents = ref([])
const loadingTracking = ref(false)

// Computed
const localVisible = computed({
  get: () => props.visible,
  set: (value) => emit('update:visible', value)
})

// Watch for order changes to load tracking events
watch(() => props.order, async (newOrder) => {
  if (newOrder && props.visible) {
    await loadTrackingEvents(newOrder)
  }
}, { immediate: true })

watch(() => props.visible, async (visible) => {
  if (visible && props.order) {
    await loadTrackingEvents(props.order)
  }
})

// Methods
const handleClose = () => {
  emit('update:visible', false)
  emit('close')
}

const loadTrackingEvents = async (order) => {
  if (!order) return
  
  try {
    loadingTracking.value = true
    trackingEvents.value = []
    
    console.log(`Loading tracking events for order ID: ${order.id}`)
    
    // API call to load tracking events
    const response = await shipmentApi.getTrackingEvents(order.id)
    console.log('Tracking events response:', response)
    
    if (response.data && response.data.data) {
      // Sort events by creation date (newest first)
      trackingEvents.value = response.data.data.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      console.log(`Loaded ${trackingEvents.value.length} tracking events`)
    } else {
      console.log('No tracking events found in response')
      trackingEvents.value = []
    }
    
  } catch (error) {
    console.error('Failed to load tracking events:', error)
    ElMessage.error('배송 추적 정보를 불러오는데 실패했습니다.')
    trackingEvents.value = []
  } finally {
    loadingTracking.value = false
  }
}

// 추적 스텝 계산
const getTrackingStep = (status) => {
  const stepMap = {
    'PENDING': 0,
    'PROCESSING': 1,
    'SHIPPED': 2,
    'DELIVERED': 3
  }
  return stepMap[status] || 0
}

// 날짜 포맷팅
const formatTrackingDate = (dateString) => {
  if (!dateString) return '-'
  const date = new Date(dateString)
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')
  return `${year}-${month}-${day} ${hours}:${minutes}`
}

// 최신 추적 상태 텍스트
const getLatestTrackingStatus = (order) => {
  // 1. 최신 tracking event가 있으면 우선 표시
  if (order.latestTrackingEvent) {
    return getTrackingEventText(order.latestTrackingEvent.event)
  }
  
  // 2. 배송 상태가 있으면 확인
  if (order.shipmentStatus) {
    return getShipmentStatusText(order.shipmentStatus)
  }
  
  // 3. 기본 주문 상태
  return getStatusText(order.orderStatus)
}

// 최신 추적 상태 타입
const getLatestTrackingStatusType = (order) => {
  // 1. 최신 tracking event가 있으면 우선 표시
  if (order.latestTrackingEvent) {
    return getTrackingEventTagType(order.latestTrackingEvent.event)
  }
  
  // 2. 배송 상태가 있으면 확인
  if (order.shipmentStatus) {
    return getShipmentStatusType(order.shipmentStatus)
  }
  
  // 3. 기본 주문 상태
  return getStatusType(order.orderStatus)
}

// 추적 이벤트 텍스트
const getTrackingEventText = (eventType) => {
  const eventMap = {
    // 주문 접수
    'ORDER_PLACED': '주문 접수',
    // 바코드 생성
    'LABEL_CREATED': '라벨 생성됨',
    // AWB 생성
    'AWB_CREATED': '배송 준비중',
    // AWB 취소
    'AWB_CANCEL': 'AWB 취소됨',
    // GEM 집하지 도착
    'CENTER_ARRIVED': 'GEM 집하지 도착',
    // 픽업/배송 준비
    'READY_SHIP': '픽업 준비 완료',
    // 픽업 완료
    'PICKED_UP': '픽업 완료',
    // 운송 시작
    'SHIPPED': '운송 시작',
    // 운송중
    'IN_TRANSIT': '운송중',
    // 허브 도착
    'HUB_ARRIVED': '운송 허브 도착',
    // 목적지 국가 도착
    'DEST_COUNTRY_ARRIVED': '목적지 국가 도착',
    // 현지 배송중
    'OUT_FOR_DELIVERY': '현지 배송중',
    // 배송 완료
    'DELIVERED': '배송 완료',
    // 배송 실패
    'FAILED_DELIVERY': '배송 실패',
    // 반송
    'RETURNED': '반송',
    // 분실
    'LOST': '분실',
    // 손상
    'DAMAGED': '손상'
  }
  return eventMap[eventType] || eventType
}

// 추적 이벤트 색상
const getTrackingEventColor = (eventType) => {
  const colorMap = {
    // 초기 단계 (회색)
    'ORDER_PLACED': '#909399',
    'LABEL_CREATED': '#909399',
    
    // 준비/픽업 단계 (파란색)
    'AWB_CREATED': '#409EFF',
    'CENTER_ARRIVED': '#409EFF',
    'READY_SHIP': '#409EFF',
    
    // 픽업/운송 단계 (주황색)
    'PICKED_UP': '#E6A23C',
    'SHIPPED': '#E6A23C',
    'IN_TRANSIT': '#E6A23C',
    'HUB_ARRIVED': '#E6A23C',
    'DEST_COUNTRY_ARRIVED': '#E6A23C',
    'OUT_FOR_DELIVERY': '#E6A23C',
    
    // 완료 단계 (초록색)
    'DELIVERED': '#67C23A',
    
    // 문제 상황 (빨간색)
    'FAILED_DELIVERY': '#F56C6C',
    'RETURNED': '#F56C6C',
    'LOST': '#F56C6C',
    'DAMAGED': '#F56C6C',
    'AWB_CANCEL': '#F56C6C'
  }
  return colorMap[eventType] || '#409EFF'
}

// 추적 이벤트 태그 타입
const getTrackingEventTagType = (eventType) => {
  const tagTypeMap = {
    // 초기 단계
    'ORDER_PLACED': 'info',
    'LABEL_CREATED': 'info',
    
    // 준비/픽업 단계
    'AWB_CREATED': '',  // 기본 색상
    'CENTER_ARRIVED': '',
    'READY_SHIP': '',
    
    // 운송 단계
    'SHIPPED': 'warning',
    'IN_TRANSIT': 'warning',
    'HUB_ARRIVED': 'warning',
    'DEST_COUNTRY_ARRIVED': 'warning',
    'OUT_FOR_DELIVERY': 'warning',
    
    // 완료
    'DELIVERED': 'success',
    
    // 문제 상황
    'FAILED_DELIVERY': 'danger',
    'RETURNED': 'danger',
    'LOST': 'danger',
    'DAMAGED': 'danger',
    'AWB_CANCEL': 'danger'
  }
  return tagTypeMap[eventType] || ''
}

// 배송 상태 텍스트
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

// 배송 상태 타입
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

// 기본 상태 텍스트
const getStatusText = (status) => {
  const statusTexts = {
    'PENDING': '대기중',
    'PROCESSING': '처리중',
    'SHIPPED': '배송중',
    'DELIVERED': '배송완료',
    'CANCELLED': '취소됨'
  }
  return statusTexts[status] || status
}

// 기본 상태 타입
const getStatusType = (status) => {
  const statusTypes = {
    'PENDING': 'info',
    'PROCESSING': 'warning',
    'SHIPPED': 'primary',
    'DELIVERED': 'success',
    'CANCELLED': 'danger'
  }
  return statusTypes[status] || 'info'
}
</script>

<style scoped>
.card-header {
  display: flex;
  align-items: center;
  gap: 8px;
}
</style>