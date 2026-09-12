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
import { buildPalette, contrast, THEMES, type Scheme } from '@/constants/themes';

const MIN_SPLIT = 1.45;
const MIN_TEXT = 4.5;
const MIN_BG = 1.35;

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

const bad: string[] = [];
let worst = { split: 99, text: 99, bg: 99 };

for (const base of [...THEMES, ...wheel()]) {
  for (const scheme of ['light', 'dark'] as Scheme[]) {
    const p = buildPalette(base, scheme);
    const split = contrast(p.band, p.accent);
    const text = contrast(p.band, p.onBand);
    const bg = contrast(p.band, p.bg);
    worst = {
      split: Math.min(worst.split, split),
      text: Math.min(worst.text, text),
      bg: Math.min(worst.bg, bg),
    };
    if (split < MIN_SPLIT || text < MIN_TEXT || bg < MIN_BG) {
      bad.push(
        `${scheme} ${base}: 갈라짐 ${split.toFixed(2)} 글씨 ${text.toFixed(2)} 바탕 ${bg.toFixed(2)}` +
          ` (띠 ${p.band}, 아바타 ${p.accent})`,
      );
    }
  }
}

const tried = (THEMES.length + wheel().length) * 2;
if (bad.length) {
  console.log(`실패 ${bad.length}개 / ${tried}가지\n` + bad.join('\n'));
  Deno.exit(1);
}
console.log(
  `통과: ${tried}가지 전부. 가장 빠듯한 값은 ` +
    `갈라짐 ${worst.split.toFixed(2)}, 글씨 ${worst.text.toFixed(2)}, 바탕 ${worst.bg.toFixed(2)}`,
);
