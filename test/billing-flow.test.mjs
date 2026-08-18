/**
 * test/billing-flow.test.mjs — 卡密/积分/AI代理 完整流程冒烟测试
 *
 * 用 node:sqlite 内存库模拟 Cloudflare D1，直接调用 worker/src/index.js 的 fetch，
 * mock 第三方 AI（文本 + 图片）接口，验证：
 * 匿名身份 → 卡密兑换 → 免费工具（不扣分）→ 收费工具（海报扣分/退款）→
 * 视频未配置（501）→ 积分不足（409）→ 限流 → 边界。
 *
 * 运行：node test/billing-flow.test.mjs
 */
import assert from 'node:assert'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { DatabaseSync } from 'node:sqlite'
import worker from '../worker/src/index.js'
import { rsa2Sign, buildSignContent } from '../worker/src/alipay.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

/* ---------- D1 兼容封装（基于 node:sqlite 内存库） ---------- */
const db = new DatabaseSync(':memory:')
db.exec(fs.readFileSync(path.join(__dirname, '../worker/schema.sql'), 'utf8'))

const DB = {
  prepare(sql) {
    const stmt = db.prepare(sql)
    const bind = (...args) => ({
      run: () => {
        const r = stmt.run(...args)
        return { meta: { changes: Number(r.changes), last_row_id: Number(r.lastInsertRowid) } }
      },
      first: () => (stmt.get(...args) ?? null),
      all: () => ({ results: stmt.all(...args) })
    })
    return {
      bind: (...args) => bind(...args),
      run: (...args) => bind(...args).run(),
      first: (...args) => bind(...args).first(),
      all: (...args) => bind(...args).all()
    }
  },
  /** 模拟 D1 batch：单事务顺序执行 */
  batch(statements) {
    db.exec('BEGIN')
    try {
      const results = statements.map((s) => s.run())
      db.exec('COMMIT')
      return results
    } catch (e) {
      db.exec('ROLLBACK')
      throw e
    }
  }
}

const env = {
  DB,
  AUTH_SECRET: 'test-secret',
  ADMIN_KEY: 'test-admin-key',
  AI_API_KEY: 'sk-test', // 测试用；真实环境必须是 Worker Secret
  AI_BASE_URL: 'https://mock-ai.example/v1',
  IMAGE_API_KEY: 'sk-image-test' // 测试用；真实环境必须是 Worker Secret
}

/* ---------- 支付宝密钥（测试用 RSA 密钥对，模拟应用私钥 + 支付宝公钥） ---------- */
const keyPair = await crypto.subtle.generateKey(
  { name: 'RSASSA-PKCS1-v1_5', modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: 'SHA-256' },
  true,
  ['sign', 'verify']
)
const toPem = (buf, type) => {
  const b64 = btoa(String.fromCharCode(...new Uint8Array(buf)))
  const lines = b64.match(/.{1,64}/g).join('\n')
  return `-----BEGIN ${type}-----\n${lines}\n-----END ${type}-----`
}
const privatePem = toPem(await crypto.subtle.exportKey('pkcs8', keyPair.privateKey), 'PRIVATE KEY')
const publicPem = toPem(await crypto.subtle.exportKey('spki', keyPair.publicKey), 'PUBLIC KEY')
env.ALIPAY_APP_ID = '2021000000000000'
env.ALIPAY_PRIVATE_KEY = privatePem
env.ALIPAY_PUBLIC_KEY = publicPem

/* ---------- mock 第三方 AI（文本 + 图片） ---------- */
const realFetch = globalThis.fetch
let mockAiStatus = 200
let mockAiEmpty = false
let mockImageStatus = 200
globalThis.fetch = async (url, opts) => {
  const urlStr = String(url)
  if (urlStr.includes('/images/generations')) {
    if (mockImageStatus !== 200) {
      return new Response('{"error":"image upstream down"}', { status: mockImageStatus })
    }
    return new Response(
      JSON.stringify({ data: [{ url: 'https://img.example/poster-1.png' }] }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    )
  }
  if (urlStr.includes('/chat/completions')) {
    if (mockAiStatus !== 200) {
      return new Response('{"error":"upstream down"}', { status: mockAiStatus })
    }
    if (mockAiEmpty) {
      return new Response(JSON.stringify({ choices: [] }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      })
    }
    return new Response(
      JSON.stringify({ choices: [{ message: { content: '【AI 生成的营销文案】测试内容' } }] }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    )
  }
  return realFetch(url, opts)
}

/* ---------- 工具 ---------- */
let pass = 0
let fail = 0
function assertEq(actual, expected, msg) {
  try {
    assert.strictEqual(actual, expected, msg)
    pass++
    console.log(`  ✓ ${msg}`)
  } catch (e) {
    fail++
    console.error(`  ✗ ${msg} —— 期望 ${JSON.stringify(expected)}，实际 ${JSON.stringify(actual)}`)
  }
}

async function call(pathname, { method = 'GET', body, token, adminKey } = {}) {
  const headers = {}
  if (body) headers['Content-Type'] = 'application/json'
  if (token) headers.Authorization = `Bearer ${token}`
  if (adminKey) headers['X-Admin-Key'] = adminKey
  const req = new Request(`http://localhost${pathname}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined
  })
  const res = await worker.fetch(req, env)
  return { status: res.status, json: await res.json() }
}

const txnCount = () => db.prepare('SELECT COUNT(*) AS c FROM transactions').get().c
const userPoints = () => db.prepare('SELECT points FROM users ORDER BY id LIMIT 1').get().points

/* ---------- 测试流程 ---------- */
console.log('\n▶ 1. 匿名身份（无注册/验证码）')
let r = await call('/api/auth/anonymous', { method: 'POST' })
assertEq(r.status, 200, '签发匿名 token 成功')
assertEq(typeof r.json.data.token, 'string', '返回 token')
const token = r.json.data.token
assertEq(r.json.data.user.points, 0, '新匿名用户初始 0 积分')

console.log('\n▶ 1b. 免费工具：0 积分也可调用')
r = await call('/api/ai/generate', {
  method: 'POST',
  token,
  body: { tool: 'oral_script', messages: [{ role: 'user', content: 'x' }] }
})
assertEq(r.status, 200, '0 积分调用免费工具成功')
assertEq(r.json.data.deducted, 0, '免费工具不扣积分')
assertEq(r.json.data.points, 0, '积分不变')

console.log('\n▶ 1c. 收费工具边界：0 积分 409；视频未配置 501')
r = await call('/api/ai/generate', {
  method: 'POST',
  token,
  body: { tool: 'poster_image', prompt: '火锅促销海报' }
})
assertEq(r.status, 409, '0 积分调用海报生成被拒（409）')
assertEq(r.json.error.code, 'insufficient_points', '错误码 insufficient_points')
r = await call('/api/ai/generate', {
  method: 'POST',
  token,
  body: { tool: 'promo_video', prompt: '开业宣传片' }
})
assertEq(r.status, 501, '视频生成未配置返回 501')
assertEq(r.json.error.code, 'video_not_ready', '错误码 video_not_ready')

console.log('\n▶ 2. 管理端生成卡密')
r = await call('/api/admin/cards', { method: 'POST', body: { points: 100, count: 2 }, adminKey: 'wrong' })
assertEq(r.status, 401, '错误管理密钥被拒')
r = await call('/api/admin/cards', { method: 'POST', body: { points: 100, count: 2 }, adminKey: 'test-admin-key' })
assertEq(r.status, 200, '生成卡密成功')
const cards = r.json.data.cards
assertEq(cards.length, 2, '生成 2 张卡密')
assertEq(cards[0].points, 100, '面额 100 积分')

console.log('\n▶ 3. 兑换卡密（一次性）')
r = await call('/api/cards/redeem', { method: 'POST', body: { code: 'NOPE-XXXXXXXX-XXXXXXXX' }, token })
assertEq(r.status, 404, '不存在的卡密被拒')
r = await call('/api/cards/redeem', { method: 'POST', body: { code: cards[0].code }, token })
assertEq(r.status, 200, '兑换成功')
assertEq(r.json.data.added, 100, '增加 100 积分')
r = await call('/api/cards/redeem', { method: 'POST', body: { code: cards[0].code }, token })
assertEq(r.status, 409, '同一卡密重复兑换被拒（幂等）')
r = await call('/api/me', { token })
assertEq(r.json.data.user.points, 100, '重复兑换后余额不变（无双花）')

console.log('\n▶ 4. 免费工具不消耗已兑换积分')
r = await call('/api/ai/generate', {
  method: 'POST',
  token,
  body: { tool: 'visit_script', messages: [{ role: 'user', content: 'x' }] }
})
assertEq(r.status, 200, '免费工具调用成功')
assertEq(r.json.data.deducted, 0, '不扣积分')
assertEq(r.json.data.points, 100, '兑换的 100 积分原样保留')
assertEq(txnCount(), 1, '不产生扣费流水（仍只有兑换 1 条）')

console.log('\n▶ 4b. 海报生成（收费）：成功扣分并返回图片')
r = await call('/api/ai/generate', {
  method: 'POST',
  token,
  body: { tool: 'poster_image', prompt: '火锅促销海报，喜庆风格' }
})
assertEq(r.status, 200, '海报生成成功')
assertEq(r.json.data.deducted, 20, '扣除 20 积分（config 占位定价）')
assertEq(r.json.data.points, 80, '余额 80 积分')
assertEq(r.json.data.imageUrl, 'https://img.example/poster-1.png', '返回图片 URL')
assertEq(txnCount(), 2, '新增 1 条扣费流水')

console.log('\n▶ 4c. 海报生成（收费）：失败自动退款')
mockImageStatus = 500
const txnBeforeFail = txnCount()
r = await call('/api/ai/generate', {
  method: 'POST',
  token,
  body: { tool: 'poster_image', prompt: 'x' }
})
assertEq(r.status, 502, '图片服务错误返回 502')
assertEq(r.json.error.code, 'ai_error', '错误码 ai_error')
assertEq(userPoints(), 80, '积分已退还（余额不变）')
assertEq(txnCount(), txnBeforeFail + 2, '扣费+退款 2 条流水（可对账）')
assertEq(db.prepare('SELECT status FROM ai_calls ORDER BY id DESC LIMIT 1').get().status, 'error', 'ai_calls 标记 error')
mockImageStatus = 200

console.log('\n▶ 5. 文本 AI 失败：免费工具无扣费则无退款')
mockAiStatus = 500
const txnBeforeTextFail = txnCount()
r = await call('/api/ai/generate', {
  method: 'POST',
  token,
  body: { tool: 'oral_script', messages: [{ role: 'user', content: 'x' }] }
})
assertEq(r.status, 502, 'AI 上游错误返回 502')
assertEq(userPoints(), 80, '免费工具失败不影响积分')
assertEq(txnCount(), txnBeforeTextFail, '无退款流水')
mockAiStatus = 200

console.log('\n▶ 5b. AI 空响应视为失败（免费工具无退款）')
mockAiEmpty = true
r = await call('/api/ai/generate', {
  method: 'POST',
  token,
  body: { tool: 'oral_script', messages: [{ role: 'user', content: 'x' }] }
})
assertEq(r.status, 502, '空响应返回 502')
assertEq(userPoints(), 80, '积分不变')
mockAiEmpty = false

console.log('\n▶ 6. AI 调用限流（每分钟 10 次，含图片/文本）')
const pointsBefore429 = userPoints()
let ok429 = false
let okCalls = 0
for (let i = 0; i < 12; i++) {
  const rr = await call('/api/ai/generate', {
    method: 'POST',
    token,
    body: { tool: 'poster_prompt', messages: [{ role: 'user', content: 'x' }] }
  })
  if (rr.status === 429) {
    ok429 = true
    break
  }
  okCalls++
}
assertEq(ok429, true, '达到上限后返回 429')
assertEq(okCalls <= 10, true, `限流前成功调用不超过 10 次（实际 ${okCalls}）`)
assertEq(userPoints(), pointsBefore429, '429 不影响积分')

console.log('\n▶ 7. 参数与鉴权边界')
r = await call('/api/ai/generate', { method: 'POST', token, body: { tool: 'poster_image' } })
assertEq(r.status, 400, '图片工具缺 prompt 被拒')
r = await call('/api/ai/generate', { method: 'POST', token, body: { tool: 'oral_script' } })
assertEq(r.status, 400, '文本工具缺 messages 被拒')
r = await call('/api/consume', { method: 'POST', token, body: { feature: 'oral_script' } })
assertEq(r.status, 400, '对免费工具调用扣分接口被拒（free_feature）')
r = await call('/api/me', { token: 'abc.def' })
assertEq(r.status, 401, '伪造 token 401')

console.log('\n▶ 7b. 支付宝在线充值（下单 → 回调自动到账）')
const pointsBeforePay = userPoints()
r = await call('/api/pay/create', { method: 'POST', token, body: { plan: 'starter' } })
assertEq(r.status, 200, '创建充值订单成功')
assertEq(r.json.data.amount, 19.9, '订单金额 19.9 元')
assertEq(r.json.data.points, 100, '到账 100 积分')
assertEq(r.json.data.payUrl.includes('app_id=2021000000000000'), true, 'payUrl 含 app_id')
assertEq(/sign=/.test(r.json.data.payUrl), true, 'payUrl 含签名')
assertEq(r.json.data.payUrl.includes('pay_result'), true, 'payUrl 回跳地址为真实路径（无 # 截断问题）')
assertEq(r.json.data.payUrl.includes('%23'), false, 'payUrl 不含编码后的 #（避免截断 sign）')
const orderNo = r.json.data.orderNo
r = await call('/api/pay/create', { method: 'POST', token, body: { plan: 'nonexistent' } })
assertEq(r.status, 400, '未知套餐被拒')

// 模拟支付宝异步通知（用「支付宝私钥」= 测试私钥签名）
async function alipayNotify(params) {
  const sign = await rsa2Sign(buildSignContent(params), privatePem)
  const form = new FormData()
  for (const [k, v] of Object.entries(params)) form.append(k, v)
  form.append('sign', sign)
  form.append('sign_type', 'RSA2')
  const req = new Request('http://localhost/api/pay/notify', { method: 'POST', body: form })
  return worker.fetch(req, env)
}

const notifyParams = {
  out_trade_no: orderNo,
  trade_no: '202608172200000000000001',
  trade_status: 'TRADE_SUCCESS',
  total_amount: '19.90',
  subject: '入门体验'
}
let notifyRes = await alipayNotify(notifyParams)
assertEq(await notifyRes.text(), 'success', '回调返回 success')
assertEq(userPoints(), pointsBeforePay + 100, '积分自动到账 +100')
const rechargeTxn = db.prepare("SELECT * FROM transactions WHERE type='recharge' ORDER BY id DESC LIMIT 1").get()
assertEq(rechargeTxn.points, 100, '记 recharge 流水')
assertEq(rechargeTxn.ref, orderNo, '流水关联订单号')
assertEq(db.prepare('SELECT status FROM orders WHERE order_no = ?').get(orderNo).status, 'paid', '订单状态 paid')

console.log('  · 幂等：重复回调不重复到账')
const pointsAfterPaid = userPoints()
notifyRes = await alipayNotify(notifyParams)
assertEq(await notifyRes.text(), 'success', '重复回调仍返回 success')
assertEq(userPoints(), pointsAfterPaid, '积分不重复增加')

console.log('  · 并发重复回调：只到账一次')
r = await call('/api/pay/create', { method: 'POST', token, body: { plan: 'regular' } })
const orderNo2 = r.json.data.orderNo
const concNotify = {
  out_trade_no: orderNo2,
  trade_no: '202608172200000000000002',
  trade_status: 'TRADE_SUCCESS',
  total_amount: '39.90',
  subject: '常规使用'
}
const pointsBeforeConcurrent = userPoints()
await Promise.all([alipayNotify(concNotify), alipayNotify(concNotify)])
assertEq(userPoints(), pointsBeforeConcurrent + 250, '并发重复回调只到账一次（+250）')

console.log('  · 入账失败回滚：订单回 pending，重试成功且只到账一次')
r = await call('/api/pay/create', { method: 'POST', token, body: { plan: 'pro' } })
const orderNo3 = r.json.data.orderNo
const rollbackNotify = {
  out_trade_no: orderNo3,
  trade_no: '202608172200000000000003',
  trade_status: 'TRADE_SUCCESS',
  total_amount: '99.00',
  subject: '重度使用'
}
const realBatch = DB.batch
DB.batch = () => {
  throw new Error('mock batch failure')
}
let rollbackRes = await alipayNotify(rollbackNotify)
DB.batch = realBatch
assertEq(rollbackRes.status, 500, '入账失败返回 500（支付宝将重试）')
assertEq(db.prepare('SELECT status FROM orders WHERE order_no = ?').get(orderNo3).status, 'pending', '订单已回滚为 pending')
const pointsBeforeRetry = userPoints()
rollbackRes = await alipayNotify(rollbackNotify)
assertEq(await rollbackRes.text(), 'success', '重试回调成功')
assertEq(userPoints(), pointsBeforeRetry + 800, '重试后只到账一次（+800）')

console.log('  · 金额篡改被拒（重新签名）')
const tampered = await alipayNotify({ ...notifyParams, total_amount: '1.00' })
assertEq(await tampered.text(), 'fail', '金额不一致返回 fail')

console.log('  · 验签失败被拒')
const badForm = new FormData()
for (const [k, v] of Object.entries(notifyParams)) badForm.append(k, v)
badForm.append('sign', 'ZmFrZXNpZ25hdHVyZQ==')
const badReq = new Request('http://localhost/api/pay/notify', { method: 'POST', body: badForm })
assertEq((await worker.fetch(badReq, env)).status, 400, '错误签名返回 400')

console.log('  · 支付结果查询')
r = await call(`/api/pay/result?order_no=${orderNo}`, { token })
assertEq(r.status, 200, '查询订单成功')
assertEq(r.json.data.order.status, 'paid', '订单状态 paid')

console.log('\n▶ 8. 未登录访问受保护接口')
r = await call('/api/me')
assertEq(r.status, 401, '未登录返回 401')

console.log('\n▶ 9. 匿名签发 IP 限流（同一 IP 每分钟 ≤10 次）')
let anon429 = false
for (let i = 0; i < 10; i++) {
  const rr = await call('/api/auth/anonymous', { method: 'POST' })
  if (rr.status === 429) {
    anon429 = true
    break
  }
}
assertEq(anon429, true, '连续签发达到上限后返回 429')

/* ---------- 收尾 ---------- */
globalThis.fetch = realFetch

console.log('\n说明：poster_image/promo_video 积分定价为 config.js 占位（运营待填）；')
console.log('promo_video（视频生成）API 后补，当前返回 501 不扣费；配置 VIDEO_API_KEY 后按异步任务模式实现。')

console.log(`\n结果：${pass} 通过 / ${fail} 失败`)
process.exit(fail > 0 ? 1 : 0)
