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
 *   GRSAI_API_KEY Grsai API Key（必填，Secret 配置，严禁写入前端/代码库）
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
  return env.DB.prepare('SELECT id, anon_id, points FROM users WHERE id = ?').bind(payload.uid).first()
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
  const results = await env.DB.batch([
    env.DB.prepare(
      'UPDATE users SET points = points - ? WHERE id = ? AND points >= ?'
    ).bind(points, userId, points),
    env.DB.prepare(
      "INSERT INTO transactions (user_id, type, points, ref) SELECT ?, 'consume', ?, ? WHERE changes() > 0"
    ).bind(userId, -points, ref)
  ])
  return Number(results[0]?.meta?.changes || 0) > 0
}

/** 退还积分（AI 调用失败时原路退回） */
async function refundPoints(env, userId, points, ref) {
  await env.DB.batch([
    env.DB.prepare(
      `UPDATE users SET points = points + ?
       WHERE id = ?
         AND EXISTS (SELECT 1 FROM transactions WHERE user_id = ? AND type = 'consume' AND ref = ?)
         AND NOT EXISTS (SELECT 1 FROM transactions WHERE user_id = ? AND type = 'refund' AND ref = ?)`
    ).bind(points, userId, userId, ref, userId, ref),
    env.DB.prepare(
      "INSERT INTO transactions (user_id, type, points, ref) SELECT ?, 'refund', ?, ? WHERE changes() > 0"
    ).bind(userId, points, ref)
  ])
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

/** 记录 AI 调用失败（收费工具自动退款） */
async function recordAiError(env, userId, tool, toolId, requestId, e) {
  console.error(`[AI][${toolId}] 调用失败：`, e.message) // 细节仅记日志，不外泄
  if (!tool.free) await refundPoints(env, userId, tool.points, requestId) // 收费工具失败原路退还
  await env.DB.prepare(
    "INSERT INTO ai_calls (user_id, tool, status, points, model) VALUES (?, ?, 'error', 0, ?)"
  ).bind(userId, toolId, CONFIG.GRSAI_MODEL).run()
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
    user: { id: uid, anonId, points: 0 },
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

  // 卡密认领、到账和流水必须在同一个 D1 batch 中原子提交。
  // 唯一 claimRef 让并发失败者的后续语句匹配不到该卡，不会重复加分。
  const claimRef = `${nowIso()}:${crypto.randomUUID()}`
  const results = await env.DB.batch([
    env.DB.prepare(
      "UPDATE cards SET status = 'used', redeemed_by = ?, redeemed_at = ? WHERE code = ? AND status = 'new'"
    ).bind(user.id, claimRef, code),
    env.DB.prepare(
      `UPDATE users
       SET points = points + (SELECT points FROM cards WHERE code = ? AND redeemed_by = ? AND redeemed_at = ?)
       WHERE id = ? AND EXISTS (
         SELECT 1 FROM cards WHERE code = ? AND redeemed_by = ? AND redeemed_at = ?
       )`
    ).bind(code, user.id, claimRef, user.id, code, user.id, claimRef),
    env.DB.prepare(
      `INSERT INTO transactions (user_id, type, points, ref)
       SELECT ?, 'redeem', points, code FROM cards
       WHERE code = ? AND redeemed_by = ? AND redeemed_at = ?`
    ).bind(user.id, code, user.id, claimRef)
  ])
  if (Number(results[0]?.meta?.changes || 0) === 0) {
    return fail('卡密已使用', 409, 'card_used')
  }

  const fresh = await env.DB.prepare('SELECT id, points FROM users WHERE id = ?')
    .bind(user.id).first()
  return ok({ points: fresh.points, added: card.points })
}

/** GET /api/me — 用户信息 + 最近流水 */
async function handleMe(env, user) {
  const txns = await env.DB.prepare(
    'SELECT type, points, ref, created_at FROM transactions WHERE user_id = ? ORDER BY id DESC LIMIT 20'
  ).bind(user.id).all()
  return ok({
    user: { id: user.id, anonId: user.anon_id, points: user.points },
    transactions: txns.results
  })
}

/** POST /api/consume — 通用按次扣分端点；图片生成使用 /api/ai/generate 的原子计费链路。 */
async function handleConsume(env, user, body) {
  const feature = String(body?.feature || '')
  const rule = CONFIG.tools[feature]
  if (!rule) return fail('未知的收费功能', 400, 'unknown_feature')
  if (rule.free) return fail('该功能当前免费，无需扣积分', 400, 'free_feature')

  const charged = await chargePoints(env, user.id, rule.points, `${feature}:${crypto.randomUUID()}`)
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

  const type = tool.type
  const prompt = String(body?.prompt || '').trim()
  if (!prompt) {
    return fail('请提供描述', 400, 'missing_prompt')
  }
  if (prompt.length > CONFIG.MAX_PROMPT_LENGTH) {
    return fail(`图片描述不能超过 ${CONFIG.MAX_PROMPT_LENGTH} 个字符`, 400, 'prompt_too_long')
  }

  // 服务未配置的收费能力提前拦截（不扣费）
  if (type === 'image' && !env.GRSAI_API_KEY) {
    return fail('图片生成服务未配置，请联系管理员', 501, 'image_not_configured')
  }
  if (type === 'video') {
    return fail('视频生成功能筹备中，敬请期待', 501, 'video_not_ready')
  }

  // 在扣分和调用 Grsai 之前先占用限流槽位，避免并发请求同时穿透。
  if (await checkRateLimit(env, 'ai', String(user.id), CONFIG.AI_RATE_LIMIT_PER_MINUTE, 60)) {
    return fail('操作太频繁，请稍后再试', 429, 'rate_limited')
  }

  const requestId = crypto.randomUUID()

  // 扣分（免费工具跳过；收费工具按 points 扣）
  const isFree = tool.free === true
  if (!isFree) {
    const charged = await chargePoints(env, user.id, tool.points, requestId)
    if (!charged) {
      return fail(`积分不足，${tool.name}需要 ${tool.points} 积分，请先兑换卡密`, 409, 'insufficient_points')
    }
  }

  if (type === 'image') {
    return generateImage(env, user, tool, toolId, requestId, prompt)
  }
  return fail('接口不存在', 404, 'not_found')
}

/** 图片生成（只调用 Grsai GPT Image，同步返回 URL） */
async function generateImage(env, user, tool, toolId, taskId, prompt) {
  let imageUrl = ''
  const expiresAt = new Date(Date.now() + 7 * 24 * 3600 * 1000)
    .toISOString().replace('T', ' ').slice(0, 19)
  try {
    const res = await fetch(`${CONFIG.GRSAI_BASE_URL}/images/generations`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${env.GRSAI_API_KEY}`
      },
      body: JSON.stringify({
        model: CONFIG.GRSAI_MODEL,
        prompt,
        image: [],
        size: CONFIG.GRSAI_IMAGE_SIZE,
        response_format: 'url'
      }),
      signal: AbortSignal.timeout(CONFIG.AI_TIMEOUT_MS)
    })
    if (!res.ok) {
      const detail = await res.text().catch(() => '')
      throw new Error(`图片服务错误（${res.status}）：${detail.slice(0, 200)}`)
    }
    const data = await res.json()
    const item = data.data?.[0]
    imageUrl = item?.url || ''
    if (!imageUrl) throw new Error('图片服务未返回有效图片')

    // 生成记录与成功审计一起提交；任一写入失败都会整体回滚并进入退款分支。
    await env.DB.batch([
      env.DB.prepare(
        "INSERT INTO generations (task_id, user_id, type, points, prompt, model, remote_url, expires_at) VALUES (?, ?, 'image', ?, ?, ?, ?, ?)"
      ).bind(taskId, user.id, tool.points, prompt, CONFIG.GRSAI_MODEL, imageUrl, expiresAt),
      env.DB.prepare(
        "INSERT INTO ai_calls (user_id, tool, status, points, model) VALUES (?, ?, 'ok', ?, ?)"
      ).bind(user.id, toolId, tool.points, CONFIG.GRSAI_MODEL)
    ])
  } catch (e) {
    await recordAiError(env, user.id, tool, toolId, taskId, e)
    return fail('图片生成失败，本次未扣费', 502, 'ai_error')
  }

  const points = tool.points
  // 生成已经原子提交，后续余额读取失败不能把一个已付费成功任务伪装成 500。
  let remainingPoints = Math.max(Number(user.points) - points, 0)
  try {
    const fresh = await env.DB.prepare('SELECT id, points FROM users WHERE id = ?')
      .bind(user.id).first()
    if (fresh) remainingPoints = fresh.points
  } catch (e) {
    console.error(`[AI][${toolId}] 成功后读取余额失败：`, e.message)
  }
  return ok({
    type: 'image',
    taskId,
    imageUrl: `/api/generations/${taskId}/file`,
    expiresAt,
    points: remainingPoints,
    deducted: points
  })
}

/** GET /api/generations — 当前游客最近 7 天的生成记录 */
async function handleGenerations(env, user, url) {
  await env.DB.prepare("DELETE FROM generations WHERE expires_at <= datetime('now')").run()
  const type = url.searchParams.get('type') || 'all'
  const filter = type === 'all' ? '' : ' AND type = ?'
  const stmt = env.DB.prepare(
    `SELECT task_id, type, points, prompt, model, created_at, expires_at,
      '/api/generations/' || task_id || '/file' AS file_url
     FROM generations
     WHERE user_id = ? AND expires_at > datetime('now')${filter}
     ORDER BY id DESC LIMIT 50`
  )
  const rows = type === 'all' ? await stmt.bind(user.id).all() : await stmt.bind(user.id, type).all()
  return ok({ items: rows.results })
}

/** GET /api/generations/:taskId/file — 鉴权后由 Worker 拉取 Grsai 文件，不转发游客 token */
async function handleGenerationFile(env, user, taskId) {
  const item = await env.DB.prepare(
    "SELECT remote_url FROM generations WHERE task_id = ? AND user_id = ? AND expires_at > datetime('now')"
  ).bind(taskId, user.id).first()
  if (!item) return fail('图片不存在或已过期', 404, 'generation_not_found')

  let upstream
  try {
    upstream = await fetch(item.remote_url, {
      headers: { Accept: 'image/*' },
      signal: AbortSignal.timeout(CONFIG.AI_TIMEOUT_MS)
    })
  } catch {
    return fail('图片暂时无法读取', 502, 'media_unavailable')
  }
  if (!upstream.ok || !upstream.body) return fail('图片暂时无法读取', 502, 'media_unavailable')

  return new Response(upstream.body, {
    status: 200,
    headers: {
      'Content-Type': upstream.headers.get('Content-Type') || 'image/png',
      'Cache-Control': 'private, max-age=300',
      'X-Content-Type-Options': 'nosniff'
    }
  })
}

/** DELETE /api/generations/:taskId — 只删除当前游客记录 */
async function handleDeleteGeneration(env, user, taskId) {
  const result = await env.DB.prepare(
    'DELETE FROM generations WHERE task_id = ? AND user_id = ?'
  ).bind(taskId, user.id).run()
  if (result.meta.changes === 0) return fail('生成记录不存在', 404, 'generation_not_found')
  return ok({ deleted: true, taskId })
}

/** POST /api/admin/cards — 生成卡密（运营方） */
async function handleAdminCards(env, request, body) {
  const key = request.headers.get('X-Admin-Key') || ''
  if (key !== env.ADMIN_KEY) return fail('无权操作', 401, 'unauthorized')

  const points = Number(body?.points)
  const count = Number(body?.count || 1)
  if (!CONFIG.cardPoints.includes(points)) {
    return fail('卡密面额仅支持 50000 或 100000 积分', 400, 'invalid_points')
  }
  if (!Number.isInteger(count) || count < 1 || count > 100) {
    return fail('数量需在 1-100 之间', 400, 'invalid_count')
  }

  // D1 Free 每次 Worker 调用最多 50 个数据库查询。
  // 每 50 张拼成一个多行 INSERT，100 张只需 2 个语句，并由 batch 原子提交。
  for (let attempt = 0; attempt < 3; attempt++) {
    const used = new Set()
    const codes = []
    while (codes.length < count) {
      const code = randomCardCode()
      if (!used.has(code)) {
        used.add(code)
        codes.push({ code, points })
      }
    }

    const statements = []
    for (let start = 0; start < codes.length; start += 50) {
      const chunk = codes.slice(start, start + 50)
      const placeholders = chunk.map(() => '(?, ?)').join(', ')
      const values = chunk.flatMap((card) => [card.code, card.points])
      statements.push(
        env.DB.prepare(`INSERT INTO cards (code, points) VALUES ${placeholders}`).bind(...values)
      )
    }

    try {
      await env.DB.batch(statements)
      return ok({ count: codes.length, cards: codes })
    } catch (error) {
      if (attempt === 2) throw error
    }
  }
  return fail('卡密生成失败', 500, 'card_generation_failed')
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
    'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
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

    let res
    try {
      res = await routeRequest(request, env)
    } catch (e) {
      console.error('API error:', e)
      res = fail('服务器内部错误', 500, 'internal_error')
    }
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

      // GET /api/generations?type=image — 当前游客生成历史
      if (pathname === '/api/generations' && request.method === 'GET') {
        return handleGenerations(env, user, url)
      }

      // GET /api/generations/:taskId/file — 同域鉴权图片代理
      const fileMatch = pathname.match(/^\/api\/generations\/([0-9a-f-]+)\/file$/i)
      if (fileMatch && request.method === 'GET') {
        return handleGenerationFile(env, user, fileMatch[1])
      }

      // DELETE /api/generations/:taskId — 删除当前游客记录
      const generationMatch = pathname.match(/^\/api\/generations\/([0-9a-f-]+)$/i)
      if (generationMatch && request.method === 'DELETE') {
        return handleDeleteGeneration(env, user, generationMatch[1])
      }
    }

    return fail('接口不存在', 404, 'not_found')
  } catch (e) {
    console.error('API error:', e)
    return fail('服务器内部错误', 500, 'internal_error')
  }
}
