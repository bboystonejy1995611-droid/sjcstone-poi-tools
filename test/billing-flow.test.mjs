/**
 * test/billing-flow.test.mjs — 卡密/积分/AI代理 完整流程冒烟测试
 *
 * 用 node:sqlite 内存库模拟 Cloudflare D1，直接调用 worker/src/index.js 的 fetch，
 * mock Grsai GPT Image 接口，验证：
 * 匿名身份 → 固定面额卡密兑换 → 海报扣 600 分/失败退款 →
 * 生成历史与同域图片代理 → 限流 → 管理鉴权与支付兼容。
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
  GRSAI_API_KEY: 'sk-grsai-test' // 测试用；真实环境必须是 Worker Secret
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

/* ---------- mock Grsai GPT Image + 生成图片文件 ---------- */
const realFetch = globalThis.fetch
let mockImageStatus = 200
let lastImageRequest = null
globalThis.fetch = async (url, opts) => {
  const urlStr = String(url)
  if (urlStr.includes('/images/generations')) {
    lastImageRequest = { url: urlStr, opts, body: JSON.parse(opts.body) }
    if (mockImageStatus !== 200) {
      return new Response('{"error":"image upstream down"}', { status: mockImageStatus })
    }
    return new Response(
      JSON.stringify({ data: [{ url: 'https://img.example/poster-1.png' }] }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    )
  }
  if (urlStr === 'https://img.example/poster-1.png') {
    return new Response(new Uint8Array([137, 80, 78, 71]), {
      status: 200,
      headers: { 'Content-Type': 'image/png' }
    })
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
  try {
    const res = await worker.fetch(req, env)
    return { status: res.status, json: await res.json() }
  } catch (error) {
    return { status: 599, json: { ok: false, error: { code: 'unhandled_worker_error', message: error.message } } }
  }
}

async function callRaw(pathname, { method = 'GET', body, token, adminKey } = {}) {
  const headers = {}
  if (body) headers['Content-Type'] = 'application/json'
  if (token) headers.Authorization = `Bearer ${token}`
  if (adminKey) headers['X-Admin-Key'] = adminKey
  const req = new Request(`http://localhost${pathname}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined
  })
  return worker.fetch(req, env)
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

console.log('\n▶ 1b. Worker 只接受 Grsai 图片工具；免费文字工具留在浏览器本地')
r = await call('/api/ai/generate', {
  method: 'POST',
  token,
  body: { tool: 'oral_script', messages: [{ role: 'user', content: 'x' }] }
})
assertEq(r.status, 400, '后端拒绝非图片 AI 工具')
assertEq(r.json.error.code, 'unknown_tool', '只保留 Grsai 图片工具契约')

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
assertEq(r.status, 400, '拒绝非固定面额卡密')
r = await call('/api/admin/cards', { method: 'POST', body: { points: 50000, count: 2 }, adminKey: 'test-admin-key' })
assertEq(r.status, 200, '生成卡密成功')
const cards = r.json.data.cards
assertEq(cards.length, 2, '生成 2 张卡密')
assertEq(cards[0].points, 50000, '面额 50000 积分')
r = await call('/api/admin/cards', { method: 'POST', body: { points: 100000, count: 1 }, adminKey: 'test-admin-key' })
assertEq(r.status, 200, '支持 100000 积分固定面额')

console.log('  · 单批 100 张不超过 D1 每次调用查询数限制')
const prepareBeforeCardBatch = DB.prepare
let cardInsertQueries = 0
DB.prepare = (sql) => {
  if (/^INSERT INTO cards/i.test(sql.trim())) {
    cardInsertQueries++
    if (cardInsertQueries > 50) throw new Error('mock D1 50 queries per invocation limit')
  }
  return prepareBeforeCardBatch.call(DB, sql)
}
r = await call('/api/admin/cards', { method: 'POST', body: { points: 50000, count: 100 }, adminKey: 'test-admin-key' })
DB.prepare = prepareBeforeCardBatch
assertEq(r.status, 200, '可原子生成 100 张卡密')
assertEq(r.json.data?.cards?.length, 100, '100 张卡密全部返回且无部分结果')
assertEq(cardInsertQueries <= 2, true, '100 张卡密最多使用 2 个插入语句')

console.log('\n▶ 3. 兑换卡密（一次性）')
r = await call('/api/cards/redeem', { method: 'POST', body: { code: 'NOPE-XXXXXXXX-XXXXXXXX' }, token })
assertEq(r.status, 404, '不存在的卡密被拒')

const batchBeforeRedeemFailure = DB.batch
DB.batch = () => { throw new Error('mock redeem batch failure') }
r = await call('/api/cards/redeem', { method: 'POST', body: { code: cards[1].code }, token })
DB.batch = batchBeforeRedeemFailure
assertEq(r.status, 500, '兑换原子批次失败返回 500')
assertEq(db.prepare('SELECT status FROM cards WHERE code = ?').get(cards[1].code).status, 'new', '到账失败时卡密仍可用')
assertEq(userPoints(), 0, '到账失败时余额不变')

r = await call('/api/cards/redeem', { method: 'POST', body: { code: cards[0].code }, token })
assertEq(r.status, 200, '兑换成功')
assertEq(r.json.data.added, 50000, '增加 50000 积分')
r = await call('/api/cards/redeem', { method: 'POST', body: { code: cards[0].code }, token })
assertEq(r.status, 409, '同一卡密重复兑换被拒（幂等）')
r = await call('/api/me', { token })
assertEq(r.json.data.user.points, 50000, '重复兑换后余额不变（无双花）')
assertEq(typeof r.json.data.user.anonId, 'string', '返回当前游客 ID')

console.log('\n▶ 4. Grsai 海报生成：成功扣 600 分并创建历史记录')
r = await call('/api/ai/generate', {
  method: 'POST',
  token,
  body: { tool: 'poster_image', prompt: '火锅促销海报，喜庆风格' }
})
assertEq(r.status, 200, '海报生成成功')
assertEq(r.json.data.deducted, 600, '固定扣除 600 积分')
assertEq(r.json.data.points, 49400, '余额 49400 积分')
assertEq(r.json.data.imageUrl.startsWith('/api/generations/'), true, '返回同域鉴权图片路径')
assertEq(r.json.data.imageUrl.endsWith('/file'), true, '图片路径指向文件代理接口')
assertEq(typeof r.json.data.taskId, 'string', '返回生成任务 ID')
assertEq(lastImageRequest.url, 'https://grsaiapi.com/v1/images/generations', '只调用 Grsai 官方节点')
assertEq(lastImageRequest.opts.headers.Authorization, 'Bearer sk-grsai-test', '使用 GRSAI_API_KEY Secret')
assertEq(lastImageRequest.body.model, 'gpt-image-2', '固定使用 gpt-image-2')
assertEq(lastImageRequest.body.size, '1024x1024', '固定生成 1024x1024 图片')
assertEq(lastImageRequest.body.response_format, 'url', '请求 URL 响应格式')
assertEq(txnCount(), 2, '新增 1 条扣费流水')

const generatedTaskId = r.json.data.taskId
r = await call('/api/generations?type=image', { token })
assertEq(r.status, 200, '可读取当前游客的生成历史')
assertEq(r.json.data.items.length, 1, '历史包含刚生成的图片')
assertEq(r.json.data.items[0].task_id, generatedTaskId, '历史任务 ID 正确')
assertEq(r.json.data.items[0].prompt, '火锅促销海报，喜庆风格', '历史保留图片描述')
assertEq(r.json.data.items[0].model, 'gpt-image-2', '历史保留 Grsai 模型名')
let mediaRes = await callRaw(`/api/generations/${generatedTaskId}/file`, { token })
assertEq(mediaRes.status, 200, '可通过同域鉴权接口读取图片')
assertEq(mediaRes.headers.get('Content-Type'), 'image/png', '保留图片 Content-Type')

const secondAnon = await call('/api/auth/anonymous', { method: 'POST' })
const secondToken = secondAnon.json.data.token
r = await call('/api/generations?type=image', { token: secondToken })
assertEq(r.json.data.items.length, 0, '其他游客看不到生成历史')
mediaRes = await callRaw(`/api/generations/${generatedTaskId}/file`, { token: secondToken })
assertEq(mediaRes.status, 404, '其他游客不能读取图片')

console.log('\n▶ 4b. 海报生成失败自动退款')
mockImageStatus = 500
const txnBeforeFail = txnCount()
r = await call('/api/ai/generate', {
  method: 'POST',
  token,
  body: { tool: 'poster_image', prompt: 'x' }
})
assertEq(r.status, 502, '图片服务错误返回 502')
assertEq(r.json.error.code, 'ai_error', '错误码 ai_error')
assertEq(userPoints(), 49400, '积分已退还（余额不变）')
assertEq(txnCount(), txnBeforeFail + 2, '扣费+退款 2 条流水（可对账）')
assertEq(db.prepare('SELECT status FROM ai_calls ORDER BY id DESC LIMIT 1').get().status, 'error', 'ai_calls 标记 error')
mockImageStatus = 200

console.log('\n▶ 4c. 扣分流水写入失败时原子回滚余额')
const prepareBeforeChargeFailure = DB.prepare
let failConsumeLedger = true
DB.prepare = (sql) => {
  const stmt = prepareBeforeChargeFailure.call(DB, sql)
  if (failConsumeLedger && /INSERT INTO transactions/i.test(sql) && /'consume'/i.test(sql)) {
    return {
      ...stmt,
      bind: (...args) => ({
        run: () => {
          failConsumeLedger = false
          throw new Error('mock consume ledger failure')
        }
      })
    }
  }
  return stmt
}
const pointsBeforeChargeFailure = userPoints()
r = await call('/api/ai/generate', {
  method: 'POST',
  token,
  body: { tool: 'poster_image', prompt: '扣分原子性测试' }
})
DB.prepare = prepareBeforeChargeFailure
assertEq(r.status, 500, '消费流水失败返回 500')
assertEq(userPoints(), pointsBeforeChargeFailure, '消费流水失败时 600 积分未丢失')

console.log('\n▶ 4d. 生成已提交后余额读取失败仍返回成功任务')
const prepareBeforePostCommitRead = DB.prepare
let failPostCommitRead = true
DB.prepare = (sql) => {
  const stmt = prepareBeforePostCommitRead.call(DB, sql)
  if (failPostCommitRead && sql.trim() === 'SELECT id, points FROM users WHERE id = ?') {
    return {
      ...stmt,
      bind: (...args) => ({
        first: () => {
          failPostCommitRead = false
          throw new Error('mock post-commit balance read failure')
        }
      })
    }
  }
  return stmt
}
const pointsBeforePostCommitRead = userPoints()
r = await call('/api/ai/generate', {
  method: 'POST',
  token,
  body: { tool: 'poster_image', prompt: '提交后读取失败测试' }
})
DB.prepare = prepareBeforePostCommitRead
assertEq(r.status, 200, '生成记录提交后读取余额失败仍返回 200')
assertEq(typeof r.json.data?.taskId, 'string', '客户端仍拿到已付费任务 ID')
assertEq(userPoints(), pointsBeforePostCommitRead - 600, '成功任务只扣 600 积分')
const postCommitTaskId = r.json.data?.taskId
if (postCommitTaskId) {
  const cleanup = await call(`/api/generations/${postCommitTaskId}`, { method: 'DELETE', token })
  assertEq(cleanup.status, 200, '清理提交后读取测试生成记录')
}

console.log('\n▶ 5. AI 调用限流（每分钟 10 次）')
const pointsBefore429 = userPoints()
for (let i = 0; i < 10; i++) {
  db.prepare("INSERT INTO rate_limits (scope, key) VALUES ('ai', '1')").run()
}
r = await call('/api/ai/generate', {
  method: 'POST',
  token,
  body: { tool: 'poster_image', prompt: '限流测试' }
})
assertEq(r.status, 429, '达到上限后返回 429')
assertEq(userPoints(), pointsBefore429, '429 不影响积分')

console.log('\n▶ 6. 参数与鉴权边界')
r = await call('/api/ai/generate', { method: 'POST', token, body: { tool: 'poster_image' } })
assertEq(r.status, 400, '图片工具缺 prompt 被拒')
r = await call('/api/me', { token: 'abc.def' })
assertEq(r.status, 401, '伪造 token 401')

console.log('\n▶ 6b. 支付宝在线充值（下单 → 回调自动到账）')
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

console.log('\n▶ 7. 删除生成记录与未登录边界')
r = await call(`/api/generations/${generatedTaskId}`, { method: 'DELETE', token })
assertEq(r.status, 200, '当前游客可删除自己的生成记录')
r = await call('/api/generations?type=image', { token })
assertEq(r.json.data.items.length, 0, '删除后历史为空')
r = await call('/api/me')
assertEq(r.status, 401, '未登录返回 401')

console.log('\n▶ 8. 匿名签发 IP 限流（同一 IP 每分钟 ≤10 次）')
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

console.log('\n说明：Worker 只代理 Grsai gpt-image-2；免费文字工具继续在浏览器本地生成。')

console.log(`\n结果：${pass} 通过 / ${fail} 失败`)
process.exit(fail > 0 ? 1 : 0)
