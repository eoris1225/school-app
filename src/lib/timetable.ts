import type { Lesson } from '@/lib/api';
import { WEEKDAYS, type Weekday } from '@/data/mock';

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
