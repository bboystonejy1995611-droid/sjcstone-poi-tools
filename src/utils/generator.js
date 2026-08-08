/**
 * generator.js — 套餐生成引擎（纯本地逻辑，无外部 API）
 *
 * 输入：行业大类 + POI 细分类目 + 门店名称 + 城市 + 主营产品 + 客单价
 *       + 套餐类型 + 营销目标
 * 输出：3 套方案（引流爆款 / 利润提升 / 会员复购转化），
 *       每套含 套餐名称 / 推荐原价 / 推荐团购价 / 套餐内容 / 适合人群 /
 *       宣传角度 / 短视频标题 / 开头3秒话术 / 核销提醒 / 加购建议。
 */
import {
  PACKAGE_TYPES,
  PLAN_TYPES,
  CATEGORY_RULES,
  GOAL_DISCOUNT,
  GOAL_MARGIN,
  PRICE_LADDER,
  STORE_NAME_MAX
} from '../data/rules'
import { findCategoryGroup, findSubCategory } from '../data/poiCategories'

/* ---------------- 工具函数 ---------------- */

/** [min, max] 区间随机数 */
const rnd = (min, max) => min + Math.random() * (max - min)

/** 随机整数 [min, max] */
const rndInt = (min, max) => Math.floor(rnd(min, max + 1))

/** 从数组中随机取 n 个不重复元素（n 超过长度则取全部） */
function pickN(arr, n) {
  const shuffled = [...arr].sort(() => Math.random() - 0.5)
  return shuffled.slice(0, Math.min(n, arr.length))
}

/** 从数组中随机取 1 个 */
const pickOne = (arr) => arr[Math.floor(Math.random() * arr.length)]

/**
 * 营销价吸附：优先落在团购展示档位（9.9/19.9/…/199），
 * 超过 199 则用 X9 结尾（209/229/299…）
 */
function snapPrice(n) {
  const maxLadder = PRICE_LADDER[PRICE_LADDER.length - 1]
  if (n <= maxLadder) {
    let best = PRICE_LADDER[0]
    for (const p of PRICE_LADDER) {
      if (Math.abs(p - n) < Math.abs(best - n)) best = p
    }
    return best
  }
  const r = Math.round(n)
  return Math.max(199, Math.floor((r + 1) / 10) * 10 - 1)
}

/** 门店简称（用于套餐名称，超长截断） */
function storeShortName(storeName) {
  const name = (storeName || '').trim()
  if (!name) return ''
  return name.length > STORE_NAME_MAX ? name.slice(0, STORE_NAME_MAX) : name
}

/** 文案占位符替换 */
function fill(tpl, ctx) {
  return String(tpl)
    .replaceAll('{city}', ctx.city)
    .replaceAll('{category}', ctx.category)
    .replaceAll('{store}', ctx.store)
    .replaceAll('{name}', ctx.name)
    .replaceAll('{price}', ctx.price)
    .replaceAll('{origin}', ctx.origin)
    .replaceAll('{group}', ctx.group)
}

/* ---------------- 内容生成 ---------------- */

/**
 * 把用户填写的「主营产品/服务」拆分为套餐内容项，
 * 例如「砂锅、烧烤」→ 「砂锅任选1款」「烧烤任选1款」
 */
function buildUserItems(mainProducts) {
  return String(mainProducts || '')
    .split(/[,，、;；\s]+/)
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => `${p}任选1款`)
}

/** 类目特色项：支持 {label, tag} 结构，统一转字符串 */
function normalizeSubItems(sub) {
  return (sub.items || []).map((it) =>
    typeof it === 'string' ? it : `${it.label}${it.tag ? `（${it.tag}）` : ''}`
  )
}

/**
 * 组合套餐内容（3-5 项）：
 *  - 引流款：大类池 + 类目特色 + 用户主营
 *  - 利润款：大类池 + 升级池 + 类目特色
 *  - 会员款：大类池 + 会员权益池 + 类目特色
 */
function buildItems(rule, sub, slot, planKey, userItems) {
  const pool = rule.items[slot] || rule.items.solo
  const subItems = normalizeSubItems(sub)

  let items
  if (planKey === 'yiliu') {
    // 用户主营优先，避免超 5 项截断时被丢掉
    items = [
      ...userItems,
      ...pickN(subItems, Math.min(subItems.length, rndInt(1, 2))),
      ...pickN(pool, rndInt(2, 3))
    ]
  } else if (planKey === 'lirun') {
    items = [
      ...pickN(pool, rndInt(1, 2)),
      ...pickN(rule.upgrade, rndInt(1, 2)),
      ...pickN(subItems, Math.min(subItems.length, 1))
    ]
  } else {
    items = [
      ...pickN(pool, rndInt(1, 2)),
      ...pickN(rule.member, rndInt(2, 3)),
      ...pickN(subItems, Math.min(subItems.length, 1))
    ]
  }

  // 去重 + 截断到 3-5 项
  const uniq = [...new Set(items)]
  return uniq.slice(0, 5).length >= 3 ? uniq.slice(0, 5) : uniq
}

/* ---------------- 名称生成 ---------------- */

/** 方案一（引流）：套餐类型形容词 + 类目词 + 体验套餐 */
function planOneName(pkg, sub, group) {
  const word = pickOne(sub.words || group.words || ['招牌'])
  return `${pkg.nameAdj}${word}体验套餐`
}

/** 方案二（利润）：门店简称 / 类目词 + 尊享套餐 */
function planTwoName(sub, group, storeName) {
  const short = storeShortName(storeName)
  const base = short || pickOne(sub.words || group.words)
  return `${base}尊享套餐`
}

/** 方案三（会员）：门店简称 / 类目词 + 长期消费套餐 */
function planThreeName(sub, group, storeName) {
  const short = storeShortName(storeName)
  const base = short || pickOne(sub.words || group.words)
  return `${base}长期消费套餐`
}

/* ---------------- 价格计算 ---------------- */

/**
 * 价格基准 = 正常客单价 × 套餐人数系数，再按方案类型与营销目标打折。
 * 引流款：团购价 ≈ 客单价 60%-75%；利润款：80%-95%；会员款：体验价+权益。
 */
function calcPrices(base, pkg, goal, planKey) {
  const [fMin, fMax] = pkg.factor
  const perPerson = base * rnd(fMin, fMax)

  let origin, price

  if (planKey === 'yiliu') {
    origin = perPerson * rnd(1.25, 1.5) // 原价做价值锚点
    const [dMin, dMax] = GOAL_DISCOUNT[goal] || GOAL_DISCOUNT.yiliu
    price = perPerson * rnd(dMin, dMax)
  } else {
    const [mMin, mMax] = GOAL_MARGIN[goal] || GOAL_MARGIN.lirun
    price = perPerson * rnd(mMin, mMax)
    origin = planKey === 'lirun'
      ? perPerson * rnd(1.15, 1.3)
      : perPerson * rnd(1.05, 1.2)
  }

  origin = snapPrice(origin)
  price = snapPrice(price)

  // 保护：保证团购价与原价有明显价差（≥ 12% 或 ≥ 10 元）
  if (price >= origin * 0.88) {
    origin = snapPrice(price / 0.72)
  }
  if (price >= origin) {
    origin = snapPrice(price / 0.6)
    if (origin <= price) origin = price + 10
  }

  return { origin, price }
}

/* ---------------- 套餐类型特殊结构 ---------------- */

/** 次卡 / 储值类套餐：在内容开头插入结构性说明 */
function buildTypeLead(pkg, price) {
  if (pkg.value === 'card') return '本套餐为5次卡，可分5次到店使用'
  if (pkg.value === 'recharge') {
    // 加赠至少 10 元，避免低价档算出 0 元让利
    const bonus = Math.max(10, Math.round((price * rnd(0.12, 0.2)) / 10) * 10)
    return `充值${price}元，到账${price + bonus}元`
  }
  if (pkg.value === 'flash') return '限时限量秒杀，售完即止'
  return ''
}

/* ---------------- 视频号宣传文案 ---------------- */

function buildPromoLine(rule, city, category, planOne) {
  const cityText = (city || '').trim() || '本地'
  const hook = pickOne(rule.hooks)
    .replaceAll('{city}', cityText)
    .replaceAll('{price}', planOne.price)
  return `${cityText}${category}${planOne.name} · 原价${planOne.origin}元，团购仅需${planOne.price}元！${hook}`
}

/* ---------------- 主入口 ---------------- */

/**
 * @param {Object} input
 * @param {string} input.category    行业大类 value（见 poiCategories.js）
 * @param {string} input.subCategory POI 细分类目 value
 * @param {string} input.storeName   门店名称
 * @param {string} input.city        所在城市
 * @param {string} input.mainProducts 主营产品/服务
 * @param {number} input.price       正常客单价
 * @param {string} input.packageType 套餐类型 value（见 PACKAGE_TYPES）
 * @param {string} input.goal        营销目标 value（见 GOAL_OPTIONS）
 * @returns {Object} { plans: [...], copyText, promoLine }
 */
export function generatePlans(input) {
  const {
    category = 'qita',
    subCategory = 'qita_all',
    storeName = '',
    city = '',
    mainProducts = '',
    price = 100,
    packageType = 'single',
    goal = 'yiliu'
  } = input

  const group = findCategoryGroup(category)
  const sub = findSubCategory(category, subCategory)
  const pkg = PACKAGE_TYPES.find((p) => p.value === packageType) || PACKAGE_TYPES[0]
  const rule = CATEGORY_RULES[group.value] || CATEGORY_RULES.qita
  const userItems = buildUserItems(mainProducts)
  const base = Number(price) > 0 ? Number(price) : 100
  const cityText = (city || '').trim() || '本地'

  const plans = PLAN_TYPES.map((type) => {
    let name
    if (type.key === 'yiliu') name = planOneName(pkg, sub, group)
    else if (type.key === 'lirun') name = planTwoName(sub, group, storeName)
    else name = planThreeName(sub, group, storeName)

    const { origin, price: salePrice } = calcPrices(base, pkg, goal, type.key)

    let items = buildItems(rule, sub, pkg.slot, type.key, userItems)
    const typeLead = buildTypeLead(pkg, salePrice)
    if (typeLead) items = [typeLead, ...items].slice(0, 5)

    // 文案上下文（占位符替换用）
    const ctx = {
      city: cityText,
      category: sub.label,
      store: storeShortName(storeName) || sub.label,
      name,
      price: salePrice,
      origin,
      group: group.label
    }

    return {
      key: type.key,
      badge: type.badge,
      title: type.title,
      accent: type.accent,
      name,
      origin,
      price: salePrice,
      items,
      purpose: type.purpose,
      crowd: fill(pickOne(type.crowds), ctx),
      angle: fill(pickOne(type.angles), ctx),
      videoTitle: fill(pickOne(type.videoTitles), ctx),
      videoHook: fill(pickOne(type.videoHooks), ctx),
      checkin: fill(pickOne(type.checkins), ctx),
      upsell: fill(pickOne(type.upsells), ctx)
    }
  })

  const planOne = plans[0]
  const promoLine = buildPromoLine(rule, cityText, sub.label, planOne)

  // 一键复制内容（保持原结构，补充短视频标题与核销提醒）
  const copyText = [
    `门店名称：${storeName || '-'}`,
    `推荐团购标题：${planOne.name}`,
    `团购价格：${planOne.price}元`,
    `套餐详情：${planOne.items.join('、')}`,
    `适合人群：${planOne.crowd}`,
    `短视频标题：${planOne.videoTitle}`,
    `到店核销提醒：${planOne.checkin}`,
    `适合视频号宣传：${promoLine}`
  ].join('\n')

  return { plans, copyText, promoLine }
}
