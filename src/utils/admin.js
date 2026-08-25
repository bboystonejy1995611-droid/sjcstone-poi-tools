export const CARD_DENOMINATIONS = Object.freeze([50000, 100000])

export function normalizeCardCount(value) {
  const count = Number(value)
  return Number.isInteger(count) && count >= 1 && count <= 100 ? count : null
}

export function formatCardExport(cards) {
  return cards.map((card) => `${card.code}\t${card.points}积分`).join('\n')
}
