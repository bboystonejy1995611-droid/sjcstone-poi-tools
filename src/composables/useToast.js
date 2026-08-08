import { reactive } from 'vue'

/** 全局轻提示状态（模块级单例，任何组件可调用） */
const state = reactive({
  visible: false,
  message: '',
  type: 'success', // success | error | info
  timer: null
})

export function useToast() {
  function show(message, type = 'success', duration = 2200) {
    state.message = message
    state.type = type
    state.visible = true
    clearTimeout(state.timer)
    state.timer = setTimeout(() => {
      state.visible = false
    }, duration)
  }

  return { state, show }
}
