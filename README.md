<p align="center">
  <img src="docs/preview-light-open.png" alt="Card Reveal — Light theme opened" width="320" />
</p>

<h1 align="center">Card Reveal</h1>

<p align="center">
  <strong>Hiệu ứng mở thẻ / voucher đẹp, mượt, sẵn sàng nhúng.</strong><br />
  Canvas 2D · React · zero animation library
</p>

<p align="center">
  <img alt="React" src="https://img.shields.io/badge/React-19-61DAFB?style=flat-square&logo=react&logoColor=white" />
  <img alt="TypeScript" src="https://img.shields.io/badge/TypeScript-ready-3178C6?style=flat-square&logo=typescript&logoColor=white" />
  <img alt="Vite" src="https://img.shields.io/badge/Vite-8-646CFF?style=flat-square&logo=vite&logoColor=white" />
  <img alt="Canvas 2D" src="https://img.shields.io/badge/Canvas_2D-RAF-f76c6c?style=flat-square" />
  <img alt="License" src="https://img.shields.io/badge/License-Personal%20%2F%20Demo-lightgrey?style=flat-square" />
</p>

<p align="center">
  <a href="#-chạy-demo-30-giây"><strong>Chạy demo</strong></a>
  ·
  <a href="#-dùng-trong-app"><strong>Nhúng vào app</strong></a>
  ·
  <a href="#-api"><strong>API</strong></a>
</p>

---

## Vì sao dùng?

Gift open thường bị **giật** vì animate DOM 60fps. Card Reveal vẽ thẳng lên `<canvas>` bằng một vòng `requestAnimationFrame` — React chỉ re-render khi đổi phase (`wait` → `open` → `done`).

| | |
|---|---|
| **Mượt** | 1 RAF, không re-render mỗi frame |
| **Nhẹ** | Chỉ React + Canvas — không Framer, không GSAP |
| **Đủ dùng** | Voucher face, fan 2 bên, zoom modal, i18n labels |
| **Dễ ship** | Props rõ ràng, copy folder là chạy |

---

## Themes

| `theme` | Look |
|---------|------|
| `light` | Kem + coral (mặc định) |
| `dark` | **Black Gold** — port từ export prototype (`#e8c76a` trên nền than) |

```tsx
<CardReveal theme="dark" voucher={...} />
```

Demo có switcher Light / Dark góc trên.

---

## Trải nghiệm

1. **Chạm để mở** — idle breathing, hint pulse  
2. **Blade + bung thẻ** — quay mở → fan 2 bên  
3. **Mê hoặc** — settle, chạm thẻ để phóng to / vuốt xem thêm  

Phù hợp gift mini-app, voucher unlock, birthday surprise, onboarding “mở quà”.

---

## Chạy demo (30 giây)

```bash
npm install
npm run dev
```

Mở `http://localhost:5173` → chạm màn hình → mở thẻ → chạm thẻ để zoom.

```bash
npm run build   # production
npm test        # hit-test unit tests
```

---

## Dùng trong app

Component **fill parent** (`position: absolute; inset: 0`). Bọc full-screen (hoặc khung có kích thước):

```tsx
import { CardReveal } from '@/features/card-reveal'

export function GiftScreen() {
  return (
    <div style={{ position: 'fixed', inset: 0, background: '#fffcf8' }}>
      <CardReveal
        voucher={{
          brand: 'Demo Café',
          title: 'Free drink voucher',
          value: '50.000đ',
          code: 'HELLO-2026',
          expiry: 'Valid until 31/12/2026',
        }}
        fan={{
          left: { text: ['For you', 'Have a lovely day'] },
          right: '/your-cover.png',
        }}
        onOpen={() => console.log('opening')}
        onComplete={() => console.log('done')}
      />
    </div>
  )
}
```

Copy `src/features/card-reveal/` vào project React + Vite. Cần alias `@` → `src` (hoặc sửa đường dẫn import).

### English UI trong 1 prop

```tsx
<CardReveal
  brandLocale="en"
  labels={{
    tapToOpen: '✦  Tap to open  ✦',
    zoomSwipeHint: 'Swipe for more · Tap backdrop to close',
    zoomCloseHint: 'Tap to close',
  }}
  // ...
/>
```

---

## API

### Props

| Prop | Type | Default | |
|------|------|---------|--|
| `image` | `string` | mascot có sẵn | Ảnh mặt thẻ chính |
| `text` | `string[] \| null` | `null` | 3 dòng chữ (khi không dùng `voucher`) |
| `back` | `string \| null` | `null` | Ảnh mặt sau |
| `fan` | `FanSlots \| null` | `null` | Thẻ phụ 2 bên — omit = ẩn |
| `voucher` | `VoucherInfo \| null` | `null` | Brand / title / value / code / expiry |
| `theme` | `CardRevealTheme` | `'light'` | `light` \| `dark` |
| `blade` | `string` | theo theme | Màu lưỡi dao |
| `bladeGlow` | `string` | `#f9a825` | Glow lưỡi dao |
| `clickToOpen` | `boolean` | `true` | `false` = auto-loop |
| `brandLocale` | `string` | `'vi'` | Locale uppercase brand |
| `labels` | `CardRevealLabels` | VI | Copy UI |
| `onOpen` | `() => void` | — | Bắt đầu mở |
| `onComplete` | `() => void` | — | Settle xong |

### Types

```ts
type VoucherInfo = {
  brand: string
  title: string
  value: string
  code: string
  expiry?: string
}

type FanSlots = {
  left?: { text: string[] } | null  // thư tay ≤ 3 dòng
  right?: string | null             // URL ảnh
}
```

---

## Trong hộp

```
src/
  App.tsx                         # demo
  features/card-reveal/
    CardReveal.tsx                # UI + RAF + zoom
    draw.ts                       # Canvas paint + hit-test
    scene-engine.tsx              # timeline
    fonts.css                     # Be Vietnam Pro
    assets/mascot.png
    index.ts                      # public API
```

**Stack:** React 19 · Vite 8 · TypeScript · Canvas 2D  
**Không cần:** framer-motion, zustand, router (demo tự chạy)

Design space nội bộ `1080×1920`, scale vừa viewport. Font Be Vietnam Pro (Google Fonts) — self-host bằng cách sửa `fonts.css` nếu cần offline.

---

## License

Dùng tự do cho **cá nhân / demo**. Asset mẫu là placeholder — thay bằng brand của bạn trước khi ship production.

<p align="center">
  <br />
  <sub>Tap. Reveal. Delight.</sub>
</p>
