<template>
  <router-view />
</template>

<script setup>
import { provide } from 'vue'
import { useAuthStore } from '@/stores/auth'

const authStore = useAuthStore()
provide('authStore', authStore)
</script>

<style>
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

html, body {
  height: 100%;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}

#app {
  height: 100%;
}

/* Element Plus Dialog Custom Style */
:root {
  --el-dialog-margin-top: 1vh;
}
</style>