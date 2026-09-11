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
  subjects: string[];
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
async function profileOf(id: string): Promise<Me | null> {
  const q = new URLSearchParams({ select: 'id,role,name,subjects', id: `eq.${id}` });
  const res = await fetch(`${rest('profiles')}?${q}`, { headers: serviceHeaders() });
  if (!res.ok) throw new AuthError('프로필을 읽지 못했어요');
  const rows = (await res.json()) as Record<string, unknown>[];
  const row = rows[0];
  if (!row) return null;
  return {
    id: String(row.id),
    role: row.role === 'teacher' ? 'teacher' : 'student',
    name: String(row.name ?? ''),
    subjects: Array.isArray(row.subjects) ? row.subjects.map(String) : [],
  };
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
export async function promote(id: string, subjects: string[]): Promise<Me> {
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
  return {
    id: String(row.id),
    role: 'teacher',
    name: String(row.name ?? ''),
    subjects: Array.isArray(row.subjects) ? row.subjects.map(String) : [],
  };
}
