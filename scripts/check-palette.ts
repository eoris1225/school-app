/*
 * 팔레트가 지켜야 할 것을 재요.
 *
 *   deno run --allow-read --sloppy-imports scripts/check-palette.ts
 *
 * 색은 목록에서 고르기도 하지만 색상환에서 직접 고르기도 해요. 그래서
 * "우리가 고른 여섯 색이 괜찮더라"로는 모자라요. 아무 색이나 들어와도
 * 규칙이 지켜져야 해요. 한 바퀴 돌면서 다 재봐요.
 *
 * 재는 것 세 가지예요.
 *   갈라짐   홈 맨 위 색 띠와 그 위 아바타가 구분되나 (아바타는 고른 색 그대로,
 *            띠가 한 톤 옮겨가요)
 *   글씨     띠 위에 올리는 글씨가 읽히나 (WCAG AA 4.5)
 *   바탕     띠가 화면 바탕에서 띠로 보이나
 */
import { buildPalette, contrast, luminance, THEMES, type Scheme } from '@/constants/themes';

/** 색상환을 한 바퀴 돌면서 밝기도 여러 단계로 만들어봐요. */
function wheel(): string[] {
  const out: string[] = [];
  for (let h = 0; h < 360; h += 15) {
    for (const l of [0.25, 0.45, 0.65, 0.85]) {
      const s = 0.7;
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
      const hex = (v: number) => Math.round((v + m) * 255).toString(16).padStart(2, '0');
      out.push(`#${hex(r)}${hex(g)}${hex(b)}`.toUpperCase());
    }
  }
  // 아주 밝은 색과 아주 어두운 색, 회색도 넣어요. 가장자리가 잘 깨져요.
  return [...out, '#FFFFFF', '#000000', '#111111', '#FAFAFA', '#808080'];
}

const RULES = {
  /** 띠와 아바타가 구분돼야 해요. */
  split: 1.2,
  /** 띠가 고른 색에서 너무 멀면 "딴 색"으로 보여요. (밝은 화면만) */
  nearAccent: 1.6,
  /** 띠 위 글씨 (WCAG AA) */
  bandText: 4.5,
  /** 버튼 위 글씨 */
  accentText: 4.5,
  /** 본문 글씨 */
  bodyText: 4.5,
  /** 흐린 글씨 */
  subText: 4.5,
  /** 띠가 바탕에서 띠로 보여야 해요. */
  fromBg: 1.35,
  /** 어두운 화면에서 넓은 면이 이보다 밝으면 눈이 아파요. */
  darkBandMaxLum: 0.14,
};

const bad: string[] = [];
const worst: Record<string, number> = {};
const note = (k: string, v: number) => {
  worst[k] = Math.min(worst[k] ?? 99, v);
};

for (const base of [...THEMES, ...wheel()]) {
  for (const scheme of ['light', 'dark'] as Scheme[]) {
    const p = buildPalette(base, scheme);
    const fail: string[] = [];

    const split = contrast(p.band, p.accent);
    note('갈라짐', split);
    if (split < RULES.split) fail.push(`갈라짐 ${split.toFixed(2)}`);

    if (scheme === 'light' && split > RULES.nearAccent) {
      fail.push(`띠가 고른 색에서 너무 멀어요 ${split.toFixed(2)}`);
    }

    for (const [name, on, under, min] of [
      ['띠글씨', p.onBand, p.band, RULES.bandText],
      ['버튼글씨', p.onAccent, p.accent, RULES.accentText],
      ['본문', p.text, p.bg, RULES.bodyText],
      ['본문(카드)', p.text, p.surface, RULES.bodyText],
      ['흐린글씨', p.sub, p.bg, RULES.subText],
      ['강조글씨', p.accentDeep, p.tint, 4.5],
    ] as [string, string, string, number][]) {
      const c = contrast(on, under);
      note(name, c);
      if (c < min) fail.push(`${name} ${c.toFixed(2)}`);
    }

    const fromBg = contrast(p.band, p.bg);
    note('바탕', fromBg);
    if (fromBg < RULES.fromBg) fail.push(`바탕 ${fromBg.toFixed(2)}`);

    // 어두운 화면에서 띠가 너무 밝으면 눈이 아파요.
    if (scheme === 'dark') {
      const lum = luminance(p.band);
      if (lum > RULES.darkBandMaxLum) fail.push(`어두운 화면 띠가 너무 밝아요 ${lum.toFixed(3)}`);
      /*
       * 밝은 화면 띠보다 어두워야 "다른 톤"이에요.
       *
       * 다만 고른 색이 원래 아주 어두우면 더 내려갈 데가 없어요. 그런 색은
       * 어차피 눈이 아플 일이 없으니 이미 충분히 어두우면 통과예요.
       */
      const lightBand = luminance(buildPalette(base, 'light').band);
      if (lum > Math.max(lightBand, 0.06)) {
        fail.push(`어두운 화면 띠가 밝은 화면보다 안 어두워요 ${lum.toFixed(3)}`);
      }
    }

    if (fail.length) bad.push(`${scheme} ${base} (띠 ${p.band}): ${fail.join(', ')}`);
  }
}

const tried = (THEMES.length + wheel().length) * 2;
if (bad.length) {
  console.log(`실패 ${bad.length}개 / ${tried}가지\n` + bad.join('\n'));
  Deno.exit(1);
}
console.log(
  `통과: ${tried}가지 전부. 가장 빠듯한 값\n  ` +
    Object.entries(worst)
      .map(([k, v]) => `${k} ${v.toFixed(2)}`)
      .join('\n  '),
);
