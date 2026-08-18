/**
 * worker/src/config.js — 计费与工具配置（后端为准，前端 siteConfig 仅展示）
 *
 * 修改这里的定价/积分后重新部署即可生效，无需改业务代码。
 */

export const CONFIG = {
  /** 卡密/充值套餐（前端「购买卡密/充值」展示；实际面额以运营生成卡密时指定为准） */
  cardPlans: [
    { id: 'starter', price: 19.9, points: 100, label: '入门体验' },
    { id: 'regular', price: 39.9, points: 250, label: '常规使用' },
    { id: 'pro', price: 99, points: 800, label: '重度使用' }
  ],

  /**
   * AI 工具配置。
   * free: true → 免费使用（不扣积分）；收费工具去掉 free 并按 points 扣费。
   * type: 'text' 文本生成（默认）/ 'image' 图片生成 / 'video' 视频生成（异步，API 后补）。
   */
  tools: {
    oral_script: { name: 'AI短视频口播生成器', points: 5, free: true },
    visit_script: { name: 'AI探店脚本生成器', points: 5, free: true },
    marketing_plan: { name: 'AI营销方案生成器', points: 10, free: true },
    poster_prompt: { name: 'AI海报提示词生成器', points: 3, free: true },
    /**
     * 收费工具（积分定价由运营填写，以下是占位示例，请按你的定价修改）：
     */
    poster_image: { name: 'AI海报生成器', points: 20, type: 'image' },
    promo_video: { name: '宣传视频生成器', points: 50, type: 'video' }
  },

  /** 图片生成 API（OpenAI 兼容 /images/generations，Key 必须用 Worker Secret IMAGE_API_KEY） */
  IMAGE_BASE_URL: 'https://api.openai.com/v1',
  IMAGE_MODEL: 'dall-e-3',
  IMAGE_SIZE: '1024x1024',

  /** 视频生成 API（后补；配置 VIDEO_API_KEY 与端点后启用） */
  VIDEO_BASE_URL: '',

  /** 匿名 token 有效期（天） */
  TOKEN_TTL_DAYS: 30,

  /** 同一 token 每分钟 AI 调用上限（防滥用） */
  AI_RATE_LIMIT_PER_MINUTE: 10,

  /** 同一 IP 每分钟匿名签发上限（防批量刷身份） */
  ANON_RATE_LIMIT_PER_MINUTE: 10,

  /** 单次生成等待第三方 AI 的超时（毫秒） */
  AI_TIMEOUT_MS: 60000,

  /** 第三方 AI 接口（OpenAI 兼容 /chat/completions） */
  // AI_BASE_URL / AI_API_KEY / AI_MODEL 建议用 Worker 环境变量覆盖：
  //   AI_BASE_URL 默认 OpenAI；AI_API_KEY 必须用 Secret 配置，严禁写入前端或代码库
  AI_BASE_URL: 'https://api.openai.com/v1',
  AI_MODEL: 'gpt-4o-mini'
}
