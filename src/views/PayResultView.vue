<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue'
import { useRoute } from 'vue-router'
import LandingNav from '../components/landing/LandingNav.vue'
import LandingFooter from '../components/landing/LandingFooter.vue'
import { useAuth } from '../composables/useAuth'
import { apiGet } from '../utils/api'

const route = useRoute()
const { ensureAuth, refresh, points } = useAuth()

const status = ref('checking') // checking / paid / pending / failed
const order = ref(null)
const message = ref('')

let timer = null
let attempts = 0

async function checkOrder() {
  const orderNo = route.query.order_no || ''
  if (!orderNo) {
    status.value = 'failed'
    message.value = '缺少订单号'
    return
  }
  const data = await apiGet(`/api/pay/result?order_no=${encodeURIComponent(orderNo)}`)
  order.value = data.order
  if (data.order.status === 'paid') {
    status.value = 'paid'
    await refresh() // 刷新积分余额
    clearInterval(timer)
  } else {
    status.value = 'pending'
    attempts += 1
    if (attempts > 10) {
      clearInterval(timer)
      message.value = '支付确认时间较长，请稍后刷新页面查看余额'
    }
  }
}

onMounted(async () => {
  await ensureAuth()
  try {
    await checkOrder()
  } catch (e) {
    status.value = 'failed'
    message.value = e.message
  }
  if (status.value === 'pending') {
    timer = setInterval(async () => {
      try {
        await checkOrder()
      } catch {
        /* 重试 */
      }
      if (status.value === 'paid' || attempts > 10) clearInterval(timer)
    }, 2000)
  }
})

onBeforeUnmount(() => clearInterval(timer))
</script>

<template>
  <div class="pay-page">
    <LandingNav />
    <main class="l-container pay">
      <div class="l-card pay__card">
        <!-- 支付成功 -->
        <div v-if="status === 'paid'" class="pay__state">
          <div class="pay__icon pay__icon--ok">
            <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">
              <path d="M20 6 9 17l-5-5" />
            </svg>
          </div>
          <h1>支付成功，积分已到账 🎉</h1>
          <p class="pay__points">
            到账 <b>{{ order?.points ?? 0 }}</b> 积分，当前余额 <b>{{ points }}</b> 积分
          </p>
          <router-link class="l-btn l-btn--primary pay__btn" to="/tool/poster_image">
            去生成海报
          </router-link>
        </div>

        <!-- 等待支付确认 -->
        <div v-else-if="status === 'pending'" class="pay__state">
          <div class="pay__icon pay__icon--spin">
            <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round">
              <path d="M12 3a9 9 0 1 0 8.5 12.5" />
            </svg>
          </div>
          <h1>等待支付确认…</h1>
          <p>正在确认支付结果，请稍候（约几秒到几十秒）</p>
          <p v-if="message" class="pay__hint">{{ message }}</p>
        </div>

        <!-- 检查失败 -->
        <div v-else class="pay__state">
          <div class="pay__icon pay__icon--err">
            <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M12 9v4M12 17h.01" />
              <path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z" />
            </svg>
          </div>
          <h1>支付结果查询失败</h1>
          <p>{{ message || '请返回首页稍后刷新查看余额，或联系客服处理' }}</p>
        </div>

        <div class="pay__links">
          <router-link to="/">返回首页</router-link>
          <router-link to="/generator">免费生成器</router-link>
        </div>
      </div>
    </main>
    <LandingFooter />
  </div>
</template>

<style scoped>
.pay-page {
  min-height: 100vh;
  background: var(--bg);
  color: var(--text);
}

.pay {
  padding-top: 64px;
  padding-bottom: 80px;
}

.pay__card {
  max-width: 520px;
  margin: 0 auto;
  padding: 40px 32px;
}

.pay__state {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
}

.pay__icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 72px;
  height: 72px;
  border-radius: 50%;
  margin-bottom: 20px;
}

.pay__icon--ok {
  color: #0a9b5e;
  background: rgba(18, 183, 106, 0.12);
}

.pay__icon--err {
  color: #dc2626;
  background: rgba(239, 68, 68, 0.1);
}

.pay__icon--spin {
  color: var(--primary);
  background: rgba(49, 94, 251, 0.1);
  animation: pay-spin 1.2s linear infinite;
}

@keyframes pay-spin {
  to {
    transform: rotate(360deg);
  }
}

.pay__state h1 {
  font-size: 22px;
  font-weight: 800;
  letter-spacing: -0.3px;
}

.pay__state p {
  margin-top: 10px;
  font-size: 14.5px;
  color: var(--text-2);
  line-height: 1.7;
}

.pay__points {
  margin-top: 14px;
  padding: 10px 18px;
  border-radius: 999px;
  background: var(--grad-soft);
}

.pay__points b {
  color: var(--primary-deep);
  font-weight: 800;
}

.pay__btn {
  margin-top: 24px;
}

.pay__hint {
  font-size: 13px;
  color: var(--text-3);
}

.pay__links {
  display: flex;
  justify-content: center;
  gap: 24px;
  margin-top: 28px;
  padding-top: 20px;
  border-top: 1px dashed var(--border);
  font-size: 13.5px;
  color: var(--text-3);
}

.pay__links a {
  color: var(--primary-deep);
  font-weight: 600;
}

@media (max-width: 560px) {
  .pay__card {
    padding: 28px 20px;
  }
}
</style>
