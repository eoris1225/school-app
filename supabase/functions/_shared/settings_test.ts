/**
 * 계정에 담는 설정을 읽는 규칙을 재요.
 *
 *   deno test --allow-env _shared/settings_test.ts
 *
 * 여기가 틀리면 사람이 손으로 적은 일정이 조용히 사라져요. 화면에는 그냥
 * 비어 보여서 "원래 없었나?" 싶고, 그때는 이미 늦었어요.
 */
import { assertEquals } from 'jsr:@std/assert@1';

import { readSettings } from './auth.ts';

Deno.test('내 일정: 모양이 맞는 줄만 남겨요', () => {
  const got = readSettings({
    my_events: [
      { id: 'my-1', date: '2026-09-14', title: '치과' },
      { id: 'my-2', date: '2026-09-15', title: '학원 시험' },
    ],
  });
  assertEquals(got.myEvents.length, 2);
  assertEquals(got.myEvents[1].title, '학원 시험');
});

Deno.test('내 일정: 깨진 줄 하나 때문에 나머지를 버리지 않아요', () => {
  const got = readSettings({
    my_events: [
      { id: 'my-1', date: '2026-09-14', title: '치과' },
      null,
      { id: 'my-2' },
      { id: 'my-3', date: '2026-09-16', title: '동아리' },
    ],
  });
  // 손으로 적은 걸 통째로 날리는 게 제일 나빠요. 남길 수 있는 건 남겨요.
  assertEquals(got.myEvents.map((e) => e.id), ['my-1', 'my-3']);
});

Deno.test('내 일정: 목록이 아니면 빈 표예요', () => {
  for (const raw of [undefined, null, 'x', 42, {}]) {
    assertEquals(readSettings({ my_events: raw }).myEvents, []);
  }
});

Deno.test('테마 색: 색 그 자체일 때만 써요', () => {
  assertEquals(readSettings({ accent: '#f97316' }).accent, '#f97316');
  assertEquals(readSettings({ accent: '#F97316' }).accent, '#F97316');
  // 예전에 이름으로 담던 때가 있었어요. 그건 색이 아니라 이름이에요.
  assertEquals(readSettings({ accent: '토마토' }).accent, null);
  assertEquals(readSettings({ accent: 'f97316' }).accent, null);
  assertEquals(readSettings({ accent: '#f97' }).accent, null);
  assertEquals(readSettings({ accent: null }).accent, null);
});

Deno.test('화면 밝기: 아는 셋만 써요', () => {
  assertEquals(readSettings({ scheme_pref: 'system' }).schemePref, 'system');
  assertEquals(readSettings({ scheme_pref: 'dark' }).schemePref, 'dark');
  assertEquals(readSettings({ scheme_pref: 'light' }).schemePref, 'light');
  // 안 고른 것과 이상한 값은 똑같이 null 이에요. 둘 다 "기기 것을 써라" 예요.
  assertEquals(readSettings({ scheme_pref: 'auto' }).schemePref, null);
  assertEquals(readSettings({}).schemePref, null);
});
