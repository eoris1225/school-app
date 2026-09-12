/**
 * 단색 테마 목록이에요.
 * 색 하나(accent)만 정하면 나머지 색은 buildPalette가 자동으로 만들어요.
 * 밝은 화면과 어두운 화면을 모두 만들고, 글씨가 흐려 보이지 않도록
 * 대비(contrast)를 계산해서 색을 자동으로 조절해요.
 */
/*
 * 테마는 색 그 자체예요. '토마토' 같은 이름표를 두지 않아요.
 *
 * 이름을 붙이면 목록에 있는 색만 쓸 수 있어요. 색 자체를 담으면 아래 목록에
 * 없는 색을 직접 골라도 똑같이 다뤄져요. 커스텀 컬러도 특별 취급이 없어요.
 *
 * 쨍한 원색 대신 채도를 한 단계 낮춘 색이에요. 넓은 면에 깔려도 눈이 편해요.
 * 여섯 개면 충분해요. 더 넓게 고르고 싶으면 커스텀 컬러로 색상환을 열어요.
 */
export const THEMES = [
  '#D97757', // 주황
  '#356497', // 바다
  '#2F7355', // 숲
  '#6A56A6', // 포도
  '#B25174', // 벚꽃
  '#454750', // 먹
] as const;

export const DEFAULT_THEME = '#D97757';

/** 예전에 이름으로 저장해둔 것을 색으로 바꿔요. */
const OLD_NAMES: Record<string, string> = {
  tomato: '#D97757',
  ocean: '#356497',
  forest: '#2F7355',
  grape: '#6A56A6',
  blossom: '#B25174',
  ink: '#454750',
};

/** 저장해둔 값을 쓸 수 있는 색으로 바꿔요. 이상하면 기본색이에요. */
export function readAccent(saved: string | null | undefined): string {
  if (!saved) return DEFAULT_THEME;
  if (OLD_NAMES[saved]) return OLD_NAMES[saved];
  return /^#[0-9a-fA-F]{6}$/.test(saved) ? saved : DEFAULT_THEME;
}

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
  /** 컬러 밴드 위에 올라가는 동그라미(아바타). 밴드와 톤이 달라요. */
  avatar: string;
  /** avatar 위에 올리는 글씨 */
  onAvatar: string;
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

/** 채움색 위에 올릴 글씨색. 진한 글씨가 더 잘 읽히면 그걸 써요. */
const INK = '#17181C';

/**
 * 채움색과 그 위 글씨색을 함께 정해요.
 *
 * 예전에는 글씨를 흰색으로 박아두고, 흰 글씨가 읽힐 때까지 색을 어둡게
 * 눌렀어요. 그래서 노랑·라임 같은 밝은 색을 고르면 갈색이 돼버렸어요.
 * "색이 칙칙하다"는 게 이거였어요.
 *
 * 밝은 색 위에는 진한 글씨를 올리면 돼요. 그러면 색을 안 눌러도 돼요.
 * 흰 글씨와 진한 글씨 중 더 잘 읽히는 쪽을 골라요. 둘 다 모자라면
 * (아주 중간 밝기) 그때만 색을 눌러요.
 */
function fillAndInk(color: string): { fill: string; ink: string } {
  const white = contrast(color, '#FFFFFF');
  const dark = contrast(color, INK);
  if (dark >= 4.6 && dark >= white) return { fill: color, ink: INK };
  if (white >= 4.6) return { fill: color, ink: '#FFFFFF' };
  // 둘 다 모자라면 더 가까운 쪽으로 밀어요. 움직이는 양이 적어요.
  return dark > white
    ? { fill: adjustUntil(color, INK, 4.6, '#FFFFFF'), ink: INK }
    : { fill: adjustUntil(color, '#FFFFFF', 4.6, '#000000'), ink: '#FFFFFF' };
}

/**
 * 색 띠 위에 올릴 같은 계열의 다른 톤을 만들어요.
 *
 * 홈 맨 위 색 띠 위에 아바타가 앉는데, 둘 다 테마색이라 어디까지가
 * 아바타인지 안 보였어요. 예전에는 두꺼운 테두리로 잘라냈지만 그게 촌스러워요.
 * 색을 한 톤 옮기면 테두리 없이도 경계가 보여요. 띠가 밝으면 어둡게,
 * 어두우면 밝게 — 어느 색을 골라도 같은 계열 안에서 갈라져요.
 */
function toneOn(accent: string, band: string): { fill: string; ink: string } {
  const toward = luminance(band) > 0.22 ? INK : '#FFFFFF';
  return fillAndInk(adjustUntil(accent, band, 1.7, toward));
}

function lightPalette(base: string): Palette {
  // 바탕은 연회색, 카드는 흰색. 이렇게 갈라 놓으면 카드가 떠 보여서 덜 밋밋해요.
  const bg = '#F4F5F7';
  const surface = '#FFFFFF';
  // 흰 카드 위에서 색 덩어리가 보여야 하니 최소한의 진하기는 지켜요.
  const { fill: accent, ink } = fillAndInk(adjustUntil(base, surface, 1.9, '#000000'));
  const tint = mix(accent, surface, 0.92);
  const avatar = toneOn(accent, accent);
  return {
    scheme: 'light',
    accent,
    onAccent: ink,
    accentDeep: adjustUntil(base, tint, 4.6, '#000000'),
    tint,
    tintMid: mix(accent, surface, 0.5),
    line: mix(accent, '#E3E4E8', 0.9),
    bg,
    surface,
    raised: '#FFFFFF',
    band: accent,
    avatar: avatar.fill,
    onAvatar: avatar.ink,
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
  const { fill: accent, ink } = fillAndInk(adjustUntil(base, bg, 3.05, '#FFFFFF'));
  const tint = mix(accent, bg, 0.86);
  const band = mix(accent, bg, 0.12);
  const avatar = toneOn(accent, band);
  return {
    scheme: 'dark',
    accent,
    onAccent: ink,
    accentDeep: adjustUntil(base, tint, 5, '#FFFFFF'),
    tint,
    tintMid: mix(accent, bg, 0.4),
    line: mix(accent, '#3B3B44', 0.84),
    bg,
    surface: '#1B1B21',
    raised: '#2E2E37',
    band,
    avatar: avatar.fill,
    onAvatar: avatar.ink,
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
