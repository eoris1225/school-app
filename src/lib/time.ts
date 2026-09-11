import { BELL, LUNCH, WEEKDAYS, type Weekday } from '@/data/mock';

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

const toMin = (hhmm: string) => {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
};

export type SchoolStatus =
  | { kind: 'weekend' }
  | { kind: 'before' }
  | { kind: 'class'; period: number }
  | { kind: 'break'; next: number }
  | { kind: 'lunch'; next: number }
  | { kind: 'after' };

/** 지금이 몇 교시인지, 쉬는 시간인지 알려줘요. */
export function schoolStatus(now: Date): SchoolStatus {
  if (!weekdayOf(now)) return { kind: 'weekend' };
  const t = now.getHours() * 60 + now.getMinutes();
  if (t < toMin(BELL[0].start)) return { kind: 'before' };
  for (let i = 0; i < BELL.length; i++) {
    const bell = BELL[i];
    if (t >= toMin(bell.start) && t < toMin(bell.end)) return { kind: 'class', period: bell.period };
    const next = BELL[i + 1];
    if (next && t >= toMin(bell.end) && t < toMin(next.start)) {
      return bell.period === LUNCH.afterPeriod
        ? { kind: 'lunch', next: next.period }
        : { kind: 'break', next: next.period };
    }
  }
  return { kind: 'after' };
}

/** 지금 진행 중인 교시 번호. 수업 중이 아니면 0 */
export function currentPeriod(now: Date) {
  const s = schoolStatus(now);
  return s.kind === 'class' ? s.period : 0;
}
