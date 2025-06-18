<template>
  <el-container class="main-layout">
    <el-aside class="sidebar" width="250px">
      <div class="logo">
        <h2>O-Ship 셀러</h2>
      </div>
      
      <el-menu
        :default-active="$route.path"
        class="sidebar-menu"
        router
        unique-opened
      >
        <el-menu-item index="/">
          <el-icon><HomeFilled /></el-icon>
          <span>대시보드</span>
        </el-menu-item>
        
        <el-menu-item index="/payments">
          <el-icon><CreditCard /></el-icon>
          <span>결제내역</span>
        </el-menu-item>
        
        <el-menu-item index="/orders">
          <el-icon><Document /></el-icon>
          <span>주문</span>
        </el-menu-item>
      </el-menu>
    </el-aside>

    <el-container>
      <el-header class="header">
        <div class="header-content">
          <div class="breadcrumb">
            <el-breadcrumb separator="/">
              <el-breadcrumb-item :to="{ path: '/' }">홈</el-breadcrumb-item>
              <el-breadcrumb-item v-if="$route.meta.title">
                {{ $route.meta.title }}
              </el-breadcrumb-item>
            </el-breadcrumb>
          </div>
          
          <div class="user-actions">
            <el-dropdown @command="handleCommand">
              <span class="user-dropdown">
                <el-icon><User /></el-icon>
                {{ authStore.user?.name || '셀러' }}
                <el-icon><ArrowDown /></el-icon>
              </span>
              <template #dropdown>
                <el-dropdown-menu>
                  <el-dropdown-item command="logout">로그아웃</el-dropdown-item>
                </el-dropdown-menu>
              </template>
            </el-dropdown>
          </div>
        </div>
      </el-header>

      <el-main class="main">
        <router-view />
      </el-main>
    </el-container>
  </el-container>
</template>

<script setup>
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { ElMessage } from 'element-plus'

const router = useRouter()
const authStore = useAuthStore()

const handleCommand = async (command) => {
  if (command === 'logout') {
    try {
      await authStore.logout()
      ElMessage.success('로그아웃되었습니다')
      router.push('/login')
    } catch (error) {
      console.error('Logout error:', error)
    }
  }
}
</script>

<style scoped>
.main-layout {
  height: 100vh;
}

.sidebar {
  background-color: #001529;
  color: white;
}

.logo {
  height: 60px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-bottom: 1px solid #303030;
  color: white;
}

.logo h2 {
  font-size: 18px;
  font-weight: 600;
}

.sidebar-menu {
  border: none;
  background-color: #001529;
}

.sidebar-menu .el-menu-item {
  color: rgba(255, 255, 255, 0.65);
}

.sidebar-menu .el-menu-item:hover {
  background-color: #1890ff;
  color: white;
}

.sidebar-menu .el-menu-item.is-active {
  background-color: #1890ff;
  color: white;
}

.header {
  background-color: white;
  border-bottom: 1px solid #e8e8e8;
  padding: 0 24px;
  height: 60px;
}

.header-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
  height: 100%;
}

.user-dropdown {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  padding: 8px 12px;
  border-radius: 4px;
  transition: background-color 0.2s;
}

.user-dropdown:hover {
  background-color: #f5f5f5;
}

.main {
  background-color: #f0f2f5;
  padding: 24px;
}
</style>