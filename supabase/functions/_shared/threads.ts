/**
 * 쪽지를 표에 담고 꺼내요.
 *
 * 누가 무엇을 볼 수 있는지가 전부 여기에 있어요. 표에는 정책을 하나도
 * 안 만들어 뒀고, service_role 키는 이 함수 안에만 있어요.
 *
 * 규칙은 두 줄이에요.
 *   학생   내가 보낸 쪽지만
 *   선생님 우리 학교 + 내 담당 과목으로 온 쪽지만
 *
 * "우리 학교"는 앱이 보낸 값이 아니라 프로필에 적힌 값이에요.
 * 앱이 보낸 값을 믿으면 선생님이 학교 설정만 바꿔서 남의 학교 학생
 * 질문을 읽을 수 있어요. 수행평가는 공개된 내용이라 앱이 보낸 값을
 * 쓰지만 쪽지는 안 돼요.
 */

import type { Me } from './auth.ts';

const URL_BASE = Deno.env.get('SUPABASE_URL');
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

export type Message = {
  id: string;
  from: 'student' | 'teacher';
  author: string;
  text: string;
  at: string;
  /** 사진이 붙어 있으면 잠깐 쓸 수 있는 주소. 없으면 null이에요. */
  image: string | null;
};

export type Thread = {
  id: string;
  subject: string;
  student: { name: string; cls: string; no: number | null };
  /** 목록에서 미리보기로 쓸 마지막 한 줄 */
  last: Message | null;
  count: number;
  unread: boolean;
  /** 선생님 답변이 아직 없으면 true */
  pending: boolean;
  at: string;
};

export class ThreadError extends Error {}

function rest(path: string): string {
  if (!URL_BASE || !SERVICE_KEY) throw new ThreadError('데이터베이스 설정이 없어요');
  return `${URL_BASE}/rest/v1/${path}`;
}

const headers = () => ({
  apikey: SERVICE_KEY!,
  authorization: `Bearer ${SERVICE_KEY}`,
  'content-type': 'application/json',
});

async function ask(url: string, init?: RequestInit): Promise<Record<string, unknown>[]> {
  const res = await fetch(url, { ...init, headers: { ...headers(), ...(init?.headers ?? {}) } });
  if (!res.ok) {
    const detail = await res.text();
    throw new ThreadError(`쪽지를 처리하지 못했어요 (${res.status}) ${detail.slice(0, 120)}`);
  }
  /*
   * 본문이 비어 있을 수 있어요.
   *
   * PostgREST는 return=representation 을 안 주면 POST에 201을, PATCH에
   * 204를 주면서 본문을 안 보내요. 그걸 그대로 res.json() 하면 터져요.
   * 상태 번호로 가리려다 201을 빠뜨려서 실제로 한 번 터졌어요.
   * 이제는 글자로 받아보고 비어 있으면 빈 목록으로 봐요.
   */
  const text = await res.text();
  if (!text.trim()) return [];
  return JSON.parse(text) as Record<string, unknown>[];
}

function toMessage(row: Record<string, unknown>): Message {
  return {
    id: String(row.id),
    from: row.author_role === 'teacher' ? 'teacher' : 'student',
    author: String(row.author_name ?? ''),
    text: String(row.text ?? ''),
    at: String(row.created_at ?? ''),
    // 주소는 여기서 안 만들어요. 볼 수 있는 사람인지 확인한 뒤에 붙여요.
    image: row.image_path ? String(row.image_path) : null,
  };
}

const BUCKET = 'thread-images';

/**
 * 사진을 잠깐 볼 수 있는 주소를 만들어요.
 *
 * 저장소를 공개로 두면 주소만 알면 누구나 남의 질문 사진을 봐요. 그래서
 * 비공개로 두고, 볼 수 있는 사람이 확인됐을 때만 한 시간짜리 주소를 만들어요.
 */
async function signedUrl(path: string): Promise<string | null> {
  const res = await fetch(`${URL_BASE}/storage/v1/object/sign/${BUCKET}/${path}`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({ expiresIn: 3600 }),
  });
  if (!res.ok) return null;
  const body = (await res.json()) as { signedURL?: string };
  return body.signedURL ? `${URL_BASE}/storage/v1${body.signedURL}` : null;
}

/** 목록에 담긴 사진들에 볼 수 있는 주소를 붙여요. */
async function withImages(msgs: Message[]): Promise<Message[]> {
  return await Promise.all(
    msgs.map(async (m) => (m.image ? { ...m, image: await signedUrl(m.image) } : m)),
  );
}

/**
 * 사진을 담아요. 담은 자리만 돌려줘요.
 *
 * 자리 이름에 쪽지 번호를 넣어요. 쪽지가 지워지면 어느 사진을 같이 치워야
 * 하는지 알 수 있어야 하니까요.
 */
export async function putImage(
  me: Me,
  threadId: string,
  bytes: ArrayBuffer,
  type: string,
): Promise<string> {
  const OK = ['image/jpeg', 'image/png', 'image/webp'];
  if (!OK.includes(type)) throw new ThreadError('사진은 JPG, PNG, WEBP만 돼요');
  if (bytes.byteLength > 3 * 1024 * 1024) throw new ThreadError('사진은 3MB까지예요');
  if (bytes.byteLength === 0) throw new ThreadError('사진이 비어 있어요');

  // 볼 수 있는 쪽지인지 먼저 봐요. 남의 쪽지에 사진을 넣으면 안 되니까요.
  const rows = await ask(`${rest('threads')}?select=id&id=eq.${threadId}&${scope(me)}`);
  if (rows.length === 0) throw new ThreadError('그런 쪽지가 없어요');

  const ext = type === 'image/png' ? 'png' : type === 'image/webp' ? 'webp' : 'jpg';
  const path = `${threadId}/${crypto.randomUUID()}.${ext}`;

  const res = await fetch(`${URL_BASE}/storage/v1/object/${BUCKET}/${path}`, {
    method: 'POST',
    headers: {
      apikey: SERVICE_KEY!,
      authorization: `Bearer ${SERVICE_KEY}`,
      'content-type': type,
    },
    body: bytes,
  });
  if (!res.ok) {
    const detail = await res.text();
    throw new ThreadError(`사진을 담지 못했어요 (${res.status}) ${detail.slice(0, 100)}`);
  }
  return path;
}

/** 이 사람이 볼 수 있는 쪽지만 걸러내는 조건이에요. */
function scope(me: Me): string {
  if (me.role === 'teacher') {
    if (!me.school) throw new ThreadError('학교를 먼저 골라주세요');
    if (me.subjects.length === 0) throw new ThreadError('담당 과목이 없어요');
    const list = me.subjects.map((s) => `"${s}"`).join(',');
    const q = new URLSearchParams({
      school_office: `eq.${me.school.office}`,
      school_code: `eq.${me.school.code}`,
      subject: `in.(${list})`,
    });
    return q.toString();
  }
  return new URLSearchParams({ student_id: `eq.${me.id}` }).toString();
}

const LIST_COLS =
  'id,subject,student_name,student_cls,student_no,unread_student,unread_teacher,updated_at,' +
  'messages(id,author_role,author_name,text,image_path,created_at)';

function toThread(row: Record<string, unknown>, me: Me): Thread {
  const msgs = (Array.isArray(row.messages) ? row.messages : [])
    .map((m) => toMessage(m as Record<string, unknown>))
    .sort((a, b) => a.at.localeCompare(b.at));
  return {
    id: String(row.id),
    subject: String(row.subject),
    student: {
      name: String(row.student_name ?? ''),
      cls: String(row.student_cls ?? ''),
      no: row.student_no === null || row.student_no === undefined ? null : Number(row.student_no),
    },
    last: msgs.length ? msgs[msgs.length - 1] : null,
    count: msgs.length,
    unread: Boolean(me.role === 'teacher' ? row.unread_teacher : row.unread_student),
    pending: !msgs.some((m) => m.from === 'teacher'),
    at: String(row.updated_at ?? ''),
  };
}

/** 내가 볼 수 있는 쪽지 목록. 최근 것이 앞이에요. */
export async function listThreads(me: Me): Promise<Thread[]> {
  const rows = await ask(`${rest('threads')}?select=${LIST_COLS}&${scope(me)}&order=updated_at.desc`);
  // 목록에서는 주소를 안 만들어요. 미리보기에 사진을 띄우지 않거든요.
  // 쪽지마다 주소를 만들면 목록 한 번 여는 데 여러 번 다녀와야 해요.
  return rows.map((r) => {
    const t = toThread(r, me);
    return t.last ? { ...t, last: { ...t.last, image: t.last.image ? '' : null } } : t;
  });
}

/**
 * 쪽지 하나를 전부 읽어요. 볼 수 없는 쪽지면 없는 것처럼 null이에요.
 * "권한이 없어요"라고 알려주면 그 쪽지가 있다는 것까지 알려주는 셈이에요.
 */
export async function readThread(
  me: Me,
  id: string,
): Promise<{ thread: Thread; messages: Message[] } | null> {
  const rows = await ask(`${rest('threads')}?select=${LIST_COLS}&id=eq.${id}&${scope(me)}`);
  if (rows.length === 0) return null;

  const msgs = (Array.isArray(rows[0].messages) ? rows[0].messages : [])
    .map((m) => toMessage(m as Record<string, unknown>))
    .sort((a, b) => a.at.localeCompare(b.at));

  // 열었으면 읽은 거예요. 따로 "읽음" 버튼을 만들지 않아요.
  const mine = me.role === 'teacher' ? 'unread_teacher' : 'unread_student';
  await ask(`${rest('threads')}?id=eq.${id}`, {
    method: 'PATCH',
    body: JSON.stringify({ [mine]: false }),
  });

  return { thread: { ...toThread(rows[0], me), unread: false }, messages: await withImages(msgs) };
}

/** 학생이 새 질문을 보내요. */
export async function startThread(me: Me, subject: string, text: string): Promise<Thread> {
  if (me.role !== 'student') throw new ThreadError('질문은 학생만 보낼 수 있어요');
  if (!me.school) throw new ThreadError('학교를 먼저 골라주세요');
  if (!me.cls) throw new ThreadError('학년과 반을 먼저 골라주세요');

  const made = await ask(rest('threads'), {
    method: 'POST',
    headers: { prefer: 'return=representation' },
    body: JSON.stringify({
      school_office: me.school.office,
      school_code: me.school.code,
      subject,
      student_id: me.id,
      student_name: me.name,
      student_cls: me.cls,
      student_no: me.no,
    }),
  });
  const id = String(made[0].id);

  await ask(rest('messages'), {
    method: 'POST',
    body: JSON.stringify({
      thread_id: id,
      author_id: me.id,
      author_name: me.name,
      author_role: 'student',
      text,
    }),
  });

  const full = await readThread(me, id);
  if (!full) throw new ThreadError('보낸 쪽지를 찾지 못했어요');
  return full.thread;
}

/** 이어서 한 줄 더 보내요. 학생도 선생님도 써요. */
export async function reply(me: Me, id: string, text: string, imagePath?: string): Promise<Message> {
  // 볼 수 있는 쪽지인지 먼저 봐요. 남의 쪽지에 끼어들면 안 되니까요.
  const rows = await ask(`${rest('threads')}?select=id&id=eq.${id}&${scope(me)}`);
  if (rows.length === 0) throw new ThreadError('그런 쪽지가 없어요');

  const made = await ask(rest('messages'), {
    method: 'POST',
    headers: { prefer: 'return=representation' },
    body: JSON.stringify({
      thread_id: id,
      author_id: me.id,
      author_name: me.name,
      author_role: me.role,
      text,
      image_path: imagePath ?? null,
    }),
  });

  // 상대편에게 안 읽음 표시를 켜고, 목록 맨 위로 올려요.
  const other = me.role === 'teacher' ? 'unread_student' : 'unread_teacher';
  await ask(`${rest('threads')}?id=eq.${id}`, {
    method: 'PATCH',
    body: JSON.stringify({ [other]: true, updated_at: new Date().toISOString() }),
  });

  const one = toMessage(made[0]);
  return one.image ? { ...one, image: await signedUrl(one.image) } : one;
}

/**
 * 보낸 질문을 거둬들여요.
 *
 * 보낸 사람만 지울 수 있어요. 선생님은 못 지워요. 학생이 올린 글을 선생님이
 * 없앨 수 있으면 그건 다른 얘기가 돼요. 부적절한 글은 학교가 따로 다뤄야지
 * 앱이 조용히 지울 일이 아니에요.
 *
 * 지우면 오간 내용도 같이 사라져요 (표에 걸어뒀어요). 선생님 쪽지함에서도
 * 없어져요. 그래서 답이 달린 뒤에는 못 지워요. 선생님이 시간 들여 쓴 답이
 * 한쪽 뜻만으로 사라지면 안 되니까요.
 */
export async function removeThread(me: Me, id: string): Promise<void> {
  if (me.role !== 'student') throw new ThreadError('보낸 사람만 지울 수 있어요');

  const rows = await ask(
    `${rest('threads')}?select=id,messages(author_role)&id=eq.${id}&student_id=eq.${me.id}`,
  );
  if (rows.length === 0) throw new ThreadError('그런 쪽지가 없어요');

  const msgs = Array.isArray(rows[0].messages) ? rows[0].messages : [];
  const answered = msgs.some((m) => (m as Record<string, unknown>).author_role === 'teacher');
  if (answered) throw new ThreadError('선생님이 답한 쪽지는 지울 수 없어요');

  await ask(`${rest('threads')}?id=eq.${id}&student_id=eq.${me.id}`, { method: 'DELETE' });
}
