<template>
  <div class="signup-container">
    <div class="signup-card">
      <div class="signup-header">
        <h1>셀러 회원가입</h1>
        <p>오십 플랫폼에 가입하여 글로벌 배송 서비스를 이용하세요</p>
      </div>
      
      <el-form
        ref="signupFormRef"
        :model="signupForm"
        :rules="rules"
        label-position="top"
        class="signup-form"
        @submit.prevent="handleSignup"
      >
        <!-- 계정 정보 섹션 -->
        <div class="form-section">
          <h3>계정 정보</h3>
          <el-row :gutter="20">
            <el-col :span="24">
              <el-form-item label="이메일" prop="email">
                <el-input
                  v-model="signupForm.email"
                  type="email"
                  placeholder="example@email.com"
                  prefix-icon="Message"
                />
              </el-form-item>
            </el-col>
            <el-col :span="24">
              <el-form-item label="비밀번호" prop="password">
                <el-input
                  v-model="signupForm.password"
                  type="password"
                  placeholder="비밀번호를 입력하세요"
                  prefix-icon="Lock"
                  show-password
                />
              </el-form-item>
            </el-col>
            <el-col :span="24">
              <el-form-item label="비밀번호 확인" prop="confirmPassword">
                <el-input
                  v-model="signupForm.confirmPassword"
                  type="password"
                  placeholder="비밀번호를 다시 입력하세요"
                  prefix-icon="Lock"
                  show-password
                />
              </el-form-item>
            </el-col>
          </el-row>
        </div>

        <!-- 개인 정보 섹션 -->
        <div class="form-section">
          <h3>개인 정보</h3>
          <el-row :gutter="20">
            <el-col :span="12">
              <el-form-item label="성" prop="lastName">
                <el-input
                  v-model="signupForm.lastName"
                  placeholder="성"
                />
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="이름" prop="firstName">
                <el-input
                  v-model="signupForm.firstName"
                  placeholder="이름"
                />
              </el-form-item>
            </el-col>
            <el-col :span="24">
              <el-form-item label="휴대폰 번호" prop="phoneNo">
                <el-input
                  v-model="signupForm.phoneNo"
                  placeholder="010-1234-5678"
                />
              </el-form-item>
            </el-col>
          </el-row>
        </div>

        <!-- 회사 정보 섹션 -->
        <div class="form-section">
          <h3>회사 정보</h3>
          <el-row :gutter="20">
            <el-col :span="24">
              <el-form-item label="회사명" prop="companyName">
                <el-input
                  v-model="signupForm.companyName"
                  placeholder="회사명을 입력하세요"
                />
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="사업자등록번호" prop="companyRegisterNo">
                <el-input
                  v-model="signupForm.companyRegisterNo"
                  placeholder="123-45-67890"
                />
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="회사 전화번호" prop="companyTelNo">
                <el-input
                  v-model="signupForm.companyTelNo"
                  placeholder="02-123-4567"
                />
              </el-form-item>
            </el-col>
          </el-row>
        </div>

        <!-- 주소 정보 섹션 -->
        <div class="form-section">
          <h3>주소 정보</h3>
          <el-row :gutter="20">
            <el-col :span="12">
              <el-form-item label="국가" prop="address.country">
                <el-select
                  v-model="signupForm.address.country"
                  placeholder="국가 선택"
                  filterable
                  @change="onCountryChange"
                >
                  <el-option
                    v-for="country in countries"
                    :key="country.code"
                    :label="country.name"
                    :value="country.code"
                  />
                </el-select>
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="도시" prop="address.city">
                <el-input
                  v-model="signupForm.address.city"
                  placeholder="도시"
                />
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="주/도" prop="address.state">
                <el-select
                  v-if="isCountrySupported"
                  v-model="signupForm.address.state"
                  placeholder="주/도 선택"
                  filterable
                >
                  <el-option
                    v-for="state in stateOptions"
                    :key="state.code"
                    :label="state.name"
                    :value="state.code"
                  />
                </el-select>
                <el-input
                  v-else
                  v-model="signupForm.address.state"
                  placeholder="주/도"
                />
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="우편번호" prop="address.zipCode">
                <el-input
                  v-model="signupForm.address.zipCode"
                  placeholder="우편번호"
                />
              </el-form-item>
            </el-col>
            <el-col :span="24">
              <el-form-item label="상세주소 1" prop="address.detail1">
                <el-input
                  v-model="signupForm.address.detail1"
                  placeholder="도로명 주소"
                />
              </el-form-item>
            </el-col>
            <el-col :span="24">
              <el-form-item label="상세주소 2" prop="address.detail2">
                <el-input
                  v-model="signupForm.address.detail2"
                  placeholder="동/호수 등 상세 주소"
                />
              </el-form-item>
            </el-col>
          </el-row>
        </div>

        <el-form-item>
          <el-button
            type="primary"
            native-type="submit"
            :loading="loading"
            class="submit-button"
          >
            회원가입
          </el-button>
        </el-form-item>

        <div class="login-link">
          이미 계정이 있으신가요?
          <router-link to="/login">로그인</router-link>
        </div>
      </el-form>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { authApi } from '@/api/auth'
import { ElMessage } from 'element-plus'

const router = useRouter()
const signupFormRef = ref()
const loading = ref(false)

const signupForm = ref({
  email: '',
  password: '',
  confirmPassword: '',
  userRole: 'SELLER',
  firstName: '',
  lastName: '',
  phoneNo: '',
  companyName: '',
  companyRegisterNo: '',
  companyTelNo: '',
  address: {
    country: 'KR',
    city: '',
    state: '',
    detail1: '',
    detail2: '',
    zipCode: ''
  }
})

// 국가 및 주/도 데이터
const countries = [
  { code: 'KR', name: '대한민국' },
  { code: 'US', name: '미국' },
  { code: 'CN', name: '중국' },
  { code: 'JP', name: '일본' },
  { code: 'CA', name: '캐나다' },
  { code: 'GB', name: '영국' },
  { code: 'DE', name: '독일' },
  { code: 'FR', name: '프랑스' }
]

const stateData = {
  KR: [
    { code: 'Seoul', name: '서울특별시' },
    { code: 'Busan', name: '부산광역시' },
    { code: 'Daegu', name: '대구광역시' },
    { code: 'Incheon', name: '인천광역시' },
    { code: 'Gwangju', name: '광주광역시' },
    { code: 'Daejeon', name: '대전광역시' },
    { code: 'Ulsan', name: '울산광역시' },
    { code: 'Sejong', name: '세종특별자치시' },
    { code: 'Gyeonggi', name: '경기도' },
    { code: 'Gangwon', name: '강원도' },
    { code: 'ChungBuk', name: '충청북도' },
    { code: 'ChungNam', name: '충청남도' },
    { code: 'JeonBuk', name: '전라북도' },
    { code: 'JeonNam', name: '전라남도' },
    { code: 'GyeongBuk', name: '경상북도' },
    { code: 'GyeongNam', name: '경상남도' },
    { code: 'Jeju', name: '제주특별자치도' }
  ],
  US: [
    { code: 'CA', name: 'California' },
    { code: 'TX', name: 'Texas' },
    { code: 'NY', name: 'New York' },
    { code: 'FL', name: 'Florida' }
    // 더 많은 주 추가 가능
  ]
}

const stateOptions = ref([])
const isCountrySupported = computed(() => {
  return !!stateData[signupForm.value.address.country]
})

const onCountryChange = (country) => {
  signupForm.value.address.state = ''
  stateOptions.value = stateData[country] || []
}

// 초기 주/도 옵션 설정
stateOptions.value = stateData[signupForm.value.address.country] || []

// 유효성 검사 규칙
const validatePassword = (rule, value, callback) => {
  if (value === '') {
    callback(new Error('비밀번호를 입력해주세요'))
  } else if (value.length < 8) {
    callback(new Error('비밀번호는 최소 8자 이상이어야 합니다'))
  } else if (!/(?=.*[a-zA-Z])(?=.*[0-9])(?=.*[!@#$%^&*])/.test(value)) {
    callback(new Error('비밀번호는 영문, 숫자, 특수문자를 포함해야 합니다'))
  } else {
    callback()
  }
}

const validateConfirmPassword = (rule, value, callback) => {
  if (value === '') {
    callback(new Error('비밀번호 확인을 입력해주세요'))
  } else if (value !== signupForm.value.password) {
    callback(new Error('비밀번호가 일치하지 않습니다'))
  } else {
    callback()
  }
}

const validatePhoneNumber = (rule, value, callback) => {
  const phoneRegex = /^010-\d{4}-\d{4}$/
  if (!phoneRegex.test(value)) {
    callback(new Error('올바른 휴대폰 번호 형식이 아닙니다 (예: 010-1234-5678)'))
  } else {
    callback()
  }
}

const validateBusinessNumber = (rule, value, callback) => {
  const businessRegex = /^\d{3}-\d{2}-\d{5}$/
  if (!businessRegex.test(value)) {
    callback(new Error('올바른 사업자등록번호 형식이 아닙니다 (예: 123-45-67890)'))
  } else {
    callback()
  }
}

const rules = {
  email: [
    { required: true, message: '이메일을 입력해주세요', trigger: 'blur' },
    { type: 'email', message: '올바른 이메일 형식이 아닙니다', trigger: 'blur' }
  ],
  password: [
    { required: true, validator: validatePassword, trigger: 'blur' }
  ],
  confirmPassword: [
    { required: true, validator: validateConfirmPassword, trigger: 'blur' }
  ],
  firstName: [
    { required: true, message: '이름을 입력해주세요', trigger: 'blur' }
  ],
  lastName: [
    { required: true, message: '성을 입력해주세요', trigger: 'blur' }
  ],
  phoneNo: [
    { required: true, validator: validatePhoneNumber, trigger: 'blur' }
  ],
  companyName: [
    { required: true, message: '회사명을 입력해주세요', trigger: 'blur' }
  ],
  companyRegisterNo: [
    { required: true, validator: validateBusinessNumber, trigger: 'blur' }
  ],
  companyTelNo: [
    { required: true, message: '회사 전화번호를 입력해주세요', trigger: 'blur' }
  ],
  'address.country': [
    { required: true, message: '국가를 선택해주세요', trigger: 'change' }
  ],
  'address.city': [
    { required: true, message: '도시를 입력해주세요', trigger: 'blur' }
  ],
  'address.state': [
    { required: true, message: '주/도를 입력해주세요', trigger: 'blur' }
  ],
  'address.detail1': [
    { required: true, message: '상세주소를 입력해주세요', trigger: 'blur' }
  ],
  'address.zipCode': [
    { required: true, message: '우편번호를 입력해주세요', trigger: 'blur' }
  ]
}

const handleSignup = async () => {
  try {
    await signupFormRef.value.validate()
    loading.value = true

    // 비밀번호 확인 필드 제거
    const { confirmPassword, ...signupData } = signupForm.value
    
    const response = await authApi.signup(signupData)
    
    if (response.data) {
      ElMessage.success('회원가입이 완료되었습니다. 로그인해주세요.')
      router.push('/login')
    }
  } catch (error) {
    if (error.response?.data?.message) {
      ElMessage.error(error.response.data.message)
    } else {
      ElMessage.error('회원가입 중 오류가 발생했습니다.')
    }
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.signup-container {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 20px;
}

.signup-card {
  background: white;
  border-radius: 20px;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.1);
  width: 100%;
  max-width: 800px;
  padding: 40px;
}

.signup-header {
  text-align: center;
  margin-bottom: 40px;
}

.signup-header h1 {
  font-size: 32px;
  color: #2d3748;
  margin-bottom: 10px;
}

.signup-header p {
  color: #718096;
  font-size: 16px;
}

.signup-form {
  max-width: 100%;
}

.form-section {
  margin-bottom: 30px;
  padding-bottom: 20px;
  border-bottom: 1px solid #e2e8f0;
}

.form-section:last-of-type {
  border-bottom: none;
}

.form-section h3 {
  color: #4a5568;
  font-size: 18px;
  margin-bottom: 20px;
}

.el-form-item {
  margin-bottom: 18px;
}

:deep(.el-input__wrapper) {
  box-shadow: 0 0 0 1px #e2e8f0 inset;
}

:deep(.el-input__wrapper:hover) {
  box-shadow: 0 0 0 1px #cbd5e0 inset;
}

:deep(.el-input__wrapper.is-focus) {
  box-shadow: 0 0 0 1px #667eea inset;
}

.submit-button {
  width: 100%;
  height: 48px;
  font-size: 16px;
  margin-top: 20px;
}

.login-link {
  text-align: center;
  margin-top: 20px;
  color: #718096;
}

.login-link a {
  color: #667eea;
  text-decoration: none;
  font-weight: 500;
}

.login-link a:hover {
  text-decoration: underline;
}
</style>