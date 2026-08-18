# 卡密 / 积分 / AI代理 API（Cloudflare Worker + D1）

前后端分离：前端（Cloudflare Pages 静态站）通过 `fetch` 调用本 API。计费方案见 `docs/billing-plan.md`。

## 目录

```
worker/
├── wrangler.toml        # Worker 配置（需替换 D1 database_id）
├── schema.sql           # D1 表结构（users/cards/transactions/ai_calls）
├── src/
│   ├── index.js         # API 全部逻辑（零依赖）
│   └── config.js        # 工具积分/卡密套餐/AI 端点配置（后端为准）
└── scripts/
    └── gen-cards.mjs    # 运营脚本：批量生成卡密
```

## API 一览

| 方法 | 路径 | 鉴权 | 说明 |
|---|---|---|---|
| POST | `/api/auth/anonymous` | 无 | 签发匿名 token（第一阶段身份，无注册/验证码） |
| POST | `/api/cards/redeem` | Bearer token | 兑换卡密 → 加积分（一次性） |
| GET | `/api/me` | Bearer token | 当前用户 + 积分 + 最近流水 |
| POST | `/api/consume` | Bearer token | 按次扣分（通用） |
| POST | `/api/ai/generate` | Bearer token | 调 AI 工具（按 type 分发）：鉴权→限流→（收费工具扣分）→代理文本/图片 AI→失败/空结果退还积分；视频未配置返回 501 |
| POST | `/api/pay/create` | Bearer token | 创建充值订单，返回支付宝跳转 URL |
| POST | `/api/pay/notify` | 验签 | 支付宝异步通知：验签→金额校验→幂等→自动加积分 |
| GET | `/api/pay/result` | Bearer token | 查询充值订单状态（支付结果页轮询） |
| POST | `/api/admin/cards` | `X-Admin-Key` | 批量生成卡密 |

## 部署步骤（一次性）

```bash
cd worker

# 1. 安装 wrangler（仅部署/开发需要，运行时无任何依赖）
npm i -D wrangler

# 2. 登录 Cloudflare
npx wrangler login

# 3. 创建 D1 数据库，把输出的 database_id 填入 wrangler.toml
npx wrangler d1 create poi-billing

# 4. 初始化表结构（--remote 为线上库，--local 为本地模拟）
npx wrangler d1 execute poi-billing --remote --file=./schema.sql

# 5. 配置密钥（Secret，会提示输入；严禁写入前端代码或代码库）
npx wrangler secret put AUTH_SECRET   # HMAC 签名密钥，随机长字符串
npx wrangler secret put ADMIN_KEY     # 管理接口密钥，运营生成卡密用
npx wrangler secret put AI_API_KEY    # 第三方文本 AI API Key
npx wrangler secret put IMAGE_API_KEY # 图片生成 API Key（OpenAI 兼容，海报生成器用）

# 6.（可选）配置 AI 服务与 CORS，写到 wrangler.toml 的 [vars]
#   AI_BASE_URL   = "https://api.openai.com/v1"   # 文本 AI，默认 OpenAI 兼容
#   AI_MODEL      = "gpt-4o-mini"
#   IMAGE_BASE_URL = "https://api.openai.com/v1"  # 图片 AI，默认 OpenAI 兼容
#   IMAGE_MODEL   = "dall-e-3"
#   ALLOW_ORIGIN  = "https://tools.sjcstone.cn"

# 7.（支付宝在线充值，可选）配置密钥（Secret）与网关（vars）
npx wrangler secret put ALIPAY_APP_ID       # 支付宝开放平台应用 AppID
npx wrangler secret put ALIPAY_PRIVATE_KEY  # 应用私钥（PKCS8 PEM，用于下单签名）
npx wrangler secret put ALIPAY_PUBLIC_KEY   # 支付宝公钥（用于回调验签）
# [vars] 沙箱调试：
#   ALIPAY_GATEWAY = "https://openapi-sandbox.dl.alipaydev.com/gateway.do"

# 8. 部署
npx wrangler deploy
```

## 与前端域名打通（推荐）

在 Cloudflare 控制台把 Worker 绑定到 `tools.sjcstone.cn` 的 `/api/*` 路径：

- Pages 项目 →「自定义域」或「Workers 路由」→ 添加路由 `tools.sjcstone.cn/api/*` → 指向 `poi-billing-api`
- 前端请求统一发到 `https://tools.sjcstone.cn/api/*`（前端 API base 见 `src/utils/api.js` 的 `API_BASE`）
- 若暂不绑域名，可先用 `https://poi-billing-api.<你的子域>.workers.dev/api/*`，并把 `API_BASE` 改为该地址

## 本地开发验证

```bash
cd worker
npx wrangler dev --local
# 另开终端：
curl -X POST http://localhost:8787/api/auth/anonymous
# → 返回 token（后续请求带 Authorization: Bearer <token>）
```

## 运营：生成卡密

```bash
# 方式一：脚本（推荐，支持批量）
node worker/scripts/gen-cards.mjs --points 100 --count 10 --api https://tools.sjcstone.cn/api --key 你的ADMIN_KEY

# 方式二：直接调接口
curl -X POST https://tools.sjcstone.cn/api/admin/cards \
  -H "Content-Type: application/json" \
  -H "X-Admin-Key: 你的ADMIN_KEY" \
  -d '{"points":100,"count":5}'
```

生成的卡密形如 `VPOI-XXXXXXXX-XXXXXXXX`，发给客户后在网站「兑换卡密」处兑换成积分。

## 价格与积分配置

`src/config.js` 集中配置（改后重新部署即生效）：

- `cardPlans` — 卡密套餐（19.9 元=100 积分、39.9 元=250 积分、99 元=800 积分）
- `tools` — 各 AI 工具配置：免费工具 `free: true`；**收费工具（poster_image 海报 / promo_video 视频）的 `points` 积分定价由运营填写**（当前为占位示例 20/50）；收费工具去掉 `free` 即按 `points` 扣积分
- `AI_BASE_URL` / `AI_MODEL` — 文本 AI；`IMAGE_BASE_URL` / `IMAGE_MODEL` / `IMAGE_SIZE` — 图片 AI（均可用环境变量覆盖，Key 走 Secret）
- 视频生成（promo_video）：API 后补——当前调用返回 501 不扣费；接入时配置 `VIDEO_API_KEY`（Secret）与 `VIDEO_BASE_URL` 后实现异步任务（提交→轮询）

> 前端 `src/config/siteConfig.js` 的 `billing` 与后端保持一致（仅展示，真正扣费以后端为准）。

## 安全说明

- **AI_API_KEY 只存 Worker Secret**，前端永远拿不到；AI 调用统一由 Worker 代理。
- 匿名 token 由 `AUTH_SECRET` HMAC 签名，前端无法伪造；积分必须靠真实卡密兑换。
- 卡密一次性：条件更新 `WHERE status='new'` + 检查影响行数，防重复兑换/双花。
- 扣分防透支：`UPDATE users SET points = points - ? WHERE id = ? AND points >= ?`，余额不足直接拒绝。
- AI 调用失败自动原路退还积分，并记录 `refund` 流水与 `ai_calls(status=error)`。
- 限流：AI 调用同一用户每分钟上限（`AI_RATE_LIMIT_PER_MINUTE`，默认 10）；匿名签发同一 IP 每分钟上限（`ANON_RATE_LIMIT_PER_MINUTE`，默认 10）。
- 短信验证码、手机号注册等**第二阶段再做**（第一阶段匿名身份）。

## 支付宝在线充值（自动到账）

流程：用户选套餐 → `POST /api/pay/create` 创建订单并返回支付宝收银台地址 → 用户付款 → 支付宝异步通知 `POST /api/pay/notify`（RSA2 验签 + 金额校验 + 幂等）→ **自动给用户加积分**（记 `recharge` 流水）。

- **签约**：支付宝开放平台（open.alipay.com）→ 创建应用 → 签约「电脑网站支付」（个人主体可申请；沙箱环境可在开放平台控制台调试）。
- **密钥**：应用私钥（`ALIPAY_PRIVATE_KEY`）用于下单签名；支付宝公钥（`ALIPAY_PUBLIC_KEY`）用于回调验签。生成/上传密钥流程按支付宝官方「密钥工具」操作。
- **回调地址**：`/api/pay/notify` 由 Worker 自动生成（基于请求域名），无需手动配置；**必须使用公网可达的正式域名**（本地调试可用沙箱 + 内网穿透工具如 ngrok）。
- **订单表**：`orders`（order_no / user_id / plan / amount / points / status / alipay_trade_no）。
- **安全**：回调验签失败、金额与订单不符都会返回 `fail`；同一订单重复回调（幂等）不会重复加积分。

## 对账（余额与流水一致性）

积分增减与流水记录分两次 D1 写入（非单事务），正常无故障时一致；若怀疑异常，用以下 SQL 核对（应无返回行）：

```sql
-- 用户余额应等于：redeem/refund 增加之和 - consume 扣减之和
SELECT u.id,
       u.points AS 当前余额,
       COALESCE(SUM(CASE WHEN t.type IN ('redeem','refund') THEN t.points ELSE 0 END), 0)
         - COALESCE(SUM(CASE WHEN t.type = 'consume' THEN -t.points ELSE 0 END), 0) AS 流水应得
FROM users u
LEFT JOIN transactions t ON t.user_id = u.id
GROUP BY u.id
HAVING u.points != 流水应得;
```
