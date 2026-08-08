<script setup>
import { ref } from 'vue'
import PlanCard from './PlanCard.vue'
import { useToast } from '../composables/useToast'
import { trackCopyResult } from '../utils/analytics'

const props = defineProps({
  result: { type: Object, required: true },
  storeName: { type: String, default: '' },
  // 生成时的表单上下文（埋点用）
  context: { type: Object, default: () => ({}) }
})

const emit = defineEmits(['regenerate'])

const { show } = useToast()
const copied = ref(false)

/** 复制到剪贴板（兼容微信内置浏览器等不支持 Clipboard API 的环境） */
async function copyText() {
  const text = props.result.copyText
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text)
    } else {
      fallbackCopy(text)
    }
    markCopied()
  } catch (e) {
    fallbackCopy(text)
    markCopied()
  }
}

function markCopied() {
  copied.value = true
  // 统计埋点：复制方案（当前仅 console.log）
  trackCopyResult({
    industryCategory: props.context.category || '',
    poiCategory: props.context.subCategory || '',
    city: props.context.city || ''
  })
  show('已复制到剪贴板，去发朋友圈吧 📋')
  setTimeout(() => (copied.value = false), 2000)
}

function fallbackCopy(text) {
  const ta = document.createElement('textarea')
  ta.value = text
  ta.style.position = 'fixed'
  ta.style.opacity = '0'
  document.body.appendChild(ta)
  ta.select()
  try {
    document.execCommand('copy')
  } catch (e) {
    /* ignore */
  }
  document.body.removeChild(ta)
}
</script>

<template>
  <section class="result rise-in" aria-live="polite">
    <div class="result__bar">
      <h2 class="result__title">
        <span class="result__spark">✦</span>
        为你生成 <em>{{ result.plans.length }}</em> 套团购方案
      </h2>
      <button class="btn-regenerate" type="button" @click="emit('regenerate')">
        <span class="btn-regenerate__icon">🔄</span> 重新生成
      </button>
    </div>

    <!-- 三套方案 -->
    <div class="result__plans">
      <PlanCard
        v-for="(plan, i) in result.plans"
        :key="plan.key + '-' + i"
        :plan="plan"
        :index="i"
      />
    </div>

    <!-- 一键复制 -->
    <div class="copy-box card rise-in" :style="{ animationDelay: '460ms' }">
      <div class="copy-box__head">
        <h3 class="copy-box__title">📋 一键复制 · 发朋友圈 / 视频号</h3>
        <button class="btn-copy" type="button" @click="copyText">
          <span class="btn-copy__icon">{{ copied ? '✓' : '⧉' }}</span>
          {{ copied ? '已复制' : '一键复制' }}
        </button>
      </div>
      <pre class="copy-box__preview">{{ result.copyText }}</pre>
    </div>
  </section>
</template>

<style scoped>
.result {
  margin-top: 24px;
  display: flex;
  flex-direction: column;
  gap: 14px;
}

/* ---- 顶部栏 ---- */
.result__bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.result__title {
  font-size: 17px;
  font-weight: 700;
}

.result__title em {
  font-style: normal;
  color: #a78bfa;
}

.result__spark {
  display: inline-block;
  margin-right: 4px;
  animation: pulse-glow 1.6s ease-in-out infinite;
}

.btn-regenerate {
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: 13px;
  color: var(--text-dim);
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid var(--card-border);
  border-radius: 999px;
  padding: 7px 14px;
  transition: all 0.18s ease;
}

.btn-regenerate:active {
  transform: scale(0.95);
  color: #fff;
  border-color: rgba(139, 92, 246, 0.5);
}

/* ---- 方案列表 ---- */
.result__plans {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

/* ---- 复制框 ---- */
.copy-box {
  padding: 16px;
}

.copy-box__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  margin-bottom: 12px;
}

.copy-box__title {
  font-size: 14.5px;
  font-weight: 700;
}

.btn-copy {
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  gap: 5px;
  background: var(--grad-main);
  color: #fff;
  font-size: 13.5px;
  font-weight: 700;
  border-radius: 999px;
  padding: 8px 16px;
  box-shadow: 0 6px 18px rgba(99, 102, 241, 0.35);
  transition: transform 0.15s ease, box-shadow 0.2s ease;
}

.btn-copy:active {
  transform: scale(0.95);
}

.btn-copy__icon {
  font-size: 14px;
}

.copy-box__preview {
  font-family: 'SFMono-Regular', Consolas, 'Courier New', monospace;
  font-size: 12.5px;
  line-height: 1.8;
  color: #c8cff0;
  background: rgba(5, 9, 22, 0.6);
  border: 1px solid var(--card-border);
  border-radius: 12px;
  padding: 13px 14px;
  white-space: pre-wrap;
  word-break: break-all;
}

@media (min-width: 768px) {
  .copy-box {
    padding: 20px;
  }
}
</style>
