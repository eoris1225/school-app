/**
 * 화면 확인용 임시 데이터예요.
 * 나중에 NEIS API와 Supabase에서 받아온 데이터로 바꿔요.
 */

export type Role = 'student' | 'teacher';

export const WEEKDAYS = ['월', '화', '수', '목', '금'] as const;
export type Weekday = (typeof WEEKDAYS)[number];

export const SUBJECTS = ['국어', '수학', '영어', '과학', '사회', '한국사', '정보', '체육', '음악', '미술'] as const;
export type Subject = (typeof SUBJECTS)[number];

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

/** 과목별 선생님. 학생이 과목을 골라 질문하면 이 선생님들께 쪽지가 가요. */
export const SUBJECT_TEACHERS: Record<Subject, string[]> = {
  국어: ['이수진', '장민호'],
  수학: ['박지현', '최윤호'],
  영어: ['김도현'],
  과학: ['정민재', '윤소희'],
  사회: ['한서영'],
  한국사: ['오세훈'],
  정보: ['강하늘'],
  체육: ['윤태호'],
  음악: ['서지우'],
  미술: ['문가은'],
};

export const BELL = [
  { period: 1, start: '08:40', end: '09:30' },
  { period: 2, start: '09:40', end: '10:30' },
  { period: 3, start: '10:40', end: '11:30' },
  { period: 4, start: '11:40', end: '12:30' },
  { period: 5, start: '13:30', end: '14:20' },
  { period: 6, start: '14:30', end: '15:20' },
  { period: 7, start: '15:30', end: '16:20' },
];

export const LUNCH = { start: '12:30', end: '13:30', afterPeriod: 4 };


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
  subject?: Subject;
  /** 해당되는 학년들. 비어 있으면 전 학년이에요. */
  grades: number[];
  /** 해당되는 반들. 비어 있으면 고른 학년 전체예요. */
  classes: string[];
};

/** '전체' / '2·3학년' / '2학년 1·3반' 처럼 누구에게 보이는지 한 줄로 적어요. */
export function targetLabel(e: Pick<SchoolEvent, 'grades' | 'classes'>): string {
  if (e.grades.length === 0) return '전체';
  const grade = `${e.grades.join('·')}학년`;
  return e.classes.length === 0 ? grade : `${grade} ${e.classes.join('·')}반`;
}

/** 이 일정이 나에게 보이는 것인지. 학년과 반이 둘 다 맞아야 해요. */
export function showsTo(e: Pick<SchoolEvent, 'grades' | 'classes'>, grade: number, cls: string): boolean {
  if (e.grades.length > 0 && !e.grades.includes(grade)) return false;
  if (e.classes.length > 0 && !e.classes.includes(cls)) return false;
  return true;
}

/**
 * 수행평가는 NEIS에 없어서 선생님이 앱에서 직접 등록해요.
 * 처음에는 비어 있어요. 아무도 등록하지 않은 걸 등록된 척하면 안 되니까요.
 * 나중에 Supabase 테이블로 옮길 자리예요.
 */
export const INITIAL_EVENTS: SchoolEvent[] = [];
export type Message = { id: string; from: Role; author: string; text: string; time: string };

export type Thread = {
  id: string;
  subject: Subject;
  student: { name: string; cls: ClassId };
  messages: Message[];
  unreadStudent: boolean;
  unreadTeacher: boolean;
};

/**
 * 쪽지는 아직 이 기기 안에서만 오가요. 서버에 올리는 건 다음에 만들어요.
 * 예전에는 화면 확인용으로 가짜 학생(김하은)의 쪽지가 들어 있었는데,
 * 이제 로그인한 사람 이름으로 걸러내서 아무한테도 안 보여요. 그래서 비웠어요.
 */
export const INITIAL_THREADS: Thread[] = [];
