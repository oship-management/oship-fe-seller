import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/login',
      name: 'Login',
      component: () => import('@/views/auth/LoginView.vue'),
      meta: { guest: true }
    },
    {
      path: '/signup',
      name: 'Signup',
      component: () => import('@/views/auth/SignupView.vue'),
      meta: { guest: true }
    },
    {
      path: '/',
      name: 'Dashboard',
      component: () => import('@/layouts/MainLayout.vue'),
      meta: { requiresAuth: true },
      children: [
        {
          path: '',
          name: 'Home',
          component: () => import('@/views/dashboard/DashboardView.vue')
        },
        {
          path: '/payments',
          name: 'Payments',
          component: () => import('@/views/payments/PaymentListView.vue')
        },
        {
          path: '/orders',
          name: 'Orders',
          component: () => import('@/views/orders/OrderListView.vue')
        }
      ]
    }
  ]
})

router.beforeEach((to, from, next) => {
  // localStorage에서 직접 토큰 확인 (Pinia 반응성 문제 방지)
  const token = localStorage.getItem('seller_token')
  const user = localStorage.getItem('seller_user')
  const isAuthenticated = !!token && !!user
  
  console.log('Router guard - Current route:', to.path)
  console.log('Router guard - Token exists:', !!token)
  console.log('Router guard - User exists:', !!user)
  console.log('Router guard - Is authenticated:', isAuthenticated)
  
  if (to.meta.requiresAuth && !isAuthenticated) {
    console.log('Redirecting to login - not authenticated')
    // 토큰이 없으면 localStorage 정리
    localStorage.removeItem('seller_token')
    localStorage.removeItem('seller_refreshToken')
    localStorage.removeItem('seller_user')
    next('/login')
  } else if (to.meta.guest && isAuthenticated) {
    console.log('Redirecting to dashboard - already authenticated')
    next('/')
  } else {
    console.log('Proceeding to route:', to.path)
    next()
  }
})

export default router