/**
 * 앱과 서버의 교시 시각 규칙이 같은지 봐요.
 *
 *   deno test supabase/functions/_shared/bells_test.ts
 *
 * 규칙이 두 벌 있어요. 함수는 supabase/functions 밖을 가져올 수 없어서요.
 * 두 벌이 있으면 언젠가 한쪽만 고쳐져요. 그러면 앱은 받아주는데 서버는
 * 거절하거나(사용자는 이유를 모름), 반대로 앱이 막아둔 값이 서버에 들어가요.
 * 그래서 같은 값을 둘 다에 넣어보고 답이 같은지 여기서 봐요.
 */
import { assertEquals } from 'jsr:@std/assert@1';

import { checkBells as server, shapeBells } from './bells.ts';
import { checkBells as app, readBells, type Bells } from '../../../src/lib/bells.ts';

const p = (period: number, start: string, end: string) => ({ period, start, end });

const 서일여고: Bells = {
  periods: [
    p(1, '08:10', '09:00'),
    p(2, '09:10', '10:00'),
    p(3, '10:10', '11:00'),
    p(4, '11:10', '12:00'),
    p(5, '13:00', '13:50'),
    p(6, '14:00', '14:50'),
    p(7, '15:10', '16:00'),
    p(8, '16:00', '16:50'),
  ],
  lunchAfter: 4,
};

const cases: { name: string; bells: Bells }[] = [
  { name: '서일여고 실제 시각', bells: 서일여고 },
  { name: '점심 없음', bells: { periods: [p(1, '09:00', '09:50')], lunchAfter: 0 } },
  { name: '빈 목록', bells: { periods: [], lunchAfter: 0 } },
  { name: '교시 번호가 건너뜀', bells: { periods: [p(1, '09:00', '09:50'), p(3, '10:00', '10:50')], lunchAfter: 0 } },
  { name: '시각 모양이 틀림', bells: { periods: [p(1, '9:00', '09:50')], lunchAfter: 0 } },
  { name: '25시', bells: { periods: [p(1, '25:00', '25:50')], lunchAfter: 0 } },
  { name: '끝이 시작보다 빠름', bells: { periods: [p(1, '09:50', '09:00')], lunchAfter: 0 } },
  { name: '끝과 시작이 같음', bells: { periods: [p(1, '09:00', '09:00')], lunchAfter: 0 } },
  { name: '앞 교시와 겹침', bells: { periods: [p(1, '09:00', '09:50'), p(2, '09:40', '10:30')], lunchAfter: 0 } },
  { name: '딱 붙음', bells: { periods: [p(1, '09:00', '09:50'), p(2, '09:50', '10:40')], lunchAfter: 0 } },
  { name: '점심이 마지막 교시 뒤', bells: { periods: [p(1, '09:00', '09:50')], lunchAfter: 1 } },
  { name: '점심이 없는 교시 뒤', bells: { periods: [p(1, '09:00', '09:50')], lunchAfter: 2 } },
  { name: '점심이 음수', bells: { periods: [p(1, '09:00', '09:50')], lunchAfter: -1 } },
  {
    name: '교시가 열세 개',
    bells: {
      periods: Array.from({ length: 13 }, (_, i) => p(i + 1, '00:00', '00:01')),
      lunchAfter: 0,
    },
  },
];

Deno.test('앱과 서버가 같은 답을 내요', () => {
  for (const c of cases) {
    assertEquals(app(c.bells), server(c.bells), c.name);
  }
});

Deno.test('서일여고 시각은 통과해요', () => {
  assertEquals(app(서일여고), null);
  assertEquals(server(서일여고), null);
});

Deno.test('모양이 아닌 것은 걸러내요', () => {
  const junk = [null, 42, 'hi', {}, { periods: 'x' }, { periods: [1] }, { periods: [{ period: '1' }] }];
  for (const raw of junk) {
    assertEquals(shapeBells(raw), null, JSON.stringify(raw));
    assertEquals(readBells(raw), null, JSON.stringify(raw));
  }
});

Deno.test('규칙에 걸린 값은 담긴 것을 읽을 때 null이에요', () => {
  // 표에 예전 모양이 남아 있어도 화면이 이상한 시각을 믿지 않게요.
  assertEquals(readBells({ periods: [p(1, '09:50', '09:00')], lunchAfter: 0 }), null);
  assertEquals(readBells(서일여고)?.periods.length, 8);
});
