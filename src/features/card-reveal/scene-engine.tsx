// Scene engine tối giản cho hiệu ứng card-reveal (thay animations-v2.jsx của prototype).
// ponytail: chỉ auto-play + loop/times — không seek/scrub/export/editor-sync.
// Cần seek hoặc xuất video? Port `Stage` gốc từ card-reveal-react/animations-v2.jsx.
import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type ComponentType,
} from 'react'

// Clamp v vào [min, max].
export const clamp = (v: number, min: number, max: number) =>
  Math.max(min, Math.min(max, v))

// Chỉ các easing prototype dùng (easeOutBack, easeInOutQuad, easeInQuad, easeOutCubic).
export const Easing = {
  easeInQuad: (t: number) => t * t,
  easeInOutQuad: (t: number) => (t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t),
  easeOutCubic: (t: number) => --t * t * t + 1,
  easeOutBack: (t: number) => {
    const c1 = 1.70158,
      c3 = c1 + 1
    return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2)
  },
}

export interface Scene {
  name: string
  dur: number
}

export type Playback = { mode: 'loop' } | { mode: 'times'; count: number }

export interface SceneCtx {
  localTime: number
  progress: number
  dur: number
}

const SceneContext = createContext<SceneCtx | null>(null)

// useScene() — chỉ gọi bên trong component render qua SceneStage children map.
export function useScene(): SceneCtx {
  const ctx = useContext(SceneContext)
  if (!ctx) throw new Error('useScene phải dùng trong <SceneStage>')
  return ctx
}

// Từ thời gian đã trôi (giây) → scene active + localTime + progress.
// Hàm thuần, tách ra để test. loop = tua vòng; times/count = dừng ở scene cuối (progress kẹp 1).
export function pickScene(
  scenes: Scene[],
  elapsed: number,
  playback: Playback,
): { index: number; localTime: number; progress: number; dur: number } {
  const total = scenes.reduce((s, sc) => s + sc.dur, 0)
  const last = scenes.length - 1

  let t = elapsed
  if (playback.mode === 'loop') {
    t = total > 0 ? elapsed % total : 0
  } else if (elapsed >= total * playback.count) {
    // Hết số lần chạy → dừng ở scene cuối, KHÔNG lặp. localTime chạy tiếp
    // (breathing glow sống) nhưng progress kẹp 1 để scene coi như "đã settle".
    return { index: last, localTime: elapsed - total + scenes[last].dur, progress: 1, dur: scenes[last].dur }
  } else {
    t = total > 0 ? elapsed % total : 0
  }

  let acc = 0
  for (let i = 0; i < scenes.length; i++) {
    const d = scenes[i].dur
    if (t < acc + d || i === last) {
      const localTime = t - acc
      return { index: i, localTime, progress: d > 0 ? clamp(localTime / d, 0, 1) : 1, dur: d }
    }
    acc += d
  }
  return { index: last, localTime: 0, progress: 0, dur: scenes[last].dur }
}

const W = 1080,
  H = 1920

export interface SceneStageProps {
  width?: number
  height?: number
  bg?: string
  scenes: string // JSON string: [{name,dur}]
  playback?: string // JSON string: {mode:'loop'} | {mode:'times',count}
  children: Record<string, ComponentType>
}

export function SceneStage({
  width = W,
  height = H,
  bg = '#fdeee4',
  scenes,
  playback,
  children,
}: SceneStageProps) {
  const parsed: Scene[] = JSON.parse(scenes)
  const pb: Playback = playback ? JSON.parse(playback) : { mode: 'loop' }

  const startRef = useRef<number | null>(null)
  const [elapsed, setElapsed] = useState(0)

  useEffect(() => {
    let raf = 0
    const tick = (now: number) => {
      if (startRef.current === null) startRef.current = now
      setElapsed((now - startRef.current) / 1000)
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [])

  const { index, localTime, progress, dur } = pickScene(parsed, elapsed, pb)
  const scene = parsed[index]
  const Comp = children[scene.name]

  return (
    <div
      style={{
        position: 'relative',
        width,
        height,
        maxWidth: '100%',
        maxHeight: '100%',
        aspectRatio: `${width} / ${height}`,
        background: bg,
        overflow: 'hidden',
      }}
    >
      {/* Stage logic 1080×1920, scale vừa container theo cạnh nhỏ hơn. */}
      <div
        style={{
          position: 'absolute',
          left: '50%',
          top: '50%',
          width: W,
          height: H,
          transform: 'translate(-50%,-50%) scale(var(--cr-scale))',
        }}
        ref={(el) => {
          if (!el?.parentElement) return
          const p = el.parentElement
          const s = Math.min(p.clientWidth / W, p.clientHeight / H)
          el.style.setProperty('--cr-scale', String(s))
        }}
      >
        <SceneContext.Provider value={{ localTime, progress, dur }}>
          {Comp ? <Comp /> : null}
        </SceneContext.Provider>
      </div>
    </div>
  )
}
