/**
 * utils/api.js — 点数计费 API 客户端（纯 fetch，零依赖）
 *
 * API_BASE 取值：
 *   - 默认 '/api'：部署时 Worker 绑定到同一域名的 /api/* 路径（推荐）
 *   - 本地联调：VITE_API_BASE=http://localhost:8787/api npm run dev
 *     （先运行 cd worker && npx wrangler dev --local）
 */
export const API_BASE = import.meta.env.VITE_API_BASE || '/api'

const TOKEN_KEY = 'spoi_token'

export function getToken() {
  return localStorage.getItem(TOKEN_KEY) || ''
}

export function setToken(token) {
  if (token) localStorage.setItem(TOKEN_KEY, token)
  else localStorage.removeItem(TOKEN_KEY)
}

/**
 * 统一请求。成功返回 data；失败抛出 Error（message 可直接展示，code 用于业务判断）。
 */
export async function api(path, options = {}) {
  const token = getToken()
  const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) }
  if (token) headers.Authorization = `Bearer ${token}`

  let res
  try {
    res = await fetch(`${API_BASE}${path}`, { ...options, headers })
  } catch {
    throw new Error('网络异常，请稍后重试')
  }

  const body = await res.json().catch(() => null)
  if (!res.ok || !body?.ok) {
    const err = new Error(body?.error?.message || `请求失败（${res.status}）`)
    err.code = body?.error?.code || 'request_failed'
    err.status = res.status
    throw err
  }
  return body.data
}

export const apiGet = (path) => api(path, { method: 'GET' })
export const apiPost = (path, data) =>
  api(path, { method: 'POST', body: JSON.stringify(data || {}) })
export const apiDelete = (path) => api(path, { method: 'DELETE' })
