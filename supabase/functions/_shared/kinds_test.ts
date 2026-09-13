/*
 * 경로 목록이 실제 경로와 같은지 재요.
 *
 *   deno test --allow-read _shared/kinds_test.ts
 *
 * "없는 kind예요" 라고 답할 때 쓰는 목록이 손으로 적은 거라 어긋나기 쉬워요.
 * 실제로 열일곱 개 중 아홉 개만 적힌 채로 한참 있었어요. 있는 걸 없다고
 * 답하면 문제를 찾는 사람이 엉뚱한 데를 뒤져요.
 *
 * index.ts 를 불러오지 않고 글로만 읽어요. 불러오면 딸려오는 파일들이
 * 환경변수를 찾아서, 검사 하나 돌리려고 서버 설정이 필요해져요.
 */
import { assertEquals } from 'jsr:@std/assert@1';

const src = await Deno.readTextFile(new URL('../neis/index.ts', import.meta.url));

/** switch (kind) 아래의 case 들. 파일 안의 다른 switch 와 안 섞이게 잘라서 봐요. */
function casesInSwitch(): string[] {
  const from = src.indexOf('switch (kind)');
  const to = src.indexOf('export const KINDS');
  if (from < 0 || to < 0) throw new Error('switch 나 KINDS 를 못 찾았어요');
  return [...src.slice(from, to).matchAll(/case '([a-z-]+)':/g)].map((m) => m[1]);
}

/** 적어둔 목록 */
function listed(): string[] {
  const block = src.match(/export const KINDS = \[([\s\S]*?)\] as const;/);
  if (!block) throw new Error('KINDS 목록을 못 찾았어요');
  return [...block[1].matchAll(/'([a-z-]+)'/g)].map((m) => m[1]);
}

Deno.test('적어둔 경로 목록이 실제 switch 와 같아요', () => {
  assertEquals(listed().sort(), casesInSwitch().sort());
});

Deno.test('목록에 같은 것이 두 번 없어요', () => {
  const all = listed();
  assertEquals(all.length, new Set(all).size);
});
