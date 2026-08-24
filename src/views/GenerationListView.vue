<script setup>
import { ref, reactive, onMounted } from 'vue'
import LandingNav from '../components/landing/LandingNav.vue'
import LandingFooter from '../components/landing/LandingFooter.vue'
import { useAuth } from '../composables/useAuth'
import { API_BASE, getToken } from '../utils/api'

const { listGenerations, deleteGeneration } = useAuth()

const activeType = ref('all')
const items = ref([])
const loading = ref(false)
const error = ref('')
const deletingId = ref('')
/** task_id → objectURL（文件端点需鉴权，img/a 标签无法带 Authorization 头，统一 fetch 后展示） */
const thumbUrls = reactive({})

const tabs = [
  { value: 'all', label: '全部' },
  { value: 'image', label: '图片' },
  { value: 'video', label: '视频' }
]

function mediaEndpoint(path) {
  if (!path) return ''
  return path.startsWith('/api') ? API_BASE + path.slice('/api'.length) : path
}

/** 剩余天数 */
function remainingDays(expiresAt) {
  if (!expiresAt) return 0
  const exp = new Date(String(expiresAt).replace(' ', 'T'))
  const days = Math.ceil((exp.getTime() - Date.now()) / 86400000)
  return Math.max(days, 0)
}

/** 生成时间显示 */
function formatTime(createdAt) {
  if (!createdAt) return ''
  return String(createdAt).replace('T', ' ').slice(0, 16)
}

/** 鉴权拉取图片缩略图 → objectURL */
async function loadThumb(item) {
  if (item.type !== 'image' || !item.file_url) return
  try {
    const res = await fetch(mediaEndpoint(item.file_url), {
      headers: { Authorization: `Bearer ${getToken()}` }
    })
    if (!res.ok) return
    const blob = await res.blob()
    if (thumbUrls[item.task_id]) URL.revokeObjectURL(thumbUrls[item.task_id])
    thumbUrls[item.task_id] = URL.createObjectURL(blob)
  } catch {
    /* 缩略图加载失败时显示占位 */
  }
}

async function load() {
  loading.value = true
  error.value = ''
  try {
    const data = await listGenerations(activeType.value)
    items.value = data.items || []
    // 并行加载图片缩略图
    await Promise.all(items.value.filter((i) => i.type === 'image').map(loadThumb))
  } catch (e) {
    error.value = e?.message || '加载失败，请稍后重试'
  } finally {
    loading.value = false
  }
}

async function switchType(type) {
  if (activeType.value === type) return
  activeType.value = type
  await load()
}

/** 删除记录（二次确认；不退还积分） */
async function removeItem(item) {
  const tip =
    item.type === 'video' ? '确定删除这个视频吗？删除后无法恢复。' : '确定删除这张图片吗？删除后无法恢复。'
  if (!window.confirm(tip)) return
  deletingId.value = item.task_id
  try {
    await deleteGeneration(item.task_id)
    items.value = items.value.filter((i) => i.task_id !== item.task_id)
    if (thumbUrls[item.task_id]) {
      URL.revokeObjectURL(thumbUrls[item.task_id])
      delete thumbUrls[item.task_id]
    }
  } catch (e) {
    error.value = e?.message || '删除失败，请重试'
  } finally {
    deletingId.value = ''
  }
}

/** 预览：鉴权 fetch → objectURL → 新标签打开 */
async function previewItem(item) {
  const path = item.file_url
  if (!path) return
  try {
    const res = await fetch(mediaEndpoint(path), {
      headers: { Authorization: `Bearer ${getToken()}` }
    })
    if (!res.ok) throw new Error()
    const blob = await res.blob()
    const url = URL.createObjectURL(blob)
    window.open(url, '_blank', 'noopener')
    setTimeout(() => URL.revokeObjectURL(url), 60000)
  } catch {
    /* 忽略预览失败 */
  }
}

/** 下载文件 */
async function downloadItem(item) {
  const path = item.file_url
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
    a.download = `poi-${item.task_id.slice(0, 8)}.${item.type === 'video' ? 'mp4' : 'png'}`
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
  } catch {
    /* 忽略下载失败 */
  }
}

onMounted(load)
</script>

<template>
  <div class="gen-page">
    <LandingNav />
    <main class="l-container gen">
      <div class="gen__head">
        <router-link to="/" class="gen__back">← 返回首页</router-link>
        <h1 class="gen__title">我的生成</h1>
        <p class="gen__desc">最近 7 天的图片与视频生成记录（文件 7 天后自动清理）</p>
      </div>

      <div class="gen__tabs">
        <button
          v-for="t in tabs"
          :key="t.value"
          type="button"
          class="gen__tab"
          :class="{ 'gen__tab--active': activeType === t.value }"
          @click="switchType(t.value)"
        >
          {{ t.label }}
        </button>
      </div>

      <p v-if="error" class="gen__error">{{ error }}</p>
      <p v-if="loading" class="gen__empty">加载中…</p>

      <div v-else-if="items.length === 0" class="gen__empty">
        <p>暂无生成记录</p>
        <router-link class="l-btn l-btn--primary" to="/">去看看 AI 工具</router-link>
      </div>

      <div v-else class="gen__list">
        <div v-for="item in items" :key="item.task_id" class="gen-card l-card">
          <div class="gen-card__main">
            <div class="gen-card__thumb">
              <template v-if="item.type === 'image'">
                <img
                  v-if="thumbUrls[item.task_id]"
                  :src="thumbUrls[item.task_id]"
                  alt="生成图片缩略图"
                  loading="lazy"
                />
                <span v-else class="gen-card__placeholder">图</span>
              </template>
              <template v-else>
                <span class="gen-card__placeholder">🎬</span>
              </template>
            </div>
            <div class="gen-card__info">
              <div class="gen-card__row">
                <b>{{ item.type === 'image' ? '图片' : '视频' }}</b>
                <span class="gen-card__badge">-{{ item.points }} 积分</span>
              </div>
              <p class="gen-card__prompt" :title="item.prompt">{{ item.prompt }}</p>
              <p class="gen-card__meta">
                生成于 {{ formatTime(item.created_at) }} · 剩余 {{ remainingDays(item.expires_at) }} 天
                <template v-if="item.model"> · {{ item.model }}</template>
              </p>
            </div>
          </div>
          <div class="gen-card__actions">
            <button
              v-if="item.file_url"
              type="button"
              class="l-btn l-btn--ghost"
              @click="previewItem(item)"
            >
              预览
            </button>
            <button type="button" class="l-btn l-btn--ghost" @click="downloadItem(item)">下载</button>
            <button
              type="button"
              class="l-btn l-btn--ghost gen-card__danger"
              :disabled="deletingId === item.task_id"
              @click="removeItem(item)"
            >
              {{ deletingId === item.task_id ? '删除中…' : '删除' }}
            </button>
          </div>
        </div>
      </div>
    </main>
    <LandingFooter />
  </div>
</template>

<style scoped>
.gen-page {
  min-height: 100vh;
  background: var(--bg);
  color: var(--text);
}

.gen {
  padding-top: 48px;
  padding-bottom: 80px;
  max-width: 720px;
}

.gen__back {
  font-size: 13.5px;
  color: var(--text-3);
  transition: color 0.18s ease;
}

.gen__back:hover {
  color: var(--primary-deep);
}

.gen__title {
  margin-top: 14px;
  font-size: clamp(26px, 4vw, 32px);
  font-weight: 800;
  letter-spacing: -0.5px;
}

.gen__desc {
  margin-top: 8px;
  font-size: 14px;
  color: var(--text-2);
}

.gen__tabs {
  display: flex;
  gap: 8px;
  margin: 24px 0 18px;
  padding: 4px;
  border-radius: 12px;
  background: var(--surface-2);
  max-width: 360px;
}

.gen__tab {
  flex: 1;
  padding: 8px 0;
  border-radius: 9px;
  font-size: 14px;
  font-weight: 600;
  color: var(--text-2);
  transition: color 0.18s ease, background 0.18s ease, box-shadow 0.18s ease;
}

.gen__tab--active {
  color: var(--text);
  background: var(--surface);
  box-shadow: 0 2px 8px rgba(15, 23, 42, 0.08);
}

.gen__error {
  margin: 16px 0;
  padding: 11px 14px;
  border-radius: 11px;
  background: rgba(239, 68, 68, 0.1);
  color: #dc2626;
  font-size: 13.5px;
}

.gen__empty {
  padding: 60px 0;
  text-align: center;
  color: var(--text-3);
  display: flex;
  flex-direction: column;
  gap: 18px;
  align-items: center;
  font-size: 14px;
}

.gen__list {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.gen-card {
  padding: 16px;
}

.gen-card__main {
  display: flex;
  gap: 14px;
}

.gen-card__thumb {
  flex-shrink: 0;
  width: 92px;
  height: 92px;
  border-radius: 12px;
  overflow: hidden;
  border: 1px solid var(--border-strong);
  background: var(--surface-2);
  display: flex;
  align-items: center;
  justify-content: center;
}

.gen-card__thumb img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.gen-card__placeholder {
  font-size: 22px;
  color: var(--text-3);
}

.gen-card__info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.gen-card__row {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14.5px;
}

.gen-card__row b {
  font-weight: 800;
}

.gen-card__badge {
  padding: 2px 8px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 700;
  color: var(--primary-deep);
  background: rgba(49, 94, 251, 0.08);
}

.gen-card__prompt {
  font-size: 13px;
  color: var(--text-2);
  line-height: 1.6;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.gen-card__meta {
  font-size: 12.5px;
  color: var(--text-3);
}

.gen-card__actions {
  display: flex;
  gap: 8px;
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px dashed var(--border);
  flex-wrap: wrap;
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

@media (max-width: 560px) {
  .gen-card__thumb {
    width: 72px;
    height: 72px;
  }
}
</style>
