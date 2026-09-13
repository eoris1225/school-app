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
  AuthError,
  demote,
  promote,
  requireTeacher as requireTeacherLogin,
  setSchool,
  setSettings,
  setSubjects,
  whoami,
} from '../_shared/auth.ts';
import {
  listTeachers,
  listThreads,
  putImage,
  readThread,
  removeThread,
  reply,
  startThread,
  ThreadError,
} from '../_shared/threads.ts';
import {
  createAssessment,
  DbError,
  deleteAssessment,
  updateAssessment,
  listAssessments,
} from '../_shared/assessments.ts';
import {
  fetchClasses,
  fetchEvents,
  fetchLessons,
  fetchMeals,
  fetchSubjects,
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
  'access-control-allow-methods': 'GET, POST, PATCH, DELETE, OPTIONS',
};

/**
 * 급식과 시간표는 하루에 몇 번 바뀌지 않아요. 10분 동안은 받아둔 걸 그대로 쓰고,
 * 그 뒤 1시간은 새로 받아오는 동안 옛 값이라도 먼저 보여줘요.
 * NEIS 호출량도 아끼고 화면도 빨라져요.
 */
const CACHE = 'public, max-age=600, stale-while-revalidate=3600';

/** 학교 검색 결과를 한 번에 보내는 최대 개수 */
const SCHOOL_LIMIT = 30;

/**
 * 선생님으로 올라갈 때 쓰는 암호예요.
 *
 * 이 코드는 승급할 때 딱 한 번만 써요. 통과하면 계정에 역할이 붙고,
 * 그 뒤로는 로그인한 계정 자체가 권한이에요. 매 요청에 암호를 싣지 않아요.
 *
 * 영문과 숫자로만 정해주세요. 한글은 아래 승급에서 걸러내요.
 *
 *   supabase secrets set TEACHER_CODE=정한암호
 */
const TEACHER_CODE = Deno.env.get('TEACHER_CODE');

/**
 * 수행평가를 고칠 수 있는 사람인지 봐요. 로그인해서 선생님인 계정만이에요.
 * 누구인지도 돌려줘요. 누가 올렸는지 담아야 나중에 주인만 지울 수 있어요.
 */
async function requireWriter(req: Request) {
  return await requireTeacherLogin(req);
}

class Forbidden extends Error {}

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

/** 등록할 수행평가 내용을 읽어요. 이상한 값은 표까지 보내지 않아요. */
async function readBody(req: Request) {
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    throw new BadRequest('보낸 내용을 읽을 수 없어요');
  }
  const b = raw as Record<string, unknown>;

  const date = readDate(typeof b.date === 'string' ? b.date : null, 'date');

  const title = typeof b.title === 'string' ? b.title.trim() : '';
  if (title.length < 1 || title.length > 100) {
    throw new BadRequest('제목은 1자 이상 100자 이하여야 해요');
  }

  const subject = typeof b.subject === 'string' && b.subject.trim() ? b.subject.trim() : null;
  if (subject && subject.length > 30) throw new BadRequest('과목 이름이 너무 길어요');

  // 준비물이나 범위 같은 자세한 안내. 안 적어도 돼요.
  const detail = typeof b.detail === 'string' && b.detail.trim() ? b.detail.trim() : null;
  if (detail && detail.length > 500) throw new BadRequest('자세한 내용은 500자까지예요');

  // 학년은 1~6, 반은 짧은 글자만. 각각 최대 스무 개까지요.
  const grades = toList(b.grades, 'grades').map((v) => {
    const n = Number(v);
    if (!Number.isInteger(n) || n < 1 || n > 6) throw new BadRequest('학년은 1~6이어야 해요');
    return n;
  });
  const classes = toList(b.classes, 'classes').map((v) => {
    const s = String(v).trim();
    if (!s || s.length > 10) throw new BadRequest('반 이름이 이상해요');
    return s;
  });

  return { date, title, subject, detail, grades, classes };
}

/**
 * 담당 과목을 읽어요.
 *
 *   subjects  교과군. 쪽지가 누구에게 갈지 정해요. 하나는 있어야 해요.
 *   teaches   실제로 맡은 과목 이름. 화면에 보여주려는 거라 없어도 돼요.
 *
 * 어느 이름이 어느 교과군인지는 앱이 정해서 보내요. 분류 규칙이 앱에 있고,
 * 여기에 한 벌 더 두면 둘이 어긋나요.
 */
function readSubjects(body: Record<string, unknown>) {
  const clean = (v: unknown, field: string) =>
    toList(v, field).map((x) => {
      const s = String(x).trim();
      if (!s || s.length > 40) throw new BadRequest('과목 이름이 이상해요');
      return s;
    });

  const subjects = clean(body.subjects, 'subjects');
  if (subjects.length === 0) throw new BadRequest('담당 과목을 하나 이상 골라주세요');
  return { subjects, teaches: clean(body.teaches, 'teaches') };
}

/** 쪽지 내용을 읽어요. 새 질문이면 과목도 같이 받아요. */
async function readMessage(req: Request, needSubject: boolean) {
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    throw new BadRequest('보낸 내용을 읽을 수 없어요');
  }
  const b = raw as Record<string, unknown>;

  const text = typeof b.text === 'string' ? b.text.trim() : '';
  if (text.length < 1) throw new BadRequest('내용을 적어주세요');
  if (text.length > 2000) throw new BadRequest('내용은 2000자까지예요');

  if (!needSubject) return { text, subject: null as string | null, teacher: undefined };

  const subject = typeof b.subject === 'string' ? b.subject.trim() : '';
  if (!subject || subject.length > 30) throw new BadRequest('과목을 골라주세요');

  /*
   * 콕 집어 보낼 선생님. 안 보내면 그 과목 선생님 모두에게 가요.
   * 모양만 여기서 봐요. 우리 학교 선생님인지, 그 과목을 맡는지는
   * threads.ts가 다시 확인해요. 모양이 맞다고 보내도 되는 건 아니에요.
   */
  const who = b.teacher;
  const teacher = who === undefined || who === null || who === '' ? undefined : String(who);
  if (teacher !== undefined && !/^[0-9a-f-]{36}$/i.test(teacher)) {
    throw new BadRequest('선생님을 다시 골라주세요');
  }
  return { text, subject, teacher };
}

function toList(v: unknown, field: string): unknown[] {
  if (v === undefined || v === null) return [];
  if (!Array.isArray(v)) throw new BadRequest(`${field}는 목록이어야 해요`);
  if (v.length > 20) throw new BadRequest(`${field}는 스무 개까지예요`);
  return v;
}

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

async function handle(req: Request, url: URL): Promise<Response> {
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
      /*
       * 학년과 반은 없어도 돼요. 안 주면 그 학교 모든 반이 한 번에 와요.
       *
       * 선생님 시간표에 써요. NEIS 시간표에는 담당 교사 칸이 아예 없어서
       * "이 선생님 시간표"를 물어볼 방법이 없어요. 학교 전체를 받아 과목으로
       * 골라내는 게 유일한 길이에요. 반을 하나씩 부르면 스물네 번 다녀와야 해요.
       *
       * 둘 중 하나만 주는 건 막아요. 학년만 주면 그 학년 전체가 오는데,
       * 부르는 쪽이 반을 빠뜨린 실수일 가능성이 높아요.
       */
      const gradeRaw = q.get('grade');
      const clsRaw = q.get('class');
      if (!gradeRaw !== !clsRaw) {
        throw new BadRequest('grade와 class는 둘 다 주거나 둘 다 빼주세요');
      }
      const grade = gradeRaw ? readInt(gradeRaw, 'grade', 1, 6) : undefined;
      const cls = clsRaw ?? undefined;
      const year = readInt(q.get('year') ?? String(new Date().getFullYear()), 'year', 2000, 2100);
      const term = readInt(q.get('term') ?? '0', 'term', 0, 2) || termOf(from);
      const lessons = await fetchLessons(school, { year, term, grade, cls, from, to }, KEY);
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

    // 수행평가는 NEIS가 아니라 우리 표에서 와요.
    // 읽기는 누구나, 등록과 지우기는 선생님 코드가 있어야 해요.
    case 'assessments': {
      if (req.method === 'GET') {
        const from = readDate(q.get('from'), 'from');
        const to = readDate(q.get('to') ?? q.get('from'), 'to');
        checkRange(from, to);
        // 캐시를 걸지 않아요. 선생님이 등록하자마자 학생에게 보여야 하니까요.
        return json({ assessments: await listAssessments(school, from, to) });
      }

      if (req.method === 'POST') {
        const me = await requireWriter(req);
        const body = await readBody(req);
        return json(
          { assessment: await createAssessment(school, body, { id: me.id, name: me.name }) },
          201,
        );
      }

      if (req.method === 'PATCH') {
        const me = await requireWriter(req);
        const id = q.get('id');
        if (!id) throw new BadRequest('id가 필요해요');
        const body = await readBody(req);
        const updated = await updateAssessment(school, id, body, me.id);
        // 남의 것이면 아무것도 안 고쳐져요. 지우기와 같은 말로 답해요.
        if (!updated) throw new BadRequest('내가 올린 일정만 고칠 수 있어요');
        return json({ assessment: updated });
      }

      if (req.method === 'DELETE') {
        const me = await requireWriter(req);
        const id = q.get('id');
        if (!id) throw new BadRequest('id가 필요해요');
        /*
         * 올린 사람만 지울 수 있어요. 조건은 deleteAssessment 안에 걸려 있어요.
         * 남의 것이면 0이 돌아와요. "없어요"와 "당신 것이 아니에요"를 나눠서
         * 알려주면 무엇이 있는지 떠볼 수 있으니, 같은 말로 답해요.
         */
        const gone = await deleteAssessment(school, id, me.id);
        if (gone === 0) throw new BadRequest('내가 올린 일정만 지울 수 있어요');
        return json({ deleted: gone });
      }

      throw new BadRequest('수행평가는 GET, POST, PATCH, DELETE만 돼요');
    }

    /*
     * 그 학교에서 실제로 가르치는 과목 이름들.
     *
     * 선생님이 담당 과목을 고를 때 써요. 목록을 우리가 박아두면 학교가 새로
     * 만든 과목은 못 골라요. 시간표에 있는 이름을 그대로 줘요.
     */
    case 'subjects': {
      // 한 주치면 그 학기에 열리는 과목이 거의 다 나와요.
      // 부르는 쪽이 기간을 정해서 보내요. 다른 경로와 같은 방식이에요.
      const from = readDate(q.get('from'), 'from');
      const to = readDate(q.get('to') ?? q.get('from'), 'to');
      checkRange(from, to);
      const year = readInt(q.get('year') ?? String(new Date().getFullYear()), 'year', 2000, 2100);
      const term = readInt(q.get('term') ?? '0', 'term', 0, 2) || termOf(from);
      return json({ subjects: await fetchSubjects(school, { year, term, from, to }, KEY) }, 200, true);
    }

    // 내가 누구인지 알려줘요. 로그인 안 했으면 null이에요.
    case 'me': {
      return json({ me: await whoami(req) });
    }

    /*
     * 내 학교와 반을 계정에 적어요.
     *
     * 기기에만 두면 안 돼요. 쪽지가 이 값을 보고 누구에게 갈지 정하거든요.
     * 앱이 학교를 고를 때마다 여기로 보내요.
     */
    case 'my-school': {
      if (req.method !== 'POST') throw new BadRequest('POST로 불러주세요');
      const me = await whoami(req);
      if (!me) throw new AuthError('로그인이 필요해요');

      let body: Record<string, unknown>;
      try {
        body = (await req.json()) as Record<string, unknown>;
      } catch {
        throw new BadRequest('보낸 내용을 읽을 수 없어요');
      }
      const office = String(body.office ?? '');
      const code = String(body.code ?? '');
      if (!/^[A-Z]\d{2}$/.test(office)) throw new BadRequest('office가 이상해요');
      if (!/^\d{7}$/.test(code)) throw new BadRequest('학교 코드가 이상해요');

      /*
       * 학교 이름도 같이 받아둬요.
       *
       * 코드만 담으면 다른 기기에서 로그인했을 때 화면에 학교 이름을 못 써요.
       * 이건 보여주기용이라 틀려도 위험하지 않아요. 쪽지가 누구에게 갈지는
       * 이름이 아니라 office/code 로만 정해요.
       */
      const name = String(body.name ?? '').trim().slice(0, 60);
      const officeName = String(body.officeName ?? '').trim().slice(0, 40);

      const grade = Number(body.grade);
      if (!Number.isInteger(grade) || grade < 1 || grade > 6) throw new BadRequest('학년이 이상해요');
      const cls = String(body.cls ?? '').trim();
      if (!cls || cls.length > 10) throw new BadRequest('반이 이상해요');

      const raw = body.no === null || body.no === undefined || body.no === '' ? null : Number(body.no);
      if (raw !== null && (!Number.isInteger(raw) || raw < 1 || raw > 100)) {
        throw new BadRequest('번호가 이상해요');
      }

      return json({ me: await setSchool(me.id, { office, code, name, officeName, grade, cls, no: raw }) });
    }

    /*
     * 쪽지.
     *
     * 학교는 앱이 보낸 값을 안 믿고 계정에 적힌 것만 봐요. 누가 무엇을
     * 볼 수 있는지는 _shared/threads.ts 한 곳에 모아뒀어요.
     */
    case 'threads': {
      const me = await whoami(req);
      if (!me) throw new AuthError('로그인이 필요해요');

      if (req.method === 'GET') {
        return json({ threads: await listThreads(me) });
      }
      if (req.method === 'POST') {
        const body = await readMessage(req, true);
        return json(
          { thread: await startThread(me, body.subject!, body.text, body.teacher) },
          201,
        );
      }
      throw new BadRequest('쪽지 목록은 GET, POST만 돼요');
    }

    /*
     * 그 과목을 맡은 우리 학교 선생님들.
     *
     * 학생이 쪽지를 보낼 때 한 분을 골라서 보낼 수 있게 하려고요.
     * 계정이 아직 없는 과목이면 빈 목록이고, 그때는 예전처럼 그 과목
     * 선생님 모두에게 가요.
     */
    case 'teachers': {
      const me = await whoami(req);
      if (!me) throw new AuthError('로그인이 필요해요');
      const subject = q.get('subject')?.trim();
      if (!subject || subject.length > 30) throw new BadRequest('subject가 필요해요');
      return json({ teachers: await listTeachers(me, subject) });
    }

    case 'thread': {
      const me = await whoami(req);
      if (!me) throw new AuthError('로그인이 필요해요');
      const id = q.get('id');
      if (!id) throw new BadRequest('id가 필요해요');

      if (req.method === 'GET') {
        const found = await readThread(me, id);
        // 볼 수 없는 쪽지도 "없다"고만 해요. 있다는 것까지 알려주면 안 돼요.
        if (!found) throw new BadRequest('그런 쪽지가 없어요');
        return json(found);
      }
      if (req.method === 'POST') {
        /*
         * 사진이 붙은 쪽지는 통째로 보내요 (multipart).
         * 글만 보낼 때는 예전처럼 JSON 이에요. 사진 하나 때문에 글만 보내는
         * 흔한 경우까지 무겁게 만들 이유가 없어요.
         */
        const kind = req.headers.get('content-type') ?? '';
        if (kind.startsWith('multipart/form-data')) {
          const form = await req.formData();
          const text = String(form.get('text') ?? '').trim();
          const file = form.get('image');

          if (!(file instanceof File)) throw new BadRequest('사진이 없어요');
          if (text.length > 2000) throw new BadRequest('내용은 2000자까지예요');

          const path = await putImage(me, id, await file.arrayBuffer(), file.type);
          return json({ message: await reply(me, id, text, path) }, 201);
        }

        const body = await readMessage(req, false);
        return json({ message: await reply(me, id, body.text) }, 201);
      }
      if (req.method === 'DELETE') {
        await removeThread(me, id);
        return json({ deleted: true });
      }
      throw new BadRequest('쪽지는 GET, POST, DELETE만 돼요');
    }

    // 선생님으로 올려요. 코드는 여기서 한 번만 확인해요.
    // 통과하면 계정에 역할이 붙고, 그 뒤로는 코드가 필요 없어요.
    case 'promote': {
      if (req.method !== 'POST') throw new BadRequest('POST로 불러주세요');
      const me = await whoami(req);
      if (!me) throw new AuthError('로그인이 필요해요');

      if (!TEACHER_CODE) throw new Forbidden('아직 선생님 코드가 설정되지 않았어요');
      let body: { code?: unknown; subjects?: unknown };
      try {
        body = (await req.json()) as typeof body;
      } catch {
        throw new BadRequest('보낸 내용을 읽을 수 없어요');
      }
      if (typeof body.code !== 'string' || body.code !== TEACHER_CODE) {
        throw new Forbidden('선생님 코드가 맞지 않아요');
      }

      const { subjects, teaches } = readSubjects(body);
      return json({ me: await promote(me.id, subjects, teaches) });
    }

    /*
     * 기기에만 두던 설정을 계정에 적어요.
     *
     * 교시 바꾸기와 "안내 봤음" 표시요. 다른 기기에서 로그인해도 따라와요.
     * 알레르기는 일부러 안 받아요. 화면에 이 기기에만 담긴다고 적어뒀어요.
     */
    case 'my-settings': {
      if (req.method !== 'POST') throw new BadRequest('POST로 불러주세요');
      const me = await whoami(req);
      if (!me) throw new AuthError('로그인이 필요해요');

      let body: Record<string, unknown>;
      try {
        body = (await req.json()) as Record<string, unknown>;
      } catch {
        throw new BadRequest('보낸 내용을 읽을 수 없어요');
      }

      const v: {
        swaps?: Record<string, string>;
        setupSeen?: boolean;
        teach?: { classes: string[]; edits: Record<string, string> };
      } = {};

      if (body.swaps !== undefined) {
        const raw = body.swaps;
        if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) {
          throw new BadRequest('교시 바꾸기가 이상해요');
        }
        const entries = Object.entries(raw as Record<string, unknown>);
        // 한 주는 요일 다섯 × 교시 일곱이에요. 그보다 훨씬 많이 오면 이상해요.
        if (entries.length > 100) throw new BadRequest('교시 바꾸기가 너무 많아요');
        const swaps: Record<string, string> = {};
        for (const [k, val] of entries) {
          if (!/^[가-힣]{1}-\d{1,2}$/.test(k)) throw new BadRequest('교시 열쇠가 이상해요');
          if (typeof val !== 'string' || val.length > 40) throw new BadRequest('과목 이름이 이상해요');
          swaps[k] = val;
        }
        v.swaps = swaps;
      }

      if (body.setupSeen !== undefined) {
        if (typeof body.setupSeen !== 'boolean') throw new BadRequest('setupSeen이 이상해요');
        v.setupSeen = body.setupSeen;
      }

      /*
       * 선생님 시간표 설정. 들어가는 반 목록과 직접 고친 칸이에요.
       *
       * 반 이름은 '2-3' 모양만 받아요. 고친 칸의 열쇠는 교시 바꾸기와 같은
       * '월-6' 모양이고, 값이 빈 글자면 "이 칸은 내 수업 아님" 이에요.
       */
      if (body.teach !== undefined) {
        const raw = body.teach;
        if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) {
          throw new BadRequest('선생님 시간표 설정이 이상해요');
        }
        const t = raw as Record<string, unknown>;

        const list = t.classes === undefined ? [] : t.classes;
        if (!Array.isArray(list)) throw new BadRequest('반 목록이 이상해요');
        if (list.length > 60) throw new BadRequest('반이 너무 많아요');
        const classes: string[] = [];
        for (const c of list) {
          const one = String(c);
          if (!/^\d-[0-9A-Za-z가-힣]{1,10}$/.test(one)) throw new BadRequest('반 이름이 이상해요');
          classes.push(one);
        }

        const rawEdits = t.edits === undefined ? {} : t.edits;
        if (typeof rawEdits !== 'object' || rawEdits === null || Array.isArray(rawEdits)) {
          throw new BadRequest('고친 칸이 이상해요');
        }
        const pairs = Object.entries(rawEdits as Record<string, unknown>);
        if (pairs.length > 100) throw new BadRequest('고친 칸이 너무 많아요');
        const edits: Record<string, string> = {};
        for (const [k, val] of pairs) {
          if (!/^[가-힣]{1}-\d{1,2}$/.test(k)) throw new BadRequest('교시 열쇠가 이상해요');
          if (typeof val !== 'string' || val.length > 40) throw new BadRequest('칸 내용이 이상해요');
          edits[k] = val;
        }

        v.teach = { classes, edits };
      }

      if (v.swaps === undefined && v.setupSeen === undefined && v.teach === undefined) {
        throw new BadRequest('바꿀 것이 없어요');
      }
      return json({ me: await setSettings(me.id, v) });
    }

    /*
     * 선생님을 다시 학생으로 되돌려요.
     *
     * 본인만 할 수 있어요. 남을 강등시킬 수 있으면 안 되니까 토큰이 가리키는
     * 그 계정만 내려요. 담당 과목이 비워지고, 그분을 콕 집어 보낸 쪽지는
     * 지정이 풀려서 그 과목 선생님들에게 다시 보여요.
     */
    case 'demote': {
      if (req.method !== 'POST') throw new BadRequest('POST로 불러주세요');
      const me = await requireTeacherLogin(req);
      return json({ me: await demote(me.id) });
    }

    /*
     * 담당 과목 바꾸기. 이미 선생님인 사람만요.
     *
     * 승급할 때 한 번 고르고 끝이면 안 돼요. 학년이 바뀌면 맡는 과목도
     * 바뀌거든요. 코드는 다시 안 물어봐요. 이미 선생님인 게 확인됐으니까요.
     */
    case 'my-subjects': {
      if (req.method !== 'POST') throw new BadRequest('POST로 불러주세요');
      const me = await requireTeacherLogin(req);
      let body: Record<string, unknown>;
      try {
        body = (await req.json()) as Record<string, unknown>;
      } catch {
        throw new BadRequest('보낸 내용을 읽을 수 없어요');
      }
      const { subjects, teaches } = readSubjects(body);
      return json({ me: await setSubjects(me.id, subjects, teaches) });
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
        'kind는 meal, timetable, schedule, classes, school, assessments, teachers, threads, thread 중 하나여야 해요',
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
  if (!['GET', 'POST', 'PATCH', 'DELETE'].includes(req.method)) {
    return json({ error: 'GET, POST, PATCH, DELETE만 받아요' }, 405);
  }

  if (!KEY) {
    // 키가 없어도 NEIS는 답하지만 5행에서 잘려요. 조용히 반쪽 데이터를 주는 것보다
    // 대놓고 알려주는 게 나아요.
    console.warn('NEIS_API_KEY가 없어요. 응답이 5행에서 잘립니다.');
  }

  try {
    return await handle(req, new URL(req.url));
  } catch (e) {
    if (e instanceof BadRequest) return json({ error: e.message }, 400);
    if (e instanceof Forbidden) return json({ error: e.message }, 403);
    if (e instanceof AuthError) return json({ error: e.message }, 401);
    // 쪽지 규칙에 걸린 거예요. 서버 잘못이 아니니 400으로 알려줘요.
    if (e instanceof ThreadError) return json({ error: e.message }, 400);
    if (e instanceof DbError) {
      console.error('DB 오류', e.message);
      return json({ error: '수행평가를 처리하지 못했어요' }, 502);
    }
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
