<script setup>
import { reactive, ref, computed, watch } from 'vue'
import { POI_CATEGORIES } from '../data/poiCategories'
import { PACKAGE_TYPES, GOAL_OPTIONS } from '../data/rules'
import { trackCategorySelect } from '../utils/analytics'

const emit = defineEmits(['submit', 'reset'])

const form = reactive({
  category: '',        // 行业大类
  subCategory: '',     // POI 细分类目
  storeName: '',
  city: '',
  mainProducts: '',
  price: '',
  packageType: '',     // 套餐类型
  goal: ''             // 营销目标
})

const errors = reactive({})
const submitting = ref(false)
const subSearch = ref('')
let submitTimer = null

/** 当前大类配置 */
const currentGroup = computed(() =>
  POI_CATEGORIES.find((g) => g.value === form.category) || null
)

/** 当前大类的二级类目（带搜索过滤） */
const subOptions = computed(() => {
  if (!currentGroup.value) return []
  const kw = subSearch.value.trim()
  const list = currentGroup.value.children
  if (!kw) return list
  return list.filter((c) => c.label.includes(kw))
})

/** 切换大类时清空已选类目与搜索词，并埋点记录大类选择 */
watch(
  () => form.category,
  (val) => {
    form.subCategory = ''
    subSearch.value = ''
    if (val) trackCategorySelect({ industryCategory: val, poiCategory: '' })
  }
)

/** 选择 POI 细分类目时埋点 */
watch(
  () => form.subCategory,
  (val) => {
    if (val) trackCategorySelect({ industryCategory: form.category, poiCategory: val })
  }
)

function validate() {
  Object.keys(errors).forEach((k) => delete errors[k])

  if (!form.category) errors.category = '请选择行业大类'
  if (!form.subCategory) errors.subCategory = '请选择 POI 细分类目'
  if (!form.storeName.trim()) errors.storeName = '请输入门店名称'
  if (!form.city.trim()) errors.city = '请输入所在城市'
  if (!form.mainProducts.trim()) errors.mainProducts = '请输入主营产品/服务'
  if (!form.price) {
    errors.price = '请输入正常客单价'
  } else if (Number(form.price) <= 0) {
    errors.price = '客单价需大于 0'
  }
  if (!form.packageType) errors.packageType = '请选择套餐类型'
  if (!form.goal) errors.goal = '请选择营销目标'

  return Object.keys(errors).length === 0
}

function handleSubmit() {
  if (!validate()) return
  submitting.value = true
  // 模拟「AI 生成中」的短暂等待（纯本地计算，无外部请求）
  clearTimeout(submitTimer)
  submitTimer = setTimeout(() => {
    submitting.value = false
    emit('submit', {
      category: form.category,
      subCategory: form.subCategory,
      storeName: form.storeName.trim(),
      city: form.city.trim(),
      mainProducts: form.mainProducts.trim(),
      price: Number(form.price),
      packageType: form.packageType,
      goal: form.goal
    })
  }, 900)
}

function handleReset() {
  if (submitTimer) {
    clearTimeout(submitTimer)
    submitTimer = null
  }
  submitting.value = false
  subSearch.value = ''
  Object.assign(form, {
    category: '',
    subCategory: '',
    storeName: '',
    city: '',
    mainProducts: '',
    price: '',
    packageType: '',
    goal: ''
  })
  Object.keys(errors).forEach((k) => delete errors[k])
  emit('reset')
}
</script>

<template>
  <form class="store-form card" novalidate @submit.prevent="handleSubmit">
    <!-- 字段 1：行业大类 -->
    <div class="field" :class="{ 'field--error': errors.category }">
      <label class="field__label">
        <span class="field__step">01</span> 行业大类
      </label>
      <div class="cat-grid">
        <button
          v-for="g in POI_CATEGORIES"
          :key="g.value"
          type="button"
          class="cat-card"
          :class="{ 'cat-card--active': form.category === g.value }"
          @click="form.category = g.value"
        >
          <span class="cat-card__icon" aria-hidden="true">{{ g.icon }}</span>
          <span class="cat-card__label">{{ g.label }}</span>
        </button>
      </div>
      <p v-if="errors.category" class="field__error">{{ errors.category }}</p>
    </div>

    <!-- 字段 2：POI 细分类目 -->
    <div class="field" :class="{ 'field--error': errors.subCategory }">
      <label class="field__label">
        <span class="field__step">02</span> POI 细分类目
        <span v-if="currentGroup" class="field__sub">{{ currentGroup.label }}</span>
      </label>

      <template v-if="currentGroup">
        <div class="sub-search">
          <span class="sub-search__icon" aria-hidden="true">🔍</span>
          <input
            v-model="subSearch"
            class="form-control"
            type="text"
            maxlength="12"
            placeholder="搜索类目，如「火锅」"
          />
        </div>
        <div class="chip-grid chip-grid--cols-2">
          <button
            v-for="opt in subOptions"
            :key="opt.value"
            type="button"
            class="chip"
            :class="{ 'chip--active': form.subCategory === opt.value }"
            @click="form.subCategory = opt.value"
          >
            <span class="chip__icon" aria-hidden="true">{{ opt.icon || currentGroup.icon }}</span>
            <span>{{ opt.label }}</span>
          </button>
        </div>
        <p v-if="!subOptions.length" class="field__empty">没有匹配的类目，试试其他关键词</p>
      </template>
      <p v-else class="field__empty">请先选择上方的行业大类</p>

      <p v-if="errors.subCategory" class="field__error">{{ errors.subCategory }}</p>
    </div>

    <!-- 字段 3：门店名称 -->
    <div class="field" :class="{ 'field--error': errors.storeName }">
      <label class="field__label" for="storeName">
        <span class="field__step">03</span> 门店名称
      </label>
      <input
        id="storeName"
        v-model.trim="form.storeName"
        class="form-control"
        type="text"
        maxlength="30"
        placeholder="例如：老王砂锅居"
      />
      <p v-if="errors.storeName" class="field__error">{{ errors.storeName }}</p>
    </div>

    <!-- 字段 4：所在城市 -->
    <div class="field" :class="{ 'field--error': errors.city }">
      <label class="field__label" for="city">
        <span class="field__step">04</span> 所在城市
      </label>
      <input
        id="city"
        v-model.trim="form.city"
        class="form-control"
        type="text"
        maxlength="20"
        placeholder="例如：成都"
      />
      <p v-if="errors.city" class="field__error">{{ errors.city }}</p>
    </div>

    <!-- 字段 5：主营产品/服务 -->
    <div class="field" :class="{ 'field--error': errors.mainProducts }">
      <label class="field__label" for="mainProducts">
        <span class="field__step">05</span> 主营产品/服务
      </label>
      <input
        id="mainProducts"
        v-model.trim="form.mainProducts"
        class="form-control"
        type="text"
        maxlength="50"
        placeholder="例如：毛肚、鲜切牛肉、鸳鸯锅底"
      />
      <p v-if="errors.mainProducts" class="field__error">{{ errors.mainProducts }}</p>
    </div>

    <!-- 字段 6：正常客单价 -->
    <div class="field" :class="{ 'field--error': errors.price }">
      <label class="field__label" for="price">
        <span class="field__step">06</span> 正常客单价
      </label>
      <div class="price-input">
        <input
          id="price"
          v-model="form.price"
          class="form-control"
          type="number"
          inputmode="numeric"
          min="1"
          step="1"
          placeholder="例如：80"
        />
        <span class="price-input__unit">元</span>
      </div>
      <p v-if="errors.price" class="field__error">{{ errors.price }}</p>
    </div>

    <!-- 字段 7：套餐类型 -->
    <div class="field" :class="{ 'field--error': errors.packageType }">
      <label class="field__label">
        <span class="field__step">07</span> 套餐类型
      </label>
      <div class="chip-grid chip-grid--cols-2">
        <button
          v-for="opt in PACKAGE_TYPES"
          :key="opt.value"
          type="button"
          class="chip chip--tall"
          :class="{ 'chip--active': form.packageType === opt.value }"
          @click="form.packageType = opt.value"
        >
          <span class="chip__main">
            <span class="chip__icon" aria-hidden="true">{{ opt.icon }}</span>
            {{ opt.label }}
          </span>
          <span class="chip__sub">{{ opt.hint }}</span>
        </button>
      </div>
      <p v-if="errors.packageType" class="field__error">{{ errors.packageType }}</p>
    </div>

    <!-- 字段 8：营销目标 -->
    <div class="field" :class="{ 'field--error': errors.goal }">
      <label class="field__label">
        <span class="field__step">08</span> 营销目标
      </label>
      <div class="chip-grid chip-grid--cols-2">
        <button
          v-for="opt in GOAL_OPTIONS"
          :key="opt.value"
          type="button"
          class="chip chip--tall"
          :class="{ 'chip--active': form.goal === opt.value }"
          @click="form.goal = opt.value"
        >
          <span class="chip__main">{{ opt.label }}</span>
          <span class="chip__sub">{{ opt.hint }}</span>
        </button>
      </div>
      <p v-if="errors.goal" class="field__error">{{ errors.goal }}</p>
    </div>

    <!-- 操作区 -->
    <div class="form-actions">
      <button class="btn btn--primary" type="submit" :disabled="submitting">
        <span v-if="submitting" class="btn__spinner" aria-hidden="true"></span>
        {{ submitting ? 'AI 正在为你生成…' : '✨ 生成我的团购方案' }}
      </button>
      <button class="btn btn--ghost" type="button" @click="handleReset">
        清空表单
      </button>
    </div>
  </form>
</template>

<style scoped>
.store-form {
  margin-top: 18px;
  padding: 18px 16px 20px;
  display: flex;
  flex-direction: column;
  gap: 20px;
}

/* ---- 字段 ---- */
.field__label {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  font-weight: 600;
  margin-bottom: 10px;
  color: var(--text);
  flex-wrap: wrap;
}

.field__sub {
  font-size: 11px;
  font-weight: 400;
  color: #a78bfa;
  background: rgba(139, 92, 246, 0.12);
  border: 1px solid rgba(139, 92, 246, 0.3);
  padding: 1px 8px;
  border-radius: 999px;
}

.field__step {
  font-size: 11px;
  font-weight: 700;
  color: var(--primary);
  background: rgba(79, 124, 255, 0.12);
  border: 1px solid rgba(79, 124, 255, 0.3);
  padding: 1px 7px;
  border-radius: 999px;
  letter-spacing: 0.5px;
}

.field__empty {
  margin-top: 10px;
  font-size: 12.5px;
  color: var(--text-faint);
  text-align: center;
  padding: 10px;
  border: 1px dashed var(--card-border-strong);
  border-radius: 12px;
}

.field--error .form-control {
  border-color: rgba(248, 113, 113, 0.7);
}

.field__error {
  margin-top: 7px;
  font-size: 12px;
  color: var(--danger);
  animation: rise-in 0.25s ease both;
}

/* ---- 行业大类卡片 ---- */
.cat-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 9px;
}

.cat-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  padding: 12px 4px 10px;
  border-radius: 13px;
  background: rgba(255, 255, 255, 0.045);
  border: 1px solid var(--card-border);
  color: var(--text-dim);
  transition: all 0.18s ease;
}

.cat-card:active {
  transform: scale(0.95);
}

.cat-card__icon {
  font-size: 22px;
  line-height: 1;
  filter: saturate(0.9);
}

.cat-card__label {
  font-size: 12.5px;
  font-weight: 600;
  text-align: center;
  line-height: 1.35;
}

.cat-card--active {
  background: linear-gradient(135deg, rgba(79, 124, 255, 0.22), rgba(168, 85, 247, 0.22));
  border-color: rgba(139, 92, 246, 0.65);
  color: #fff;
  box-shadow: 0 0 0 1px rgba(139, 92, 246, 0.2), 0 6px 18px rgba(99, 102, 241, 0.18);
}

/* ---- 类目搜索 ---- */
.sub-search {
  position: relative;
  margin-bottom: 10px;
}

.sub-search .form-control {
  padding-left: 36px;
}

.sub-search__icon {
  position: absolute;
  left: 12px;
  top: 50%;
  transform: translateY(-50%);
  font-size: 14px;
  pointer-events: none;
}

/* ---- 选择 chips ---- */
.chip-grid {
  display: grid;
  gap: 9px;
}

.chip-grid--cols-2 {
  grid-template-columns: repeat(2, 1fr);
}

.chip {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 5px;
  padding: 10px 6px;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.045);
  border: 1px solid var(--card-border);
  color: var(--text-dim);
  font-size: 13.5px;
  transition: all 0.18s ease;
  min-height: 42px;
}

.chip:active {
  transform: scale(0.96);
}

.chip__icon {
  font-size: 15px;
  line-height: 1;
}

.chip--active {
  background: linear-gradient(135deg, rgba(79, 124, 255, 0.22), rgba(168, 85, 247, 0.22));
  border-color: rgba(139, 92, 246, 0.65);
  color: #fff;
  box-shadow: 0 0 0 1px rgba(139, 92, 246, 0.2), 0 6px 18px rgba(99, 102, 241, 0.18);
}

.chip--tall {
  flex-direction: column;
  align-items: flex-start;
  padding: 11px 8px;
  min-height: 54px;
}

.chip__main {
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: 13.5px;
  font-weight: 600;
}

.chip__sub {
  font-size: 10.5px;
  color: var(--text-faint);
  line-height: 1.4;
}

.chip--active .chip__sub {
  color: rgba(226, 232, 255, 0.8);
}

/* ---- 客单价输入 ---- */
.price-input {
  position: relative;
}

.price-input .form-control {
  padding-right: 44px;
}

.price-input__unit {
  position: absolute;
  right: 14px;
  top: 50%;
  transform: translateY(-50%);
  color: var(--text-faint);
  font-size: 14px;
  pointer-events: none;
}

/* ---- 按钮 ---- */
.form-actions {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-top: 2px;
}

.btn {
  border-radius: 14px;
  font-size: 15.5px;
  font-weight: 700;
  padding: 14px 20px;
  transition: transform 0.15s ease, box-shadow 0.2s ease, opacity 0.2s ease;
  width: 100%;
}

.btn:active {
  transform: scale(0.97);
}

.btn--primary {
  background: var(--grad-main);
  color: #fff;
  box-shadow: 0 10px 26px rgba(99, 102, 241, 0.4);
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}

.btn--primary:hover {
  box-shadow: 0 12px 34px rgba(99, 102, 241, 0.55);
}

.btn--primary:disabled {
  opacity: 0.75;
  cursor: default;
}

.btn__spinner {
  width: 16px;
  height: 16px;
  border-radius: 50%;
  border: 2px solid rgba(255, 255, 255, 0.35);
  border-top-color: #fff;
  animation: spin 0.7s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.btn--ghost {
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid var(--card-border);
  color: var(--text-dim);
  font-size: 14px;
  font-weight: 500;
}

@media (min-width: 768px) {
  .store-form {
    padding: 26px 24px 28px;
  }

  .cat-grid {
    grid-template-columns: repeat(4, 1fr);
  }

  .form-actions {
    flex-direction: row;
  }

  .btn--ghost {
    width: 160px;
  }
}
</style>
