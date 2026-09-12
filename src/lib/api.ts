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
  // 사진이 붙은 요청은 FormData 로 보내요. 그때는 경계 문자열을 fetch 가
  // 알아서 붙이기 때문에 content-type 을 우리가 적으면 안 돼요.
  const form = opts.body instanceof FormData;
  if (opts.body !== undefined && !form) headers['content-type'] = 'application/json';
  // 로그인했으면 토큰을 같이 보내요. 서버가 이걸로 내가 누구인지 알아요.
  const token = await accessToken();
  if (token) headers.authorization = `Bearer ${token}`;

  let res: Response;
  try {
    res = await fetch(`${BASE}?${q}`, {
      method: opts.method ?? 'GET',
      headers,
      body: opts.body === undefined ? undefined : form ? (opts.body as FormData) : JSON.stringify(opts.body),
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

/**
 * 그 학교에서 실제로 가르치는 과목 이름들.
 *
 * 선생님이 담당 과목을 고를 때 써요. 우리가 목록을 박아두면 학교가 새로
 * 만든 과목은 못 골라요. 시간표에 있는 이름을 그대로 받아와요.
 */
export async function getSchoolSubjects(from: string, to: string, school?: SchoolRef): Promise<string[]> {
  const { subjects } = await call<{ subjects: string[] }>({ kind: 'subjects', from, to, ...at(school) });
  return subjects;
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
  /** 준비물이나 범위 같은 자세한 안내. 안 적었으면 null이에요. */
  detail: string | null;
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
  /** 쪽지를 받을 기준이 되는 교과군. '수학', '외국어' 처럼요. */
  subjects: string[];
  /** 실제로 맡은 과목 이름. '일본 문화' 처럼요. 없을 수도 있어요. */
  teaches: string[];
  /**
   * 계정에 붙은 학교. 쪽지가 누구에게 갈지 이걸로 정해요.
   * 이름도 같이 와요. 다른 기기에서 로그인했을 때 학교를 다시 안 물어보려고요.
   */
  school: { office: string; code: string; name: string; officeName: string } | null;
  /** '2-3' 처럼 학년-반. 아직 안 골랐으면 null이에요. */
  cls: string | null;
  no: number | null;
  /** 교시마다 내가 실제로 듣는 과목. '월-6' 처럼 생긴 열쇠예요. */
  swaps: Record<string, string>;
  /** 가입 안내를 한 번 지나갔는지 */
  setupSeen: boolean;
};

/*
 * 서버가 준 나를 우리가 쓰는 모양으로 맞춰요.
 *
 * 서버가 앱보다 낡을 수 있어요. 앱은 올렸는데 함수는 아직 예전 것이면
 * swaps 나 setupSeen 이 아예 안 와요. 그걸 그대로 쓰면 Object.keys(undefined)
 * 같은 데서 터지고, 터지는 자리가 "내가 누구인지 묻는" 곳이라 앱이
 * 로그인 안 한 것처럼 보여요. 화면 전체가 죽는 거예요.
 *
 * 그래서 들어오는 자리에서 한 번 다듬어요. 없는 건 빈 값으로 봐요.
 * 서버가 올라가면 저절로 값이 채워지고, 그 전까지는 기기에 있는 걸 써요.
 */
function readMe(raw: unknown): Me | null {
  if (!raw || typeof raw !== 'object') return null;
  const m = raw as Record<string, unknown>;
  const school = m.school as Record<string, unknown> | null | undefined;
  const swaps: Record<string, string> = {};
  if (m.swaps && typeof m.swaps === 'object' && !Array.isArray(m.swaps)) {
    for (const [k, v] of Object.entries(m.swaps as Record<string, unknown>)) {
      if (typeof v === 'string') swaps[k] = v;
    }
  }
  return {
    id: String(m.id ?? ''),
    role: m.role === 'teacher' ? 'teacher' : 'student',
    name: String(m.name ?? ''),
    subjects: Array.isArray(m.subjects) ? m.subjects.map(String) : [],
    teaches: Array.isArray(m.teaches) ? m.teaches.map(String) : [],
    school:
      school && school.office && school.code
        ? {
            office: String(school.office),
            code: String(school.code),
            name: String(school.name ?? ''),
            officeName: String(school.officeName ?? ''),
          }
        : null,
    cls: typeof m.cls === 'string' && m.cls ? m.cls : null,
    no: typeof m.no === 'number' ? m.no : null,
    swaps,
    setupSeen: m.setupSeen === true,
  };
}

/** 서버가 보는 나. 로그인 안 했으면 null이에요. */
export async function getMe(): Promise<Me | null> {
  const { me } = await call<{ me: unknown }>({ kind: 'me' });
  return readMe(me);
}

/**
 * 선생님으로 올려요. 코드는 이때 한 번만 써요.
 * 통과하면 계정에 역할이 붙고, 그 뒤로는 코드가 필요 없어요.
 */
export async function promoteToTeacher(
  code: string,
  subjects: string[],
  teaches: string[] = [],
): Promise<Me> {
  const { me } = await call<{ me: unknown }>({ kind: 'promote' }, {
    method: 'POST',
    body: { code, subjects, teaches },
  });
  return readMe(me) as Me;
}

/** 담당 과목 바꾸기. 이미 선생님인 사람만 돼요. 코드는 다시 안 물어봐요. */
export async function setMySubjects(subjects: string[], teaches: string[]): Promise<Me> {
  const { me } = await call<{ me: unknown }>({ kind: 'my-subjects' }, {
    method: 'POST',
    body: { subjects, teaches },
  });
  return readMe(me) as Me;
}


/**
 * 내 학교와 반을 계정에 적어요.
 *
 * 기기에만 두면 안 돼요. 쪽지가 이 값을 보고 누구에게 갈지 정하거든요.
 * 학교를 고를 때마다 불러요.
 */
export async function saveSchoolToAccount(v: {
  office: string;
  code: string;
  name: string;
  officeName: string;
  grade: number;
  cls: string;
  no?: number;
}): Promise<Me> {
  const { me } = await call<{ me: unknown }>(
    { kind: 'my-school' },
    { method: 'POST', body: { ...v, no: v.no ?? null } },
  );
  return readMe(me) as Me;
}


/**
 * 기기에만 두던 설정을 계정에 적어요.
 *
 * 교시 바꾸기는 한 학기 분량을 손으로 고친 거예요. 폰을 바꿨다고 처음부터
 * 다시 하라는 건 좀 그래요. 알레르기는 안 보내요. 화면에 이 기기에만
 * 담긴다고 적어뒀으니 그 약속은 지켜야죠.
 */
export async function saveMySettings(v: {
  swaps?: Record<string, string>;
  setupSeen?: boolean;
}): Promise<Me> {
  const { me } = await call<{ me: unknown }>({ kind: 'my-settings' }, { method: 'POST', body: v });
  return readMe(me) as Me;
}

/** 선생님을 다시 학생으로 되돌려요. 본인만 돼요. */
export async function demoteToStudent(): Promise<Me> {
  const { me } = await call<{ me: unknown }>({ kind: 'demote' }, { method: 'POST', body: {} });
  return readMe(me) as Me;
}


// ---------------------------------------------------------------- 쪽지

export type ThreadMessage = {
  id: string;
  from: 'student' | 'teacher';
  author: string;
  text: string;
  /** 보낸 시각. ISO 글자예요. 화면에서 보기 좋게 바꿔요. */
  at: string;
  /**
   * 붙은 사진 주소. 없으면 null이에요.
   *
   * 한 시간만 쓸 수 있는 주소예요. 저장소를 공개로 두면 주소만 알면 누구나
   * 남의 질문 사진을 보거든요. 그래서 볼 수 있는 사람인지 확인한 뒤에
   * 서버가 그때그때 만들어줘요. 목록에서는 빈 글자로 와요(띄우지 않아서요).
   */
  image: string | null;
};

export type Thread = {
  id: string;
  subject: string;
  student: { name: string; cls: string; no: number | null };
  /** 콕 집어 보낸 선생님. 안 고르면 null이고 그 과목 선생님 모두에게 가요. */
  teacher: { id: string; name: string } | null;
  /** 목록 미리보기에 쓸 마지막 한 줄 */
  last: ThreadMessage | null;
  count: number;
  unread: boolean;
  /** 선생님 답변이 아직 없으면 true */
  pending: boolean;
  at: string;
};

/** 내가 볼 수 있는 쪽지 목록. 최근 것이 앞이에요. */
export async function getThreads(): Promise<Thread[]> {
  const { threads } = await call<{ threads: Thread[] }>({ kind: 'threads' });
  return threads;
}

/** 쪽지 하나를 전부 읽어요. 여는 순간 읽음으로 표시돼요. */
export async function getThread(id: string): Promise<{ thread: Thread; messages: ThreadMessage[] }> {
  return await call<{ thread: Thread; messages: ThreadMessage[] }>({ kind: 'thread', id });
}

/** 그 과목을 맡은 우리 학교 선생님. 아직 계정이 없으면 빈 목록이에요. */
export type TeacherPick = {
  id: string;
  name: string;
  /** 실제로 맡은 과목 이름. '미적분' 처럼요. */
  teaches: string[];
  /** '2-3' 처럼 학년-반. 안 골랐으면 null이에요. */
  cls: string | null;
};

/**
 * 그 과목 선생님 목록을 받아와요.
 *
 * 학교는 안 보내요. 서버가 내 계정에 적힌 학교만 봐요. 앱이 보낸 값을
 * 믿으면 아무 학교나 적어서 남의 학교 선생님 명단을 훑을 수 있어요.
 */
export async function getSubjectTeachers(subject: string): Promise<TeacherPick[]> {
  const { teachers } = await call<{ teachers: TeacherPick[] }>({ kind: 'teachers', subject });
  return teachers;
}

/**
 * 학생이 새 질문을 보내요.
 * teacher를 주면 그 선생님께만 가요. 안 주면 그 과목 선생님 모두에게 가요.
 */
export async function askTeacher(subject: string, text: string, teacher?: string): Promise<Thread> {
  const { thread } = await call<{ thread: Thread }>(
    { kind: 'threads' },
    { method: 'POST', body: { subject, text, teacher: teacher ?? null } },
  );
  return thread;
}

/**
 * 보낸 질문을 거둬들여요. 보낸 사람만 돼요.
 * 선생님이 답한 뒤에는 못 지워요. 답까지 같이 사라지거든요.
 */
export async function removeThread(id: string): Promise<void> {
  await call<{ deleted: boolean }>({ kind: 'thread', id }, { method: 'DELETE' });
}

/**
 * 이어서 한 줄 더 보내요. 학생도 선생님도 써요.
 * 사진을 같이 보내려면 photo 를 주세요. 글은 없어도 돼요.
 */
export async function replyTo(
  id: string,
  text: string,
  photo?: { uri: string },
): Promise<ThreadMessage> {
  if (!photo) {
    const { message } = await call<{ message: ThreadMessage }>(
      { kind: 'thread', id },
      { method: 'POST', body: { text } },
    );
    return message;
  }

  // 사진이 있으면 통째로 보내요. 이름과 형식은 주소 끝을 보고 정해요.
  const form = new FormData();
  form.append('text', text);
  const ext = photo.uri.split('.').pop()?.toLowerCase() ?? 'jpg';
  const type = ext === 'png' ? 'image/png' : ext === 'webp' ? 'image/webp' : 'image/jpeg';
  // React Native 에서는 이 모양으로 넣어요. 웹에서는 진짜 파일을 넣어야 해요.
  form.append('image', { uri: photo.uri, name: `photo.${ext}`, type } as unknown as Blob);

  const { message } = await call<{ message: ThreadMessage }>(
    { kind: 'thread', id },
    { method: 'POST', body: form },
  );
  return message;
}
