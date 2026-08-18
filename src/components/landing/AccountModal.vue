<script setup>
import { ref, watch, onBeforeUnmount } from 'vue'
import { useAuth } from '../../composables/useAuth'
import { siteConfig } from '../../config/siteConfig'

const props = defineProps({
  modelValue: { type: Boolean, default: false }
})
const emit = defineEmits(['update:modelValue', 'redeemed'])

const { points, redeem, payCreate } = useAuth()
const billing = siteConfig.billing

const tab = ref('redeem')
const cardCode = ref('')
const loading = ref(false)
const error = ref('')
const redeemed = ref(null) // 兑换成功信息
const copied = ref(false)
const payLoading = ref(false)
const payError = ref('')

let copiedTimer = null

watch(
  () => props.modelValue,
  (open) => {
    if (open) {
      error.value = ''
      payError.value = ''
      redeemed.value = null
    }
  }
)

onBeforeUnmount(() => clearTimeout(copiedTimer))

function close() {
  emit('update:modelValue', false)
}

async function handleRedeem() {
  error.value = ''
  const code = cardCode.value.trim().toUpperCase()
  if (!code) {
    error.value = '请输入卡密'
    return
  }
  loading.value = true
  try {
    const data = await redeem(code)
    redeemed.value = data
    cardCode.value = ''
    emit('redeemed', data)
  } catch (e) {
    error.value = e.message
  } finally {
    loading.value = false
  }
}

/** 创建支付宝订单并跳转支付 */
async function handlePay(plan) {
  payError.value = ''
  payLoading.value = true
  try {
    const data = await payCreate(plan.id)
    window.location.href = data.payUrl // 跳转支付宝收银台
  } catch (e) {
    payError.value = e.message
    payLoading.value = false
  }
}

async function copyWechat() {
  const text = siteConfig.contactWechat
  if (!text) return
  try {
    if (navigator.clipboard?.writeText) await navigator.clipboard.writeText(text)
    else {
      const ta = document.createElement('textarea')
      ta.value = text
      ta.style.position = 'fixed'
      ta.style.opacity = '0'
      document.body.appendChild(ta)
      ta.select()
      document.execCommand('copy')
      ta.remove()
    }
    copied.value = true
    clearTimeout(copiedTimer)
    copiedTimer = setTimeout(() => (copied.value = false), 1800)
  } catch {
    /* 忽略复制失败 */
  }
}
</script>

<template>
  <Teleport to="body">
    <Transition name="modal">
      <div v-if="modelValue" class="amask" @click.self="close">
        <div class="amodal" role="dialog" aria-modal="true">
          <button class="amodal__close" type="button" aria-label="关闭" @click="close">✕</button>

          <div class="amodal__tabs">
            <button
              type="button"
              class="amodal__tab"
              :class="{ 'amodal__tab--active': tab === 'redeem' }"
              @click="tab = 'redeem'"
            >
              兑换卡密
            </button>
            <button
              type="button"
              class="amodal__tab"
              :class="{ 'amodal__tab--active': tab === 'pay' }"
              @click="tab = 'pay'"
            >
              在线充值
            </button>
          </div>

          <!-- 兑换卡密 -->
          <div v-if="tab === 'redeem'">
            <p class="amodal__sub">输入卡密兑换{{ billing.currency }}，余额可用于付费 AI 工具</p>

            <p v-if="error" class="amodal__msg amodal__msg--err">{{ error }}</p>

            <div class="amodal__balance">
              当前余额：<b>{{ points }}</b> {{ billing.currency }}
            </div>

            <label class="amodal__label" for="am-card">卡密</label>
            <input
              id="am-card"
              v-model="cardCode"
              class="amodal__input"
              type="text"
              placeholder="VPOI-XXXXXXXX-XXXXXXXX"
              @keyup.enter="handleRedeem"
            />
            <button
              type="button"
              class="amodal__submit amodal__submit--primary"
              :disabled="loading"
              @click="handleRedeem"
            >
              {{ loading ? '兑换中…' : '兑换' }}
            </button>

            <div v-if="redeemed" class="amodal__redeemed">
              <b>兑换成功 ✨</b>
              <p>获得 {{ redeemed.added }} {{ billing.currency }}，当前余额 {{ redeemed.points }} {{ billing.currency }}</p>
            </div>

            <!-- 人工购买引导（无卡密时） -->
            <div class="amodal__buy">
              <div class="amodal__buy-title">没有卡密？也可以人工购买</div>
              <p class="amodal__buy-hint">
                添加商务微信购买卡密：
                <button
                  v-if="siteConfig.contactWechat"
                  type="button"
                  class="amodal__copy"
                  @click="copyWechat"
                >
                  {{ copied ? '已复制 ✓' : siteConfig.contactWechat + '（点击复制）' }}
                </button>
                <template v-else>待配置</template>
              </p>
            </div>
          </div>

          <!-- 在线充值 -->
          <div v-else>
            <p class="amodal__sub">选择套餐，支付宝支付成功后积分自动到账</p>

            <p v-if="payError" class="amodal__msg amodal__msg--err">{{ payError }}</p>

            <div class="amodal__plans amodal__plans--pay">
              <div v-for="p in billing.cardPlans" :key="p.id" class="amodal__plan amodal__plan--pay">
                <div class="amodal__plan-info">
                  <span class="amodal__plan-label">{{ p.label }}</span>
                  <span class="amodal__plan-points">= {{ p.points }} {{ billing.currency }}</span>
                </div>
                <button
                  type="button"
                  class="amodal__pay-btn"
                  :disabled="payLoading"
                  @click="handlePay(p)"
                >
                  {{ payLoading ? '跳转中…' : `¥${p.price} 充值` }}
                </button>
              </div>
            </div>

            <p class="amodal__hint">支付完成后自动到账；若支付未到账，请联系 {{ siteConfig.agentName }} 处理</p>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.amask {
  position: fixed;
  inset: 0;
  z-index: 200;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  background: rgba(11, 21, 51, 0.5);
  backdrop-filter: blur(6px);
  -webkit-backdrop-filter: blur(6px);
}

.amodal {
  /* 自包含浅色变量：官网（浅色）与工具页（深色）通用 */
  --surface: #ffffff;
  --surface-2: #f1f5fb;
  --border: #e6ebf4;
  --border-strong: #d7deec;
  --text: #0b1533;
  --text-2: #46536f;
  --text-3: #8b95ad;
  --primary-deep: #1e46e0;
  --grad-soft: linear-gradient(135deg, rgba(49, 94, 251, 0.08), rgba(124, 92, 252, 0.08));

  position: relative;
  width: 100%;
  max-width: 420px;
  padding: 30px 28px 26px;
  background: var(--surface);
  border: 1px solid var(--border-strong);
  border-radius: 20px;
  box-shadow: 0 30px 70px -30px rgba(11, 21, 51, 0.45);
}

.amodal__close {
  position: absolute;
  top: 14px;
  right: 14px;
  width: 30px;
  height: 30px;
  border-radius: 9px;
  color: var(--text-3);
  font-size: 14px;
  background: var(--surface-2);
  transition: color 0.18s ease, background 0.18s ease;
}

.amodal__close:hover {
  color: var(--text);
  background: var(--border);
}

.amodal__title {
  font-size: 20px;
  font-weight: 800;
  color: var(--text);
}

.amodal__tabs {
  display: flex;
  gap: 6px;
  margin: 16px 0 14px;
  padding: 4px;
  border-radius: 12px;
  background: var(--surface-2);
}

.amodal__tab {
  flex: 1;
  padding: 8px 0;
  border-radius: 9px;
  font-size: 14px;
  font-weight: 600;
  color: var(--text-2);
  transition: color 0.18s ease, background 0.18s ease, box-shadow 0.18s ease;
}

.amodal__tab--active {
  color: var(--text);
  background: var(--surface);
  box-shadow: 0 2px 8px rgba(15, 23, 42, 0.08);
}

.amodal__sub {
  margin-top: 6px;
  font-size: 13px;
  color: var(--text-3);
}

.amodal__msg {
  margin: 12px 0 4px;
  padding: 9px 12px;
  border-radius: 10px;
  font-size: 13px;
  line-height: 1.5;
}

.amodal__msg--err {
  color: #dc2626;
  background: rgba(239, 68, 68, 0.1);
}

.amodal__body {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.amodal__balance {
  margin: 16px 0 4px;
  padding: 10px 14px;
  border-radius: 11px;
  background: var(--grad-soft);
  font-size: 14px;
  color: var(--text-2);
}

.amodal__balance b {
  font-size: 18px;
  font-weight: 800;
  color: var(--primary-deep);
}

.amodal__label {
  display: block;
  margin: 12px 0 7px;
  font-size: 13px;
  font-weight: 600;
  color: var(--text-2);
}

.amodal__input {
  width: 100%;
  padding: 12px 14px;
  border-radius: 11px;
  border: 1px solid var(--border-strong);
  background: var(--surface);
  color: var(--text);
  font-size: 14.5px;
  outline: none;
  transition: border-color 0.18s ease, box-shadow 0.18s ease;
}

.amodal__input::placeholder {
  color: var(--text-3);
}

.amodal__input:focus {
  border-color: rgba(49, 94, 251, 0.6);
  box-shadow: 0 0 0 3px rgba(49, 94, 251, 0.14);
}

.amodal__submit {
  width: 100%;
  margin-top: 12px;
  padding: 13px 26px;
  border-radius: 12px;
  font-size: 15px;
  font-weight: 600;
  line-height: 1;
  cursor: pointer;
  transition: transform 0.18s ease, box-shadow 0.18s ease, opacity 0.18s ease;
  white-space: nowrap;
}

.amodal__submit--primary {
  color: #fff;
  background: linear-gradient(135deg, #315efb 0%, #7c5cfc 60%, #b45cf5 100%);
  box-shadow: 0 10px 24px -8px rgba(72, 84, 251, 0.55);
}

.amodal__submit--primary:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 14px 30px -8px rgba(72, 84, 251, 0.6);
}

.amodal__submit:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

.amodal__redeemed {
  margin-top: 14px;
  padding: 12px 14px;
  border-radius: 11px;
  background: rgba(18, 183, 106, 0.08);
  border: 1px solid rgba(18, 183, 106, 0.25);
}

.amodal__redeemed b {
  font-size: 14.5px;
  color: #0a9b5e;
}

.amodal__redeemed p {
  margin-top: 4px;
  font-size: 13px;
  color: var(--text-2);
}

/* 购买引导 */
.amodal__buy {
  margin-top: 20px;
  padding-top: 16px;
  border-top: 1px dashed var(--border-strong);
}

.amodal__buy-title {
  font-size: 13px;
  font-weight: 700;
  color: var(--text-2);
}

/* 充值套餐 */
.amodal__plans {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-top: 14px;
}

.amodal__plan {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 12px 14px;
  border-radius: 12px;
  background: var(--surface-2);
  border: 1px solid var(--border);
  font-size: 13.5px;
}

.amodal__plan-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.amodal__plan-label {
  color: var(--text);
  font-weight: 700;
}

.amodal__plan-points {
  color: var(--text-3);
  font-size: 12.5px;
}

.amodal__pay-btn {
  flex-shrink: 0;
  padding: 9px 18px;
  border-radius: 10px;
  color: #fff;
  font-size: 13.5px;
  font-weight: 700;
  background: linear-gradient(135deg, #1677ff 0%, #00a0e9 100%);
  box-shadow: 0 6px 16px -6px rgba(22, 119, 255, 0.5);
  transition: transform 0.15s ease, box-shadow 0.18s ease, opacity 0.18s ease;
}

.amodal__pay-btn:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 10px 20px -6px rgba(22, 119, 255, 0.55);
}

.amodal__pay-btn:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

.amodal__buy-hint {
  margin-top: 12px;
  font-size: 13px;
  color: var(--text-2);
  line-height: 1.7;
}

.amodal__copy {
  color: var(--primary-deep);
  font-weight: 700;
  padding: 2px 4px;
  border-radius: 6px;
  transition: background 0.18s ease;
}

.amodal__copy:hover {
  background: var(--surface-2);
}

/* 过渡动画 */
.modal-enter-active,
.modal-leave-active {
  transition: opacity 0.22s ease;
}

.modal-enter-active .amodal,
.modal-leave-active .amodal {
  transition: transform 0.22s ease;
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}

.modal-enter-from .amodal,
.modal-leave-to .amodal {
  transform: translateY(14px) scale(0.98);
}
</style>
