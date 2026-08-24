<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import LandingNav from '../components/landing/LandingNav.vue'
import LandingFooter from '../components/landing/LandingFooter.vue'
import AccountModal from '../components/landing/AccountModal.vue'
import { useAuth } from '../composables/useAuth'
import { siteConfig } from '../config/siteConfig'
import { generateLocalTool } from '../utils/localGenerators'
import { API_BASE, getToken } from '../utils/api'

const route = useRoute()
const { points, ensureAuth, generate, deleteGeneration, listGenerations } = useAuth()
const billing = siteConfig.billing

const tool = computed(() => billing.tools.find((t) => t.id === route.params.toolId))

const prompt = ref('')
const loading = ref(false)
const result = ref('')
const error = ref('')
const redeemOpen = ref(false)

// 生成结果卡片状态（图片/视频）
const mediaUrl = ref('') // 经鉴权 fetch 后生成的本地 objectURL
const mediaError = ref(false)
const genTime = ref('')
const remainingDays = ref(0)
const deleting = ref(false)

// 历史记录（图片工具：最近 7 天生成）
const historyItems = ref([])
const historyLoading = ref(false)
const historyThumbs = reactive({})

/** 生成结果的媒体端点（API_BASE + 相对路径） */
function mediaEndpoint(path) {
  if (!path) return ''
  return path.startsWith('/api') ? API_BASE + path.slice('/api'.length) : path
}

/** 计算剩余天数（expiresAt 为 SQLite 格式 YYYY-MM-DD HH:MM:SS） */
function calcRemainingDays(expiresAt) {
  if (!expiresAt) return 0
  const exp = new Date(String(expiresAt).replace(' ', 'T'))
  const days = Math.ceil((exp.getTime() - Date.now()) / 86400000)
  return Math.max(days, 0)
}

/** 时间显示（SQLite 格式 → 可读） */
function formatTime(sqlTime) {
  if (!sqlTime) return ''
  return String(sqlTime).replace('T', ' ').slice(0, 16)
}

/** 带鉴权拉取媒体内容 → objectURL（img/video 标签无法带 Authorization 头） */
async function loadMedia(path) {
  mediaUrl.value = ''
  mediaError.value = false
  if (!path) return
  try {
    const res = await fetch(mediaEndpoint(path), {
      headers: { Authorization: `Bearer ${getToken()}` }
    })
    if (!res.ok) throw new Error('load failed')
    const blob = await res.blob()
    mediaUrl.value = URL.createObjectURL(blob)
  } catch {
    mediaError.value = true
  }
}

/** 加载图片生成历史（仅图片工具） */
async function loadHistory() {
  if (tool.value?.type !== 'image') return
  historyLoading.value = true
  try {
    const data = await listGenerations('image')
    historyItems.value = data.items || []
    // 并行加载缩略图（文件端点需鉴权）
    await Promise.all(
      historyItems.value.map(async (item) => {
        if (!item.file_url) return
        try {
          const res = await fetch(mediaEndpoint(item.file_url), {
            headers: { Authorization: `Bearer ${getToken()}` }
          })
          if (!res.ok) return
          const blob = await res.blob()
          historyThumbs[item.task_id] = URL.createObjectURL(blob)
        } catch {
          /* 忽略缩略图失败 */
        }
      })
    )
  } catch {
    /* 历史加载失败不阻塞页面 */
  } finally {
    historyLoading.value = false
  }
}

function handleGenerate() {
  error.value = ''
  if (!tool.value) return
  if (!prompt.value.trim()) {
    error.value = '请先输入内容'
    return
  }

  // 免费文字工具：浏览器本地模板生成，不调用 /api/*、不依赖 Worker/API Key
  if (tool.value.free) {
    try {
      result.value = generateLocalTool(tool.value.id, prompt.value.trim())
    } catch (e) {
      error.value = e?.message || '生成失败，请重试'
    }
    return
  }

  // 付费工具（图片/视频）：积分校验与 AI 调用由 Worker 后端处理
  handlePaidGenerate()
}

async function handlePaidGenerate() {
  if (!(await ensureAuth())) {
    error.value = '网络异常，请刷新后重试'
    return
  }
  loading.value = true
  result.value = null
  mediaUrl.value = ''
  try {
    // 图片/视频工具传 prompt
    const data = await generate(tool.value.id, { prompt: prompt.value.trim() })
    result.value = data
    if (data?.imageUrl) {
      genTime.value = new Date().toLocaleString('zh-CN', { hour12: false }).replace(/\//g, '-')
      remainingDays.value = calcRemainingDays(data.expiresAt)
      loadMedia(data.imageUrl)
      loadHistory() // 刷新历史记录
    }
  } catch (e) {
    if (e.code === 'insufficient_points') {
      error.value = e.message
      redeemOpen.value = true // 积分不足，引导兑换卡密
    } else if (tool.value.type === 'image') {
      // 已扣费后退费（502/ai_error）→ 明确提示积分已退回；未配置服务（501）→ 即将开放
      if (e.status === 502 || e.code === 'ai_error') {
        error.value = '生成失败，积分已退回'
      } else if (e.code === 'image_not_configured') {
        error.value = '图片生成功能即将开放'
      } else {
        error.value = e.message
      }
    } else if (tool.value.type === 'video') {
      error.value = '视频生成功能即将开放'
    } else {
      error.value = e.message
    }
  } finally {
    loading.value = false
  }
}

/** 下载图片/视频（fetch blob → 触发浏览器下载） */
async function downloadMedia() {
  const path = result.value?.imageUrl || result.value?.videoUrl
  if (!path) return
  try {
    const res = await fetch(mediaEndpoint(path), {
      headers: { Authorization: `Bearer ${getToken()}` }
    })
    if (!res.ok) throw new Error()
    const blob = await res.blob()
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    const ext = result.value.type === 'video' ? 'mp4' : 'png'
    a.download = `poi-${result.value.taskId || Date.now()}.${ext}`
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
  } catch {
    /* 忽略下载失败 */
  }
}

/** 删除生成结果（二次确认，不退还积分） */
async function removeResult() {
  if (!result.value?.taskId) return
  const tip =
    result.value.type === 'video' ? '确定删除这个视频吗？删除后无法恢复。' : '确定删除这张图片吗？删除后无法恢复。'
  if (!window.confirm(tip)) return
  deleting.value = true
  try {
    await deleteGeneration(result.value.taskId)
    result.value = null
    mediaUrl.value = ''
    loadHistory() // 同步历史
  } catch (e) {
    error.value = e?.message || '删除失败，请重试'
  } finally {
    deleting.value = false
  }
}

/** 历史记录：下载 */
async function downloadHistory(item) {
  if (!item.file_url) return
  try {
    const res = await fetch(mediaEndpoint(item.file_url), {
      headers: { Authorization: `Bearer ${getToken()}` }
    })
    if (!res.ok) throw new Error()
    const blob = await res.blob()
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `poi-${item.task_id.slice(0, 8)}.png`
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
  } catch {
    /* 忽略下载失败 */
  }
}

/** 历史记录：删除（二次确认，不退还积分） */
async function removeHistory(item) {
  if (!window.confirm('确定删除这张图片吗？删除后无法恢复。')) return
  try {
    await deleteGeneration(item.task_id)
    historyItems.value = historyItems.value.filter((i) => i.task_id !== item.task_id)
    if (historyThumbs[item.task_id]) {
      URL.revokeObjectURL(historyThumbs[item.task_id])
      delete historyThumbs[item.task_id]
    }
  } catch (e) {
    error.value = e?.message || '删除失败，请重试'
  }
}

/** 再次生成（视为新任务，再次扣费） */
function regenerate() {
  if (loading.value) return
  handleGenerate()
}

onMounted(loadHistory)

function copyResult() {
  if (!result.value?.text) return
  const text = result.value.text
  try {
    if (navigator.clipboard?.writeText) navigator.clipboard.writeText(text)
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
  } catch {
    /* 忽略 */
  }
}
</script>

<template>
  <div class="tool-page">
    <LandingNav />
    <main class="l-container tool">
      <!-- 工具不存在 -->
      <div v-if="!tool" class="tool__missing">
        <h1>工具不存在或已下架</h1>
        <router-link class="l-btn l-btn--primary" to="/">返回首页</router-link>
      </div>

      <template v-else>
        <div class="tool__head">
          <router-link to="/" class="tool__back">← 返回首页</router-link>
          <h1 class="tool__title">{{ tool.name }}</h1>
          <p class="tool__desc">{{ tool.desc }}</p>
          <div v-if="tool.type === 'video'" class="tool__notice">
            🚧 视频生成功能即将开放
          </div>
          <div v-else-if="tool.free" class="tool__notice">
            ✅ 免费使用，无需积分，无需兑换卡密
          </div>
          <div v-else class="tool__notice">
            💡 本功能按次消耗 {{ tool.points }} 积分，积分不足时请先兑换卡密。
          </div>
        </div>

        <div class="l-card tool__panel">
          <textarea
            v-model="prompt"
            class="tool__input"
            :placeholder="tool.placeholder"
            rows="5"
          ></textarea>

          <div v-if="!tool.free" class="tool__balance">
            当前剩余积分：<b>{{ points }}</b>
          </div>

          <div class="tool__actions">
            <button
              type="button"
              class="l-btn l-btn--primary l-btn--lg tool__submit"
              :disabled="loading || tool.type === 'video'"
              @click="handleGenerate"
            >
              {{
                loading
                  ? '生成中…（调用 AI）'
                  : tool.type === 'video'
                    ? '即将开放'
                    : tool.free
                      ? '免费生成'
                      : `生成（${tool.points} 积分/次）`
              }}
            </button>
            <button
              v-if="!tool.free"
              type="button"
              class="l-btn l-btn--ghost l-btn--lg"
              @click="redeemOpen = true"
            >
              兑换卡密
            </button>
          </div>

          <p v-if="error" class="tool__error">{{ error }}</p>

          <div v-if="result" class="tool__result">
            <div class="tool__result-head">
              <b>生成结果</b>
              <button v-if="result.text" type="button" class="tool__copy" @click="copyResult">
                一键复制
              </button>
            </div>

            <!-- 免费文字结果 -->
            <pre v-if="result.text" class="tool__result-text">{{ result.text }}</pre>

            <!-- 图片结果卡片 -->
            <div v-else-if="result.imageUrl" class="gen-card">
              <div class="gen-card__meta">
                本次生成消耗 <b>{{ result.deducted }}</b> 积分
                <template v-if="genTime"> · 生成于 {{ genTime }}</template>
                <template v-if="remainingDays > 0"> · 剩余 {{ remainingDays }} 天（7 天后自动删除）</template>
              </div>
              <img v-if="mediaUrl" class="tool__result-image" :src="mediaUrl" alt="生成的海报" />
              <p v-else-if="mediaError" class="gen-card__hint">图片加载失败，可能已过期或被删除</p>
              <div class="gen-card__actions">
                <button type="button" class="l-btn l-btn--ghost" @click="downloadMedia">下载图片</button>
                <button type="button" class="l-btn l-btn--ghost" :disabled="loading" @click="regenerate">
                  再次生成
                </button>
                <button
                  type="button"
                  class="l-btn l-btn--ghost gen-card__danger"
                  :disabled="deleting"
                  @click="removeResult"
                >
                  {{ deleting ? '删除中…' : '删除' }}
                </button>
              </div>
            </div>

            <!-- 视频结果卡片（预留，接入视频 API 后生效） -->
            <div v-else-if="result.videoUrl" class="gen-card">
              <div class="gen-card__meta">
                本次生成消耗 <b>{{ result.deducted }}</b> 积分
                <template v-if="genTime"> · 生成于 {{ genTime }}</template>
                <template v-if="remainingDays > 0"> · 剩余 {{ remainingDays }} 天（7 天后自动删除）</template>
              </div>
              <video v-if="mediaUrl" class="tool__result-video" :src="mediaUrl" controls playsinline></video>
              <p v-else-if="mediaError" class="gen-card__hint">视频加载失败，可能已过期或被删除</p>
              <div class="gen-card__actions">
                <button type="button" class="l-btn l-btn--ghost" @click="downloadMedia">下载视频</button>
                <button type="button" class="l-btn l-btn--ghost" :disabled="loading" @click="regenerate">
                  再次生成
                </button>
                <button
                  type="button"
                  class="l-btn l-btn--ghost gen-card__danger"
                  :disabled="deleting"
                  @click="removeResult"
                >
                  {{ deleting ? '删除中…' : '删除' }}
                </button>
              </div>
            </div>
          </div>

          <!-- 历史记录（图片工具） -->
          <div v-if="tool.type === 'image'" class="tool__history">
            <div class="tool__history-head">
              <b>历史记录</b>
              <span class="tool__history-hint">最近 7 天的图片生成</span>
            </div>
            <p v-if="historyLoading" class="tool__history-empty">加载中…</p>
            <p v-else-if="historyItems.length === 0" class="tool__history-empty">暂无历史记录</p>
            <div v-else class="tool__history-list">
              <div v-for="item in historyItems" :key="item.task_id" class="tool__history-item">
                <img
                  v-if="historyThumbs[item.task_id]"
                  class="tool__history-thumb"
                  :src="historyThumbs[item.task_id]"
                  alt="历史图片"
                />
                <span v-else class="tool__history-thumb tool__history-thumb--ph">图</span>
                <div class="tool__history-info">
                  <p class="tool__history-meta">
                    生成于 {{ formatTime(item.created_at) }} · -{{ item.points }} 积分 ·
                    剩余 {{ calcRemainingDays(item.expires_at) }} 天
                  </p>
                </div>
                <div class="tool__history-actions">
                  <button type="button" class="tool__copy" @click="downloadHistory(item)">下载</button>
                  <button type="button" class="tool__copy tool__copy--danger" @click="removeHistory(item)">
                    删除
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </template>
    </main>
    <LandingFooter />
    <AccountModal v-model="redeemOpen" @redeemed="redeemOpen = false" />
  </div>
</template>

<style scoped>
.tool-page {
  min-height: 100vh;
  background: var(--bg);
  color: var(--text);
}

.tool {
  padding-top: 48px;
  padding-bottom: 80px;
}

.tool__missing {
  text-align: center;
  padding: 120px 0;
  display: flex;
  flex-direction: column;
  gap: 24px;
  align-items: center;
}

.tool__missing h1 {
  font-size: 26px;
  font-weight: 800;
}

.tool__head {
  max-width: 720px;
  margin: 0 auto 28px;
}

.tool__back {
  font-size: 13.5px;
  color: var(--text-3);
  transition: color 0.18s ease;
}

.tool__back:hover {
  color: var(--primary-deep);
}

.tool__title {
  margin-top: 14px;
  font-size: clamp(26px, 4vw, 34px);
  font-weight: 800;
  letter-spacing: -0.5px;
}

.tool__desc {
  margin-top: 10px;
  font-size: 15px;
  color: var(--text-2);
}

.tool__points {
  color: var(--primary-deep);
  font-weight: 800;
}

.tool__notice {
  margin-top: 14px;
  padding: 10px 14px;
  border-radius: 12px;
  background: rgba(245, 158, 11, 0.1);
  border: 1px solid rgba(245, 158, 11, 0.25);
  font-size: 13px;
  color: #92600a;
  line-height: 1.6;
}

.tool__panel {
  max-width: 720px;
  margin: 0 auto;
  padding: 28px;
}

.tool__input {
  width: 100%;
  padding: 14px 16px;
  border-radius: 12px;
  border: 1px solid var(--border-strong);
  background: var(--surface);
  color: var(--text);
  font-size: 15px;
  font-family: inherit;
  line-height: 1.7;
  resize: vertical;
  outline: none;
  transition: border-color 0.18s ease, box-shadow 0.18s ease;
}

.tool__input::placeholder {
  color: var(--text-3);
}

.tool__input:focus {
  border-color: rgba(49, 94, 251, 0.6);
  box-shadow: 0 0 0 3px rgba(49, 94, 251, 0.14);
}

.tool__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  margin-top: 16px;
}

.tool__submit:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.tool__error {
  margin-top: 16px;
  padding: 11px 14px;
  border-radius: 11px;
  background: rgba(239, 68, 68, 0.1);
  color: #dc2626;
  font-size: 13.5px;
  line-height: 1.6;
}

/* 剩余积分 */
.tool__balance {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 16px;
  padding: 10px 14px;
  border-radius: 11px;
  background: var(--grad-soft);
  border: 1px solid var(--border);
  font-size: 13.5px;
  color: var(--text-2);
}

.tool__balance b {
  font-size: 16px;
  font-weight: 800;
  color: var(--primary-deep);
}

/* 历史记录 */
.tool__history {
  margin-top: 26px;
  padding-top: 18px;
  border-top: 1px dashed var(--border-strong);
}

.tool__history-head {
  display: flex;
  align-items: baseline;
  gap: 10px;
  margin-bottom: 12px;
  font-size: 15px;
}

.tool__history-hint {
  font-size: 12px;
  color: var(--text-3);
}

.tool__history-empty {
  padding: 18px 0;
  text-align: center;
  font-size: 13px;
  color: var(--text-3);
}

.tool__history-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.tool__history-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 12px;
  border-radius: 12px;
  background: var(--surface-2);
  border: 1px solid var(--border);
}

.tool__history-thumb {
  flex-shrink: 0;
  width: 56px;
  height: 56px;
  border-radius: 9px;
  object-fit: cover;
  border: 1px solid var(--border-strong);
  background: var(--surface);
}

.tool__history-thumb--ph {
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 15px;
  color: var(--text-3);
}

.tool__history-info {
  flex: 1;
  min-width: 0;
}

.tool__history-meta {
  font-size: 12.5px;
  color: var(--text-2);
  line-height: 1.5;
}

.tool__history-actions {
  display: flex;
  gap: 8px;
  flex-shrink: 0;
}

.tool__copy--danger {
  border-color: rgba(239, 68, 68, 0.35);
  color: #dc2626;
  background: rgba(239, 68, 68, 0.06);
}

.tool__copy--danger:hover {
  background: #dc2626;
  color: #fff;
}

.tool__result {
  margin-top: 22px;
  padding-top: 18px;
  border-top: 1px dashed var(--border-strong);
}

.tool__result-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
  font-size: 15px;
}

.tool__copy {
  padding: 6px 14px;
  border-radius: 999px;
  border: 1px solid rgba(49, 94, 251, 0.3);
  color: var(--primary-deep);
  background: rgba(49, 94, 251, 0.07);
  font-size: 12.5px;
  font-weight: 600;
  transition: background 0.18s ease, color 0.18s ease;
}

.tool__copy:hover {
  background: var(--primary);
  color: #fff;
}

.tool__result-text {
  white-space: pre-wrap;
  word-break: break-all;
  font-family: inherit;
  font-size: 14.5px;
  line-height: 1.85;
  color: var(--text);
  background: var(--surface-2);
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 16px;
}

.tool__result-image {
  display: block;
  width: 100%;
  max-width: 480px;
  margin: 0 auto;
  border-radius: 14px;
  border: 1px solid var(--border-strong);
  box-shadow: var(--shadow-card);
}

.tool__result-video {
  display: block;
  width: 100%;
  max-width: 480px;
  margin: 0 auto;
  border-radius: 14px;
  border: 1px solid var(--border-strong);
  box-shadow: var(--shadow-card);
  background: #000;
}

/* 生成结果卡片（图片/视频） */
.gen-card__meta {
  margin-bottom: 12px;
  font-size: 13px;
  color: var(--text-3);
}

.gen-card__meta b {
  color: var(--primary-deep);
  font-weight: 800;
}

.gen-card__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-top: 14px;
}

.gen-card__hint {
  padding: 12px 14px;
  border-radius: 11px;
  background: var(--surface-2);
  border: 1px solid var(--border);
  font-size: 13px;
  color: var(--text-3);
}

.gen-card__danger {
  border-color: rgba(239, 68, 68, 0.35);
  color: #dc2626;
  background: rgba(239, 68, 68, 0.06);
}

.gen-card__danger:hover {
  background: #dc2626;
  color: #fff;
}

@media (max-width: 640px) {
  .tool__panel {
    padding: 20px;
  }

  .tool__actions .l-btn {
    flex: 1;
  }
}
</style>
