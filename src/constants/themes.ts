/**
 * 단색 테마 목록이에요.
 * 색 하나(accent)만 정하면 나머지 색은 buildPalette가 자동으로 만들어요.
 * 밝은 화면과 어두운 화면을 모두 만들고, 글씨가 흐려 보이지 않도록
 * 대비(contrast)를 계산해서 색을 자동으로 조절해요.
 */
export type ThemeKey = 'tomato' | 'ocean' | 'forest' | 'grape' | 'blossom' | 'ink';

export type Theme = { key: ThemeKey; name: string; accent: string };

// 쨍한 원색 대신 채도를 한 단계 낮춘 색을 써요. 넓은 면에 깔려도 눈이 편해요.
export const THEMES: Theme[] = [
  { key: 'tomato', name: '토마토', accent: '#C0553C' },
  { key: 'ocean', name: '바다', accent: '#356497' },
  { key: 'forest', name: '숲', accent: '#2F7355' },
  { key: 'grape', name: '포도', accent: '#6A56A6' },
  { key: 'blossom', name: '벚꽃', accent: '#B25174' },
  { key: 'ink', name: '먹', accent: '#454750' },
];

export const DEFAULT_THEME: ThemeKey = 'tomato';

/** 실제로 화면에 적용된 밝기 */
export type Scheme = 'light' | 'dark';

/** 사용자가 고른 밝기. 'system'은 폰 설정을 따라가요. */
export type SchemePref = 'system' | Scheme;

export const DEFAULT_SCHEME_PREF: SchemePref = 'system';

export const SCHEME_OPTIONS: { value: SchemePref; label: string }[] = [
  { value: 'system', label: '시스템' },
  { value: 'light', label: '밝게' },
  { value: 'dark', label: '어둡게' },
];

export type Palette = {
  scheme: Scheme;
  /** 버튼, 선택된 항목의 채워진 색 */
  accent: string;
  /** accent 위에 올리는 글씨 */
  onAccent: string;
  /** 배경이나 tint 위에 올리는 accent 색 글씨 */
  accentDeep: string;
  /** 아주 연한 accent 배경 (홈 상단, 선택된 탭) */
  tint: string;
  /** 중간 농도 (학사일정 점, 남은 교시 테두리) */
  tintMid: string;
  /** 카드 테두리 */
  line: string;
  /** 화면 바탕 */
  bg: string;
  /** 카드 바탕 */
  surface: string;
  /** 카드보다 한 단계 더 떠 보이는 바탕 (선택된 세그먼트) */
  raised: string;
  /** 홈 위쪽 컬러 밴드 */
  band: string;
  /** 카드 그림자 색 */
  shadow: string;
  text: string;
  sub: string;
  /** 달력 일요일 / 토요일 글씨 */
  sunday: string;
  saturday: string;
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

const channel = (v: number) => {
  const s = v / 255;
  return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
};

function luminance(hex: string) {
  const [r, g, b] = toRgb(hex).map(channel);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** 두 색의 대비. 1(똑같음)부터 21(검정과 흰색)까지예요. */
export function contrast(a: string, b: string) {
  const l1 = luminance(a);
  const l2 = luminance(b);
  const [hi, lo] = l1 > l2 ? [l1, l2] : [l2, l1];
  return (hi + 0.05) / (lo + 0.05);
}

/** bg 위에서 목표 대비가 나올 때까지 color를 toward 쪽으로 조금씩 옮겨요. */
function adjustUntil(color: string, bg: string, min: number, toward: string) {
  let out = color;
  for (let t = 0.04; t <= 1 && contrast(out, bg) < min; t += 0.04) out = mix(color, toward, t);
  return out;
}

/** 흰 글씨가 또렷하게 읽히는 진하기까지 채움색을 눌러요. */
const fillForWhiteText = (color: string) => adjustUntil(color, '#FFFFFF', 4.6, '#000000');

function lightPalette(base: string): Palette {
  // 바탕은 연회색, 카드는 흰색. 이렇게 갈라 놓으면 카드가 떠 보여서 덜 밋밋해요.
  const bg = '#F4F5F7';
  const surface = '#FFFFFF';
  const accent = fillForWhiteText(adjustUntil(base, surface, 3.1, '#000000'));
  const tint = mix(accent, surface, 0.92);
  return {
    scheme: 'light',
    accent,
    onAccent: '#FFFFFF',
    accentDeep: adjustUntil(base, tint, 4.6, '#000000'),
    tint,
    tintMid: mix(accent, surface, 0.5),
    line: mix(accent, '#E3E4E8', 0.9),
    bg,
    surface,
    raised: '#FFFFFF',
    band: accent,
    shadow: '#101828',
    text: '#1B1C1F',
    sub: '#5F626B',
    sunday: '#C0473F',
    saturday: '#3C64A8',
  };
}

function darkPalette(base: string): Palette {
  const bg = '#0F0F12';
  // 어두운 바탕에서는 원래 색이 묻히니까 흰색을 섞어 밝게 올려요.
  // 너무 밝히면 위에 올린 흰 글씨가 흐려져서, 두 조건을 함께 맞춰요.
  const accent = fillForWhiteText(adjustUntil(base, bg, 3.05, '#FFFFFF'));
  const tint = mix(accent, bg, 0.86);
  return {
    scheme: 'dark',
    accent,
    onAccent: '#FFFFFF',
    accentDeep: adjustUntil(base, tint, 5, '#FFFFFF'),
    tint,
    tintMid: mix(accent, bg, 0.4),
    line: mix(accent, '#3B3B44', 0.84),
    bg,
    surface: '#1B1B21',
    raised: '#2E2E37',
    band: mix(accent, bg, 0.12),
    shadow: '#000000',
    text: '#F3F3F5',
    sub: '#A6A6AE',
    sunday: '#F59289',
    saturday: '#93B8FF',
  };
}

export function buildPalette(accent: string, scheme: Scheme): Palette {
  return scheme === 'dark' ? darkPalette(accent) : lightPalette(accent);
}
