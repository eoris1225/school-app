/**
 * 우리 서버(Supabase Edge Function)를 부르는 곳이에요.
 *
 * 앱은 NEIS를 직접 부르지 않아요. 그러려면 인증키가 앱 안에 있어야 하는데,
 * 앱에 넣은 값은 누구나 꺼내 볼 수 있거든요. 그래서 키는 서버만 알고 있고
 * 앱은 키 없이 서버를 불러요.
 *
 *   앱(여기)  ->  Edge Function(키 있음)  ->  NEIS
 *
 * 서버 코드는 `supabase/functions/neis/` 에 있어요.
 */

/**
 * 이 주소는 비밀이 아니에요. 공개된 엔드포인트라서 코드에 그대로 둬요.
 * 진짜 숨겨야 하는 NEIS 인증키는 이 주소 너머 서버 안에 있어요.
 */
import { accessToken } from '@/lib/auth';

const BASE = 'https://isxbdvgvzdqpugaxqrzs.supabase.co/functions/v1/neis';

/** 서버가 늦게 답하면 손 놓고 기다리지 않고 끊어요. */
const TIMEOUT = 10000;

export type Meal = {
  date: string;
  type: 'lunch' | 'dinner';
  items: { name: string; allergy: number[] }[];
  kcal: number | null;
  people: number | null;
  origin: { item: string; from: string }[];
  nutrition: { item: string; from: string }[];
};

export type Lesson = {
  date: string;
  grade: number;
  cls: string;
  period: number;
  subject: string;
};

export type SchoolEvent = {
  date: string;
  title: string;
  detail: string;
  /** 이 일정이 해당되는 학년들. 전 학년이면 [1,2,3] */
  grades: number[];
  /** 토요휴업일처럼 수업이 없는 날이면 true */
  holiday: boolean;
};

export type ClassRoom = { grade: number; cls: string };

/** 학교 검색 결과 한 줄. 여기서 office와 code를 얻어 다른 조회에 써요. */
export type SchoolInfo = {
  /** 시도교육청코드. 'G10'(대전) 처럼 영문 한 글자 + 숫자 두 자리 */
  office: string;
  officeName: string;
  /** 표준학교코드. 숫자 일곱 자리 */
  code: string;
  name: string;
  kind: string;
  address: string;
  homepage: string;
};

/** 어느 학교를 물어볼지. 안 주면 서버가 시범운영 학교로 답해요. */
export type SchoolRef = { office: string; code: string };

const at = (school?: SchoolRef): Record<string, string> =>
  school ? { office: school.office, school: school.code } : {};

/** 화면에 그대로 보여줄 수 있는 오류예요. 개발자용 문구는 담지 않아요. */
export class ApiError extends Error {
  constructor(
    message: string,
    /** 다시 시도해볼 만한 오류인지 (네트워크 끊김 등) */
    readonly retryable: boolean,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

type CallOptions = {
  method?: 'GET' | 'POST' | 'DELETE';
  body?: unknown;
};

async function call<T>(params: Record<string, string | number>, opts: CallOptions = {}): Promise<T> {
  const q = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) q.set(k, String(v));

  const stop = new AbortController();
  const timer = setTimeout(() => stop.abort(), TIMEOUT);

  const headers: Record<string, string> = {};
  if (opts.body !== undefined) headers['content-type'] = 'application/json';
  // 로그인했으면 토큰을 같이 보내요. 서버가 이걸로 내가 누구인지 알아요.
  const token = await accessToken();
  if (token) headers.authorization = `Bearer ${token}`;

  let res: Response;
  try {
    res = await fetch(`${BASE}?${q}`, {
      method: opts.method ?? 'GET',
      headers,
      body: opts.body === undefined ? undefined : JSON.stringify(opts.body),
      signal: stop.signal,
    });
  } catch {
    // 인터넷이 끊겼거나 시간이 다 됐어요. 둘 다 다시 해보면 될 수 있어요.
    throw new ApiError('인터넷 연결을 확인해주세요', true);
  } finally {
    clearTimeout(timer);
  }

  if (!res.ok) {
    // 서버가 왜 안 되는지 적어 보내면 그대로 보여줘요. 그게 더 도움이 돼요.
    let said = '';
    try {
      said = String(((await res.json()) as { error?: string }).error ?? '');
    } catch {
      // 본문이 없거나 JSON이 아니면 아래 기본 문구를 써요.
    }
    // 400은 우리가 잘못 부른 거라 다시 해도 똑같아요. 나머지는 서버 쪽 문제예요.
    const mine = res.status >= 400 && res.status < 500;
    throw new ApiError(said || (mine ? '요청이 잘못됐어요' : '학교 정보를 불러오지 못했어요'), !mine);
  }

  try {
    return (await res.json()) as T;
  } catch {
    throw new ApiError('받은 내용을 읽지 못했어요', true);
  }
}

/** 급식. `to`를 빼면 하루치만 받아요. */
export async function getMeals(from: string, to = from, school?: SchoolRef): Promise<Meal[]> {
  const { meals } = await call<{ meals: Meal[] }>({ kind: 'meal', from, to, ...at(school) });
  return meals;
}

/** 시간표. 학년과 반이 필요해요. */
export async function getLessons(
  grade: number,
  cls: string,
  from: string,
  to = from,
  school?: SchoolRef,
): Promise<Lesson[]> {
  const { lessons } = await call<{ lessons: Lesson[] }>({
    kind: 'timetable',
    grade,
    class: cls,
    from,
    to,
    ...at(school),
  });
  return lessons;
}

/** 학사일정. */
export async function getEvents(from: string, to: string, school?: SchoolRef): Promise<SchoolEvent[]> {
  const { events } = await call<{ events: SchoolEvent[] }>({ kind: 'schedule', from, to, ...at(school) });
  return events;
}

/** 그 해에 있는 학년·반 목록. */
export async function getClasses(year: number, school?: SchoolRef): Promise<ClassRoom[]> {
  const { classes } = await call<{ classes: ClassRoom[] }>({ kind: 'classes', year, ...at(school) });
  return classes;
}

/**
 * 학교 이름으로 찾아요. 부분 일치로도 나와요.
 *
 * "여자고등학교" 처럼 넓게 찾으면 300곳이 넘어요. 서버가 앞에서 잘라 보내고
 * `total` 로 전체가 몇 곳인지 알려줘요. 잘렸으면 더 자세히 적으라고 안내해요.
 */
export async function findSchools(name: string): Promise<{ schools: SchoolInfo[]; total: number }> {
  const r = await call<{ schools: SchoolInfo[]; total: number }>({ kind: 'school', name });
  return { schools: r.schools, total: r.total ?? r.schools.length };
}


// ---------------------------------------------------------------- 수행평가

/**
 * 수행평가는 NEIS에 없어요. 선생님이 앱에서 등록하고 우리 서버가 담아둬요.
 * 그래야 등록한 사람 기기 밖에서도 보여요.
 */
export type Assessment = {
  id: string;
  date: string;
  title: string;
  subject: string | null;
  grades: number[];
  classes: string[];
};

export async function getAssessments(
  from: string,
  to: string,
  school?: SchoolRef,
): Promise<Assessment[]> {
  const r = await call<{ assessments: Assessment[] }>({
    kind: 'assessments',
    from,
    to,
    ...at(school),
  });
  return r.assessments;
}

export async function addAssessment(
  item: Omit<Assessment, 'id'>,
  school?: SchoolRef,
): Promise<Assessment> {
  const r = await call<{ assessment: Assessment }>(
    { kind: 'assessments', ...at(school) },
    { method: 'POST', body: item },
  );
  return r.assessment;
}

export async function removeAssessment(id: string, school?: SchoolRef): Promise<void> {
  await call<{ deleted: number }>({ kind: 'assessments', id, ...at(school) }, { method: 'DELETE' });
}


// ---------------------------------------------------------------- 로그인

export type Me = {
  id: string;
  role: 'student' | 'teacher';
  name: string;
  subjects: string[];
};

/** 서버가 보는 나. 로그인 안 했으면 null이에요. */
export async function getMe(): Promise<Me | null> {
  const { me } = await call<{ me: Me | null }>({ kind: 'me' });
  return me;
}

/**
 * 선생님으로 올려요. 코드는 이때 한 번만 써요.
 * 통과하면 계정에 역할이 붙고, 그 뒤로는 코드가 필요 없어요.
 */
export async function promoteToTeacher(code: string, subjects: string[]): Promise<Me> {
  const { me } = await call<{ me: Me }>({ kind: 'promote' }, {
    method: 'POST',
    body: { code, subjects },
  });
  return me;
}
