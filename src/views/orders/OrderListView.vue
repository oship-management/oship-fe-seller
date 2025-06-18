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
    <el-card class="filter-card">
      <el-form :model="filters" :inline="true" class="filter-form">
        <el-form-item label="주문 상태">
          <el-select v-model="filters.status" placeholder="상태 선택" clearable style="width: 150px">
            <el-option label="대기중" value="PENDING" />
            <el-option label="처리중" value="PROCESSING" />
            <el-option label="배송중" value="SHIPPED" />
            <el-option label="배송완료" value="DELIVERED" />
            <el-option label="취소됨" value="CANCELLED" />
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
          <el-button type="primary" @click="fetchOrders">
            <el-icon><Search /></el-icon>
            검색
          </el-button>
          <el-button @click="resetFilters">
            <el-icon><Refresh /></el-icon>
            초기화
          </el-button>
        </el-form-item>
      </el-form>
    </el-card>


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
              <th>플랫폼</th>
              <th>수신자</th>
              <th>스토어</th>
              <th>패키지</th>
              <th>상태</th>
              <th>작업</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="loading">
              <td colspan="8" style="text-align: center; padding: 40px;">
                <el-icon class="is-loading"><Loading /></el-icon>
                로딩 중...
              </td>
            </tr>
            <tr v-else-if="orders.length === 0">
              <td colspan="8" style="text-align: center; padding: 40px; color: #909399;">
                주문이 없습니다. 첫 번째 주문을 생성해보세요!
                <br>
                <small>Total: {{ pagination.total }}, Orders length: {{ orders.length }}</small>
              </td>
            </tr>
            <tr 
              v-for="order in orders" 
              :key="order.id" 
              v-else-if="orders.length > 0"
              @click="openOrderDetailModal(order)"
              class="order-row"
            >
              <td @click.stop>
                <input 
                  type="checkbox" 
                  class="checkbox" 
                  :value="order.id"
                  v-model="selectedOrders"
                >
              </td>
              <td><strong>{{ order.oshopMasterNo }}</strong></td>
              <td>{{ order.storePlatform }}</td>
              <td>{{ order.recipientName }}</td>
              <td>{{ order.storeName }}</td>
              <td>{{ order.parcelCount }}개 ({{ order.shipmentActualWeight }}kg)</td>
              <td>
                <el-tag 
                  :type="getLatestTrackingStatusType(order)"
                  size="small"
                >
                  {{ getLatestTrackingStatus(order) }}
                </el-tag>
              </td>
              <td @click.stop>
                <div class="action-icons">
                  <el-button 
                    type="info" 
                    size="small"
                    circle
                    @click="openTrackingModal(order)"
                    title="추적"
                  >
                    <el-icon><View /></el-icon>
                  </el-button>
                  <el-button 
                    type="danger" 
                    size="small"
                    circle
                    @click="deleteOrder(order.id)"
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
          v-model:current-page="pagination.page"
          v-model:page-size="pagination.size"
          :page-sizes="[10, 20, 50, 100]"
          :total="pagination.total"
          layout="total, sizes, prev, pager, next, jumper"
          @size-change="handleSizeChange"
          @current-change="handleCurrentChange"
        />
      </div>
    </el-card>

    <!-- Tracking Modal -->
    <el-dialog
      v-model="showTrackingModal"
      title="패키지 추적"
      width="900px"
      :before-close="closeTrackingModal"
    >
      <div v-if="selectedOrder">
        <div style="text-align: center; margin-bottom: 30px;">
          <el-tag 
            :type="getLatestTrackingStatusType(selectedOrder)"
            size="large"
            style="padding: 12px 30px; font-size: 18px; font-weight: 700;"
          >
            {{ getLatestTrackingStatus(selectedOrder) }}
          </el-tag>
          <p style="margin-top: 10px; color: #909399;">
            Tracking #: <span>{{ selectedOrder.oshopMasterNo }}</span>
          </p>
          <p style="color: #909399;">
            Order: <span>{{ selectedOrder.oshopMasterNo }} - {{ selectedOrder.storeName }}</span>
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
                <strong>{{ selectedOrder.recipientName }}</strong><br>
                {{ selectedOrder.storeName }}<br>
                {{ selectedOrder.storePlatform }}<br>
                패키지: {{ selectedOrder.parcelCount }}개<br>
                무게: {{ selectedOrder.shipmentActualWeight }}kg
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
                <strong>추적번호:</strong> {{ selectedOrder.oshopMasterNo }}
              </div>
            </el-card>
          </el-col>
        </el-row>

        <el-steps :active="getTrackingStep(selectedOrder.orderStatus)" align-center>
          <el-step title="주문 접수" />
          <el-step title="처리중" />
          <el-step title="배송중" />
          <el-step title="배송완료" />
        </el-steps>

        <div style="margin-top: 30px;">
          <h3 style="margin-bottom: 15px;">추적 기록</h3>
          <el-timeline>
            <el-timeline-item :timestamp="formatDate(selectedOrder.createdAt)" placement="top">
              <el-card>
                <p>주문이 접수되었습니다</p>
              </el-card>
            </el-timeline-item>
          </el-timeline>
        </div>
      </div>
    </el-dialog>

    <!-- Create Order Modal -->
    <el-dialog
      v-model="showCreateModal"
      title="새 주문 생성"
      width="1200px"
      :before-close="closeCreateModal"
    >
      <div v-if="showCreateModal" class="order-detail">
        <!-- 기본 정보 섹션 -->
        <el-row :gutter="20" style="margin-bottom: 20px;">
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
                  <el-input v-model="createFormData.storePlatform" size="small" placeholder="플랫폼 입력" />
                </div>
                <div class="info-row">
                  <span class="label">스토어명:</span>
                  <el-input v-model="createFormData.storeName" size="small" placeholder="스토어명 입력" />
                </div>
                <div class="info-row">
                  <span class="label">배송조건:</span>
                  <el-input v-model="createFormData.shippingTerm" size="small" placeholder="배송조건 입력" />
                </div>
              </div>
            </el-card>
          </el-col>
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
                  <el-input v-model="createFormData.orderNo" size="small" placeholder="주문번호 입력" />
                </div>
                <div class="info-row">
                  <span class="label">현재상태:</span>
                  <el-tag type="warning">대기중</el-tag>
                </div>
              </div>
            </el-card>
          </el-col>
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
                  <el-input-number v-model="createFormData.parcelCount" size="small" :min="1" />
                </div>
                <div class="info-row">
                  <span class="label">실제 무게:</span>
                  <div style="display: flex; gap: 8px;">
                    <el-input-number v-model="createFormData.shipmentActualWeight" size="small" :precision="2" :step="0.1" />
                    <el-select v-model="createFormData.weightUnit" size="small" style="width: 80px;">
                      <el-option label="KG" value="KG" />
                      <el-option label="LB" value="LB" />
                    </el-select>
                  </div>
                </div>
                <div class="info-row">
                  <span class="label">길이:</span>
                  <div style="display: flex; gap: 4px; align-items: center;">
                    <el-input-number v-model="createFormData.dimension.length" size="small" :precision="2" />
                    <span>cm</span>
                  </div>
                </div>
                <div class="info-row">
                  <span class="label">너비:</span>
                  <div style="display: flex; gap: 4px; align-items: center;">
                    <el-input-number v-model="createFormData.dimension.width" size="small" :precision="2" />
                    <span>cm</span>
                  </div>
                </div>
                <div class="info-row">
                  <span class="label">높이:</span>
                  <div style="display: flex; gap: 4px; align-items: center;">
                    <el-input-number v-model="createFormData.dimension.height" size="small" :precision="2" />
                    <span>cm</span>
                  </div>
                </div>
                <div class="info-row">
                  <span class="label">용적 무게:</span>
                  <div style="display: flex; gap: 8px; align-items: center;">
                    <el-input-number v-model="createFormData.shipmentVolumeWeight" size="small" :precision="2" :step="0.1" />
                    <el-select v-model="createFormData.weightUnit" size="small" style="width: 80px;">
                      <el-option label="KG" value="KG" />
                      <el-option label="LB" value="LB" />
                    </el-select>
                  </div>
                </div>
              </div>
            </el-card>
          </el-col>
        </el-row>

        <!-- 발송자/수취자 정보 섹션 -->
        <el-row :gutter="20" style="margin-bottom: 20px;">
          <el-col :span="12">
            <el-card>
              <template #header>
                <div class="card-header">
                  <el-icon><User /></el-icon>
                  <span>발송자 정보</span>
                </div>
              </template>
              <div class="detail-info">
                <div class="info-row">
                  <span class="label">이름:</span>
                  <el-input v-model="createFormData.sender.name" size="small" placeholder="발송자 이름" />
                </div>
                <div class="info-row">
                  <span class="label">회사명:</span>
                  <el-input v-model="createFormData.sender.company" size="small" placeholder="회사명" />
                </div>
                <div class="info-row">
                  <span class="label">이메일:</span>
                  <el-input v-model="createFormData.sender.email" size="small" placeholder="이메일" />
                </div>
                <div class="info-row">
                  <span class="label">전화번호:</span>
                  <el-input v-model="createFormData.sender.phoneNo" size="small" placeholder="전화번호" />
                </div>
                <div class="info-row">
                  <span class="label">주소 1:</span>
                  <el-input v-model="createFormData.sender.address.address1" size="small" placeholder="주소 1" />
                </div>
                <div class="info-row">
                  <span class="label">주소 2:</span>
                  <el-input v-model="createFormData.sender.address.address2" size="small" placeholder="주소 2" />
                </div>
                <div class="info-row">
                  <span class="label">도시:</span>
                  <el-input v-model="createFormData.sender.address.city" size="small" placeholder="도시" />
                </div>
                <div class="info-row">
                  <span class="label">국가:</span>
                  <el-select v-model="createFormData.sender.address.countryCode" size="small" placeholder="국가 선택" @change="onCreateSenderCountryChange" filterable>
                    <el-option 
                      v-for="country in getAllCountries()" 
                      :key="country.code" 
                      :label="`${country.name} (${country.code})`" 
                      :value="country.code" 
                    />
                  </el-select>
                </div>
                <div class="info-row">
                  <span class="label">주/도:</span>
                  <!-- 지원되는 국가인 경우 SELECT로 선택 -->
                  <el-select 
                    v-if="isCreateSenderCountrySupported()"
                    v-model="createFormData.sender.address.stateCode" 
                    size="small" 
                    placeholder="주/도 선택" 
                    @change="onCreateSenderStateChange"
                    class="state-select"
                  >
                    <el-option 
                      v-for="state in getCreateSenderStateOptions()" 
                      :key="state.code" 
                      :label="`${state.name} (${state.code})`" 
                      :value="state.code" 
                    />
                  </el-select>
                  <!-- 지원되지 않는 국가인 경우 INPUT으로 직접 입력 (코드 제외) -->
                  <el-input 
                    v-else
                    v-model="createFormData.sender.address.state" 
                    size="small" 
                    placeholder="주/도 이름 입력"
                    class="state-input"
                  />
                </div>
                <div class="info-row">
                  <span class="label">우편번호:</span>
                  <el-input v-model="createFormData.sender.address.zipCode" size="small" placeholder="우편번호" />
                </div>
              </div>
            </el-card>
          </el-col>
          <el-col :span="12">
            <el-card>
              <template #header>
                <div class="card-header">
                  <el-icon><Location /></el-icon>
                  <span>수취자 정보</span>
                </div>
              </template>
              <div class="detail-info">
                <div class="info-row">
                  <span class="label">이름:</span>
                  <el-input v-model="createFormData.recipient.name" size="small" placeholder="수취자 이름" />
                </div>
                <div class="info-row">
                  <span class="label">회사명:</span>
                  <el-input v-model="createFormData.recipient.company" size="small" placeholder="회사명" />
                </div>
                <div class="info-row">
                  <span class="label">이메일:</span>
                  <el-input v-model="createFormData.recipient.email" size="small" placeholder="이메일" />
                </div>
                <div class="info-row">
                  <span class="label">전화번호:</span>
                  <el-input v-model="createFormData.recipient.phoneNo" size="small" placeholder="전화번호" />
                </div>
                <div class="info-row">
                  <span class="label">Tax ID:</span>
                  <el-input v-model="createFormData.recipient.taxId" size="small" placeholder="Tax ID" />
                </div>
                <div class="info-row">
                  <span class="label">주소 1:</span>
                  <el-input v-model="createFormData.recipient.address.address1" size="small" placeholder="주소 1" />
                </div>
                <div class="info-row">
                  <span class="label">주소 2:</span>
                  <el-input v-model="createFormData.recipient.address.address2" size="small" placeholder="주소 2" />
                </div>
                <div class="info-row">
                  <span class="label">도시:</span>
                  <el-input v-model="createFormData.recipient.address.city" size="small" placeholder="도시" />
                </div>
                <div class="info-row">
                  <span class="label">국가:</span>
                  <el-select v-model="createFormData.recipient.address.countryCode" size="small" placeholder="국가 선택" @change="onCreateRecipientCountryChange" filterable>
                    <el-option 
                      v-for="country in getAllCountries()" 
                      :key="country.code" 
                      :label="`${country.name} (${country.code})`" 
                      :value="country.code" 
                    />
                  </el-select>
                </div>
                <div class="info-row">
                  <span class="label">주/도:</span>
                  <!-- 지원되는 국가인 경우 SELECT로 선택 -->
                  <el-select 
                    v-if="isCreateRecipientCountrySupported()"
                    v-model="createFormData.recipient.address.stateCode" 
                    size="small" 
                    placeholder="주/도 선택" 
                    @change="onCreateRecipientStateChange"
                    class="state-select"
                  >
                    <el-option 
                      v-for="state in getCreateRecipientStateOptions()" 
                      :key="state.code" 
                      :label="`${state.name} (${state.code})`" 
                      :value="state.code" 
                    />
                  </el-select>
                  <!-- 지원되지 않는 국가인 경우 INPUT으로 직접 입력 (코드 제외) -->
                  <el-input 
                    v-else
                    v-model="createFormData.recipient.address.state" 
                    size="small" 
                    placeholder="주/도 이름 입력"
                    class="state-input"
                  />
                </div>
                <div class="info-row">
                  <span class="label">우편번호:</span>
                  <el-input v-model="createFormData.recipient.address.zipCode" size="small" placeholder="우편번호" />
                </div>
              </div>
            </el-card>
          </el-col>
        </el-row>

        <!-- 아이템 정보 -->
        <el-card>
          <template #header>
            <div class="card-header">
              <el-icon><Goods /></el-icon>
              <span>아이템 정보</span>
              <el-button type="primary" size="small" @click="addNewCreateItem" style="float: right;">
                <el-icon><Plus /></el-icon>
                아이템 추가
              </el-button>
            </div>
          </template>
          <div class="order-items-section">
            <div v-for="(item, index) in createFormData.items" :key="index" class="order-item-card">
              <el-card shadow="hover">
                <el-row :gutter="20">
                  <el-col :span="8">
                    <div class="item-info">
                      <div class="info-row">
                        <span class="label">상품명:</span>
                        <el-input v-model="item.name" size="small" placeholder="상품명" />
                      </div>
                      <div class="info-row">
                        <span class="label">수량:</span>
                        <el-input-number v-model="item.quantity" size="small" :min="1" />
                      </div>
                    </div>
                  </el-col>
                  <el-col :span="8">
                    <div class="item-info">
                      <div class="info-row">
                        <span class="label">단가:</span>
                        <div style="display: flex; gap: 8px;">
                          <el-input-number v-model="item.unitValue" size="small" :precision="2" />
                          <el-select v-model="item.valueCurrency" size="small" style="width: 80px;">
                            <el-option label="KRW" value="KRW" />
                            <el-option label="USD" value="USD" />
                          </el-select>
                        </div>
                      </div>
                      <div class="info-row">
                        <span class="label">무게:</span>
                        <div style="display: flex; gap: 8px;">
                          <el-input-number v-model="item.weight" size="small" :precision="2" :step="0.1" />
                          <el-select v-model="item.weightUnit" size="small" style="width: 80px;">
                            <el-option label="KG" value="KG" />
                            <el-option label="LB" value="LB" />
                          </el-select>
                        </div>
                      </div>
                    </div>
                  </el-col>
                  <el-col :span="8">
                    <div class="item-info">
                      <div class="info-row">
                        <span class="label">HS Code:</span>
                        <el-input v-model="item.itemHsCode" size="small" placeholder="HS Code" />
                      </div>
                      <div class="info-row">
                        <span class="label">원산지:</span>
                        <el-input v-model="item.itemOriginCountryCode" size="small" placeholder="원산지 코드" />
                      </div>
                    </div>
                  </el-col>
                </el-row>
                <el-button 
                  v-if="createFormData.items.length > 1"
                  type="danger" 
                  size="small" 
                  @click="removeCreateItem(index)" 
                  style="position: absolute; top: 10px; right: 10px;"
                >
                  <el-icon><Delete /></el-icon>
                </el-button>
              </el-card>
            </div>
          </div>
        </el-card>
      </div>
      
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="closeCreateModal">취소</el-button>
          <el-button type="primary" @click="createNewOrder">주문 생성</el-button>
        </span>
      </template>
    </el-dialog>

    <!-- Shipping Modal -->
    <el-dialog
      v-model="showShippingModal"
      title="배송 방법 선택"
      width="600px"
      :before-close="closeShippingModal"
    >
      <div class="shipping-methods">
        <div 
          v-for="method in shippingMethods"
          :key="method.id"
          class="shipping-option"
          :class="{ selected: selectedShippingMethod === method.id }"
          @click="selectShippingMethod(method.id, method.price)"
        >
          <div class="shipping-info">
            <div class="shipping-logo" :class="method.logoClass">{{ method.name }}</div>
            <div class="shipping-details">
              <h4>{{ method.service }}</h4>
              <div class="shipping-meta">{{ method.description }}</div>
            </div>
          </div>
          <div class="shipping-price">
            <div class="price-amount">${{ method.price }}</div>
          </div>
        </div>
      </div>

      <template #footer>
        <span class="dialog-footer">
          <el-button @click="closeShippingModal">취소</el-button>
          <el-button type="primary" @click="confirmShipping">배송 처리</el-button>
        </span>
      </template>
    </el-dialog>

    <!-- Order Detail Modal -->
    <el-dialog
      v-model="showOrderDetailModal"
      title="주문 상세정보"
      width="1200px"
      :before-close="closeOrderDetailModal"
    >
      <div v-if="selectedOrder" class="order-detail">
        <!-- 기본 정보 섹션 -->
        <el-row :gutter="20" style="margin-bottom: 20px;">
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
                  <span class="value" v-if="!isEditingOrder">{{ selectedOrder.storePlatform }}</span>
                  <el-input v-else v-model="editFormData.storePlatform" size="small" />
                </div>
                <div class="info-row">
                  <span class="label">스토어명:</span>
                  <span class="value" v-if="!isEditingOrder">{{ selectedOrder.storeName }}</span>
                  <el-input v-else v-model="editFormData.storeName" size="small" />
                </div>
                <div class="info-row">
                  <span class="label">배송조건:</span>
                  <span class="value" v-if="!isEditingOrder">{{ selectedOrder.shippingTerm || '-' }}</span>
                  <el-input v-else v-model="editFormData.shippingTerm" size="small" />
                </div>
              </div>
            </el-card>
          </el-col>
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
                  <span class="value" v-if="!isEditingOrder">{{ selectedOrder.orderNo || selectedOrder.oshopMasterNo }}</span>
                  <el-input v-else v-model="editFormData.orderNo" size="small" />
                </div>
                <div class="info-row">
                  <span class="label">Master No:</span>
                  <span class="value">{{ selectedOrder.oshipMasterNo || selectedOrder.oshopMasterNo }}</span>
                </div>
                <div class="info-row">
                  <span class="label">현재상태:</span>
                  <el-tag :type="getLatestTrackingStatusType(selectedOrder)">
                    {{ getLatestTrackingStatus(selectedOrder) }}
                  </el-tag>
                </div>
              </div>
            </el-card>
          </el-col>
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
                  <span class="value" v-if="!isEditingOrder">{{ selectedOrder.parcelCount }}개</span>
                  <el-input-number v-else v-model="editFormData.parcelCount" size="small" :min="1" />
                </div>
                <div class="info-row">
                  <span class="label">실제 무게:</span>
                  <span class="value" v-if="!isEditingOrder">{{ selectedOrder.shipmentActualWeight }}{{ selectedOrder.weightUnit || 'KG' }}</span>
                  <div v-else style="display: flex; gap: 8px;">
                    <el-input-number v-model="editFormData.shipmentActualWeight" size="small" :precision="2" :step="0.1" />
                    <el-select v-model="editFormData.weightUnit" size="small" style="width: 80px;">
                      <el-option label="KG" value="KG" />
                      <el-option label="LB" value="LB" />
                    </el-select>
                  </div>
                </div>
                <div class="info-row" v-if="isEditingOrder && selectedOrder.dimension">
                  <span class="label">길이:</span>
                  <div style="display: flex; gap: 4px; align-items: center;">
                    <el-input-number v-model="editFormData.dimension.length" size="small" :precision="2" />
                    <span>cm</span>
                  </div>
                </div>
                <div class="info-row" v-if="isEditingOrder && selectedOrder.dimension">
                  <span class="label">너비:</span>
                  <div style="display: flex; gap: 4px; align-items: center;">
                    <el-input-number v-model="editFormData.dimension.width" size="small" :precision="2" />
                    <span>cm</span>
                  </div>
                </div>
                <div class="info-row" v-if="isEditingOrder && selectedOrder.dimension">
                  <span class="label">높이:</span>
                  <div style="display: flex; gap: 4px; align-items: center;">
                    <el-input-number v-model="editFormData.dimension.height" size="small" :precision="2" />
                    <span>cm</span>
                  </div>
                </div>
                <div class="info-row" v-if="isEditingOrder">
                  <span class="label">용적 무게:</span>
                  <div style="display: flex; gap: 8px; align-items: center;">
                    <el-input-number v-model="editFormData.shipmentVolumeWeight" size="small" :precision="2" :step="0.1" />
                    <el-select v-model="editFormData.weightUnit" size="small" style="width: 80px;">
                      <el-option label="KG" value="KG" />
                      <el-option label="LB" value="LB" />
                    </el-select>
                  </div>
                </div>
              </div>
            </el-card>
          </el-col>
        </el-row>

        <!-- 발송자/수신자 정보 섹션 -->
        <el-row :gutter="20" style="margin-bottom: 20px;">
          <el-col :span="12" v-if="selectedOrder.sender">
            <el-card>
              <template #header>
                <div class="card-header">
                  <el-icon><User /></el-icon>
                  <span>발송자 정보</span>
                </div>
              </template>
              <div class="detail-info">
                <div class="info-row">
                  <span class="label">이름:</span>
                  <span class="value" v-if="!isEditingOrder">{{ selectedOrder.sender.name }}</span>
                  <el-input v-else v-model="editFormData.sender.name" size="small" />
                </div>
                <div class="info-row">
                  <span class="label">회사:</span>
                  <span class="value" v-if="!isEditingOrder">{{ selectedOrder.sender.company || '-' }}</span>
                  <el-input v-else v-model="editFormData.sender.company" size="small" />
                </div>
                <div class="info-row">
                  <span class="label">이메일:</span>
                  <span class="value" v-if="!isEditingOrder">{{ selectedOrder.sender.email || '-' }}</span>
                  <el-input v-else v-model="editFormData.sender.email" size="small" />
                </div>
                <div class="info-row">
                  <span class="label">전화번호:</span>
                  <span class="value" v-if="!isEditingOrder">{{ selectedOrder.sender.phoneNo || '-' }}</span>
                  <el-input v-else v-model="editFormData.sender.phoneNo" size="small" />
                </div>
                <div class="info-row" v-if="selectedOrder.sender.address">
                  <span class="label">주소1:</span>
                  <span class="value" v-if="!isEditingOrder">{{ selectedOrder.sender.address.address1 || '-' }}</span>
                  <el-input v-else v-model="editFormData.sender.address.address1" size="small" />
                </div>
                <div class="info-row" v-if="selectedOrder.sender.address">
                  <span class="label">주소2:</span>
                  <span class="value" v-if="!isEditingOrder">{{ selectedOrder.sender.address.address2 || '-' }}</span>
                  <el-input v-else v-model="editFormData.sender.address.address2" size="small" />
                </div>
                <div class="info-row" v-if="selectedOrder.sender.address">
                  <span class="label">도시:</span>
                  <span class="value" v-if="!isEditingOrder">{{ selectedOrder.sender.address.city || '-' }}</span>
                  <el-input v-else v-model="editFormData.sender.address.city" size="small" />
                </div>
                <div class="info-row" v-if="selectedOrder.sender.address">
                  <span class="label">국가:</span>
                  <span class="value" v-if="!isEditingOrder">{{ getCountryNameByCode(selectedOrder.sender.address.countryCode) }}</span>
                  <el-select v-else v-model="editFormData.sender.address.countryCode" size="small" placeholder="국가 선택" @change="onSenderCountryChange" filterable>
                    <el-option 
                      v-for="country in getAllCountries()" 
                      :key="country.code" 
                      :label="`${country.name} (${country.code})`" 
                      :value="country.code" 
                    />
                  </el-select>
                </div>
                <div class="info-row" v-if="selectedOrder.sender.address">
                  <span class="label">주/도:</span>
                  <span class="value" v-if="!isEditingOrder">{{ selectedOrder.sender.address.state || '-' }}{{ selectedOrder.sender.address.stateCode ? ` (${selectedOrder.sender.address.stateCode})` : '' }}</span>
                  <!-- 지원되는 국가인 경우 SELECT로 선택 -->
                  <el-select 
                    v-else-if="isEditingOrder && isSenderCountrySupported()"
                    v-model="editFormData.sender.address.stateCode" 
                    size="small" 
                    placeholder="주/도 선택" 
                    @change="onSenderStateChange"
                    class="state-select"
                  >
                    <el-option 
                      v-for="state in getSenderStateOptions()" 
                      :key="state.code" 
                      :label="`${state.name} (${state.code})`" 
                      :value="state.code" 
                    />
                  </el-select>
                  <!-- 지원되지 않는 국가인 경우 INPUT으로 직접 입력 (코드 제외) -->
                  <el-input 
                    v-else-if="isEditingOrder"
                    v-model="editFormData.sender.address.state" 
                    size="small" 
                    placeholder="주/도 이름 입력"
                    class="state-input"
                  />
                </div>
                <div class="info-row" v-if="selectedOrder.sender.address">
                  <span class="label">우편번호:</span>
                  <span class="value" v-if="!isEditingOrder">{{ selectedOrder.sender.address.zipCode || '-' }}</span>
                  <el-input v-else v-model="editFormData.sender.address.zipCode" size="small" />
                </div>
              </div>
            </el-card>
          </el-col>
          <el-col :span="12" v-if="selectedOrder.recipient">
            <el-card>
              <template #header>
                <div class="card-header">
                  <el-icon><Location /></el-icon>
                  <span>수신자 정보</span>
                </div>
              </template>
              <div class="detail-info">
                <div class="info-row">
                  <span class="label">이름:</span>
                  <span class="value" v-if="!isEditingOrder">{{ selectedOrder.recipient.name || selectedOrder.recipientName }}</span>
                  <el-input v-else v-model="editFormData.recipient.name" size="small" />
                </div>
                <div class="info-row">
                  <span class="label">회사:</span>
                  <span class="value" v-if="!isEditingOrder">{{ selectedOrder.recipient.company || '-' }}</span>
                  <el-input v-else v-model="editFormData.recipient.company" size="small" />
                </div>
                <div class="info-row">
                  <span class="label">이메일:</span>
                  <span class="value" v-if="!isEditingOrder">{{ selectedOrder.recipient.email || '-' }}</span>
                  <el-input v-else v-model="editFormData.recipient.email" size="small" />
                </div>
                <div class="info-row">
                  <span class="label">전화번호:</span>
                  <span class="value" v-if="!isEditingOrder">{{ selectedOrder.recipient.phoneNo || '-' }}</span>
                  <el-input v-else v-model="editFormData.recipient.phoneNo" size="small" />
                </div>
                <div class="info-row">
                  <span class="label">Tax ID:</span>
                  <span class="value" v-if="!isEditingOrder">{{ selectedOrder.recipient.taxId || '-' }}</span>
                  <el-input v-else v-model="editFormData.recipient.taxId" size="small" />
                </div>
                <div class="info-row" v-if="selectedOrder.recipient.address">
                  <span class="label">주소1:</span>
                  <span class="value" v-if="!isEditingOrder">{{ selectedOrder.recipient.address.address1 || '-' }}</span>
                  <el-input v-else v-model="editFormData.recipient.address.address1" size="small" />
                </div>
                <div class="info-row" v-if="selectedOrder.recipient.address">
                  <span class="label">주소2:</span>
                  <span class="value" v-if="!isEditingOrder">{{ selectedOrder.recipient.address.address2 || '-' }}</span>
                  <el-input v-else v-model="editFormData.recipient.address.address2" size="small" />
                </div>
                <div class="info-row" v-if="selectedOrder.recipient.address">
                  <span class="label">도시:</span>
                  <span class="value" v-if="!isEditingOrder">{{ selectedOrder.recipient.address.city || '-' }}</span>
                  <el-input v-else v-model="editFormData.recipient.address.city" size="small" />
                </div>
                <div class="info-row" v-if="selectedOrder.recipient.address">
                  <span class="label">국가:</span>
                  <span class="value" v-if="!isEditingOrder">{{ getCountryNameByCode(selectedOrder.recipient.address.countryCode) }}</span>
                  <el-select v-else v-model="editFormData.recipient.address.countryCode" size="small" placeholder="국가 선택" @change="onRecipientCountryChange" filterable>
                    <el-option 
                      v-for="country in getAllCountries()" 
                      :key="country.code" 
                      :label="`${country.name} (${country.code})`" 
                      :value="country.code" 
                    />
                  </el-select>
                </div>
                <div class="info-row" v-if="selectedOrder.recipient.address">
                  <span class="label">주/도:</span>
                  <span class="value" v-if="!isEditingOrder">{{ selectedOrder.recipient.address.state || '-' }}{{ selectedOrder.recipient.address.stateCode ? ` (${selectedOrder.recipient.address.stateCode})` : '' }}</span>
                  <!-- 지원되는 국가인 경우 SELECT로 선택 -->
                  <el-select 
                    v-else-if="isEditingOrder && isRecipientCountrySupported()"
                    v-model="editFormData.recipient.address.stateCode" 
                    size="small" 
                    placeholder="주/도 선택" 
                    @change="onRecipientStateChange"
                    class="state-select"
                  >
                    <el-option 
                      v-for="state in getRecipientStateOptions()" 
                      :key="state.code" 
                      :label="`${state.name} (${state.code})`" 
                      :value="state.code" 
                    />
                  </el-select>
                  <!-- 지원되지 않는 국가인 경우 INPUT으로 직접 입력 (코드 제외) -->
                  <el-input 
                    v-else-if="isEditingOrder"
                    v-model="editFormData.recipient.address.state" 
                    size="small" 
                    placeholder="주/도 이름 입력"
                    class="state-input"
                  />
                </div>
                <div class="info-row" v-if="selectedOrder.recipient.address">
                  <span class="label">우편번호:</span>
                  <span class="value" v-if="!isEditingOrder">{{ selectedOrder.recipient.address.zipCode || '-' }}</span>
                  <el-input v-else v-model="editFormData.recipient.address.zipCode" size="small" />
                </div>
              </div>
            </el-card>
          </el-col>
        </el-row>

        <!-- 아이템 목록 섹션 -->
        <el-card v-if="selectedOrder.items && selectedOrder.items.length > 0">
          <template #header>
            <div class="card-header">
              <div style="display: flex; align-items: center; gap: 8px;">
                <el-icon><Goods /></el-icon>
                <span>상품 목록 ({{ isEditingOrder ? editFormData.items?.length || 0 : selectedOrder.items.length }}개)</span>
              </div>
              <div v-if="isEditingOrder">
                <el-button type="primary" size="small" @click="addNewEditItem">
                  <el-icon><Plus /></el-icon>
                  아이템 추가
                </el-button>
              </div>
            </div>
          </template>
          <div class="items-container">
            <div 
              v-if="!isEditingOrder"
              v-for="(item, index) in selectedOrder.items" 
              :key="item.id || index"
              class="item-card"
            >
              <el-card>
                <template #header>
                  <div class="item-header">
                    <span class="item-number">상품 {{ index + 1 }}</span>
                    <el-tag type="primary" size="small">{{ item.name }}</el-tag>
                  </div>
                </template>
                <el-row :gutter="20">
                  <el-col :span="8">
                    <div class="item-info">
                      <div class="info-row">
                        <span class="label">상품명:</span>
                        <span class="value">{{ item.name }}</span>
                      </div>
                      <div class="info-row">
                        <span class="label">수량:</span>
                        <span class="value">{{ item.quantity }}개</span>
                      </div>
                      <div class="info-row">
                        <span class="label">무게:</span>
                        <span class="value">{{ item.weight }}{{ item.weightUnit }}</span>
                      </div>
                    </div>
                  </el-col>
                  <el-col :span="8">
                    <div class="item-info">
                      <div class="info-row">
                        <span class="label">단가:</span>
                        <span class="value">{{ formatCurrency(item.unitValue, item.valueCurrency) }}</span>
                      </div>
                      <div class="info-row">
                        <span class="label">화폐:</span>
                        <span class="value">{{ item.valueCurrency }}</span>
                      </div>
                      <div class="info-row">
                        <span class="label">무게 단위:</span>
                        <span class="value">{{ item.weightUnit || '-' }}</span>
                      </div>
                    </div>
                  </el-col>
                  <el-col :span="8">
                    <div class="item-info">
                      <div class="info-row">
                        <span class="label">HS Code:</span>
                        <span class="value">{{ item.itemHsCode || '-' }}</span>
                      </div>
                      <div class="info-row">
                        <span class="label">원산지:</span>
                        <span class="value">{{ item.itemOriginCountryCode || '-' }}</span>
                      </div>
                    </div>
                  </el-col>
                </el-row>
              </el-card>
            </div>
            
            <!-- 편집 모드 아이템 -->
            <div 
              v-else
              v-for="(item, index) in editFormData.items" 
              :key="item.id || index"
              class="item-card"
            >
              <el-card>
                <template #header>
                  <div class="item-header">
                    <div style="display: flex; align-items: center; gap: 8px;">
                      <span class="item-number">상품 {{ index + 1 }}</span>
                      <el-tag v-if="item.isNew" type="success" size="small">신규</el-tag>
                      <el-tag v-else type="info" size="small">기존 ID: {{ item.originalId }}</el-tag>
                    </div>
                    <el-button type="danger" size="small" @click="removeItem(index)">
                      <el-icon><Delete /></el-icon>
                      삭제
                    </el-button>
                  </div>
                </template>
                <el-row :gutter="20">
                  <el-col :span="8">
                    <div class="item-info">
                      <div class="info-row">
                        <span class="label">상품명:</span>
                        <el-input v-model="item.name" size="small" />
                      </div>
                      <div class="info-row">
                        <span class="label">수량:</span>
                        <el-input-number v-model="item.quantity" size="small" :min="1" />
                      </div>
                      <div class="info-row">
                        <span class="label">무게:</span>
                        <el-input-number v-model="item.weight" size="small" :precision="2" :step="0.1" />
                      </div>
                    </div>
                  </el-col>
                  <el-col :span="8">
                    <div class="item-info">
                      <div class="info-row">
                        <span class="label">단가:</span>
                        <el-input-number v-model="item.unitValue" size="small" :precision="2" />
                      </div>
                      <div class="info-row">
                        <span class="label">화폐:</span>
                        <el-select v-model="item.valueCurrency" size="small">
                          <el-option label="KRW" value="KRW" />
                          <el-option label="USD" value="USD" />
                          <el-option label="EUR" value="EUR" />
                        </el-select>
                      </div>
                      <div class="info-row">
                        <span class="label">무게 단위:</span>
                        <el-select v-model="item.weightUnit" size="small">
                          <el-option label="KG" value="KG" />
                          <el-option label="LB" value="LB" />
                        </el-select>
                      </div>
                    </div>
                  </el-col>
                  <el-col :span="8">
                    <div class="item-info">
                      <div class="info-row">
                        <span class="label">HS Code:</span>
                        <el-input v-model="item.itemHsCode" size="small" />
                      </div>
                      <div class="info-row">
                        <span class="label">원산지:</span>
                        <el-input v-model="item.itemOriginCountryCode" size="small" />
                      </div>
                    </div>
                  </el-col>
                </el-row>
              </el-card>
            </div>
          </div>
        </el-card>

      </div>
      
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="closeOrderDetailModal">닫기</el-button>
          <el-button v-if="!isEditingOrder" type="warning" @click="startEditOrder">편집</el-button>
          <el-button v-if="isEditingOrder" @click="cancelEditOrder">취소</el-button>
          <el-button v-if="isEditingOrder" type="primary" @click="saveOrderChanges">저장</el-button>
        </span>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { orderApi } from '@/api/orders'
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
const isEditingOrder = ref(false)
const editFormData = ref({})
const createFormData = ref({
  // 상점 정보
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
    length: 0,
    width: 0,
    height: 0
  },
  
  // 백엔드 필수 필드
  itemContentsType: 'PACKAGE',
  serviceType: 'STANDARD',
  packageType: 'BOX',
  
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
    name: '',
    quantity: 1,
    unitValue: 0,
    valueCurrency: 'KRW',
    weight: 0,
    weightUnit: 'KG',
    itemHsCode: '',
    itemOriginCountryCode: 'KR'
  }]
})
const editingOrder = ref(null)
const isEditMode = ref(false)
const selectedShippingMethod = ref(null)
const selectedShippingPrice = ref(0)
const dateRange = ref([])

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
const isAllSelected = computed(() => {
  return orders.value.length > 0 && selectedOrders.value.length === orders.value.length
})

// Methods
const fetchOrders = async () => {
  try {
    loading.value = true
    
    const params = {
      page: pagination.value.page - 1,
      size: pagination.value.size,
      sort: 'createdAt,desc'
    }
    
    // Add seller ID to filter orders by current seller
    if (authStore.user?.id) {
      params.sellerId = authStore.user.id
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
      console.log('Pagination data:', paginationData)
      
      orders.value = ordersArray || []
      pagination.value.total = paginationData.totalElements || 0
      pagination.value.page = paginationData.page || 1
      
      console.log('Final orders:', orders.value)
      console.log('Final pagination:', pagination.value)
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
    storePlatform: '',
    storeName: '',
    orderNo: '',
    shippingTerm: '',
    orderStatus: 'PENDING',
    parcelCount: 1,
    shipmentActualWeight: 0,
    shipmentVolumeWeight: 0,
    weightUnit: 'KG',
    dimension: {
      length: 0,
      width: 0,
      height: 0
    },
    itemContentsType: 'PACKAGE',
    serviceType: 'STANDARD',
    packageType: 'BOX',
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
      name: '',
      quantity: 1,
      unitValue: 0,
      valueCurrency: 'KRW',
      weight: 0,
      weightUnit: 'KG',
      itemHsCode: '',
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

const openTrackingModal = (order) => {
  selectedOrder.value = order
  showTrackingModal.value = true
}

const closeTrackingModal = () => {
  showTrackingModal.value = false
  selectedOrder.value = null
}

const openShippingModal = () => {
  if (selectedOrdersCount.value === 0) {
    ElMessage.warning('배송 처리할 주문을 선택해주세요.')
    return
  }
  showShippingModal.value = true
}

const closeShippingModal = () => {
  showShippingModal.value = false
  selectedShippingMethod.value = null
  selectedShippingPrice.value = 0
}

const selectShippingMethod = (method, price) => {
  selectedShippingMethod.value = method
  selectedShippingPrice.value = price
}

const confirmShipping = () => {
  if (!selectedShippingMethod.value) {
    ElMessage.warning('배송 방법을 선택해주세요.')
    return
  }
  
  ElMessage.success(`${selectedOrdersCount.value}개 주문에 ${selectedShippingMethod.value.toUpperCase()} 배송이 적용되었습니다.`)
  
  selectedOrders.value = []
  closeShippingModal()
  fetchOrders()
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
    // API 요청 형식에 맞게 데이터 변환
    const apiData = {
      sellerId: authStore.user?.id,
      
      // 상점 정보
      storePlatform: createFormData.value.storePlatform,
      storeName: createFormData.value.storeName,
      orderNo: createFormData.value.orderNo,
      shippingTerm: createFormData.value.shippingTerm,
      
      // 백엔드 필수 필드
      itemContentsType: createFormData.value.itemContentsType,
      serviceType: createFormData.value.serviceType,
      packageType: createFormData.value.packageType,
      
      // 패키지 정보
      parcelCount: createFormData.value.parcelCount,
      shipmentActualWeight: createFormData.value.shipmentActualWeight,
      shipmentVolumeWeight: createFormData.value.shipmentVolumeWeight,
      weightUnit: createFormData.value.weightUnit,
      dimensionLength: createFormData.value.dimension?.length,
      dimensionWidth: createFormData.value.dimension?.width,
      dimensionHeight: createFormData.value.dimension?.height,
      
      // 발송자 정보 (플랫화)
      senderName: createFormData.value.sender.name,
      senderCompany: createFormData.value.sender.company,
      senderEmail: createFormData.value.sender.email,
      senderPhoneNo: createFormData.value.sender.phoneNo,
      senderCountryCode: createFormData.value.sender.address.countryCode,
      senderState: createFormData.value.sender.address.state,
      senderStateCode: createFormData.value.sender.address.stateCode,
      senderCity: createFormData.value.sender.address.city,
      senderAddress1: createFormData.value.sender.address.address1,
      senderAddress2: createFormData.value.sender.address.address2,
      senderZipCode: createFormData.value.sender.address.zipCode,
      
      // 수취자 정보 (플랯화)
      recipientName: createFormData.value.recipient.name,
      recipientCompany: createFormData.value.recipient.company,
      recipientEmail: createFormData.value.recipient.email,
      recipientPhoneNo: createFormData.value.recipient.phoneNo,
      recipientTaxId: createFormData.value.recipient.taxId,
      recipientCountryCode: createFormData.value.recipient.address.countryCode,
      recipientState: createFormData.value.recipient.address.state,
      recipientStateCode: createFormData.value.recipient.address.stateCode,
      recipientCity: createFormData.value.recipient.address.city,
      recipientAddress1: createFormData.value.recipient.address.address1,
      recipientAddress2: createFormData.value.recipient.address.address2,
      recipientZipCode: createFormData.value.recipient.address.zipCode,
      
      // 아이템 정보
      orderItems: createFormData.value.items.map(item => ({
        itemName: item.name,
        itemQuantity: item.quantity,
        itemUnitValue: item.unitValue,
        itemValueCurrency: item.valueCurrency,
        itemWeight: item.weight,
        weightUnit: item.weightUnit,
        itemHSCode: item.itemHsCode,
        itemOriginCountryCode: item.itemOriginCountryCode
      }))
    }
    
    const response = await orderApi.createOrder(apiData)
    
    if (response.data) {
      ElMessage.success('주문이 생성되었습니다.')
      closeCreateModal()
      fetchOrders()
    }
  } catch (error) {
    console.error('주문 생성 실패:', error)
    ElMessage.error('주문 생성에 실패했습니다.')
  }
}

// 주문 생성 - 아이템 추가/삭제
const addNewCreateItem = () => {
  createFormData.value.items.push({
    name: '',
    quantity: 1,
    unitValue: 0,
    valueCurrency: 'KRW',
    weight: 0,
    weightUnit: 'KG',
    itemHsCode: '',
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
    showOrderDetailModal.value = true
  } catch (error) {
    console.error('Failed to fetch order detail:', error)
    selectedOrder.value = order // fallback
    showOrderDetailModal.value = true
  }
}

const closeOrderDetailModal = () => {
  showOrderDetailModal.value = false
  selectedOrder.value = null
  isEditingOrder.value = false
  editFormData.value = {}
}

const startEditOrder = () => {
  isEditingOrder.value = true
  // 기존 데이터를 수정용 폼 데이터로 복사
  editFormData.value = {
    // 스토어 정보
    storePlatform: selectedOrder.value.storePlatform,
    storeName: selectedOrder.value.storeName,
    shippingTerm: selectedOrder.value.shippingTerm,
    
    // 주문 기본정보 (Master No, orderStatus 제외)
    orderNo: selectedOrder.value.orderNo,
    
    // 백엔드 필수 필드들 (편집하지 않지만 저장 시 필요)
    itemContentsType: selectedOrder.value.itemContentsType,
    serviceType: selectedOrder.value.serviceType,
    packageType: selectedOrder.value.packageType,
    sellerId: selectedOrder.value.sellerId,
    
    // 패키지 정보
    parcelCount: selectedOrder.value.parcelCount,
    shipmentActualWeight: selectedOrder.value.shipmentActualWeight,
    shipmentVolumeWeight: selectedOrder.value.shipmentVolumeWeight,
    weightUnit: selectedOrder.value.weightUnit,
    dimension: selectedOrder.value.dimension ? {
      length: selectedOrder.value.dimension.length,
      width: selectedOrder.value.dimension.width,
      height: selectedOrder.value.dimension.height
    } : {},
    
    // 발송자 정보
    sender: selectedOrder.value.sender ? {
      name: selectedOrder.value.sender.name,
      company: selectedOrder.value.sender.company,
      email: selectedOrder.value.sender.email,
      phoneNo: selectedOrder.value.sender.phoneNo,
      address: selectedOrder.value.sender.address ? {
        address1: selectedOrder.value.sender.address.address1,
        address2: selectedOrder.value.sender.address.address2,
        city: selectedOrder.value.sender.address.city,
        state: selectedOrder.value.sender.address.state,
        stateCode: selectedOrder.value.sender.address.stateCode,
        zipCode: selectedOrder.value.sender.address.zipCode,
        countryCode: selectedOrder.value.sender.address.countryCode
      } : {}
    } : {},
    
    // 수신자 정보
    recipient: selectedOrder.value.recipient ? {
      name: selectedOrder.value.recipient.name,
      company: selectedOrder.value.recipient.company,
      email: selectedOrder.value.recipient.email,
      phoneNo: selectedOrder.value.recipient.phoneNo,
      taxId: selectedOrder.value.recipient.taxId,
      address: selectedOrder.value.recipient.address ? {
        address1: selectedOrder.value.recipient.address.address1,
        address2: selectedOrder.value.recipient.address.address2,
        city: selectedOrder.value.recipient.address.city,
        state: selectedOrder.value.recipient.address.state,
        stateCode: selectedOrder.value.recipient.address.stateCode,
        zipCode: selectedOrder.value.recipient.address.zipCode,
        countryCode: selectedOrder.value.recipient.address.countryCode
      } : {}
    } : {},
    
    // 아이템 정보 (기존 아이템 ID 보존)
    items: selectedOrder.value.items ? selectedOrder.value.items.map(item => ({
      id: item.id, // 기존 아이템 ID 보존 (수정용)
      originalId: item.id, // 원본 ID 추가 저장
      name: item.name,
      quantity: item.quantity,
      unitValue: item.unitValue,
      valueCurrency: item.valueCurrency,
      weight: item.weight,
      weightUnit: item.weightUnit,
      itemHsCode: item.itemHsCode,
      itemOriginCountryCode: item.itemOriginCountryCode,
      isNew: false // 기존 아이템 표시
    })) : []
  }
}

const cancelEditOrder = () => {
  isEditingOrder.value = false
  editFormData.value = {}
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
    name: '',
    quantity: 1,
    unitValue: 0,
    valueCurrency: 'KRW',
    weight: 0,
    weightUnit: 'KG',
    itemHsCode: '',
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
    // 백엔드 API 형식에 맞게 데이터 변환 (원본 데이터의 필수 필드들 보존)
    const apiData = {
      storePlatform: editFormData.value.storePlatform,
      orderNo: editFormData.value.orderNo,
      storeName: editFormData.value.storeName,
      shippingTerm: editFormData.value.shippingTerm,
      
      // 원본 데이터에서 필수 필드들 보존
      itemContentsType: selectedOrder.value.itemContentsType || 'DOCUMENT',
      serviceType: selectedOrder.value.serviceType || 'STANDARD', 
      packageType: selectedOrder.value.packageType || 'BOX',
      sellerId: selectedOrder.value.sellerId,
      
      // 발송자 정보 (플랫 구조로 변환)
      senderName: editFormData.value.sender?.name,
      senderCompany: editFormData.value.sender?.company,
      senderEmail: editFormData.value.sender?.email,
      senderPhoneNo: editFormData.value.sender?.phoneNo,
      senderCountryCode: editFormData.value.sender?.address?.countryCode,
      senderState: editFormData.value.sender?.address?.state,
      senderStateCode: editFormData.value.sender?.address?.stateCode,
      senderCity: editFormData.value.sender?.address?.city,
      senderAddress1: editFormData.value.sender?.address?.address1,
      senderAddress2: editFormData.value.sender?.address?.address2,
      senderZipCode: editFormData.value.sender?.address?.zipCode,
      
      // 수신자 정보 (플랫 구조로 변환)
      recipientName: editFormData.value.recipient?.name,
      recipientCompany: editFormData.value.recipient?.company,
      recipientEmail: editFormData.value.recipient?.email,
      recipientPhoneNo: editFormData.value.recipient?.phoneNo,
      recipientTaxId: editFormData.value.recipient?.taxId,
      recipientCountryCode: editFormData.value.recipient?.address?.countryCode,
      recipientState: editFormData.value.recipient?.address?.state,
      recipientStateCode: editFormData.value.recipient?.address?.stateCode,
      recipientCity: editFormData.value.recipient?.address?.city,
      recipientAddress1: editFormData.value.recipient?.address?.address1,
      recipientAddress2: editFormData.value.recipient?.address?.address2,
      recipientZipCode: editFormData.value.recipient?.address?.zipCode,
      
      // 패키지 정보
      parcelCount: editFormData.value.parcelCount,
      shipmentActualWeight: editFormData.value.shipmentActualWeight,
      shipmentVolumeWeight: editFormData.value.shipmentVolumeWeight,
      weightUnit: editFormData.value.weightUnit,
      dimensionLength: editFormData.value.dimension?.length,
      dimensionWidth: editFormData.value.dimension?.width,
      dimensionHeight: editFormData.value.dimension?.height,
      
      // 아이템 목록 (API 형식에 맞게 변환)
      orderItems: editFormData.value.items?.map(item => {
        const orderItem = {
          itemName: item.name,
          itemQuantity: item.quantity,
          itemUnitValue: item.unitValue,
          itemValueCurrency: item.valueCurrency,
          itemWeight: item.weight,
          weightUnit: item.weightUnit,
          itemHSCode: item.itemHsCode,
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
      }
      isEditingOrder.value = false
      editFormData.value = {}
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

// State code data mapping from backend StateCode enum
const stateCodeData = {
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
}

// Country/State selection functions
const isSenderCountrySupported = () => {
  const countryCode = editFormData.value.sender?.address?.countryCode
  return stateCodeData[countryCode] && stateCodeData[countryCode].length > 0
}

const isRecipientCountrySupported = () => {
  const countryCode = editFormData.value.recipient?.address?.countryCode
  return stateCodeData[countryCode] && stateCodeData[countryCode].length > 0
}

const getSenderStateOptions = () => {
  const countryCode = editFormData.value.sender?.address?.countryCode
  return stateCodeData[countryCode] || []
}

const getRecipientStateOptions = () => {
  const countryCode = editFormData.value.recipient?.address?.countryCode
  return stateCodeData[countryCode] || []
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
    const states = stateCodeData[countryCode] || []
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
    const states = stateCodeData[countryCode] || []
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
  width: 50px;
  height: 50px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: bold;
  color: white;
  font-size: 12px;
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