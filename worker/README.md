# 积分、卡密与 Grsai 图片 API（Cloudflare Worker + D1）

前端部署在 Cloudflare Pages，所有 `https://tools.sjcstone.cn/api/*` 请求由 `poi-billing-api` Worker 处理。没有独立服务器；API Key 只保存在 Cloudflare 加密 Secret 中。

## 生产配置

- Worker：`poi-billing-api`
- 路由：`tools.sjcstone.cn/api/*`
- D1：`poi-billing`（ID 已写入 `wrangler.toml`）
- 图片上游：`POST https://grsaiapi.com/v1/images/generations`
- 模型：`gpt-image-2`
- 单次价格：600 积分
- 卡密面值：50,000 / 100,000 积分

## API

| 方法 | 路径 | 鉴权 | 说明 |
|---|---|---|---|
| `POST` | `/api/auth/anonymous` | 无 | 首次访问创建游客账户并签发 token |
| `GET` | `/api/me` | Bearer token | 游客 ID、余额和最近流水 |
| `POST` | `/api/cards/redeem` | Bearer token | 一次性兑换卡密并绑定当前游客 |
| `POST` | `/api/ai/generate` | Bearer token | 校验余额、扣 600 分、调用 Grsai；失败自动退款 |
| `GET` | `/api/generations` | Bearer token | 当前游客的图片生成记录 |
| `GET` | `/api/generations/:taskId/file` | Bearer token | 通过 Worker 下载本人生成的图片 |
| `DELETE` | `/api/generations/:taskId` | Bearer token | 删除本人生成记录 |
| `POST` | `/api/admin/cards` | `X-Admin-Key` | 生成 50,000 / 100,000 积分卡密，数量 1–100 |

旧的支付宝订单接口仍保留兼容，但前端充值入口默认关闭；当前运营流程以卡密兑换为准。

## 初始化与部署

在仓库根目录执行：

```bash
npx wrangler d1 execute poi-billing --remote --file worker/schema.sql
npx wrangler deploy --config worker/wrangler.toml
```

`schema.sql` 全部使用 `CREATE TABLE/INDEX IF NOT EXISTS`，可安全重复运行以补充 `generations` 表。

## 必需的加密 Secret

生产 Worker 需要以下三个 Secret：

- `AUTH_SECRET`：游客 token HMAC 签名
- `ADMIN_KEY`：卡密管理接口密码
- `GRSAI_API_KEY`：Grsai GPT Image API Key

控制台添加 Grsai Key：Cloudflare →「Workers 和 Pages」→ `poi-billing-api` →「设置」→「变量和机密」→「添加」→ 名称 `GRSAI_API_KEY` → 类型选择加密 Secret。

也可以在命令行添加（输入值时不会写入仓库）：

```bash
cd worker
npx wrangler secret put GRSAI_API_KEY
```

严禁把任何 Secret 写入 `wrangler.toml`、前端源码、`.env` 或 Git。

## 运营生成卡密

浏览器方式：打开 `https://tools.sjcstone.cn/#/admin`，输入 `ADMIN_KEY`，选择面值和数量后生成并复制。

命令行方式：

```bash
node worker/scripts/gen-cards.mjs --points 50000 --count 10 --api https://tools.sjcstone.cn/api --key 你的ADMIN_KEY
node worker/scripts/gen-cards.mjs --points 100000 --count 10 --api https://tools.sjcstone.cn/api --key 你的ADMIN_KEY
```

卡密形如 `VPOI-XXXXXXXX-XXXXXXXX`。D1 使用唯一约束和 `status='new'` 条件更新，兑换成功后记录 `redeemed_by` / `redeemed_at`，同一张卡无法重复兑换。

## 本地开发

```bash
cd worker
npx wrangler dev --local
```

本地 Secret 写入 `worker/.dev.vars`（已被 `.gitignore` 排除）：

```text
AUTH_SECRET=本地随机长字符串
ADMIN_KEY=本地管理密码
GRSAI_API_KEY=你的Grsai密钥
```

另开终端启动前端：

```powershell
$env:VITE_API_BASE='http://localhost:8787/api'
npm run dev
```

## 安全与一致性

- Grsai Key 只由 Worker 读取，浏览器只能请求同域 API。
- 扣分使用 `points >= 600` 条件更新，余额不足不会透支。
- 上游失败或生成记录写入失败时，Worker 退回 600 积分并记录退款流水。
- 图片文件接口校验记录归属，不向 Grsai 转发用户的 Authorization token。
- 卡密面值和单次数值均以后端配置为准，不能通过篡改前端绕过。
- AI 与游客签发都有限流；生成记录按游客隔离。
