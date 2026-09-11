/**
 * 단색 테마 목록이에요.
 * 색 하나(accent)만 정하면 나머지 색은 buildPalette가 자동으로 만들어요.
 * 모든 accent는 흰 글씨를 올렸을 때 읽기 쉬운 명도(대비 4.5 이상)로 골랐어요.
 */
export type ThemeKey = 'tomato' | 'ocean' | 'forest' | 'grape' | 'blossom' | 'ink';

export type Theme = { key: ThemeKey; name: string; accent: string };

export const THEMES: Theme[] = [
  { key: 'tomato', name: '토마토', accent: '#CF431B' },
  { key: 'ocean', name: '바다', accent: '#1F62C9' },
  { key: 'forest', name: '숲', accent: '#1F7A4D' },
  { key: 'grape', name: '포도', accent: '#6D47C2' },
  { key: 'blossom', name: '벚꽃', accent: '#C93C6E' },
  { key: 'ink', name: '먹', accent: '#383838' },
];

export const DEFAULT_THEME: ThemeKey = 'tomato';

export type Palette = {
  /** 버튼, 선택된 항목 */
  accent: string;
  /** 연한 배경 위에 올리는 진한 글씨 */
  accentDeep: string;
  /** 아주 연한 배경 (홈 상단, 선택된 탭) */
  tint: string;
  /** 중간 농도 (학사일정 점, 남은 교시 테두리) */
  tintMid: string;
  /** 카드 테두리 */
  line: string;
  bg: string;
  surface: string;
  text: string;
  sub: string;
  onAccent: string;
};

type Rgb = [number, number, number];

function toRgb(hex: string): Rgb {
  const h = hex.replace('#', '');
  return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16)) as Rgb;
}

function toHex(rgb: Rgb) {
  return '#' + rgb.map((v) => Math.round(v).toString(16).padStart(2, '0')).join('').toUpperCase();
}

/** 두 색을 섞어요. t가 1에 가까울수록 b에 가까워져요. */
export function mix(a: string, b: string, t: number) {
  const x = toRgb(a);
  const y = toRgb(b);
  return toHex([0, 1, 2].map((i) => x[i] + (y[i] - x[i]) * t) as Rgb);
}

export function buildPalette(accent: string): Palette {
  return {
    accent,
    accentDeep: mix(accent, '#000000', 0.28),
    tint: mix(accent, '#FFFFFF', 0.91),
    tintMid: mix(accent, '#FFFFFF', 0.62),
    line: mix(accent, '#E4E4E4', 0.86),
    bg: '#FFFFFF',
    surface: '#FFFFFF',
    text: '#1E1E1E',
    sub: '#626262',
    onAccent: '#FFFFFF',
  };
}
