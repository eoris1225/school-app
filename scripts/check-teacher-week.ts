/*
 * 선생님 시간표를 엮는 규칙을 재요.
 *
 *   deno run --allow-read --sloppy-imports scripts/check-teacher-week.ts
 *
 * 화면 없이 계산만 봐요. NEIS가 준 학교 전체 시간표에서 그 선생님 수업만
 * 골라내는 게 전부라, 여기가 맞으면 화면은 그리기만 하면 돼요.
 */
import type { Lesson } from '@/lib/api';
import { WEEKDAYS, type Weekday } from '@/data/mock';
import { clashes, teachCount, teacherWeek, type TeachSettings } from '@/lib/teacher-week';

const DATES: Record<Weekday, string> = {
  월: '2026-09-14',
  화: '2026-09-15',
  수: '2026-09-16',
  목: '2026-09-17',
  금: '2026-09-18',
};

const at = (day: Weekday, period: number, grade: number, cls: string, subject: string): Lesson => ({
  date: DATES[day],
  grade,
  cls,
  period,
  subject,
});

// 학교 전체 시간표 흉내예요. 수학 선생님 두 분이 서로 다른 반에 들어가요.
const SCHOOL: Lesson[] = [
  at('월', 1, 2, '1', '미적분Ⅰ'),
  at('월', 1, 2, '3', '확률과 통계'),
  at('월', 2, 2, '1', '공통국어2'),
  at('월', 3, 1, '5', '미적분Ⅰ'),
  at('화', 4, 2, '3', '미적분Ⅰ'),
  at('화', 4, 3, '1', '경제 수학'),
  at('수', 5, 2, '1', '영어Ⅱ'),
  at('목', 6, 2, '3', '역학과 에너지'),
  at('금', 7, 2, '1', '미적분Ⅰ'),
  // 다른 주 수업. 이 주 날짜가 아니라 안 걸려야 해요.
  { date: '2026-09-21', grade: 2, cls: '1', period: 1, subject: '미적분Ⅰ' },
];

const MATH = new Set(['수학']);
const none: TeachSettings = { classes: [], edits: {} };

const fails: string[] = [];
const ok = (c: boolean, m: string) => {
  console.log(`${c ? '  통과' : '  실패'}  ${m}`);
  if (!c) fails.push(m);
};

const show = (week: ReturnType<typeof teacherWeek>) =>
  WEEKDAYS.map((d) => `${d}:${week[d].map((c) => `${c.period}${c.cls ?? '직접'}${c.subject}`).join(',')}`)
    .join(' | ');

console.log('\n=== 반을 안 좁히면 그 과목 수업이 다 걸려요 ===');
{
  const week = teacherWeek(SCHOOL, DATES, MATH, none);
  console.log('  ' + show(week));
  ok(teachCount(week) === 6, `수학 교과군 여섯 칸 (${teachCount(week)}개)`);
  ok(
    week.월.some((c) => c.subject === '확률과 통계'),
    '확률과 통계도 수학으로 걸림 (과목 이름이 아니라 교과군으로 봐요)',
  );
  ok(
    week.화.some((c) => c.subject === '경제 수학'),
    '경제 수학도 걸림',
  );
  ok(!week.월.some((c) => c.subject === '공통국어2'), '국어는 안 걸림');
  ok(!week.수.some((c) => c.subject === '영어Ⅱ'), '영어도 안 걸림');
  // 월 1교시(2-1 미적분 / 2-3 확률과 통계)와 화 4교시(2-3 미적분 / 3-1 경제 수학)요.
  // 선생님은 한 번에 한 반에만 들어가니 이건 "아직 반을 안 좁혔다"는 신호예요.
  ok(clashes(week) === 2, `같은 교시에 두 반이 걸린 곳이 두 군데 (${clashes(week)}군데)`);
}

console.log('\n=== 다른 주 수업은 안 걸려요 ===');
{
  const week = teacherWeek(SCHOOL, DATES, MATH, none);
  const cells = WEEKDAYS.flatMap((d) => week[d]);
  ok(cells.length === 6, `이 주 것만 여섯 칸 (${cells.length}개)`);
}

console.log('\n=== 반을 좁히면 그 반만 남아요 ===');
{
  const week = teacherWeek(SCHOOL, DATES, MATH, { classes: ['2-1', '1-5'], edits: {} });
  console.log('  ' + show(week));
  ok(teachCount(week) === 3, `2-1과 1-5 것만 세 칸 (${teachCount(week)}개)`);
  ok(!week.월.some((c) => c.cls === '2-3'), '안 고른 반은 빠짐');
  ok(clashes(week) === 0, '좁히면 겹침이 사라짐');
}

console.log('\n=== 칸을 비울 수 있어요 ===');
{
  const week = teacherWeek(SCHOOL, DATES, MATH, { classes: ['2-1'], edits: { '월-1': '' } });
  console.log('  ' + show(week));
  ok(week.월.length === 0, `월 1교시가 비워짐 (${week.월.length}개)`);
  ok(teachCount(week) === 1, `나머지는 그대로 (금 7교시만, ${teachCount(week)}개)`);
}

console.log('\n=== 칸을 직접 채울 수 있어요 ===');
{
  const week = teacherWeek(SCHOOL, DATES, MATH, {
    classes: ['2-1'],
    edits: { '수-3': '2-6 선택B 역학과 에너지' },
  });
  console.log('  ' + show(week));
  const added = week.수.find((c) => c.period === 3);
  ok(!!added && added.added && added.cls === null, '직접 넣은 칸이 생기고 표시가 붙음');
  ok(added?.subject === '2-6 선택B 역학과 에너지', '적은 내용이 그대로 들어감');
}

console.log('\n=== 직접 채우면 원래 있던 건 밀려나요 ===');
{
  // NEIS가 틀렸을 때 고치는 자리예요. 섞으면 뭐가 맞는지 알 수 없어요.
  const week = teacherWeek(SCHOOL, DATES, MATH, { classes: [], edits: { '월-1': '2-1 선택C' } });
  ok(week.월.filter((c) => c.period === 1).length === 1, '그 칸에는 하나만 남음');
  ok(week.월.find((c) => c.period === 1)?.added === true, '남은 것은 직접 넣은 것');
}

console.log('\n=== 담당 과목이 없으면 아무것도 안 나와요 ===');
{
  const week = teacherWeek(SCHOOL, DATES, new Set(), none);
  ok(teachCount(week) === 0, `빈 표 (${teachCount(week)}개)`);
}

console.log('\n=== 두 교과군을 맡으면 둘 다 나와요 ===');
{
  const week = teacherWeek(SCHOOL, DATES, new Set(['수학', '영어']), none);
  ok(teachCount(week) === 7, `수학 여섯 + 영어 하나 (${teachCount(week)}개)`);
  ok(week.수.some((c) => c.subject === '영어Ⅱ'), '영어도 걸림');
}

console.log('\n=== 이상한 열쇠는 무시해요 ===');
{
  const week = teacherWeek(SCHOOL, DATES, MATH, {
    classes: [],
    edits: { 'bad-1': '엉뚱', '월-x': '엉뚱', '일-3': '주말' },
  });
  ok(teachCount(week) === 6, `원래대로 여섯 칸 (${teachCount(week)}개)`);
}

console.log(fails.length ? `\n실패 ${fails.length}개\n` + fails.join('\n') : '\n전부 통과');
if (fails.length) Deno.exit(1);
