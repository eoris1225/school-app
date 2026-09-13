import { WEEKDAYS, type Weekday } from '@/data/mock';
import type { Lesson } from '@/lib/api';
import { slotKey } from '@/lib/my-settings';
import { readSubject, subjectGroup, TEACHABLE } from '@/lib/subject';

/*
 * 선생님 시간표를 만들어요.
 *
 * NEIS 시간표에는 담당 교사 칸이 아예 없어요. "허유미 선생님 시간표 주세요"가
 * 성립하지 않아요. 그래서 학교 전체 시간표를 받아와서 그 선생님이 맡은
 * 교과군에 해당하는 칸만 골라내요. 지어내는 게 아니라 NEIS에 있는 걸 다시
 * 엮는 거예요.
 *
 * 어떤 칸이 내 것인지는 **내 정보에서 고른 과목 이름**으로 봐요.
 *
 * 그 목록은 우리가 지어낸 게 아니라 그 학교 시간표에 실제로 있는 이름을
 * NEIS에서 받아온 거예요('미적분Ⅰ', '역학과 에너지'처럼요). 그래서 시간표에
 * 적힌 이름과 그대로 맞아떨어져요.
 *
 * 이름을 못 고른 계정만 교과군으로 봐요. 과목 목록을 못 받아온 학교이거나
 * 예전에 교과군으로만 골라둔 경우예요. 이때는 수학 선생님에게 수학 교과군
 * 수업이 전부 걸려요. 넓지만 아무것도 안 나오는 것보다 나아요.
 *
 * 못 맞히는 게 둘 있어요. 솔직하게 적어둬요.
 *   1. 같은 과목을 여러 선생님이 맡으면 누가 어느 반인지 NEIS가 안 알려줘요.
 *      미적분 선생님이 세 분이면 세 분 수업이 다 걸려요. 그래서 들어가는
 *      반을 좁힐 수 있게 해요 (classes). 안 좁혀도 쓸 수는 있어요.
 *   2. 선택과목 블록은 NEIS가 대표 과목 하나만 적어요. 회의나 보강은 애초에
 *      NEIS에 없어요. 그래서 칸을 직접 고칠 수 있게 해요 (edits).
 */

/** 시간표 한 칸에 들어가는 수업 하나 */
export type TeachCell = {
  period: number;
  /** '2-3'. 직접 넣은 칸은 반을 모를 수 있어서 null이에요. */
  cls: string | null;
  subject: string;
  /** 내가 손으로 넣은 칸인지. 화면에서 표시해줘요. */
  added: boolean;
};

export type TeachWeek = Record<Weekday, TeachCell[]>;

export type TeachSettings = { classes: string[]; edits: Record<string, string> };

/**
 * 무엇을 내 수업으로 볼지예요.
 *
 * `names` 가 하나라도 있으면 그것만 봐요. 비어 있을 때만 `groups` 를 봐요.
 * 둘을 같이 보면 과목을 콕 집어 골라둔 뜻이 없어져요. '미적분'만 골랐는데
 * 수학 교과군이 통째로 걸리면 고른 보람이 없잖아요.
 */
export type TeachSubjects = {
  /** 내 정보에서 고른 과목 이름. NEIS 시간표에 있는 이름 그대로예요. */
  names: string[];
  /** 이름을 못 고른 계정을 위한 교과군 */
  groups: Set<string>;
};

/**
 * 계정에 담긴 값을 무엇으로 볼지로 바꿔요.
 *
 * 보통 `teaches` 에는 '미적분Ⅰ' 처럼 NEIS에 있는 이름이 들어 있어요. 고를 때
 * 그 학교 시간표에서 받아온 목록에서 고르거든요.
 *
 * 그런데 과목 목록을 못 받아온 학교에서는 교과군 열두 개로 고르게 해요.
 * 그러면 `teaches` 에 '수학'이 들어가요. 그걸 과목 이름으로 찾으면 '수학'
 * 이라는 이름의 과목이 없어서 표가 텅 비어요. 그래서 교과군 이름은 이름에서
 * 빼고 교과군으로 보내요.
 */
export function mineFrom(teaches: string[], subjects: string[]): TeachSubjects {
  const groupNames: readonly string[] = TEACHABLE;
  return {
    names: teaches.filter((t) => !groupNames.includes(t)),
    groups: new Set(subjects.map((s) => subjectGroup(s))),
  };
}

/**
 * 손으로 적은 칸에서 앞에 붙은 반을 떼어내요.
 *
 * '2-6 선택B 역학과 에너지' 라고 적으면 반은 2-6, 과목은 나머지로 봐요.
 * 안 떼면 표에 '직접'이라고만 떠서, 정작 몇 반인지 적어놨는데도 안 보여요.
 */
export function splitClass(text: string): { cls: string | null; subject: string } {
  const m = /^(\d{1,2}-\S{1,4})\s+(.+)$/.exec(text.trim());
  return m ? { cls: m[1], subject: m[2].trim() } : { cls: null, subject: text.trim() };
}

const empty = (): TeachWeek => {
  const out = {} as TeachWeek;
  for (const day of WEEKDAYS) out[day] = [];
  return out;
};

/**
 * 학교 전체 시간표에서 내 수업만 뽑아요.
 *
 * `dates`는 weekDates(now)가 준 그 주 월~금 날짜예요.
 */
export function teacherWeek(
  lessons: Lesson[],
  dates: Record<Weekday, string>,
  mine: TeachSubjects,
  settings: TeachSettings,
): TeachWeek {
  const week = empty();

  // 날짜 -> 요일을 한 번만 만들어두고 찾아요.
  const dayOf = new Map<string, Weekday>();
  for (const day of WEEKDAYS) dayOf.set(dates[day], day);

  const only = new Set(settings.classes);
  const names = new Set(mine.names);

  for (const l of lessons) {
    const day = dayOf.get(l.date);
    if (!day) continue;
    const cls = `${l.grade}-${l.cls}`;
    // 반을 좁혀뒀으면 그 반만 봐요. 비워뒀으면 전체예요.
    if (only.size > 0 && !only.has(cls)) continue;
    // 고른 과목 이름으로 봐요. 이름을 못 고른 계정만 교과군으로 봐요.
    // readSubject 를 쓰는 건 '[보강]' 딱지를 떼려고요. 고를 때도 뗀 이름이라
    // 그래야 보강 수업도 내 수업으로 걸려요.
    const read = readSubject(l.subject);
    const ok = names.size > 0 ? names.has(read.name) : mine.groups.has(read.group);
    if (!ok) continue;
    week[day].push({ period: l.period, cls, subject: l.subject, added: false });
  }

  /*
   * 직접 고친 칸을 얹어요.
   *
   * 빈 글자면 그 칸을 비워요 ("내 수업 아님"). 글자가 있으면 그 칸을 통째로
   * 그 내용으로 바꿔요. NEIS가 틀렸거나 아예 없는 걸 메우는 자리라, 원래
   * 있던 것과 섞지 않고 사람이 적은 것만 남겨요.
   */
  for (const [key, value] of Object.entries(settings.edits)) {
    const [day, raw] = key.split('-');
    const period = Number(raw);
    if (!WEEKDAYS.includes(day as Weekday) || !Number.isInteger(period)) continue;
    const d = day as Weekday;
    week[d] = week[d].filter((c) => c.period !== period);
    if (value.trim()) {
      const { cls, subject } = splitClass(value);
      week[d].push({ period, cls, subject, added: true });
    }
  }

  for (const day of WEEKDAYS) {
    week[day].sort(
      (a, b) => a.period - b.period || (a.cls ?? '').localeCompare(b.cls ?? '', 'ko', { numeric: true }),
    );
  }
  return week;
}

/** 그 요일 그 교시에 있는 내 수업들 */
export const cellsAt = (week: TeachWeek, day: Weekday, period: number) =>
  week[day].filter((c) => c.period === period);

/** 이 칸을 직접 고쳐뒀는지 */
export const isEdited = (settings: TeachSettings, day: Weekday, period: number) =>
  settings.edits[slotKey(day, period)] !== undefined;

/** 한 주에 내가 들어가는 수업이 몇 개인지 */
export const teachCount = (week: TeachWeek) =>
  WEEKDAYS.reduce((sum, day) => sum + week[day].length, 0);

/**
 * 같은 교시에 두 반 이상이 걸린 칸들.
 *
 * 선생님은 한 번에 한 반에만 들어가요. 그러니 이건 "같은 과목 선생님이 여러
 * 분인데 아직 반을 안 좁혔다"는 신호예요. 화면에서 알려줘야 해요.
 */
export function clashes(week: TeachWeek): number {
  let n = 0;
  for (const day of WEEKDAYS) {
    const byPeriod = new Map<number, number>();
    for (const c of week[day]) byPeriod.set(c.period, (byPeriod.get(c.period) ?? 0) + 1);
    for (const count of byPeriod.values()) if (count > 1) n++;
  }
  return n;
}
