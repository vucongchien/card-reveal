# Card Reveal

Hiệu ứng **mở thẻ / voucher** bằng Canvas 2D + `requestAnimationFrame` — React chỉ re-render khi đổi phase (`wait` → `open` → `done`), không vẽ lại mỗi frame.

Tách từ bản v5 trong demo internship; chỉnh API cho dễ nhúng vào app khác.

## Chạy demo

```bash
npm install
npm run dev
```

Mở URL Vite in ra (mặc định `http://localhost:5173`). Chạm màn hình để mở thẻ; sau khi mở xong, chạm thẻ để phóng to.

```bash
npm run build   # production build
npm test        # unit tests (hit-test)
```

## Dùng trong code

Component fill parent (`position: absolute; inset: 0`). Bọc trong container có kích thước (thường full-screen):

```tsx
import { CardReveal } from '@/features/card-reveal'

export function GiftScreen() {
  return (
    <div style={{ position: 'fixed', inset: 0 }}>
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

Copy folder `src/features/card-reveal/` sang project React + Vite của bạn (cần alias `@` → `src` hoặc sửa import đường dẫn).

## Props

| Prop | Type | Default | Ý nghĩa |
|------|------|---------|---------|
| `image` | `string` | mascot có sẵn | Ảnh mặt thẻ chính (mascot / gift art) |
| `text` | `string[] \| null` | `null` | Tối đa 3 dòng trên thẻ nếu **không** dùng `voucher` |
| `back` | `string \| null` | `null` | Ảnh mặt sau (tuỳ chọn) |
| `fan` | `FanSlots \| null` | `null` | Thẻ phụ 2 bên — bỏ / `null` = ẩn |
| `voucher` | `VoucherInfo \| null` | `null` | Brand / title / value / code / expiry trên thẻ chính |
| `blade` | `string` | `#fff4d6` | Màu lưỡi dao mở thẻ |
| `bladeGlow` | `string` | `#f9a825` | Glow lưỡi dao |
| `clickToOpen` | `boolean` | `true` | `true` = chạm mới mở; `false` = auto loop animation |
| `brandLocale` | `string` | `'vi'` | Locale cho `brand.toLocaleUpperCase` |
| `labels` | `CardRevealLabels` | tiếng Việt | Copy UI (hint chạm / zoom) |
| `onOpen` | `() => void` | — | Khi bắt đầu chuỗi mở |
| `onComplete` | `() => void` | — | Khi settle ở pose cuối |

### `VoucherInfo`

```ts
{
  brand: string
  title: string
  value: string
  code: string
  expiry?: string
}
```

### `FanSlots`

```ts
{
  left?: { text: string[] } | null  // thư tay, tối đa 3 dòng
  right?: string | null             // URL ảnh
}
```

### Đổi ngôn ngữ UI

```tsx
<CardReveal
  labels={{
    tapToOpen: '✦  Tap to open  ✦',
    zoomSwipeHint: 'Swipe for more · Tap backdrop to close',
    zoomCloseHint: 'Tap to close',
  }}
  brandLocale="en"
  // ...
/>
```

## Cấu trúc

```
src/
  App.tsx                      # demo page (sample data)
  features/card-reveal/
    CardReveal.tsx             # component + zoom modal
    draw.ts                    # Canvas paint + hit-test
    scene-engine.tsx           # timeline scenes
    fonts.css                  # Be Vietnam Pro (Google Fonts)
    assets/mascot.png          # ảnh mặc định
    index.ts                   # public API
  assets/gift-card-cover.png   # ảnh fan phải trong demo
```

## Ghi chú kỹ thuật

- Design space nội bộ: **1080×1920**, scale vừa canvas.
- Không phụ thuộc framer-motion / zustand — chỉ React + Canvas 2D.
- Font: Be Vietnam Pro (hỗ trợ tiếng Việt). Cần mạng lần đầu để tải Google Fonts, hoặc self-host và sửa `fonts.css`.
- `FpsMeter` vẫn export để debug; demo không bật mặc định.

## License

Dùng tự do cho mục đích cá nhân / demo. Asset mẫu trong repo là placeholder — thay bằng brand của bạn khi ship.
