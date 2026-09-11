import { assertEquals } from '@std/assert';
import { parseDish, parsePairs, splitLines, toIso, toKcal, toYmd } from './neis.ts';

Deno.test('날짜 바꾸기', () => {
  assertEquals(toIso('20260911'), '2026-09-11');
  assertEquals(toYmd('2026-09-11'), '20260911');
  assertEquals(toYmd('20260911'), '20260911');
});

Deno.test('열량은 반올림한 정수', () => {
  assertEquals(toKcal('875.5 Kcal'), 876);
  assertEquals(toKcal('501.0'), 501);
  assertEquals(toKcal(''), null);
  assertEquals(toKcal(undefined), null);
});

Deno.test('<br/>로 줄 나누기', () => {
  assertEquals(splitLines('가<br/>나<BR>다'), ['가', '나', '다']);
  assertEquals(splitLines('가<br />  나 '), ['가', '나']);
  assertEquals(splitLines(''), []);
  assertEquals(splitLines(undefined), []);
});

Deno.test('메뉴에서 알레르기 번호 떼어내기', () => {
  assertEquals(parseDish('카레라이스 (2.5.6.10.12.13.16.18)'), {
    name: '카레라이스',
    allergy: [2, 5, 6, 10, 12, 13, 16, 18],
  });
  // 번호가 없는 메뉴
  assertEquals(parseDish('배추겉절이'), { name: '배추겉절이', allergy: [] });
  // 이름에 괄호가 들어간 메뉴 (안쪽 괄호는 이름의 일부)
  assertEquals(parseDish('문어가심쿵햄*케첩(햄구이) (1.2.5)'), {
    name: '문어가심쿵햄*케첩(햄구이)',
    allergy: [1, 2, 5],
  });
  // 괄호 안이 숫자가 아니면 이름으로 둬요
  assertEquals(parseDish('카프리썬(오렌지)'), { name: '카프리썬(오렌지)', allergy: [] });
  // 범위 밖 번호는 버려요 (알레르기는 1~19)
  assertEquals(parseDish('무언가 (0.5.99)'), { name: '무언가', allergy: [5] });
  // 이름 끝의 별표는 털어내요
  assertEquals(parseDish('미니우동* (1.2)'), { name: '미니우동', allergy: [1, 2] });
  // 이름 앞의 점도 털어내요 (NEIS에 실제로 이렇게 들어 있어요)
  assertEquals(parseDish('.토마토스파게티 (1.2.5)'), {
    name: '토마토스파게티',
    allergy: [1, 2, 5],
  });
  assertEquals(parseDish('.실파계란국'), { name: '실파계란국', allergy: [] });
  // 가운데 별표는 뜻이 있으니 남겨요
  assertEquals(parseDish('고메함박스테이크*데미소스 (1.5)'), {
    name: '고메함박스테이크*데미소스',
    allergy: [1, 5],
  });
});

Deno.test('원산지·영양 쌍 나누기', () => {
  assertEquals(parsePairs('쇠고기(종류) : 국내산(한우)<br/>쌀 : 국내산'), [
    { item: '쇠고기(종류)', from: '국내산(한우)' },
    { item: '쌀', from: '국내산' },
  ]);
  // 값이 빈 줄은 버려요 ("비고 : " 같은 것)
  assertEquals(parsePairs('비고 : <br/>쌀 : 국내산'), [{ item: '쌀', from: '국내산' }]);
  assertEquals(parsePairs(undefined), []);
});
