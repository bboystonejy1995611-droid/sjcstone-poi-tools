/**
 * worker/src/config.js — 计费与工具配置（后端为准，前端 siteConfig 仅展示）
 *
 * 修改这里的定价/积分后重新部署即可生效，无需改业务代码。
 */

export const CONFIG = {
  /** 在线支付仍保持关闭；保留旧套餐只为兼容现有支付代码。 */
  cardPlans: [
    { id: 'starter', price: 19.9, points: 100, label: '入门体验' },
    { id: 'regular', price: 39.9, points: 250, label: '常规使用' },
    { id: 'pro', price: 99, points: 800, label: '重度使用' }
  ],

  /** 管理端允许生成的固定卡密面额。 */
  cardPoints: [50000, 100000],

  /** Worker 只代理付费图片能力；免费文字工具在浏览器本地生成。 */
  tools: {
    poster_image: { name: 'AI海报生成器', points: 600, type: 'image' },
    promo_video: { name: '宣传视频生成器', points: 50, type: 'video' }
  },

  /** Grsai GPT Image：节点和模型固定，Key 只允许来自 GRSAI_API_KEY Secret。 */
  GRSAI_BASE_URL: 'https://grsaiapi.com/v1',
  GRSAI_MODEL: 'gpt-image-2',
  GRSAI_IMAGE_SIZE: '1024x1024',

  /** 视频生成 API（后补；配置 VIDEO_API_KEY 与端点后启用） */
  VIDEO_BASE_URL: '',

  /** 匿名 token 有效期（天） */
  TOKEN_TTL_DAYS: 3650,

  /** 同一 token 每分钟 AI 调用上限（防滥用） */
  AI_RATE_LIMIT_PER_MINUTE: 10,

  /** 同一 IP 每分钟匿名签发上限（防批量刷身份） */
  ANON_RATE_LIMIT_PER_MINUTE: 10,

  /** 单次生成等待第三方 AI 的超时（毫秒） */
  AI_TIMEOUT_MS: 60000,

  /** 图片描述上限，防止异常大请求放大上游费用。 */
  MAX_PROMPT_LENGTH: 2000
}
