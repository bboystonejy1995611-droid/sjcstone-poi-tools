/**
 * worker/src/index.js — 视频号POI商家AI平台 · 卡密/积分/AI代理 API
 *
 * 运行环境：Cloudflare Workers + D1
 * 依赖：零（Web Crypto / fetch 原生能力）
 *
 * 环境变量（wrangler.toml 或 Cloudflare 控制台配置）：
 *   AUTH_SECRET   HMAC 签名密钥（必填，随机长字符串，Secret 配置）
 *   ADMIN_KEY     管理接口密钥（必填，运营生成卡密用，Secret 配置）
 *   ALLOW_ORIGIN  CORS 允许来源，默认 *；生产建议限定为你的域名
 *   AI_API_KEY    第三方 AI API Key（必填，Secret 配置，严禁写入前端/代码库）
 *   AI_BASE_URL   第三方 AI 地址（默认 OpenAI 兼容 /v1，可选）
 *   AI_MODEL      模型名（可选，默认见 config.js）
 *
 * 路由：
 *   POST /api/auth/anonymous  签发匿名 token（第一阶段身份，无注册/验证码）
 *   POST /api/cards/redeem    兑换卡密 → 加积分
 *   GET  /api/me              当前用户 + 积分 + 最近流水
 *   POST /api/consume         按次扣分（通用，预留）
 *   POST /api/ai/generate     调用付费 AI 工具（鉴权→扣分→代理→失败退还）
 *   POST /api/admin/cards     生成卡密（X-Admin-Key 鉴权）
 */
import { CONFIG } from './config.js'
import { rsa2Verify, buildSignContent, buildPagePayParams, buildPayUrl } from './alipay.js'

const enc = new TextEncoder()

/* ---------------- 工具函数 ---------------- */

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store'
    }
  })
}

function ok(data) {
  return json({ ok: true, data })
}

function fail(message, status = 400, code = 'bad_request') {
  return json({ ok: false, error: { code, message } }, status)
}

async function readBody(request) {
  try {
    return await request.json()
  } catch {
    return null
  }
}

function nowIso() {
  return new Date().toISOString()
}

/** HMAC-SHA256 签名（base64url） */
async function hmacSign(secret, payload) {
  const key = await crypto.subtle.importKey(
    'raw',
    enc.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  )
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(payload))
  return btoa(String.fromCharCode(...new Uint8Array(sig)))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

const b64url = (buf) =>
  btoa(String.fromCharCode(...new Uint8Array(buf)))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')

const b64urlDecode = (s) => {
  const b64 = s.replace(/-/g, '+').replace(/_/g, '/')
  const bin = atob(b64)
  return Uint8Array.from(bin, (c) => c.charCodeAt(0))
}

/** 签发 token：base64url(payload).base64url(sig) */
async function signToken(secret, payloadObj) {
  const payload = b64url(enc.encode(JSON.stringify(payloadObj)))
  const sig = await hmacSign(secret, payload)
  return `${payload}.${sig}`
}

/** 校验 token，返回 payload 或 null */
async function verifyToken(secret, token) {
  try {
    const [payload, sig] = token.split('.')
    if (!payload || !sig) return null
    const expect = await hmacSign(secret, payload)
    if (expect !== sig) return null
    const obj = JSON.parse(new TextDecoder().decode(b64urlDecode(payload)))
    if (!obj.uid || obj.exp < Date.now()) return null
    return obj
  } catch {
    return null
  }
}

/** 校验 Authorization: Bearer xxx，返回用户行或 null */
async function requireUser(request, env) {
  const header = request.headers.get('Authorization') || ''
  const token = header.startsWith('Bearer ') ? header.slice(7) : ''
  if (!token) return null
  const payload = await verifyToken(env.AUTH_SECRET, token)
  if (!payload) return null
  return env.DB.prepare('SELECT id, points FROM users WHERE id = ?').bind(payload.uid).first()
}

/** 卡密字符集（去掉易混淆的 0 O 1 I L） */
const CARD_CHARS = '23456789ABCDEFGHJKMNPQRSTUVWXYZ'

function randomCardCode() {
  const arr = new Uint32Array(16)
  crypto.getRandomValues(arr)
  const raw = Array.from(arr, (n) => CARD_CHARS[n % CARD_CHARS.length]).join('')
  return `VPOI-${raw.slice(0, 8)}-${raw.slice(8, 16)}`
}

/**
 * 原子扣分：points >= 需要积分才成功（防透支）。
 * 注意：不能放进 batch 靠 changes 判断 —— D1 batch 只在语句抛错时回滚。
 */
async function chargePoints(env, userId, points, ref) {
  const res = await env.DB.prepare(
    'UPDATE users SET points = points - ? WHERE id = ? AND points >= ?'
  ).bind(points, userId, points).run()
  if (res.meta.changes === 0) return false
  await env.DB.prepare(
    "INSERT INTO transactions (user_id, type, points, ref) VALUES (?, 'consume', ?, ?)"
  ).bind(userId, -points, ref).run()
  return true
}

/** 退还积分（AI 调用失败时原路退回） */
async function refundPoints(env, userId, points, ref) {
  await env.DB.prepare('UPDATE users SET points = points + ? WHERE id = ?')
    .bind(points, userId).run()
  await env.DB.prepare(
    "INSERT INTO transactions (user_id, type, points, ref) VALUES (?, 'refund', ?, ?)"
  ).bind(userId, points, ref).run()
}

/**
 * 通用限流：scope+key 在 windowSeconds 内的请求数超过 limit 返回 true（应拒绝）。
 * 记录先写入再计数（多一条无害）；created_at 用 SQLite datetime('now') 保证与比较格式一致。
 */
async function checkRateLimit(env, scope, key, limit, windowSeconds) {
  // 顺带清理超窗记录，防止表无限膨胀（清理窗口取限流窗口 10 倍，随参数联动）
  await env.DB.prepare(
    'DELETE FROM rate_limits WHERE created_at < datetime(\'now\', ?)'
  ).bind(`-${windowSeconds * 10} seconds`).run()
  await env.DB.prepare('INSERT INTO rate_limits (scope, key) VALUES (?, ?)').bind(scope, key).run()
  const row = await env.DB.prepare(
    "SELECT COUNT(*) AS c FROM rate_limits WHERE scope = ? AND key = ? AND created_at >= datetime('now', ?)"
  ).bind(scope, key, `-${windowSeconds} seconds`).first()
  return Number(row.c) > limit
}

/** 第三方 AI 调用（OpenAI 兼容 /chat/completions） */
async function callAi(env, messages) {  const apiKey = env.AI_API_KEY
  if (!apiKey) throw new Error('AI_API_KEY 未配置，请联系管理员')
  const baseUrl = (env.AI_BASE_URL || CONFIG.AI_BASE_URL).replace(/\/$/, '')
  const model = env.AI_MODEL || CONFIG.AI_MODEL

  const res = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`
    },
    body: JSON.stringify({ model, messages, temperature: 0.7 }),
    signal: AbortSignal.timeout(CONFIG.AI_TIMEOUT_MS)
  })
  if (!res.ok) {
    const detail = await res.text().catch(() => '')
    throw new Error(`AI 服务错误（${res.status}）：${detail.slice(0, 200)}`)
  }
  const data = await res.json()
  return data.choices?.[0]?.message?.content ?? ''
}

/** 记录 AI 调用成功 */
async function recordAiOk(env, userId, toolId, points, model) {
  await env.DB.prepare(
    "INSERT INTO ai_calls (user_id, tool, status, points, model) VALUES (?, ?, 'ok', ?, ?)"
  ).bind(userId, toolId, points, model).run()
}

/** 记录 AI 调用失败（收费工具自动退款） */
async function recordAiError(env, userId, tool, toolId, e) {
  console.error(`[AI][${toolId}] 调用失败：`, e.message) // 细节仅记日志，不外泄
  if (!tool.free) await refundPoints(env, userId, tool.points, toolId) // 收费工具失败原路退还
  await env.DB.prepare(
    "INSERT INTO ai_calls (user_id, tool, status, points, model) VALUES (?, ?, 'error', 0, ?)"
  ).bind(userId, toolId, env.AI_MODEL || CONFIG.AI_MODEL).run()
}

/* ---------------- 各 API ---------------- */

/** POST /api/auth/anonymous — 签发匿名 token（第一阶段身份，无注册/验证码/手机号） */
async function handleAuthAnonymous(env, request) {
  // IP 限流：防批量刷身份（无实害但避免 D1 写入放大）
  const ip = request.headers.get('CF-Connecting-IP') || 'unknown'
  if (await checkRateLimit(env, 'anon', ip, CONFIG.ANON_RATE_LIMIT_PER_MINUTE, 60)) {
    return fail('操作太频繁，请稍后再试', 429, 'rate_limited')
  }

  const anonId = crypto.randomUUID()
  const res = await env.DB.prepare('INSERT INTO users (anon_id) VALUES (?)').bind(anonId).run()
  const uid = res.meta.last_row_id

  const token = await signToken(env.AUTH_SECRET, {
    uid,
    exp: Date.now() + CONFIG.TOKEN_TTL_DAYS * 24 * 3600 * 1000
  })

  return ok({
    token,
    user: { id: uid, points: 0 },
    note: '匿名身份，积分绑定当前浏览器；请勿清除浏览器数据，否则积分将丢失'
  })
}

/** POST /api/cards/redeem — 兑换卡密 */
async function handleRedeem(env, user, body) {
  const code = String(body?.code || '').trim().toUpperCase()
  if (!code) return fail('请填写卡密', 400, 'missing_code')

  const card = await env.DB.prepare('SELECT * FROM cards WHERE code = ?').bind(code).first()
  if (!card) return fail('卡密不存在', 404, 'card_not_found')
  if (card.status !== 'new') return fail('卡密已使用，请检查是否输错', 409, 'card_used')

  // 幂等防并发：条件更新卡密，只有 status='new' 才成功（防双花）
  const claim = await env.DB.prepare(
    "UPDATE cards SET status = 'used', redeemed_by = ?, redeemed_at = ? WHERE code = ? AND status = 'new'"
  ).bind(user.id, nowIso(), code).run()
  if (claim.meta.changes === 0) return fail('卡密已使用', 409, 'card_used')

  // 加积分 + 记流水（均为无条件语句，batch 保证整体原子）
  await env.DB.batch([
    env.DB.prepare('UPDATE users SET points = points + ? WHERE id = ?')
      .bind(card.points, user.id),
    env.DB.prepare(
      "INSERT INTO transactions (user_id, type, points, ref) VALUES (?, 'redeem', ?, ?)"
    ).bind(user.id, card.points, code)
  ])

  const fresh = await env.DB.prepare('SELECT id, points FROM users WHERE id = ?')
    .bind(user.id).first()
  return ok({ points: fresh.points, added: card.points })
}

/** GET /api/me — 用户信息 + 最近流水 */
async function handleMe(env, user) {
  const txns = await env.DB.prepare(
    'SELECT type, points, ref, created_at FROM transactions WHERE user_id = ? ORDER BY id DESC LIMIT 20'
  ).bind(user.id).all()
  return ok({ user, transactions: txns.results })
}

/** POST /api/consume — 按次扣分（仅收费工具；当前工具全部免费，图片/视频收费工具上线后生效） */
async function handleConsume(env, user, body) {
  const feature = String(body?.feature || '')
  const rule = CONFIG.tools[feature]
  if (!rule) return fail('未知的收费功能', 400, 'unknown_feature')
  if (rule.free) return fail('该功能当前免费，无需扣积分', 400, 'free_feature')

  const charged = await chargePoints(env, user.id, rule.points, feature)
  if (!charged) {
    return fail(`积分不足，${rule.name}需要 ${rule.points} 积分`, 409, 'insufficient_points')
  }

  const fresh = await env.DB.prepare('SELECT id, points FROM users WHERE id = ?')
    .bind(user.id).first()
  return ok({ points: fresh.points, deducted: rule.points, feature })
}

/** POST /api/ai/generate — 调用 AI 工具（按 type 分发：text/image/video） */
async function handleAiGenerate(env, user, body) {
  const toolId = String(body?.tool || '')
  const tool = CONFIG.tools[toolId]
  if (!tool) return fail('未知的 AI 工具', 400, 'unknown_tool')

  const type = tool.type || 'text'
  if (type === 'text' && !(Array.isArray(body?.messages) && body.messages.length > 0)) {
    return fail('请提供内容', 400, 'missing_messages')
  }
  if (type !== 'text' && !String(body?.prompt || '').trim()) {
    return fail('请提供描述', 400, 'missing_prompt')
  }

  // 服务未配置的收费能力提前拦截（不扣费）
  if (type === 'image' && !env.IMAGE_API_KEY) {
    return fail('图片生成服务未配置，请联系管理员', 501, 'image_not_configured')
  }
  if (type === 'video') {
    return fail('视频生成功能筹备中，敬请期待', 501, 'video_not_ready')
  }

  // 限流：同一用户每分钟调用上限。
  // 注意：ai_calls.created_at 用 SQLite datetime('now')（空格格式 YYYY-MM-DD HH:MM:SS），
  // 不能用 JS toISOString()（T 分隔 + 毫秒 + Z）比较 —— 空格(0x20) < 'T'(0x54)，会恒不匹配导致限流失效。
  const recent = await env.DB.prepare(
    "SELECT COUNT(*) AS c FROM ai_calls WHERE user_id = ? AND created_at >= datetime('now','-60 seconds')"
  ).bind(user.id).first()
  if (Number(recent.c) >= CONFIG.AI_RATE_LIMIT_PER_MINUTE) {
    return fail('操作太频繁，请稍后再试', 429, 'rate_limited')
  }

  // 扣分（免费工具跳过；收费工具按 points 扣）
  const isFree = tool.free === true
  if (!isFree) {
    const charged = await chargePoints(env, user.id, tool.points, toolId)
    if (!charged) {
      return fail(`积分不足，${tool.name}需要 ${tool.points} 积分，请先兑换卡密`, 409, 'insufficient_points')
    }
  }

  if (type === 'image') {
    return generateImage(env, user, tool, toolId, body.prompt.trim())
  }
  return generateText(env, user, tool, toolId, body.messages)
}

/** 文本生成（chat/completions） */
async function generateText(env, user, tool, toolId, messages) {
  let text = ''
  try {
    text = await callAi(env, messages)
    if (!text || !text.trim()) {
      // 空结果视为失败（防用户拿到空白内容）
      throw new Error('AI 未返回有效内容，请稍后重试')
    }
  } catch (e) {
    await recordAiError(env, user.id, tool, toolId, e)
    return fail('AI 服务暂时不可用，本次未扣费', 502, 'ai_error')
  }

  const points = tool.free ? 0 : tool.points
  await recordAiOk(env, user.id, toolId, points, env.AI_MODEL || CONFIG.AI_MODEL)
  const fresh = await env.DB.prepare('SELECT id, points FROM users WHERE id = ?')
    .bind(user.id).first()
  return ok({ text, points: fresh.points, deducted: points })
}

/** 图片生成（OpenAI 兼容 /images/generations，同步返回图片 URL/base64） */
async function generateImage(env, user, tool, toolId, prompt) {
  let imageUrl = ''
  try {
    const apiKey = env.IMAGE_API_KEY
    if (!apiKey) throw new Error('IMAGE_API_KEY 未配置')
    const baseUrl = (env.IMAGE_BASE_URL || CONFIG.IMAGE_BASE_URL).replace(/\/$/, '')
    const model = env.IMAGE_MODEL || CONFIG.IMAGE_MODEL

    const res = await fetch(`${baseUrl}/images/generations`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`
      },
      body: JSON.stringify({ model, prompt, size: CONFIG.IMAGE_SIZE, n: 1 }),
      signal: AbortSignal.timeout(CONFIG.AI_TIMEOUT_MS)
    })
    if (!res.ok) {
      const detail = await res.text().catch(() => '')
      throw new Error(`图片服务错误（${res.status}）：${detail.slice(0, 200)}`)
    }
    const data = await res.json()
    const item = data.data?.[0]
    imageUrl = item?.url || (item?.b64_json ? `data:image/png;base64,${item.b64_json}` : '')
    if (!imageUrl) throw new Error('图片服务未返回有效图片')
  } catch (e) {
    await recordAiError(env, user.id, tool, toolId, e)
    return fail('图片生成失败，本次未扣费', 502, 'ai_error')
  }

  const points = tool.free ? 0 : tool.points
  await recordAiOk(env, user.id, toolId, points, env.IMAGE_MODEL || CONFIG.IMAGE_MODEL)
  const fresh = await env.DB.prepare('SELECT id, points FROM users WHERE id = ?')
    .bind(user.id).first()
  return ok({ imageUrl, points: fresh.points, deducted: points })
}

/** POST /api/admin/cards — 生成卡密（运营方） */
async function handleAdminCards(env, request, body) {
  const key = request.headers.get('X-Admin-Key') || ''
  if (key !== env.ADMIN_KEY) return fail('无权操作', 401, 'unauthorized')

  const points = Number(body?.points)
  const count = Number(body?.count || 1)
  if (!Number.isInteger(points) || points <= 0) return fail('面额积分必须是正整数', 400, 'invalid_points')
  if (!Number.isInteger(count) || count < 1 || count > 100) {
    return fail('数量需在 1-100 之间', 400, 'invalid_count')
  }

  const codes = []
  for (let i = 0; i < count; i++) {
    for (let attempt = 0; attempt < 5; attempt++) {
      const code = randomCardCode()
      try {
        await env.DB.prepare('INSERT INTO cards (code, points) VALUES (?, ?)').bind(code, points).run()
        codes.push({ code, points })
        break
      } catch (e) {
        if (attempt === 4) throw e
      }
    }
  }
  return ok({ count: codes.length, cards: codes })
}

/* ---------------- 支付（支付宝自动到账） ---------------- */

/** 生成商户订单号（时间戳 + UUID 片段，防碰撞） */
function genOrderNo() {
  return `VPOI${Date.now()}${crypto.randomUUID().replace(/-/g, '').slice(0, 8)}`
}

/** POST /api/pay/create — 创建充值订单，返回支付宝跳转 URL */
async function handlePayCreate(env, user, body, request) {
  const appId = env.ALIPAY_APP_ID
  const privateKey = env.ALIPAY_PRIVATE_KEY
  const publicKey = env.ALIPAY_PUBLIC_KEY
  if (!appId || !privateKey || !publicKey) {
    return fail('在线充值未配置，请联系管理员（也可使用卡密兑换）', 501, 'pay_not_configured')
  }

  const planId = String(body?.plan || '')
  const plan = CONFIG.cardPlans.find((p) => p.id === planId)
  if (!plan) return fail('未知的充值套餐', 400, 'unknown_plan')

  const orderNo = genOrderNo()
  await env.DB.prepare(
    'INSERT INTO orders (order_no, user_id, plan, amount, points) VALUES (?, ?, ?, ?, ?)'
  ).bind(orderNo, user.id, plan.id, plan.price, plan.points).run()

  const origin = new URL(request.url).origin
  const notifyUrl = env.PAY_NOTIFY_URL || `${origin}/api/pay/notify`
  // 回跳地址用「真实路径 + query」而非 hash：# 会截断 URL 中后续的 sign/biz_content，导致验签失败
  const returnUrl = env.PAY_RETURN_URL || `${origin}/?pay_result=${orderNo}`

  const params = await buildPagePayParams({
    appId,
    privateKey,
    orderNo,
    amount: plan.price,
    subject: `${siteName(env)} · ${plan.label}（${plan.points} 积分）`,
    notifyUrl,
    returnUrl
  })
  const gateway = env.ALIPAY_GATEWAY || 'https://openapi.alipay.com/gateway.do'
  return ok({ orderNo, payUrl: buildPayUrl(gateway, params), amount: plan.price, points: plan.points })
}

function siteName(env) {
  return env.SITE_NAME || '视频号POI商家AI平台'
}

/** POST /api/pay/notify — 支付宝异步通知（验签 + 幂等 + 自动入账） */
async function handlePayNotify(env, request) {
  const form = await request.formData()
  const params = {}
  for (const [k, v] of form.entries()) params[k] = v

  const signature = params.sign
  delete params.sign
  delete params.sign_type

  const verified = await rsa2Verify(buildSignContent(params), signature || '', env.ALIPAY_PUBLIC_KEY || '')
  if (!verified) return new Response('fail', { status: 400 })

  const tradeStatus = params.trade_status
  if (tradeStatus !== 'TRADE_SUCCESS' && tradeStatus !== 'TRADE_FINISHED') {
    return new Response('success') // 非终态，告知支付宝停止通知
  }

  const orderNo = String(params.out_trade_no || '')
  const order = await env.DB.prepare('SELECT * FROM orders WHERE order_no = ?').bind(orderNo).first()
  if (!order) return new Response('fail')

  // 金额校验（先于幂等：任何金额不符的通知都不放过）
  if (Math.abs(Number(params.total_amount) - order.amount) > 0.01) {
    return new Response('fail')
  }

  if (order.status === 'paid') return new Response('success') // 幂等

  // 幂等防并发：条件更新订单为 paid，只有 pending → paid 才成功
  const claim = await env.DB.prepare(
    "UPDATE orders SET status = 'paid', alipay_trade_no = ?, paid_at = ? WHERE order_no = ? AND status = 'pending'"
  ).bind(params.trade_no || '', nowIso(), orderNo).run()
  if (claim.meta.changes === 0) return new Response('success') // 已被其他回调处理

  // 自动入账：加积分 + 记充值流水（batch 原子）
  try {
    await env.DB.batch([
      env.DB.prepare('UPDATE users SET points = points + ? WHERE id = ?').bind(order.points, order.user_id),
      env.DB.prepare(
        "INSERT INTO transactions (user_id, type, points, ref) VALUES (?, 'recharge', ?, ?)"
      ).bind(order.user_id, order.points, orderNo)
    ])
  } catch (e) {
    // 入账失败：回滚订单为 pending，让支付宝重试（避免"已 paid 但积分未到"的永久丢失）
    console.error('[PAY] 入账失败，回滚订单：', orderNo, e)
    await env.DB.prepare(
      "UPDATE orders SET status = 'pending', alipay_trade_no = NULL, paid_at = NULL WHERE order_no = ? AND status = 'paid'"
    ).bind(orderNo).run()
    return new Response('fail', { status: 500 })
  }

  return new Response('success')
}

/** GET /api/pay/result — 查询订单状态（前端支付完成页轮询） */
async function handlePayResult(env, user, url) {
  const orderNo = url.searchParams.get('order_no') || ''
  const order = await env.DB.prepare('SELECT order_no, amount, points, status, created_at FROM orders WHERE order_no = ? AND user_id = ?')
    .bind(orderNo, user.id).first()
  if (!order) return fail('订单不存在', 404, 'order_not_found')
  return ok({ order })
}

/* ---------------- 路由入口 ---------------- */

function corsHeaders(origin) {
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Admin-Key',
    'Access-Control-Max-Age': '86400'
  }
}

export default {
  async fetch(request, env) {
    const origin = env.ALLOW_ORIGIN || '*'

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders(origin) })
    }

    const res = await routeRequest(request, env)
    res.headers.set('Access-Control-Allow-Origin', origin)
    return res
  }
}

async function routeRequest(request, env) {
  const url = new URL(request.url)
  const { pathname } = url

  try {
    // POST /api/auth/anonymous — 匿名身份（无需登录）
    if (pathname === '/api/auth/anonymous' && request.method === 'POST') {
      return handleAuthAnonymous(env, request)
    }

    // POST /api/admin/cards（仅 X-Admin-Key 鉴权，运营方调用，不要求用户登录）
    if (pathname === '/api/admin/cards' && request.method === 'POST') {
      return handleAdminCards(env, request, await readBody(request))
    }

    // POST /api/pay/notify（支付宝异步通知：表单 POST，无鉴权，验签为准）
    if (pathname === '/api/pay/notify' && request.method === 'POST') {
      return handlePayNotify(env, request)
    }

    // 以下接口需要身份 token
    if (pathname.startsWith('/api/')) {
      const user = await requireUser(request, env)
      if (!user) return fail('请先获取身份（刷新页面自动获取）', 401, 'unauthorized')

      // POST /api/cards/redeem
      if (pathname === '/api/cards/redeem' && request.method === 'POST') {
        return handleRedeem(env, user, await readBody(request))
      }

      // POST /api/pay/create — 创建充值订单
      if (pathname === '/api/pay/create' && request.method === 'POST') {
        return handlePayCreate(env, user, await readBody(request), request)
      }

      // GET /api/pay/result — 查询订单状态
      if (pathname === '/api/pay/result' && request.method === 'GET') {
        return handlePayResult(env, user, url)
      }

      // GET /api/me
      if (pathname === '/api/me' && request.method === 'GET') {
        return handleMe(env, user)
      }

      // POST /api/consume
      if (pathname === '/api/consume' && request.method === 'POST') {
        return handleConsume(env, user, await readBody(request))
      }

      // POST /api/ai/generate
      if (pathname === '/api/ai/generate' && request.method === 'POST') {
        return handleAiGenerate(env, user, await readBody(request))
      }
    }

    return fail('接口不存在', 404, 'not_found')
  } catch (e) {
    console.error('API error:', e)
    return fail('服务器内部错误', 500, 'internal_error')
  }
}
