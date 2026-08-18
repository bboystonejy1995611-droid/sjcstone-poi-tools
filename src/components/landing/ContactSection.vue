<script setup>
import { reactive, ref } from 'vue'
import { siteConfig } from '../../config/siteConfig'
import { useInView } from '../../composables/useInView'

const { el, visible } = useInView()

const form = reactive({
  name: '',
  phone: '',
  industry: '',
  need: ''
})

const errors = ref({})
const submitted = ref(false)
const copied = ref(false)

const industries = [
  { value: '', label: '请选择门店类型' },
  { value: '餐饮美食', label: '餐饮美食' },
  { value: '美业健身', label: '美业健身' },
  { value: '休闲娱乐', label: '休闲娱乐' },
  { value: '零售便利', label: '零售便利' },
  { value: '酒店民宿', label: '酒店民宿' },
  { value: '亲子教育', label: '亲子教育' },
  { value: '其他', label: '其他' }
]

function validate() {
  const e = {}
  if (!form.name.trim()) e.name = '请填写您的称呼'
  if (!/^1\d{10}$/.test(form.phone.trim())) e.phone = '请填写正确的手机号'
  if (!form.industry) e.industry = '请选择门店类型'
  errors.value = e
  return Object.keys(e).length === 0
}

function handleSubmit() {
  if (!validate()) return
  // 纯前端页面：此处不发送任何数据，仅模拟提交成功
  submitted.value = true
}

function reset() {
  submitted.value = false
  form.name = ''
  form.phone = ''
  form.industry = ''
  form.need = ''
  errors.value = {}
}

async function copyWechat() {
  const text = siteConfig.contactWechat
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text)
    } else {
      // 旧环境 fallback
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
    setTimeout(() => (copied.value = false), 1800)
  } catch {
    /* 忽略复制失败 */
  }
}
</script>

<template>
  <section id="contact" ref="el" class="l-section contact" :class="{ 'is-visible': visible }">
    <div class="l-container">
      <div class="l-center l-reveal" :class="{ 'is-visible': visible }">
        <span class="l-kicker">合作咨询</span>
        <h2 class="l-title">让 AI 帮你的门店多赚钱</h2>
        <p class="l-desc">
          无论是想上架视频号团购、接入 AI 工具，还是成为城市服务商、加入地推团队，都欢迎聊聊。
        </p>
      </div>

      <div class="contact__panel l-card">
        <!-- 左：联系方式 -->
        <div class="contact__info">
          <h3 class="contact__info-title">联系我们</h3>
          <p class="contact__info-desc">
            留下联系方式或直接添加商务微信，顾问会在工作时间尽快回复你。
          </p>

          <div v-if="siteConfig.contactWechat" class="contact__wechat">
            <div>
              <span class="contact__label">商务微信</span>
              <div class="contact__wechat-row">
                <strong>{{ siteConfig.contactWechat }}</strong>
                <button type="button" class="contact__copy" @click="copyWechat">
                  {{ copied ? '微信号已复制' : '复制微信号' }}
                </button>
              </div>
            </div>
          </div>

          <p v-if="siteConfig.contactEmail" class="contact__email">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <rect x="3" y="5" width="18" height="14" rx="2.5" />
              <path d="m3 7 9 6 9-6" />
            </svg>
            {{ siteConfig.contactEmail }}
          </p>
        </div>

        <!-- 右：表单 / 成功态 -->
        <div class="contact__form-wrap">
          <form v-if="!submitted" class="contact__form" novalidate @submit.prevent="handleSubmit">
            <div class="contact__field">
              <label for="c-name">称呼</label>
              <input
                id="c-name"
                v-model.trim="form.name"
                class="contact__input"
                :class="{ 'contact__input--error': errors.name }"
                type="text"
                placeholder="怎么称呼您"
              />
              <span v-if="errors.name" class="contact__error">{{ errors.name }}</span>
            </div>

            <div class="contact__field">
              <label for="c-phone">手机号</label>
              <input
                id="c-phone"
                v-model.trim="form.phone"
                class="contact__input"
                :class="{ 'contact__input--error': errors.phone }"
                type="tel"
                maxlength="11"
                placeholder="方便顾问联系您"
              />
              <span v-if="errors.phone" class="contact__error">{{ errors.phone }}</span>
            </div>

            <div class="contact__field">
              <label for="c-industry">门店类型</label>
              <select
                id="c-industry"
                v-model="form.industry"
                class="contact__input"
                :class="{ 'contact__input--error': errors.industry }"
              >
                <option v-for="opt in industries" :key="opt.value" :value="opt.value">
                  {{ opt.label }}
                </option>
              </select>
              <span v-if="errors.industry" class="contact__error">{{ errors.industry }}</span>
            </div>

            <div class="contact__field">
              <label for="c-need">您的需求</label>
              <textarea
                id="c-need"
                v-model.trim="form.need"
                class="contact__input contact__input--area"
                rows="3"
                placeholder="比如：想上架视频号团购 / 想接入 AI 工具 / 想成为服务商"
              ></textarea>
            </div>

            <button type="submit" class="l-btn l-btn--primary contact__submit">提交咨询</button>
            <p class="contact__privacy">仅用于商务沟通，不会泄露您的信息（当前为演示页面，不会真正提交）</p>
          </form>

          <div v-else class="contact__success">
            <div class="contact__success-icon">
              <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">
                <path d="M20 6 9 17l-5-5" />
              </svg>
            </div>
            <h3>已收到您的咨询</h3>
            <p>商务顾问将在工作时间尽快与您联系。<template v-if="siteConfig.contactWechat">也可以直接添加微信 <b>{{ siteConfig.contactWechat }}</b> 快速沟通。</template></p>
            <button type="button" class="l-btn l-btn--ghost" @click="reset">再填一份</button>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.contact {
  background: linear-gradient(180deg, var(--bg) 0%, var(--surface-2) 100%);
}

.contact__panel {
  display: grid;
  grid-template-columns: 0.92fr 1.08fr;
  gap: 0;
  margin-top: 52px;
  overflow: hidden;
}

.contact__info {
  padding: 40px 38px;
  background: var(--grad-soft);
  border-right: 1px solid var(--border);
}

.contact__info-title {
  font-size: 21px;
  font-weight: 800;
  color: var(--text);
  letter-spacing: -0.3px;
}

.contact__info-desc {
  margin-top: 10px;
  font-size: 14px;
  line-height: 1.7;
  color: var(--text-2);
}

.contact__wechat {
  margin-top: 26px;
  padding: 16px 18px;
  border-radius: 14px;
  background: var(--surface);
  border: 1px solid var(--border);
}

.contact__label {
  display: block;
  font-size: 12.5px;
  color: var(--text-3);
  font-weight: 600;
  letter-spacing: 0.4px;
}

.contact__wechat-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-top: 6px;
}

.contact__wechat-row strong {
  font-size: 17px;
  font-weight: 800;
  letter-spacing: 0.3px;
  color: var(--text);
}

.contact__copy {
  padding: 6px 14px;
  border-radius: 999px;
  border: 1px solid rgba(49, 94, 251, 0.3);
  color: var(--primary-deep);
  background: rgba(49, 94, 251, 0.07);
  font-size: 12.5px;
  font-weight: 600;
  transition: background 0.18s ease, color 0.18s ease;
}

.contact__copy:hover {
  background: var(--primary);
  color: #fff;
}

.contact__email {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 22px;
  font-size: 14px;
  color: var(--text-2);
}

.contact__email svg {
  color: var(--primary);
}

/* 表单 */
.contact__form-wrap {
  padding: 40px 38px;
}

.contact__form {
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.contact__field label {
  display: block;
  margin-bottom: 7px;
  font-size: 13.5px;
  font-weight: 600;
  color: var(--text-2);
}

.contact__input {
  width: 100%;
  padding: 13px 15px;
  border-radius: 12px;
  border: 1px solid var(--border-strong);
  background: var(--surface);
  color: var(--text);
  font-size: 14.5px;
  font-family: inherit;
  outline: none;
  transition: border-color 0.18s ease, box-shadow 0.18s ease;
}

.contact__input::placeholder {
  color: var(--text-3);
}

.contact__input:focus {
  border-color: rgba(49, 94, 251, 0.6);
  box-shadow: 0 0 0 3px rgba(49, 94, 251, 0.14);
}

.contact__input--error {
  border-color: #ef4444;
}

.contact__input--area {
  resize: vertical;
  min-height: 86px;
  line-height: 1.6;
}

.contact__error {
  display: block;
  margin-top: 6px;
  font-size: 12.5px;
  color: #ef4444;
}

.contact__submit {
  width: 100%;
  margin-top: 4px;
}

.contact__privacy {
  margin-top: 14px;
  text-align: center;
  font-size: 12px;
  color: var(--text-3);
}

/* 成功态 */
.contact__success {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  min-height: 380px;
  padding: 20px 0;
}

.contact__success-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 66px;
  height: 66px;
  border-radius: 50%;
  color: #0a9b5e;
  background: rgba(18, 183, 106, 0.12);
}

.contact__success h3 {
  margin-top: 22px;
  font-size: 21px;
  font-weight: 800;
  color: var(--text);
}

.contact__success p {
  margin: 12px 0 24px;
  font-size: 14.5px;
  line-height: 1.8;
  color: var(--text-2);
}

.contact__success p b {
  color: var(--primary-deep);
}

@media (max-width: 900px) {
  .contact__panel {
    grid-template-columns: 1fr;
  }

  .contact__info {
    border-right: none;
    border-bottom: 1px solid var(--border);
  }
}

@media (max-width: 560px) {
  .contact__info,
  .contact__form-wrap {
    padding: 28px 22px;
  }
}
</style>
