<script setup>
import { RouterView, useRoute, useRouter } from 'vue-router'
import { computed, watch, onMounted } from 'vue'
import ToastHost from './components/ToastHost.vue'
import { useAuth } from './composables/useAuth'

const route = useRoute()
const router = useRouter()
const isLanding = computed(() => route.meta.landing === true)

// 应用启动：恢复登录态 + 处理支付宝回跳（真实路径 /?pay_result=<orderNo> → hash 结果页）
onMounted(() => {
  useAuth().init()
  const payResult = new URLSearchParams(location.search).get('pay_result')
  if (payResult) {
    router.replace({ path: '/pay/result', query: { order_no: payResult } })
  }
})

// 官网（landing）页面：body 切换到浅色主题；工具页保持深色主题
watch(
  isLanding,
  (v) => {
    document.body.classList.toggle('landing', v)
    // 同步移动端浏览器地址栏主题色
    document
      .querySelector('meta[name="theme-color"]')
      ?.setAttribute('content', v ? '#f6f8fc' : '#0a0e1f')
  },
  { immediate: true }
)
</script>

<template>
  <div class="app-shell" :class="{ 'app-shell--landing': isLanding }">
    <!-- 工具页深色背景装饰光晕 / 网格（官网不渲染） -->
    <template v-if="!isLanding">
      <div class="bg-glow bg-glow--1" aria-hidden="true"></div>
      <div class="bg-glow bg-glow--2" aria-hidden="true"></div>
      <div class="bg-grid" aria-hidden="true"></div>
    </template>

    <RouterView />
    <ToastHost />
  </div>
</template>

<style scoped>
/* 官网页面：放开 overflow，保证顶部 sticky 导航正常吸顶 */
.app-shell--landing {
  overflow: visible;
}
</style>
