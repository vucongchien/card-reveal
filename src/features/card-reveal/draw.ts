// Vẽ hiệu ứng card-reveal bằng Canvas 2D — bản v5, theme sáng (kem + P.accent/cam ấm).
// Mọi công thức toán giữ nguyên từ v2/v4; chỉ đổi palette và cách render (ctx.* thay vì <div>).
// Toạ độ gốc 1080×1920; caller đã scale + dịch sẵn qua ctx.setTransform.
import { Easing, clamp } from './scene-engine'
import { applyTheme, P, type CardRevealTheme } from './themes'

export const W = 1080,
  H = 1920,
  CX = 540,
  CY = 940

const GLOW = 1 // TW.glow

/** Font hỗ trợ tiếng Việt (tránh ô vuông khi dùng Cormorant/Avenir). */
export const FONT_SANS = `'Be Vietnam Pro', 'Segoe UI', system-ui, sans-serif`
const FONT_CODE = `'SF Mono', Consolas, 'Courier New', monospace`

// Hash giả-ngẫu nhiên ổn định theo index (khớp v2).
export const R = (i: number, s = 0) => {
  const x = Math.sin(i * 127.1 + s * 311.7 + 13.37) * 43758.5453
  return x - Math.floor(x)
}
const ss = (a: number, b: number, t: number) => {
  const k = clamp((t - a) / (b - a), 0, 1)
  return k * k * (3 - 2 * k)
}
// hex alpha 2 ký tự (0..1 → '00'..'ff')
const ax = (a: number) => Math.round(clamp(a, 0, 1) * 255).toString(16).padStart(2, '0')

/** Fan 2 bên: trái = thư tay; phải = URL ảnh. Không truyền / null = ẩn cả hai. */
export type FanSlots = {
  left?: { text: string[] } | null
  right?: string | null
}

export type FanItem = string | { text: string[] }

/** Thông tin voucher hiện trên mặt thẻ chính (thay text 3 dòng khi có). */
export type VoucherInfo = {
  brand: string
  title: string
  value: string
  code: string
  expiry?: string
}

export interface Cfg {
  image: string
  text: string[] | null
  back: string | null
  fan: FanSlots | null
  voucher: VoucherInfo | null
  blade: string
  bladeGlow: string
  clickToOpen: boolean
  /** Locale cho `brand.toLocaleUpperCase` — mặc định `'vi'`. */
  brandLocale: string
  /** `light` (kem+coral) | `dark` (Black Gold từ export). */
  theme: CardRevealTheme
}

/** [trái, phải] — null slot = không vẽ bên đó. */
export function resolveFanSlots(fan: FanSlots | null | undefined): [FanItem | null, FanItem | null] {
  if (!fan) return [null, null]
  const left =
    fan.left && Array.isArray(fan.left.text) && fan.left.text.length ? { text: fan.left.text.slice(0, 3) } : null
  const right = typeof fan.right === 'string' && fan.right.length ? fan.right : null
  return [left, right]
}

export function hasAnyFan(fan: FanSlots | null | undefined): boolean {
  const [l, r] = resolveFanSlots(fan)
  return l != null || r != null
}

// Ảnh đã load sẵn, truyền vào để vẽ (mascot + back + fan images nếu có).
export interface Assets {
  mascot: HTMLImageElement | null
  back: HTMLImageElement | null
  fan: (HTMLImageElement | null)[]
}

// ── Nguyên thủy ──────────────────────────────────────────────────────────────

// Ngôi sao 4 cánh (khớp clip-path STAR của v2): 8 điểm % trong hộp s×s, tâm (x,y).
const STAR_PTS = [
  [50, 0], [61, 39], [100, 50], [61, 61], [50, 100], [39, 61], [0, 50], [39, 39],
]
function star(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, o: number, c: string, rot = 0) {
  if (o <= 0.005) return
  ctx.save()
  ctx.translate(x, y)
  ctx.rotate((rot * Math.PI) / 180)
  ctx.globalAlpha = o
  ctx.fillStyle = c
  // Bỏ shadowBlur ngôi sao — đắt khi gọi hàng chục lần/frame
  ctx.beginPath()
  STAR_PTS.forEach(([px, py], i) => {
    const dx = (px / 100 - 0.5) * s,
      dy = (py / 100 - 0.5) * s
    if (i === 0) ctx.moveTo(dx, dy)
    else ctx.lineTo(dx, dy)
  })
  ctx.closePath()
  ctx.fill()
  ctx.restore()
}

// Chấm tròn đơn giản (dust, fount, bubbles fill).
function dot(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, o: number, c: string) {
  if (o <= 0.005) return
  ctx.save()
  ctx.globalAlpha = o
  ctx.fillStyle = c
  ctx.beginPath()
  ctx.arc(x, y, r, 0, Math.PI * 2)
  ctx.fill()
  ctx.restore()
}

function roundRectPath(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath()
  ctx.roundRect(x, y, w, h, r)
}

// ── Backdrop: light = trong suốt; dark = Black Gold (gradient + aura xoay + sao) ─
function drawBackdrop(ctx: CanvasRenderingContext2D, time: number) {
  if (!P.canvasBackdrop) return
  ctx.save()
  const bg = ctx.createLinearGradient(W * 0.08, 0, W * 0.2, H)
  bg.addColorStop(0, P.backdrop0)
  bg.addColorStop(0.4, P.backdrop1)
  bg.addColorStop(0.78, P.backdrop2)
  ctx.fillStyle = bg
  ctx.fillRect(0, 0, W, H)

  // Quầng vàng elip xoay chậm — khớp export Backdrop radial + rotate
  if (P.backdropAura > 0.01) {
    ctx.save()
    ctx.translate(CX - W * 0.1, H * 0.35)
    ctx.rotate(((8 + Math.sin(time * 0.3) * 2) * Math.PI) / 180)
    const a = P.backdropAura
    const aura = ctx.createRadialGradient(0, 0, 20, 0, 0, W * 0.55)
    aura.addColorStop(0, `rgba(${P.goldRgb},${a * 0.4})`)
    aura.addColorStop(0.45, `rgba(${P.goldRgb},${a * 0.13})`)
    aura.addColorStop(0.7, `rgba(${P.goldRgb},0)`)
    ctx.fillStyle = aura
    ctx.beginPath()
    ctx.ellipse(0, 0, W * 0.55, H * 0.42, 0, 0, Math.PI * 2)
    ctx.fill()
    ctx.restore()
  }

  // Sao nhấp nháy (export: 34 dots)
  for (let i = 0; i < 34; i++) {
    const o = 0.15 + 0.5 * Math.abs(Math.sin(time * 1.8 + R(i) * 6.28))
    const s = 3 + R(i, 3) * 4
    ctx.globalAlpha = o
    ctx.fillStyle = R(i, 4) > 0.6 ? P.gold : '#ffffff'
    ctx.beginPath()
    ctx.arc(R(i, 1) * W, R(i, 2) * H, s / 2, 0, Math.PI * 2)
    ctx.fill()
  }
  ctx.globalAlpha = 1

  const vig = ctx.createRadialGradient(CX, H * 0.46, W * 0.2, CX, H * 0.46, W * 0.85)
  vig.addColorStop(0, 'rgba(0,0,0,0)')
  vig.addColorStop(0.55, 'rgba(0,0,0,0)')
  vig.addColorStop(1, P.vignette)
  ctx.fillStyle = vig
  ctx.fillRect(0, 0, W, H)
  ctx.restore()
}

/** Bóng oval dưới cụm thẻ — neo thẻ khỏi nền phẳng. */
function drawCardGroundShadow(ctx: CanvasRenderingContext2D, o = 1) {
  if (o <= 0.01) return
  ctx.save()
  ctx.globalAlpha = (P.canvasBackdrop ? 0.55 : 0.22) * o
  const g = ctx.createRadialGradient(CX, CY + 290, 10, CX, CY + 290, 280)
  g.addColorStop(0, P.groundShadow)
  g.addColorStop(1, 'rgba(0,0,0,0)')
  ctx.fillStyle = g
  ctx.beginPath()
  ctx.ellipse(CX, CY + 290, 260, 48, 0, 0, Math.PI * 2)
  ctx.fill()
  ctx.restore()
}

// ── Moon (mặt lưng thẻ) ──────────────────────────────────────────────────────
function drawMoon(ctx: CanvasRenderingContext2D, x: number, y: number, w: number) {
  const s = w * 0.3
  ctx.save()
  ctx.translate(x, y)
  // vẽ đĩa tròn rồi khoét crescent bằng destination-out
  const grad = ctx.createLinearGradient(0, -s / 2, 0, s / 2)
  grad.addColorStop(0, P.moon0)
  grad.addColorStop(1, P.moon1)
  ctx.shadowColor = P.moonShadow
  ctx.shadowBlur = 14
  ctx.fillStyle = grad
  ctx.beginPath()
  ctx.arc(0, 0, s / 2, 0, Math.PI * 2)
  ctx.fill()
  ctx.shadowBlur = 0
  // khoét: mask radial tại (72%,30%) trong suốt <52%
  ctx.globalCompositeOperation = 'destination-out'
  ctx.beginPath()
  ctx.arc((0.72 - 0.5) * s, (0.3 - 0.5) * s, s * 0.53, 0, Math.PI * 2)
  ctx.fill()
  ctx.restore()
}

// Tia conic (Rays) — vẽ ~26 nêm sáng toả từ tâm, khớp repeating-conic 14deg.
function drawRays(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, o: number, bright: boolean) {
  ctx.save()
  ctx.translate(x, y)
  ctx.globalAlpha = o
  ctx.fillStyle = bright ? P.raysBright : P.raysSoft
  const rad = Math.hypot(w, h)
  for (let deg = 0; deg < 360; deg += 14) {
    const a0 = (deg * Math.PI) / 180,
      a1 = ((deg + 5) * Math.PI) / 180
    ctx.beginPath()
    ctx.moveTo(0, 0)
    ctx.arc(0, 0, rad, a0, a1)
    ctx.closePath()
    ctx.fill()
  }
  ctx.restore()
}

// Ornament (trang trí đỉnh thẻ) — 2 lá + viên kim cương.
function drawOrnament(ctx: CanvasRenderingContext2D, cx: number, topY: number, w: number) {
  const ow = w * 0.16,
    oh = w * 0.1
  const left = cx - ow / 2
  ctx.save()
  // 2 lá (ellipse)
  ctx.fillStyle = P.ornament
  ctx.beginPath()
  ctx.ellipse(left + ow * 0.21, topY + oh * 0.47, ow * 0.21, oh * 0.19, -0.42, 0, Math.PI * 2)
  ctx.ellipse(left + ow * 0.79, topY + oh * 0.47, ow * 0.21, oh * 0.19, 0.42, 0, Math.PI * 2)
  ctx.fill()
  // viên kim cương giữa
  const dg = ctx.createLinearGradient(0, topY, 0, topY + oh * 0.85)
  dg.addColorStop(0, P.ornamentGem0)
  dg.addColorStop(1, P.ornamentGem1)
  ctx.fillStyle = dg
  ctx.beginPath()
  ctx.moveTo(cx, topY)
  ctx.lineTo(cx + ow * 0.11, topY + oh * 0.34)
  ctx.lineTo(cx, topY + oh * 0.85)
  ctx.lineTo(cx - ow * 0.11, topY + oh * 0.34)
  ctx.closePath()
  ctx.fill()
  ctx.restore()
}

/** Voucher trên mặt thẻ — khối chữ neo đáy; cỡ chữ nhỏ dần từ trên xuống.
 *  MAIN_W=460 → layout hardcode (không nhân tỉ lệ mỗi frame). Khác w thì scale. */
function drawVoucherFace(
  ctx: CanvasRenderingContext2D,
  v: VoucherInfo,
  cx: number,
  w: number,
  h: number,
  brandLocale = 'vi',
) {
  // Hardcode theo thẻ chính w=460 (MAIN_W)
  const s = w / 460
  const valueSize = 46 * s
  const titleSize = 26.7 * s
  const brandSize = 19.3 * s
  const codeSize = 17.5 * s
  const expSize = 14.7 * s
  const codeH = 37.5 * s
  const blockH = v.expiry ? 188 * s : 165 * s
  let y = h * 0.92 - blockH

  ctx.save()
  ctx.textAlign = 'center'
  ctx.textBaseline = 'top'
  ctx.globalAlpha = 1

  ctx.font = `700 ${valueSize}px ${FONT_SANS}`
  ctx.fillStyle = P.accent
  ctx.fillText(v.value, cx, y)
  y += 61.2 * s

  ctx.font = `500 ${titleSize}px ${FONT_SANS}`
  ctx.fillStyle = P.title
  ctx.fillText(v.title, cx, y)
  y += 39.2 * s

  ctx.font = `600 ${brandSize}px ${FONT_SANS}`
  ctx.fillStyle = P.brand
  ctx.fillText(v.brand.toLocaleUpperCase(brandLocale || 'vi'), cx, y)
  y += 31.5 * s

  const codeW = Math.min(w * 0.8, Math.max(w * 0.48, v.code.length * codeSize * 0.62 + 41.4 * s))
  const codeX = cx - codeW / 2
  const codeRad = 9.2 * s
  ctx.fillStyle = P.codeBg
  roundRectPath(ctx, codeX, y, codeW, codeH, codeRad)
  ctx.fill()
  ctx.lineWidth = Math.max(1, 1.8 * s)
  ctx.strokeStyle = P.codeStroke
  roundRectPath(ctx, codeX, y, codeW, codeH, codeRad)
  ctx.stroke()
  ctx.font = `600 ${codeSize}px ${FONT_CODE}`
  ctx.fillStyle = P.code
  ctx.textBaseline = 'middle'
  ctx.fillText(v.code, cx, y + codeH * 0.5)
  y += codeH + 7 * s

  if (v.expiry) {
    ctx.textBaseline = 'top'
    ctx.font = `500 ${expSize}px ${FONT_SANS}`
    ctx.fillStyle = P.expiry
    ctx.fillText(v.expiry, cx, y)
  }

  ctx.restore()
}

// Chữ trên thẻ — khớp v2: neo đáy ~7%, gap w*0.02, lineHeight riêng (không chồng dòng).
function drawCardText(ctx: CanvasRenderingContext2D, lines: string[], cx: number, w: number, h: number, full: boolean) {
  const L = lines.slice(0, 3)
  const sizes = [w * 0.105, w * 0.068, w * 0.05]
  const lineHeights = [1.15, 1.2, 1.3]
  const gap = w * 0.02
  const colors = [P.accent, P.textMid, P.accent]
  const fonts = [
    `600 ${sizes[0]}px ${FONT_SANS}`,
    `italic 500 ${sizes[1]}px ${FONT_SANS}`,
    `700 ${sizes[2]}px ${FONT_SANS}`,
  ]

  let blockH = 0
  L.forEach((_, i) => {
    const idx = Math.min(i, 2)
    if (i > 0) blockH += gap
    blockH += sizes[idx] * lineHeights[idx]
  })

  // face: bottom 7% như CardText v2 → khối chữ cao hơn, hiện nhiều hơn
  // cover: căn giữa thẻ
  let y = full ? (h - blockH) / 2 : h * 0.93 - blockH

  ctx.save()
  ctx.textAlign = 'center'
  ctx.textBaseline = 'top'
  L.forEach((line, i) => {
    const idx = Math.min(i, 2)
    ctx.font = fonts[idx]
    ctx.globalAlpha = idx === 2 ? 0.75 : 1
    ctx.fillStyle = colors[idx]
    if (idx === 0) {
      ctx.shadowColor = P.accent + '66'
      ctx.shadowBlur = 24
    } else ctx.shadowBlur = 0
    ctx.fillText(line, cx, y)
    y += sizes[idx] * lineHeights[idx] + gap
  })
  ctx.restore()
}

// Fan 2 bên — `\ 4px || 4px /` (khe mép trong), hạ ~4 CSS px.
//
// Vì sao đổi 4 trên canvas thường "không thấy":
//   Toạ độ vẽ = 1080×1920, canvas được scale xuống viewport (~0.3–0.5×).
//   Δdesign=4 → Δmàn ≈ 1–2 CSS px → mắt gần như không nhận ra.
//   Muốn “4px trên màn” ≈ 4 / scale ≈ 8–12 đơn vị thiết kế (dùng CSS_TO_DESIGN).
const CSS_TO_DESIGN = 2.5 // scale viewport ~0.4 → 4 CSS px ≈ 10 design
/** Thẻ chính rộng hơn để chứa voucher. */
export const MAIN_W = 460
export const MAIN_HALF = MAIN_W / 2
export const MAIN_H = MAIN_W * 1.55
export const MAIN_H_HALF = MAIN_H / 2
/** Âm = fan đè vào thẻ giữa (dịch vào trong). 0 = mép chạm; dương = tách khe. */
const FAN_GAP = -100
export const FAN_W = 340
export const FAN_GEO = [
  { r: -20, x: -(MAIN_HALF + FAN_GAP + FAN_W / 2) }, // trái \  → |x| nhỏ hơn khi GAP âm
  { r: 20, x: MAIN_HALF + FAN_GAP + FAN_W / 2 }, // phải /
] as const
/** Tâm thẻ fan = gốc rotate. */
export const FAN_CY = 0
/** Hạ fan ~4 CSS px. */
export const FAN_DROP = 4 * CSS_TO_DESIGN
export const FAN_H = FAN_W * 1.55

/** Hardcode góc fan lúc spread=1 (tránh deg→rad mỗi frame). */
const FAN_RAD = [(-20 * Math.PI) / 180, (20 * Math.PI) / 180] as const
const SHIMMER_SKEW = Math.tan((-18 * Math.PI) / 180)

// ── Cache bitmap thẻ — key TÁCH (face / fan) để load ảnh fan không vẽ lại face ──
let faceCacheKey = ''
let faceLayer: HTMLCanvasElement | null = null
const fanCacheKeys = ['', '']
const fanLayers: (HTMLCanvasElement | null)[] = [null, null]
/** Mặt lưng thẻ — dùng lúc idle/charge (blit, không vẽ lại mỗi frame). */
let backCacheKey = ''
let backLayer: HTMLCanvasElement | null = null

function paintLayer(
  w: number,
  h: number,
  paint: (ctx: CanvasRenderingContext2D) => void,
): HTMLCanvasElement {
  const c = document.createElement('canvas')
  c.width = Math.ceil(w)
  c.height = Math.ceil(h)
  const ctx = c.getContext('2d')
  if (ctx) paint(ctx)
  return c
}

function faceLayerKey(cfg: Cfg, assets: Assets) {
  const v = cfg.voucher
  return [
    cfg.theme,
    cfg.image,
    cfg.text?.join('\n') ?? '',
    v ? `${v.brand}|${v.title}|${v.value}|${v.code}|${v.expiry ?? ''}` : '',
    assets.mascot ? 'm1' : 'm0',
  ].join('§')
}

function fanLayerKey(cfg: Cfg, assets: Assets, index: number, item: FanItem | null) {
  if (item == null) return '∅'
  const body = typeof item === 'string' ? item : item.text.join('\n')
  return `${cfg.theme}§${body}§${assets.fan[index] ? '1' : '0'}§${cfg.back ?? ''}`
}

function backLayerKey(cfg: Cfg, assets: Assets) {
  return `${cfg.theme}§${cfg.back ?? ''}§${assets.back ? '1' : '0'}`
}

/** Ép GPU upload bitmap — lần blit đầu tiên trên main canvas dễ khựng 1 frame. */
let uploadScratch: CanvasRenderingContext2D | null = null
function touchLayerGPU(layer: HTMLCanvasElement | null) {
  if (!layer) return
  if (!uploadScratch) {
    const c = document.createElement('canvas')
    c.width = 1
    c.height = 1
    uploadScratch = c.getContext('2d')
  }
  uploadScratch?.drawImage(layer, 0, 0, 1, 1)
}

function paintFaceLayer(cfg: Cfg, assets: Assets) {
  faceLayer = paintLayer(MAIN_W, MAIN_H, (ctx) => {
    drawCardBack(ctx, cfg, assets, MAIN_W / 2, MAIN_H / 2, MAIN_W, 0, true, null, null)
  })
  touchLayerGPU(faceLayer)
}

function paintFanLayer(cfg: Cfg, assets: Assets, index: number, item: FanItem | null) {
  if (item == null) {
    fanLayers[index] = null
    return
  }
  fanLayers[index] = paintLayer(FAN_W, FAN_H, (ctx) => {
    drawCardBack(ctx, cfg, assets, FAN_W / 2, FAN_H / 2, FAN_W, 0, false, item, assets.fan[index] ?? null)
  })
  touchLayerGPU(fanLayers[index])
}

function paintBackLayer(cfg: Cfg, assets: Assets) {
  backLayer = paintLayer(MAIN_W, MAIN_H, (ctx) => {
    drawCardBack(ctx, cfg, assets, MAIN_W / 2, MAIN_H / 2, MAIN_W, 0, false, null, null)
  })
  touchLayerGPU(backLayer)
}

function ensureBackLayer(cfg: Cfg, assets: Assets) {
  const k = backLayerKey(cfg, assets)
  if (k !== backCacheKey || !backLayer) {
    backCacheKey = k
    paintBackLayer(cfg, assets)
  }
}

/** Cập nhật từng lớp cache khi thiếu/đổi — không đụng lớp khác. */
function ensureCardLayers(cfg: Cfg, assets: Assets) {
  const fk = faceLayerKey(cfg, assets)
  if (fk !== faceCacheKey || !faceLayer) {
    faceCacheKey = fk
    paintFaceLayer(cfg, assets)
  }
  const slots = resolveFanSlots(cfg.fan)
  for (let i = 0; i < 2; i++) {
    const k = fanLayerKey(cfg, assets, i, slots[i])
    if (k !== fanCacheKeys[i]) {
      fanCacheKeys[i] = k
      paintFanLayer(cfg, assets, i, slots[i])
    }
  }
}

/**
 * Warm tối đa 1 lớp / lần gọi — gọi mỗi frame idle/charge để tránh dồn paint
 * face+2 fan đúng frame bung thẻ (gây khựng ~1 nhịp).
 */
export function warmRevealStep(cfg: Cfg, assets: Assets): boolean {
  applyTheme(cfg.theme)
  ensureBackLayer(cfg, assets)
  const fk = faceLayerKey(cfg, assets)
  if (fk !== faceCacheKey || !faceLayer) {
    faceCacheKey = fk
    paintFaceLayer(cfg, assets)
    return false
  }
  const slots = resolveFanSlots(cfg.fan)
  for (let i = 0; i < 2; i++) {
    const k = fanLayerKey(cfg, assets, i, slots[i])
    if (k !== fanCacheKeys[i]) {
      fanCacheKeys[i] = k
      paintFanLayer(cfg, assets, i, slots[i])
      return false
    }
  }
  return true
}

/** True khi face + fan đã cache sẵn (burst chỉ blit). */
export function revealLayersReady(cfg: Cfg, assets: Assets): boolean {
  if (faceLayerKey(cfg, assets) !== faceCacheKey || !faceLayer) return false
  const slots = resolveFanSlots(cfg.fan)
  for (let i = 0; i < 2; i++) {
    if (fanLayerKey(cfg, assets, i, slots[i]) !== fanCacheKeys[i]) return false
    if (slots[i] != null && !fanLayers[i]) return false
  }
  return true
}

/**
 * Prewarm sau ảnh+font — trải tối đa 1 lớp/frame (idle đang chạy sẽ nuốt tiếp).
 * Vẫn paint back sync ngay (scene chờ mở cần).
 */
export function prewarmCardLayers(cfg: Cfg, assets: Assets) {
  applyTheme(cfg.theme)
  ensureBackLayer(cfg, assets)
  // Trải face/fan sang idle frames — đừng dồn 3 paint liền (khựng idle / tranh charge)
  requestAnimationFrame(() => {
    warmRevealStep(cfg, assets)
    requestAnimationFrame(() => {
      warmRevealStep(cfg, assets)
      requestAnimationFrame(() => warmRevealStep(cfg, assets))
    })
  })
}

/** Gọi trước khi vào burst nếu còn thiếu — an toàn nhưng có thể giật nhẹ lúc quay. */
export function ensureRevealLayers(cfg: Cfg, assets: Assets) {
  ensureCardLayers(cfg, assets)
}

/** Motion fan/thẻ chính lần vẽ gần nhất — dùng cho hit-test khi card đang bob/rot. */
export const fanMotion = {
  rot: 0,
  bob: 0,
  spread: 1,
  /** [trái, phải] — chỉ hit-test bên đang hiện. */
  visible: [true, true] as [boolean, boolean],
}

/** Hit-test thẻ fan trong toạ độ thiết kế 1080×1920. Trả index 0..1 hoặc null. */
export function hitTestFan(
  x: number,
  y: number,
  spread = fanMotion.spread,
  rot = fanMotion.rot,
  bob = fanMotion.bob,
  visible = fanMotion.visible,
): number | null {
  const hit = hitTestReveal(x, y, spread, rot, bob, visible)
  return hit?.kind === 'fan' ? hit.index : null
}

/** Click thẻ giữa hoặc fan. Trả {kind:'main'} | {kind:'fan', index} | null. */
export type RevealHit = { kind: 'main' } | { kind: 'fan'; index: number }

export function hitTestReveal(
  x: number,
  y: number,
  spread = fanMotion.spread,
  rot = fanMotion.rot,
  bob = fanMotion.bob,
  visible = fanMotion.visible,
): RevealHit | null {
  if (spread < 0.45) return null

  // World → local quanh CX,CY: bỏ bob rồi bỏ rot thẻ chính.
  let dx = x - CX
  let dy = y - CY - bob
  {
    const c = Math.cos((-rot * Math.PI) / 180)
    const s = Math.sin((-rot * Math.PI) / 180)
    const rx = dx * c - dy * s
    const ry = dx * s + dy * c
    dx = rx
    dy = ry
  }

  // Thẻ chính nằm trên — ưu tiên click.
  if (Math.abs(dx) <= MAIN_HALF && Math.abs(dy) <= MAIN_H_HALF) return { kind: 'main' }

  for (let i = FAN_GEO.length - 1; i >= 0; i--) {
    if (!visible[i]) continue
    const angle = (FAN_GEO[i].r * spread * Math.PI) / 180
    const tuck = (1 - spread) * 40
    const pushX = FAN_GEO[i].x * spread
    const px = dx - pushX
    const py = dy - FAN_DROP
    const c = Math.cos(-angle)
    const s = Math.sin(-angle)
    const lx = px * c - py * s
    const ly = px * s + py * c - tuck
    if (Math.abs(lx) <= FAN_W / 2 && Math.abs(ly) <= FAN_H / 2) return { kind: 'fan', index: i }
  }
  return null
}

/** Client (viewport) → toạ độ thiết kế 1080×1920 (cùng công thức setTransform trong RAF). */
export function clientToDesign(canvas: HTMLCanvasElement, clientX: number, clientY: number) {
  const rect = canvas.getBoundingClientRect()
  const bx = ((clientX - rect.left) * canvas.width) / rect.width
  const by = ((clientY - rect.top) * canvas.height) / rect.height
  const scale = Math.min(canvas.width / W, canvas.height / H)
  const ox = (canvas.width - W * scale) / 2
  const oy = (canvas.height - H * scale) / 2
  return { x: (bx - ox) / scale, y: (by - oy) / scale }
}

// CardBack — thẻ (mặt trước face / mặt lưng). Vẽ tại tâm (x,y), rộng w.
export function drawCardBack(
  ctx: CanvasRenderingContext2D,
  cfg: Cfg,
  assets: Assets,
  x: number,
  y: number,
  w: number,
  glow: number,
  face: boolean,
  cover: string | { text: string[] } | null,
  coverImg: HTMLImageElement | null,
) {
  applyTheme(cfg.theme)
  const h = w * 1.55
  const coverTxt = cover && typeof cover === 'object' && 'text' in cover ? cover.text : null
  const imgEl = face ? null : coverTxt ? null : coverImg ?? assets.back
  const isPhoto = !!imgEl
  const voucher = face && cfg.voucher ? cfg.voucher : null
  const faceTxt = face && !voucher && cfg.text ? cfg.text : null
  const left = x - w / 2,
    top = y - h / 2
  const rad = w * 0.05

  ctx.save()
  ctx.translate(left, top)

  // shadow + glow của thẻ
  ctx.save()
  ctx.shadowColor = `rgba(${P.glowRgb},${glow * 0.55})`
  // Cap blur — shadowBlur cao mỗi frame (3 thẻ) ăn FPS mạnh
  ctx.shadowBlur = glow > 0.01 ? Math.min(22, glow * 32) : 0
  const bg = ctx.createLinearGradient(0, 0, 0, h)
  if (face) {
    bg.addColorStop(0, P.faceTop)
    bg.addColorStop(1, P.faceBot)
  } else {
    bg.addColorStop(0, P.backTop)
    bg.addColorStop(1, P.backBot)
  }
  ctx.fillStyle = bg
  roundRectPath(ctx, 0, 0, w, h, rad)
  ctx.fill()
  ctx.restore()

  // viền ngoài — ảnh: khung trắng dày kiểu v0 (.cr-face); còn lại: P.accent mỏng
  if (isPhoto) {
    ctx.lineWidth = Math.max(4, w * 0.028)
    ctx.strokeStyle = 'rgba(255,255,255,0.95)'
    roundRectPath(ctx, 0, 0, w, h, rad)
    ctx.stroke()
    ctx.lineWidth = Math.max(2, w * 0.01)
    ctx.strokeStyle = P.accent + '99'
    roundRectPath(ctx, 0, 0, w, h, rad)
    ctx.stroke()
  } else {
    ctx.lineWidth = Math.max(2, w * 0.008)
    ctx.strokeStyle = face ? P.accent + 'cc' : P.borderSoft
    roundRectPath(ctx, 0, 0, w, h, rad)
    ctx.stroke()
  }

  // viền SÁNG theo glow (lúc lật thẻ) — bản gốc dùng boxShadow vàng rộng; ở đây stroke vàng + shadowBlur.
  if (glow > 0.01) {
    ctx.save()
    ctx.globalAlpha = Math.min(1, glow)
    ctx.lineWidth = Math.max(2, w * 0.012)
    ctx.strokeStyle = `rgba(${P.glowRgb},0.95)`
    ctx.shadowColor = `rgba(${P.glowRgb},${Math.min(0.7, glow)})`
    ctx.shadowBlur = Math.min(28, glow * 36)
    roundRectPath(ctx, 0, 0, w, h, rad)
    ctx.stroke()
    ctx.restore()
  }

  // clip trong thẻ để vẽ nội dung
  ctx.save()
  roundRectPath(ctx, 0, 0, w, h, rad)
  ctx.clip()

  if (imgEl) {
    // Khung ảnh (border v0: inset + dash) — object-fit: contain (đủ ảnh, không cắt/bóp)
    const pad = w * 0.055
    const imgRad = Math.max(4, w * 0.04)
    const pw = w - pad * 2
    const ph = h - pad * 2
    ctx.fillStyle = P.photoPad
    roundRectPath(ctx, pad, pad, pw, ph, imgRad)
    ctx.fill()
    const iw0 = imgEl.naturalWidth || imgEl.width || 1
    const ih0 = imgEl.naturalHeight || imgEl.height || 1
    const scale = Math.min(pw / iw0, ph / ih0)
    const dw = iw0 * scale
    const dh = ih0 * scale
    const dx = pad + (pw - dw) / 2
    const dy = pad + (ph - dh) / 2
    ctx.save()
    roundRectPath(ctx, pad, pad, pw, ph, imgRad)
    ctx.clip()
    ctx.drawImage(imgEl, dx, dy, dw, dh)
    ctx.restore()
    // viền trong nét đứt (v0 .cr-face::before)
    ctx.save()
    ctx.setLineDash([Math.max(4, w * 0.02), Math.max(3, w * 0.014)])
    ctx.lineWidth = Math.max(1.5, w * 0.006)
    ctx.strokeStyle = 'rgba(255,255,255,0.75)'
    roundRectPath(ctx, pad, pad, pw, ph, imgRad)
    ctx.stroke()
    ctx.restore()
  } else {
    // viền trong
    ctx.lineWidth = 1
    ctx.strokeStyle = face ? P.accent + '88' : P.innerBorderSoft
    roundRectPath(ctx, w * 0.032, h * 0.032, w * 0.936, h * 0.936, w * 0.035)
    ctx.stroke()

    if (face) {
      const fg = ctx.createRadialGradient(w * 0.5, h * 0.46, 0, w * 0.5, h * 0.46, w * 0.5)
      fg.addColorStop(0, P.faceGlow0)
      fg.addColorStop(0.48, P.faceGlow1)
      fg.addColorStop(0.7, P.gold + '22')
      fg.addColorStop(0.82, P.gold + '00')
      ctx.fillStyle = fg
      ctx.fillRect(0, 0, w, h)
    }

    // Nền sọc tỏa (giống thẻ thư trái) — luôn vẽ; face/fan đã cache nên không tốn FPS mỗi frame
    drawRays(ctx, w * 0.5, h * 0.5, w, h, face ? 0.9 : 1, face)

    if (face) {
      // mascot — voucher/text: cỡ giống lúc có text (~0.78), neo cao hơn một chút
      const im = assets.mascot
      if (im) {
        const hasLower = !!(voucher || faceTxt)
        const iw = w * (hasLower ? 0.78 : 0.94)
        const ih = iw * ((im.naturalHeight || im.height) / (im.naturalWidth || im.width || 1) || 1)
        const my = h * (hasLower ? 0.32 : 0.47)
        ctx.drawImage(im, w * 0.5 - iw / 2, my - ih / 2, iw, ih)
      }
    } else if (!coverTxt) {
      drawMoon(ctx, w * 0.5, h * 0.44, w)
    }

    if (voucher) drawVoucherFace(ctx, voucher, w * 0.5, w, h, cfg.brandLocale)
    else if (faceTxt) drawCardText(ctx, faceTxt, w * 0.5, w, h, false)
    if (coverTxt) drawCardText(ctx, coverTxt, w * 0.5, w, h, true)

    // Twinkles trong thẻ — bỏ khi voucher (đắt + che chữ)
    if (!voucher) {
      for (let i = 0; i < 6; i++) {
        star(ctx, w * (0.2 + R(i, 7) * 0.6), h * (0.18 + R(i, 8) * 0.6), w * 0.03 + R(i, 9) * w * 0.02, 0.7, face ? P.gold : P.starMuted)
      }
    }
  }
  ctx.restore() // hết clip

  drawOrnament(ctx, w * 0.5, -w * 0.045, w)

  // 4 dots góc (chỉ mặt vẽ, không ảnh, không voucher)
  if (!imgEl && !voucher) {
    for (const [px, py] of [[7, 7], [7, 93], [93, 7], [93, 93]]) {
      const dr = w * 0.0275
      ctx.fillStyle = P.cornerDot
      ctx.beginPath()
      ctx.arc((px / 100) * w, (py / 100) * h, dr, 0, Math.PI * 2)
      ctx.fill()
      ctx.lineWidth = 2
      ctx.strokeStyle = P.accent + '55'
      ctx.stroke()
    }
  }

  ctx.restore()
}

function drawRibbon(ctx: CanvasRenderingContext2D, sx: number, o: number) {
  if (o <= 0.005) return
  ctx.save()
  // Ribbon đậm hơn để neo đáy kiểu reference (che ~1/3 dưới).
  ctx.globalAlpha = Math.min(1, o * 0.92)
  ctx.translate(CX, CY + 185)
  ctx.scale(sx, 1)
  ctx.translate(-360, 0)
  // 2 đuôi
  ctx.fillStyle = P.ribbon
  for (const [rx, sk, ro] of [
    [-20, 16, -4],
    [720 - 140 + 20, -16, 4],
  ]) {
    ctx.save()
    ctx.translate(rx + 70, 42 + 52)
    ctx.rotate((ro * Math.PI) / 180)
    ctx.transform(1, Math.tan((sk * Math.PI) / 180), 0, 1, 0, 0)
    roundRectPath(ctx, -70, -52, 140, 104, 8)
    ctx.fill()
    ctx.restore()
  }
  // thân — cao hơn một chút để ghim đáy 3 thẻ
  const bg = ctx.createLinearGradient(0, 0, 0, 132)
  bg.addColorStop(0, P.ribbonGrad0)
  bg.addColorStop(0.8, P.ribbonGrad1)
  ctx.fillStyle = bg
  roundRectPath(ctx, 46, 0, 720 - 92, 132, 18)
  ctx.fill()
  ctx.lineWidth = 1
  ctx.strokeStyle = P.ribbonStroke
  ctx.stroke()
  ctx.restore()
}

function drawHalo(ctx: CanvasRenderingContext2D, scale: number, o: number) {
  if (o <= 0.005) return
  ctx.save()
  ctx.globalAlpha = o
  ctx.translate(CX, CY)
  ctx.scale(scale, scale)
  ctx.lineWidth = 3
  ctx.strokeStyle = P.haloStroke
  if (P.canvasBackdrop) {
    ctx.shadowColor = `rgba(${P.glowRgb},0.35)`
    ctx.shadowBlur = 40
  }
  ctx.beginPath()
  ctx.arc(0, 0, 330, 0, Math.PI * 2)
  ctx.stroke()
  ctx.restore()
}

/** Blit mặt lưng cache tại gốc local (tâm 0,0). */
function blitBackCard(ctx: CanvasRenderingContext2D, cfg: Cfg, assets: Assets) {
  ensureBackLayer(cfg, assets)
  if (backLayer) ctx.drawImage(backLayer, -MAIN_HALF, -MAIN_H_HALF)
}

/**
 * Soft-glow giả blur — chồng vài lớp fill/stroke rộng dần + alpha giảm.
 * Rẻ hơn ctx.filter / shadowBlur lớn; vẫn ra quầng vàng kim.
 */
function drawSoftGoldAura(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  rad: number,
  strength: number,
) {
  if (strength <= 0.02) return
  ctx.save()
  ctx.globalCompositeOperation = 'lighter'
  // halo — cam/P.accent để nổi trên nền kem (vàng nhạt dễ mất)
  const cx = x + w / 2,
    cy = y + h / 2
  const R0 = Math.hypot(w, h) * 0.32
  for (let i = 3; i >= 0; i--) {
    const t = i / 3
    const rr = R0 * (1.05 + t * 0.55)
    const g = ctx.createRadialGradient(cx, cy, rr * 0.15, cx, cy, rr)
    const a = strength * (0.32 - t * 0.06)
    g.addColorStop(0, `rgba(255,210,120,${a})`)
    g.addColorStop(0.4, `rgba(${P.accentRgb},${a * 0.55})`)
    g.addColorStop(0.75, `rgba(${P.goldRgb},${a * 0.35})`)
    g.addColorStop(1, `rgba(${P.goldRgb},0)`)
    ctx.fillStyle = g
    ctx.beginPath()
    ctx.arc(cx, cy, rr, 0, Math.PI * 2)
    ctx.fill()
  }
  // viền thẻ — P.accent đậm hơn vàng kem
  for (let i = 2; i >= 0; i--) {
    const pad = 4 + i * 7
    ctx.globalAlpha = strength * (0.48 - i * 0.1)
    ctx.lineWidth = 2.5 + i * 3.5
    ctx.strokeStyle = i === 0 ? `rgba(${P.glowRgb},0.95)` : `rgba(${P.accentRgb},0.7)`
    roundRectPath(ctx, x - pad / 2, y - pad / 2, w + pad, h + pad, rad + pad * 0.3)
    ctx.stroke()
  }
  ctx.restore()
}

/** Blade mềm — chồng rect rộng + alpha (thay filter:blur). */
function drawSoftBlade(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  h: number,
  o: number,
  core: string,
  glow: string,
) {
  if (o <= 0.005) return
  ctx.save()
  for (let i = 3; i >= 1; i--) {
    const w = 10 + i * 14
    ctx.globalAlpha = o * (0.18 - i * 0.03)
    const g = ctx.createLinearGradient(0, cy - h / 2, 0, cy + h / 2)
    g.addColorStop(0, glow + '00')
    g.addColorStop(0.25, glow)
    g.addColorStop(0.5, core)
    g.addColorStop(0.75, glow)
    g.addColorStop(1, glow + '00')
    ctx.fillStyle = g
    roundRectPath(ctx, cx - w / 2, cy - h / 2, w, h, w / 2)
    ctx.fill()
  }
  ctx.globalAlpha = o
  const gc = ctx.createLinearGradient(0, cy - h / 2, 0, cy + h / 2)
  gc.addColorStop(0, core + '00')
  gc.addColorStop(0.3, core)
  gc.addColorStop(0.7, core)
  gc.addColorStop(1, core + '00')
  ctx.fillStyle = gc
  roundRectPath(ctx, cx - 5, cy - h / 2, 10, h, 5)
  ctx.fill()
  ctx.restore()
}

// Revealed — thẻ + fan + glow (dùng chung Burst & After).
// Thẻ face/fan: blit từ cache (hard paint 1 lần) — đỡ vẽ chữ/rays mỗi frame.
function drawRevealed(
  ctx: CanvasRenderingContext2D,
  cfg: Cfg,
  assets: Assets,
  o: { spread: number; whiteHot: number; glowK: number; rot: number; bob: number; shimmerK: number; time: number; twinkleAmp: number },
) {
  const { spread, whiteHot, glowK, rot, bob, shimmerK, time, twinkleAmp } = o
  fanMotion.rot = rot
  fanMotion.bob = bob
  fanMotion.spread = spread
  const fanSlots = resolveFanSlots(cfg.fan)
  fanMotion.visible = [fanSlots[0] != null, fanSlots[1] != null]
  ensureCardLayers(cfg, assets)

  drawCardGroundShadow(ctx, Math.min(1, 0.35 + spread * 0.65))

  // glow tròn — bỏ halo shadowBlur đắt; chỉ radial fill
  const glowA = Math.min(0.9, (0.28 + whiteHot * 0.35) * glowK * GLOW)
  if (glowA > 0.02) {
    const ggrad = ctx.createRadialGradient(CX, CY, 0, CX, CY, 400)
    ggrad.addColorStop(0, `rgba(255,240,200,${glowA})`)
    ggrad.addColorStop(0.42, P.gold + ax(Math.min(1, (30 * glowK * GLOW) / 255)))
    ggrad.addColorStop(0.66, P.gold + '00')
    ctx.fillStyle = ggrad
    ctx.beginPath()
    ctx.arc(CX, CY, 400, 0, Math.PI * 2)
    ctx.fill()
  }

  const rotRad = (rot * Math.PI) / 180

  // fan 2 bên — blit cache
  for (let i = 0; i < FAN_GEO.length; i++) {
    const layer = fanLayers[i]
    if (!layer || fanSlots[i] == null) continue
    const f = FAN_GEO[i]
    ctx.save()
    ctx.globalAlpha = Math.min(1, spread * 2)
    ctx.translate(CX, CY + bob)
    ctx.rotate(rotRad)
    ctx.translate(f.x * spread, FAN_DROP)
    ctx.rotate(FAN_RAD[i] * spread)
    ctx.translate(0, (1 - spread) * 40)
    ctx.drawImage(layer, -FAN_W / 2, -FAN_H / 2)
    ctx.restore()
  }

  drawRibbon(ctx, Math.min(1, spread * 1.1), Math.min(1, spread * 2.5))

  // thẻ chính — blit cache
  ctx.save()
  ctx.translate(CX, CY + bob)
  ctx.rotate(rotRad)
  if (faceLayer) ctx.drawImage(faceLayer, -MAIN_HALF, -MAIN_H_HALF)
  if (whiteHot > 0.01) {
    const wg = ctx.createRadialGradient(0, -10, 0, 0, -10, MAIN_W * 0.8)
    wg.addColorStop(0, `rgba(255,255,255,${whiteHot * 0.92})`)
    wg.addColorStop(0.4, `rgba(255,255,255,${whiteHot * 0.65})`)
    wg.addColorStop(0.78, 'rgba(255,255,255,0)')
    ctx.fillStyle = wg
    ctx.fillRect(-MAIN_HALF, -MAIN_H_HALF, MAIN_W, MAIN_H)
  }
  if (shimmerK >= 0 && shimmerK <= 1) {
    ctx.save()
    roundRectPath(ctx, -MAIN_HALF, -MAIN_H_HALF, MAIN_W, MAIN_H, 20)
    ctx.clip()
    const shx = -MAIN_HALF + ((-60 + shimmerK * 220) / 100) * MAIN_W
    ctx.translate(shx, 0)
    ctx.transform(1, 0, SHIMMER_SKEW, 1, 0, 0)
    const sg = ctx.createLinearGradient(0, 0, MAIN_W * 0.45, 0)
    sg.addColorStop(0, 'rgba(255,252,245,0)')
    sg.addColorStop(0.45, 'rgba(255,245,210,0.55)')
    sg.addColorStop(0.55, 'rgba(255,255,255,0.42)')
    sg.addColorStop(1, 'rgba(255,252,245,0)')
    ctx.fillStyle = sg
    ctx.fillRect(0, -MAIN_H_HALF * 1.4, MAIN_W * 0.45, MAIN_H * 1.4)
    ctx.restore()
  }
  ctx.restore()

  // twinkles — giảm 12→6 khi mê hoặc ổn định
  const nTw = whiteHot > 0.01 ? 12 : 6
  for (let i = 0; i < nTw; i++) {
    const tw = twinkleAmp * Math.max(0, Math.sin(time * 2.6 + R(i, 5) * 6.28)) * 0.9
    star(ctx, CX + (R(i, 1) - 0.5) * 760, CY + (R(i, 2) - 0.55) * 900, 12 + R(i, 3) * 26, tw, R(i, 4) > 0.5 ? P.gold : '#fff', R(i) * 90)
  }
}

// ── SCENES ───────────────────────────────────────────────────────────────────

function sceneIdle(ctx: CanvasRenderingContext2D, cfg: Cfg, assets: Assets, lt: number, p: number) {
  // Mỗi frame chờ mở: warm tối đa 1 lớp face/fan → tới lúc bấm đã blit sẵn
  warmRevealStep(cfg, assets)

  const amp = ss(0, 0.1, p) * (1 - ss(0.9, 1, p))
  const bob = Math.sin(lt * 1.5) * 18 * amp,
    rot = Math.sin(lt * 1.05 + 0.6) * 5.5 * amp,
    sway = Math.sin(lt * 0.7) * 10 * amp
  drawBackdrop(ctx, lt)

  // rings
  for (let i = 0; i < 3; i++) {
    const k = (lt * 0.3 + i / 3) % 1
    const o = amp * Math.min(k / 0.12, 1) * (1 - k) * 0.5
    const s = 460 + k * 420
    if (o > 0.005) {
      ctx.save()
      ctx.globalAlpha = o
      ctx.lineWidth = 2
      ctx.strokeStyle = 'rgba(244,230,190,1)'
      ctx.beginPath()
      ctx.arc(CX, CY - 40, s / 2, 0, Math.PI * 2)
      ctx.stroke()
      ctx.restore()
    }
  }
  // bubbles
  for (let i = 0; i < 5; i++) {
    const k = (lt * (0.14 + R(i) * 0.1) + R(i, 1)) % 1
    const s = 26 + R(i, 2) * 60
    const o = amp * (1 - k) * 0.5
    if (o > 0.005) {
      ctx.save()
      ctx.globalAlpha = o
      ctx.lineWidth = 2
      ctx.strokeStyle = 'rgba(230,220,200,1)'
      ctx.beginPath()
      ctx.arc(CX + (R(i, 3) - 0.5) * 620, CY + 260 - k * 760, s / 2, 0, Math.PI * 2)
      ctx.stroke()
      ctx.restore()
    }
  }
  // dust — giảm 22→10
  for (let i = 0; i < 10; i++) {
    const k = (lt * (0.05 + R(i) * 0.06) + R(i, 1)) % 1
    const s = 4 + R(i, 3) * 5
    dot(ctx, R(i, 2) * W + Math.sin(lt + i) * 14, H - k * H, s / 2, amp * (0.2 + 0.5 * Math.abs(Math.sin(lt * 2.4 + i))) * (1 - k), P.gold)
  }
  // glow đáy
  const pulse = (0.3 + 0.14 * Math.sin(lt * 2.2)) * amp * GLOW
  const bglow = ctx.createRadialGradient(CX, CY + 390, 0, CX, CY + 390, 380)
  bglow.addColorStop(0, P.gold + ax((80 * pulse) / 255))
  bglow.addColorStop(0.7, P.gold + '00')
  ctx.fillStyle = bglow
  ctx.fillRect(CX - 380, CY + 180, 760, 420)

  drawCardGroundShadow(ctx, amp)

  // thẻ idle — blit cache (không drawCardBack + shadow mỗi frame)
  ctx.save()
  ctx.translate(CX + sway, CY - 40 + bob)
  ctx.rotate((rot * Math.PI) / 180)
  blitBackCard(ctx, cfg, assets)
  ctx.restore()
}

function sceneCharge(ctx: CanvasRenderingContext2D, cfg: Cfg, assets: Assets, lt: number, p: number) {
  const pA = clamp(p / 0.5, 0, 1),
    pB = clamp((p - 0.5) / 0.5, 0, 1)
  const scale = 1 + 0.07 * Easing.easeOutBack(pA)
  const spinT = ss(0.12, 1, p)
  // Ease 1 lần (trước còn * spinT → vòng cuối chậm hẳn khi FPS tụt càng lộ)
  const easeSpin = spinT < 0.5 ? 2 * spinT * spinT : 1 - Math.pow(-2 * spinT + 2, 2) / 2
  const angle = 990 * easeSpin
  const edge = Math.abs(Math.sin((angle * Math.PI) / 180))
  const bright = 1 + 0.5 * pA + 1.8 * pB * pB
  const lift = -30 * Easing.easeInOutQuad(spinT)
  const bladeO = ss(0.86, 0.97, p),
    bladeH = 340 + 480 * ss(0.82, 1, p)
  const { blade, bladeGlow } = cfg
  const flare = ss(0.88, 1, p)

  // Warm mặt/fan trong lúc quay (1 lớp/frame) — xong trước burst, tránh khựng lúc bung
  if (p < 0.82) warmRevealStep(cfg, assets)
  else if (!revealLayersReady(cfg, assets)) ensureRevealLayers(cfg, assets)

  drawBackdrop(ctx, lt + 3)

  // rings P.accent — nổi trên nền kem
  for (let i = 0; i < 2; i++) {
    const k = 1 - clamp(pA * 1.3 - i * 0.15, 0, 1)
    const s = 420 + k * 500
    const o = pA * (1 - pB) * Math.min(1, (1 - k) * 3) * k * 0.9
    if (o > 0.005) {
      ctx.save()
      ctx.globalAlpha = o
      ctx.lineWidth = 3.5
      ctx.strokeStyle = i === 0 ? `rgba(${P.accentRgb},0.85)` : `rgba(${P.goldRgb},0.9)`
      ctx.beginPath()
      ctx.arc(CX, CY - 40, s / 2, 0, Math.PI * 2)
      ctx.stroke()
      ctx.restore()
    }
  }
  // conv particles — 18→8
  for (let i = 0; i < 8; i++) {
    const k = clamp(pA * 1.5 - R(i) * 0.5, 0, 1)
    const a = R(i, 1) * 6.283,
      d = (400 + R(i, 2) * 300) * (1 - Easing.easeInQuad(k))
    const o = 0.95 * Math.sin(clamp(k, 0, 1) * Math.PI)
    const col = R(i, 5) > 0.55 ? P.accent : R(i, 5) > 0.25 ? P.gold : '#fff'
    dot(ctx, CX + Math.cos(a) * d, CY - 40 + Math.sin(a) * d * 1.1, (6 + R(i, 3) * 8) / 2, o, col)
  }
  // glow đáy cam ấm
  const bglow = ctx.createRadialGradient(CX, CY + 390, 0, CX, CY + 390, 380)
  bglow.addColorStop(0, `rgba(${P.accentRgb},${0.22 * (0.35 + 0.65 * pA) * GLOW})`)
  bglow.addColorStop(0.45, P.gold + ax((90 * (0.3 + 0.6 * pA) * GLOW) / 255))
  bglow.addColorStop(0.75, P.gold + '00')
  ctx.fillStyle = bglow
  ctx.fillRect(CX - 380, CY + 180, 760, 420)

  drawCardGroundShadow(ctx, 0.55 + 0.9 * pA)

  // thẻ xoay — blit cache + quầng P.accent/cam (nổi trên nền kem)
  const opacityCard = 1 - ss(0.94, 1, p)
  if (opacityCard > 0.005) {
    ctx.save()
    ctx.globalAlpha = opacityCard
    ctx.translate(CX, CY - 40 + lift)
    const sxSpin = Math.max(0.02, Math.abs(Math.cos((angle * Math.PI) / 180)))
    ctx.scale(sxSpin * scale, scale)
    const auraK = clamp(0.4 * pA + 1.05 * pB + edge * 0.45 * spinT, 0, 1.35)
    drawSoftGoldAura(ctx, -MAIN_HALF, -MAIN_H_HALF, MAIN_W, MAIN_H, 24, auraK)
    blitBackCard(ctx, cfg, assets)
    // sáng ấm mặt thẻ (tránh trắng loá)
    const brightK = clamp((bright - 1) * 0.28, 0, 0.55)
    if (brightK > 0.005) {
      ctx.save()
      ctx.globalCompositeOperation = 'lighter'
      ctx.globalAlpha = brightK
      ctx.fillStyle = 'rgba(255,210,160,1)'
      roundRectPath(ctx, -MAIN_HALF, -MAIN_H_HALF, MAIN_W, MAIN_H, 20)
      ctx.fill()
      ctx.restore()
    }
    const streakA = edge * 0.7 * spinT
    if (streakA > 0.005) {
      ctx.save()
      roundRectPath(ctx, -MAIN_HALF, -MAIN_H_HALF, MAIN_W, MAIN_H, 20)
      ctx.clip()
      const sg = ctx.createLinearGradient(-180, 0, 180, 0)
      sg.addColorStop(0.25, 'rgba(255,200,140,0)')
      sg.addColorStop(0.5, `rgba(255,230,180,${streakA})`)
      sg.addColorStop(0.75, `rgba(${P.accentRgb},0)`)
      ctx.fillStyle = sg
      ctx.fillRect(-MAIN_HALF, -MAIN_H_HALF, MAIN_W, MAIN_H)
      ctx.restore()
    }
    ctx.restore()
  }

  // blade → trắng dần (khỏi cam) khi sắp cắt scene
  const toWhite = ss(0.82, 0.97, p)
  const bladeCore = toWhite > 0.01 ? '#ffffff' : blade
  const bladeSoft = toWhite > 0.01 ? '#ffffff' : bladeGlow
  drawSoftBlade(ctx, CX, CY - 40, bladeH, bladeO, bladeCore, bladeSoft)
  // flare trắng
  if (flare > 0.005) {
    ctx.save()
    ctx.globalAlpha = flare * 0.95
    const fg = ctx.createRadialGradient(CX, CY - 40, 0, CX, CY - 40, 180)
    fg.addColorStop(0, '#ffffff')
    fg.addColorStop(0.35, 'rgba(255,255,255,0.85)')
    fg.addColorStop(0.7, 'rgba(255,255,255,0)')
    ctx.fillStyle = fg
    ctx.fillRect(CX - 180, CY - 110, 360, 140)
    ctx.restore()
    for (let i = 0; i < 4; i++) {
      star(ctx, CX + (R(i, 6) - 0.5) * 200 * flare, CY - 40 + (R(i, 7) - 0.5) * 320 * flare, 14 + R(i, 8) * 30, flare * (0.5 + R(i) * 0.5), '#fff', R(i) * 90)
    }
  }
  // Phủ trắng cuối quay → nối liền flash đầu "Đang mở" (che khựng cắt scene)
  const cutWash = ss(0.9, 1, p)
  if (cutWash > 0.01) {
    ctx.save()
    ctx.globalAlpha = cutWash * 0.97
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, W, H)
    ctx.restore()
  }
}

function sceneBurst(ctx: CanvasRenderingContext2D, cfg: Cfg, assets: Assets, lt: number, p: number, dur: number) {
  const pop = Easing.easeOutBack(clamp(p / 0.2, 0, 1))
  const sxCard = Math.min(1, 0.03 + 0.97 * pop)
  const whiteHot = 1 - ss(0.32, 0.82, p)
  // Flash trắng full ngay frame đầu (không ramp từ 0) — che khúc cắt quay→mở
  const flash =
    p < 0.1 ? 1 - p * 0.35 : Math.max(0, 0.965 * (1 - (p - 0.1) / 0.34))
  const spread = Easing.easeOutBack(clamp((p - 0.1) / 0.42, 0, 1))
  const haloK = clamp(p / 0.55, 0, 1)
  const punch = 1 + Math.sin(clamp(p / 0.35, 0, 1) * Math.PI) * 0.035
  const swayIn = ss(0.25, 0.65, p)
  const wobRot = Math.sin((lt - dur) * 1.15) * 1.6 * swayIn
  const wobBob = Math.sin((lt - dur) * 1.45) * 9 * swayIn
  const shockK = Easing.easeOutCubic(clamp(p / 0.32, 0, 1))

  drawBackdrop(ctx, lt + 5)

  // Lớp trắng dưới ngay từ đầu frame — scene cắt vào vẫn sáng trắng, không lộ cam
  if (flash > 0.6) {
    ctx.save()
    ctx.globalAlpha = (flash - 0.6) * 2.2 * 0.55
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, W, H)
    ctx.restore()
  }

  ctx.save()
  ctx.translate(CX, CY - 40)
  ctx.scale(punch, punch)
  ctx.translate(-CX, -(CY - 40))

  // conic tia — trắng kem (bớt vàng/cam), thưa lúc flash đầu
  if (whiteHot > 0.01 && p > 0.06) {
    ctx.save()
    ctx.globalAlpha = whiteHot * 0.4 * (1 - flash * 0.85)
    ctx.translate(CX, CY)
    ctx.rotate((p * 28 * Math.PI) / 180)
    ctx.fillStyle = 'rgba(255,255,255,0.55)'
    const step = p < 0.18 ? 36 : 24
    for (let deg = 0; deg < 360; deg += step) {
      const a0 = (deg * Math.PI) / 180,
        a1 = ((deg + 5) * Math.PI) / 180
      ctx.beginPath()
      ctx.moveTo(0, 0)
      ctx.arc(0, 0, 520, a0, a1)
      ctx.closePath()
      ctx.fill()
    }
    ctx.restore()
  }

  // Revealed (nén ngang sxCard lúc thẻ bung)
  ctx.save()
  ctx.translate(CX, CY)
  ctx.scale(sxCard, 1)
  ctx.translate(-CX, -CY)
  drawRevealed(ctx, cfg, assets, { spread, whiteHot, glowK: 1 + flash, time: lt, twinkleAmp: ss(0.6, 0.9, p) * 0.55, shimmerK: -1, rot: wobRot, bob: wobBob })
  ctx.restore()

  // streaks — 12→6
  for (let i = 0; i < 6; i++) {
    const len = (200 + R(i, 10) * 380) * Easing.easeOutCubic(clamp(p * 2.2, 0, 1))
    const o = ss(0.01, 0.07, p) * (1 - ss(0.28, 0.55, p)) * (0.5 + R(i, 11) * 0.5)
    if (o > 0.005) {
      ctx.save()
      ctx.globalAlpha = o
      ctx.translate(CX, CY - 40)
      ctx.rotate((R(i, 9) * 360 * Math.PI) / 180)
      const sg = ctx.createLinearGradient(0, 0, 0, len)
      sg.addColorStop(0, 'rgba(255,248,220,0.95)')
      sg.addColorStop(0.6, P.gold + '55')
      sg.addColorStop(1, P.gold + '00')
      ctx.fillStyle = sg
      roundRectPath(ctx, -2.5, 0, 5, len, 2.5)
      ctx.fill()
      ctx.restore()
    }
  }
  // sparks — SPARKS(20)→10
  for (let i = 0; i < 10; i++) {
    const a = R(i) * 6.283,
      d = (140 + R(i, 1) * 460) * Easing.easeOutCubic(clamp(p * 1.5, 0, 1))
    const o = ss(0.02, 0.08 + R(i, 3) * 0.1, p) * (1 - ss(0.5 + R(i, 4) * 0.35, 0.98, p))
    star(ctx, CX + Math.cos(a) * d, CY - 40 + Math.sin(a) * d * 1.15, 9 + R(i, 2) * 30, o, R(i, 5) > 0.45 ? P.gold : '#fff', R(i) * 360 + p * 140)
  }
  // fount — 14→8
  for (let i = 0; i < 8; i++) {
    const k = clamp(p * 1.3 - R(i) * 0.3, 0, 1)
    dot(ctx, CX + (R(i, 1) - 0.5) * 500, CY + 240 - k * (300 + R(i, 2) * 380), (5 + R(i, 3) * 6) / 2, k > 0 ? (1 - k) * 0.85 : 0, P.gold)
  }
  // shockwave ring
  if ((1 - shockK) * 0.85 > 0.005) {
    ctx.save()
    ctx.globalAlpha = (1 - shockK) * 0.85
    ctx.translate(CX, CY - 40)
    ctx.scale(0.15 + shockK * 2, 0.15 + shockK * 2)
    ctx.lineWidth = 4
    ctx.strokeStyle = 'rgba(255,246,222,0.9)'
    ctx.beginPath()
    ctx.arc(0, 0, 340, 0, Math.PI * 2)
    ctx.stroke()
    ctx.restore()
  }
  drawHalo(ctx, 0.5 + haloK * 1.1, (1 - haloK) * 0.7)

  // Flash trắng phủ trên cùng — che mọi thứ (kể cả khựng cắt scene)
  if (flash > 0.01) {
    const fg = ctx.createRadialGradient(CX, CY - 40, 0, CX, CY - 40, H * 0.72)
    fg.addColorStop(0, `rgba(255,255,255,${flash * 0.98})`)
    fg.addColorStop(0.28, `rgba(255,255,255,${flash * 0.72})`)
    fg.addColorStop(0.55, `rgba(255,252,248,${flash * 0.35})`)
    fg.addColorStop(0.78, 'rgba(255,255,255,0)')
    ctx.fillStyle = fg
    ctx.fillRect(0, 0, W, H)
    // lớp phủ đều khi còn peak — che “nhịp khựng”
    if (flash > 0.55) {
      ctx.save()
      ctx.globalAlpha = (flash - 0.55) * 1.6
      ctx.fillStyle = '#ffffff'
      ctx.fillRect(0, 0, W, H)
      ctx.restore()
    }
  }
  ctx.restore()
}

function sceneAfter(ctx: CanvasRenderingContext2D, cfg: Cfg, assets: Assets, lt: number, p: number, solo: boolean) {
  // Chu kỳ ánh xoẹt chéo (0→1 quét, nghỉ ~0.6) — giống v2
  const shimmerCycle = (lt * 0.38) % 1.6
  const shimmerK = shimmerCycle <= 1 ? shimmerCycle : -1

  // solo (interactive done): giữ shimmer + motion; bỏ particle rơi
  if (solo) {
    const rot = Math.sin(lt * 1.15) * 1.6
    const bob = Math.sin(lt * 1.45) * 9
    const glowK = 1 + 0.22 * Math.sin(lt * 2)
    drawBackdrop(ctx, lt)
    drawRevealed(ctx, cfg, assets, {
      spread: 1,
      whiteHot: 0,
      glowK,
      rot,
      bob,
      shimmerK,
      time: lt,
      twinkleAmp: 0.55,
    })
    return
  }

  const amp = 1 - ss(0.92, 1, p)
  const rot = Math.sin(lt * 1.15) * 1.6 * amp,
    bob = Math.sin(lt * 1.45) * 9 * amp
  const glowK = 1 + 0.3 * Math.sin(lt * 2) * amp

  drawBackdrop(ctx, lt + 7)
  for (let i = 0; i < 8; i++) {
    const k = (lt * (0.05 + R(i) * 0.05) + R(i, 1)) % 1
    dot(ctx, R(i, 2) * W, H - k * H, (4 + R(i, 3) * 4) / 2, amp * 0.5 * (1 - k) * Math.abs(Math.sin(lt * 2 + i)), P.gold)
  }
  drawRevealed(ctx, cfg, assets, { spread: 1, whiteHot: 0, glowK, rot, bob, shimmerK: amp > 0.5 ? shimmerK : -1, time: lt, twinkleAmp: amp })
}

// Dispatch theo tên scene.
export function drawScene(
  ctx: CanvasRenderingContext2D,
  name: string,
  s: { localTime: number; progress: number; dur: number },
  cfg: Cfg,
  assets: Assets,
  soloAfter: boolean,
) {
  applyTheme(cfg.theme)
  ctx.clearRect(0, 0, W, H)
  if (name === 'Chờ mở') sceneIdle(ctx, cfg, assets, s.localTime, s.progress)
  else if (name === 'Chuẩn bị mở') sceneCharge(ctx, cfg, assets, s.localTime, s.progress)
  else if (name === 'Đang mở') sceneBurst(ctx, cfg, assets, s.localTime, s.progress, s.dur)
  else if (name === 'Mê hoặc') sceneAfter(ctx, cfg, assets, s.localTime, s.progress, soloAfter)
}
