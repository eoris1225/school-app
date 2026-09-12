/**
 * 이 요청을 보낸 사람이 누구인지 알아내요.
 *
 * 앱은 로그인하면 받은 토큰을 Authorization 헤더에 실어 보내요.
 * 그 토큰을 Supabase에 물어보면 누구인지 알려줘요. 토큰은 위조할 수 없어서,
 * 앱이 "나 선생님이야" 라고 우겨도 소용없어요.
 *
 * 예전 방식(선생님 코드)과 다른 점이에요. 코드는 아는 사람이면 누구나 쓸 수
 * 있었지만, 토큰은 그 계정으로 로그인한 사람만 가질 수 있어요.
 */

const URL_BASE = Deno.env.get('SUPABASE_URL');
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

export type Me = {
  id: string;
  role: 'student' | 'teacher';
  name: string;
  /** 쪽지를 받을 기준이 되는 교과군. '수학', '외국어' 처럼요. */
  subjects: string[];
  /** 실제로 맡은 과목 이름. '일본 문화' 처럼요. 화면에 보여주려고 담아둬요. */
  teaches: string[];
  /*
   * 학교와 반도 계정에 붙어 있어요.
   *
   * 쪽지는 앱이 보낸 학교를 안 믿고 이것만 봐요. 앱이 보낸 값을 믿으면
   * 선생님이 설정에서 학교만 바꿔서 남의 학교 학생 질문을 읽을 수 있어요.
   *
   * 이름도 같이 담아요. 코드만 있으면 다른 기기에서 로그인했을 때 화면에
   * 학교 이름을 못 써요. NEIS에 코드로 다시 물어볼 수도 있지만 한 번 받은
   * 이름을 안 버리면 그 왕복이 아예 없어요.
   */
  school: { office: string; code: string; name: string; officeName: string } | null;
  /** '2-3' 처럼 학년-반이에요. 아직 안 골랐으면 null이에요. */
  cls: string | null;
  no: number | null;
  /** 교시마다 내가 실제로 듣는 과목. '월-6' 처럼 생긴 열쇠예요. */
  swaps: Record<string, string>;
  /** 가입 안내를 한 번 지나갔는지 */
  setupSeen: boolean;
  /**
   * 선생님 시간표 설정이에요.
   *   classes  내가 들어가는 반. 비어 있으면 전체예요.
   *   edits    칸을 직접 고친 것. 빈 글자는 "내 수업 아님" 이에요.
   */
  teach: { classes: string[]; edits: Record<string, string> };
};

export class AuthError extends Error {}

const rest = (path: string) => `${URL_BASE}/rest/v1/${path}`;

const serviceHeaders = () => ({
  apikey: SERVICE_KEY!,
  authorization: `Bearer ${SERVICE_KEY}`,
  'content-type': 'application/json',
});

/** 헤더에서 토큰만 꺼내요. 없으면 null이에요. */
function tokenOf(req: Request): string | null {
  const raw = req.headers.get('authorization') ?? '';
  const m = raw.match(/^Bearer\s+(.+)$/i);
  const token = m?.[1]?.trim();
  // 앱이 익명 키를 그대로 보낼 때가 있어요. 그건 누구인지 알려주지 않아요.
  if (!token || token === Deno.env.get('SUPABASE_ANON_KEY')) return null;
  return token;
}

/** 토큰이 가리키는 계정 id. 토큰이 없거나 상했으면 null이에요. */
async function userIdOf(token: string): Promise<string | null> {
  const res = await fetch(`${URL_BASE}/auth/v1/user`, {
    headers: { apikey: SERVICE_KEY!, authorization: `Bearer ${token}` },
  });
  if (!res.ok) return null;
  const user = (await res.json()) as { id?: string };
  return user.id ?? null;
}

/** 계정 id로 프로필을 읽어요. */
/** jsonb 칸을 글자 표로 읽어요. 이상한 게 들어 있으면 빈 표로 봐요. */
function toSwaps(raw: unknown): Record<string, string> {
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) return {};
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(raw)) {
    if (typeof v === 'string') out[k] = v;
  }
  return out;
}

/** 선생님 시간표 설정을 읽어요. 이상한 게 들어 있으면 비운 걸로 봐요. */
function toTeach(raw: unknown): Me['teach'] {
  const v = typeof raw === 'object' && raw !== null && !Array.isArray(raw)
    ? (raw as Record<string, unknown>)
    : {};
  const classes = Array.isArray(v.classes) ? v.classes.map(String) : [];
  return { classes, edits: toSwaps(v.edits) };
}

function toMe(row: Record<string, unknown>): Me {
  const office = row.school_office ? String(row.school_office) : '';
  const code = row.school_code ? String(row.school_code) : '';
  const grade = row.grade === null || row.grade === undefined ? null : Number(row.grade);
  const cls = row.cls ? String(row.cls) : '';
  return {
    id: String(row.id),
    role: row.role === 'teacher' ? 'teacher' : 'student',
    name: String(row.name ?? ''),
    subjects: Array.isArray(row.subjects) ? row.subjects.map(String) : [],
    teaches: Array.isArray(row.teaches) ? row.teaches.map(String) : [],
    school:
      office && code
        ? {
            office,
            code,
            name: String(row.school_name ?? ''),
            officeName: String(row.office_name ?? ''),
          }
        : null,
    cls: grade !== null && cls ? `${grade}-${cls}` : null,
    no: row.student_no === null || row.student_no === undefined ? null : Number(row.student_no),
    swaps: toSwaps(row.swaps),
    setupSeen: row.setup_seen === true,
    teach: toTeach(row.teach),
  };
}

const PROFILE_COLS =
  'id,role,name,subjects,teaches,school_office,school_code,school_name,office_name,' +
  'grade,cls,student_no,swaps,setup_seen,teach';

async function profileOf(id: string): Promise<Me | null> {
  const q = new URLSearchParams({ select: PROFILE_COLS, id: `eq.${id}` });
  const res = await fetch(`${rest('profiles')}?${q}`, { headers: serviceHeaders() });
  if (!res.ok) throw new AuthError('프로필을 읽지 못했어요');
  const rows = (await res.json()) as Record<string, unknown>[];
  const row = rows[0];
  if (!row) return null;
  return toMe(row);
}

/**
 * 내 학교와 반을 계정에 적어요.
 *
 * 앱에서 학교를 고를 때마다 불러요. 쪽지가 이 값을 보고 누구에게 갈지
 * 정하기 때문에, 기기에만 두면 안 되고 계정에 붙어 있어야 해요.
 * 역할과 담당 과목은 여기서 못 건드려요. 표에 걸린 트리거가 되돌려요.
 */
export async function setSchool(
  id: string,
  v: {
    office: string;
    code: string;
    name: string;
    officeName: string;
    grade: number;
    cls: string;
    no: number | null;
  },
): Promise<Me> {
  const res = await fetch(`${rest('profiles')}?id=eq.${id}&select=${PROFILE_COLS}`, {
    method: 'PATCH',
    headers: { ...serviceHeaders(), prefer: 'return=representation' },
    body: JSON.stringify({
      school_office: v.office,
      school_code: v.code,
      school_name: v.name,
      office_name: v.officeName,
      grade: v.grade,
      cls: v.cls,
      student_no: v.no,
    }),
  });
  if (!res.ok) throw new AuthError(`학교를 저장하지 못했어요 (${res.status})`);
  const rows = (await res.json()) as Record<string, unknown>[];
  if (!rows[0]) throw new AuthError('프로필을 찾지 못했어요');
  return toMe(rows[0]);
}

/**
 * 기기에만 두던 설정을 계정에 적어요.
 *
 * 교시 바꾸기는 한 학기 분량을 손으로 고친 거예요. 폰을 바꿨다고 처음부터
 * 다시 하라는 건 좀 그래요. 안내를 봤는지도 같이 담아요. 새 기기마다
 * 가입 안내가 다시 뜨면 이상하잖아요.
 *
 * 알레르기는 일부러 안 옮겨요. 화면에 "이 기기에만 담기고 아무에게도 보이지
 * 않아요" 라고 적어뒀어요. 그 약속을 지켜야죠.
 */
export async function setSettings(
  id: string,
  v: { swaps?: Record<string, string>; setupSeen?: boolean; teach?: Me['teach'] },
): Promise<Me> {
  const body: Record<string, unknown> = {};
  if (v.swaps !== undefined) body.swaps = v.swaps;
  if (v.setupSeen !== undefined) body.setup_seen = v.setupSeen;
  if (v.teach !== undefined) body.teach = v.teach;

  const res = await fetch(`${rest('profiles')}?id=eq.${id}&select=${PROFILE_COLS}`, {
    method: 'PATCH',
    headers: { ...serviceHeaders(), prefer: 'return=representation' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new AuthError(`설정을 저장하지 못했어요 (${res.status})`);
  const rows = (await res.json()) as Record<string, unknown>[];
  if (!rows[0]) throw new AuthError('프로필을 찾지 못했어요');
  return toMe(rows[0]);
}

/**
 * 선생님을 다시 학생으로 되돌려요.
 *
 * 담당 과목도 같이 비워지고, 그분을 콕 집어 보낸 쪽지는 지정이 풀려요.
 * 안 풀면 그 쪽지는 아무에게도 안 보여요 (규칙은 마이그레이션에 적어뒀어요).
 * 본인인지는 부르는 쪽에서 봐요. 남을 강등시킬 수 있으면 안 되니까요.
 */
export async function demote(id: string): Promise<Me> {
  const res = await fetch(`${URL_BASE}/rest/v1/rpc/demote_to_student`, {
    method: 'POST',
    headers: serviceHeaders(),
    body: JSON.stringify({ target: id }),
  });
  if (!res.ok) throw new AuthError(`학생으로 되돌리지 못했어요 (${res.status})`);
  const rows = (await res.json()) as Record<string, unknown>[];
  const row = Array.isArray(rows) ? rows[0] : (rows as Record<string, unknown>);
  if (!row) throw new AuthError('프로필을 찾지 못했어요');
  return toMe(row);
}

/** 로그인한 사람. 로그인 안 했으면 null이에요. */
export async function whoami(req: Request): Promise<Me | null> {
  const token = tokenOf(req);
  if (!token) return null;
  const id = await userIdOf(token);
  if (!id) return null;
  return await profileOf(id);
}

/** 선생님만 할 수 있는 일에 써요. */
export async function requireTeacher(req: Request): Promise<Me> {
  const me = await whoami(req);
  if (!me) throw new AuthError('로그인이 필요해요');
  if (me.role !== 'teacher') throw new AuthError('선생님만 할 수 있어요');
  return me;
}

/**
 * 선생님으로 올려요. 코드가 맞아야 해요.
 * 코드는 이때 한 번만 써요. 그 뒤로는 계정 자체가 권한이에요.
 */
export async function promote(id: string, subjects: string[], teaches: string[] = []): Promise<Me> {
  // role은 트리거가 되돌리게 해뒀어요. service_role로 직접 쓰면 트리거를
  // 거치긴 하지만, 트리거는 old.role을 그대로 두니까 승급이 안 돼요.
  // 그래서 트리거를 잠깐 끄는 대신 전용 함수를 불러요.
  const res = await fetch(`${URL_BASE}/rest/v1/rpc/promote_to_teacher`, {
    method: 'POST',
    headers: serviceHeaders(),
    body: JSON.stringify({ target: id, new_subjects: subjects }),
  });
  if (!res.ok) {
    throw new AuthError(`선생님으로 바꾸지 못했어요 (${res.status})`);
  }
  const rows = (await res.json()) as Record<string, unknown>[];
  const row = Array.isArray(rows) ? rows[0] : (rows as Record<string, unknown>);
  // teaches 는 역할과 상관없는 칸이라 평범한 update 로 적어요.
  // (트리거는 role 과 subjects 만 되돌려요)
  return teaches.length ? await setTeaches(id, teaches) : toMe(row);
}

/**
 * 맡은 과목을 바꿔요. 선생님이 된 뒤에도 고칠 수 있어야 해요.
 *
 * subjects(교과군)는 쪽지가 누구에게 갈지 정하니까 이것도 같이 바꿔야 하는데,
 * 표에 걸린 트리거가 평범한 update 로는 못 바꾸게 막아요. 그래서 승급 함수를
 * 다시 불러요. 이미 선생님이면 역할은 그대로고 과목만 바뀌어요.
 */
export async function setSubjects(id: string, subjects: string[], teaches: string[]): Promise<Me> {
  const res = await fetch(`${URL_BASE}/rest/v1/rpc/promote_to_teacher`, {
    method: 'POST',
    headers: serviceHeaders(),
    body: JSON.stringify({ target: id, new_subjects: subjects }),
  });
  if (!res.ok) throw new AuthError(`담당 과목을 바꾸지 못했어요 (${res.status})`);
  return await setTeaches(id, teaches);
}

async function setTeaches(id: string, teaches: string[]): Promise<Me> {
  const res = await fetch(`${rest('profiles')}?id=eq.${id}&select=${PROFILE_COLS}`, {
    method: 'PATCH',
    headers: { ...serviceHeaders(), prefer: 'return=representation' },
    body: JSON.stringify({ teaches }),
  });
  if (!res.ok) throw new AuthError(`담당 과목을 저장하지 못했어요 (${res.status})`);
  const rows = (await res.json()) as Record<string, unknown>[];
  if (!rows[0]) throw new AuthError('프로필을 찾지 못했어요');
  return toMe(rows[0]);
}
