/**
 * Canvas card-reveal animation.
 *
 * @example
 * ```tsx
 * <CardReveal
 *   theme="dark"
 *   voucher={{
 *     brand: 'Demo Café',
 *     title: 'Free drink',
 *     value: '50.000đ',
 *     code: 'HELLO-2026',
 *     expiry: 'Valid until 31/12/2026',
 *   }}
 *   fan={{
 *     left: { text: ['For you', 'Have a lovely day'] },
 *     right: '/cover.png',
 *   }}
 *   labels={{ tapToOpen: '✦  Tap to open  ✦' }}
 *   onComplete={() => console.log('opened')}
 * />
 * ```
 */
export { CardReveal, CardRevealV5 } from './CardReveal'
export type { CardRevealProps, CardRevealV5Props, CardRevealLabels } from './CardReveal'
export type { FanSlots, VoucherInfo } from './draw'
export { getTheme, THEMES, type CardRevealTheme, type ThemePalette } from './themes'
export { FpsMeter } from './FpsMeter'
