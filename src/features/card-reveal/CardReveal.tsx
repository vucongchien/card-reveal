// Card open animation — Canvas 2D + RAF (cream + coral theme).
// One RAF paints the canvas; React only re-renders on phase changes (wait/open/done).
// HTML overlay handles sharp text; canvas handles motion. Fan cards are hit-testable → zoom modal.
import { useEffect, useRef, useState, type CSSProperties, type MouseEvent, type PointerEvent } from 'react'
import { pickScene, type Playback, type Scene } from './scene-engine'
import {
  clientToDesign,
  drawCardBack,
  drawScene,
  FONT_SANS,
  hitTestReveal,
  prewarmCardLayers,
  resolveFanSlots,
  warmRevealStep,
  W,
  H,
  type Assets,
  type Cfg,
  type FanSlots,
  type RevealHit,
  type VoucherInfo,
} from './draw'
import { getTheme, type CardRevealTheme } from './themes'
import mascot from './assets/mascot.png'
import './fonts.css'

/** UI copy — override to localize or rebrand. */
export interface CardRevealLabels {
  /** Hint while waiting for tap. Default: Vietnamese. */
  tapToOpen?: string
  /** Zoom modal when ≥2 cards. */
  zoomSwipeHint?: string
  /** Zoom modal when only 1 card. */
  zoomCloseHint?: string
}

export interface CardRevealProps {
  image?: string
  text?: string[] | null
  back?: string | null
  /**
   * Side fans — omit / null = hidden.
   * left = handwritten note `{ text: string[] }`; right = image URL.
   */
  fan?: FanSlots | null
  /** Voucher on the main card — replaces the 3-line `text` face when set. */
  voucher?: VoucherInfo | null
  blade?: string
  bladeGlow?: string
  /** true = tap to open then settle; false = auto-loop all scenes. Default true. */
  clickToOpen?: boolean
  /** Locale for brand uppercase on the voucher face. Default `'vi'`. */
  brandLocale?: string
  /** `light` (kem+coral) | `dark` (Black Gold). */
  theme?: CardRevealTheme
  /** Override on-screen copy (tap hint, zoom hints). */
  labels?: CardRevealLabels
  /** Fires when the user starts the open sequence (or when auto-open begins). */
  onOpen?: () => void
  /** Fires when the reveal settles on the final “done” pose. */
  onComplete?: () => void
}

/** @deprecated Use `CardRevealProps`. */
export type CardRevealV5Props = CardRevealProps

const DEFAULT_LABELS: Required<CardRevealLabels> = {
  tapToOpen: '✦  Chạm để mở  ✦',
  zoomSwipeHint: 'Vuốt để xem thẻ khác · Chạm nền để đóng',
  zoomCloseHint: 'Chạm để đóng',
}

const DEFAULTS: Cfg = {
  image: mascot,
  text: null,
  back: null,
  fan: null,
  voucher: null,
  blade: '#fff4d6',
  bladeGlow: '#f9a825',
  clickToOpen: true,
  brandLocale: 'vi',
  theme: 'light',
}

const SCENES_LOOP: Scene[] = [
  { name: 'Chờ mở', dur: 3.2 },
  { name: 'Chuẩn bị mở', dur: 1.9 },
  { name: 'Đang mở', dur: 1.3 },
  { name: 'Mê hoặc', dur: 4.5 },
]
const SCENES_WAIT: Scene[] = [{ name: 'Chờ mở', dur: 3.2 }]
const SCENES_OPEN: Scene[] = [
  { name: 'Chuẩn bị mở', dur: 1.9 },
  { name: 'Đang mở', dur: 1.3 },
]
const SCENES_DONE: Scene[] = [{ name: 'Mê hoặc', dur: 4.5 }]

function loadImg(src: string | null): Promise<HTMLImageElement | null> {
  if (!src) return Promise.resolve(null)
  return new Promise((res) => {
    const im = new Image()
    im.onload = () => res(im)
    im.onerror = () => res(null)
    im.src = src
  })
}

type ZoomSlide = { kind: 'main' } | { kind: 'fan'; index: number }

function buildZoomSlides(cfg: Cfg): ZoomSlide[] {
  const slides: ZoomSlide[] = [{ kind: 'main' }]
  const [left, right] = resolveFanSlots(cfg.fan)
  if (left != null) slides.push({ kind: 'fan', index: 0 })
  if (right != null) slides.push({ kind: 'fan', index: 1 })
  return slides
}

function slideIndexFromHit(slides: ZoomSlide[], hit: RevealHit): number {
  const i = slides.findIndex((s) =>
    hit.kind === 'main' ? s.kind === 'main' : s.kind === 'fan' && s.index === hit.index,
  )
  return i >= 0 ? i : 0
}

function paintZoomSlide(
  ctx: CanvasRenderingContext2D,
  cfg: Cfg,
  assets: Assets,
  slide: ZoomSlide,
  cssW: number,
  cssH: number,
) {
  ctx.clearRect(0, 0, cssW, cssH)
  if (slide.kind === 'main') {
    drawCardBack(ctx, cfg, assets, cssW / 2, cssH / 2, cssW, 0.35, true, null, null)
    return
  }
  const item = resolveFanSlots(cfg.fan)[slide.index] ?? null
  const coverImg = assets.fan[slide.index] ?? null
  if (item == null) return
  drawCardBack(ctx, cfg, assets, cssW / 2, cssH / 2, cssW, 0.35, false, item, coverImg)
}

function CardZoomModal({
  cfg,
  assets,
  hit,
  labels,
  onClose,
}: {
  cfg: Cfg
  assets: Assets
  hit: RevealHit
  labels: Required<CardRevealLabels>
  onClose: () => void
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const slides = buildZoomSlides(cfg)
  const [index, setIndex] = useState(() => slideIndexFromHit(slides, hit))
  const dragRef = useRef<{ x: number; y: number; active: boolean } | null>(null)
  const justSwipedRef = useRef(false)
  const canSwipe = slides.length > 1
  const slide = slides[index] ?? slides[0]
  const ui = getTheme(cfg.theme)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || !slide) return
    const cssW = Math.min(440, window.innerWidth * 0.72)
    const cssH = cssW * 1.55
    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    canvas.width = Math.round(cssW * dpr)
    canvas.height = Math.round(cssH * dpr)
    canvas.style.width = `${cssW}px`
    canvas.style.height = `${cssH}px`
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    paintZoomSlide(ctx, cfg, assets, slide, cssW, cssH)
  }, [cfg, assets, slide])

  const go = (dir: -1 | 1) => {
    if (!canSwipe) return
    setIndex((i) => (i + dir + slides.length) % slides.length)
  }

  const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    dragRef.current = { x: e.clientX, y: e.clientY, active: true }
    e.currentTarget.setPointerCapture?.(e.pointerId)
  }

  const onPointerMove = (e: PointerEvent<HTMLDivElement>) => {
    const d = dragRef.current
    if (!d?.active || !canSwipe) return
    const dx = e.clientX - d.x
    const dy = e.clientY - d.y
    if (Math.abs(dx) > 48 && Math.abs(dx) > Math.abs(dy) * 1.2) {
      d.active = false
      justSwipedRef.current = true
      go(dx < 0 ? 1 : -1)
    }
  }

  const onPointerUp = () => {
    dragRef.current = null
  }

  return (
    <div
      onClick={(e) => {
        e.stopPropagation()
        if (justSwipedRef.current) {
          justSwipedRef.current = false
          return
        }
        onClose()
      }}
      style={{
        position: 'absolute',
        inset: 0,
        zIndex: 50,
        background: ui.uiZoomBg,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 18,
        cursor: 'pointer',
        touchAction: 'pan-y',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        style={{
          boxShadow: ui.uiZoomShadow,
          cursor: canSwipe ? 'grab' : 'default',
          touchAction: 'none',
          userSelect: 'none',
        }}
      >
        <canvas ref={canvasRef} />
      </div>

      {canSwipe && (
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }} aria-hidden>
          {slides.map((_, i) => (
            <button
              key={i}
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                setIndex(i)
              }}
              style={{
                width: i === index ? 18 : 8,
                height: 8,
                borderRadius: 99,
                border: 'none',
                padding: 0,
                background: i === index ? ui.uiDot : ui.uiDotMuted,
                cursor: 'pointer',
                transition: 'width 0.2s ease, background 0.2s ease',
              }}
            />
          ))}
        </div>
      )}

      <div
        style={{
          fontFamily: FONT_SANS,
          fontStyle: 'italic',
          fontSize: 15,
          color: ui.uiHintMuted,
          letterSpacing: 1,
          textAlign: 'center',
          pointerEvents: 'none',
        }}
      >
        {canSwipe ? labels.zoomSwipeHint : labels.zoomCloseHint}
      </div>
    </div>
  )
}

export function CardReveal(props: CardRevealProps = {}) {
  const { labels: labelsProp, onOpen, onComplete, theme: themeProp, blade, bladeGlow, ...cfgProps } = props
  const theme = themeProp ?? 'light'
  const palette = getTheme(theme)
  const cfg: Cfg = {
    ...DEFAULTS,
    ...cfgProps,
    theme,
    blade: blade ?? palette.blade,
    bladeGlow: bladeGlow ?? palette.bladeGlow,
  }
  const labels: Required<CardRevealLabels> = { ...DEFAULT_LABELS, ...labelsProp }
  const interactive = cfg.clickToOpen
  const [phase, setPhase] = useState<'wait' | 'open' | 'done'>('wait')
  const [zoomHit, setZoomHit] = useState<RevealHit | null>(null)

  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const assetsRef = useRef<Assets>({ mascot: null, back: null, fan: [] })
  const cfgRef = useRef(cfg)
  cfgRef.current = cfg
  const phaseRef = useRef(phase)
  phaseRef.current = phase
  const onOpenRef = useRef(onOpen)
  onOpenRef.current = onOpen
  const onCompleteRef = useRef(onComplete)
  onCompleteRef.current = onComplete

  useEffect(() => {
    let alive = true
    const rightSrc = typeof cfg.fan?.right === 'string' ? cfg.fan.right : null
    const fontsReady =
      typeof document !== 'undefined' && document.fonts
        ? Promise.all([
            document.fonts.load(`500 24px "Be Vietnam Pro"`),
            document.fonts.load(`600 24px "Be Vietnam Pro"`),
            document.fonts.load(`700 24px "Be Vietnam Pro"`),
            document.fonts.load(`italic 500 24px "Be Vietnam Pro"`),
            document.fonts.ready,
          ]).catch(() => undefined)
        : Promise.resolve()

    Promise.all([loadImg(cfg.image), loadImg(cfg.back), loadImg(rightSrc), fontsReady]).then((imgs) => {
      if (!alive) return
      const next: Assets = {
        mascot: imgs[0] as HTMLImageElement | null,
        back: imgs[1] as HTMLImageElement | null,
        fan: [null, imgs[2] as HTMLImageElement | null],
      }
      assetsRef.current = next
      prewarmCardLayers(cfgRef.current, next)
    })
    return () => {
      alive = false
    }
  }, [cfg.image, cfg.back, cfg.fan, cfg.voucher, cfg.text, cfg.theme])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const pick = () => {
      if (!interactive) return { scenes: SCENES_LOOP, pb: { mode: 'loop' } as Playback }
      if (phaseRef.current === 'wait') return { scenes: SCENES_WAIT, pb: { mode: 'loop' } as Playback }
      if (phaseRef.current === 'open') return { scenes: SCENES_OPEN, pb: { mode: 'times', count: 1 } as Playback }
      return { scenes: SCENES_DONE, pb: { mode: 'times', count: 1 } as Playback }
    }

    let raf = 0
    let start = 0
    let lastPhase = phaseRef.current

    const resize = () => {
      const rect = canvas.getBoundingClientRect()
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      canvas.width = Math.round(rect.width * dpr)
      canvas.height = Math.round(rect.height * dpr)
    }
    resize()
    window.addEventListener('resize', resize)

    const tick = (now: number) => {
      if (start === 0) start = now
      if (phaseRef.current !== lastPhase) {
        lastPhase = phaseRef.current
        start = now
      }
      const elapsed = (now - start) / 1000
      const { scenes, pb } = pick()
      const s = pickScene(scenes, elapsed, pb)
      const scene = scenes[s.index]

      const cw = canvas.width,
        ch = canvas.height
      const scale = Math.min(cw / W, ch / H)
      ctx.setTransform(1, 0, 0, 1, 0, 0)
      ctx.clearRect(0, 0, cw, ch)
      ctx.setTransform(scale, 0, 0, scale, (cw - W * scale) / 2, (ch - H * scale) / 2)

      const soloAfter = interactive && phaseRef.current === 'done'
      drawScene(ctx, scene.name, s, cfgRef.current, assetsRef.current, soloAfter)

      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', resize)
    }
  }, [interactive])

  const startOpen = () => {
    if (!interactive || phase !== 'wait') return
    warmRevealStep(cfgRef.current, assetsRef.current)
    warmRevealStep(cfgRef.current, assetsRef.current)
    phaseRef.current = 'open'
    setPhase('open')
    onOpenRef.current?.()
    setTimeout(() => {
      phaseRef.current = 'done'
      setPhase('done')
      onCompleteRef.current?.()
    }, 3200)
  }

  const revealClickable = interactive && phase === 'done'

  const onCanvasPointer = (clientX: number, clientY: number) => {
    const canvas = canvasRef.current
    if (!canvas || !revealClickable) return null
    const { x, y } = clientToDesign(canvas, clientX, clientY)
    return hitTestReveal(x, y)
  }

  const onCanvasClick = (e: MouseEvent<HTMLCanvasElement>) => {
    if (!revealClickable) return
    e.stopPropagation()
    const hit = onCanvasPointer(e.clientX, e.clientY)
    if (hit) setZoomHit(hit)
  }

  const onCanvasMove = (e: MouseEvent<HTMLCanvasElement>) => {
    if (!revealClickable || !canvasRef.current) return
    const hit = onCanvasPointer(e.clientX, e.clientY)
    canvasRef.current.style.cursor = hit != null ? 'pointer' : 'default'
  }

  const clickable = interactive && phase === 'wait'
  const wrap: CSSProperties = {
    position: 'absolute',
    inset: 0,
    background: 'transparent',
    cursor: clickable ? 'pointer' : 'default',
  }

  return (
    <div style={wrap} onClick={clickable ? startOpen : undefined}>
      <canvas
        ref={canvasRef}
        onClick={revealClickable ? onCanvasClick : undefined}
        onMouseMove={revealClickable ? onCanvasMove : undefined}
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', display: 'block' }}
      />
      {clickable && (
        <div
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            bottom: '18%',
            textAlign: 'center',
            fontFamily: FONT_SANS,
            fontSize: 'clamp(17px, 4.5vw, 28px)',
            fontStyle: 'italic',
            color: palette.uiHint,
            letterSpacing: 2,
            pointerEvents: 'none',
            animation: 'crv5-pulse 1.8s ease-in-out infinite',
            whiteSpace: 'pre-wrap',
          }}
        >
          {labels.tapToOpen}
        </div>
      )}
      {zoomHit != null && (
        <CardZoomModal
          cfg={cfg}
          assets={assetsRef.current}
          hit={zoomHit}
          labels={labels}
          onClose={() => setZoomHit(null)}
        />
      )}
      <style>{`@keyframes crv5-pulse{0%,100%{opacity:.45}50%{opacity:.85}}`}</style>
    </div>
  )
}

/** @deprecated Use `CardReveal`. */
export const CardRevealV5 = CardReveal
