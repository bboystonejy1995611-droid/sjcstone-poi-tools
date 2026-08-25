# 游客积分、卡密与 Grsai 图片生成方案

## 架构

```text
浏览器（Vue 3 / Cloudflare Pages，游客 token 存 localStorage）
   │  同域 /api/*，Authorization: Bearer <token>
   ▼
Pages Function（POI_API Service Binding，不经过公网）
   ▼
Cloudflare Worker（鉴权 → 余额校验 → 扣 600 分 → 调用 Grsai）
   ├─ D1：游客、卡密、流水、调用日志、生成记录、限流
   └─ Grsai GPT Image：gpt-image-2（GRSAI_API_KEY 仅存 Worker Secret）
```

文案类工具继续由浏览器内的现有规则引擎生成，不调用任何第三方模型。AI 图片只接入 Grsai GPT Image。

## 数据模型

| 表 | 作用 | 关键约束 |
|---|---|---|
| `users` | 游客账户与积分 | `anon_id` 唯一 |
| `cards` | 固定面值卡密 | `code` 唯一；`status` 为 new/used |
| `transactions` | 兑换、消费、退款流水 | 正负积分和业务 `ref` |
| `ai_calls` | 图片调用审计 | 工具、状态、积分、模型 |
| `generations` | 图片生成记录 | `task_id` 唯一、绑定 `user_id` |
| `rate_limits` | API 限流 | scope/key/time 窗口 |
| `orders` | 原有支付兼容表 | 前端当前不启用在线充值 |

## 卡密兑换

1. 首次访问由 `POST /api/auth/anonymous` 创建游客并签发 HMAC token。
2. `POST /api/cards/redeem` 只接受已存在且状态为 `new` 的卡密。
3. D1 条件更新 `WHERE code = ? AND status = 'new'`，只有一个并发请求能兑换成功。
4. 成功后卡密记录 `redeemed_by` / `redeemed_at`，同时增加余额并写入兑换流水。

后台只允许生成 50,000 或 100,000 积分卡，每批 1–100 张。

## 图片生成

`POST /api/ai/generate { tool: 'poster_image', messages: [{ content }] }`：

1. 校验 token、工具、提示词长度、限流和 `GRSAI_API_KEY`。
2. 原子扣除 600 积分；余额不足返回 409，不调用上游。
3. 请求 `https://grsaiapi.com/v1/images/generations`，固定模型 `gpt-image-2`、尺寸 `1024x1024`、`response_format: 'url'`。
4. 成功后保存生成记录，并返回同域图片代理地址；记录只能由所属游客读取或删除。
5. Grsai 失败、返回空结果或 D1 保存失败时，退回 600 积分并写退款及错误日志。

## 安全边界

- `GRSAI_API_KEY`、`AUTH_SECRET`、`ADMIN_KEY` 均为 Cloudflare 加密 Secret，不进入前端构建和 Git。
- 前端展示的余额和价格不可信，真正的面值限制与扣费均在 Worker 强制执行。
- 图片代理只接受当前游客 token，不把该 token 转发给 Grsai 文件地址。
- 匿名 token 绑定当前浏览器；清理站点数据或更换设备后无法找回原游客积分，这是无注册方案的明确取舍。
