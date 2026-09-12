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
  /** 홈 위쪽 컬러 밴드. 테마색과 같은 색의 다른 톤이에요. */
  band: string;
  /** band 위에 올리는 글씨 */
  onBand: string;
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

export function luminance(hex: string) {
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

/** 색을 색상·채도·밝기로 나눠요. 밝기와 채도만 건드려서 톤을 옮기려고요. */
function toHsl(hex: string): { h: number; s: number; l: number } {
  const [r, g, b] = toRgb(hex).map((v) => v / 255);
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const d = max - min;
  const l = (max + min) / 2;
  if (d === 0) return { h: 0, s: 0, l };
  const h =
    max === r ? (((g - b) / d) % 6) * 60
    : max === g ? ((b - r) / d + 2) * 60
    : ((r - g) / d + 4) * 60;
  return { h: (h + 360) % 360, s: d / (1 - Math.abs(2 * l - 1)), l };
}

function fromHsl(h: number, s: number, l: number): string {
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  const [r, g, b] =
    h < 60 ? [c, x, 0]
    : h < 120 ? [x, c, 0]
    : h < 180 ? [0, c, x]
    : h < 240 ? [0, x, c]
    : h < 300 ? [x, 0, c]
    : [c, 0, x];
  return toHex([r + m, g + m, b + m].map((v) => v * 255) as Rgb);
}

/*
 * 검정과 흰색을 안 써요.
 *
 * 순수한 검정 글씨를 색 위에 올리면 글씨만 뚝 떨어져 나와요. 화면에 있는
 * 색과 아무 관계가 없는 색이라 그래요. 인쇄나 화면 디자인에서는 오래된
 * 요령이 있어요. 글씨의 회색을 그 화면의 색에서 뽑아 쓰는 거예요.
 * 색상(hue)은 고른 색 그대로 두고 채도만 낮추고 밝기를 끝까지 내리면,
 * 거의 검정인데 그 색과 한 식구인 진한 색이 나와요.
 *
 * 주황을 고르면 글씨는 아주 진한 밤색, 파랑을 고르면 아주 진한 남색이에요.
 * 눈으로는 "검정"으로 읽히는데 화면에 얹어 놓으면 따로 놀지 않아요.
 *
 * 밝은 쪽도 같아요. 순백 대신 그 색을 아주 옅게 섞은 흰색을 써요.
 *
 * 채도를 그대로 두면 안 돼요. 진한 색은 채도가 높으면 탁해 보이고,
 * 옅은 색은 채도가 높으면 물든 티가 나요. 그래서 한계를 걸어요.
 */
function deepInk(h: number, s: number): string {
  return fromHsl(h, Math.min(s, 0.55) * 0.85, 0.1);
}

function paleInk(h: number, s: number): string {
  return fromHsl(h, Math.min(s, 0.5) * 0.5, 0.965);
}

/** 채움색 위에 올릴 글씨색. 진한 쪽과 옅은 쪽 중 더 잘 읽히는 걸 골라요. */
function inkOn(fill: string, h: number, s: number): string {
  const deep = deepInk(h, s);
  const pale = paleInk(h, s);
  return contrast(fill, deep) >= contrast(fill, pale) ? deep : pale;
}

/** 그 색 위에 글씨를 올릴 수 있는지. 둘 중 하나만 되면 돼요. */
function readable(fill: string, h: number, s: number): boolean {
  return Math.max(contrast(fill, deepInk(h, s)), contrast(fill, paleInk(h, s))) >= 4.6;
}

/**
 * 채움색과 그 위 글씨색을 함께 정해요.
 *
 * 예전에는 글씨를 흰색으로 박아두고, 흰 글씨가 읽힐 때까지 색을 어둡게
 * 눌렀어요. 그래서 노랑·라임 같은 밝은 색을 고르면 갈색이 돼버렸어요.
 * "색이 칙칙하다"는 게 이거였어요.
 *
 * 밝은 색 위에는 진한 글씨를 올리면 돼요. 그러면 색을 안 눌러도 돼요.
 * 둘 다 모자라는 아주 어중간한 밝기일 때만 색을 옮기는데, 이때도 검정이나
 * 흰색을 섞지 않고 밝기만 옮겨요. 섞으면 채도가 죽어서 흙색이 돼요.
 */
function fitFill(color: string, h: number, s: number): { fill: string; ink: string } {
  if (readable(color, h, s)) return { fill: color, ink: inkOn(color, h, s) };
  const { l } = toHsl(color);
  // 가까운 쪽부터 봐요. 적게 움직일수록 고른 색에 가까워요.
  for (let d = 0.02; d <= 0.6; d += 0.02) {
    for (const v of [l - d, l + d]) {
      if (v < 0.05 || v > 0.97) continue;
      const c = fromHsl(h, s, v);
      if (readable(c, h, s)) return { fill: c, ink: inkOn(c, h, s) };
    }
  }
  return { fill: color, ink: inkOn(color, h, s) };
}

/**
 * 홈 맨 위 색 띠.
 *
 * 밝은 화면에서는 고른 색과 거의 같아야 해요. 색을 골랐는데 메인 화면이
 * 딴 색이면 고른 보람이 없어요. 그 위에 앉는 아바타와 구분만 되면 되니까
 * 딱 그만큼만 깊게 해요. 나머지는 아바타의 얇은 테두리가 맡아요.
 *
 * 어두운 화면에서는 얘기가 달라요. 화면 절반을 채우는 색이 밝으면 어두운
 * 방에서 눈이 아파요. 그래서 밝기를 확 내리고 채도도 같이 낮춰요.
 * 같은 색인데 한참 가라앉은 톤이에요. 아바타는 원래 밝기라 저절로 떠요.
 */
function bandTone(
  accent: string,
  bg: string,
  scheme: Scheme,
  h: number,
  s: number,
): { fill: string; ink: string } {
  if (scheme === 'dark') {
    const calm = s * 0.62;
    // 바탕에서 띠로 보일 만큼만 올려요. 대부분 첫 번째에서 끝나요.
    for (let l = 0.2; l <= 0.44; l += 0.02) {
      const out = fromHsl(h, calm, l);
      if (contrast(out, bg) >= 1.5 && readable(out, h, s)) return { fill: out, ink: inkOn(out, h, s) };
    }
    return fitFill(fromHsl(h, calm, 0.28), h, s);
  }

  const { l } = toHsl(accent);
  // 아주 조금씩만 내려봐요. 구분되는 순간 멈춰요.
  for (let d = 0.02; d <= 0.6; d += 0.02) {
    for (const v of [l - d, l + d]) {
      if (v < 0.1 || v > 0.92) continue;
      const out = fromHsl(h, s, v);
      // 아바타와 구분되고, 바탕에서 띠로 보이고, 글씨가 읽히면 돼요.
      if (contrast(out, accent) >= 1.32 && contrast(out, bg) >= 1.35 && readable(out, h, s)) {
        return { fill: out, ink: inkOn(out, h, s) };
      }
    }
  }
  return fitFill(accent, h, s);
}

/**
 * 화면 전체에 고른 색을 아주 옅게 물들여요.
 *
 * 바탕과 글씨가 완전한 회색이면 색 띠만 붕 떠 보여요. 아주 조금만 섞으면
 * (눈으로는 회색으로 읽힐 만큼) 화면 전체가 한 덩어리로 묶여요.
 * 이것도 오래된 요령이에요. 다만 조금만요. 많이 섞으면 화면이 물들어 보여요.
 */
function tinted(h: number, s: number, amount: number, l: number): string {
  return fromHsl(h, Math.min(s, 0.6) * amount, l);
}

function lightPalette(base: string): Palette {
  const { h, s } = toHsl(base);
  // 바탕과 카드에 고른 색을 아주 옅게 섞어요. 회색으로 읽히는 정도만요.
  const bg = tinted(h, s, 0.1, 0.962);
  const surface = tinted(h, s, 0.04, 0.997);
  // 흰 카드 위에서 색 덩어리가 보여야 하니 최소한의 진하기는 지켜요.
  const { fill: accent, ink } = fitFill(adjustUntil(base, surface, 1.9, deepInk(h, s)), h, s);
  const tint = mix(accent, surface, 0.92);
  const band = bandTone(accent, bg, 'light', h, s);
  return {
    scheme: 'light',
    accent,
    onAccent: ink,
    accentDeep: adjustUntil(base, tint, 4.6, deepInk(h, s)),
    tint,
    tintMid: mix(accent, surface, 0.5),
    line: mix(accent, tinted(h, s, 0.08, 0.895), 0.9),
    bg,
    surface,
    raised: surface,
    band: band.fill,
    onBand: band.ink,
    shadow: deepInk(h, s),
    text: tinted(h, s, 0.18, 0.105),
    sub: tinted(h, s, 0.15, 0.4),
    sunday: '#C0473F',
    saturday: '#3C64A8',
  };
}

function darkPalette(base: string): Palette {
  const { h, s } = toHsl(base);
  const bg = tinted(h, s, 0.14, 0.055);
  const surface = tinted(h, s, 0.12, 0.112);
  // 어두운 바탕에서는 원래 색이 묻히니까 밝게 올려요.
  const { fill: accent, ink } = fitFill(adjustUntil(base, bg, 3.05, paleInk(h, s)), h, s);
  const tint = mix(accent, bg, 0.86);
  const band = bandTone(accent, bg, 'dark', h, s);
  return {
    scheme: 'dark',
    accent,
    onAccent: ink,
    accentDeep: adjustUntil(base, tint, 5, paleInk(h, s)),
    tint,
    tintMid: mix(accent, bg, 0.4),
    line: mix(accent, tinted(h, s, 0.1, 0.24), 0.84),
    bg,
    surface,
    raised: tinted(h, s, 0.1, 0.195),
    band: band.fill,
    onBand: band.ink,
    shadow: '#000000',
    text: tinted(h, s, 0.1, 0.955),
    sub: tinted(h, s, 0.1, 0.67),
    sunday: '#F59289',
    saturday: '#93B8FF',
  };
}

export function buildPalette(accent: string, scheme: Scheme): Palette {
  return scheme === 'dark' ? darkPalette(accent) : lightPalette(accent);
}
