/**
 * 生成逻辑回归测试（升级后版本）
 * 运行：npm test
 */
import { generatePlans } from '../src/utils/generator.js'
import { PRICE_LADDER } from '../src/data/rules.js'

let pass = 0
let fail = 0

function assert(cond, msg) {
  if (cond) {
    pass++
    console.log('  ✓', msg)
  } else {
    fail++
    console.error('  ✗', msg)
  }
}

/** 价格是否落在团购营销档位（9.9/19.9/…/199）或 X9 结尾 */
function isMarketPrice(n) {
  if (PRICE_LADDER.includes(n)) return true
  return n >= 199 && Math.round(n) % 10 === 9
}

const cases = [
  { name: '餐饮美食·火锅·双人套餐·快速引流', input: { category: 'canyin', subCategory: 'huoguo', storeName: '老王火锅', city: '成都', mainProducts: '毛肚、鲜切牛肉', price: 90, packageType: 'duo', goal: 'yiliu' } },
  { name: '丽人美业·美甲美睫·新客体验·拉会员', input: { category: 'meiyi', subCategory: 'meijia', storeName: '指尖美甲', city: '上海', mainProducts: '日式美甲、手部护理', price: 120, packageType: 'newcomer', goal: 'lahuiyuan' } },
  { name: '酒店民宿·亲子房·家庭套餐·提高复购', input: { category: 'jiudian', subCategory: 'qinzifang', storeName: '云栖民宿', city: '大理', mainProducts: '亲子主题房', price: 600, packageType: 'family', goal: 'fugou' } },
  { name: '休闲娱乐·KTV·多人聚会·打造爆款', input: { category: 'xiuxian', subCategory: 'ktv', storeName: '麦浪KTV', city: '杭州', mainProducts: '欢唱包间', price: 68, packageType: 'group', goal: 'baokuan' } },
  { name: '运动健身·私教·次卡套餐·提高利润', input: { category: 'tiyu', subCategory: 'sijiao', storeName: '燃力私教', city: '深圳', mainProducts: '1对1私教', price: 300, packageType: 'card', goal: 'lirun' } },
  { name: '汽车服务·洗车·储值引导·清理库存', input: { category: 'qiche', subCategory: 'xiche', storeName: '亮车坊', city: '广州', mainProducts: '全车精洗', price: 40, packageType: 'recharge', goal: 'qingku' } },
  { name: '亲子娱乐·儿童乐园·单人体验·做口碑传播', input: { category: 'qinzi', subCategory: 'leyuan', storeName: '泡泡乐园', city: '重庆', mainProducts: '海洋球乐园', price: 50, packageType: 'single', goal: 'koubei' } },
  { name: '生活服务·家政·家庭套餐·增加新客', input: { category: 'shenghuo', subCategory: 'jiazheng', storeName: '洁到家', city: '武汉', mainProducts: '深度保洁', price: 200, packageType: 'family', goal: 'xinke' } },
  { name: '教育培训·舞蹈培训·新客体验·打造爆款', input: { category: 'jiaoyu', subCategory: 'wudao2', storeName: '舞动青春', city: '西安', mainProducts: '舞蹈体验课', price: 99, packageType: 'newcomer', goal: 'baokuan' } },
  { name: '零售百货·花店·单人体验·做口碑传播', input: { category: 'lingshou', subCategory: 'huadian', storeName: '花语时光', city: '厦门', mainProducts: '精选花束', price: 88, packageType: 'single', goal: 'koubei' } },
  { name: '其他实体商家·其他·爆款引流·快速引流', input: { category: 'qita', subCategory: 'qita_all', storeName: '全能驿站', city: '青岛', mainProducts: '综合服务', price: 100, packageType: 'hot', goal: 'yiliu' } }
]

const REQUIRED_FIELDS = ['name', 'origin', 'price', 'items', 'crowd', 'angle', 'videoTitle', 'videoHook', 'checkin', 'upsell', 'purpose']

for (const c of cases) {
  console.log('\n▶', c.name)
  const r = generatePlans(c.input)

  assert(r.plans.length === 3, '生成 3 套方案')
  assert(r.copyText.includes('门店名称：'), '复制文本含门店名称')
  assert(r.copyText.includes('推荐团购标题：'), '复制文本含推荐团购标题')
  assert(r.copyText.includes('团购价格：'), '复制文本含团购价格')
  assert(r.copyText.includes('套餐详情：'), '复制文本含套餐详情')
  assert(r.copyText.includes('适合视频号宣传：'), '复制文本含视频号宣传')

  for (const p of r.plans) {
    for (const f of REQUIRED_FIELDS) {
      assert(p[f] !== undefined && p[f] !== '' && (Array.isArray(p[f]) ? p[f].length > 0 : true), `方案含字段 ${f}`)
    }
    assert(p.name.length > 2, `套餐名称有效：${p.name}`)
    assert(p.origin > p.price, `原价${p.origin} > 团购价${p.price}`)
    assert(p.price >= 9.9, `团购价 ≥ 9.9：${p.price}`)
    assert(isMarketPrice(p.price), `团购价在营销档位：${p.price}`)
    assert(p.items.length >= 3 && p.items.length <= 5, `内容 ${p.items.length} 项（3-5）`)
    assert(p.items.length === new Set(p.items).size, '内容无重复')
    const hasPlaceholder = [p.name, p.crowd, p.angle, p.videoTitle, p.videoHook, p.checkin, p.upsell].some((s) => s.includes('{'))
    assert(!hasPlaceholder, '文案无未替换占位符')
  }

  // 类目特色内容融入（火锅用例应出现火锅特色项）
  if (c.input.subCategory === 'huoguo') {
    const hasFeature = r.plans[0].items.some((i) => ['毛肚', '牛肉', '锅底'].some((k) => i.includes(k)))
    assert(hasFeature, `火锅类目特色融入方案一：${r.plans[0].items.join('、')}`)
  }
  // 主营产品融入（任选1款）
  if (c.input.mainProducts) {
    const hasUser = r.plans[0].items.some((i) => i.includes('任选1款'))
    assert(hasUser, `主营产品融入方案一：${r.plans[0].items.join('、')}`)
  }
  // 次卡/储值套餐的结构性内容
  if (c.input.packageType === 'card') {
    assert(r.plans[0].items.some((i) => i.includes('次卡')), '次卡套餐含次卡结构说明')
  }
  if (c.input.packageType === 'recharge') {
    assert(r.plans[0].items.some((i) => i.includes('充值')), '储值套餐含储值结构说明')
  }
}

// 低价边界：客单价 8 元
{
  console.log('\n▶ 低价边界 · 餐饮美食·小吃快餐·单人体验·快速引流（客单价 8 元）')
  const r = generatePlans({ category: 'canyin', subCategory: 'xiaochi', storeName: '街角小吃', city: '西安', mainProducts: '凉皮', price: 8, packageType: 'single', goal: 'yiliu' })
  for (const p of r.plans) {
    assert(p.price >= 9.9, `团购价不低于 9.9：${p.price}`)
    assert(p.origin > p.price, `原价大于团购价：${p.origin} > ${p.price}`)
    const diff = Math.round((p.origin - p.price) * 100) / 100
    assert(diff >= 10, `价差 ≥ 10 元：${p.origin} - ${p.price}`)
  }
}

// 随机性：同一输入两次生成应允许不同（重新生成功能依赖）
const r1 = generatePlans(cases[0].input)
const r2 = generatePlans(cases[0].input)
assert(
  r1.plans[0].price !== r2.plans[0].price || r1.plans[0].name !== r2.plans[0].name,
  '重新生成结果有变化（随机性正常）'
)

console.log(`\n结果：${pass} 通过 / ${fail} 失败`)
process.exit(fail > 0 ? 1 : 0)
