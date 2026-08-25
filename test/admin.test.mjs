import assert from 'node:assert/strict'
import {
  CARD_DENOMINATIONS,
  normalizeCardCount,
  formatCardExport
} from '../src/utils/admin.js'

assert.deepEqual(CARD_DENOMINATIONS, [50000, 100000], '管理页只显示两个固定卡密面额')
assert.equal(normalizeCardCount('100'), 100, '允许一次生成 100 张')
assert.equal(normalizeCardCount('0'), null, '拒绝小于 1 的数量')
assert.equal(normalizeCardCount('101'), null, '拒绝大于 100 的数量')
assert.equal(normalizeCardCount('1.5'), null, '拒绝非整数数量')
assert.equal(
  formatCardExport([
    { code: 'VPOI-AAAA-BBBB', points: 50000 },
    { code: 'VPOI-CCCC-DDDD', points: 100000 }
  ]),
  'VPOI-AAAA-BBBB\t50000积分\nVPOI-CCCC-DDDD\t100000积分',
  '导出文本包含卡密与面额'
)

console.log('管理页工具：6 通过 / 0 失败')
