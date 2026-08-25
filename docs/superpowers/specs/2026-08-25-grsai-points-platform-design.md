# Grsai 图片积分平台设计

## 目标

在不改变现有页面视觉与已有免费工具的前提下，让 `tools.sjcstone.cn` 的 AI 海报生成链路真正可用：首次访问自动创建游客账户，卡密兑换增加站内积分，生成一张图片原子扣除 600 积分，Cloudflare 后端使用加密环境变量调用 Grsai GPT Image API，失败时退回积分。

## 现状审计

- 前端是 Vue 3 + Vue Router + Vite，Cloudflare Pages 的构建命令是 `npm run build`，输出目录为 `dist`。
- Pages 当前 Git 集成仓库为 `bboystonejy1995611-droid/sjcstone-poi-tools`，生产分支为 `main`。
- 现有 UI 已有游客 token、积分余额、卡密兑换和图片结果/历史入口；这些请求目前访问同域 `/api/*`。
- 仓库已有 `worker/` 原型和名为 `poi-billing-api` 的 Cloudflare Worker；D1 数据库 `poi-billing` 已创建并初始化，但 Worker 没有路由到 `tools.sjcstone.cn/api/*`，所以线上 `/api/*` 仍回退到静态 SPA。
- Worker 只配置了 `AUTH_SECRET` 和 `ADMIN_KEY`，没有图片 API Secret；图片代码仍是 OpenAI/DALL-E 占位实现，服务端定价仍为 20 分，与前端 600 分不一致。

## 方案选择

### 采用：现有 Worker + D1 + 同域路由

继续使用独立的 `poi-billing-api` Worker，并将 `tools.sjcstone.cn/api/*` 路由到该 Worker。它与 Pages Functions 一样是 Cloudflare Serverless 后端，但能复用已经部署的 Worker Secrets、D1 数据库和现有测试，变更面最小。Pages 仍只负责现有 Vue 静态页面。

### 未采用：迁移到 Pages Functions

Pages Functions 技术上适合本项目，但迁移后必须重新配置 Pages 的 `AUTH_SECRET`、`ADMIN_KEY` 和 D1 binding，且会留下重复 Worker。功能收益为零，部署风险更高。

### 未采用：浏览器直连 Grsai

浏览器直连会泄露 Grsai API Key，也无法可信地扣除积分或阻止卡密重复兑换，因此不符合安全要求。

## 后端边界

- `POST /api/auth/anonymous`：创建游客 ID，签发长期 HMAC token；token 只存浏览器 localStorage。
- `GET /api/me`：返回当前游客 ID、积分和最近流水。
- `POST /api/cards/redeem`：条件更新 `status='new'` 的卡密，绑定当前游客并增加积分；并发重复兑换只允许一次成功。
- `POST /api/ai/generate`：仅 `poster_image` 调用 Grsai；生成前按数据库余额原子扣除 600 积分。
- Grsai 请求固定为 `POST https://grsaiapi.com/v1/images/generations`、模型 `gpt-image-2`、尺寸 `1024x1024`、URL 响应格式；只从 `GRSAI_API_KEY` Secret 读取密钥。
- Grsai/网络/无效响应失败时记录失败调用并退回 600 积分。
- 成功结果写入 `generations`，有效期 7 天；浏览器通过同域鉴权文件接口获取图片，站内 token 不发送给 Grsai 文件域名。
- `GET /api/generations?type=image`、`GET /api/generations/:taskId/file`、`DELETE /api/generations/:taskId`：支持现有历史、下载和删除 UI。
- `POST /api/admin/cards`：使用 `X-Admin-Key`，只接受 50,000 或 100,000 积分面额，一次生成 1–100 张。

## 前端边界

- 保留所有既有页面、组件和 CSS，不重新设计。
- 现有账户弹窗继续负责卡密兑换和余额展示。
- 新增 `/#/admin` 管理页，复用现有导航、卡片和按钮风格；管理员手动输入 `ADMIN_KEY`，选择固定面额和数量，结果只显示在当前页面，不持久化管理密钥。
- 现有图片页继续使用相同输入、余额、兑换弹窗、生成结果和历史布局。

## 数据与安全

- `users.anon_id` 是游客标识；积分余额以 D1 为唯一可信来源。
- `cards.code` 唯一，`status/redeemed_by/redeemed_at` 记录兑换归属。
- `transactions` 保存兑换、消费和退款流水。
- `ai_calls` 保存成功/失败、模型和实际扣分。
- `generations` 保存用户、任务、远端图片地址和过期时间；所有查询都限定 `user_id`。
- `GRSAI_API_KEY`、`AUTH_SECRET`、`ADMIN_KEY` 都不得进入 Git、前端构建产物或普通环境变量。
- 图片描述限制长度，AI 调用按游客限流；API 响应不回传第三方错误正文或密钥。

## 错误处理

- 余额不足：HTTP 409、`insufficient_points`，前端打开卡密兑换弹窗。
- Grsai 未配置：HTTP 501、`image_not_configured`，不扣积分。
- Grsai 失败：HTTP 502、`ai_error`，已扣积分自动退回。
- 卡密不存在/已用：HTTP 404/409；同一张卡不会重复加分。
- 管理密钥错误、面额错误、数量越界：分别返回 401/400。
- 已过期或不属于当前游客的图片：统一返回 404，不泄露记录是否存在。

## 验证

- Node + 内存 SQLite 测试覆盖游客创建、固定卡密面额、重复兑换、600 分扣费、余额不足、Grsai 请求契约、失败退款、历史/文件鉴权和管理鉴权。
- 执行根项目测试、Worker 测试、Vite 生产构建和 Wrangler dry-run。
- 部署 Worker 后检查 `/api/me` 不再返回 SPA HTML；推送 `main` 触发 Pages Git 部署并检查线上构建状态。

