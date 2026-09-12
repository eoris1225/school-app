/**
 * 수행평가를 표에 담고 꺼내요.
 *
 * NEIS에는 수행평가가 없어서 선생님이 앱에서 직접 등록해요. 그 내용을
 * 여기에 담아야 다른 사람도 봐요. 안 그러면 등록한 사람 기기에만 남아요.
 *
 * 표는 앱이 바로 못 건드려요. RLS를 켜고 정책을 안 만들어 뒀거든요.
 * 여기서 service_role 키로만 접근해요. 그 키는 함수 안에만 있어요.
 */

const URL_BASE = Deno.env.get('SUPABASE_URL');
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

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

export type NewAssessment = {
  date: string;
  title: string;
  subject: string | null;
  detail: string | null;
  grades: number[];
  classes: string[];
};

export class DbError extends Error {}

function table(path: string): string {
  if (!URL_BASE || !SERVICE_KEY) {
    throw new DbError('데이터베이스 설정이 없어요');
  }
  return `${URL_BASE}/rest/v1/assessments${path}`;
}

const headers = () => ({
  apikey: SERVICE_KEY!,
  authorization: `Bearer ${SERVICE_KEY}`,
  'content-type': 'application/json',
});

/** 응답에서 우리가 쓰는 것만 꺼내요. 표 칸이 늘어도 앱은 안 흔들려요. */
function toAssessment(row: Record<string, unknown>): Assessment {
  return {
    id: String(row.id),
    date: String(row.date),
    title: String(row.title),
    subject: row.subject === null || row.subject === undefined ? null : String(row.subject),
    detail: row.detail === null || row.detail === undefined ? null : String(row.detail),
    grades: Array.isArray(row.grades) ? row.grades.map(Number) : [],
    classes: Array.isArray(row.classes) ? row.classes.map(String) : [],
  };
}

export async function listAssessments(
  school: { office: string; code: string },
  from: string,
  to: string,
): Promise<Assessment[]> {
  const q = new URLSearchParams({
    select: 'id,date,title,subject,detail,grades,classes',
    school_office: `eq.${school.office}`,
    school_code: `eq.${school.code}`,
    date: `gte.${from}`,
    order: 'date.asc',
  });
  // 같은 칸에 조건을 두 번 걸어야 해서 따로 붙여요.
  const url = `${table('')}?${q}&date=lte.${to}`;

  const res = await fetch(url, { headers: headers() });
  if (!res.ok) throw new DbError(`수행평가를 읽지 못했어요 (${res.status})`);
  const rows = (await res.json()) as Record<string, unknown>[];
  return rows.map(toAssessment);
}

export async function createAssessment(
  school: { office: string; code: string },
  item: NewAssessment,
): Promise<Assessment> {
  const res = await fetch(table(''), {
    method: 'POST',
    headers: { ...headers(), prefer: 'return=representation' },
    body: JSON.stringify({
      school_office: school.office,
      school_code: school.code,
      date: item.date,
      title: item.title,
      subject: item.subject,
      detail: item.detail,
      grades: item.grades,
      classes: item.classes,
    }),
  });
  if (!res.ok) {
    const detail = await res.text();
    throw new DbError(`수행평가를 담지 못했어요 (${res.status}) ${detail.slice(0, 120)}`);
  }
  const rows = (await res.json()) as Record<string, unknown>[];
  return toAssessment(rows[0]);
}

/** 지운 개수를 돌려줘요. 0이면 그런 수행평가가 없었다는 뜻이에요. */
export async function deleteAssessment(
  school: { office: string; code: string },
  id: string,
): Promise<number> {
  // 학교까지 같이 걸어요. 남의 학교 것을 id만으로 지우면 안 되니까요.
  const q = new URLSearchParams({
    id: `eq.${id}`,
    school_office: `eq.${school.office}`,
    school_code: `eq.${school.code}`,
  });
  const res = await fetch(`${table('')}?${q}`, {
    method: 'DELETE',
    headers: { ...headers(), prefer: 'return=representation' },
  });
  if (!res.ok) throw new DbError(`수행평가를 지우지 못했어요 (${res.status})`);
  const rows = (await res.json()) as unknown[];
  return rows.length;
}
