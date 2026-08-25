/**
 * siteConfig.js — 官网落地页可配置信息（上线前必改）
 *
 * 这里集中放「真实业务信息」，页面其余营销文案在各组件内。
 * 替换后重新构建部署即可，无需改组件代码。
 */
export const siteConfig = {
  /**
   * 品牌名（顶部导航 / Hero / 页脚展示）
   * 如已有真实品牌名，直接替换此值即可。
   */
  brandName: '视频号POI商家AI平台',

  /** 品牌定位语（Hero 首屏小标签） */
  brandSlogan: '视频号POI团购 · AI 工具赋能本地商家',

  /** 服务商 / 代理商名称（合作咨询区展示） */
  agentName: '视频号POI服务商',

  /** 商务微信（全站统一） */
  contactWechat: 'EDK_Faucet',

  /**
   * 合作咨询二维码图片地址（预留位，上线前必改）
   * 把二维码图片放到 public/ 下（如 /qr-contact.png）后填写该路径；
   * 留空则显示占位图块。
   */
  contactQrCode: '',

  /** 客服邮箱（可选，留空则不展示） */
  contactEmail: '',

  /**
   * 目标用户（Hero 首屏三列展示）
   * 定位：视频号POI团购 + AI工具赋能本地商家
   */
  targetUsers: [
    {
      name: '本地实体商家',
      desc: '餐饮、美业、零售……把视频号团购做成稳定客流'
    },
    {
      name: '视频号服务商',
      desc: '用 AI 工具链批量服务商家，高效交付 POI 团购方案'
    },
    {
      name: '地推团队',
      desc: '给商家讲得清、演示得快、成交更省力'
    }
  ],

  /**
   * 积分计费配置（与后端 worker/src/config.js 保持一致，后端为准）
   * enabled=false 时隐藏全部付费入口，回到纯免费模式
   */
  billing: {
    enabled: true,
    currency: '积分',

    /**
     * 在线充值（支付宝）开关。
     * 第一阶段方案：人工收款 → 管理员发卡密 → 用户兑换卡密 → 获得积分。
     * 前台暂不开放支付宝在线充值：false 时隐藏「在线充值」Tab 与全部支付按钮，
     * 弹窗直接显示「兑换卡密」页，不会从前台发起支付宝支付请求。
     * 以后需要开放时改为 true 即可重新显示，无需改动支付系统。
     */
    onlinePaymentEnabled: false,

    /** 运营后台允许生成的固定卡密面额（后端仍会再次校验）。 */
    cardDenominations: [50000, 100000],

    /** AI 工具（与后端 tools 一致；free=true 免费；收费工具按 points，积分定价由运营在 worker/src/config.js 填写） */
    tools: [
      { id: 'oral_script', name: 'AI短视频口播生成器', free: true, desc: '短视频口播文案，免费使用', placeholder: '输入产品/主题，如：社区火锅店的招牌毛肚套餐', route: '/tool/oral_script' },
      { id: 'visit_script', name: 'AI探店脚本生成器', free: true, desc: '探店视频脚本，免费使用', placeholder: '输入门店信息，如：奶茶店·步行街店·新开业', route: '/tool/visit_script' },
      { id: 'marketing_plan', name: 'AI营销方案生成器', free: true, desc: '完整营销方案，免费使用', placeholder: '输入门店类型与目标，如：美甲店·想拉新客', route: '/tool/marketing_plan' },
      { id: 'poster_prompt', name: 'AI海报提示词生成器', free: true, desc: '海报 AI 提示词，免费使用', placeholder: '输入海报主题，如：双十一火锅套餐促销', route: '/tool/poster_prompt' },
      { id: 'poster_image', name: 'AI海报生成器', points: 600, type: 'image', desc: '一句话生成门店活动海报图片', placeholder: '输入海报主题与风格，如：双十一火锅套餐促销，喜庆热闹风格，带价格标签', route: '/tool/poster_image' },
      { id: 'promo_video', name: '宣传视频生成器', points: 50, type: 'video', desc: '生成门店宣传视频（即将上线）', placeholder: '输入视频主题，如：新店开业 30 秒宣传片', route: '/tool/promo_video' }
    ],

    /** 充值/卡密套餐（与后端 cardPlans 一致） */
    cardPlans: [
      { id: 'starter', price: 19.9, points: 100, label: '入门体验' },
      { id: 'regular', price: 39.9, points: 250, label: '常规使用' },
      { id: 'pro', price: 99, points: 800, label: '重度使用' }
    ]
  }
}
