import type { Lesson } from '@/lib/api';
import { WEEKDAYS, type Weekday } from '@/data/mock';
import { DEFAULT_ROWS } from '@/lib/bells';
import { applySwap, type SubjectSwaps } from '@/lib/my-settings';

/**
 * 요일마다 교시 순서대로 늘어놓은 과목 이름. 수업이 없는 교시는 null이에요.
 *
 * null 로 채워두는 게 중요해요. 예전에는 그 자리를 아예 비워뒀는데, 그러면
 * 구멍 뚫린 배열이 돼요. 자바스크립트의 map 과 forEach 는 구멍을 건너뛰어요.
 * 그래서 "5교시가 비었어요" 를 그리려고 해도 그 자리에 아예 안 들러요.
 * 조용히 지나가서 찾기도 어려웠어요.
 */
export type Week = Record<Weekday, (string | null)[]>;

/**
 * 서버가 준 교시 목록을 요일별로 펴요.
 *
 * 서버는 `{ date, period, subject }` 를 쭉 주는데, 화면은 "월요일 3교시"처럼
 * 요일과 교시로 찾고 싶거든요. `dates` 는 `weekDates(now)` 가 준 그 주 날짜예요.
 */
export function byWeekday(lessons: Lesson[], dates: Record<Weekday, string>): Week {
  /*
   * 줄 수는 시간표가 정해요.
   *
   * 예전에는 교시 시각표 길이(7)를 썼어요. 그 값은 그냥 박아둔 거라 8교시가
   * 있는 학교에서는 8교시가 조용히 사라졌어요. 몇 교시까지 있는지는 받아온
   * 시간표가 이미 알고 있으니 거기서 세요.
   *
   * 아무것도 안 왔을 때만 7줄로 둬요. 빈 표라도 모양은 있어야 하니까요.
   */
  const slots = lessons.reduce((max, l) => Math.max(max, l.period), DEFAULT_ROWS);

  const week = {} as Week;
  // 교시 수만큼 null 로 채워둬요. 구멍을 남기지 않으려고요.
  for (const day of WEEKDAYS) week[day] = Array.from({ length: slots }, () => null);

  // 날짜 -> 요일을 한 번만 만들어두고 찾아요.
  const dayOf = new Map<string, Weekday>();
  for (const day of WEEKDAYS) dayOf.set(dates[day], day);

  for (const lesson of lessons) {
    const day = dayOf.get(lesson.date);
    if (!day) continue;
    week[day][lesson.period - 1] = lesson.subject;
  }
  return week;
}

/** 표에 그릴 줄 수예요. 요일마다 길이가 같아서 하나만 봐도 돼요. */
export const rowsOf = (week: Week) => week['월'].length;

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
export function sameNameSlots(
  week: Week,
  day: Weekday,
  period: number,
  subject: string | null,
): string[] {
  // 빈 교시끼리는 "같은 이름"이 아니에요. null 을 넘기면 아무것도 안 걸려요.
  if (!subject) return [];
  const out: string[] = [];
  for (const d of WEEKDAYS) {
    week[d].forEach((s, i) => {
      if (s === subject && !(d === day && i + 1 === period)) out.push(`${d}-${i + 1}`);
    });
  }
  return out;
}
