# 视频号POI商家AI平台（视频号 POI 团购 + AI 工具赋能本地商家）

面向本地实体商家、视频号服务商与地推团队的 **AI 工具平台官网 + 工具站**。

- **官网首页（`/#/`）**：高端 AI SaaS 风格的品牌落地页——Hero 首屏、AI 工具展示、本地商家解决方案、视频号 POI 团购服务介绍、商家案例、合作咨询。
- **AI 团购套餐生成器（`/#/generator`）**：输入门店信息，AI（本地规则引擎）自动生成 3 套适合上架视频号 POI 团购的套餐方案。
- **纯前端**：Vue 3 + Vite，无数据库、无登录、无外部 API，部署到 Cloudflare Pages 即开即用。

## 本地运行

```bash
npm install     # 安装依赖（首次）
npm run dev     # 启动开发服务，浏览器打开 http://localhost:5173
```

其他命令：

```bash
npm run build   # 生产构建，产物输出到 dist/
npm test        # 生成逻辑回归测试（684 项断言，其中 1 项为概率性随机检查，偶发失败属正常）
npm run preview # 本地预览构建产物
```

## 页面路由（hash 模式）

| 路径 | 页面 | 说明 |
|---|---|---|
| `/#/` | 官网首页 | 品牌落地页（浅色主题） |
| `/#/generator` | AI 团购套餐生成器 | 免费引流工具（深色主题，不消耗积分） |
| `/#/tool/:toolId` | AI 工具 | 口播/探店/营销/海报生成器（浅色主题，当前免费，图片/视频收费预留） |

> 官网首页内锚点（AI工具 / 解决方案 / POI团购 / 商家案例 / 合作咨询）为页面内平滑滚动，非独立路由。

## 收费模式（当前免费 + 收费预留）

- **当前状态**：5 个文案类工具**免费**（团购套餐生成器 + 口播/探店/营销/海报提示词）；**AI 海报生成器收费**（20 积分/张，定价待运营填写）；**宣传视频生成器**界面与收费框架已就绪、API 后补（当前提示"即将上线"，不扣费）。
- **收费机制**：积分/卡密体系已激活——用户充值后由运营下发卡密，兑换成积分，收费工具按次扣积分（积分不足引导兑换）。导航积分徽章、兑换卡密/充值弹窗可用。
- **在线充值（自动到账）**：弹窗「在线充值」选套餐 → 支付宝支付 → 回调自动加积分到账户（无需卡密）。需配置支付宝密钥（`ALIPAY_APP_ID` / `ALIPAY_PRIVATE_KEY` / `ALIPAY_PUBLIC_KEY`，见 `worker/README.md`）；未配置时提示改用卡密。
- **免费工具也走 Worker 代理**：免费 ≠ 无 AI 调用，5 个工具的 AI 调用仍由 Worker 代理（`AI_API_KEY` 只存 Secret），并记录 `ai_calls` 使用量、限流防滥用。
- **配置**：后端 `worker/src/config.js`（工具/积分定价/AI 端点，后端为准）+ 前端 `src/config/siteConfig.js` 的 `billing`（同步展示）。
  - **积分定价**（poster_image 海报 / promo_video 视频）：在 `worker/src/config.js` 的 `tools` 里填写 `points`（当前为占位示例 20/50）。
  - **图片 API**：`IMAGE_API_KEY`（Secret）+ `IMAGE_BASE_URL` / `IMAGE_MODEL`（OpenAI 兼容 /images/generations）。
  - **视频 API**：后补，接入时配置 `VIDEO_API_KEY` + `VIDEO_BASE_URL` 并实现异步任务（提交→轮询）。
- **后端部署**：Cloudflare Worker + D1，完整步骤见 [`worker/README.md`](worker/README.md)。
- **生成卡密**（运营侧，收费工具上线后使用）：
  ```bash
  node worker/scripts/gen-cards.mjs --points 100 --count 10 --api https://tools.sjcstone.cn/api --key <ADMIN_KEY>
  ```
- **本地联调前端**：先 `cd worker && npx wrangler dev --local`，再 `VITE_API_BASE=http://localhost:8787/api npm run dev`。

## 上线前必改

### 1. 官网品牌与联系信息（上线前必改）

编辑 `src/config/siteConfig.js`：

- `brandName` — 品牌名（导航 / Hero / 页脚展示）
- `brandSlogan` — 品牌定位语（Hero 首屏小标签）
- `agentName` — 服务商 / 代理商名称
- `contactWechat` — 合作咨询微信号（**预留位**：上线前替换为真实微信号；留空则隐藏微信号行）
- `contactQrCode` — 商务二维码图片路径（**预留位**：把二维码图片放到 `public/`，如 `/qr-contact.png`，再填写该路径；留空显示占位图块）
- `contactEmail` — 客服邮箱（可选）
- `targetUsers` — Hero 首屏目标用户三列（本地实体商家 / 视频号服务商 / 地推团队）

> 页面不展示任何虚假统计数字；商家案例区的数据为演示占位，上线前请替换为真实合作案例。

> 合作咨询表单为**纯前端演示**：提交后仅显示成功提示，不会发送任何数据。接入真实后端后再对接提交接口。

### 2. 商家案例数据（可选）

`src/components/landing/CasesSection.vue` 中的案例为**方向示意内容**，正式上线前请替换为真实合作商家数据与授权素材。

### 3. 服务商/代理商授权（生成器页底部，可选）

编辑 `src/config/agentConfig.js`，把 `showContact` 置为 `true` 并填写 `agentName` / `contactWechat` / `contactQrCode` 后，生成器页面底部会显示服务商名称、微信号或二维码；保持 `false` 则不显示任何联系方式。

## 上传到 GitHub

1. 在 GitHub 新建一个空仓库（不要勾选 README/.gitignore，本仓库已自带）。
2. 在项目目录执行（把 `<你的用户名>` 和 `<仓库名>` 换成实际值）：

```bash
git init
git add .
git commit -m "feat: 本地商家AI增长平台（官网落地页 + AI团购套餐生成器）"
git branch -M main
git remote add origin https://github.com/<你的用户名>/<仓库名>.git
git push -u origin main
```

> 提示：`.gitignore` 已排除 `node_modules/` 和 `dist/`，上传的是源码，构建在 Cloudflare 云端完成。

## 部署到 Cloudflare Pages

| 配置项 | 值 |
|---|---|
| 项目类型 | Vite |
| 构建命令 Build command | `npm run build` |
| 输出目录 Output directory | `dist` |
| 推荐绑定域名 | `tools.sjcstone.cn` |
| Node.js 版本 | `18`（或更高；项目已在 package.json 声明 `engines.node >= 18`） |

步骤：

1. 打开 https://dash.cloudflare.com → 左侧「Workers 和 Pages」→「创建」→「Pages」→「连接到 Git」。
2. 授权 GitHub，选择上传的仓库。
3. 构建配置按上表填写（其余保持默认）。
4. 点击「保存并部署」，等待约 1 分钟，得到形如 `https://<项目名>.pages.dev` 的临时地址。
5. 绑定域名：Pages 项目 →「自定义域」→ 添加 `tools.sjcstone.cn`，并按提示在 DNS 中添加 CNAME 记录（`tools` → `<项目名>.pages.dev`），等待证书自动签发后即可用 `https://tools.sjcstone.cn` 访问。

> 本项目路由使用 hash 模式（`/#/`），**不需要**任何重定向/SPA fallback 配置，部署后所有页面路径天然可用。

## 开启访问统计（免费）

### 方式一：Cloudflare Web Analytics（推荐，免费且无第三方脚本）

1. Cloudflare 控制台 → 左侧「Analytics」→「Web Analytics」→「添加站点」，按提示选「Cloudflare Pages 项目」或手动粘贴域名。
2. 生成站点后复制一段带 `data-cf-beacon` 的 `<script>` 标签（形如 `<script defer src='https://static.cloudflareinsights.com/beacon.min.js' data-cf-beacon='{"token": "xxx"}'></script>`）。
3. 粘贴到 `index.html` 的 `<head>` 中即可，刷新线上页面后几分钟内能看到访问量。

### 方式二：自定义事件统计（推荐同时开启，能看「生成了几次方案/复制了几次」）

项目已封装 4 个埋点函数（`src/utils/analytics.js`），当前仅 console.log、不发任何外部请求：

- `trackPageView()` — 页面访问
- `trackGeneratePlan(data)` — 生成方案（含大类/类目/城市/客单价/套餐类型/营销目标）
- `trackCopyResult(data)` — 一键复制
- `trackCategorySelect(data)` — 选择行业大类/POI 细分类目

编辑 `src/utils/analytics.js` 的 `_report` 函数，按平台补上上报实现（注释中已给出示例）：

- **Cloudflare Web Analytics**：在 `index.html` 粘贴官方 Beacon `<script>`，并在 `_report` 中调用 `window.__cfBeacon.push`
- **Google Analytics (GA4)**：在 `index.html` 粘贴官方 gtag.js，并在 `_report` 中调用 `window.gtag`
- **Umami**：在 `_report` 中调用 `window.umami.track`
- **自建后台统计**：在 `_report` 中 POST JSON 到自建接口（后台页面挂载点已在 `src/router/index.js` 预留 `/#/admin`）

> 默认情况下所有统计开关均为关闭状态，页面不加载任何外部脚本、不发任何外部请求，保持纯前端。

## 后期规划

`tools.sjcstone.cn` 定位为「本地商家 AI 增长平台」：官网首页负责品牌与获客，工具页承载实际功能。

- 当前：官网落地页 + AI 团购套餐生成器（第一个工具）
- 后续可继续增加工具（官网「AI 工具」区已预留入口位，`敬请期待` 标签待逐个点亮）：
  - AI 短视频脚本生成器
  - AI 朋友圈文案生成器
  - 门店经营诊断
  - 团购利润计算器
  - AI 客服话术助手

新增工具的方式（架构已预留，无需重做项目）：在 `src/views/` 新建页面组件 → 在 `src/router/index.js` 的 `routes` 数组中追加一项路由 → 把 `src/components/landing/ToolsSection.vue` 中对应工具的 `live` 置为 `true` 并填入入口路径 → 重新构建部署即可。

## 项目结构

```
├── index.html / vite.config.js / package.json
├── public/favicon.svg
├── src/
│   ├── main.js / App.vue           # 入口 + 外壳（按路由切换深/浅主题）+ 全局 Toast
│   ├── router/index.js             # 路由注册表（官网首页 + 工具路由 + /admin 预留）
│   ├── config/
│   │   ├── siteConfig.js           # 官网配置（品牌/微信号/二维码/目标用户/计费规则，上线前必改）
│   │   └── agentConfig.js          # 生成器页服务商授权配置（默认不显示联系方式）
│   ├── styles/
│   │   ├── global.css              # 工具页深色蓝紫渐变玻璃拟态主题
│   │   └── landing.css             # 官网浅色高端 SaaS 主题（body.landing 时生效）
│   ├── data/rules.js               # 生成规则知识库（内容池/价格/文案/底部说明）
│   ├── data/poiCategories.js       # POI 行业大类 + 二级类目表（可替换为正式类目表）
│   ├── utils/
│   │   ├── generator.js            # 套餐生成引擎
│   │   ├── analytics.js            # 统计埋点函数（当前仅 console.log，预留多平台）
│   │   └── api.js                  # 计费 API 客户端（fetch 封装，API_BASE 可配）
│   ├── composables/
│   │   ├── useToast.js             # 全局轻提示
│   │   ├── useInView.js            # 官网滚动显现动画
│   │   └── useAuth.js              # 登录态 + 点数（模块级单例）
│   ├── views/
│   │   ├── HomeView.vue            # 官网首页（组合各 section）
│   │   ├── ToolView.vue            # 付费 AI 工具通用页（/#/tool/:id，调 AI 代理扣积分）
│   │   └── GeneratorView.vue       # AI 团购套餐生成器（/#/generator，免费引流）
│   ├── components/
│   │   ├── landing/                # 官网区块组件（导航/各 section/兑换卡密弹层等）
│   │   └── ...                     # 工具页组件（7 个）
│   └── config/agentConfig.js
├── worker/                         # 积分计费 + AI 代理后端（Cloudflare Worker + D1，见 worker/README.md）
│   ├── schema.sql                  # D1 表结构（users/cards/transactions/ai_calls）
│   ├── src/index.js                # API 全部逻辑（零运行时依赖；AI Key 只读 Secret）
│   ├── src/config.js               # 工具积分/卡密套餐/AI 端点配置（后端为准）
│   └── scripts/gen-cards.mjs       # 运营脚本：批量生成卡密
└── test/
    ├── generator.test.mjs          # 生成逻辑回归测试（684 项断言）
    └── billing-flow.test.mjs       # 计费/AI 代理完整流程冒烟测试（38 项断言，node:sqlite 模拟 D1）
```
```

Web Analytics enabled
