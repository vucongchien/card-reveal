import { useState } from 'react'
import giftCover from '@/assets/gift-card-cover.png'
import { CardReveal, getTheme, type CardRevealTheme } from '@/features/card-reveal'

const THEME_OPTS: { id: CardRevealTheme; label: string }[] = [
  { id: 'light', label: 'Light' },
  { id: 'dark', label: 'Dark' },
]

export default function App() {
  const [theme, setTheme] = useState<CardRevealTheme>('light')
  const palette = getTheme(theme)

  return (
    <div style={{ position: 'fixed', inset: 0, background: palette.pageBg }}>
      <div
        aria-hidden
        style={{
          position: 'absolute',
          inset: 0,
          pointerEvents: 'none',
          opacity: theme === 'light' ? 0.45 : 0,
          backgroundImage: palette.pagePattern,
          backgroundSize: '120px 120px',
        }}
      />

      <div
        style={{
          position: 'absolute',
          top: 16,
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 20,
          display: 'flex',
          gap: 8,
          padding: 6,
          borderRadius: 999,
          background: theme === 'light' ? 'rgba(255,255,255,0.75)' : 'rgba(0,0,0,0.45)',
          backdropFilter: 'blur(8px)',
          boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
        }}
      >
        {THEME_OPTS.map((t) => {
          const active = theme === t.id
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setTheme(t.id)}
              style={{
                border: 'none',
                cursor: 'pointer',
                padding: '8px 14px',
                borderRadius: 999,
                fontFamily: "'Be Vietnam Pro', system-ui, sans-serif",
                fontSize: 13,
                fontWeight: 600,
                letterSpacing: 0.4,
                color: active ? (theme === 'dark' ? '#0c0a0f' : '#fff') : palette.uiHintMuted,
                background: active ? palette.uiDot : 'transparent',
              }}
            >
              {t.label}
            </button>
          )
        })}
      </div>

      <CardReveal
        key={theme}
        theme={theme}
        voucher={{
          brand: 'Demo Café',
          title: 'Free drink voucher',
          value: '50.000đ',
          code: 'HELLO-2026',
          expiry: 'Valid until 31/12/2026',
        }}
        fan={{
          left: { text: ['For you', 'Have a lovely day', '— Card Reveal'] },
          right: giftCover,
        }}
      />
    </div>
  )
}
