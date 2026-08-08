/**
 * analytics.js — 数据统计埋点函数（预留位）
 *
 * 当前免费测试版：所有函数只 console.log，不发任何外部请求，不影响页面使用。
 * 以后接入真实统计平台（Cloudflare Web Analytics / Google Analytics / Umami / 自建后台）时，
 * 只需在下方 _report 中按平台补上上报实现，业务代码无需改动。
 *
 * 已封装事件：
 *   trackPageView()                     页面访问
 *   trackGeneratePlan(data)             点击「生成我的团购方案」
 *   trackCopyResult(data)               点击「一键复制」
 *   trackCategorySelect(data)           选择行业大类 / POI 细分类目
 */

/** 平台接入开关（当前全部关闭） */
const PLATFORMS = {
  cloudflare: { enabled: false }, // Cloudflare Web Analytics（Beacon）
  google: { enabled: false }, // Google Analytics 4（gtag）
  umami: { enabled: false }, // Umami
  custom: { enabled: false } // 自建后台统计接口
}

/**
 * 统一上报入口：当前仅本地日志，接入平台后在此分发。
 * @param {string} event  事件名
 * @param {object} payload 事件数据
 */
function _report(event, payload) {
  // 测试版：仅打印，方便调试，不影响使用
  if (import.meta.env.DEV) {
    console.info(`[analytics] ${event}`, payload)
  }
  // ── 以后在此处按 PLATFORMS 开关分发 ──
  // if (PLATFORMS.cloudflare.enabled) { window.__cfBeacon?.push?.(['event', event, payload]) }
  // if (PLATFORMS.google.enabled) { window.gtag?.('event', event, payload) }
  // if (PLATFORMS.umami.enabled) { window.umami?.track?.(event, payload) }
  // if (PLATFORMS.custom.enabled) { fetch(PLATFORMS.custom.endpoint, { ... }) }
}

/** 页面访问 */
export function trackPageView() {
  _report('page_view', { url: location.href, title: document.title })
}

/**
 * 生成方案
 * @param {{industryCategory?: string, poiCategory?: string, city?: string, price?: number, packageType?: string, marketingGoal?: string}} data
 */
export function trackGeneratePlan(data = {}) {
  _report('generate_plan', {
    industryCategory: data.industryCategory || '',
    poiCategory: data.poiCategory || '',
    city: data.city || '',
    price: data.price || 0,
    packageType: data.packageType || '',
    marketingGoal: data.marketingGoal || ''
  })
}

/**
 * 复制方案
 * @param {{industryCategory?: string, poiCategory?: string, city?: string}} data
 */
export function trackCopyResult(data = {}) {
  _report('copy_result', {
    industryCategory: data.industryCategory || '',
    poiCategory: data.poiCategory || '',
    city: data.city || ''
  })
}

/**
 * 选择行业大类 / POI 细分类目
 * @param {{industryCategory?: string, poiCategory?: string}} data
 */
export function trackCategorySelect(data = {}) {
  _report('category_select', {
    industryCategory: data.industryCategory || '',
    poiCategory: data.poiCategory || ''
  })
}
