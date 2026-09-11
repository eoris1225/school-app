/**
 * 앱과 NEIS 사이에 서는 함수예요.
 *
 * 왜 필요하냐면, 앱에 NEIS 인증키를 넣으면 앱을 받은 사람 누구나 키를 꺼내 볼 수
 * 있어요. 웹으로 내보내면 더 쉽고요. 그래서 키는 이 함수만 알고 있고,
 * 앱은 키 없이 이 함수를 불러요.
 *
 *   앱  ->  이 함수(키 있음)  ->  NEIS
 *
 * 부르는 법
 *   GET ?kind=meal&from=2026-09-07&to=2026-09-11
 *   GET ?kind=timetable&grade=2&class=3&from=2026-09-07&to=2026-09-11
 *   GET ?kind=schedule&from=2026-09-01&to=2026-09-30
 *   GET ?kind=classes
 *   GET ?kind=school&name=서일여자고등학교
 */

import {
  fetchClasses,
  fetchEvents,
  fetchLessons,
  fetchMeals,
  findSchool,
  NeisError,
  type School,
} from '../_shared/neis.ts';

/**
 * 앱이 학교를 안 알려줬을 때 쓰는 기본 학교예요. 시범운영 학교인 서일여고예요.
 * 보통은 앱이 office/school 을 같이 보내니까 이 값은 잘 안 쓰여요.
 */
const FALLBACK: School = {
  office: Deno.env.get('NEIS_OFFICE_CODE') ?? 'G10',
  code: Deno.env.get('NEIS_SCHOOL_CODE') ?? '7430062',
};

/**
 * 어느 학교를 물어보는지 읽어요.
 *
 *   office  시도교육청코드. 'G10'(대전) 처럼 영문 한 글자 + 숫자 두 자리
 *   school  표준학교코드. 숫자 일곱 자리
 *
 * 둘 다 학교 검색(?kind=school)으로 찾은 값을 그대로 보내면 돼요.
 * 모양이 안 맞으면 NEIS까지 보내지 않고 여기서 막아요.
 */
function readSchool(q: URLSearchParams): School {
  const office = q.get('office');
  const code = q.get('school');
  if (!office && !code) return FALLBACK;

  if (!office || !/^[A-Z]\d{2}$/.test(office)) {
    throw new BadRequest(`office는 'G10' 모양이어야 해요 (받은 값: ${office})`);
  }
  if (!code || !/^\d{7}$/.test(code)) {
    throw new BadRequest(`school은 숫자 일곱 자리여야 해요 (받은 값: ${code})`);
  }
  return { office, code };
}

const KEY = Deno.env.get('NEIS_API_KEY');

const CORS = {
  'access-control-allow-origin': '*',
  'access-control-allow-headers': 'authorization, x-client-info, apikey, content-type',
  'access-control-allow-methods': 'GET, OPTIONS',
};

/**
 * 급식과 시간표는 하루에 몇 번 바뀌지 않아요. 10분 동안은 받아둔 걸 그대로 쓰고,
 * 그 뒤 1시간은 새로 받아오는 동안 옛 값이라도 먼저 보여줘요.
 * NEIS 호출량도 아끼고 화면도 빨라져요.
 */
const CACHE = 'public, max-age=600, stale-while-revalidate=3600';

/** 학교 검색 결과를 한 번에 보내는 최대 개수 */
const SCHOOL_LIMIT = 30;

function json(body: unknown, status = 200, cache = false) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...CORS,
      'content-type': 'application/json; charset=utf-8',
      ...(cache ? { 'cache-control': CACHE } : {}),
    },
  });
}

/** 날짜는 2026-09-11 또는 20260911 만 받아요. 이상한 값은 NEIS까지 보내지 않아요. */
function readDate(v: string | null, field: string): string {
  if (!v) throw new BadRequest(`${field}가 필요해요`);
  if (!/^\d{4}-?\d{2}-?\d{2}$/.test(v)) {
    throw new BadRequest(`${field}는 2026-09-11 모양이어야 해요 (받은 값: ${v})`);
  }
  return v;
}

function readInt(v: string | null, field: string, min: number, max: number): number {
  const n = Number(v);
  if (!Number.isInteger(n) || n < min || n > max) {
    throw new BadRequest(`${field}는 ${min}~${max} 사이 숫자여야 해요 (받은 값: ${v})`);
  }
  return n;
}

class BadRequest extends Error {}

/** "2026-09-11" 이든 "20260911" 이든 Date로 바꿔요. */
function asDate(v: string): Date {
  const ymd = v.replace(/-/g, '');
  return new Date(`${ymd.slice(0, 4)}-${ymd.slice(4, 6)}-${ymd.slice(6, 8)}T00:00:00Z`);
}

/** 기간이 거꾸로거나 너무 길면 NEIS까지 보내지 않고 여기서 막아요. */
function checkRange(from: string, to: string) {
  const a = asDate(from);
  const b = asDate(to);
  if (Number.isNaN(a.valueOf()) || Number.isNaN(b.valueOf())) {
    throw new BadRequest('날짜를 읽을 수 없어요');
  }
  if (b < a) throw new BadRequest('to가 from보다 빨라요');
  if ((b.valueOf() - a.valueOf()) / 86400000 > 200) {
    throw new BadRequest('한 번에 200일까지만 받을 수 있어요');
  }
}

async function handle(url: URL): Promise<Response> {
  const q = url.searchParams;
  const kind = q.get('kind');
  // 학교 검색만 빼고 전부 "어느 학교"가 필요해요.
  const school = kind === 'school' ? FALLBACK : readSchool(q);

  switch (kind) {
    case 'meal': {
      const from = readDate(q.get('from'), 'from');
      const to = readDate(q.get('to') ?? q.get('from'), 'to');
      checkRange(from, to);
      return json({ meals: await fetchMeals(school, from, to, KEY) }, 200, true);
    }

    case 'timetable': {
      const from = readDate(q.get('from'), 'from');
      const to = readDate(q.get('to') ?? q.get('from'), 'to');
      checkRange(from, to);
      const grade = readInt(q.get('grade'), 'grade', 1, 6);
      const cls = q.get('class');
      if (!cls) throw new BadRequest('class가 필요해요');
      const year = readInt(q.get('year') ?? String(new Date().getFullYear()), 'year', 2000, 2100);
      const term = readInt(q.get('term') ?? '0', 'term', 0, 2) || termOf(from);
      const lessons = await fetchLessons(
        school,
        { year, term, grade, cls, from, to },
        KEY,
      );
      return json({ lessons }, 200, true);
    }

    case 'schedule': {
      const from = readDate(q.get('from'), 'from');
      const to = readDate(q.get('to') ?? q.get('from'), 'to');
      checkRange(from, to);
      return json({ events: await fetchEvents(school, from, to, KEY) }, 200, true);
    }

    case 'classes': {
      const year = readInt(q.get('year') ?? String(new Date().getFullYear()), 'year', 2000, 2100);
      return json({ classes: await fetchClasses(school, year, KEY) }, 200, true);
    }

    case 'school': {
      const name = q.get('name');
      if (!name) throw new BadRequest('name이 필요해요');

      // "여자고등학교" 같은 말로 찾으면 300곳이 넘게 나와요.
      // 다 보내면 화면에서 고르기가 더 어려워요. 앞에서 잘라 보내고
      // 몇 곳인지 같이 알려줘서 이름을 더 자세히 적도록 안내해요.
      const all = await findSchool(name, KEY);
      return json({ schools: all.slice(0, SCHOOL_LIMIT), total: all.length }, 200, true);
    }

    default:
      throw new BadRequest(
        'kind는 meal, timetable, schedule, classes, school 중 하나여야 해요',
      );
  }
}

/** 3월~8월이면 1학기, 9월~2월이면 2학기로 봐요. */
function termOf(date: string): number {
  const month = Number(date.replace(/-/g, '').slice(4, 6));
  return month >= 3 && month <= 8 ? 1 : 2;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (req.method !== 'GET') return json({ error: 'GET만 받아요' }, 405);

  if (!KEY) {
    // 키가 없어도 NEIS는 답하지만 5행에서 잘려요. 조용히 반쪽 데이터를 주는 것보다
    // 대놓고 알려주는 게 나아요.
    console.warn('NEIS_API_KEY가 없어요. 응답이 5행에서 잘립니다.');
  }

  try {
    return await handle(new URL(req.url));
  } catch (e) {
    if (e instanceof BadRequest) return json({ error: e.message }, 400);
    if (e instanceof NeisError) {
      console.error('NEIS 오류', e.code, e.message);
      // 키 문제는 우리 잘못이니 502로 알려요. 그 외는 NEIS가 거절한 거예요.
      const status = e.code === 'ERROR-290' || e.code === 'ERROR-300' ? 502 : 400;
      return json({ error: e.message, code: e.code }, status);
    }
    console.error(e);
    return json({ error: '알 수 없는 오류예요' }, 500);
  }
});
