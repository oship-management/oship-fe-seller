<template>
  <div class="order-detail">
    <!-- 기본 정보 섹션 -->
    <el-row :gutter="20" style="margin-bottom: 20px;">
      <!-- 스토어 정보 -->
      <el-col :span="8">
        <el-card>
          <template #header>
            <div class="card-header">
              <el-icon><Shop /></el-icon>
              <span>스토어 정보</span>
            </div>
          </template>
          <div class="detail-info">
            <div class="info-row">
              <span class="label">플랫폼:</span>
              <el-input 
                v-if="isEditable"
                v-model="localFormData.storePlatform" 
                size="small" 
                placeholder="플랫폼 입력"
              />
              <span v-else>{{ localFormData.storePlatform || '-' }}</span>
            </div>
            <div class="info-row">
              <span class="label">스토어명:</span>
              <el-input 
                v-if="isEditable"
                v-model="localFormData.storeName" 
                size="small" 
                placeholder="스토어명 입력"
              />
              <span v-else>{{ localFormData.storeName || '-' }}</span>
            </div>
            <div class="info-row">
              <span class="label">배송조건:</span>
              <el-input 
                v-if="isEditable"
                v-model="localFormData.shippingTerm" 
                size="small" 
                placeholder="배송조건 입력" 
              />
              <span v-else>{{ localFormData.shippingTerm || '-' }}</span>
            </div>
          </div>
        </el-card>
      </el-col>

      <!-- 주문 기본정보 -->
      <el-col :span="8">
        <el-card>
          <template #header>
            <div class="card-header">
              <el-icon><Document /></el-icon>
              <span>주문 기본정보</span>
            </div>
          </template>
          <div class="detail-info">
            <div class="info-row">
              <span class="label">주문번호:</span>
              <el-input 
                v-if="isEditable"
                v-model="localFormData.orderNo" 
                size="small" 
                placeholder="주문번호 입력" 
              />
              <span v-else>{{ localFormData.orderNo || '-' }}</span>
            </div>
            <div class="info-row">
              <span class="label">주문상태:</span>
              <el-tag 
                v-if="mode === 'edit' || mode === 'view'"
                :type="getStatusType(localFormData.orderStatus)"
                size="small"
              >
                {{ getStatusText(localFormData.orderStatus) }}
              </el-tag>
              <span v-else>신규 주문</span>
            </div>
            <div class="info-row" v-if="mode === 'edit' || mode === 'view'">
              <span class="label">최근 이벤트:</span>
              <span v-if="localFormData.lastTrackingEvent">
                {{ getTrackingEventText(localFormData.lastTrackingEvent) }}
              </span>
              <span v-else>-</span>
            </div>
          </div>
        </el-card>
      </el-col>

      <!-- 패키지 정보 -->
      <el-col :span="8">
        <el-card>
          <template #header>
            <div class="card-header">
              <el-icon><Box /></el-icon>
              <span>패키지 정보</span>
            </div>
          </template>
          <div class="detail-info">
            <div class="info-row">
              <span class="label">패키지 수:</span>
              <el-input-number 
                v-if="isEditable"
                v-model="localFormData.parcelCount" 
                :min="1" 
                size="small" 
                style="width: 100px;" 
              />
              <span v-else>{{ localFormData.parcelCount }}개</span>
            </div>
            <div class="info-row">
              <span class="label">실제무게:</span>
              <div v-if="isEditable" style="display: flex; gap: 8px; align-items: center;">
                <el-input-number 
                  v-model="localFormData.shipmentActualWeight" 
                  :precision="2" 
                  :step="0.1" 
                  :min="0" 
                  size="small" 
                  style="width: 120px;" 
                />
                <el-select v-model="localFormData.weightUnit" size="small" style="width: 60px;">
                  <el-option label="KG" value="KG" />
                  <el-option label="LB" value="LB" />
                </el-select>
              </div>
              <span v-else>{{ localFormData.shipmentActualWeight }}{{ localFormData.weightUnit }}</span>
            </div>
            <div class="info-row">
              <span class="label">용적무게:</span>
              <div v-if="isEditable" style="display: flex; gap: 8px; align-items: center;">
                <el-input-number 
                  v-model="localFormData.shipmentVolumeWeight" 
                  :precision="2" 
                  :step="0.1" 
                  :min="0" 
                  size="small" 
                  style="width: 120px;" 
                />
                <span>{{ localFormData.weightUnit }}</span>
              </div>
              <span v-else>{{ localFormData.shipmentVolumeWeight }}{{ localFormData.weightUnit }}</span>
            </div>
            <div class="info-row">
              <span class="label">크기(cm):</span>
              <div v-if="isEditable" style="display: flex; flex-direction: column; gap: 8px;">
                <div style="display: flex; align-items: center; gap: 8px;">
                  <span style="width: 40px; font-size: 12px;">길이:</span>
                  <el-input-number 
                    v-model="localFormData.dimension.length" 
                    :precision="1" 
                    :step="0.1" 
                    :min="0" 
                    size="small" 
                    style="width: 100px;"
                    @change="handleDimensionChange"
                  />
                </div>
                <div style="display: flex; align-items: center; gap: 8px;">
                  <span style="width: 40px; font-size: 12px;">너비:</span>
                  <el-input-number 
                    v-model="localFormData.dimension.width" 
                    :precision="1" 
                    :step="0.1" 
                    :min="0" 
                    size="small" 
                    style="width: 100px;"
                    @change="handleDimensionChange"
                  />
                </div>
                <div style="display: flex; align-items: center; gap: 8px;">
                  <span style="width: 40px; font-size: 12px;">높이:</span>
                  <el-input-number 
                    v-model="localFormData.dimension.height" 
                    :precision="1" 
                    :step="0.1" 
                    :min="0" 
                    size="small" 
                    style="width: 100px;"
                    @change="handleDimensionChange"
                  />
                </div>
              </div>
              <span v-else>
                길이: {{ localFormData.dimension.length }}cm<br>
                너비: {{ localFormData.dimension.width }}cm<br>
                높이: {{ localFormData.dimension.height }}cm
              </span>
            </div>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <!-- 발송자/수취자 정보 섹션 -->
    <el-row :gutter="20" style="margin-bottom: 20px;">
      <!-- 발송자 정보 -->
      <el-col :span="12">
        <el-card>
          <template #header>
            <div class="card-header">
              <el-icon><UserFilled /></el-icon>
              <span>발송자 정보</span>
            </div>
          </template>
          <div class="detail-info">
            <div class="info-row">
              <span class="label">이름:</span>
              <el-input 
                v-if="isEditable"
                v-model="localFormData.sender.name" 
                size="small" 
                placeholder="발송자 이름" 
              />
              <span v-else>{{ localFormData.sender.name || '-' }}</span>
            </div>
            <div class="info-row">
              <span class="label">회사:</span>
              <el-input 
                v-if="isEditable"
                v-model="localFormData.sender.company" 
                size="small" 
                placeholder="회사명" 
              />
              <span v-else>{{ localFormData.sender.company || '-' }}</span>
            </div>
            <div class="info-row">
              <span class="label">이메일:</span>
              <el-input 
                v-if="isEditable"
                v-model="localFormData.sender.email" 
                size="small" 
                placeholder="이메일" 
              />
              <span v-else>{{ localFormData.sender.email || '-' }}</span>
            </div>
            <div class="info-row">
              <span class="label">전화번호:</span>
              <el-input 
                v-if="isEditable"
                v-model="localFormData.sender.phoneNo" 
                size="small" 
                placeholder="전화번호" 
              />
              <span v-else>{{ localFormData.sender.phoneNo || '-' }}</span>
            </div>
            <div class="info-row">
              <span class="label">국가:</span>
              <el-select 
                v-if="isEditable"
                v-model="localFormData.sender.address.countryCode" 
                size="small" 
                placeholder="국가 선택"
                @change="handleSenderCountryChange"
                style="width: 100%;"
              >
                <el-option 
                  v-for="country in countries" 
                  :key="country.code" 
                  :label="country.name" 
                  :value="country.code" 
                />
              </el-select>
              <span v-else>{{ getCountryName(localFormData.sender.address.countryCode) }}</span>
            </div>
            <div class="info-row">
              <span class="label">주/도:</span>
              <el-select 
                v-if="isEditable && isSenderCountrySupported"
                v-model="localFormData.sender.address.stateCode" 
                size="small" 
                placeholder="주/도 선택"
                @change="handleSenderStateChange"
                style="width: 100%;"
              >
                <el-option 
                  v-for="state in senderStates" 
                  :key="state.code" 
                  :label="state.name" 
                  :value="state.code" 
                />
              </el-select>
              <el-input 
                v-else-if="isEditable && !isSenderCountrySupported"
                v-model="localFormData.sender.address.state" 
                size="small" 
                placeholder="주/도 입력"
                @input="handleSenderStateInput"
              />
              <span v-else>{{ localFormData.sender.address.state || getStateName(localFormData.sender.address.stateCode, localFormData.sender.address.countryCode) }}</span>
            </div>
            <div class="info-row">
              <span class="label">도시:</span>
              <el-input 
                v-if="isEditable"
                v-model="localFormData.sender.address.city" 
                size="small" 
                placeholder="도시" 
              />
              <span v-else>{{ localFormData.sender.address.city || '-' }}</span>
            </div>
            <div class="info-row">
              <span class="label">주소1:</span>
              <el-input 
                v-if="isEditable"
                v-model="localFormData.sender.address.address1" 
                size="small" 
                placeholder="주소 1" 
              />
              <span v-else>{{ localFormData.sender.address.address1 || '-' }}</span>
            </div>
            <div class="info-row">
              <span class="label">주소2:</span>
              <el-input 
                v-if="isEditable"
                v-model="localFormData.sender.address.address2" 
                size="small" 
                placeholder="주소 2 (선택사항)" 
              />
              <span v-else>{{ localFormData.sender.address.address2 || '-' }}</span>
            </div>
            <div class="info-row">
              <span class="label">우편번호:</span>
              <el-input 
                v-if="isEditable"
                v-model="localFormData.sender.address.zipCode" 
                size="small" 
                placeholder="우편번호" 
              />
              <span v-else>{{ localFormData.sender.address.zipCode || '-' }}</span>
            </div>
          </div>
        </el-card>
      </el-col>

      <!-- 수취자 정보 -->
      <el-col :span="12">
        <el-card>
          <template #header>
            <div class="card-header">
              <el-icon><User /></el-icon>
              <span>수취자 정보</span>
            </div>
          </template>
          <div class="detail-info">
            <div class="info-row">
              <span class="label">이름:</span>
              <el-input 
                v-if="isEditable"
                v-model="localFormData.recipient.name" 
                size="small" 
                placeholder="수취자 이름" 
              />
              <span v-else>{{ localFormData.recipient.name || '-' }}</span>
            </div>
            <div class="info-row">
              <span class="label">회사:</span>
              <el-input 
                v-if="isEditable"
                v-model="localFormData.recipient.company" 
                size="small" 
                placeholder="회사명" 
              />
              <span v-else>{{ localFormData.recipient.company || '-' }}</span>
            </div>
            <div class="info-row">
              <span class="label">이메일:</span>
              <el-input 
                v-if="isEditable"
                v-model="localFormData.recipient.email" 
                size="small" 
                placeholder="이메일" 
              />
              <span v-else>{{ localFormData.recipient.email || '-' }}</span>
            </div>
            <div class="info-row">
              <span class="label">전화번호:</span>
              <el-input 
                v-if="isEditable"
                v-model="localFormData.recipient.phoneNo" 
                size="small" 
                placeholder="전화번호" 
              />
              <span v-else>{{ localFormData.recipient.phoneNo || '-' }}</span>
            </div>
            <div class="info-row">
              <span class="label">Tax ID:</span>
              <el-input 
                v-if="isEditable"
                v-model="localFormData.recipient.taxId" 
                size="small" 
                placeholder="Tax ID" 
              />
              <span v-else>{{ localFormData.recipient.taxId || '-' }}</span>
            </div>
            <div class="info-row">
              <span class="label">국가:</span>
              <el-select 
                v-if="isEditable"
                v-model="localFormData.recipient.address.countryCode" 
                size="small" 
                placeholder="국가 선택"
                @change="handleRecipientCountryChange"
                style="width: 100%;"
              >
                <el-option 
                  v-for="country in countries" 
                  :key="country.code" 
                  :label="country.name" 
                  :value="country.code" 
                />
              </el-select>
              <span v-else>{{ getCountryName(localFormData.recipient.address.countryCode) }}</span>
            </div>
            <div class="info-row">
              <span class="label">주/도:</span>
              <el-select 
                v-if="isEditable && isRecipientCountrySupported"
                v-model="localFormData.recipient.address.stateCode" 
                size="small" 
                placeholder="주/도 선택"
                @change="handleRecipientStateChange"
                style="width: 100%;"
              >
                <el-option 
                  v-for="state in recipientStates" 
                  :key="state.code" 
                  :label="state.name" 
                  :value="state.code" 
                />
              </el-select>
              <el-input 
                v-else-if="isEditable && !isRecipientCountrySupported"
                v-model="localFormData.recipient.address.state" 
                size="small" 
                placeholder="주/도 입력"
                @input="handleRecipientStateInput"
              />
              <span v-else>{{ localFormData.recipient.address.state || getStateName(localFormData.recipient.address.stateCode, localFormData.recipient.address.countryCode) }}</span>
            </div>
            <div class="info-row">
              <span class="label">도시:</span>
              <el-input 
                v-if="isEditable"
                v-model="localFormData.recipient.address.city" 
                size="small" 
                placeholder="도시" 
              />
              <span v-else>{{ localFormData.recipient.address.city || '-' }}</span>
            </div>
            <div class="info-row">
              <span class="label">주소1:</span>
              <el-input 
                v-if="isEditable"
                v-model="localFormData.recipient.address.address1" 
                size="small" 
                placeholder="주소 1" 
              />
              <span v-else>{{ localFormData.recipient.address.address1 || '-' }}</span>
            </div>
            <div class="info-row">
              <span class="label">주소2:</span>
              <el-input 
                v-if="isEditable"
                v-model="localFormData.recipient.address.address2" 
                size="small" 
                placeholder="주소 2 (선택사항)" 
              />
              <span v-else>{{ localFormData.recipient.address.address2 || '-' }}</span>
            </div>
            <div class="info-row">
              <span class="label">우편번호:</span>
              <el-input 
                v-if="isEditable"
                v-model="localFormData.recipient.address.zipCode" 
                size="small" 
                placeholder="우편번호" 
              />
              <span v-else>{{ localFormData.recipient.address.zipCode || '-' }}</span>
            </div>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <!-- 아이템 정보 -->
    <el-card>
      <template #header>
        <div class="card-header" style="justify-content: space-between;">
          <div class="card-header">
            <el-icon><Goods /></el-icon>
            <span>아이템 정보</span>
          </div>
          <el-button 
            v-if="isEditable"
            type="primary" 
            size="small" 
            @click="addNewItem"
          >
            <el-icon><Plus /></el-icon>
            아이템 추가
          </el-button>
        </div>
      </template>
      <div class="items-list">
        <div v-if="!localFormData.items || localFormData.items.length === 0" class="no-items">
          <p style="text-align: center; color: #909399; padding: 20px;">
            아이템 정보가 없습니다.
            <span v-if="isEditable">아이템을 추가해주세요.</span>
          </p>
        </div>
        <div 
          v-for="(item, index) in (localFormData.items || [])" 
          :key="index" 
          class="item-card"
        >
          <div class="item-header">
            <h4>아이템 {{ index + 1 }}</h4>
            <el-button 
              v-if="isEditable && (localFormData.items || []).length > 1"
              type="danger" 
              size="small" 
              circle 
              @click="removeItem(index)"
            >
              <el-icon><Delete /></el-icon>
            </el-button>
          </div>
          <el-row :gutter="10">
            <el-col :span="8">
              <div class="item-field">
                <span class="label">상품명:</span>
                <el-input 
                  v-if="isEditable"
                  v-model="item.name" 
                  size="small" 
                  placeholder="상품명" 
                  @input="(value) => { item.itemName = value }"
                />
                <span v-else>{{ item.name || item.itemName || '-' }}</span>
              </div>
            </el-col>
            <el-col :span="4">
              <div class="item-field">
                <span class="label">수량:</span>
                <el-input-number 
                  v-if="isEditable"
                  v-model="item.quantity" 
                  :min="1" 
                  size="small" 
                  style="width: 100%;" 
                  @change="(value) => { item.itemQuantity = value }"
                />
                <span v-else>{{ item.quantity || item.itemQuantity }}</span>
              </div>
            </el-col>
            <el-col :span="6">
              <div class="item-field">
                <span class="label">단가:</span>
                <div v-if="isEditable" style="display: flex; gap: 4px;">
                  <el-input-number 
                    v-model="item.unitValue" 
                    :precision="2" 
                    :step="0.01" 
                    :min="0" 
                    size="small" 
                    style="flex: 1;" 
                    @change="(value) => { item.itemUnitValue = value }"
                  />
                  <el-select v-model="item.valueCurrency" size="small" style="width: 70px;" @change="(value) => { item.itemValueCurrency = value }">
                    <el-option label="KRW" value="KRW" />
                    <el-option label="USD" value="USD" />
                    <el-option label="EUR" value="EUR" />
                  </el-select>
                </div>
                <span v-else>{{ item.unitValue || item.itemUnitValue }} {{ item.valueCurrency || item.itemValueCurrency }}</span>
              </div>
            </el-col>
            <el-col :span="6">
              <div class="item-field">
                <span class="label">무게:</span>
                <div v-if="isEditable" style="display: flex; gap: 4px;">
                  <el-input-number 
                    v-model="item.weight" 
                    :precision="2" 
                    :step="0.1" 
                    :min="0" 
                    size="small" 
                    style="flex: 1;" 
                    @change="(value) => { item.itemWeight = value }"
                  />
                  <el-select v-model="item.weightUnit" size="small" style="width: 60px;">
                    <el-option label="KG" value="KG" />
                    <el-option label="LB" value="LB" />
                  </el-select>
                </div>
                <span v-else>{{ item.weight || item.itemWeight }} {{ item.weightUnit }}</span>
              </div>
            </el-col>
          </el-row>
          <el-row :gutter="10" style="margin-top: 10px;">
            <el-col :span="8">
              <div class="item-field">
                <span class="label">HS Code:</span>
                <el-input 
                  v-if="isEditable"
                  v-model="item.itemHsCode" 
                  size="small" 
                  placeholder="HS Code" 
                  @input="(value) => { item.itemHSCode = value }"
                />
                <span v-else>{{ item.itemHsCode || item.itemHSCode || '-' }}</span>
              </div>
            </el-col>
            <el-col :span="8">
              <div class="item-field">
                <span class="label">원산지:</span>
                <el-select 
                  v-if="isEditable"
                  v-model="item.itemOriginCountryCode" 
                  size="small" 
                  placeholder="원산지 선택"
                  style="width: 100%;"
                >
                  <el-option 
                    v-for="country in countries" 
                    :key="country.code" 
                    :label="country.name" 
                    :value="country.code" 
                  />
                </el-select>
                <span v-else>{{ getCountryName(item.itemOriginCountryCode) }}</span>
              </div>
            </el-col>
          </el-row>
        </div>
      </div>
    </el-card>
  </div>
</template>

<script setup>
import { ref, computed, watch, nextTick } from 'vue'
import { 
  Shop, Document, Box, UserFilled, User, Goods, Plus, Delete 
} from '@element-plus/icons-vue'

const props = defineProps({
  // 모드 설정
  mode: { 
    type: String, 
    default: 'create' // 'create' | 'edit' | 'view'
  },
  
  // 데이터
  formData: { 
    type: Object, 
    required: true 
  },
  
  // 설정
  isEditing: { 
    type: Boolean, 
    default: false 
  },
  
  loading: { 
    type: Boolean, 
    default: false 
  },
  
  // 국가/주 데이터
  countries: { 
    type: Array, 
    default: () => [] 
  },
  
  stateCodeData: { 
    type: Object, 
    default: () => ({}) 
  }
})

const emit = defineEmits([
  'update:formData',
  'submit',
  'cancel',
  'add-item',
  'remove-item',
  'sender-country-change',
  'recipient-country-change',
  'sender-state-change',
  'recipient-state-change'
])

// Simple reactive form data without watch complications
const localFormData = ref({
  ...props.formData,
  dimension: props.formData.dimension || { length: 0, width: 0, height: 0 },
  items: props.formData.items || [],
  sender: props.formData.sender ? {
    ...props.formData.sender,
    state: props.formData.sender?.state || '',
    address: props.formData.sender.address ? {
      ...props.formData.sender.address,
      state: props.formData.sender.address?.state || ''
    } : {}
  } : { state: '', address: { state: '' } },
  recipient: props.formData.recipient ? {
    ...props.formData.recipient,
    state: props.formData.recipient?.state || '',
    address: props.formData.recipient.address ? {
      ...props.formData.recipient.address,
      state: props.formData.recipient.address?.state || ''
    } : {}
  } : { state: '', address: { state: '' } }
})

console.log('OrderForm initial localFormData:', localFormData.value)

// Watch for both formData and isEditing changes
watch(() => [props.formData, props.isEditing], ([newData, newIsEditing]) => {
  console.log('OrderForm props changed:', {
    mode: props.mode,
    isEditing: newIsEditing,
    hasData: !!newData,
    dataKeys: newData ? Object.keys(newData) : []
  })
  
  // Always update when data is provided - let user interaction handle the rest
  if (newData && Object.keys(newData).length > 0) {
    console.log('Updating form data in mode:', props.mode, 'isEditing:', newIsEditing)
  
  // 아이템 데이터 정규화 - 백엔드에서 오는 다양한 필드명 처리
  const normalizedItems = (newData.items || []).map(item => ({
    ...item,
    // 프론트엔드용 필드명
    name: item.name || item.itemName || '',
    quantity: item.quantity || item.itemQuantity || 1,
    unitValue: item.unitValue || item.itemUnitValue || 0,
    valueCurrency: item.valueCurrency || item.itemValueCurrency || 'KRW',
    weight: item.weight || item.itemWeight || 0,
    weightUnit: item.weightUnit || 'KG',
    itemHsCode: item.itemHsCode || item.itemHSCode || '',
    itemOriginCountryCode: item.itemOriginCountryCode || 'KR',
    // 백엔드용 필드명도 유지
    itemName: item.itemName || item.name || '',
    itemQuantity: item.itemQuantity || item.quantity || 1,
    itemUnitValue: item.itemUnitValue || item.unitValue || 0,
    itemValueCurrency: item.itemValueCurrency || item.valueCurrency || 'KRW',
    itemWeight: item.itemWeight || item.weight || 0,
    itemHSCode: item.itemHSCode || item.itemHsCode || ''
  }))
  
  localFormData.value = {
    ...newData,
    dimension: newData.dimension || { length: 0, width: 0, height: 0 },
    items: normalizedItems,
    sender: {
      ...newData.sender,
      state: newData.sender?.state || '',
      address: {
        ...newData.sender?.address,
        state: newData.sender?.address?.state || ''
      }
    },
    recipient: {
      ...newData.recipient,
      state: newData.recipient?.state || '',
      address: {
        ...newData.recipient?.address,
        state: newData.recipient?.address?.state || ''
      }
    }
  }
  
  console.log('Form data updated with normalized items:', localFormData.value.items)
  } else {
    console.log('Skipping form data update - actively editing')
  }
}, { immediate: true })

// Computed
const isEditable = computed(() => {
  return props.mode === 'create' || (props.mode === 'edit' && props.isEditing)
})

const senderStates = ref([])
const recipientStates = ref([])

const isSenderCountrySupported = computed(() => {
  return props.stateCodeData[localFormData.value.sender.address.countryCode]?.length > 0
})

const isRecipientCountrySupported = computed(() => {
  return props.stateCodeData[localFormData.value.recipient.address.countryCode]?.length > 0
})

// Methods
const handleSenderCountryChange = (countryCode) => {
  localFormData.value.sender.address.stateCode = ''
  localFormData.value.sender.address.state = '' // 입력 필드 초기화
  localFormData.value.sender.state = '' // 최상위 state 필드도 함께 초기화
  senderStates.value = props.stateCodeData[countryCode] || []
  emit('sender-country-change', countryCode)
}

const handleRecipientCountryChange = (countryCode) => {
  localFormData.value.recipient.address.stateCode = ''
  localFormData.value.recipient.address.state = '' // 입력 필드 초기화
  localFormData.value.recipient.state = '' // 최상위 state 필드도 함께 초기화
  recipientStates.value = props.stateCodeData[countryCode] || []
  emit('recipient-country-change', countryCode)
}

const handleSenderStateChange = (stateCode) => {
  // stateCode 변경 시 해당 state의 name도 함께 설정
  const selectedState = senderStates.value.find(state => state.code === stateCode)
  if (selectedState) {
    localFormData.value.sender.state = selectedState.name
    localFormData.value.sender.address.state = selectedState.name // address.state에도 설정
    console.log('Sender state set to:', selectedState.name)
  }
  emit('sender-state-change', { stateCode, stateName: selectedState?.name || '' })
}

const handleRecipientStateChange = (stateCode) => {
  // stateCode 변경 시 해당 state의 name도 함께 설정
  const selectedState = recipientStates.value.find(state => state.code === stateCode)
  if (selectedState) {
    localFormData.value.recipient.state = selectedState.name
    localFormData.value.recipient.address.state = selectedState.name // address.state에도 설정
    console.log('Recipient state set to:', selectedState.name)
  }
  emit('recipient-state-change', { stateCode, stateName: selectedState?.name || '' })
}

const handleSenderStateInput = (value) => {
  // 직접 입력한 state 값을 sender.state와 address.state 모두에 설정
  localFormData.value.sender.state = value
  localFormData.value.sender.address.state = value
  console.log('Sender state input set to:', value)
}

const handleRecipientStateInput = (value) => {
  // 직접 입력한 state 값을 recipient.state와 address.state 모두에 설정
  localFormData.value.recipient.state = value
  localFormData.value.recipient.address.state = value
  console.log('Recipient state input set to:', value)
}

const handleDimensionChange = () => {
  // dimension 변경은 즉시 반영하지 않고 폼 제출시에만 처리
  console.log('Dimension changed:', localFormData.value.dimension)
}

const addNewItem = () => {
  // items 배열이 없으면 초기화
  if (!localFormData.value.items) {
    localFormData.value.items = []
  }
  
  localFormData.value.items.push({
    name: '',
    itemName: '',
    quantity: 1,
    itemQuantity: 1,
    unitValue: 0,
    itemUnitValue: 0,
    valueCurrency: 'KRW',
    itemValueCurrency: 'KRW',
    weight: 0,
    itemWeight: 0,
    weightUnit: 'KG',
    itemHsCode: '',
    itemHSCode: '', // 백엔드 호환성을 위해 둘 다 추가
    itemOriginCountryCode: 'KR'
  })
  emit('add-item')
}

const removeItem = (index) => {
  localFormData.value.items.splice(index, 1)
  emit('remove-item', index)
}

// Utility functions
const getCountryName = (countryCode) => {
  const country = props.countries.find(c => c.code === countryCode)
  return country ? country.name : countryCode
}

const getStateName = (stateCode, countryCode) => {
  const states = props.stateCodeData[countryCode] || []
  const state = states.find(s => s.code === stateCode)
  return state ? state.name : stateCode
}

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

const formatDate = (dateString) => {
  if (!dateString) return '-'
  const date = new Date(dateString)
  return date.toLocaleDateString('ko-KR')
}

const getTrackingEventText = (event) => {
  const eventTexts = {
    'PACKAGE_RECEIVED': '패키지 접수',
    'IN_TRANSIT': '배송중',
    'OUT_FOR_DELIVERY': '배송 출발',
    'DELIVERED': '배송완료',
    'FAILED_ATTEMPT': '배송 시도 실패',
    'EXCEPTION': '배송 이상',
    'RETURN_TO_SENDER': '반송',
    'ORDER_PLACED': '주문 접수'
  }
  return eventTexts[event] || event
}

// Initialize state data on mount
watch(() => [localFormData.value.sender.address.countryCode, localFormData.value.recipient.address.countryCode], 
  ([senderCountry, recipientCountry]) => {
    if (senderCountry) {
      senderStates.value = props.stateCodeData[senderCountry] || []
      // 기존 stateCode가 있다면 해당하는 state 이름 설정
      if (localFormData.value.sender.address.stateCode && !localFormData.value.sender.state) {
        const selectedState = senderStates.value.find(state => state.code === localFormData.value.sender.address.stateCode)
        if (selectedState) {
          localFormData.value.sender.state = selectedState.name
        }
      }
    }
    if (recipientCountry) {
      recipientStates.value = props.stateCodeData[recipientCountry] || []
      // 기존 stateCode가 있다면 해당하는 state 이름 설정
      if (localFormData.value.recipient.address.stateCode && !localFormData.value.recipient.state) {
        const selectedState = recipientStates.value.find(state => state.code === localFormData.value.recipient.address.stateCode)
        if (selectedState) {
          localFormData.value.recipient.state = selectedState.name
        }
      }
    }
  }, 
  { immediate: true }
)

// Expose localFormData for parent component access
defineExpose({
  localFormData
})
</script>

<style scoped>
.order-detail {
  padding: 0;
}

.card-header {
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
  flex-direction: column;
  gap: 4px;
}

.label {
  font-size: 14px;
  font-weight: 600;
  color: #606266;
}

.items-list {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.item-card {
  border: 1px solid #e4e7ed;
  border-radius: 8px;
  padding: 16px;
  background: #fafafa;
}

.item-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.item-header h4 {
  margin: 0;
  color: #303133;
  font-size: 16px;
}

.item-field {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.item-field .label {
  font-size: 12px;
  color: #909399;
}
</style>