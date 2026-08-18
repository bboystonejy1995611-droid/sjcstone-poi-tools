/**
 * worker/src/alipay.js — 支付宝 RSA2 签名/验签 + 电脑网站支付下单（零依赖，Web Crypto）
 *
 * 配置（Worker Secret / vars，见 worker/README.md）：
 *   ALIPAY_APP_ID      应用 AppID
 *   ALIPAY_PRIVATE_KEY 应用私钥（PKCS8 PEM 或裸 base64）
 *   ALIPAY_PUBLIC_KEY  支付宝公钥（PEM 或裸 base64，用于验签回调）
 *   ALIPAY_GATEWAY     网关（沙箱 https://openapi-sandbox.dl.alipaydev.com/gateway.do）
 */

const b64ToBytes = (b64) => {
  const bin = atob(b64.replace(/-/g, '+').replace(/_/g, '/'))
  return Uint8Array.from(bin, (c) => c.charCodeAt(0))
}

const bytesToB64 = (buf) => btoa(String.fromCharCode(...new Uint8Array(buf)))

/** PEM → 裸 base64 */
const pemToB64 = (pem) =>
  pem.replace(/-----BEGIN [^-]+-----/g, '').replace(/-----END [^-]+-----/g, '').replace(/\s+/g, '')

/** RSA-SHA256 签名（PKCS8 应用私钥） */
export async function rsa2Sign(content, privateKeyPem) {
  const key = await crypto.subtle.importKey(
    'pkcs8',
    b64ToBytes(pemToB64(privateKeyPem)),
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign']
  )
  const sig = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', key, new TextEncoder().encode(content))
  return bytesToB64(sig)
}

/** RSA-SHA256 验签（SPKI 支付宝公钥） */
export async function rsa2Verify(content, signature, publicKeyPem) {
  try {
    const key = await crypto.subtle.importKey(
      'spki',
      b64ToBytes(pemToB64(publicKeyPem)),
      { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
      false,
      ['verify']
    )
    return await crypto.subtle.verify(
      'RSASSA-PKCS1-v1_5',
      key,
      b64ToBytes(signature),
      new TextEncoder().encode(content)
    )
  } catch {
    return false
  }
}

/** 参数按 key 升序拼接（支付宝签名规范：key=value&...，值不编码） */
export function buildSignContent(params) {
  return Object.keys(params)
    .filter((k) => params[k] !== undefined && params[k] !== null && params[k] !== '')
    .sort()
    .map((k) => `${k}=${params[k]}`)
    .join('&')
}

/** 北京时间 yyyy-MM-dd HH:mm:ss（Intl 直接格式化，避免隐晦的宽松解析） */
function beijingNow() {
  const parts = new Intl.DateTimeFormat('zh-CN', {
    timeZone: 'Asia/Shanghai',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  }).formatToParts(new Date())
  const get = (t) => parts.find((p) => p.type === t)?.value || ''
  let hour = get('hour')
  if (hour === '24') hour = '00' // zh-CN 用 24 表示午夜
  return `${get('year')}-${get('month')}-${get('day')} ${hour}:${get('minute')}:${get('second')}`
}

/** 电脑网站支付下单参数（含 sign） */
export async function buildPagePayParams({ appId, privateKey, orderNo, amount, subject, notifyUrl, returnUrl }) {
  const params = {
    app_id: appId,
    method: 'alipay.trade.page.pay',
    format: 'JSON',
    charset: 'utf-8',
    sign_type: 'RSA2',
    timestamp: beijingNow(),
    version: '1.0',
    notify_url: notifyUrl,
    return_url: returnUrl,
    biz_content: JSON.stringify({
      out_trade_no: orderNo,
      total_amount: Number(amount).toFixed(2),
      subject,
      product_code: 'FAST_INSTANT_TRADE_PAY'
    })
  }
  const sign = await rsa2Sign(buildSignContent(params), privateKey)
  return { ...params, sign }
}

/** 拼接网关跳转 URL（全参数标准编码；return_url 不含 #，避免截断后续 sign 等参数） */
export function buildPayUrl(gateway, params) {
  const qs = Object.keys(params)
    .map((k) => `${encodeURIComponent(k)}=${encodeURIComponent(params[k])}`)
    .join('&')
  return `${gateway.replace(/\/$/, '')}?${qs}`
}
