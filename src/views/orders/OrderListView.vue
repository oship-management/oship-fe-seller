<template>
  <div class="order-list">
    <div class="page-header">
      <h1>주문 관리</h1>
      <div class="header-actions">
        <span class="selected-count">{{ selectedOrdersCount }}개 선택됨</span>
        <el-button 
          type="success" 
          @click="openShippingModal" 
          :disabled="selectedOrdersCount === 0"
        >
          <el-icon><Van /></el-icon>
          배송 처리
        </el-button>
        <el-upload
          class="upload-demo"
          action="#"
          :auto-upload="false"
          :show-file-list="false"
          :on-change="handleExcelUpload"
          accept=".xlsx,.xls"
          :disabled="uploadingExcel"
          style="display: inline-block; margin-right: 12px;"
        >
          <el-button type="warning" :loading="uploadingExcel">
            <el-icon v-if="!uploadingExcel"><Upload /></el-icon>
            {{ uploadingExcel ? '업로드 중...' : '엑셀 업로드' }}
          </el-button>
        </el-upload>
        <el-button type="primary" @click="openCreateModal">
          <el-icon><Plus /></el-icon>
          주문 생성
        </el-button>
      </div>
    </div>

    <!-- Filters -->
    <OrderFilters 
      v-model:filters="filters"
      v-model:dateRange="dateRange"
      :loading="loading"
      @search="fetchOrders"
      @reset="resetFilters"
    />


    <!-- Orders Table -->
    <OrderTable
      :orders="orders"
      :selected-orders="selectedOrders"
      :loading="loading"
      :uploading-excel="uploadingExcel"
      :pagination="pagination"
      @update:selected-orders="selectedOrders = $event"
      @update:pagination="pagination = $event"
      @order-detail="openOrderDetailModal"
      @order-tracking="openTrackingModal"
      @order-delete="deleteOrder"
      @page-size-change="handleSizeChange"
      @page-change="handleCurrentChange"
    />

    <!-- Tracking Modal -->
    <TrackingModal 
      v-model:visible="showTrackingModal"
      :order="selectedOrder"
      @close="closeTrackingModal"
    />

    <!-- Create Order Modal -->
    <el-dialog
      v-model="showCreateModal"
      title="새 주문 생성"
      width="1200px"
      :before-close="closeCreateModal"
    >
      <OrderForm
        ref="createOrderForm"
        mode="create"
        :form-data="createFormData"
        :countries="countries"
        :state-code-data="stateCodeData"
        @cancel="closeCreateModal"
      />
      <template #footer>
        <div class="dialog-footer">
          <el-button @click="closeCreateModal">취소</el-button>
          <el-button type="primary" @click="createNewOrder">주문 생성</el-button>
        </div>
      </template>
    </el-dialog>

    <!-- Shipping Modal -->
    <ShippingMethodModal 
      v-model="showShippingModal"
      :carrier-rates="carrierRates"
      :loading="loadingRates"
      :selected-orders-count="selectedOrdersCount"
      :selected-orders="selectedOrdersData"
      @confirm="confirmShipping"
      @close="closeShippingModal"
      @refresh-orders="handleRefreshOrders"
    />

    <!-- Order Detail Modal -->
    <el-dialog
      v-model="showOrderDetailModal"
      title="주문 상세정보"
      width="1200px"
      :before-close="closeOrderDetailModal"
    >
      <OrderForm
        ref="editOrderForm"
        mode="edit"
        :form-data="editFormData"
        :is-editing="isEditingOrder"
        :countries="countries"
        :state-code-data="stateCodeData"
        @submit="saveOrderChanges"
        @cancel="cancelEditOrder"
      />
      <template #footer>
        <div class="dialog-footer">
          <el-button @click="closeOrderDetailModal">닫기</el-button>
          <el-button v-if="!isEditingOrder" type="warning" @click="startEditOrder">편집</el-button>
          <el-button v-if="isEditingOrder" @click="cancelEditOrder">취소</el-button>
          <el-button v-if="isEditingOrder" type="primary" @click="saveOrderChanges">저장</el-button>
        </div>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, nextTick } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { orderApi } from '@/api/orders'
import { shipmentApi } from '@/api/shipments'
import { carrierApi } from '@/api/carriers'

// Order Components
import OrderFilters from '@/components/orders/OrderFilters.vue'
import OrderTable from '@/components/orders/OrderTable.vue'
import TrackingModal from '@/components/orders/TrackingModal.vue'
import ShippingMethodModal from '@/components/orders/ShippingMethodModal.vue'
import OrderForm from '@/components/orders/OrderForm.vue'

import { 
  Plus, Search, Refresh, Van, View, Edit, Delete, Loading, 
  Location, Document, Clock, CreditCard, User, Box, Shop, Goods, Setting, Upload
} from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'

const authStore = useAuthStore()

// Reactive data
const orders = ref([])
const selectedOrders = ref([])
const loading = ref(false)
const uploadingExcel = ref(false)
const showCreateModal = ref(false)
const showTrackingModal = ref(false)
const showShippingModal = ref(false)
const showOrderDetailModal = ref(false)
const selectedOrder = ref(null)
const trackingEvents = ref([])
const loadingTracking = ref(false)
const isEditingOrder = ref(false)
const editFormData = ref({})
const createOrderForm = ref(null)
const editOrderForm = ref(null)
const createFormData = ref({
  // 상점 정보 (백엔드 필수)
  storePlatform: '',
  storeName: '',
  orderNo: '',
  shippingTerm: '',
  orderStatus: 'PENDING',
  
  // 패키지 정보
  parcelCount: 1,
  shipmentActualWeight: 0,
  shipmentVolumeWeight: 0,
  weightUnit: 'KG',
  dimension: {
    length: 1,
    width: 1,
    height: 1
  },
  
  // 백엔드 필수 필드
  itemContentsType: 'PACKAGE',
  serviceType: 'STANDARD',
  packageType: 'BOX',
  
  // 발송자 정보 (백엔드 필수 - 플랫 구조)
  senderName: '',
  senderCompany: '',
  senderEmail: '',
  senderPhoneNo: '',
  senderCountryCode: 'KR',
  senderState: '',
  senderStateCode: '',
  senderCity: '',
  senderAddress1: '',
  senderAddress2: '',
  senderZipCode: '',
  senderTaxId: '',
  
  // 수취자 정보 (백엔드 필수 - 플랫 구조)
  recipientName: '',
  recipientCompany: '',
  recipientEmail: '',
  recipientPhoneNo: '',
  recipientCountryCode: '',
  recipientState: '',
  recipientStateCode: '',
  recipientCity: '',
  recipientAddress1: '',
  recipientAddress2: '',
  recipientZipCode: '',
  recipientTaxId: '',
  
  // UI 표시를 위한 중첩 객체 구조 (기존 컴포넌트 호환성)
  sender: {
    name: '',
    company: '',
    email: '',
    phoneNo: '',
    address: {
      address1: '',
      address2: '',
      city: '',
      state: '',
      stateCode: '',
      zipCode: '',
      countryCode: 'KR'
    }
  },
  recipient: {
    name: '',
    company: '',
    email: '',
    phoneNo: '',
    taxId: '',
    address: {
      address1: '',
      address2: '',
      city: '',
      state: '',
      stateCode: '',
      zipCode: '',
      countryCode: ''
    }
  },
  items: [{
    itemName: '',
    itemQuantity: 1,
    itemUnitValue: 0,
    itemValueCurrency: 'KRW',
    itemWeight: 0,
    weightUnit: 'KG',
    itemHSCode: '',
    itemOriginCountryCode: 'KR'
  }]
})
const editingOrder = ref(null)
const isEditMode = ref(false)
const selectedShippingMethod = ref(null)
const selectedShippingPrice = ref(0)
const carrierRates = ref([])
const loadingRates = ref(false)
const dateRange = ref([])

// Countries and states data
const countries = computed(() => getAllCountries())
const stateCodeData = ref({
  US: [
    { code: 'AL', name: 'Alabama' },
    { code: 'AK', name: 'Alaska' },
    { code: 'AZ', name: 'Arizona' },
    { code: 'AR', name: 'Arkansas' },
    { code: 'CA', name: 'California' },
    { code: 'CO', name: 'Colorado' },
    { code: 'CT', name: 'Connecticut' },
    { code: 'DE', name: 'Delaware' },
    { code: 'FL', name: 'Florida' },
    { code: 'GA', name: 'Georgia' },
    { code: 'HI', name: 'Hawaii' },
    { code: 'ID', name: 'Idaho' },
    { code: 'IL', name: 'Illinois' },
    { code: 'IN', name: 'Indiana' },
    { code: 'IA', name: 'Iowa' },
    { code: 'KS', name: 'Kansas' },
    { code: 'KY', name: 'Kentucky' },
    { code: 'LA', name: 'Louisiana' },
    { code: 'ME', name: 'Maine' },
    { code: 'MD', name: 'Maryland' },
    { code: 'MA', name: 'Massachusetts' },
    { code: 'MI', name: 'Michigan' },
    { code: 'MN', name: 'Minnesota' },
    { code: 'MS', name: 'Mississippi' },
    { code: 'MO', name: 'Missouri' },
    { code: 'MT', name: 'Montana' },
    { code: 'NE', name: 'Nebraska' },
    { code: 'NV', name: 'Nevada' },
    { code: 'NH', name: 'New Hampshire' },
    { code: 'NJ', name: 'New Jersey' },
    { code: 'NM', name: 'New Mexico' },
    { code: 'NY', name: 'New York' },
    { code: 'NC', name: 'North Carolina' },
    { code: 'ND', name: 'North Dakota' },
    { code: 'OH', name: 'Ohio' },
    { code: 'OK', name: 'Oklahoma' },
    { code: 'OR', name: 'Oregon' },
    { code: 'PA', name: 'Pennsylvania' },
    { code: 'RI', name: 'Rhode Island' },
    { code: 'SC', name: 'South Carolina' },
    { code: 'SD', name: 'South Dakota' },
    { code: 'TN', name: 'Tennessee' },
    { code: 'TX', name: 'Texas' },
    { code: 'UT', name: 'Utah' },
    { code: 'VT', name: 'Vermont' },
    { code: 'VA', name: 'Virginia' },
    { code: 'WA', name: 'Washington' },
    { code: 'WV', name: 'West Virginia' },
    { code: 'WI', name: 'Wisconsin' },
    { code: 'WY', name: 'Wyoming' }
  ],
  AU: [
    { code: 'ACT', name: 'Australian Capital Territory' },
    { code: 'NSW', name: 'New South Wales' },
    { code: 'NT', name: 'Northern Territory' },
    { code: 'QLD', name: 'Queensland' },
    { code: 'SA', name: 'South Australia' },
    { code: 'TAS', name: 'Tasmania' },
    { code: 'VIC', name: 'Victoria' },
    { code: 'WA', name: 'Western Australia' }
  ],
  CA: [
    { code: 'AB', name: 'Alberta' },
    { code: 'BC', name: 'British Columbia' },
    { code: 'MB', name: 'Manitoba' },
    { code: 'NB', name: 'New Brunswick' },
    { code: 'NL', name: 'Newfoundland and Labrador' },
    { code: 'NS', name: 'Nova Scotia' },
    { code: 'ON', name: 'Ontario' },
    { code: 'PE', name: 'Prince Edward Island' },
    { code: 'QC', name: 'Quebec' },
    { code: 'SK', name: 'Saskatchewan' },
    { code: 'NT', name: 'Northwest Territories' },
    { code: 'NU', name: 'Nunavut' },
    { code: 'YT', name: 'Yukon' }
  ],
  IN: [
    { code: 'AN', name: 'Andaman and Nicobar Islands' },
    { code: 'AP', name: 'Andhra Pradesh' },
    { code: 'AR', name: 'Arunachal Pradesh' },
    { code: 'AS', name: 'Assam' },
    { code: 'BR', name: 'Bihar' },
    { code: 'CH', name: 'Chandigarh' },
    { code: 'CT', name: 'Chhattisgarh' },
    { code: 'DN', name: 'Dadra and Nagar Haveli' },
    { code: 'DD', name: 'Daman and Diu' },
    { code: 'DL', name: 'Delhi' },
    { code: 'GA', name: 'Goa' },
    { code: 'GJ', name: 'Gujarat' },
    { code: 'HR', name: 'Haryana' },
    { code: 'HP', name: 'Himachal Pradesh' },
    { code: 'JK', name: 'Jammu and Kashmir' },
    { code: 'JH', name: 'Jharkhand' },
    { code: 'KA', name: 'Karnataka' },
    { code: 'KL', name: 'Kerala' },
    { code: 'LD', name: 'Lakshadweep' },
    { code: 'MP', name: 'Madhya Pradesh' },
    { code: 'MH', name: 'Maharashtra' },
    { code: 'MN', name: 'Manipur' },
    { code: 'ML', name: 'Meghalaya' },
    { code: 'MZ', name: 'Mizoram' },
    { code: 'NL', name: 'Nagaland' },
    { code: 'OR', name: 'Odisha' },
    { code: 'PY', name: 'Puducherry' },
    { code: 'PB', name: 'Punjab' },
    { code: 'RJ', name: 'Rajasthan' },
    { code: 'SK', name: 'Sikkim' },
    { code: 'TN', name: 'Tamil Nadu' },
    { code: 'TG', name: 'Telangana' },
    { code: 'TR', name: 'Tripura' },
    { code: 'UP', name: 'Uttar Pradesh' },
    { code: 'UT', name: 'Uttarakhand' },
    { code: 'WB', name: 'West Bengal' }
  ],
  MX: [
    { code: 'AGU', name: 'Aguascalientes' },
    { code: 'BCN', name: 'Baja California' },
    { code: 'BCS', name: 'Baja California Sur' },
    { code: 'CAM', name: 'Campeche' },
    { code: 'CHP', name: 'Chiapas' },
    { code: 'CHH', name: 'Chihuahua' },
    { code: 'COA', name: 'Coahuila' },
    { code: 'COL', name: 'Colima' },
    { code: 'DIF', name: 'Mexico City' },
    { code: 'DUR', name: 'Durango' },
    { code: 'GUA', name: 'Guanajuato' },
    { code: 'GRO', name: 'Guerrero' },
    { code: 'HID', name: 'Hidalgo' },
    { code: 'JAL', name: 'Jalisco' },
    { code: 'MEX', name: 'Mexico State' },
    { code: 'MIC', name: 'Michoacán' },
    { code: 'MOR', name: 'Morelos' },
    { code: 'NAY', name: 'Nayarit' },
    { code: 'NLE', name: 'Nuevo León' },
    { code: 'OAX', name: 'Oaxaca' },
    { code: 'PUE', name: 'Puebla' },
    { code: 'QUE', name: 'Querétaro' },
    { code: 'ROO', name: 'Quintana Roo' },
    { code: 'SLP', name: 'San Luis Potosí' },
    { code: 'SIN', name: 'Sinaloa' },
    { code: 'SON', name: 'Sonora' },
    { code: 'TAB', name: 'Tabasco' },
    { code: 'TAM', name: 'Tamaulipas' },
    { code: 'TLA', name: 'Tlaxcala' },
    { code: 'VER', name: 'Veracruz' },
    { code: 'YUC', name: 'Yucatán' },
    { code: 'ZAC', name: 'Zacatecas' }
  ],
  AE: [
    { code: 'AZ', name: 'Abu Dhabi' },
    { code: 'AJ', name: 'Ajman' },
    { code: 'DU', name: 'Dubai' },
    { code: 'FU', name: 'Fujairah' },
    { code: 'RK', name: 'Ras Al Khaimah' },
    { code: 'SH', name: 'Sharjah' },
    { code: 'UQ', name: 'Umm Al Quwain' }
  ]
})

// Pagination
const pagination = ref({
  page: 1,
  size: 20,
  total: 0
})

// Filters
const filters = ref({
  status: '',
  startDate: '',
  endDate: ''
})

// Shipping methods
const shippingMethods = ref([
  {
    id: 'ups',
    name: 'UPS',
    service: 'UPS Express',
    description: 'Fast delivery • 1-2 business days',
    price: 160.50,
    logoClass: 'ups-logo'
  },
  {
    id: 'fedex',
    name: 'FedEx',
    service: 'FedEx Priority',
    description: 'Reliable • 2-3 business days',
    price: 130.20,
    logoClass: 'fedex-logo'
  },
  {
    id: 'dhl',
    name: 'DHL',
    service: 'DHL Standard',
    description: 'Economy • 3-5 business days',
    price: 128.70,
    logoClass: 'dhl-logo'
  }
])

// Computed
const selectedOrdersCount = computed(() => selectedOrders.value.length)
const selectedOrdersData = computed(() => {
  return orders.value.filter(order => selectedOrders.value.includes(order.id))
})
const isAllSelected = computed(() => {
  return orders.value.length > 0 && selectedOrders.value.length === orders.value.length
})

// Methods
// 각 주문의 최신 tracking event 가져오기
const fetchLatestTrackingEvents = async () => {
  try {
    console.log('Fetching latest tracking events for orders:', orders.value.length)
    
    const promises = orders.value.map(async (order) => {
      // 백엔드에서 이미 lastTrackingEvent를 제공하는 경우 스킵
      if (order.lastTrackingEvent) {
        console.log(`Order ${order.id} already has lastTrackingEvent:`, order.lastTrackingEvent)
        return
      }
      
      try {
        const response = await shipmentApi.getTrackingEvents(order.id)
        if (response.data && response.data.data && response.data.data.length > 0) {
          // 최신 이벤트 저장 (마지막 이벤트가 최신)
          const latestEvent = response.data.data[response.data.data.length - 1]
          order.latestTrackingEvent = latestEvent
          order.lastTrackingEvent = latestEvent.event // 백엔드 형식에 맞춤
          console.log(`Set lastTrackingEvent for order ${order.id}:`, order.lastTrackingEvent)
        }
      } catch (error) {
        console.error(`Failed to fetch tracking events for order ${order.id}:`, error)
      }
    })
    
    // 모든 요청을 병렬로 처리
    await Promise.all(promises)
  } catch (error) {
    console.error('Failed to fetch tracking events:', error)
  }
}

const fetchOrders = async () => {
  try {
    loading.value = true
    
    const params = {
      page: pagination.value.page - 1,
      size: pagination.value.size,
      sort: 'createdAt,desc'
    }
    
    // Add filters
    if (filters.value.status && filters.value.status !== '') {
      params.status = filters.value.status
    }
    if (filters.value.startDate && filters.value.startDate !== '') {
      params.startDate = filters.value.startDate
    }
    if (filters.value.endDate && filters.value.endDate !== '') {
      params.endDate = filters.value.endDate
    }
    
    console.log('Fetching orders with params:', params)

    const response = await orderApi.getOrders(params)
    console.log('Orders response:', response)
    console.log('Response structure:', {
      'response.data': response.data,
      'response.data.data': response.data?.data,
      'response.data.data.data': response.data?.data?.data
    })

    // 응답 구조 확인 및 파싱 - response.data.data.data가 직접 배열임
    if (response.data && response.data.data && response.data.data.data) {
      const ordersArray = response.data.data.data  // 이미 배열임
      const paginationData = response.data.data    // 페이지네이션 정보
      
      console.log('Orders array:', ordersArray)
      console.log('First order sample:', ordersArray[0])
      console.log('Pagination data:', paginationData)
      
      // 각 주문의 orderStatus와 lastTrackingEvent 확인
      ordersArray.forEach((order, index) => {
        if (index < 3) { // 처음 3개만 로그
          console.log(`Order ${index}:`, {
            id: order.id,
            orderStatus: order.orderStatus,
            lastTrackingEvent: order.lastTrackingEvent,
            orderNo: order.orderNo,
            isPrintBarcode: order.isPrintBarcode,
            isPrintAwb: order.isPrintAwb
          })
        }
      })
      
      orders.value = ordersArray || []
      pagination.value.total = paginationData.totalElements || 0
      pagination.value.page = paginationData.page || 1
      
      console.log('Final orders set:', orders.value.length)
      console.log('Final pagination:', pagination.value)
      
      // 각 주문의 최신 tracking event 가져오기
      await fetchLatestTrackingEvents()
    } else if (response.data && response.data.data) {
      // fallback
      const responseData = response.data.data
      console.log('Fallback response data:', responseData)
      
      orders.value = responseData.data || responseData.content || []
      pagination.value.total = responseData.totalElements || 0
      pagination.value.page = responseData.page || 1
    } else {
      console.log('Response structure not matching expected format')
      orders.value = []
      pagination.value.total = 0
    }
    
  } catch (error) {
    console.error('Fetch orders failed:', error)
    console.error('Error details:', error.response?.data)
    orders.value = []
  } finally {
    loading.value = false
  }
}

const toggleAllOrders = () => {
  if (isAllSelected.value) {
    selectedOrders.value = []
  } else {
    selectedOrders.value = orders.value.map(order => order.id)
  }
}

const handleSizeChange = (newSize) => {
  pagination.value.size = newSize
  pagination.value.page = 1
  fetchOrders()
}

const handleCurrentChange = (newPage) => {
  pagination.value.page = newPage
  fetchOrders()
}

const handleDateChange = (dates) => {
  if (dates && dates.length === 2) {
    filters.value.startDate = dates[0]
    filters.value.endDate = dates[1]
  } else {
    filters.value.startDate = ''
    filters.value.endDate = ''
  }
}

const resetFilters = () => {
  filters.value = {
    status: '',
    startDate: '',
    endDate: ''
  }
  dateRange.value = []
  pagination.value.page = 1
  fetchOrders()
}

// Excel upload handler
const handleExcelUpload = async (file) => {
  // 파일 크기 체크 (선택적)
  const maxSize = 50 * 1024 * 1024 // 50MB
  if (file.size > maxSize) {
    ElMessage.warning('파일 크기가 너무 큽니다. 50MB 이하의 파일을 업로드해주세요.')
    return
  }

  try {
    uploadingExcel.value = true
    
    // 대용량 파일 업로드 안내 메시지
    if (file.size > 5 * 1024 * 1024) { // 5MB 이상
      ElMessage.info({
        message: '대용량 파일 업로드 중입니다. 완료까지 시간이 걸릴 수 있습니다.',
        duration: 0,
        showClose: true
      })
    }
    
    const response = await orderApi.uploadExcel(file.raw)
    
    if (response.data) {
      const uploadedOrders = response.data.data || response.data
      const count = Array.isArray(uploadedOrders) ? uploadedOrders.length : 1
      ElMessage.success(`${count}개의 주문이 업로드되었습니다.`)
      
      // 주문 목록 새로고침
      await fetchOrders()
    }
  } catch (error) {
    console.error('Excel upload failed:', error)
    
    if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
      ElMessage.error({
        message: '업로드 시간이 초과되었습니다. 서버에서 처리 중일 수 있으니 잠시 후 목록을 새로고침해주세요.',
        duration: 5000,
        showClose: true
      })
      // 타임아웃 발생 시에도 목록 새로고침 시도
      setTimeout(() => {
        fetchOrders()
      }, 3000)
    } else {
      ElMessage.error(error.response?.data?.message || '엑셀 업로드에 실패했습니다.')
    }
  } finally {
    uploadingExcel.value = false
  }
}

// Modal methods
const openCreateModal = () => {
  // 폼 초기화
  createFormData.value = {
    // 상점 정보 (백엔드 필수)
    storePlatform: '',
    storeName: '',
    orderNo: '',
    shippingTerm: '',
    orderStatus: 'PENDING',
    
    // 패키지 정보
    parcelCount: 1,
    shipmentActualWeight: 0,
    shipmentVolumeWeight: 0,
    weightUnit: 'KG',
    dimension: {
      length: 1,
      width: 1,
      height: 1
    },
    
    // 백엔드 필수 필드
    itemContentsType: 'PACKAGE',
    serviceType: 'STANDARD',
    packageType: 'BOX',
    
    // 발송자 정보 (백엔드 필수 - 플랫 구조)
    senderName: '',
    senderCompany: '',
    senderEmail: '',
    senderPhoneNo: '',
    senderCountryCode: 'KR',
    senderState: '',
    senderStateCode: '',
    senderCity: '',
    senderAddress1: '',
    senderAddress2: '',
    senderZipCode: '',
    senderTaxId: '',
    
    // 수취자 정보 (백엔드 필수 - 플랫 구조)
    recipientName: '',
    recipientCompany: '',
    recipientEmail: '',
    recipientPhoneNo: '',
    recipientCountryCode: '',
    recipientState: '',
    recipientStateCode: '',
    recipientCity: '',
    recipientAddress1: '',
    recipientAddress2: '',
    recipientZipCode: '',
    recipientTaxId: '',
    
    // UI 표시를 위한 중첩 객체 구조 (기존 컴포넌트 호환성)
    sender: {
      name: '',
      company: '',
      email: '',
      phoneNo: '',
      address: {
        address1: '',
        address2: '',
        city: '',
        state: '',
        stateCode: '',
        zipCode: '',
        countryCode: 'KR'
      }
    },
    recipient: {
      name: '',
      company: '',
      email: '',
      phoneNo: '',
      taxId: '',
      address: {
        address1: '',
        address2: '',
        city: '',
        state: '',
        stateCode: '',
        zipCode: '',
        countryCode: ''
      }
    },
    items: [{
      itemName: '',
      itemQuantity: 1,
      itemUnitValue: 0,
      itemValueCurrency: 'KRW',
      itemWeight: 0,
      weightUnit: 'KG',
      itemHSCode: '',
      itemOriginCountryCode: 'KR'
    }]
  }
  
  // 주/도 선택 옵션 초기화
  createSenderStates.value = []
  createRecipientStates.value = []
  
  showCreateModal.value = true
}

const openEditModal = (order) => {
  isEditMode.value = true
  editingOrder.value = order
  showCreateModal.value = true
}

const closeCreateModal = () => {
  showCreateModal.value = false
  editingOrder.value = null
  isEditMode.value = false
}

const openTrackingModal = async (order) => {
  selectedOrder.value = order
  showTrackingModal.value = true
  trackingEvents.value = []
  
  try {
    loadingTracking.value = true
    const response = await shipmentApi.getTrackingEvents(order.id)
    console.log('Tracking events response:', response)
    
    if (response.data && response.data.data) {
      trackingEvents.value = response.data.data
    }
  } catch (error) {
    console.error('Failed to fetch tracking events:', error)
    ElMessage.error('배송 추적 정보를 불러올 수 없습니다.')
  } finally {
    loadingTracking.value = false
  }
}

const closeTrackingModal = () => {
  showTrackingModal.value = false
  selectedOrder.value = null
  trackingEvents.value = []
}

const openShippingModal = async () => {
  if (selectedOrdersCount.value === 0) {
    ElMessage.warning('배송 처리할 주문을 선택해주세요.')
    return
  }
  
  // Check if any selected orders have PAID status
  const paidOrders = selectedOrdersData.value.filter(order => order.orderStatus === 'PAID')
  if (paidOrders.length > 0) {
    const paidOrderNumbers = paidOrders.map(order => order.oshopMasterNo).join(', ')
    ElMessage.error(`결제 완료(PAID) 상태의 주문은 배송 처리할 수 없습니다.\nPAID 주문: ${paidOrderNumbers}`)
    return
  }
  
  try {
    loadingRates.value = true
    carrierRates.value = []
    
    // carrier rates API 호출
    const response = await carrierApi.getCarrierRates({
      orderIds: selectedOrders.value.join(',')
    })
    
    console.log('Carrier rates response:', response)
    
    if (response.data && response.data.data) {
      carrierRates.value = response.data.data
    }
    
    showShippingModal.value = true
  } catch (error) {
    console.error('Failed to fetch carrier rates:', error)
    ElMessage.error('배송 요금 조회에 실패했습니다.')
  } finally {
    loadingRates.value = false
  }
}

const closeShippingModal = () => {
  showShippingModal.value = false
  selectedShippingMethod.value = null
  selectedShippingPrice.value = 0
  carrierRates.value = []
  selectedOrders.value = [] // 모달 닫을 때 선택된 주문들 초기화
}

const selectShippingMethod = (method, price) => {
  selectedShippingMethod.value = method
  selectedShippingPrice.value = price
}

const confirmShipping = async (shippingData) => {
  try {
    console.log('Shipping confirmed with data:', shippingData)
    
    // 배송 처리 완료 후 주문 목록 새로고침
    await fetchOrders()
    
    // 선택된 주문 목록은 초기화하지 않음 (바코드 프린트 완료 후 사용자가 모달을 닫을 때까지 유지)
    
  } catch (error) {
    console.error('Shipping confirmation failed:', error)
    ElMessage.error('배송 처리에 실패했습니다.')
  }
}

const handleRefreshOrders = async () => {
  try {
    console.log('Refreshing orders after barcode print...')
    
    // 주문 목록 새로고침하여 바코드 출력 상태 업데이트
    await fetchOrders()
    
    // 선택된 주문 목록 초기화 (프린트 완료 후 새로운 작업을 위해)
    selectedOrders.value = []
    
    console.log('Orders refreshed successfully')
    
  } catch (error) {
    console.error('Failed to refresh orders:', error)
    ElMessage.error('주문 목록 새로고침에 실패했습니다.')
  }
}

const deleteOrder = async (orderId) => {
  try {
    await ElMessageBox.confirm('정말로 이 주문을 삭제하시겠습니까?', '주문 삭제', {
      confirmButtonText: '삭제',
      cancelButtonText: '취소',
      type: 'warning'
    })
    
    // Call delete API here
    ElMessage.success('주문이 삭제되었습니다.')
    await fetchOrders()
  } catch (error) {
    if (error !== 'cancel') {
      console.error('Delete order failed:', error)
      ElMessage.error('주문 삭제에 실패했습니다.')
    }
  }
}

// 새 주문 생성
const createNewOrder = async () => {
  try {
    // OrderForm의 데이터를 직접 가져오기
    const formData = createOrderForm.value.localFormData
    
    // Form data 상태 확인
    console.log('Form data sender.state:', formData.sender?.state)
    console.log('Form data recipient.state:', formData.recipient?.state)
    console.log('Full sender object:', formData.sender)
    console.log('Full recipient object:', formData.recipient)
    
    // API 요청 형식에 맞게 데이터 변환 (플랫 구조 직접 사용)
    const apiData = {
      sellerId: authStore.user?.id,
      
      // 상점 정보
      storePlatform: formData.storePlatform,
      storeName: formData.storeName,
      orderNo: formData.orderNo,
      shippingTerm: formData.shippingTerm,
      
      // 백엔드 필수 필드
      itemContentsType: formData.itemContentsType,
      serviceType: formData.serviceType,
      packageType: formData.packageType,
      
      // 패키지 정보
      parcelCount: formData.parcelCount,
      shipmentActualWeight: formData.shipmentActualWeight,
      shipmentVolumeWeight: formData.shipmentVolumeWeight,
      weightUnit: formData.weightUnit,
      dimensionLength: formData.dimension?.length || 1,
      dimensionWidth: formData.dimension?.width || 1,
      dimensionHeight: formData.dimension?.height || 1,
      
      // 발송자 정보 (플랫 구조 직접 사용)
      senderName: formData.senderName || formData.sender?.name,
      senderCompany: formData.senderCompany || formData.sender?.company,
      senderEmail: formData.senderEmail || formData.sender?.email,
      senderPhoneNo: formData.senderPhoneNo || formData.sender?.phoneNo,
      senderCountryCode: formData.senderCountryCode || formData.sender?.address?.countryCode,
      senderState: formData.senderState || formData.sender?.state,
      senderStateCode: formData.senderStateCode || formData.sender?.address?.stateCode,
      senderCity: formData.senderCity || formData.sender?.address?.city,
      senderAddress1: formData.senderAddress1 || formData.sender?.address?.address1,
      senderAddress2: formData.senderAddress2 || formData.sender?.address?.address2,
      senderZipCode: formData.senderZipCode || formData.sender?.address?.zipCode,
      senderTaxId: formData.senderTaxId,
      
      // 수취자 정보 (플랫 구조 직접 사용)
      recipientName: formData.recipientName || formData.recipient?.name,
      recipientCompany: formData.recipientCompany || formData.recipient?.company,
      recipientEmail: formData.recipientEmail || formData.recipient?.email,
      recipientPhoneNo: formData.recipientPhoneNo || formData.recipient?.phoneNo,
      recipientTaxId: formData.recipientTaxId || formData.recipient?.taxId,
      recipientCountryCode: formData.recipientCountryCode || formData.recipient?.address?.countryCode,
      recipientState: formData.recipientState || formData.recipient?.state,
      recipientStateCode: formData.recipientStateCode || formData.recipient?.address?.stateCode,
      recipientCity: formData.recipientCity || formData.recipient?.address?.city,
      recipientAddress1: formData.recipientAddress1 || formData.recipient?.address?.address1,
      recipientAddress2: formData.recipientAddress2 || formData.recipient?.address?.address2,
      recipientZipCode: formData.recipientZipCode || formData.recipient?.address?.zipCode,
      
      // 아이템 정보 (올바른 필드명 사용)
      orderItems: formData.items.map(item => ({
        itemName: item.itemName || item.name,
        itemQuantity: item.itemQuantity || item.quantity,
        itemUnitValue: item.itemUnitValue || item.unitValue,
        itemValueCurrency: item.itemValueCurrency || item.valueCurrency,
        itemWeight: item.itemWeight || item.weight,
        weightUnit: item.weightUnit,
        itemHSCode: item.itemHSCode || item.itemHsCode,
        itemOriginCountryCode: item.itemOriginCountryCode
      }))
    }
    
    // API data 상태 확인
    console.log('API data senderState:', apiData.senderState)
    console.log('API data recipientState:', apiData.recipientState)
    
    console.log('API 전송 데이터:', apiData)
    
    const response = await orderApi.createOrder(apiData)
    
    if (response.data) {
      ElMessage.success('주문이 생성되었습니다.')
      closeCreateModal()
      fetchOrders()
    }
  } catch (error) {
    console.error('주문 생성 실패:', error)
    console.error('에러 상세:', error.response?.data)
    ElMessage.error(`주문 생성에 실패했습니다: ${error.response?.data?.message || error.message}`)
  }
}

// 주문 생성 - 아이템 추가/삭제
const addNewCreateItem = () => {
  createFormData.value.items.push({
    itemName: '',
    itemQuantity: 1,
    itemUnitValue: 0,
    itemValueCurrency: 'KRW',
    itemWeight: 0,
    weightUnit: 'KG',
    itemHSCode: '',
    itemOriginCountryCode: 'KR'
  })
}

const removeCreateItem = (index) => {
  if (createFormData.value.items.length > 1) {
    createFormData.value.items.splice(index, 1)
  }
}

// 주문 생성 - 국가/주도 관련 함수들
const createSenderStates = ref([])
const createRecipientStates = ref([])

const isCreateSenderCountrySupported = () => {
  const countryCode = createFormData.value.sender.address.countryCode
  return stateCodeData[countryCode] && stateCodeData[countryCode].length > 0
}

const isCreateRecipientCountrySupported = () => {
  const countryCode = createFormData.value.recipient.address.countryCode
  return stateCodeData[countryCode] && stateCodeData[countryCode].length > 0
}

const getCreateSenderStateOptions = () => {
  return createSenderStates.value
}

const getCreateRecipientStateOptions = () => {
  return createRecipientStates.value
}

const onCreateSenderCountryChange = (countryCode) => {
  createFormData.value.sender.address.state = ''
  createFormData.value.sender.address.stateCode = ''
  
  if (stateCodeData[countryCode]) {
    createSenderStates.value = stateCodeData[countryCode]
  } else {
    createSenderStates.value = []
  }
}

const onCreateRecipientCountryChange = (countryCode) => {
  createFormData.value.recipient.address.state = ''
  createFormData.value.recipient.address.stateCode = ''
  
  if (stateCodeData[countryCode]) {
    createRecipientStates.value = stateCodeData[countryCode]
  } else {
    createRecipientStates.value = []
  }
}

const onCreateSenderStateChange = (stateCode) => {
  const state = createSenderStates.value.find(s => s.code === stateCode)
  if (state) {
    createFormData.value.sender.address.state = state.name
  }
}

const onCreateRecipientStateChange = (stateCode) => {
  const state = createRecipientStates.value.find(s => s.code === stateCode)
  if (state) {
    createFormData.value.recipient.address.state = state.name
  }
}

const openOrderDetailModal = async (order) => {
  try {
    // 상세 주문 정보 API 호출
    const response = await orderApi.getOrder(order.id)
    if (response.data && response.data.data) {
      selectedOrder.value = response.data.data
    } else {
      selectedOrder.value = order // fallback
    }
    
    // editFormData에 즉시 데이터 설정하여 읽기 모드에서도 표시되도록 함
    setEditFormData(selectedOrder.value)
    console.log('Edit form data set:', editFormData.value)
    showOrderDetailModal.value = true
  } catch (error) {
    console.error('Failed to fetch order detail:', error)
    selectedOrder.value = order // fallback
    setEditFormData(selectedOrder.value)
    console.log('Edit form data set (fallback):', editFormData.value)
    showOrderDetailModal.value = true
  }
}

const closeOrderDetailModal = () => {
  showOrderDetailModal.value = false
  selectedOrder.value = null
  isEditingOrder.value = false
  editFormData.value = {}
}

const setEditFormData = (orderData) => {
  console.log('Setting edit form data with orderData:', orderData)
  
  editFormData.value = {
    // 스토어 정보
    storePlatform: orderData.storePlatform,
    storeName: orderData.storeName,
    shippingTerm: orderData.shippingTerm,
    
    // 주문 기본정보 
    orderNo: orderData.orderNo,
    orderStatus: orderData.orderStatus,  // 주문 상태 추가
    lastTrackingEvent: orderData.lastTrackingEvent,  // 최근 추적 이벤트 추가
    createdAt: orderData.createdAt,  // 생성일 추가
    
    // 백엔드 필수 필드들 (편집하지 않지만 저장 시 필요)
    itemContentsType: orderData.itemContentsType,
    serviceType: orderData.serviceType,
    packageType: orderData.packageType,
    sellerId: orderData.sellerId,
    
    // 패키지 정보
    parcelCount: orderData.parcelCount,
    shipmentActualWeight: orderData.shipmentActualWeight,
    shipmentVolumeWeight: orderData.shipmentVolumeWeight,
    weightUnit: orderData.weightUnit,
    dimension: orderData.dimension ? {
      length: orderData.dimension.length,
      width: orderData.dimension.width,
      height: orderData.dimension.height
    } : {},
    
    // 발송자 정보
    sender: orderData.sender ? {
      name: orderData.sender.name,
      company: orderData.sender.company,
      email: orderData.sender.email,
      phoneNo: orderData.sender.phoneNo,
      state: orderData.sender.address?.state || orderData.sender.state, // 최상위 state 필드
      address: orderData.sender.address ? {
        address1: orderData.sender.address.address1,
        address2: orderData.sender.address.address2,
        city: orderData.sender.address.city,
        state: orderData.sender.address.state,
        stateCode: orderData.sender.address.stateCode,
        zipCode: orderData.sender.address.zipCode,
        countryCode: orderData.sender.address.countryCode
      } : {}
    } : {},
    
    // 수신자 정보
    recipient: orderData.recipient ? {
      name: orderData.recipient.name,
      company: orderData.recipient.company,
      email: orderData.recipient.email,
      phoneNo: orderData.recipient.phoneNo,
      taxId: orderData.recipient.taxId,
      state: orderData.recipient.address?.state || orderData.recipient.state, // 최상위 state 필드
      address: orderData.recipient.address ? {
        address1: orderData.recipient.address.address1,
        address2: orderData.recipient.address.address2,
        city: orderData.recipient.address.city,
        state: orderData.recipient.address.state,
        stateCode: orderData.recipient.address.stateCode,
        zipCode: orderData.recipient.address.zipCode,
        countryCode: orderData.recipient.address.countryCode
      } : {}
    } : {},
    
    // 아이템 정보 (기존 아이템 ID 보존)
    items: orderData.items ? orderData.items.map(item => ({
      id: item.id, // 기존 아이템 ID 보존 (수정용)
      originalId: item.id, // 원본 ID 추가 저장
      // 프론트엔드용 필드명
      name: item.itemName || item.name,
      quantity: item.itemQuantity || item.quantity,
      unitValue: item.itemUnitValue || item.unitValue,
      valueCurrency: item.itemValueCurrency || item.valueCurrency,
      weight: item.itemWeight || item.weight,
      weightUnit: item.weightUnit,
      itemHsCode: item.itemHSCode || item.itemHsCode,
      itemOriginCountryCode: item.itemOriginCountryCode,
      // 백엔드용 필드명도 유지
      itemName: item.itemName || item.name,
      itemQuantity: item.itemQuantity || item.quantity,
      itemUnitValue: item.itemUnitValue || item.unitValue,
      itemValueCurrency: item.itemValueCurrency || item.valueCurrency,
      itemWeight: item.itemWeight || item.weight,
      itemHSCode: item.itemHSCode || item.itemHsCode,
      isNew: false // 기존 아이템 표시
    })) : []
  }
}

const startEditOrder = () => {
  console.log('Starting edit mode for order:', selectedOrder.value)
  
  // 편집 모드 먼저 활성화
  isEditingOrder.value = true
  
  // 그 다음 데이터 설정
  setEditFormData(selectedOrder.value)
  console.log('Edit form data after setting:', editFormData.value)
}

const cancelEditOrder = () => {
  isEditingOrder.value = false
  // 취소 시 원본 데이터로 복원
  setEditFormData(selectedOrder.value)
}

const addNewEditItem = () => {
  if (!editFormData.value.items) {
    editFormData.value.items = []
  }
  
  // 새 아이템 추가 (임시 ID 생성)
  const tempId = `new_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  
  editFormData.value.items.push({
    id: tempId, // 임시 ID (화면 표시용)
    originalId: null, // 원본 ID 없음 (신규)
    itemName: '',
    itemQuantity: 1,
    itemUnitValue: 0,
    itemValueCurrency: 'KRW',
    itemWeight: 0,
    weightUnit: 'KG',
    itemHSCode: '',
    itemOriginCountryCode: 'KR',
    isNew: true // 신규 아이템 표시
  })
}

const removeItem = (index) => {
  if (editFormData.value.items && editFormData.value.items.length > index) {
    editFormData.value.items.splice(index, 1)
  }
}

const saveOrderChanges = async () => {
  try {
    // EditOrderForm에서 현재 데이터 가져오기
    const currentFormData = editOrderForm.value ? editOrderForm.value.localFormData : editFormData.value
    
    console.log('Saving order with current form data:', currentFormData)
    console.log('editOrderForm.value:', editOrderForm.value)
    console.log('Sender state:', currentFormData.sender?.state)
    console.log('Sender address state:', currentFormData.sender?.address?.state)
    console.log('Recipient state:', currentFormData.recipient?.state)
    console.log('Recipient address state:', currentFormData.recipient?.address?.state)
    
    // 백엔드 API 형식에 맞게 데이터 변환 (원본 데이터의 필수 필드들 보존)
    const apiData = {
      storePlatform: currentFormData.storePlatform,
      orderNo: currentFormData.orderNo,
      storeName: currentFormData.storeName,
      shippingTerm: currentFormData.shippingTerm,
      
      // 원본 데이터에서 필수 필드들 보존
      itemContentsType: selectedOrder.value.itemContentsType || 'DOCUMENT',
      serviceType: selectedOrder.value.serviceType || 'STANDARD', 
      packageType: selectedOrder.value.packageType || 'BOX',
      sellerId: selectedOrder.value.sellerId,
      
      // 발송자 정보 (플랫 구조로 변환)
      senderName: currentFormData.sender?.name,
      senderCompany: currentFormData.sender?.company,
      senderEmail: currentFormData.sender?.email,
      senderPhoneNo: currentFormData.sender?.phoneNo,
      senderCountryCode: currentFormData.sender?.address?.countryCode,
      senderState: currentFormData.sender?.address?.state || currentFormData.sender?.state,
      senderStateCode: currentFormData.sender?.address?.stateCode,
      senderCity: currentFormData.sender?.address?.city,
      senderAddress1: currentFormData.sender?.address?.address1,
      senderAddress2: currentFormData.sender?.address?.address2,
      senderZipCode: currentFormData.sender?.address?.zipCode,
      
      // 수신자 정보 (플랫 구조로 변환)
      recipientName: currentFormData.recipient?.name,
      recipientCompany: currentFormData.recipient?.company,
      recipientEmail: currentFormData.recipient?.email,
      recipientPhoneNo: currentFormData.recipient?.phoneNo,
      recipientTaxId: currentFormData.recipient?.taxId,
      recipientCountryCode: currentFormData.recipient?.address?.countryCode,
      recipientState: currentFormData.recipient?.address?.state || currentFormData.recipient?.state,
      recipientStateCode: currentFormData.recipient?.address?.stateCode,
      recipientCity: currentFormData.recipient?.address?.city,
      recipientAddress1: currentFormData.recipient?.address?.address1,
      recipientAddress2: currentFormData.recipient?.address?.address2,
      recipientZipCode: currentFormData.recipient?.address?.zipCode,
      
      // 패키지 정보
      parcelCount: currentFormData.parcelCount,
      shipmentActualWeight: currentFormData.shipmentActualWeight,
      shipmentVolumeWeight: currentFormData.shipmentVolumeWeight,
      weightUnit: currentFormData.weightUnit,
      dimensionLength: currentFormData.dimension?.length,
      dimensionWidth: currentFormData.dimension?.width,
      dimensionHeight: currentFormData.dimension?.height,
      
      // 아이템 목록 (API 형식에 맞게 변환)
      orderItems: currentFormData.items?.map(item => {
        const orderItem = {
          itemName: item.itemName || item.name,
          itemQuantity: item.itemQuantity || item.quantity,
          itemUnitValue: item.itemUnitValue || item.unitValue,
          itemValueCurrency: item.itemValueCurrency || item.valueCurrency,
          itemWeight: item.itemWeight || item.weight,
          weightUnit: item.weightUnit,
          itemHSCode: item.itemHSCode || item.itemHsCode,
          itemOriginCountryCode: item.itemOriginCountryCode
        }
        
        // 기존 아이템인 경우에만 ID 포함 (신규 아이템은 ID 제외)
        if (!item.isNew && item.originalId) {
          orderItem.id = item.originalId
        }
        
        return orderItem
      }) || []
    }
    
    console.log('전송할 데이터 (변환됨):', apiData)
    console.log('주문 ID:', selectedOrder.value.id)
    
    const response = await orderApi.updateOrder(selectedOrder.value.id, apiData)
    console.log('수정 응답:', response)
    
    if (response.data) {
      ElMessage.success('주문 정보가 수정되었습니다.')
      // 상세 정보 다시 조회하여 업데이트
      const detailResponse = await orderApi.getOrder(selectedOrder.value.id)
      if (detailResponse.data && detailResponse.data.data) {
        selectedOrder.value = detailResponse.data.data
        setEditFormData(selectedOrder.value) // 수정된 데이터로 폼 다시 설정
      }
      isEditingOrder.value = false
      fetchOrders() // 목록 새로고침
    }
  } catch (error) {
    console.error('주문 수정 실패:', error)
    console.error('에러 상세:', error.response?.data)
    console.error('에러 상태:', error.response?.status)
    
    if (error.response?.status === 404) {
      ElMessage.error('주문을 찾을 수 없습니다.')
    } else if (error.response?.status === 400) {
      ElMessage.error(`잘못된 요청: ${error.response?.data?.message || '데이터를 확인해주세요.'}`)
    } else if (error.response?.status === 500) {
      ElMessage.error('서버 오류가 발생했습니다.')
    } else {
      ElMessage.error('주문 수정에 실패했습니다.')
    }
  }
}

// Utility methods
const formatDate = (dateString) => {
  if (!dateString) return '-'
  const date = new Date(dateString)
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

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
    'CENTER_ARRIVED': '파트너 센터 도착',
    // 픽업 지연
    'PICKUP_DELAY': '픽업 지연',
    // 운송 준비
    'READY_SHIP': '배송 준비 완료',
    // 운송 시작
    'SHIPPED': '배송 시작',
    // 목적 국가 도착
    'DEST_COUNTRY_ARRIVED': '목적 국가 도착',
    // 통관 지연
    'CLEARANCE_DELAY': '통관 지연',
    // 통관 중
    'IN_CLEARANCE': '통관 진행중',
    // 통관 완료
    'CLEARED': '통관 완료',
    // 최종 목적지 이동 중
    'FINAL_DEST_TRANSIT': '최종 목적지로 이동중',
    // 최종 목적지 도착
    'FINAL_DEST_ARRIVED': '최종 목적지 도착',
    // 운송 중
    'IN_TRANSIT': '운송중',
    // 허브 도착
    'HUB_ARRIVED': '허브 도착',
    // 배송 지연
    'DELIVERY_DELAY': '배송 지연',
    // 배송 예외 사항
    'DELIVERY_EXCEPTION': '배송 예외상황',
    // 배송 중
    'IN_DELIVERY': '배송중',
    // 배송 완료
    'DELIVERED': '배송완료',
    // 반송
    'RETURN': '반송'
  }
  return eventMap[eventType] || eventType
}

// Tracking Event의 태그 타입 (Element UI의 태그 색상)
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
    'FINAL_DEST_TRANSIT': 'warning',
    'FINAL_DEST_ARRIVED': 'warning',
    
    // 통관 단계
    'IN_CLEARANCE': '',
    'CLEARED': '',
    
    // 배송 단계
    'IN_DELIVERY': 'primary',
    
    // 완료
    'DELIVERED': 'success',
    
    // 지연/예외/취소
    'AWB_CANCEL': 'danger',
    'PICKUP_DELAY': 'danger',
    'CLEARANCE_DELAY': 'danger',
    'DELIVERY_DELAY': 'danger',
    'DELIVERY_EXCEPTION': 'danger',
    'RETURN': 'danger'
  }
  return tagTypeMap[eventType] || 'info'
}

const getTrackingEventColor = (eventType) => {
  const colorMap = {
    // 초기 단계 (회색)
    'ORDER_PLACED': '#909399',
    'LABEL_CREATED': '#909399',
    
    // 준비/픽업 단계 (파란색)
    'AWB_CREATED': '#409EFF',
    'CENTER_ARRIVED': '#409EFF',
    'READY_SHIP': '#409EFF',
    
    // 운송 단계 (주황색)
    'SHIPPED': '#E6A23C',
    'IN_TRANSIT': '#E6A23C',
    'HUB_ARRIVED': '#E6A23C',
    'DEST_COUNTRY_ARRIVED': '#E6A23C',
    'FINAL_DEST_TRANSIT': '#E6A23C',
    'FINAL_DEST_ARRIVED': '#E6A23C',
    
    // 통관 단계 (보라색)
    'IN_CLEARANCE': '#B19CD9',
    'CLEARED': '#9370DB',
    
    // 배송 단계 (파란색)
    'IN_DELIVERY': '#409EFF',
    
    // 완료 (초록색)
    'DELIVERED': '#67C23A',
    
    // 지연/예외/취소 (빨간색)
    'AWB_CANCEL': '#F56C6C',
    'PICKUP_DELAY': '#F56C6C',
    'CLEARANCE_DELAY': '#F56C6C',
    'DELIVERY_DELAY': '#F56C6C',
    'DELIVERY_EXCEPTION': '#F56C6C',
    'RETURN': '#F56C6C'
  }
  return colorMap[eventType] || '#909399'
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


const getStatusType = (status) => {
  const typeMap = {
    'PENDING': 'warning',
    'PROCESSING': 'primary',
    'SHIPPED': 'info',
    'DELIVERED': 'success',
    'CANCELLED': 'danger'
  }
  return typeMap[status] || 'info'
}

// 최신 추적 상태에 따른 태그 타입
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

// 주요 국가 목록 (자주 사용되는 국가들)
const getPopularCountries = () => {
  return [
    { code: 'KR', name: 'South Korea' },
    { code: 'US', name: 'United States' },
    { code: 'CN', name: 'China' },
    { code: 'JP', name: 'Japan' },
    { code: 'CA', name: 'Canada' },
    { code: 'GB', name: 'United Kingdom' },
    { code: 'DE', name: 'Germany' },
    { code: 'FR', name: 'France' },
    { code: 'AU', name: 'Australia' },
    { code: 'IN', name: 'India' },
    { code: 'SG', name: 'Singapore' },
    { code: 'HK', name: 'Hong Kong' },
    { code: 'TW', name: 'Taiwan' },
    { code: 'TH', name: 'Thailand' },
    { code: 'VN', name: 'Vietnam' },
    { code: 'MX', name: 'Mexico' },
    { code: 'BR', name: 'Brazil' },
    { code: 'AE', name: 'United Arab Emirates' }
  ]
}

// 기타 국가 목록 (주요 국가 제외한 나머지)
const getOtherCountries = () => {
  const popularCodes = getPopularCountries().map(c => c.code)
  return [
    { code: 'AD', name: 'Andorra' },
    { code: 'AF', name: 'Afghanistan' },
    { code: 'AG', name: 'Antigua and Barbuda' },
    { code: 'AI', name: 'Anguilla' },
    { code: 'AL', name: 'Albania' },
    { code: 'AM', name: 'Armenia' },
    { code: 'AO', name: 'Angola' },
    { code: 'AQ', name: 'Antarctica' },
    { code: 'AR', name: 'Argentina' },
    { code: 'AS', name: 'American Samoa' },
    { code: 'AT', name: 'Austria' },
    { code: 'AW', name: 'Aruba' },
    { code: 'AX', name: 'Åland Islands' },
    { code: 'AZ', name: 'Azerbaijan' },
    { code: 'BA', name: 'Bosnia and Herzegovina' },
    { code: 'BB', name: 'Barbados' },
    { code: 'BD', name: 'Bangladesh' },
    { code: 'BE', name: 'Belgium' },
    { code: 'BF', name: 'Burkina Faso' },
    { code: 'BG', name: 'Bulgaria' },
    { code: 'BH', name: 'Bahrain' },
    { code: 'BI', name: 'Burundi' },
    { code: 'BJ', name: 'Benin' },
    { code: 'BL', name: 'Saint Barthélemy' },
    { code: 'BM', name: 'Bermuda' },
    { code: 'BN', name: 'Brunei' },
    { code: 'BO', name: 'Bolivia' },
    { code: 'BQ', name: 'Caribbean Netherlands' },
    { code: 'BS', name: 'Bahamas' },
    { code: 'BT', name: 'Bhutan' },
    { code: 'BV', name: 'Bouvet Island' },
    { code: 'BW', name: 'Botswana' },
    { code: 'BY', name: 'Belarus' },
    { code: 'BZ', name: 'Belize' },
    { code: 'CC', name: 'Cocos Islands' },
    { code: 'CD', name: 'DR Congo' },
    { code: 'CF', name: 'Central African Republic' },
    { code: 'CG', name: 'Republic of the Congo' },
    { code: 'CH', name: 'Switzerland' },
    { code: 'CI', name: 'Côte d\'Ivoire' },
    { code: 'CK', name: 'Cook Islands' },
    { code: 'CL', name: 'Chile' },
    { code: 'CM', name: 'Cameroon' },
    { code: 'CO', name: 'Colombia' },
    { code: 'CR', name: 'Costa Rica' },
    { code: 'CU', name: 'Cuba' },
    { code: 'CV', name: 'Cape Verde' },
    { code: 'CW', name: 'Curaçao' },
    { code: 'CX', name: 'Christmas Island' },
    { code: 'CY', name: 'Cyprus' },
    { code: 'CZ', name: 'Czech Republic' },
    { code: 'DJ', name: 'Djibouti' },
    { code: 'DK', name: 'Denmark' },
    { code: 'DM', name: 'Dominica' },
    { code: 'DO', name: 'Dominican Republic' },
    { code: 'DZ', name: 'Algeria' },
    { code: 'EC', name: 'Ecuador' },
    { code: 'EE', name: 'Estonia' },
    { code: 'EG', name: 'Egypt' },
    { code: 'EH', name: 'Western Sahara' },
    { code: 'ER', name: 'Eritrea' },
    { code: 'ES', name: 'Spain' },
    { code: 'ET', name: 'Ethiopia' },
    { code: 'FI', name: 'Finland' },
    { code: 'FJ', name: 'Fiji' },
    { code: 'FK', name: 'Falkland Islands' },
    { code: 'FM', name: 'Micronesia' },
    { code: 'FO', name: 'Faroe Islands' },
    { code: 'GA', name: 'Gabon' },
    { code: 'GD', name: 'Grenada' },
    { code: 'GE', name: 'Georgia' },
    { code: 'GF', name: 'French Guiana' },
    { code: 'GG', name: 'Guernsey' },
    { code: 'GH', name: 'Ghana' },
    { code: 'GI', name: 'Gibraltar' },
    { code: 'GL', name: 'Greenland' },
    { code: 'GM', name: 'Gambia' },
    { code: 'GN', name: 'Guinea' },
    { code: 'GP', name: 'Guadeloupe' },
    { code: 'GQ', name: 'Equatorial Guinea' },
    { code: 'GR', name: 'Greece' },
    { code: 'GS', name: 'South Georgia' },
    { code: 'GT', name: 'Guatemala' },
    { code: 'GU', name: 'Guam' },
    { code: 'GW', name: 'Guinea-Bissau' },
    { code: 'GY', name: 'Guyana' },
    { code: 'HM', name: 'Heard Island and McDonald Islands' },
    { code: 'HN', name: 'Honduras' },
    { code: 'HR', name: 'Croatia' },
    { code: 'HT', name: 'Haiti' },
    { code: 'HU', name: 'Hungary' },
    { code: 'ID', name: 'Indonesia' },
    { code: 'IE', name: 'Ireland' },
    { code: 'IL', name: 'Israel' },
    { code: 'IM', name: 'Isle of Man' },
    { code: 'IO', name: 'British Indian Ocean Territory' },
    { code: 'IQ', name: 'Iraq' },
    { code: 'IR', name: 'Iran' },
    { code: 'IS', name: 'Iceland' },
    { code: 'IT', name: 'Italy' },
    { code: 'JE', name: 'Jersey' },
    { code: 'JM', name: 'Jamaica' },
    { code: 'JO', name: 'Jordan' },
    { code: 'KE', name: 'Kenya' },
    { code: 'KG', name: 'Kyrgyzstan' },
    { code: 'KH', name: 'Cambodia' },
    { code: 'KI', name: 'Kiribati' },
    { code: 'KM', name: 'Comoros' },
    { code: 'KN', name: 'Saint Kitts and Nevis' },
    { code: 'KP', name: 'North Korea' },
    { code: 'KW', name: 'Kuwait' },
    { code: 'KY', name: 'Cayman Islands' },
    { code: 'KZ', name: 'Kazakhstan' },
    { code: 'LA', name: 'Laos' },
    { code: 'LB', name: 'Lebanon' },
    { code: 'LC', name: 'Saint Lucia' },
    { code: 'LI', name: 'Liechtenstein' },
    { code: 'LK', name: 'Sri Lanka' },
    { code: 'LR', name: 'Liberia' },
    { code: 'LS', name: 'Lesotho' },
    { code: 'LT', name: 'Lithuania' },
    { code: 'LU', name: 'Luxembourg' },
    { code: 'LV', name: 'Latvia' },
    { code: 'LY', name: 'Libya' },
    { code: 'MA', name: 'Morocco' },
    { code: 'MC', name: 'Monaco' },
    { code: 'MD', name: 'Moldova' },
    { code: 'ME', name: 'Montenegro' },
    { code: 'MF', name: 'Saint Martin' },
    { code: 'MG', name: 'Madagascar' },
    { code: 'MH', name: 'Marshall Islands' },
    { code: 'MK', name: 'North Macedonia' },
    { code: 'ML', name: 'Mali' },
    { code: 'MM', name: 'Myanmar' },
    { code: 'MN', name: 'Mongolia' },
    { code: 'MO', name: 'Macau' },
    { code: 'MP', name: 'Northern Mariana Islands' },
    { code: 'MQ', name: 'Martinique' },
    { code: 'MR', name: 'Mauritania' },
    { code: 'MS', name: 'Montserrat' },
    { code: 'MT', name: 'Malta' },
    { code: 'MU', name: 'Mauritius' },
    { code: 'MV', name: 'Maldives' },
    { code: 'MW', name: 'Malawi' },
    { code: 'MY', name: 'Malaysia' },
    { code: 'MZ', name: 'Mozambique' },
    { code: 'NA', name: 'Namibia' },
    { code: 'NC', name: 'New Caledonia' },
    { code: 'NE', name: 'Niger' },
    { code: 'NF', name: 'Norfolk Island' },
    { code: 'NG', name: 'Nigeria' },
    { code: 'NI', name: 'Nicaragua' },
    { code: 'NL', name: 'Netherlands' },
    { code: 'NO', name: 'Norway' },
    { code: 'NP', name: 'Nepal' },
    { code: 'NR', name: 'Nauru' },
    { code: 'NU', name: 'Niue' },
    { code: 'NZ', name: 'New Zealand' },
    { code: 'OM', name: 'Oman' },
    { code: 'PA', name: 'Panama' },
    { code: 'PE', name: 'Peru' },
    { code: 'PF', name: 'French Polynesia' },
    { code: 'PG', name: 'Papua New Guinea' },
    { code: 'PH', name: 'Philippines' },
    { code: 'PK', name: 'Pakistan' },
    { code: 'PL', name: 'Poland' },
    { code: 'PM', name: 'Saint Pierre and Miquelon' },
    { code: 'PN', name: 'Pitcairn Islands' },
    { code: 'PR', name: 'Puerto Rico' },
    { code: 'PS', name: 'Palestine' },
    { code: 'PT', name: 'Portugal' },
    { code: 'PW', name: 'Palau' },
    { code: 'PY', name: 'Paraguay' },
    { code: 'QA', name: 'Qatar' },
    { code: 'RE', name: 'Réunion' },
    { code: 'RO', name: 'Romania' },
    { code: 'RS', name: 'Serbia' },
    { code: 'RU', name: 'Russia' },
    { code: 'RW', name: 'Rwanda' },
    { code: 'SA', name: 'Saudi Arabia' },
    { code: 'SB', name: 'Solomon Islands' },
    { code: 'SC', name: 'Seychelles' },
    { code: 'SD', name: 'Sudan' },
    { code: 'SE', name: 'Sweden' },
    { code: 'SH', name: 'Saint Helena' },
    { code: 'SI', name: 'Slovenia' },
    { code: 'SJ', name: 'Svalbard and Jan Mayen' },
    { code: 'SK', name: 'Slovakia' },
    { code: 'SL', name: 'Sierra Leone' },
    { code: 'SM', name: 'San Marino' },
    { code: 'SN', name: 'Senegal' },
    { code: 'SO', name: 'Somalia' },
    { code: 'SR', name: 'Suriname' },
    { code: 'SS', name: 'South Sudan' },
    { code: 'ST', name: 'São Tomé and Príncipe' },
    { code: 'SV', name: 'El Salvador' },
    { code: 'SX', name: 'Sint Maarten' },
    { code: 'SY', name: 'Syria' },
    { code: 'SZ', name: 'Eswatini' },
    { code: 'TC', name: 'Turks and Caicos Islands' },
    { code: 'TD', name: 'Chad' },
    { code: 'TF', name: 'French Southern Territories' },
    { code: 'TG', name: 'Togo' },
    { code: 'TJ', name: 'Tajikistan' },
    { code: 'TK', name: 'Tokelau' },
    { code: 'TL', name: 'East Timor' },
    { code: 'TM', name: 'Turkmenistan' },
    { code: 'TN', name: 'Tunisia' },
    { code: 'TO', name: 'Tonga' },
    { code: 'TR', name: 'Turkey' },
    { code: 'TT', name: 'Trinidad and Tobago' },
    { code: 'TV', name: 'Tuvalu' },
    { code: 'TZ', name: 'Tanzania' },
    { code: 'UA', name: 'Ukraine' },
    { code: 'UG', name: 'Uganda' },
    { code: 'UM', name: 'United States Minor Outlying Islands' },
    { code: 'UY', name: 'Uruguay' },
    { code: 'UZ', name: 'Uzbekistan' },
    { code: 'VA', name: 'Vatican City' },
    { code: 'VC', name: 'Saint Vincent and the Grenadines' },
    { code: 'VE', name: 'Venezuela' },
    { code: 'VG', name: 'British Virgin Islands' },
    { code: 'VI', name: 'United States Virgin Islands' },
    { code: 'VU', name: 'Vanuatu' },
    { code: 'WF', name: 'Wallis and Futuna' },
    { code: 'WS', name: 'Samoa' },
    { code: 'YE', name: 'Yemen' },
    { code: 'YT', name: 'Mayotte' },
    { code: 'ZA', name: 'South Africa' },
    { code: 'ZM', name: 'Zambia' },
    { code: 'ZW', name: 'Zimbabwe' }
  ]
}

// 모든 국가 목록 (주요 국가가 맨 위에 오도록 정렬)
const getAllCountries = () => {
  const popularCountries = getPopularCountries()
  const otherCountries = getOtherCountries()
  
  return [
    ...popularCountries,
    { code: 'divider', name: '─────────── 기타 국가 ───────────', disabled: true },
    ...otherCountries
  ]
}

const getCountryNameByCode = (countryCode) => {
  if (!countryCode) return '-'
  const country = getAllCountries().find(c => c.code === countryCode)
  return country ? `${country.name} (${country.code})` : countryCode
}

const getOrderItemsText = (items) => {
  if (!items || !Array.isArray(items) || items.length === 0) return '-'
  if (items.length === 1) return items[0].itemName || items[0].name || '상품'
  return `${items[0].itemName || items[0].name || '상품'} 외 ${items.length - 1}개`
}

const getTrackingStep = (status) => {
  const stepMap = {
    'PENDING': 0,
    'PROCESSING': 1,
    'SHIPPED': 2,
    'DELIVERED': 3
  }
  return stepMap[status] || 0
}

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

const formatCurrency = (amount, currency = 'KRW') => {
  if (!amount) return '-'
  
  const locale = currency === 'KRW' ? 'ko-KR' : 'en-US'
  
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: currency
  }).format(amount)
}

const formatNumber = (num) => {
  if (!num && num !== 0) return '0'
  return new Intl.NumberFormat('ko-KR').format(num)
}


// Country/State selection functions
const isSenderCountrySupported = () => {
  const countryCode = editFormData.value.sender?.address?.countryCode
  return stateCodeData.value[countryCode] && stateCodeData.value[countryCode].length > 0
}

const isRecipientCountrySupported = () => {
  const countryCode = editFormData.value.recipient?.address?.countryCode
  return stateCodeData.value[countryCode] && stateCodeData.value[countryCode].length > 0
}

const getSenderStateOptions = () => {
  const countryCode = editFormData.value.sender?.address?.countryCode
  return stateCodeData.value[countryCode] || []
}

const getRecipientStateOptions = () => {
  const countryCode = editFormData.value.recipient?.address?.countryCode
  return stateCodeData.value[countryCode] || []
}

const onSenderCountryChange = () => {
  // 국가 변경 시 주/도 코드와 이름 초기화
  if (editFormData.value.sender?.address) {
    editFormData.value.sender.address.stateCode = ''
    editFormData.value.sender.address.state = ''
    
    // 지원되지 않는 국가인 경우 stateCode를 null로 설정
    if (!isSenderCountrySupported()) {
      editFormData.value.sender.address.stateCode = null
    }
  }
}

const onSenderStateChange = () => {
  // 주/도 코드 변경 시 해당하는 이름 설정
  const stateCode = editFormData.value.sender?.address?.stateCode
  const countryCode = editFormData.value.sender?.address?.countryCode
  
  if (stateCode && countryCode) {
    const states = stateCodeData.value[countryCode] || []
    const selectedState = states.find(state => state.code === stateCode)
    if (selectedState && editFormData.value.sender?.address) {
      editFormData.value.sender.address.state = selectedState.name
    }
  }
}

const onRecipientCountryChange = () => {
  // 국가 변경 시 주/도 코드와 이름 초기화
  if (editFormData.value.recipient?.address) {
    editFormData.value.recipient.address.stateCode = ''
    editFormData.value.recipient.address.state = ''
    
    // 지원되지 않는 국가인 경우 stateCode를 null로 설정
    if (!isRecipientCountrySupported()) {
      editFormData.value.recipient.address.stateCode = null
    }
  }
}

const onRecipientStateChange = () => {
  // 주/도 코드 변경 시 해당하는 이름 설정
  const stateCode = editFormData.value.recipient?.address?.stateCode
  const countryCode = editFormData.value.recipient?.address?.countryCode
  
  if (stateCode && countryCode) {
    const states = stateCodeData.value[countryCode] || []
    const selectedState = states.find(state => state.code === stateCode)
    if (selectedState && editFormData.value.recipient?.address) {
      editFormData.value.recipient.address.state = selectedState.name
    }
  }
}

// Lifecycle
onMounted(() => {
  fetchOrders()
})
</script>

<style scoped>
.order-list {
  padding: 20px;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  padding-bottom: 20px;
  border-bottom: 1px solid #e4e7ed;
}

.page-header h1 {
  margin: 0;
  font-size: 24px;
  font-weight: 600;
  color: #303133;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 16px;
}

.selected-count {
  color: #409eff;
  font-weight: 500;
}

.filter-card {
  margin-bottom: 20px;
}

.filter-form {
  margin: 0;
}

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

.order-table tr:hover {
  background: #f5f7fa;
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

.card-header {
  display: flex;
  align-items: center;
  gap: 8px;
}

/* Shipping Methods */
.shipping-methods {
  display: grid;
  gap: 15px;
}

.shipping-option {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px;
  background: #f8f9fa;
  border-radius: 8px;
  border: 2px solid transparent;
  cursor: pointer;
  transition: all 0.3s ease;
}

.shipping-option:hover {
  border-color: #409eff;
  background: #ecf5ff;
}

.shipping-option.selected {
  border-color: #409eff;
  background: #ecf5ff;
}

.shipping-info {
  display: flex;
  align-items: center;
  gap: 15px;
}

.shipping-logo {
  padding: 8px 16px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: bold;
  background: #4B0082;
  color: white;
  font-size: 14px;
  min-width: 80px;
}

.ups-logo { background: #8B4513; }
.fedex-logo { background: #4B0082; }
.dhl-logo { background: #FFD700; color: #000; }

.shipping-details h4 {
  color: #303133;
  font-size: 16px;
  font-weight: 600;
  margin-bottom: 5px;
}

.shipping-meta {
  color: #909399;
  font-size: 14px;
}

.shipping-price {
  text-align: right;
}

.price-amount {
  font-size: 20px;
  font-weight: 700;
  color: #303133;
}

.price-breakdown {
  margin-top: 5px;
  color: #909399;
  font-size: 12px;
  line-height: 1.4;
}

.dialog-footer-wrapper {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
}

.total-price-info {
  display: flex;
  align-items: center;
  gap: 12px;
}

.total-label {
  font-size: 14px;
  color: #606266;
}

.total-amount {
  font-size: 24px;
  font-weight: 700;
  color: #409eff;
}

.order-row {
  cursor: pointer;
  transition: background-color 0.2s;
}

.order-row:hover {
  background-color: #f5f7fa !important;
}

.order-detail .card-header {
  display: flex;
  align-items: center;
  gap: 8px;
}

.detail-info {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.info-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 0;
  border-bottom: 1px solid #f0f0f0;
}

.info-row:last-child {
  border-bottom: none;
}

.info-row .label {
  font-weight: 600;
  color: #606266;
  min-width: 80px;
}

.info-row .value {
  color: #303133;
  text-align: right;
  white-space: pre-line;
}

.items-container {
  max-height: 400px;
  overflow-y: auto;
}

.order-detail .el-card {
  margin-bottom: 0;
}

.item-card {
  margin-bottom: 16px;
}

.item-card:last-child {
  margin-bottom: 0;
}

.item-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.item-number {
  font-weight: 600;
  color: #303133;
}

.item-info {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.item-info .info-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 4px 0;
  border-bottom: 1px solid #f0f0f0;
}

.item-info .info-row:last-child {
  border-bottom: none;
}

.item-info .label {
  font-weight: 600;
  color: #606266;
  min-width: 70px;
}

.item-info .value {
  color: #303133;
  text-align: right;
}

.state-select {
  flex: 1;
  text-align: right;
}

.state-input {
  flex: 1;
  text-align: right;
}

@media (max-width: 768px) {
  .page-header {
    flex-direction: column;
    gap: 15px;
    align-items: stretch;
  }

  .header-actions {
    justify-content: space-between;
  }

  .order-table {
    font-size: 12px;
  }

  .order-table th,
  .order-table td {
    padding: 8px 6px;
  }

  .action-icons {
    flex-direction: column;
    gap: 4px;
  }
}
</style>