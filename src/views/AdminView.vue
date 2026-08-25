<script setup>
import { ref } from 'vue'
import LandingNav from '../components/landing/LandingNav.vue'
import LandingFooter from '../components/landing/LandingFooter.vue'
import { api } from '../utils/api'
import {
  CARD_DENOMINATIONS,
  normalizeCardCount,
  formatCardExport
} from '../utils/admin'

const adminKey = ref('')
const points = ref(CARD_DENOMINATIONS[0])
const count = ref(10)
const loading = ref(false)
const error = ref('')
const cards = ref([])
const copied = ref(false)

async function generateCards() {
  error.value = ''
  cards.value = []
  const normalizedCount = normalizeCardCount(count.value)
  if (!adminKey.value.trim()) {
    error.value = '请输入管理密钥'
    return
  }
  if (!normalizedCount) {
    error.value = '生成数量需为 1–100 的整数'
    return
  }

  loading.value = true
  try {
    const data = await api('/api/admin/cards', {
      method: 'POST',
      headers: { 'X-Admin-Key': adminKey.value.trim() },
      body: JSON.stringify({ points: Number(points.value), count: normalizedCount })
    })
    cards.value = data.cards || []
  } catch (e) {
    error.value = e.message
  } finally {
    loading.value = false
  }
}

async function copyCards() {
  if (!cards.value.length) return
  const text = formatCardExport(cards.value)
  try {
    await navigator.clipboard.writeText(text)
    copied.value = true
    window.setTimeout(() => (copied.value = false), 1600)
  } catch {
    error.value = '复制失败，请手动选择卡密列表'
  }
}
</script>

<template>
  <div class="admin-page">
    <LandingNav />
    <main class="l-container admin">
      <div class="admin__head">
        <router-link to="/" class="admin__back">← 返回首页</router-link>
        <h1>卡密管理</h1>
        <p>生成 50,000 或 100,000 积分卡密；每张卡密只能兑换一次。</p>
      </div>

      <section class="l-card admin__panel">
        <label class="admin__label" for="admin-key">管理密钥</label>
        <input
          id="admin-key"
          v-model="adminKey"
          class="admin__input"
          type="password"
          autocomplete="off"
          placeholder="Cloudflare 中配置的 ADMIN_KEY"
        />

        <div class="admin__grid">
          <label>
            <span class="admin__label">卡密面额</span>
            <select v-model.number="points" class="admin__input">
              <option v-for="value in CARD_DENOMINATIONS" :key="value" :value="value">
                {{ value.toLocaleString() }} 积分
              </option>
            </select>
          </label>
          <label>
            <span class="admin__label">生成数量</span>
            <input v-model="count" class="admin__input" type="number" min="1" max="100" step="1" />
          </label>
        </div>

        <button class="l-btn l-btn--primary l-btn--lg admin__submit" type="button" :disabled="loading" @click="generateCards">
          {{ loading ? '生成中…' : '生成卡密' }}
        </button>
        <p v-if="error" class="admin__error">{{ error }}</p>

        <div v-if="cards.length" class="admin__result">
          <div class="admin__result-head">
            <b>已生成 {{ cards.length }} 张卡密</b>
            <button class="l-btn l-btn--ghost" type="button" @click="copyCards">
              {{ copied ? '已复制 ✓' : '复制全部' }}
            </button>
          </div>
          <textarea class="admin__codes" readonly :value="formatCardExport(cards)" rows="12"></textarea>
          <p>请妥善保存；页面刷新后不会保留本次明文列表。</p>
        </div>
      </section>
    </main>
    <LandingFooter />
  </div>
</template>

<style scoped>
.admin-page {
  min-height: 100vh;
  background: var(--bg);
  color: var(--text);
}

.admin {
  max-width: 760px;
  padding-top: 48px;
  padding-bottom: 80px;
}

.admin__head {
  margin-bottom: 24px;
}

.admin__back {
  font-size: 13.5px;
  color: var(--text-3);
}

.admin__head h1 {
  margin-top: 14px;
  font-size: clamp(26px, 4vw, 34px);
  font-weight: 800;
}

.admin__head p,
.admin__result p {
  margin-top: 8px;
  color: var(--text-2);
  font-size: 14px;
  line-height: 1.7;
}

.admin__panel {
  padding: 28px;
}

.admin__label {
  display: block;
  margin-bottom: 7px;
  color: var(--text-2);
  font-size: 13px;
  font-weight: 700;
}

.admin__input,
.admin__codes {
  width: 100%;
  border: 1px solid var(--border-strong);
  border-radius: 12px;
  background: var(--surface);
  color: var(--text);
  font: inherit;
  outline: none;
}

.admin__input {
  padding: 12px 14px;
}

.admin__input:focus,
.admin__codes:focus {
  border-color: rgba(49, 94, 251, 0.6);
  box-shadow: 0 0 0 3px rgba(49, 94, 251, 0.14);
}

.admin__grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
  margin-top: 18px;
}

.admin__submit {
  width: 100%;
  margin-top: 20px;
}

.admin__error {
  margin-top: 14px;
  padding: 10px 14px;
  border-radius: 11px;
  background: rgba(239, 68, 68, 0.1);
  color: #dc2626;
  font-size: 13.5px;
}

.admin__result {
  margin-top: 24px;
  padding-top: 20px;
  border-top: 1px dashed var(--border-strong);
}

.admin__result-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 12px;
}

.admin__codes {
  min-height: 220px;
  padding: 14px;
  resize: vertical;
  font-family: ui-monospace, SFMono-Regular, Consolas, monospace;
  font-size: 13px;
  line-height: 1.75;
}

@media (max-width: 640px) {
  .admin__panel {
    padding: 20px;
  }

  .admin__grid {
    grid-template-columns: 1fr;
  }
}
</style>
