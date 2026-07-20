// TẠM để đo hiệu năng — xoá sau khi chẩn đoán xong lag.
import { useEffect, useState } from 'react'

export function FpsMeter() {
  const [fps, setFps] = useState(0)
  const [low, setLow] = useState(0)

  useEffect(() => {
    let raf = 0
    let last = performance.now()
    let frames = 0
    let acc = 0
    let worstDelta = 0

    const tick = (now: number) => {
      const delta = now - last
      last = now
      frames++
      acc += delta
      if (delta > worstDelta) worstDelta = delta
      if (acc >= 500) {
        setFps(Math.round((frames * 1000) / acc))
        setLow(Math.round(1000 / worstDelta))
        frames = 0
        acc = 0
        worstDelta = 0
      }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [])

  const color = fps >= 55 ? '#6f6' : fps >= 45 ? '#fd0' : '#f66'
  return (
    <div
      style={{
        position: 'fixed',
        top: 8,
        left: 8,
        zIndex: 9999,
        fontFamily: 'monospace',
        fontSize: 13,
        lineHeight: 1.4,
        padding: '6px 10px',
        borderRadius: 8,
        background: 'rgba(0,0,0,0.7)',
        color,
        pointerEvents: 'none',
        whiteSpace: 'pre',
      }}
    >
      {`FPS ${fps}\nmin ${low}`}
    </div>
  )
}
