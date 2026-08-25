import assert from 'node:assert/strict'

const storage = new Map([['spoi_token', 'paid-guest-token']])
globalThis.localStorage = {
  getItem: (key) => storage.get(key) || null,
  setItem: (key, value) => storage.set(key, String(value)),
  removeItem: (key) => storage.delete(key)
}

const { apiUrl } = await import('../src/utils/api.js')

assert.equal(apiUrl('/api', '/api/me'), '/api/me', '同域 API 前缀不能重复')
assert.equal(apiUrl('http://localhost:8787/api', '/api/me'), 'http://localhost:8787/api/me', '本地 Worker 地址正确拼接')

let responseStatus = 503
const requestedUrls = []
globalThis.fetch = async (url) => {
  requestedUrls.push(String(url))
  if (responseStatus === 503) {
    return new Response(JSON.stringify({ ok: false, error: { code: 'internal_error', message: '服务暂时不可用' } }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' }
    })
  }
  if (responseStatus === 401) {
    responseStatus = 200
    return new Response(JSON.stringify({ ok: false, error: { code: 'unauthorized', message: '身份失效' } }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' }
    })
  }
  return new Response(JSON.stringify({
    ok: true,
    data: { token: 'replacement-token', user: { id: 2, anonId: 'new-guest', points: 0 } }
  }), { status: 200, headers: { 'Content-Type': 'application/json' } })
}

const { useAuth } = await import('../src/composables/useAuth.js')
await useAuth().init()
assert.equal(storage.get('spoi_token'), 'paid-guest-token', '临时 5xx 不得删除游客 token')
assert.equal(requestedUrls[0], '/api/me', '游客信息请求使用单一 /api 前缀')

responseStatus = 401
await useAuth().init()
assert.equal(storage.get('spoi_token'), 'replacement-token', '明确 401 后才创建替代游客身份')
assert.deepEqual(requestedUrls.slice(-2), ['/api/me', '/api/auth/anonymous'], '401 后按正确路径重新签发')

console.log('API 客户端：5 通过 / 0 失败')
