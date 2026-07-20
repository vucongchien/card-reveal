import { expect, test } from 'vitest'
import { CX, CY, FAN_DROP, FAN_GEO, FAN_W, MAIN_HALF, hitTestFan, hitTestReveal } from './draw'

/**
 * Khớp transform draw (rot/bob=0):
 * translate(pushX, FAN_DROP) → rotate(fan) → translate(0,tuck) → draw center (0,0).
 */
function fanLocalToWorld(index: number, lx: number, ly: number, spread = 1) {
  const angle = (FAN_GEO[index].r * spread * Math.PI) / 180
  const tuck = (1 - spread) * 40
  const pushX = FAN_GEO[index].x * spread
  const x1 = lx
  const y1 = ly + tuck
  const x2 = x1 * Math.cos(angle) - y1 * Math.sin(angle) + pushX
  const y2 = x1 * Math.sin(angle) + y1 * Math.cos(angle) + FAN_DROP
  return { x: CX + x2, y: CY + y2 }
}

test('hitTestFan: fan trái đã dịch vào trong (overlap thẻ giữa)', () => {
  const inner = fanLocalToWorld(0, FAN_W / 2, 0)
  // FAN_GAP âm + rotate → mép trong nằm trong nửa thẻ giữa (overlap)
  expect(Math.abs(inner.x - CX)).toBeLessThan(MAIN_HALF)
  // Click mép ngoài (ngoài AABB thẻ giữa) vẫn trúng fan
  const outer = fanLocalToWorld(0, -FAN_W / 2 + 10, -80)
  expect(Math.abs(outer.x - CX)).toBeGreaterThan(MAIN_HALF)
  expect(hitTestFan(outer.x, outer.y, 1, 0, 0)).toBe(0)
})

test('hitTestFan: fan phải đã dịch vào trong', () => {
  const inner = fanLocalToWorld(1, -FAN_W / 2, 0)
  expect(Math.abs(inner.x - CX)).toBeLessThan(MAIN_HALF)
  const outer = fanLocalToWorld(1, FAN_W / 2 - 10, -80)
  expect(Math.abs(outer.x - CX)).toBeGreaterThan(MAIN_HALF)
  expect(hitTestFan(outer.x, outer.y, 1, 0, 0)).toBe(1)
})

test('hitTestFan: theo bob — điểm dịch theo thẻ vẫn trúng', () => {
  const bob = 12
  const p = fanLocalToWorld(1, FAN_W / 2 - 20, -40)
  expect(hitTestFan(p.x, p.y + bob, 1, 0, bob)).toBe(1)
})

test('hitTestFan: vùng thẻ chính không trả fan', () => {
  expect(hitTestFan(CX, CY, 1, 0, 0)).toBeNull()
})

test('hitTestReveal: tâm → main', () => {
  expect(hitTestReveal(CX, CY, 1, 0, 0)).toEqual({ kind: 'main' })
})

test('hitTestFan: ngoài canvas → null', () => {
  expect(hitTestFan(0, 0, 1, 0, 0)).toBeNull()
})

test('hitTestFan: spread thấp → null', () => {
  const p = fanLocalToWorld(0, -FAN_W / 2 + 20, -40, 1)
  expect(hitTestFan(p.x, p.y, 0.2, 0, 0)).toBeNull()
})

test('hitTestFan: fan ẩn (visible=false) → null', () => {
  const left = fanLocalToWorld(0, -FAN_W / 2 + 10, -80)
  const right = fanLocalToWorld(1, FAN_W / 2 - 10, -80)
  expect(hitTestFan(left.x, left.y, 1, 0, 0, [false, true])).toBeNull()
  expect(hitTestFan(right.x, right.y, 1, 0, 0, [true, false])).toBeNull()
  expect(hitTestFan(left.x, left.y, 1, 0, 0, [true, false])).toBe(0)
})

test('FAN_DROP = 4 CSS-px equivalent (design)', () => {
  expect(FAN_DROP).toBe(10)
})

test('MAIN_HALF = nửa thẻ chính 460', () => {
  expect(MAIN_HALF).toBe(230)
})
