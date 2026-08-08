<script setup>
import { ref, computed, watch, onMounted, onBeforeUnmount } from 'vue'

/**
 * CountUp — 价格数字滚动动画（纯前端 rAF 实现）
 * 支持一位小数（如 9.9），整数时正常显示整数
 */
const props = defineProps({
  to: { type: Number, required: true },
  duration: { type: Number, default: 900 }
})

const display = ref(0)
let rafId = null

const displayText = computed(() =>
  Number.isInteger(display.value) ? String(display.value) : display.value.toFixed(1)
)

function animate() {
  cancelAnimationFrame(rafId)
  const start = performance.now()
  const from = 0

  const step = (now) => {
    const progress = Math.min((now - start) / props.duration, 1)
    const eased = 1 - Math.pow(1 - progress, 3) // easeOutCubic
    const raw = from + (props.to - from) * eased
    display.value = Math.round(raw * 10) / 10 // 保留 1 位小数，避免吞掉 .9 营销尾价
    if (progress < 1) rafId = requestAnimationFrame(step)
  }

  rafId = requestAnimationFrame(step)
}

onMounted(animate)
watch(() => props.to, animate)
onBeforeUnmount(() => cancelAnimationFrame(rafId))
</script>

<template>
  <span class="count-up">{{ displayText }}</span>
</template>
