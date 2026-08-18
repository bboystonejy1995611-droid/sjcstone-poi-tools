<script setup>
import { ref, computed } from 'vue'
import { useRoute } from 'vue-router'
import LandingNav from '../components/landing/LandingNav.vue'
import LandingFooter from '../components/landing/LandingFooter.vue'
import AccountModal from '../components/landing/AccountModal.vue'
import { useAuth } from '../composables/useAuth'
import { siteConfig } from '../config/siteConfig'

const route = useRoute()
const { ensureAuth, generate } = useAuth()
const billing = siteConfig.billing

const tool = computed(() => billing.tools.find((t) => t.id === route.params.toolId))

const prompt = ref('')
const loading = ref(false)
const result = ref('')
const error = ref('')
const redeemOpen = ref(false)

const systemPrompt =
  '你是一位资深的本地生活营销专家，熟悉视频号POI团购、短视频与同城流量。请用简体中文输出，内容实用、直接、可落地，不要客套话。'

async function handleGenerate() {
  error.value = ''
  if (!tool.value) return
  if (!prompt.value.trim()) {
    error.value = '请先输入内容'
    return
  }
  if (!(await ensureAuth())) {
    error.value = '网络异常，请刷新后重试'
    return
  }
  loading.value = true
  result.value = null
  try {
    // 图片/视频工具传 prompt，文本工具传 messages
    const payload =
      tool.value.type === 'image' || tool.value.type === 'video'
        ? { prompt: prompt.value.trim() }
        : {
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: prompt.value.trim() }
            ]
          }
    const data = await generate(tool.value.id, payload)
    result.value = data
  } catch (e) {
    if (e.code === 'insufficient_points') {
      error.value = e.message
      redeemOpen.value = true // 积分不足，引导兑换卡密
    } else {
      error.value = e.message
    }
  } finally {
    loading.value = false
  }
}

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
            🚧 宣传视频生成功能即将上线，敬请期待
          </div>
          <div v-else class="tool__notice">
            💡 AI 生成由服务商提供；海报生成等付费功能按次扣积分，兑换卡密后即可使用。
          </div>
        </div>

        <div class="l-card tool__panel">
          <textarea
            v-model="prompt"
            class="tool__input"
            :placeholder="tool.placeholder"
            rows="5"
          ></textarea>

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
                    ? '即将上线'
                    : tool.free
                      ? '免费生成'
                      : `生成（${tool.points} 积分/次）`
              }}
            </button>
            <button type="button" class="l-btn l-btn--ghost l-btn--lg" @click="redeemOpen = true">
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
              <a
                v-if="result.imageUrl"
                class="tool__copy"
                :href="result.imageUrl"
                target="_blank"
                rel="noopener"
              >
                查看 / 下载图片
              </a>
            </div>
            <pre v-if="result.text" class="tool__result-text">{{ result.text }}</pre>
            <img
              v-if="result.imageUrl"
              class="tool__result-image"
              :src="result.imageUrl"
              alt="生成的海报"
            />
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

@media (max-width: 640px) {
  .tool__panel {
    padding: 20px;
  }

  .tool__actions .l-btn {
    flex: 1;
  }
}
</style>
