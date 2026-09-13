import { WEEKDAYS, type Weekday } from '@/data/mock';
import { toMin, type Bells } from '@/lib/bells';

export const DOW = ['일', '월', '화', '수', '목', '금', '토'];

const pad = (n: number) => String(n).padStart(2, '0');

export const toYmd = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

export function fromYmd(s: string) {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export const addDays = (d: Date, n: number) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);

export function weekdayOf(d: Date): Weekday | null {
  const w = d.getDay();
  return w >= 1 && w <= 5 ? WEEKDAYS[w - 1] : null;
}

/** 9월 10일 목요일 */
export const formatDay = (d: Date) => `${d.getMonth() + 1}월 ${d.getDate()}일 ${DOW[d.getDay()]}요일`;

/** 오늘이면 '오늘', 미래면 'D-3', 지났으면 '지남' */
export function dday(ymd: string, now: Date) {
  const diff = Math.round((fromYmd(ymd).getTime() - fromYmd(toYmd(now)).getTime()) / 86400000);
  if (diff === 0) return '오늘';
  return diff > 0 ? `D-${diff}` : '지남';
}

export type SchoolStatus =
  | { kind: 'weekend' }
  /** 학교가 교시 시각을 안 넣었어요. 지금이 몇 교시인지 알 길이 없어요. */
  | { kind: 'unknown' }
  | { kind: 'before' }
  | { kind: 'class'; period: number }
  | { kind: 'break'; next: number }
  | { kind: 'lunch'; next: number }
  | { kind: 'after' };

/**
 * 지금이 몇 교시인지, 쉬는 시간인지 알려줘요.
 *
 * 교시 시각은 학교가 넣어둔 것만 써요. 안 넣었으면 'unknown' 이에요.
 * 흔한 값으로 때려맞히면 "지금 3교시" 라고 우기는 앱이 돼요. 그 학교는
 * 그때가 4교시일 수도 있고요. 모를 때는 모른다고 하는 게 맞아요.
 */
export function schoolStatus(now: Date, bells: Bells | null): SchoolStatus {
  if (!weekdayOf(now)) return { kind: 'weekend' };
  if (!bells || bells.periods.length === 0) return { kind: 'unknown' };

  const t = now.getHours() * 60 + now.getMinutes();
  const periods = bells.periods;
  if (t < toMin(periods[0].start)) return { kind: 'before' };

  for (let i = 0; i < periods.length; i++) {
    const bell = periods[i];
    if (t >= toMin(bell.start) && t < toMin(bell.end)) return { kind: 'class', period: bell.period };
    const next = periods[i + 1];
    if (next && t >= toMin(bell.end) && t < toMin(next.start)) {
      return bell.period === bells.lunchAfter
        ? { kind: 'lunch', next: next.period }
        : { kind: 'break', next: next.period };
    }
  }
  return { kind: 'after' };
}

/** 지금 진행 중인 교시 번호. 수업 중이 아니거나 모르면 0 */
export function currentPeriod(now: Date, bells: Bells | null) {
  const s = schoolStatus(now, bells);
  return s.kind === 'class' ? s.period : 0;
}

/**
 * 그 주 월요일을 찾아요. 주말이면 다음 주 월요일이에요.
 * 토요일에 앱을 열면 지난 주가 아니라 다가올 한 주를 보고 싶을 테니까요.
 */
export function mondayOf(d: Date): Date {
  const w = d.getDay(); // 0=일 ... 6=토
  const shift = w === 0 ? 1 : w === 6 ? 2 : 1 - w;
  return addDays(d, shift);
}

/** 그 주 월~금 날짜예요. { 월: '2026-09-07', ... } */
export function weekDates(now: Date): Record<Weekday, string> {
  const mon = mondayOf(now);
  const out = {} as Record<Weekday, string>;
  WEEKDAYS.forEach((day, i) => {
    out[day] = toYmd(addDays(mon, i));
  });
  return out;
}

/**
 * 쪽지가 언제 왔는지 짧게 적어요.
 *
 * 서버는 "2026-09-12T05:30:00Z" 처럼 보내요. 그대로 보여주면 아무도
 * 안 읽어요. 오늘 온 건 시각만, 어제면 '어제', 그 전이면 날짜로 적어요.
 * 카톡이나 문자가 하는 방식이에요.
 */
export function shortTime(iso: string, now = new Date()): string {
  const t = new Date(iso);
  if (Number.isNaN(t.getTime())) return '';

  const day = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const days = Math.round((day(now) - day(t)) / 86400000);

  if (days === 0) {
    const h = t.getHours();
    const ampm = h < 12 ? '오전' : '오후';
    const h12 = h % 12 === 0 ? 12 : h % 12;
    return `${ampm} ${h12}:${pad(t.getMinutes())}`;
  }
  if (days === 1) return '어제';
  if (days < 7) return `${DOW[t.getDay()]}요일`;
  if (t.getFullYear() === now.getFullYear()) return `${t.getMonth() + 1}월 ${t.getDate()}일`;
  return `${t.getFullYear()}. ${t.getMonth() + 1}. ${t.getDate()}.`;
}
