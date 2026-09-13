/**
 * 교시 시각이 없을 때와 있을 때를 둘 다 재요.
 *
 *   deno run --allow-read --sloppy-imports scripts/check-bells.ts
 *
 * 여기가 틀리면 두 가지가 조용히 망가져요.
 *   1. 시각을 안 넣은 학교에 남의 학교 종소리가 뜨는 것 (예전에 그랬어요)
 *   2. 8교시가 있는 학교에서 8교시가 표에서 사라지는 것
 * 둘 다 화면에는 멀쩡해 보여서 눈으로는 못 잡아요.
 */

import { blankBells, checkBells, lunchSpan, readBells, tidyTime, type Bells } from '../src/lib/bells.ts';
import { schoolStatus, currentPeriod } from '../src/lib/time.ts';
import { byWeekday, rowsOf } from '../src/lib/timetable.ts';
import type { Lesson } from '../src/lib/api.ts';

const fails: string[] = [];
const ok = (c: boolean, m: string) => {
  console.log(`${c ? '  통과' : '  실패'}  ${m}`);
  if (!c) fails.push(m);
};

const p = (period: number, start: string, end: string) => ({ period, start, end });

/** 서일여고 실제 시각이에요. 컴시간 시간표에서 옮겼어요. */
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

/** 2026-09-14 는 월요일이에요. */
const at = (hhmm: string) => new Date(`2026-09-14T${hhmm}:00`);

console.log('\n=== 시각을 안 넣은 학교 ===');
{
  ok(schoolStatus(at('10:20'), null).kind === 'unknown', '평일에는 모른다고 해요');
  ok(currentPeriod(at('10:20'), null) === 0, '지금 교시는 0이에요');
  // 주말은 시각표 없이도 알 수 있어요. 날짜만 보면 되니까요.
  ok(schoolStatus(new Date('2026-09-13T10:20:00'), null).kind === 'weekend', '주말은 시각표 없이도 알아요');
  ok(lunchSpan(null) === null, '점심 시각도 없어요');
  ok(blankBells().length === 7, '처음 넣을 때는 일곱 줄을 보여줘요');
  ok(blankBells().every((r) => r.start === '' && r.end === ''), '빈 줄에 값을 미리 적어두지 않아요');
}

console.log('\n=== 서일여고 시각 ===');
{
  ok(checkBells(서일여고) === null, '규칙을 통과해요');
  ok(schoolStatus(at('08:00'), 서일여고).kind === 'before', '8시는 등교 전');
  ok(currentPeriod(at('08:30'), 서일여고) === 1, '8시 30분은 1교시');
  ok(currentPeriod(at('08:40'), 서일여고) === 1, '예전 값이었으면 여기가 1교시 시작이었어요');

  const rest = schoolStatus(at('09:05'), 서일여고);
  ok(rest.kind === 'break' && rest.next === 2, '9시 5분은 쉬는 시간, 다음은 2교시');

  const lunch = schoolStatus(at('12:30'), 서일여고);
  ok(lunch.kind === 'lunch' && lunch.next === 5, '12시 30분은 점심, 다음은 5교시');

  ok(currentPeriod(at('16:30'), 서일여고) === 8, '4시 30분은 8교시예요 (예전에는 7교시까지였어요)');
  ok(schoolStatus(at('17:00'), 서일여고).kind === 'after', '5시는 하교 후');

  const span = lunchSpan(서일여고);
  ok(span?.start === '12:00' && span?.end === '13:00', `점심은 ${span?.start}부터 ${span?.end}까지`);
}

console.log('\n=== 규칙에 걸리는 값 ===');
{
  const bad = (b: Bells, why: string) => ok(checkBells(b) !== null, why);
  bad({ periods: [], lunchAfter: 0 }, '빈 목록은 거절해요');
  bad({ periods: [p(1, '09:00', '09:50'), p(3, '10:00', '10:50')], lunchAfter: 0 }, '교시를 건너뛰면 거절해요');
  bad({ periods: [p(1, '09:50', '09:00')], lunchAfter: 0 }, '끝이 시작보다 빠르면 거절해요');
  bad(
    { periods: [p(1, '09:00', '09:50'), p(2, '09:40', '10:30')], lunchAfter: 0 },
    '앞 교시와 겹치면 거절해요',
  );
  bad({ periods: [p(1, '9:00', '09:50')], lunchAfter: 0 }, '시각 모양이 틀리면 거절해요');
  bad({ periods: [p(1, '09:00', '09:50')], lunchAfter: 2 }, '없는 교시 뒤 점심은 거절해요');
  ok(
    checkBells({ periods: [p(1, '09:00', '09:50'), p(2, '09:50', '10:40')], lunchAfter: 0 }) === null,
    '쉬는 시간 없이 딱 붙는 건 괜찮아요',
  );
}

console.log('\n=== 적은 것을 다듬기 ===');
{
  ok(tidyTime('0810') === '08:10', '0810 -> 08:10');
  ok(tidyTime('810') === '08:10', '810 -> 08:10');
  ok(tidyTime('8:10') === '08:10', '8:10 -> 08:10');
  ok(tidyTime('08:10') === '08:10', '이미 맞으면 그대로');
  ok(tidyTime('25:00') === null, '25시는 못 읽어요');
  ok(tidyTime('08') === null, '너무 짧으면 못 읽어요');
  ok(tidyTime('') === null, '빈 칸은 못 읽어요');
}

console.log('\n=== 담긴 값을 읽을 때 ===');
{
  ok(readBells(서일여고)?.periods.length === 8, '멀쩡한 값은 그대로 읽어요');
  ok(readBells({ periods: [p(1, '09:50', '09:00')], lunchAfter: 0 }) === null, '이상한 값은 안 믿어요');
  ok(readBells(null) === null, '없으면 null이에요');
}

console.log('\n=== 8교시가 사라지지 않아요 ===');
{
  const dates = { 월: '2026-09-14', 화: '2026-09-15', 수: '2026-09-16', 목: '2026-09-17', 금: '2026-09-18' };
  const lesson = (date: string, period: number, subject: string): Lesson => ({
    date,
    grade: 2,
    cls: '6',
    period,
    subject,
  });

  const week = byWeekday([lesson('2026-09-14', 8, '미적분Ⅰ')], dates);
  ok(rowsOf(week) === 8, `8교시가 있으면 여덟 줄이에요 (${rowsOf(week)}줄)`);
  ok(week['월'][7] === '미적분Ⅰ', '8교시 수업이 표에 남아 있어요');

  const small = byWeekday([lesson('2026-09-14', 3, '국어')], dates);
  ok(rowsOf(small) === 7, '적게 와도 일곱 줄은 그려요');
  ok(byWeekday([], dates)['월'].length === 7, '아무것도 안 와도 일곱 줄이에요');
  // 요일마다 길이가 다르면 표가 들쭉날쭉해져요. 한 번에 맞춰둬요.
  ok(
    Object.values(week).every((d) => d.length === 8),
    '모든 요일이 같은 줄 수예요',
  );
}

console.log(fails.length === 0 ? '\n다 통과했어요\n' : `\n${fails.length}개 실패\n`);
if (fails.length) Deno.exit(1);
