# 收费方案（当前免费 + 收费预留）

> 现状：官网 5 个 AI 工具（团购套餐生成器 + 口播/探店/营销/海报）**全部免费**，AI 调用统一由 Worker 代理。
> 预留：积分/卡密体系已就绪，「AI 生成图片 / 生成视频」（后续接入第三方 API）设为收费，按次扣积分。

## 架构

```
浏览器（Vue 3，Cloudflare Pages，匿名 token 存 localStorage）
   │  fetch JSON（Authorization: Bearer <token>）
   ▼
Cloudflare Worker（API 服务：鉴权 → 扣分（收费工具）→ 代理第三方 AI）
   │
   ├─ D1（SQLite：users / cards / transactions / ai_calls / rate_limits）
   └─ 第三方 AI（OpenAI 兼容 /chat/completions，AI_API_KEY 只存 Worker Secret）
```

- 无注册、无验证码；身份 = Worker 签发的 HMAC 匿名 token。
- 免费工具不扣积分但同样鉴权、限流、记录 `ai_calls`；收费工具（将来）按 `tools` 配置扣积分，失败自动退还。

## 数据模型（5 张表）

| 表 | 作用 | 关键字段 |
|---|---|---|
| `users` | 匿名用户 | `anon_id`（唯一）、`points` |
| `cards` | 卡密 | `code`（唯一）、`points`、`status`（new/used）、`redeemed_by/at` |
| `transactions` | 积分流水 | `type`（redeem/consume/refund）、`points`（±）、`ref` |
| `ai_calls` | AI 调用记录 | `tool`、`status`（ok/error）、`points`、`model` |
| `rate_limits` | 通用限流 | `scope`、`key`（IP 等）、`created_at`（超窗自动清理） |

## 兑换卡密流程

1. `POST /api/cards/redeem { code }`（带 token）
2. 查卡密 → 不存在 404；`status != 'new'` 409
3. 条件更新 `UPDATE cards SET status='used'... WHERE code=? AND status='new'`，`changes=0` → 409（防并发双花）
4. batch：`users.points += n` + 插入 `transactions(redeem, +n)`
5. 返回新余额

## AI 工具调用流程（免费 + 收费）

`POST /api/ai/generate { tool, messages }`（带 token）：

1. 校验 tool 在 `config.js tools` 中；校验 messages
2. 限流：同一用户最近 1 分钟调用数 ≥ 10 → 429
3. **免费工具**（当前全部）：跳过扣分，直接调用
4. **收费工具**（将来图片/视频）：原子扣分 `UPDATE users SET points = points - n WHERE id = ? AND points >= n`，`changes=0` → 409（防透支）
5. 代理调用第三方 AI（`AI_API_KEY` 从 Secret 读取，超时 60s）
6. 成功 → 返回内容 + 记 `ai_calls(status=ok, points)`；失败/空结果 → 收费工具**退还积分**（记 `refund`）+ 记 `ai_calls(status=error, points=0)` → 502

## 防滥用要点

- **防卡密重复使用**：`code` 唯一约束 + 条件更新检查影响行数（`WHERE status='new'`）。
- **防绕过前端盗刷 API**：token 由 `AUTH_SECRET` HMAC 签名，前端伪造不了；积分必须真卡密兑换（新 token 无积分）；Worker 限流；**AI Key 永不进入前端**。
- **防透支**：扣分条件更新 `points >= n` 原子执行。
- **防对账缺失**：扣分/退款都记 `transactions`，AI 调用记 `ai_calls`。

## 计费配置（全部入配置，不写死业务代码）

- 后端 `worker/src/config.js`（**后端为准**）：`tools`（当前全部 `free: true`；收费工具去掉 `free` 并按 `points` 定价）、`cardPlans`（19.9=100 / 39.9=250 / 99=800）、`AI_BASE_URL` / `AI_MODEL`、限流/超时。
- 前端 `src/config/siteConfig.js` 的 `billing`：同步展示；`enabled=false` 隐藏全部付费/积分入口。

## 第二阶段再做（本期明确不做）

手机号注册/短信验证码、找回身份、多级会员、自动续费、分销系统、支付对接、流式输出（SSE）、积分过期、设备指纹、图片/视频生成（等运营接入对应第三方 API 后按上述收费流程启用）。

## 已知取舍

- 匿名 token 绑定浏览器：清缓存/换设备丢积分（页面已提示，暂不做找回）。
- 免费工具 0 积分即可使用：防滥用靠限流与 AI Key 隔离（无积分门槛，任何人可用但频率受限）；收费工具（将来）的防线是后端扣费与 AI Key 隔离。
- 前端展示层可被绕过（懂技术用户可直接调 API）——免费工具无此损失，收费工具不构成盗刷（积分是他花钱买的）。
