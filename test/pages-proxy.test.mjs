import assert from 'node:assert/strict'
import { onRequest } from '../functions/api/[[path]].js'

let forwardedRequest
const incoming = new Request('https://tools.sjcstone.cn/api/me?limit=10', {
  headers: { Authorization: 'Bearer guest-token' }
})
const response = await onRequest({
  request: incoming,
  env: {
    POI_API: {
      fetch: async (request) => {
        forwardedRequest = request
        return Response.json({ ok: true })
      }
    }
  }
})

assert.equal(response.status, 200, 'Service Binding 响应原样返回')
assert.equal(forwardedRequest, incoming, 'Pages Function 原样透传 Request')
assert.equal(forwardedRequest.headers.get('Authorization'), 'Bearer guest-token', '保留游客鉴权头')

const unavailable = await onRequest({ request: incoming, env: {} })
assert.equal(unavailable.status, 503, '绑定缺失时返回 503')
assert.deepEqual(await unavailable.json(), {
  ok: false,
  error: { code: 'service_unavailable', message: '服务暂时不可用，请稍后重试' }
})

console.log('Pages API 代理：5 通过 / 0 失败')
