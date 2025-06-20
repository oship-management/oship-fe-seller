<template>
  <div class="payment-result">
    <div class="result-content">
      <el-icon class="fail-icon" :size="80">
        <CircleClose />
      </el-icon>
      <h2>결제에 실패했습니다</h2>
      <p class="result-message">{{ errorMessage }}</p>
      
      <div class="error-info" v-if="errorCode">
        <el-descriptions :column="1" border>
          <el-descriptions-item label="에러 코드">{{ errorCode }}</el-descriptions-item>
          <el-descriptions-item label="주문번호" v-if="orderId">{{ orderId }}</el-descriptions-item>
        </el-descriptions>
      </div>
      
      <div class="actions">
        <el-button type="primary" @click="closeWindow">
          닫기
        </el-button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { CircleClose } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'

const route = useRoute()
const errorMessage = ref('결제 처리 중 오류가 발생했습니다.')
const errorCode = ref('')
const orderId = ref('')

const closeWindow = () => {
  // 부모 창에 결제 실패 메시지 전송
  if (window.opener) {
    window.opener.postMessage({
      type: 'PAYMENT_FAIL',
      data: {
        errorCode: errorCode.value,
        errorMessage: errorMessage.value,
        orderId: orderId.value
      }
    }, window.location.origin)
  }
  window.close()
}

onMounted(() => {
  // URL 파라미터에서 에러 정보 추출
  const { code, message, orderId: orderIdParam } = route.query
  
  if (code) {
    errorCode.value = code
  }
  
  if (message) {
    errorMessage.value = decodeURIComponent(message)
  }
  
  if (orderIdParam) {
    orderId.value = orderIdParam
  }
  
  // 결제 실패 메시지
  ElMessage.error('결제에 실패했습니다.')
  
  // 3초 후 자동 닫기
  setTimeout(() => {
    closeWindow()
  }, 3000)
})
</script>

<style scoped>
.payment-result {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 100vh;
  padding: 20px;
  background-color: #f5f7fa;
}

.result-card {
  max-width: 600px;
  width: 100%;
}

.result-content {
  text-align: center;
  padding: 40px 20px;
}

.fail-icon {
  color: #f56c6c;
  margin-bottom: 20px;
}

.result-content h2 {
  font-size: 24px;
  margin-bottom: 10px;
  color: #303133;
}

.result-message {
  font-size: 16px;
  color: #606266;
  margin-bottom: 30px;
}

.error-info {
  margin: 30px 0;
  text-align: left;
}

.actions {
  margin-top: 30px;
  display: flex;
  gap: 10px;
  justify-content: center;
}
</style>