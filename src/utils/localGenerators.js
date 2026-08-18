/**
 * localGenerators.js — 免费文字工具本地生成器（纯前端，零依赖）
 *
 * 所有免费文字工具在此实现「用户输入 → 本地模板/规则 → 直接生成结果」。
 * 不调用 /api/*、不调用 Worker、不调用任何第三方 API、不需要 API Key。
 * 每次生成通过随机模板组合产生不同结果。
 */

// ==================== 通用工具 ====================

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)]
}

function shuffle(arr) {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

/** 从用户输入中提取有意义的片段（按常见分隔符切分，去空白与语气词） */
function extractKeywords(input) {
  const raw = input.trim()
  const parts = raw
    .split(/[·、,，。；;|/／\s]+/)
    .map((s) => s.trim())
    .filter((s) => s.length >= 2)
  const stopWords = ['一家', '一个', '这个', '那个', '我们', '咱们', '的店', '门店', '店铺', '商家']
  return parts.filter((s) => !stopWords.includes(s)).slice(0, 6)
}

/** 生成随机 id 后缀，让结果可见地有变化 */
function variation() {
  return Math.floor(Math.random() * 100)
}

// ==================== 1. 短视频口播文案 ====================

const ORAL_OPENERS = [
  '你有没有发现，{kw}已经悄悄成了这条街的“人气王”？',
  '今天必须跟大家聊聊{kw}，因为真的藏不住了！',
  '如果你家附近有这样一家店，一定要看到最后——{kw}，来了。',
  '最近总有人问我去哪吃/买/体验，今天统一回复：{kw}，真的可以冲。'
]

const ORAL_PAIN = [
  '很多朋友纠结：怕踩坑、怕花冤枉钱、怕跟风去了结果一般般。',
  '说实话，现在同质化太严重，真正值得专门跑一趟的店不多了。',
  '你身边是不是也有那种“看视频很心动，去了却失望”的店？',
  '同一条街这么多家，凭什么选这家？答案往下看。'
]

const ORAL_HOOK = [
  '咱们先说重点，{kw}最打动我的是这三件事：',
  '我替大家把功课做完了，{kw}有几点必须划重点：',
  '不卖关子，{kw}值得推荐的理由，我总结成了三点：'
]

const ORAL_BODY = [
  '第一，用料/选品实在，老板不糊弄人；第二，价格在同品质里很有竞争力；第三，体验节奏舒服，不会催你、不会尴尬。',
  '第一眼印象就很好：干净、亮堂、有辨识度；产品本身能打，味道/效果在线；最加分的是服务细节，能感觉到是在用心经营。',
  '先说性价比：分量足、价格实在，人均消费不心疼；再说体验：从进店到结束都很顺畅；最后是复购理由——已经想好下次什么时候再来了。'
]

const ORAL_CTA = [
  '地址我放在评论区了，{kw}，趁着最近有活动赶紧安排！',
  '别光收藏，记得去体验一次，{kw}不会让你失望的。',
  '如果你们也有私藏的好店，欢迎在评论区互相安利。记得点赞关注，下期继续带你们挖宝！'
]

const ORAL_TAGS = [
  ' #本地生活 #同城好店 #视频号团购',
  ' #探店 #好店推荐 #同城打卡',
  ' #本地美食 #同城优惠 #周末去哪'
]

export function generateOralScript(input) {
  const kws = extractKeywords(input)
  const kw = kws.length ? kws.join('·') : (input.trim() || '这家店')
  const opener = pick(ORAL_OPENERS).replaceAll('{kw}', kw)
  const pain = pick(ORAL_PAIN)
  const hook = pick(ORAL_HOOK).replaceAll('{kw}', kw)
  const body = pick(ORAL_BODY)
  const cta = pick(ORAL_CTA).replaceAll('{kw}', kw)
  const tags = pick(ORAL_TAGS)
  return [
    opener,
    '',
    pain,
    '',
    hook,
    body,
    '',
    cta + tags,
    '',
    `（本口播由本地模板生成，时长约 30–45 秒，建议真人出镜更有感染力，第 ${variation()} 版）`
  ].join('\n')
}

// ==================== 2. 探店视频脚本 ====================

const VISIT_SCENES = [
  {
    title: '开场 0–5s',
    visual: ['店门口全景 / 招牌特写，手持镜头快速走进店内', '沿街扫一圈门头，定格在招牌上'],
    voice: ['“今天带大家来探一家店，先说结论：值得来。”', '“这条街逛了一圈，最想进去的就是这家。”']
  },
  {
    title: '环境 5–15s',
    visual: ['店内环境环绕一圈，拍吧台/操作区/座位区', '特写桌面、灯光、摆盘，随手拍两三个细节'],
    voice: ['“环境我先替大家看过了，干净、亮堂，第一印象分很高。”', '“店里氛围很舒服，不管是约会还是朋友小聚都合适。”']
  },
  {
    title: '招牌 15–35s',
    visual: ['招牌产品端上来，怼近特写，再来一个“入口/体验”镜头', '老板或店员简单介绍一句招牌的做法/卖点'],
    voice: ['“重头戏来了，{kw}，光看颜值就已经赢了。”', '“这就是他家的招牌——{kw}，我先替大家尝尝。”']
  },
  {
    title: '体验 35–45s',
    visual: ['真实体验过程：吃/用/试，给出反应镜头', '穿插价格牌或菜单特写'],
    voice: ['“口感/效果是真的在线，重点是价格也不贵。”', '“体验完最大的感受就是：还会想来第二次。”']
  },
  {
    title: '结尾 45–60s',
    visual: ['站在门口或店内收尾，指着招牌', '放出门店定位与活动信息'],
    voice: ['“地址定位放这里了，最近还有活动，{kw}安排上！”', '“想来的朋友记得先看评论区，有惊喜。点赞关注，下期继续！”']
  }
]

export function generateVisitScript(input) {
  const kws = extractKeywords(input)
  const kw = kws.length ? kws.join('·') : (input.trim() || '这家店')
  const scenes = shuffle(VISIT_SCENES).map((scene, i) => {
    const visual = pick(scene.visual)
    const voice = scene.voice[Math.floor(Math.random() * scene.voice.length)].replaceAll('{kw}', kw)
    return `【${i + 1}. ${scene.title}】\n画面：${visual}\n口播：${voice}`
  })
  return [
    `探店视频脚本（对象：${input.trim()}）`,
    '',
    ...scenes,
    '',
    '拍摄提示：全程手持/稳定器皆可，控制在 60 秒内；字幕建议把招牌名与价格放大显示。',
    `（本脚本由本地模板生成，第 ${variation()} 版）`
  ].join('\n')
}

// ==================== 3. 商家营销方案 ====================

const MKT_GOALS = [
  '把“路过的人”变成“进店的人”，把“来过一次”变成“月月都来”。',
  '用 1 个月时间把门店在视频号/朋友圈里的存在感打出来，先解决“没人知道”的问题。',
  '不烧钱投流，靠内容和活动把周边 3 公里的客流拉起来。'
]

const MKT_AUDIENCES = [
  '周边 3 公里内的年轻上班族与年轻家庭：看重方便、性价比、口碑。',
  '25–40 岁本地消费者：刷视频号、看团购、吃“种草”这一套。',
  '老客与会员：提供复购理由，让熟客主动帮你转介绍。'
]

const MKT_CHANNELS = [
  '视频号短视频 + 直播：每周 2–3 条探店/产品视频，配合 POI 定位挂团购链接。',
  '朋友圈 + 私域社群：老板/店员人设号每天发 1 条真实日常，社群发专属福利。',
  '同城地推 + 异业合作：联合周边互补商家互相导流，地推扫码加企微送小礼品。'
]

const MKT_ACTIONS = [
  '主推款打爆：选 1 个高毛利招牌产品做 9.9/19.9 引流套餐，视频号上架团购，用低价换第一批评价和口碑。',
  '会员锁客：消费即送积分/集章，满 5 次送一次，把散客变成回头客。',
  '老带新裂变：老客带新客，双方各得一份赠品，配合企微一对一私聊提醒。',
  '限时活动造势：每月做一次主题日（如“会员日”“周三半价”），提前 3 天在视频号预告。'
]

const MKT_PLAN = [
  '第一周：完成账号搭建与内容规划，拍 3 条短视频（招牌介绍/门店日常/活动预告），上架引流团购。',
  '第二周：启动社群与地推，会员体系上线，收集首批 50 条真实好评。',
  '第三周：开启第一波主题日活动，视频号直播 1 次，用活动数据复盘优化。',
  '第四周：复盘数据（到店率/复购率/团购核销率），固化有效打法，进入下一个月循环。'
]

const MKT_METRICS = [
  '到店人数、团购核销率、复购率、客单价、私域新增好友数。',
  '视频号播放量、POI 点击量、团购券核销数、会员转化率、好评数。'
]

export function generateMarketingPlan(input) {
  const kws = extractKeywords(input)
  const subject = kws.length ? kws.join('·') : (input.trim() || '门店')
  const goals = shuffle(MKT_GOALS).slice(0, 1)
  const audiences = shuffle(MKT_AUDIENCES).slice(0, 2)
  const channels = shuffle(MKT_CHANNELS).slice(0, 3)
  const actions = shuffle(MKT_ACTIONS).slice(0, 3)
  const plan = shuffle(MKT_PLAN)
  const metrics = pick(MKT_METRICS)
  return [
    `门店营销方案（对象：${input.trim()}）`,
    '',
    `一、目标定位\n${goals[0]}`,
    `二、目标人群\n${audiences.map((a) => `- ${a}`).join('\n')}`,
    `三、渠道组合\n${channels.map((c) => `- ${c}`).join('\n')}`,
    `四、活动方案\n${actions.map((a) => `- ${a}`).join('\n')}`,
    `五、执行节奏\n${plan.map((p) => `- ${p}`).join('\n')}`,
    `六、数据指标\n${metrics}`,
    `七、预算建议\n- 前期以内容+活动为主，预算优先给引流团购让利与赠品；单店首月建议控制在 1000–3000 元，跑通后再放大。`,
    '',
    `（本方案由本地模板生成，围绕“${subject}”展开，第 ${variation()} 版；请结合门店实际成本与库存调整）`
  ].join('\n\n')
}

// ==================== 4. 海报提示词 ====================

const POSTER_STYLES = [
  '扁平插画风，色彩明快，大面积撞色',
  '国潮插画风，红金主色，中式纹理元素',
  '极简留白风，高级灰+单色点缀',
  '手绘水彩风，柔和渐变，温暖治愈'
]

const POSTER_SCENES = [
  '主体居中置于画面中央，背景为门店/产品氛围场景',
  '主体在画面右半侧，左侧留出大段文字排版区',
  '俯视角度构图，产品平铺展示，四周点缀食材/细节元素'
]

const POSTER_DETAILS = [
  '加入诱人的光影与高光，突出质感；角落放门店小字与定位信息。',
  '加入飘落的装饰元素（花瓣/食材/气泡），增强节日与促销氛围。',
  '突出价格标签与“限时”视觉符号，强化紧迫感。'
]

const POSTER_COPY = [
  '大字主标题放“招牌/主推”名称，副标题放“限时优惠/到店立享”，底部放地址与预约方式。',
  '标题用加粗圆体，价格用超大号数字放大显示，副文案一句话点明卖点。',
  '主标题 + 一行副文案 + 底部引导行动按钮（如“立即抢购”）。'
]

const POSTER_SIZES = [
  '竖版 3:4（朋友圈/视频号封面推荐）；横版 16:9（视频号直播预告）',
  '竖版 3:4 主图 + 方形 1:1 分享图各一张',
  '9:16 竖版长图，适合视频号/朋友圈全屏展示'
]

export function generatePosterPrompt(input) {
  const kws = extractKeywords(input)
  const subject = kws.length ? kws.join('、') : (input.trim() || '主题')
  const style = pick(POSTER_STYLES)
  const scene = pick(POSTER_SCENES)
  const detail = pick(POSTER_DETAILS)
  const copy = pick(POSTER_COPY)
  const size = pick(POSTER_SIZES)
  return [
    `海报设计提示词（主题：${input.trim()}）`,
    '',
    `海报主体：${subject}，突出主推卖点与价格优势。`,
    `视觉风格：${style}。`,
    `画面构图：${scene}。`,
    `细节要求：${detail}`,
    `文字排版：${copy}`,
    `尺寸规格：${size}`,
    '',
    '可直接将以上内容复制到支持文生图的工具中使用；如平台要求英文提示词，可把“视觉风格/构图”两行翻译为英文后再提交。',
    `（本提示词由本地模板生成，第 ${variation()} 版）`
  ].join('\n')
}

// ==================== 导出入口 ====================

/** 按工具 id 分发本地生成；返回 { text }，与后端返回结构一致 */
export function generateLocalTool(toolId, input) {
  switch (toolId) {
    case 'oral_script':
      return { text: generateOralScript(input) }
    case 'visit_script':
      return { text: generateVisitScript(input) }
    case 'marketing_plan':
      return { text: generateMarketingPlan(input) }
    case 'poster_prompt':
      return { text: generatePosterPrompt(input) }
    default:
      throw new Error('未支持的本地生成工具')
  }
}
