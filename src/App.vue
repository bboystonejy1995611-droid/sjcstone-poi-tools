<script setup>
import { RouterView } from 'vue-router'
import ToastHost from './components/ToastHost.vue'
</script>

<template>
  <div class="app-shell">
    <!-- 背景装饰光晕 -->
    <div class="bg-glow bg-glow--1" aria-hidden="true"></div>
    <div class="bg-glow bg-glow--2" aria-hidden="true"></div>
    <div class="bg-grid" aria-hidden="true"></div>

    <RouterView />
    <ToastHost />
  </div>
</template>
