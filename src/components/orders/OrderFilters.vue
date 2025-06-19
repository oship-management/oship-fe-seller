<template>
  <!-- Filters -->
  <el-card class="filter-card">
    <el-form :model="localFilters" :inline="true" class="filter-form">
      <el-form-item label="주문 상태">
        <el-select 
          v-model="localFilters.status" 
          placeholder="상태 선택" 
          clearable 
          style="width: 150px"
          @change="updateFilters"
        >
          <el-option label="대기중" value="PENDING" />
          <el-option label="처리중" value="PROCESSING" />
          <el-option label="배송중" value="SHIPPED" />
          <el-option label="배송완료" value="DELIVERED" />
          <el-option label="취소됨" value="CANCELLED" />
        </el-select>
      </el-form-item>
      
      <el-form-item label="기간">
        <el-date-picker
          v-model="localDateRange"
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
        <el-button type="primary" @click="handleSearch" :loading="loading">
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
</template>

<script setup>
import { ref, watch } from 'vue'
import { Search, Refresh } from '@element-plus/icons-vue'

const props = defineProps({
  filters: {
    type: Object,
    required: true,
    default: () => ({
      status: '',
      startDate: '',
      endDate: ''
    })
  },
  dateRange: {
    type: Array,
    default: () => []
  },
  loading: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits([
  'update:filters',
  'update:dateRange', 
  'search',
  'reset'
])

// Local reactive copies for v-model
const localFilters = ref({ ...props.filters })
const localDateRange = ref([...props.dateRange])

// Watch for prop changes
watch(() => props.filters, (newFilters) => {
  localFilters.value = { ...newFilters }
}, { deep: true })

watch(() => props.dateRange, (newDateRange) => {
  localDateRange.value = [...newDateRange]
})

// Methods
const updateFilters = () => {
  emit('update:filters', { ...localFilters.value })
}

const handleDateChange = (dates) => {
  localDateRange.value = dates || []
  emit('update:dateRange', localDateRange.value)
  
  if (dates && dates.length === 2) {
    localFilters.value.startDate = dates[0]
    localFilters.value.endDate = dates[1]
  } else {
    localFilters.value.startDate = ''
    localFilters.value.endDate = ''
  }
  updateFilters()
}

const handleSearch = () => {
  emit('search')
}

const handleReset = () => {
  localFilters.value = {
    status: '',
    startDate: '',
    endDate: ''
  }
  localDateRange.value = []
  emit('reset')
}
</script>

<style scoped>
.filter-card {
  margin-bottom: 20px;
}

.filter-form {
  margin: 0;
}
</style>