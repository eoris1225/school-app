/**
 * 학교마다 다른 교시 시각을 담고 꺼내요.
 *
 * NEIS에는 이 정보가 없어요. 시간표 API는 학년·반·교시·과목명만 주고,
 * 몇 시에 종이 치는지는 어디에도 공개돼 있지 않아요. 그래서 그 학교
 * 선생님이 한 번 넣으면 그 학교 학생 전부가 그 값을 써요.
 *
 * 검사하는 규칙은 앱의 src/lib/bells.ts 와 똑같아야 해요. 두 벌을 두는 게
 * 마음에 안 들지만, 함수는 supabase/functions 밖을 못 가져와요. 대신
 * bells_test.ts 가 두 벌을 나란히 돌려서 답이 같은지 봐요. 어긋나면 거기서
 * 걸려요.
 */

const URL_BASE = Deno.env.get('SUPABASE_URL');
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

export type Bell = { period: number; start: string; end: string };
export type Bells = { periods: Bell[]; lunchAfter: number };

export const MAX_PERIODS = 12;

export class BellsError extends Error {
  constructor(message: string, readonly status = 0) {
    super(message);
  }
}

const isTime = (s: string) => /^([01]\d|2[0-3]):[0-5]\d$/.test(s);

const toMin = (hhmm: string) => {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
};

/** 말이 되는 값인지 봐요. 괜찮으면 null, 아니면 화면에 그대로 띄울 문구예요. */
export function checkBells(bells: Bells): string | null {
  const { periods, lunchAfter } = bells;
  if (periods.length === 0) return '교시를 하나는 넣어주세요';
  if (periods.length > MAX_PERIODS) return `교시는 ${MAX_PERIODS}개까지예요`;

  for (let i = 0; i < periods.length; i++) {
    const p = periods[i];
    if (p.period !== i + 1) return '교시 번호가 1부터 차례대로여야 해요';
    if (!isTime(p.start) || !isTime(p.end)) return `${p.period}교시 시각을 8:10 처럼 넣어주세요`;
    if (toMin(p.end) <= toMin(p.start)) return `${p.period}교시는 끝나는 시각이 더 늦어야 해요`;
    if (i > 0 && toMin(p.start) < toMin(periods[i - 1].end)) {
      return `${p.period}교시가 ${periods[i - 1].period}교시보다 빨라요`;
    }
  }
  if (lunchAfter < 0 || lunchAfter > periods.length) return '점심 자리를 다시 골라주세요';
  return null;
}

/**
 * 모양만 봐요. 규칙은 안 봐요. 모양이 아니면 null이에요.
 *
 * 규칙 검사와 나눠둔 이유가 있어요. 규칙에 걸렸을 때는 "3교시가 2교시보다
 * 빨라요" 처럼 왜 안 되는지 알려줘야 하거든요. 한 함수로 묶어서 null만
 * 돌려주면 그 문구가 사라져요.
 */
export function shapeBells(raw: unknown): Bells | null {
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

  return { periods, lunchAfter: typeof obj.lunchAfter === 'number' ? obj.lunchAfter : 0 };
}

/** 모양도 규칙도 맞을 때만 돌려줘요. 담아둔 값을 읽을 때 써요. */
export function readBells(raw: unknown): Bells | null {
  const shape = shapeBells(raw);
  return shape && checkBells(shape) === null ? shape : null;
}

function table(path: string): string {
  if (!URL_BASE || !SERVICE_KEY) throw new BellsError('데이터베이스 설정이 없어요');
  return `${URL_BASE}/rest/v1/school_bells${path}`;
}

const headers = () => ({
  apikey: SERVICE_KEY!,
  authorization: `Bearer ${SERVICE_KEY}`,
  'content-type': 'application/json',
});

type Row = { periods: unknown; lunch_after: number };

/** 그 학교 시각표. 아직 아무도 안 넣었으면 null이에요. */
export async function loadBells(school: { office: string; code: string }): Promise<Bells | null> {
  const q = new URLSearchParams({
    office: `eq.${school.office}`,
    school: `eq.${school.code}`,
    select: 'periods,lunch_after',
    limit: '1',
  });
  const res = await fetch(table(`?${q}`), { headers: headers() });
  if (!res.ok) throw new BellsError(`교시 시각을 읽지 못했어요 (${res.status})`, res.status);

  const rows = (await res.json()) as Row[];
  if (rows.length === 0) return null;
  // 표에 담긴 것도 다시 봐요. 예전 모양이 남아 있을 수 있어요.
  return readBells({ periods: rows[0].periods, lunchAfter: rows[0].lunch_after });
}

/** 넣거나 덮어써요. 그 학교 선생님인지는 부르는 쪽이 이미 봤어요. */
export async function storeBells(
  school: { office: string; code: string },
  bells: Bells,
  by: { id: string; name: string },
): Promise<Bells> {
  const res = await fetch(table('?on_conflict=office,school'), {
    method: 'POST',
    headers: { ...headers(), prefer: 'resolution=merge-duplicates,return=minimal' },
    body: JSON.stringify({
      office: school.office,
      school: school.code,
      periods: bells.periods,
      lunch_after: bells.lunchAfter,
      updated_by: by.id,
      updated_by_name: by.name,
      updated_at: new Date().toISOString(),
    }),
  });
  if (!res.ok) throw new BellsError(`교시 시각을 담지 못했어요 (${res.status})`, res.status);
  return bells;
}
