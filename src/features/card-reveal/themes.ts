/** Preset: `light` (kem+coral) | `dark` (Black Gold — port từ export card-reveal.jsx). */

export type CardRevealTheme = 'light' | 'dark'

export type ThemePalette = {
  id: CardRevealTheme
  accent: string
  gold: string
  accentRgb: string
  goldRgb: string
  glowRgb: string
  faceTop: string
  faceBot: string
  backTop: string
  backBot: string
  borderSoft: string
  /** Viền trong thẻ lưng (export: rgba(190,180,210,0.22)). */
  innerBorderSoft: string
  photoPad: string
  cornerDot: string
  starMuted: string
  title: string
  brand: string
  code: string
  expiry: string
  textMid: string
  moon0: string
  moon1: string
  moonShadow: string
  raysBright: string
  raysSoft: string
  ribbon: string
  ribbonGrad0: string
  ribbonGrad1: string
  ribbonStroke: string
  faceGlow0: string
  faceGlow1: string
  codeBg: string
  codeStroke: string
  ornament: string
  ornamentGem0: string
  ornamentGem1: string
  blade: string
  bladeGlow: string
  uiHint: string
  uiHintMuted: string
  uiDot: string
  uiDotMuted: string
  uiZoomBg: string
  uiZoomShadow: string
  pageBg: string
  pagePattern: string
  canvasBackdrop: boolean
  backdrop0: string
  backdrop1: string
  backdrop2: string
  backdropAura: number
  vignette: string
  groundShadow: string
  haloStroke: string
}

const NONE_PATTERN =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='120'%3E%3C/svg%3E\")"

const LIGHT_PATTERN =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='120' viewBox='0 0 120 120'%3E%3Cg fill='none' stroke='%23d5dfd0' stroke-width='1.2'%3E%3Cpath d='M18 36c7-12 20-9 16 5-5 11-18 7-16-5z'/%3E%3Cpath d='M78 26c9-7 18 2 11 11-7 7-18 0-11-11z'/%3E%3Cpath d='M42 88c11-5 16 7 7 12-9 4-16-7-7-12z'/%3E%3Cpath d='M96 78c5-10 18-5 12 7-5 9-16 3-12-7z'/%3E%3Ccircle cx='36' cy='62' r='1.6' fill='%23d5dfd0' stroke='none'/%3E%3Ccircle cx='88' cy='48' r='1.3' fill='%23d5dfd0' stroke='none'/%3E%3Cpath d='M58 18c4-6 10-2 7 4'/%3E%3C/g%3E%3C/svg%3E\")"

export const THEMES: Record<CardRevealTheme, ThemePalette> = {
  light: {
    id: 'light',
    accent: '#f76c6c',
    gold: '#f9a825',
    accentRgb: '247,108,108',
    goldRgb: '249,168,37',
    glowRgb: '240,210,125',
    faceTop: '#ffffff',
    faceBot: '#fff8f2',
    backTop: '#fffdfb',
    backBot: '#fff5ee',
    borderSoft: '#f0cfc8',
    innerBorderSoft: 'rgba(247,108,108,0.22)',
    photoPad: '#fff8f2',
    cornerDot: '#ffffff',
    starMuted: '#e8e4d8',
    title: '#5c5668',
    brand: '#9a8f9c',
    code: '#4a4455',
    expiry: '#b0a6ae',
    textMid: '#6e6880',
    moon0: '#fff8f0',
    moon1: '#ffd5ce',
    moonShadow: 'rgba(240,238,228,0.45)',
    raysBright: 'rgba(255,200,150,0.28)',
    raysSoft: 'rgba(255,180,160,0.12)',
    ribbon: '#ffc4ba',
    ribbonGrad0: '#ffd9d2',
    ribbonGrad1: '#ffc4ba',
    ribbonStroke: 'rgba(247,108,108,0.28)',
    faceGlow0: 'rgba(255,250,238,0.85)',
    faceGlow1: 'rgba(255,240,205,0.5)',
    codeBg: 'rgba(247,108,108,0.08)',
    codeStroke: 'rgba(247,108,108,0.35)',
    ornament: '#f0a830',
    ornamentGem0: '#fff0c0',
    ornamentGem1: '#f9a825',
    blade: '#fff4d6',
    bladeGlow: '#f9a825',
    uiHint: '#f76c6c',
    uiHintMuted: '#b8a9a0',
    uiDot: '#f76c6c',
    uiDotMuted: 'rgba(184,169,160,0.55)',
    uiZoomBg: 'rgba(255,252,248,0.92)',
    uiZoomShadow: '0 24px 64px rgba(247,108,108,0.28)',
    pageBg: '#fffcf8',
    pagePattern: LIGHT_PATTERN,
    canvasBackdrop: false,
    backdrop0: '#fffcf8',
    backdrop1: '#fffcf8',
    backdrop2: '#fffcf8',
    backdropAura: 0,
    vignette: 'rgba(5,4,8,0)',
    groundShadow: 'rgba(60,40,55,0.45)',
    haloStroke: 'rgba(249,168,37,0.7)',
  },

  /**
   * Dark = Black Gold (export/card-reveal.jsx).
   * gold #e8c76a · nền #262130→#0c0a0f · thẻ #221d17/#201e28 · moon bạc · ribbon than
   */
  dark: {
    id: 'dark',
    accent: '#e8c76a',
    gold: '#e8c76a',
    accentRgb: '232,199,106',
    goldRgb: '232,199,106',
    glowRgb: '240,210,125',
    faceTop: '#221d17',
    faceBot: '#16131c',
    backTop: '#201e28',
    backBot: '#141218',
    borderSoft: '#39364a',
    innerBorderSoft: 'rgba(190,180,210,0.22)',
    photoPad: '#141218',
    cornerDot: '#0a090c',
    starMuted: '#e8e4d8',
    title: '#ece5d4',
    brand: '#b7ad97',
    code: '#f4ecd8',
    expiry: '#8d8577',
    textMid: '#ece5d4',
    // Moon lưng thẻ — bạc (export Moon gold=false)
    moon0: '#f2efe6',
    moon1: '#b9b4a6',
    moonShadow: 'rgba(240,238,228,0.45)',
    raysBright: 'rgba(255,244,214,0.30)',
    raysSoft: 'rgba(230,225,240,0.10)',
    ribbon: '#0e0c11',
    ribbonGrad0: '#2c2735',
    ribbonGrad1: '#16131c',
    ribbonStroke: 'rgba(232,199,106,0.16)',
    faceGlow0: 'rgba(255,250,238,0.85)',
    faceGlow1: 'rgba(255,240,205,0.5)',
    codeBg: 'rgba(232,199,106,0.12)',
    codeStroke: 'rgba(232,199,106,0.4)',
    ornament: '#f0d27d',
    ornamentGem0: '#fff0c0',
    ornamentGem1: '#d9a93f',
    blade: '#ffffff',
    bladeGlow: '#fff6dc',
    uiHint: '#e9e2d2',
    uiHintMuted: '#8d8577',
    uiDot: '#e8c76a',
    uiDotMuted: 'rgba(109,101,79,0.55)',
    uiZoomBg: 'rgba(12,10,15,0.92)',
    uiZoomShadow: '0 24px 64px rgba(232,199,106,0.2)',
    pageBg: '#0c0a0f',
    pagePattern: NONE_PATTERN,
    canvasBackdrop: true,
    backdrop0: '#262130',
    backdrop1: '#17141c',
    backdrop2: '#0c0a0f',
    backdropAura: 0.4,
    vignette: 'rgba(5,4,8,0.75)',
    groundShadow: 'rgba(0,0,0,0.7)',
    haloStroke: 'rgba(244,230,190,0.8)',
  },
}

export let P: ThemePalette = THEMES.light

export function applyTheme(theme: CardRevealTheme | undefined) {
  P = THEMES[theme ?? 'light'] ?? THEMES.light
}

export function getTheme(theme: CardRevealTheme | undefined): ThemePalette {
  return THEMES[theme ?? 'light'] ?? THEMES.light
}
