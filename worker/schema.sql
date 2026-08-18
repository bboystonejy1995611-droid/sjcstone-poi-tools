-- ============================================================
-- 卡密/积分/AI代理 D1 数据库结构（第一阶段 MVP）
-- 初始化：npx wrangler d1 execute poi-billing --remote --file=./schema.sql
-- 本地模拟：npx wrangler d1 execute poi-billing --local --file=./schema.sql
-- ============================================================

-- 用户（第一阶段为匿名身份：anon_id 由 Worker 签发；手机号体系第二阶段启用）
CREATE TABLE IF NOT EXISTS users (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  anon_id    TEXT UNIQUE,                   -- 匿名标识（第一阶段）
  phone      TEXT UNIQUE,                   -- 手机号（第二阶段启用，预留）
  points     INTEGER NOT NULL DEFAULT 0,    -- 当前可用积分
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- 卡密
CREATE TABLE IF NOT EXISTS cards (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  code        TEXT NOT NULL UNIQUE,          -- 卡密（唯一）
  points      INTEGER NOT NULL,              -- 面额积分
  status      TEXT NOT NULL DEFAULT 'new',   -- new=未用 / used=已用
  redeemed_by INTEGER,                       -- 兑换用户 id
  redeemed_at TEXT,
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

-- 积分流水（每笔可查：redeem=兑换 / consume=消费 / refund=退还）
CREATE TABLE IF NOT EXISTS transactions (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id    INTEGER NOT NULL,
  type       TEXT NOT NULL,
  points     INTEGER NOT NULL,               -- 正数增加，负数扣减
  ref        TEXT,                           -- 关联卡密 code 或工具 id
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- AI 工具调用记录（扣费依据 + 使用统计）
CREATE TABLE IF NOT EXISTS ai_calls (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id    INTEGER NOT NULL,
  tool       TEXT NOT NULL,                  -- 工具 id（对应 config.js tools）
  status     TEXT NOT NULL DEFAULT 'ok',     -- ok=成功 / error=失败（失败已退费）
  points     INTEGER NOT NULL DEFAULT 0,     -- 成功时为本工具扣费积分
  model      TEXT,                           -- 使用的模型名
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- 通用限流记录（匿名签发按 IP 限流等）
CREATE TABLE IF NOT EXISTS rate_limits (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  scope      TEXT NOT NULL,                  -- 限流场景，如 anon
  key        TEXT NOT NULL,                  -- 限流键，如 IP
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- 支付订单（支付宝自动到账）
CREATE TABLE IF NOT EXISTS orders (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  order_no        TEXT NOT NULL UNIQUE,      -- 商户订单号（VPOI 前缀 + 时间戳随机）
  user_id         INTEGER NOT NULL,          -- 下单用户
  plan            TEXT NOT NULL,             -- 套餐标识（对应 config.cardPlans 的 label/price）
  amount          REAL NOT NULL,             -- 金额（元）
  points          INTEGER NOT NULL,          -- 到账积分
  status          TEXT NOT NULL DEFAULT 'pending', -- pending / paid / failed
  alipay_trade_no TEXT,                      -- 支付宝交易号（回调后回填）
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  paid_at         TEXT
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_cards_status    ON cards (status);
CREATE INDEX IF NOT EXISTS idx_cards_code      ON cards (code);
CREATE INDEX IF NOT EXISTS idx_txn_user        ON transactions (user_id, created_at);
CREATE INDEX IF NOT EXISTS idx_ai_user_time    ON ai_calls (user_id, created_at);
CREATE INDEX IF NOT EXISTS idx_ai_tool_time    ON ai_calls (tool, created_at);
CREATE INDEX IF NOT EXISTS idx_rate_scope_key  ON rate_limits (scope, key, created_at);
CREATE INDEX IF NOT EXISTS idx_orders_user     ON orders (user_id, created_at);
CREATE INDEX IF NOT EXISTS idx_orders_status   ON orders (status);
