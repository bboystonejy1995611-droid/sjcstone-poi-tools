# 本地商家实用工具箱 - AI团购套餐生成器

本地实体商家免费营销工具的第一个工具：输入门店信息，AI（本地规则引擎）自动生成 3 套适合上架视频号 POI 团购的套餐方案。

- **纯前端**：Vue 3 + Vite，无数据库、无登录、无外部 API、无客服微信/联系合作，部署到 Cloudflare Pages 即开即用
- **手机端优先**：打开网页即可使用，无需安装
- **单工具直达**：打开 tools.sjcstone.cn 直接进入 AI团购套餐生成器，无需选择

## 本地运行

```bash
npm install     # 安装依赖（首次）
npm run dev     # 启动开发服务，浏览器打开 http://localhost:5173
```

其他命令：

```bash
npm run build   # 生产构建，产物输出到 dist/
npm test        # 生成逻辑回归测试（131 项断言）
npm run preview # 本地预览构建产物
```

## 上线前必改

1. **服务商/代理商授权**（可选，当前默认不显示任何联系方式）：编辑 `src/config/agentConfig.js`，把 `showContact` 置为 `true` 并填写 `agentName` / `contactWechat` / `contactQrCode` 后，页面底部会显示服务商名称、微信号或二维码；保持 `false` 则不显示任何联系方式。
2. **底部说明文字**：默认已为中性文案，如需调整改 `src/data/rules.js` 里的 `FOOTER_NOTICE`。

## 上传到 GitHub

1. 在 GitHub 新建一个空仓库（不要勾选 README/.gitignore，本仓库已自带）。
2. 在项目目录执行（把 `<你的用户名>` 和 `<仓库名>` 换成实际值）：

```bash
git init
git add .
git commit -m "feat: AI团购套餐生成器（纯前端，Cloudflare Pages 就绪）"
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

`tools.sjcstone.cn` 定位为「本地商家实用工具箱」，当前版本保持单工具页面（打开即直达 AI团购套餐生成器），不做多页面复杂系统。

- 后期 `tools.sjcstone.cn` 可升级为**本地商家实用工具箱首页**（工具入口列表页）
- 当前 **AI团购套餐生成器** 作为工具箱的第一个工具
- 后续可继续增加工具：
  - 利润计算器
  - 视频脚本生成器
  - 门店诊断工具
  - 朋友圈文案生成器

新增工具的方式（架构已预留，无需重做项目）：在 `src/views/` 新建页面组件 → 在 `src/router/index.js` 的 `routes` 数组中追加一项路由 → 重新构建部署即可。

## 项目结构

```
├── index.html / vite.config.js / package.json
├── public/favicon.svg
├── src/
│   ├── main.js / App.vue           # 入口 + 背景 + 全局 Toast
│   ├── router/index.js             # 路由注册表（多工具扩展位 + /admin 预留）
│   ├── config/agentConfig.js       # 服务商授权配置（默认不显示联系方式）
│   ├── styles/global.css           # 深色蓝紫渐变玻璃拟态主题
│   ├── data/rules.js               # 生成规则知识库（内容池/价格/文案/底部说明）
│   ├── data/poiCategories.js       # POI 行业大类 + 二级类目表（可替换为正式类目表）
│   ├── utils/generator.js          # 套餐生成引擎
│   ├── utils/analytics.js          # 统计埋点函数（当前仅 console.log，预留多平台）
│   ├── composables/useToast.js     # 全局轻提示
│   ├── components/                 # 7 个组件
│   └── views/GeneratorView.vue     # 首页
└── test/generator.test.mjs         # 回归测试
```
