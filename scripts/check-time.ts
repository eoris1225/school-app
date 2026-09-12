/**
 * 쪽지 시각 표시가 맞는지 확인해요.
 *
 *   deno run --allow-read scripts/check-time.ts
 *
 * 자정을 넘는 순간, 오전 12시와 오후 12시처럼 틀리기 쉬운 자리를 봐요.
 * "1시간 전" 식으로 빼서 계산하면 밤 11시 55분에 보낸 걸 새벽 0시 5분에
 * 열었을 때 "10분 전"이 되는데, 우리는 '어제'라고 적어야 맞아요.
 */

import { shortTime } from '../src/lib/time.ts';

const at = (s: string) => new Date(s);
let bad = 0;

function ok(got: string, want: string, why: string) {
  const pass = got === want;
  if (!pass) bad++;
  console.log(`  ${pass ? '통과' : '실패'}  ${why}  -> "${got}"${pass ? '' : ` (기대: "${want}")`}`);
}

const now = at('2026-09-12T15:30:00');

ok(shortTime('2026-09-12T09:05:00', now), '오전 9:05', '오늘 아침');
ok(shortTime('2026-09-12T15:20:00', now), '오후 3:20', '오늘 오후');
ok(shortTime('2026-09-12T00:05:00', now), '오전 12:05', '오늘 자정 직후 (0시는 오전 12시)');
ok(shortTime('2026-09-12T12:30:00', now), '오후 12:30', '정오 (12시는 오후 12시)');
ok(shortTime('2026-09-11T23:55:00', now), '어제', '어제 밤');
ok(shortTime('2026-09-09T10:00:00', now), '수요일', '사흘 전은 요일로');
ok(shortTime('2026-08-20T10:00:00', now), '8월 20일', '한 달 전은 날짜로');
ok(shortTime('2025-12-31T10:00:00', now), '2025. 12. 31.', '작년은 연도까지');
ok(shortTime('말도 안 되는 값', now), '', '이상한 값은 빈 글자');

// 자정을 딱 넘긴 경우. 5분 전에 보냈지만 날짜가 달라서 '어제'가 맞아요.
ok(shortTime('2026-09-11T23:55:00', at('2026-09-12T00:05:00')), '어제', '5분 전인데 날짜가 바뀐 경우');

console.log(bad ? `\n실패 ${bad}개` : '\n전부 통과');
if (bad) Deno.exit(1);
