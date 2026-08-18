/**
 * worker/scripts/gen-cards.mjs — 运营脚本：批量生成卡密
 *
 * 用法：
 *   node worker/scripts/gen-cards.mjs \
 *     --points 5000 \
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

if (!Number.isInteger(points) || points <= 0) {
  console.error('错误：--points 必须为正整数（如 5000 / 10000）')
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
