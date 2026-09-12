/**
 * NEIS 열린 API를 부르고, 앱이 바로 쓸 모양으로 바꿔주는 곳이에요.
 *
 * NEIS 응답은 다루기 까다로워요.
 *   - 메뉴가 "카레라이스 (2.5.6)<br/>미니우동 (1.2.5)" 처럼 한 덩어리로 와요
 *   - 날짜가 "20260911" 이에요
 *   - 데이터가 없으면 실패가 아니라 INFO-200 이라는 성공 응답이 와요
 * 이런 걸 전부 여기서 걷어내고, 화면이 쓰는 모양만 밖으로 내보내요.
 */

const HUB = 'https://open.neis.go.kr/hub';

/** NEIS가 "정상 처리"로 주는 코드 */
const OK = 'INFO-000';
/** 조건에 맞는 데이터가 없을 때. 실패가 아니라 빈 결과예요. */
const EMPTY = 'INFO-200';

export type School = {
  /** 시도교육청코드. 서일여고는 G10 (대전) */
  office: string;
  /** 표준학교코드. 서일여고는 7430062 */
  code: string;
};

export class NeisError extends Error {
  constructor(readonly code: string, message: string) {
    super(message);
    this.name = 'NeisError';
  }
}

/** NEIS 응답에서 행 목록만 꺼내요. 데이터가 없으면 빈 배열이에요. */
function rowsOf(body: unknown, service: string): Record<string, string>[] {
  const doc = body as Record<string, unknown>;

  // 키가 틀렸거나 서비스 이름이 틀리면 RESULT만 담겨서 와요.
  const bare = doc?.RESULT as { CODE?: string; MESSAGE?: string } | undefined;
  if (bare?.CODE) {
    if (bare.CODE === EMPTY) return [];
    throw new NeisError(bare.CODE, bare.MESSAGE ?? 'NEIS 오류');
  }

  const wrap = doc?.[service] as unknown[] | undefined;
  if (!Array.isArray(wrap)) {
    throw new NeisError('SHAPE', `${service} 응답 모양이 예상과 달라요`);
  }

  const head = (wrap[0] as { head?: unknown[] })?.head ?? [];
  const result = (head[1] as { RESULT?: { CODE: string; MESSAGE: string } })?.RESULT;
  if (result && result.CODE !== OK) {
    if (result.CODE === EMPTY) return [];
    throw new NeisError(result.CODE, result.MESSAGE);
  }

  return ((wrap[1] as { row?: Record<string, string>[] })?.row ?? []);
}

/**
 * NEIS 한 서비스를 부르고 행 목록을 돌려줘요.
 * 인증키가 없으면 NEIS가 응답을 5행에서 잘라버리니 키는 사실상 필수예요.
 */
async function call(
  service: string,
  params: Record<string, string | number | undefined>,
  key: string | undefined,
): Promise<Record<string, string>[]> {
  const q = new URLSearchParams({ Type: 'json', pSize: '1000' });
  if (key) q.set('KEY', key);
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== '') q.set(k, String(v));
  }

  // 헤더를 붙이지 말아요. accept: application/json 을 보내면
  // NEIS가 JSON 대신 500 오류 페이지를 돌려줘요. (직접 당해보고 알아냈어요)
  const res = await fetch(`${HUB}/${service}?${q}`);
  if (!res.ok) {
    throw new NeisError(`HTTP-${res.status}`, `NEIS가 ${res.status}로 답했어요`);
  }
  return rowsOf(await res.json(), service);
}

// ---------------------------------------------------------------- 작은 변환기

/** "20260911" -> "2026-09-11" */
export function toIso(ymd: string): string {
  return `${ymd.slice(0, 4)}-${ymd.slice(4, 6)}-${ymd.slice(6, 8)}`;
}

/** "2026-09-11" 또는 "20260911" -> "20260911" */
export function toYmd(date: string): string {
  return date.replace(/-/g, '');
}

/** "875.5 Kcal" -> 876. 숫자가 없으면 null. */
export function toKcal(text: string | undefined): number | null {
  const n = Number.parseFloat(text ?? '');
  return Number.isFinite(n) ? Math.round(n) : null;
}

/** NEIS가 <br/>로 이어 붙인 여러 줄을 잘라요. */
export function splitLines(text: string | undefined): string[] {
  if (!text) return [];
  return text
    .split(/<br\s*\/?>/i)
    .map((s) => s.replace(/\s+/g, ' ').trim())
    .filter(Boolean);
}

/**
 * "카레라이스 (2.5.6.10)" -> { name: "카레라이스", allergy: [2,5,6,10] }
 *
 * 알레르기 번호는 1~19예요. 괄호 안이 숫자와 점으로만 돼 있을 때만 번호로 봐요.
 *
 * 이름 앞뒤의 기호도 털어내요. NEIS에는 ".토마토스파게티" 처럼 점이 앞에 붙거나
 * "미니우동*" 처럼 별표가 뒤에 붙은 메뉴가 섞여 있어요. 가운데 별표는
 * "함박스테이크*데미소스" 처럼 뜻이 있으니 그대로 둬요.
 */
const trimName = (s: string) => s.replace(/^[.*\s]+/, '').replace(/[*\s]+$/, '');

export function parseDish(line: string): { name: string; allergy: number[] } {
  const m = line.match(/^(.*?)\s*\(([\d.\s]+)\)\s*$/);
  if (!m) return { name: trimName(line), allergy: [] };

  const allergy = m[2]
    .split('.')
    .map((s) => Number.parseInt(s.trim(), 10))
    .filter((n) => Number.isInteger(n) && n >= 1 && n <= 19);

  return { name: trimName(m[1]), allergy };
}

/** "쇠고기 : 국내산<br/>쌀 : 국내산" -> [{ item: "쇠고기", from: "국내산" }] */
export function parsePairs(text: string | undefined): { item: string; from: string }[] {
  return splitLines(text)
    .map((line) => {
      const i = line.indexOf(':');
      if (i < 0) return null;
      const item = line.slice(0, i).trim();
      const from = line.slice(i + 1).trim();
      return item && from ? { item, from } : null;
    })
    .filter((v): v is { item: string; from: string } => v !== null);
}

// ---------------------------------------------------------------- 바깥에 주는 모양

export type Meal = {
  date: string;
  /** 중식이면 lunch, 석식이면 dinner. NEIS에 조식은 안 올라와요. */
  type: 'lunch' | 'dinner';
  items: { name: string; allergy: number[] }[];
  kcal: number | null;
  /** 급식 인원 */
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

export type Event = {
  date: string;
  title: string;
  detail: string;
  /** 이 일정이 해당되는 학년들. 전 학년이면 [1,2,3] */
  grades: number[];
  /** 토요휴업일처럼 수업이 없는 날이면 true */
  holiday: boolean;
};

export type ClassRoom = { grade: number; cls: string };

const MEAL_TYPE: Record<string, Meal['type']> = { '2': 'lunch', '3': 'dinner' };

// ---------------------------------------------------------------- 화면별 조회

export async function fetchMeals(
  school: School,
  from: string,
  to: string,
  key?: string,
): Promise<Meal[]> {
  const rows = await call(
    'mealServiceDietInfo',
    {
      ATPT_OFCDC_SC_CODE: school.office,
      SD_SCHUL_CODE: school.code,
      MLSV_FROM_YMD: toYmd(from),
      MLSV_TO_YMD: toYmd(to),
    },
    key,
  );

  return rows
    // 조식(1)은 서일여고에 없지만, 있는 학교를 만나도 깨지지 않게 걸러요.
    .filter((r) => MEAL_TYPE[r.MMEAL_SC_CODE])
    .map((r) => ({
      date: toIso(r.MLSV_YMD),
      type: MEAL_TYPE[r.MMEAL_SC_CODE],
      items: splitLines(r.DDISH_NM).map(parseDish),
      kcal: toKcal(r.CAL_INFO),
      people: toKcal(r.MLSV_FGR),
      origin: parsePairs(r.ORPLC_INFO),
      nutrition: parsePairs(r.NTR_INFO),
    }))
    .sort((a, b) => a.date.localeCompare(b.date) || a.type.localeCompare(b.type));
}

export async function fetchLessons(
  school: School,
  opts: { year: number; term: number; grade: number; cls: string; from: string; to: string },
  key?: string,
): Promise<Lesson[]> {
  const rows = await call(
    'hisTimetable',
    {
      ATPT_OFCDC_SC_CODE: school.office,
      SD_SCHUL_CODE: school.code,
      AY: opts.year,
      SEM: opts.term,
      GRADE: opts.grade,
      CLASS_NM: opts.cls,
      TI_FROM_YMD: toYmd(opts.from),
      TI_TO_YMD: toYmd(opts.to),
    },
    key,
  );

  return rows
    .map((r) => ({
      date: toIso(r.ALL_TI_YMD),
      grade: Number(r.GRADE),
      cls: r.CLASS_NM,
      period: Number(r.PERIO),
      subject: r.ITRT_CNTNT.trim(),
    }))
    .sort((a, b) => a.date.localeCompare(b.date) || a.period - b.period);
}

/** "Y"면 그 학년 해당. "*"나 빈 값은 그 학년이 아예 없는 학교라는 뜻이에요. */
function gradesOf(row: Record<string, string>): number[] {
  const flags = [row.ONE_GRADE_EVENT_YN, row.TW_GRADE_EVENT_YN, row.THREE_GRADE_EVENT_YN];
  return flags.map((f, i) => (f === 'Y' ? i + 1 : 0)).filter((n) => n > 0);
}

export async function fetchEvents(
  school: School,
  from: string,
  to: string,
  key?: string,
): Promise<Event[]> {
  const rows = await call(
    'SchoolSchedule',
    {
      ATPT_OFCDC_SC_CODE: school.office,
      SD_SCHUL_CODE: school.code,
      AA_FROM_YMD: toYmd(from),
      AA_TO_YMD: toYmd(to),
    },
    key,
  );

  return rows
    .map((r) => ({
      date: toIso(r.AA_YMD),
      title: r.EVENT_NM.trim(),
      detail: (r.EVENT_CNTNT ?? '').trim(),
      grades: gradesOf(r),
      holiday: (r.SBTR_DD_SC_NM ?? '') !== '' && r.SBTR_DD_SC_NM !== '해당없음',
    }))
    .sort((a, b) => a.date.localeCompare(b.date) || a.title.localeCompare(b.title));
}

/**
 * 그 학교에서 실제로 가르치는 과목 이름을 전부 모아요.
 *
 * 선생님이 담당 과목을 고를 때 써요. 우리가 목록을 박아두면 학교가 새로
 * 만든 과목은 영영 못 골라요. 그 학교 시간표에 있는 이름을 그대로 줘요.
 *
 * 학년·반을 빼고 한 번만 불러요. 한 주치가 768줄쯤 되는데 pSize가 1000이라
 * 한 번에 다 와요. 반마다 따로 부르면 스물네 번이에요.
 *
 * 수업이 아닌 것(자율활동, 추석 같은 것)은 빼요. 맡을 수 있는 과목이 아니에요.
 */
export async function fetchSubjects(
  school: School,
  opts: { year: number; term: number; from: string; to: string },
  key?: string,
): Promise<string[]> {
  const rows = await call(
    'hisTimetable',
    {
      ATPT_OFCDC_SC_CODE: school.office,
      SD_SCHUL_CODE: school.code,
      AY: opts.year,
      SEM: opts.term,
      TI_FROM_YMD: toYmd(opts.from),
      TI_TO_YMD: toYmd(opts.to),
    },
    key,
  );

  // 창체와 휴일은 과목이 아니에요. 여기서 거르면 앱이 또 거를 필요가 없어요.
  const SKIP = /자율|자치|동아리|진로활동|봉사|창의적|학급활동|학교스포츠클럽|추석|설날|개교|방학|휴업|공휴일|신정|어린이날|현충일|광복절|개천절|한글날|성탄/;

  const seen = new Set<string>();
  for (const r of rows) {
    const name = trimName(r.ITRT_CNTNT ?? '');
    if (!name || SKIP.test(name)) continue;
    seen.add(name);
  }
  return [...seen].sort((a, b) => a.localeCompare(b, 'ko'));
}

export async function fetchClasses(
  school: School,
  year: number,
  key?: string,
): Promise<ClassRoom[]> {
  const rows = await call(
    'classInfo',
    { ATPT_OFCDC_SC_CODE: school.office, SD_SCHUL_CODE: school.code, AY: year },
    key,
  );

  // 학기마다 같은 반이 한 번씩 들어 있어서 중복을 걷어내요.
  const seen = new Map<string, ClassRoom>();
  for (const r of rows) {
    const item = { grade: Number(r.GRADE), cls: r.CLASS_NM };
    seen.set(`${item.grade}-${item.cls}`, item);
  }

  return [...seen.values()].sort(
    (a, b) => a.grade - b.grade || a.cls.localeCompare(b.cls, 'ko', { numeric: true }),
  );
}

export async function findSchool(name: string, key?: string) {
  const rows = await call('schoolInfo', { SCHUL_NM: name }, key);
  return rows.map((r) => ({
    office: r.ATPT_OFCDC_SC_CODE,
    officeName: r.ATPT_OFCDC_SC_NM,
    code: r.SD_SCHUL_CODE,
    name: r.SCHUL_NM,
    kind: r.SCHUL_KND_SC_NM,
    address: r.ORG_RDNMA,
    homepage: r.HMPG_ADRES,
  }));
}
