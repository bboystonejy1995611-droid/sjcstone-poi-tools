# Grsai Points Platform Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the existing Vue/Cloudflare site support anonymous credits, fixed-value card redemption, 600-credit Grsai GPT Image generation, history, and card administration.

**Architecture:** Keep Vue on Cloudflare Pages and reuse the existing `poi-billing-api` Worker plus D1. Route only `tools.sjcstone.cn/api/*` to the Worker, so the current UI and custom domain remain unchanged while secrets and billing stay server-side.

**Tech Stack:** Vue 3, Vite 5, Cloudflare Workers, D1 SQLite, native Fetch/Web Crypto, Node test runner.

**Spec:** `docs/superpowers/specs/2026-08-25-grsai-points-platform-design.md`

## Global Constraints

- Do not change existing page styling or remove existing tools.
- The only external image model is Grsai `gpt-image-2`.
- One successful image generation costs exactly 600 internal credits.
- Card values are restricted to 50,000 and 100,000 credits.
- `GRSAI_API_KEY`, `AUTH_SECRET`, and `ADMIN_KEY` must remain encrypted Cloudflare secrets.

---

### Task 1: Lock billing and Grsai contracts with failing tests

**Files:**
- Modify: `test/billing-flow.test.mjs`
- Modify: `package.json`

**Interfaces:**
- Consumes: Worker default export `fetch(request, env)`.
- Produces: assertions for `GRSAI_API_KEY`, `gpt-image-2`, 600-credit charge/refund, allowed card values, and generation history routes.

- [x] Write tests that expect the admin route to reject 100 points and accept 50,000/100,000 points.
- [x] Update the mocked image response to Grsai's `data[0].url` contract and assert the outgoing URL, model, size, and auth header.
- [x] Add tests for 600-credit deduction, upstream failure refund, owned generation listing/file access/deletion, and cross-user isolation.
- [x] Run `npm test` and confirm the new expectations fail because production still uses 20 points, `IMAGE_API_KEY`, unrestricted card values, and lacks generation routes.

### Task 2: Implement the Worker billing and media flow

**Files:**
- Modify: `worker/src/config.js`
- Modify: `worker/src/index.js`
- Modify: `worker/schema.sql`
- Modify: `worker/wrangler.toml`

**Interfaces:**
- Consumes: `env.DB`, `env.AUTH_SECRET`, `env.ADMIN_KEY`, `env.GRSAI_API_KEY`.
- Produces: the `/api/auth`, `/api/me`, `/api/cards`, `/api/ai`, `/api/generations`, and `/api/admin/cards` contracts in the spec.

- [x] Set `poster_image.points` to `600`, model to `gpt-image-2`, and base URL to `https://grsaiapi.com/v1`.
- [x] Replace the generic OpenAI image call with the Grsai request body `{model,prompt,image:[],size,response_format:'url'}`.
- [x] Add `generations` schema and owned list/file/delete handlers; proxy remote image bytes without forwarding the browser Authorization header.
- [x] Restrict admin card creation to `[50000, 100000]` and keep count in `1..100`.
- [x] Set the real D1 database ID and the `tools.sjcstone.cn/api/*` Worker route in Wrangler config.
- [x] Run `npm test` and confirm all billing tests pass.

### Task 3: Add the management page without changing existing UI

**Files:**
- Create: `src/views/AdminView.vue`
- Modify: `src/router/index.js`
- Modify: `src/utils/api.js`
- Modify: `src/config/siteConfig.js`

**Interfaces:**
- Consumes: `apiAdminPost('/api/admin/cards', body, adminKey)`.
- Produces: `/#/admin` with fixed denomination selection, count, key input, and copyable generated codes.

- [x] Reuse the API helper's per-request headers so `X-Admin-Key` is sent only by the admin page.
- [x] Add the `/admin` route without adding it to public navigation.
- [x] Build the management form from existing `LandingNav`, `LandingFooter`, `l-container`, `l-card`, and `l-btn` primitives.
- [x] Run `npm run build` and confirm the existing pages and new lazy route compile.

### Task 4: Update deployment and operator documentation

**Files:**
- Modify: `.gitignore`
- Modify: `README.md`
- Modify: `worker/README.md`

**Interfaces:**
- Consumes: final Cloudflare project/Worker names.
- Produces: exact setup commands and dashboard paths for Secrets, D1 migration, Worker deploy, Pages deploy, and card administration.

- [x] Remove OpenAI/DALL-E instructions and document only `GRSAI_API_KEY`.
- [x] Document the exact Worker dashboard path and `/#/admin` workflow.
- [x] Ensure `.dev.vars*`, `.env*`, and Wrangler caches are ignored; the admin exports through the clipboard and does not create card files.

### Task 5: Verify, commit, deploy, and smoke test

**Files:**
- Verify all changed files.

**Interfaces:**
- Consumes: Cloudflare OAuth session and Git remote `origin/main`.
- Produces: a tested commit, deployed Worker route, Pages production deployment, and an explicit remaining-secret handoff if Grsai key is unavailable.

- [ ] Run `npm ci`, `npm test`, `npm run build`, and `npx wrangler deploy --dry-run --config worker/wrangler.toml`.
- [ ] Apply `worker/schema.sql` to remote D1 with `wrangler d1 execute poi-billing --remote --file worker/schema.sql`.
- [ ] Commit with `feat: connect Grsai image credits platform` and push `main`.
- [ ] Deploy `poi-billing-api`, wait for Pages Git deployment, and verify status through Cloudflare.
- [ ] Smoke test anonymous auth, balance, invalid/reused card behavior, and the configured/unconfigured Grsai branch without consuming a real card unless one is deliberately generated for the test.
