import giftCover from '@/assets/gift-card-cover.png'
import { CardReveal } from '@/features/card-reveal'

/** Cream page + light botanical pattern (demo chrome only). */
const CREAM = '#fffcf8'
const PATTERN =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='120' viewBox='0 0 120 120'%3E%3Cg fill='none' stroke='%23d5dfd0' stroke-width='1.2'%3E%3Cpath d='M18 36c7-12 20-9 16 5-5 11-18 7-16-5z'/%3E%3Cpath d='M78 26c9-7 18 2 11 11-7 7-18 0-11-11z'/%3E%3Cpath d='M42 88c11-5 16 7 7 12-9 4-16-7-7-12z'/%3E%3Cpath d='M96 78c5-10 18-5 12 7-5 9-16 3-12-7z'/%3E%3Ccircle cx='36' cy='62' r='1.6' fill='%23d5dfd0' stroke='none'/%3E%3Ccircle cx='88' cy='48' r='1.3' fill='%23d5dfd0' stroke='none'/%3E%3Cpath d='M58 18c4-6 10-2 7 4'/%3E%3C/g%3E%3C/svg%3E\")"

export default function App() {
  return (
    <div style={{ position: 'fixed', inset: 0, background: CREAM }}>
      <div
        aria-hidden
        style={{
          position: 'absolute',
          inset: 0,
          pointerEvents: 'none',
          opacity: 0.45,
          backgroundImage: PATTERN,
          backgroundSize: '120px 120px',
        }}
      />
      <CardReveal
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
