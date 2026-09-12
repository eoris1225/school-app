/**
 * 테마 색 후보를 고르는 도구예요.
 *
 *   deno run --allow-read scripts/pick-palette.ts
 *
 * buildPalette 가 대비를 맞추느라 색을 어둡게 누르는데, 많이 눌리면
 * 학생이 고른 동그라미와 실제 화면 색이 달라져요. 덜 눌리는 색을 고르려고
 * 후보마다 얼마나 움직이는지 재요.
 */
import { buildPalette, contrast } from '@/constants/themes';

const TW: Record<string, Record<string, string>> = JSON.parse(
  await Deno.readTextFile('/tmp/tw.json'),
);

const HUES = ['red','orange','amber','yellow','lime','green','emerald','teal','cyan','sky','blue','indigo','violet','purple','fuchsia','pink','rose','slate','stone'];

function dist(a: string, b: string) {
  const rgb = (h: string) => [1,3,5].map((i) => parseInt(h.slice(i, i+2), 16));
  const [x, y] = [rgb(a), rgb(b)];
  return Math.round(Math.sqrt(x.reduce((s, v, i) => s + (v - y[i]) ** 2, 0)));
}

console.log('색           단계   고른색     실제 밝은화면  차이   어두운화면 대비');
for (const h of HUES) {
  for (const shade of ['500', '600', '700']) {
    const base = TW[h]?.[shade];
    if (!base) continue;
    const L = buildPalette(base, 'light');
    const D = buildPalette(base, 'dark');
    const moved = dist(base.toUpperCase(), L.accent);
    const ok = contrast(D.accent, D.onAccent) >= 4.5;
    console.log(
      `${h.padEnd(10)} ${shade}   ${base}   ${L.accent}   ${String(moved).padStart(3)}   ${ok ? 'OK' : '모자람'}`,
    );
  }
}
