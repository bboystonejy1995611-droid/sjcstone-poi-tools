/**
 * worker/scripts/gen-cards.mjs — 运营脚本：批量生成卡密
 *
 * 用法：
 *   node worker/scripts/gen-cards.mjs \
 *     --points 50000 \
 *     --count 10 \
 *     --api https://tools.sjcstone.cn/api \
 *     --key <ADMIN_KEY>
 *
 * 输出：每行一张卡密（可直接发给客户），同时打印合计。
 */
import { parseArgs } from 'node:util'

const { values } = parseArgs({
  options: {
    points: { type: 'string' },
    count: { type: 'string' },
    api: { type: 'string' },
    key: { type: 'string' }
  }
})

const points = Number(values.points)
const count = Number(values.count || 1)
const api = (values.api || 'http://localhost:8787/api').replace(/\/$/, '')
const key = values.key

if (![50000, 100000].includes(points)) {
  console.error('错误：--points 仅支持 50000 或 100000')
  process.exit(1)
}
if (!Number.isInteger(count) || count < 1 || count > 100) {
  console.error('错误：--count 必须是 1 到 100 的整数')
  process.exit(1)
}
if (!key) {
  console.error('错误：--key 必填（Worker 的 ADMIN_KEY）')
  process.exit(1)
}

const res = await fetch(`${api}/admin/cards`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-Admin-Key': key
  },
  body: JSON.stringify({ points, count })
})

const result = await res.json()
if (!result.ok) {
  console.error('生成失败：', result.error)
  process.exit(1)
}

console.log(`\n已生成 ${result.data.count} 张 ${points} 点卡密：\n`)
for (const card of result.data.cards) {
  console.log(`${card.code}\t${card.points} 点`)
}
