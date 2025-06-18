# O-Ship 셀러 페이지

Vue.js 3 + Composition API + Element Plus로 구축된 O-Ship 셀러 페이지입니다.

## 기술 스택

- **Vue.js 3** - 프론트엔드 프레임워크
- **Composition API** - Vue 3의 새로운 API 방식
- **Element Plus** - UI 컴포넌트 라이브러리
- **Vue Router 4** - 라우팅
- **Pinia** - 상태 관리
- **Axios** - HTTP 클라이언트
- **Vite** - 빌드 도구
- **Toss Payment Widget SDK** - 토스페이먼트 연동

## 주요 기능

### 1. 인증 시스템
- 셀러 전용 로그인
- JWT 기반 토큰 관리
- 자동 토큰 갱신

### 2. 대시보드
- 주문 통계 (총 주문수, 대기중 주문, 배송중 주문, 총 매출)
- 최근 주문 목록
- 빠른 작업 (새 주문 생성, 결제내역 확인, 엑셀 업로드)

### 3. 결제내역 관리
- 결제 내역 조회 및 검색
- 결제 상세 정보 확인
- 결제 취소 기능 (전체/부분 취소)

### 4. 주문 관리
- 주문 목록 조회 및 검색
- 주문 상세 정보 확인
- 주문 생성/수정
- 엑셀 파일 업로드를 통한 일괄 주문 등록
- **체크박스 선택 후 배송 처리**
  - 배송사별 요금 비교
  - 토스페이먼트를 통한 배송비 결제
  - 결제 완료 후 자동 shipment 생성
  - 바코드 생성 및 프린트 기능

### 5. 배송 처리 워크플로우
1. **주문 선택**: 체크박스로 배송 처리할 주문 선택
2. **배송사 선택**: 배송사별 요금 비교 후 최적 옵션 선택
3. **결제**: 토스페이먼트로 배송비 결제
4. **배송 정보 생성**: 결제 완료 후 자동으로 order-shipment 연동
5. **바코드 생성**: MasterNo/1 형태의 바코드 생성
6. **바코드 프린트**: 배송 라벨 프린트

### 6. 바코드 시스템
- **바코드 형식**: `{MasterNo}/1` (1개 상자 고정)
- 바코드 생성 API 호출
- 프린트 가능한 배송 라벨 생성
- 시각적 바코드 미리보기

## 프로젝트 구조

```
src/
├── api/                    # API 호출 함수들
│   ├── index.js           # Axios 설정 및 인터셉터
│   ├── auth.js            # 인증 관련 API
│   ├── orders.js          # 주문 관련 API
│   ├── carriers.js        # 배송사 관련 API
│   ├── payments.js        # 결제 관련 API
│   └── shipments.js       # 배송 관련 API
├── components/            # 재사용 가능한 컴포넌트들
│   ├── orders/           # 주문 관련 컴포넌트
│   ├── payments/         # 결제 관련 컴포넌트
│   ├── shipping/         # 배송사 선택 컴포넌트
│   ├── payment/          # 토스페이먼트 컴포넌트
│   └── barcode/          # 바코드 관련 컴포넌트
├── layouts/              # 레이아웃 컴포넌트
│   └── MainLayout.vue    # 메인 레이아웃
├── router/               # 라우터 설정
│   └── index.js          # 라우트 정의
├── stores/               # Pinia 스토어
│   └── auth.js           # 인증 상태 관리
├── views/                # 페이지 컴포넌트들
│   ├── auth/             # 인증 페이지
│   ├── dashboard/        # 대시보드
│   ├── orders/           # 주문 관리 페이지
│   └── payments/         # 결제내역 페이지
├── App.vue               # 루트 컴포넌트
└── main.js               # 앱 진입점
```

## 설치 및 실행

### 1. 의존성 설치
```bash
npm install
```

### 2. 개발 서버 실행
```bash
npm run dev
```

### 3. 빌드
```bash
npm run build
```

### 4. 미리보기
```bash
npm run preview
```

## API 연동

백엔드 API는 `http://localhost:8080`에서 실행되는 Spring Boot 애플리케이션과 연동됩니다.

### 주요 API 엔드포인트

- **인증**: `/api/v1/auth/login`, `/api/v1/auth/logout`
- **주문**: `/api/v1/orders`, `/api/v1/orders/excel`
- **결제**: `/api/v1/payments`
- **배송사**: `/api/v1/carriers/rates`
- **배송**: `/api/v1/shipments`
- **바코드**: `/api/v1/barcodes/print/{orderId}`

## 환경 설정

- **개발 환경**: `http://localhost:3001`
- **백엔드 API**: `http://localhost:8080`
- **프록시 설정**: `/api/*` → `http://localhost:8080/api/*`

## 토스페이먼트 설정

현재 테스트 키를 사용하고 있습니다. 실제 운영 시에는 실제 클라이언트 키로 변경해야 합니다.

```javascript
const clientKey = 'test_ck_D5GePWvyJnrK0W0k6q8gLzN97Eoq' // 테스트 키
```

## 브라우저 지원

- Chrome (권장)
- Firefox
- Safari
- Edge

## 주요 워크플로우

### 배송 처리 프로세스
1. 셀러가 주문 목록에서 배송할 주문들을 체크박스로 선택
2. "배송 처리" 버튼 클릭
3. 배송사별 요금 정보 모달 표시
4. 원하는 배송사 선택
5. 토스페이먼트로 배송비 결제
6. 결제 완료 후 자동으로:
   - Order와 Shipment 테이블 연결
   - 바코드 생성 (MasterNo/1 형태)
7. 바코드 프린트 다이얼로그 표시
8. 바코드 프린트 완료 후 워크플로우 종료

이 시스템을 통해 셀러는 간편하게 주문을 선택하고, 배송사를 비교하며, 결제와 배송 처리를 한 번에 완료할 수 있습니다.