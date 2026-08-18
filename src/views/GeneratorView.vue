<script setup>
import { ref, nextTick, onMounted } from 'vue'
import BrandHeader from '../components/BrandHeader.vue'
import StoreForm from '../components/StoreForm.vue'
import ResultSection from '../components/ResultSection.vue'
import FooterCta from '../components/FooterCta.vue'
import { generatePlans } from '../utils/generator'
import { trackPageView, trackGeneratePlan } from '../utils/analytics'
import { useToast } from '../composables/useToast'

const { show } = useToast()

const result = ref(null)
const lastStoreName = ref('')
const lastFormSnapshot = ref(null)

// 统计埋点：页面访问（当前仅 console.log）
onMounted(() => trackPageView())

/** 表单提交 → 生成套餐方案（免费引流工具，不消耗积分） */
function handleSubmit(formData) {
  lastFormSnapshot.value = { ...formData }
  lastStoreName.value = formData.storeName
  result.value = generatePlans(formData)
  // 统计埋点：生成方案
  trackGeneratePlan({
    industryCategory: formData.category,
    poiCategory: formData.subCategory,
    city: formData.city,
    price: formData.price,
    packageType: formData.packageType,
    marketingGoal: formData.goal
  })
  show('方案生成完成，先去看看吧 ✨')
  nextTick(() => {
    const el = document.getElementById('result-section')
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  })
}

/** 重新生成：复用上次表单数据，换一批随机方案（同样计入生成） */
function handleRegenerate() {
  if (!lastFormSnapshot.value) return
  result.value = generatePlans({ ...lastFormSnapshot.value })
  const s = lastFormSnapshot.value
  trackGeneratePlan({
    industryCategory: s.category,
    poiCategory: s.subCategory,
    city: s.city,
    price: s.price,
    packageType: s.packageType,
    marketingGoal: s.goal
  })
  show('已为你换一批新方案 🔄')
}

/** 清空表单 → 同时清空结果 */
function handleReset() {
  result.value = null
  lastFormSnapshot.value = null
  window.scrollTo({ top: 0, behavior: 'smooth' })
}
</script>

<template>
  <main class="container">
    <BrandHeader />

    <StoreForm @submit="handleSubmit" @reset="handleReset" />

    <div id="result-section">
      <ResultSection
        v-if="result"
        :result="result"
        :store-name="lastStoreName"
        :context="lastFormSnapshot || {}"
        @regenerate="handleRegenerate"
      />
    </div>

    <FooterCta />
  </main>
</template>
