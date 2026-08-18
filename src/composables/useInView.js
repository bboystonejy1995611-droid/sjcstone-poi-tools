import { ref, onMounted, onBeforeUnmount } from 'vue'

/**
 * useInView — 元素进入视口时置 visible=true（一次性），用于滚动显现动画。
 * 用法：<section ref="el" :class="{ 'l-reveal': true, 'is-visible': visible }">
 */
export function useInView(rootMargin = '0px 0px -48px 0px') {
  const el = ref(null)
  const visible = ref(false)
  let observer = null

  onMounted(() => {
    if (!el.value || typeof IntersectionObserver === 'undefined') {
      visible.value = true // 无 IO 支持的环境直接显示，保证可用
      return
    }
    observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            visible.value = true
            observer.disconnect()
          }
        })
      },
      { rootMargin, threshold: 0.12 }
    )
    observer.observe(el.value)
  })

  onBeforeUnmount(() => {
    observer?.disconnect()
  })

  return { el, visible }
}
