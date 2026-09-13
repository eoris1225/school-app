/**
 * 화면 확인용 임시 데이터예요.
 * 나중에 NEIS API와 Supabase에서 받아온 데이터로 바꿔요.
 */

export type Role = 'student' | 'teacher';

export const WEEKDAYS = ['월', '화', '수', '목', '금'] as const;
export type Weekday = (typeof WEEKDAYS)[number];

// 과목 목록은 교과군 하나로 모았어요. src/lib/subject.ts 의 TEACHABLE 을 쓰세요.
// 여기에 따로 두면 둘이 어긋나요. 실제로 어긋나 있었어요.

/** '2-3' 처럼 "학년-반" 이에요. 학교마다 반 개수가 달라서 목록으로 못 박아둬요. */
export type ClassId = string;

/** '2-3' -> 2 */
export const gradeOf = (c: ClassId) => Number(c.split('-')[0]);
/** '2-3' -> '3' */
export const classOf = (c: ClassId) => c.split('-')[1];

export function classLabel(c: ClassId) {
  const [grade, cls] = c.split('-');
  return `${grade}학년 ${cls}반`;
}

// 교시 시각(몇 시에 종이 치는지)은 여기 없어요. 학교마다 달라서 학교 설정으로
// 뺐어요. src/lib/bells.ts 를 보세요. 예전에는 여기에 박아뒀는데 그 값은
// 어느 학교 것도 아니었어요.


/** NEIS 급식 데이터에 쓰이는 알레르기 번호 */
export const ALLERGENS = [
  '난류', '우유', '메밀', '땅콩', '대두', '밀', '고등어', '게', '새우', '돼지고기',
  '복숭아', '토마토', '아황산류', '호두', '닭고기', '쇠고기', '오징어', '조개류', '잣',
];

export type MealItem = { name: string; allergy: number[] };
export type Meal = { items: MealItem[]; kcal: number };


export type EventKind = 'academic' | 'assessment' | 'personal';

export type SchoolEvent = {
  id: string;
  /** YYYY-MM-DD */
  date: string;
  title: string;
  kind: EventKind;
  /** 교과군이에요. '수학', '외국어' 처럼요. */
  subject?: string;
  /** 준비물이나 범위 같은 자세한 안내. 선생님이 적어두면 눌러서 볼 수 있어요. */
  detail?: string;
  /** 해당되는 학년들. 비어 있으면 전 학년이에요. */
  grades: number[];
  /** 해당되는 반들. 비어 있으면 고른 학년 전체예요. */
  classes: string[];
  /**
   * 이 일정을 올린 선생님. NEIS 학사일정과 예전에 올라간 것은 없어요.
   * 이게 있어야 "내가 올린 것"만 골라 보고, 남의 것은 못 지우게 할 수 있어요.
   */
  by?: { id: string | null; name: string };
};

/** '전체' / '2·3학년' / '2학년 1·3반' 처럼 누구에게 보이는지 한 줄로 적어요. */
export function targetLabel(e: Pick<SchoolEvent, 'grades' | 'classes'>): string {
  if (e.grades.length === 0) return '전체';
  const grade = `${e.grades.join('·')}학년`;
  if (e.classes.length === 0) return grade;
  // 반을 '2-1' 처럼 학년까지 적어뒀으면 그대로 보여줘요. 그게 더 정확해요.
  if (e.classes.some(isRoomId)) return e.classes.join('·');
  return `${grade} ${e.classes.join('·')}반`;
}

/** '2-1' 처럼 학년까지 붙은 반 이름인지 */
const isRoomId = (c: string) => c.includes('-');

/**
 * 이 일정이 나에게 보이는 것인지.
 *
 * 반을 적는 방법이 두 가지예요.
 *   '1'   학년 칸과 짝지어 봐요. 2학년에 1·3반이면 2-1과 2-3이에요.
 *   '2-1' 그 반 하나예요.
 *
 * 두 번째가 나중에 생겼어요. 1-5와 2-1에만 들어가는 선생님이 첫 번째 방법으로는
 * 그걸 적을 수가 없거든요. 학년 [1,2] × 반 [5,1] 이 되면서 1-1과 2-5까지
 * 딸려 들어가요. 예전에 올라간 일정도 그대로 보여야 해서 둘 다 봐요.
 */
export function showsTo(e: Pick<SchoolEvent, 'grades' | 'classes'>, grade: number, cls: string): boolean {
  if (e.grades.length > 0 && !e.grades.includes(grade)) return false;
  if (e.classes.length === 0) return true;
  return e.classes.some((c) => (isRoomId(c) ? c === `${grade}-${cls}` : c === cls));
}

/**
 * 수행평가는 NEIS에 없어서 선생님이 앱에서 직접 등록해요.
 * 처음에는 비어 있어요. 아무도 등록하지 않은 걸 등록된 척하면 안 되니까요.
 * 나중에 Supabase 테이블로 옮길 자리예요.
 */
export const INITIAL_EVENTS: SchoolEvent[] = [];
// 쪽지 모양은 서버가 정해요. src/lib/api.ts 의 Thread 를 쓰세요.
