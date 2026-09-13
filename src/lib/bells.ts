/**
 * 교시 시각표예요. "1교시는 8시 10분부터" 같은 것들이요.
 *
 * 예전에는 이 값을 코드에 박아뒀어요. 08:40 시작에 50분 수업, 7교시까지요.
 * 어디서 가져온 값이냐면, 어디서도 안 가져왔어요. 그냥 흔한 모양으로 적어둔
 * 거예요. 서일여고는 08:10 시작에 8교시까지 있어요. 전부 틀린 값이었어요.
 *
 * NEIS에는 이 정보가 없어요. 시간표 API는 학년·반·교시·과목명만 줘요.
 * 몇 시에 종이 치는지는 학교마다 다르고, 어디에도 공개돼 있지 않아요.
 *
 * 그래서 **학교 설정**으로 뺐어요. 그 학교 선생님이 한 번 넣으면 그 학교
 * 학생 전부가 써요. 아직 아무도 안 넣은 학교는 **시각을 아예 안 보여줘요.**
 * 지어낸 값을 보여주면 앱이 거짓말을 하는 거예요. 모르면 모른다고 해요.
 * (DESIGN.md "없는 정보를 그럴듯하게 지어내기" 참고)
 */

/** 한 교시. start·end는 'HH:MM' 이에요. */
export type Bell = { period: number; start: string; end: string };

export type Bells = {
  periods: Bell[];
  /**
   * 점심이 몇 교시 뒤인지. 4면 4교시와 5교시 사이예요.
   * 0이면 점심 자리를 안 그려요. 급식이 없는 학교도 있어요.
   */
  lunchAfter: number;
};

/** 시간표에 그릴 줄 수. 학교가 시각을 안 넣었어도 표는 있어야 해요. */
export const DEFAULT_ROWS = 7;

/** 교시는 열두 개까지만 받아요. 야자까지 넣겠다는 게 아니라면 그 위는 오타예요. */
export const MAX_PERIODS = 12;

export const isTime = (s: string) => /^([01]\d|2[0-3]):[0-5]\d$/.test(s);

/** 'HH:MM' -> 자정부터 몇 분인지. 시각끼리 비교하려고요. */
export const toMin = (hhmm: string) => {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
};

/** 'HH:MM' 으로 다듬어요. '8:5' 도 '08:05' 로 받아줘요. */
export function tidyTime(text: string): string | null {
  const digits = text.replace(/[^0-9]/g, '');
  // 830 은 8:30, 0830 도 8:30 이에요. 네 자리 아니면 앞에서 잘라 읽어요.
  if (digits.length !== 3 && digits.length !== 4) return null;
  const h = Number(digits.slice(0, digits.length - 2));
  const m = Number(digits.slice(-2));
  if (h > 23 || m > 59) return null;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

/**
 * 넣은 값이 말이 되는지 봐요. 괜찮으면 null, 아니면 화면에 그대로 띄울 문구예요.
 *
 * 서버와 화면이 같은 함수를 써요. 한쪽만 고치면 어긋나거든요.
 */
export function checkBells(bells: Bells): string | null {
  const { periods, lunchAfter } = bells;
  if (periods.length === 0) return '교시를 하나는 넣어주세요';
  if (periods.length > MAX_PERIODS) return `교시는 ${MAX_PERIODS}개까지예요`;

  for (let i = 0; i < periods.length; i++) {
    const p = periods[i];
    if (p.period !== i + 1) return '교시 번호가 1부터 차례대로여야 해요';
    if (!isTime(p.start) || !isTime(p.end)) return `${p.period}교시 시각을 8:10 처럼 넣어주세요`;
    if (toMin(p.end) <= toMin(p.start)) return `${p.period}교시는 끝나는 시각이 더 늦어야 해요`;
    // 앞 교시가 끝나기 전에 다음 교시가 시작할 수는 없어요. 딱 붙는 건 괜찮아요.
    if (i > 0 && toMin(p.start) < toMin(periods[i - 1].end)) {
      return `${p.period}교시가 ${periods[i - 1].period}교시보다 빨라요`;
    }
  }
  if (lunchAfter < 0 || lunchAfter > periods.length) return '점심 자리를 다시 골라주세요';
  return null;
}

/** 서버나 저장소에서 온 값을 믿지 않고 다시 봐요. 이상하면 null이에요. */
export function readBells(raw: unknown): Bells | null {
  if (!raw || typeof raw !== 'object') return null;
  const obj = raw as { periods?: unknown; lunchAfter?: unknown };
  if (!Array.isArray(obj.periods)) return null;

  const periods: Bell[] = [];
  for (const item of obj.periods) {
    if (!item || typeof item !== 'object') return null;
    const p = item as { period?: unknown; start?: unknown; end?: unknown };
    if (typeof p.period !== 'number' || typeof p.start !== 'string' || typeof p.end !== 'string') {
      return null;
    }
    periods.push({ period: p.period, start: p.start, end: p.end });
  }

  const bells: Bells = {
    periods,
    lunchAfter: typeof obj.lunchAfter === 'number' ? obj.lunchAfter : 0,
  };
  return checkBells(bells) === null ? bells : null;
}

/** 그 교시 종소리. 학교가 안 넣었거나 그 교시가 없으면 null이에요. */
export function bellAt(bells: Bells | null, period: number): Bell | null {
  return bells?.periods[period - 1] ?? null;
}

/** 'HH:MM–HH:MM'. 모르면 빈 글자예요. 빈 글자면 화면에서 자리가 사라져요. */
export function bellRange(bells: Bells | null, period: number): string {
  const b = bellAt(bells, period);
  return b ? `${b.start}–${b.end}` : '';
}

/** 점심 시각. 앞 교시가 끝나고 다음 교시가 시작할 때까지예요. */
export function lunchSpan(bells: Bells | null): { start: string; end: string } | null {
  if (!bells || bells.lunchAfter <= 0) return null;
  const before = bells.periods[bells.lunchAfter - 1];
  const after = bells.periods[bells.lunchAfter];
  if (!before || !after) return null;
  return { start: before.end, end: after.start };
}

/** 점심 줄을 몇 교시 뒤에 그릴지. 안 그리면 0이에요. */
export const lunchAfter = (bells: Bells | null) => bells?.lunchAfter ?? 0;

/** 처음 넣을 때 보여줄 빈 칸이에요. 시각은 비워둬요. 지어내면 안 되니까요. */
export function blankBells(count = DEFAULT_ROWS): { period: number; start: string; end: string }[] {
  return Array.from({ length: count }, (_, i) => ({ period: i + 1, start: '', end: '' }));
}
