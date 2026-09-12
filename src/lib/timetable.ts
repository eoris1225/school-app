import type { Lesson } from '@/lib/api';
import { WEEKDAYS, type Weekday } from '@/data/mock';
import { applySwap, type SubjectSwaps } from '@/lib/my-settings';

/** 요일마다 교시 순서대로 늘어놓은 과목 이름. 없는 교시는 빈 자리예요. */
export type Week = Record<Weekday, string[]>;

/**
 * 서버가 준 교시 목록을 요일별로 펴요.
 *
 * 서버는 `{ date, period, subject }` 를 쭉 주는데, 화면은 "월요일 3교시"처럼
 * 요일과 교시로 찾고 싶거든요. `dates` 는 `weekDates(now)` 가 준 그 주 날짜예요.
 */
export function byWeekday(lessons: Lesson[], dates: Record<Weekday, string>): Week {
  const week = {} as Week;
  for (const day of WEEKDAYS) week[day] = [];

  // 날짜 -> 요일을 한 번만 만들어두고 찾아요.
  const dayOf = new Map<string, Weekday>();
  for (const day of WEEKDAYS) dayOf.set(dates[day], day);

  for (const lesson of lessons) {
    const day = dayOf.get(lesson.date);
    if (day) week[day][lesson.period - 1] = lesson.subject;
  }
  return week;
}

/**
 * 시간표를 내가 실제로 듣는 과목으로 바꿔요.
 *
 * byWeekday와 나눠둔 이유가 있어요. 바꾸기 전 이름(시간표에 적힌 그대로)도
 * 필요하거든요. 바꾸는 화면에서 "시간표에는 이렇게 적혀 있어요"를 보여주고,
 * 같은 이름이 나오는 다른 교시를 찾을 때도 원래 이름으로 찾아야 해요.
 */
export function withSwaps(week: Week, swaps: SubjectSwaps): Week {
  const out = {} as Week;
  for (const day of WEEKDAYS) {
    out[day] = week[day].map((subject, i) => (subject ? applySwap(day, i + 1, subject, swaps) : subject));
  }
  return out;
}

/** 그 주에서 같은 과목 이름이 나오는 다른 교시들. '화-7' 모양이에요. */
export function sameNameSlots(week: Week, day: Weekday, period: number, subject: string): string[] {
  const out: string[] = [];
  for (const d of WEEKDAYS) {
    week[d].forEach((s, i) => {
      if (s === subject && !(d === day && i + 1 === period)) out.push(`${d}-${i + 1}`);
    });
  }
  return out;
}
