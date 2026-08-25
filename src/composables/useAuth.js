/**
 * composables/useAuth.js — 匿名身份与积分（模块级单例）
 *
 * 第一阶段无注册/登录：首次使用自动向 Worker 换取匿名 token（存 localStorage），
 * 积分绑定该 token。请勿清除浏览器数据，否则积分丢失（暂不做找回）。
 */
import { reactive, computed } from 'vue'
import { apiGet, apiPost, apiDelete, getToken, setToken } from '../utils/api.js'

const state = reactive({
  token: getToken(),
  user: null, // { id, points }
  ready: false
})

export function useAuth() {
  const isLoggedIn = computed(() => !!state.token)
  const points = computed(() => state.user?.points ?? 0)

  /** 应用启动：无 token 自动获取匿名身份；有 token 拉取积分余额 */
  async function init() {
    if (!state.token) {
      try {
        const data = await apiPost('/api/auth/anonymous')
        state.token = data.token
        state.user = data.user
        setToken(data.token)
      } catch {
        /* 网络异常时保持未登录，稍后重试 */
      }
      state.ready = true
      return
    }
    try {
      const data = await apiGet('/api/me')
      state.user = data.user
    } catch (error) {
      // 只有 Worker 明确返回 401 才说明 token 失效。
      // 网络波动或 5xx 时必须保留原 token，否则会让有余额的游客身份永久丢失。
      if (error?.status === 401) {
        setToken('')
        state.token = ''
        return init()
      }
    }
    state.ready = true
  }

  /** 确保有身份（供付费工具页调用前使用） */
  async function ensureAuth() {
    if (state.token && state.user) return true
    await init()
    return !!state.token
  }

  /** 兑换卡密，返回 { points, added } */
  async function redeem(code) {
    const data = await apiPost('/api/cards/redeem', { code })
    if (state.user) state.user = { ...state.user, points: data.points }
    return data
  }

  /** 调用 AI 工具，返回 { text | imageUrl, points, deducted }；payload 按类型传 messages 或 prompt */
  async function generate(tool, payload) {
    const data = await apiPost('/api/ai/generate', { tool, ...payload })
    if (state.user) state.user = { ...state.user, points: data.points }
    return data
  }

  /** 按次扣分（通用，预留） */
  async function consume(feature) {
    const data = await apiPost('/api/consume', { feature })
    if (state.user) state.user = { ...state.user, points: data.points }
    return data
  }

  /** 我的生成记录（type: all | image | video） */
  async function listGenerations(type = 'all') {
    return apiGet(`/api/generations?type=${type}`)
  }

  /** 删除生成记录（含 R2 文件） */
  async function deleteGeneration(taskId) {
    return apiDelete(`/api/generations/${taskId}`)
  }

  /** 创建充值订单，返回 { orderNo, payUrl }（支付宝） */
  async function payCreate(plan) {
    return apiPost('/api/pay/create', { plan })
  }

  /** 刷新当前用户与积分余额 */
  async function refresh() {
    if (!state.token) return null
    const data = await apiGet('/api/me')
    state.user = data.user
    return data.user
  }

  function logout() {
    state.token = ''
    state.user = null
    setToken('')
  }

  return { state, isLoggedIn, points, init, ensureAuth, redeem, generate, consume, listGenerations, deleteGeneration, payCreate, refresh, logout }
}
