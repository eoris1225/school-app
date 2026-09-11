/**
 * 화면 확인용 임시 데이터예요.
 * 나중에 NEIS API와 Supabase에서 받아온 데이터로 바꿔요.
 */

export type Role = 'student' | 'teacher';

export const WEEKDAYS = ['월', '화', '수', '목', '금'] as const;
export type Weekday = (typeof WEEKDAYS)[number];

/**
 * 화면 확인용 '지금' 시각이에요. (2026년 9월 10일 목요일 오전 10시 55분, 3교시 수업 중)
 * 실제 서비스에서는 new Date()로 바꿔요.
 */
export const DEMO_NOW = new Date(2026, 8, 10, 10, 55);

export const SCHOOL = { name: '한빛고등학교' };

export const SUBJECTS = ['국어', '수학', '영어', '과학', '사회', '한국사', '정보', '체육', '음악', '미술'] as const;
export type Subject = (typeof SUBJECTS)[number];

export type ClassId = '2-1' | '2-2' | '2-3' | '2-4';
export const CLASSES: ClassId[] = ['2-1', '2-2', '2-3', '2-4'];

export function classLabel(c: ClassId) {
  const [grade, cls] = c.split('-');
  return `${grade}학년 ${cls}반`;
}

export const STUDENT = { name: '김하은', initial: '하', cls: '2-3' as ClassId, number: 12 };

export const TEACHER = {
  name: '박지현',
  initial: '박',
  subjects: ['수학'] as Subject[],
  homeroom: '2-3' as ClassId,
  /** 이 선생님이 수학을 가르치는 반 */
  classes: ['2-1', '2-3'] as ClassId[],
};

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

const BASE_WEEK: Record<Weekday, string[]> = {
  월: ['국어', '수학', '영어', '체육', '과학', '한국사', '자율활동'],
  화: ['수학', '국어', '사회', '음악', '영어', '과학', '동아리'],
  수: ['영어', '수학', '국어', '미술', '정보', '체육', '자율활동'],
  목: ['과학', '사회', '수학', '국어', '영어', '체육', '진로'],
  금: ['정보', '영어', '국어', '수학', '사회', '미술', '동아리'],
};

/** 다른 반 시간표를 흉내 내려고 요일과 순서를 섞어요. (임시 데이터 전용) */
function shuffledWeek(shift: number): Record<Weekday, string[]> {
  const out = {} as Record<Weekday, string[]>;
  WEEKDAYS.forEach((day, i) => {
    const core = BASE_WEEK[WEEKDAYS[(i + shift) % 5]].slice(0, 6);
    const n = shift % 6;
    out[day] = [...core.slice(n), ...core.slice(0, n), BASE_WEEK[day][6]];
  });
  return out;
}

export const TIMETABLES: Record<ClassId, Record<Weekday, string[]>> = {
  '2-1': shuffledWeek(2),
  '2-2': shuffledWeek(1),
  '2-3': BASE_WEEK,
  '2-4': shuffledWeek(3),
};

export function teacherFor(subject: string, cls: ClassId): string {
  if (subject === '수학') return TEACHER.classes.includes(cls) ? '박지현 선생님' : '최윤호 선생님';
  if (subject in SUBJECT_TEACHERS) return `${SUBJECT_TEACHERS[subject as Subject][0]} 선생님`;
  if (subject === '진로') return '최지원 선생님';
  if (subject === '자율활동') return '담임 선생님';
  return '';
}

/** NEIS 급식 데이터에 쓰이는 알레르기 번호 */
export const ALLERGENS = [
  '난류', '우유', '메밀', '땅콩', '대두', '밀', '고등어', '게', '새우', '돼지고기',
  '복숭아', '토마토', '아황산류', '호두', '닭고기', '쇠고기', '오징어', '조개류', '잣',
];

export type MealItem = { name: string; allergy: number[] };
export type Meal = { items: MealItem[]; kcal: number };

export const MEAL_DATES: Record<Weekday, string> = {
  월: '2026-09-07', 화: '2026-09-08', 수: '2026-09-09', 목: '2026-09-10', 금: '2026-09-11',
};

export const MEALS: Record<Weekday, { lunch: Meal; dinner: Meal | null }> = {
  월: {
    lunch: {
      kcal: 812,
      items: [
        { name: '잡곡밥', allergy: [] },
        { name: '쇠고기미역국', allergy: [5, 6, 16] },
        { name: '제육볶음', allergy: [5, 6, 10, 13] },
        { name: '계란말이', allergy: [1] },
        { name: '배추김치', allergy: [9] },
        { name: '요구르트', allergy: [2] },
      ],
    },
    dinner: {
      kcal: 760,
      items: [
        { name: '김치볶음밥', allergy: [1, 5, 6, 10] },
        { name: '유부장국', allergy: [5, 6] },
        { name: '떡갈비', allergy: [5, 6, 10, 16] },
        { name: '오이무침', allergy: [] },
      ],
    },
  },
  화: {
    lunch: {
      kcal: 768,
      items: [
        { name: '흑미밥', allergy: [] },
        { name: '콩나물국', allergy: [5] },
        { name: '고등어구이', allergy: [7] },
        { name: '어묵볶음', allergy: [1, 5, 6] },
        { name: '깍두기', allergy: [9] },
        { name: '사과', allergy: [] },
      ],
    },
    dinner: {
      kcal: 802,
      items: [
        { name: '짜장덮밥', allergy: [5, 6, 10] },
        { name: '계란국', allergy: [1, 5] },
        { name: '군만두', allergy: [5, 6, 10] },
        { name: '단무지', allergy: [] },
        { name: '포도', allergy: [] },
      ],
    },
  },
  수: {
    lunch: {
      kcal: 845,
      items: [
        { name: '카레라이스', allergy: [2, 5, 6, 10, 12] },
        { name: '두부된장국', allergy: [5, 6] },
        { name: '치킨너겟', allergy: [1, 2, 5, 6, 15] },
        { name: '브로콜리무침', allergy: [] },
        { name: '배추김치', allergy: [9] },
      ],
    },
    dinner: {
      kcal: 735,
      items: [
        { name: '잔치국수', allergy: [1, 5, 6] },
        { name: '주먹밥', allergy: [5] },
        { name: '떡꼬치', allergy: [5, 6, 12] },
        { name: '배추김치', allergy: [9] },
      ],
    },
  },
  목: {
    lunch: {
      kcal: 830,
      items: [
        { name: '흰밥', allergy: [] },
        { name: '순두부찌개', allergy: [5, 6, 18] },
        { name: '돈까스', allergy: [1, 2, 5, 6, 10, 12] },
        { name: '콘샐러드', allergy: [1, 2] },
        { name: '단무지', allergy: [] },
        { name: '오렌지', allergy: [] },
      ],
    },
    dinner: {
      kcal: 790,
      items: [
        { name: '참치마요덮밥', allergy: [1, 5, 6] },
        { name: '미소장국', allergy: [5, 6] },
        { name: '떡볶이', allergy: [5, 6, 12] },
        { name: '배추김치', allergy: [9] },
      ],
    },
  },
  금: {
    lunch: {
      kcal: 795,
      items: [
        { name: '비빔밥', allergy: [1, 5, 6] },
        { name: '계란국', allergy: [1, 5] },
        { name: '잡채', allergy: [5, 6, 10] },
        { name: '미니핫도그', allergy: [1, 2, 5, 6, 10] },
        { name: '깍두기', allergy: [9] },
        { name: '식혜', allergy: [] },
      ],
    },
    dinner: null,
  },
};

export type EventKind = 'academic' | 'assessment';

export type SchoolEvent = {
  id: string;
  /** YYYY-MM-DD */
  date: string;
  title: string;
  kind: EventKind;
  subject?: Subject;
  /** '전체', '2학년', '2학년 3반' 처럼 누구에게 보이는 일정인지 */
  target: string;
};

export const INITIAL_EVENTS: SchoolEvent[] = [
  { id: 'e1', date: '2026-09-03', title: '9월 전국연합학력평가', kind: 'academic', target: '전체' },
  { id: 'e2', date: '2026-09-10', title: '영어 말하기 수행평가', kind: 'assessment', subject: '영어', target: '2학년' },
  { id: 'e3', date: '2026-09-14', title: '학부모 상담주간 시작', kind: 'academic', target: '전체' },
  { id: 'e4', date: '2026-09-16', title: '이차함수 활용 수행평가', kind: 'assessment', subject: '수학', target: '2학년' },
  { id: 'e5', date: '2026-09-18', title: '탐구 보고서 제출', kind: 'assessment', subject: '과학', target: '2학년 3반' },
  { id: 'e6', date: '2026-09-22', title: '체육대회', kind: 'academic', target: '전체' },
  { id: 'e7', date: '2026-09-30', title: '서평 쓰기 수행평가', kind: 'assessment', subject: '국어', target: '2학년' },
  { id: 'e8', date: '2026-10-09', title: '한글날', kind: 'academic', target: '전체' },
  { id: 'e9', date: '2026-10-13', title: '2학기 중간고사 시작', kind: 'academic', target: '전체' },
];

export type Message = { id: string; from: Role; author: string; text: string; time: string };

export type Thread = {
  id: string;
  subject: Subject;
  student: { name: string; cls: ClassId };
  messages: Message[];
  unreadStudent: boolean;
  unreadTeacher: boolean;
};

/** 최신 쪽지가 앞에 오도록 정렬돼 있어요. */
export const INITIAL_THREADS: Thread[] = [
  {
    id: 't1',
    subject: '수학',
    student: { name: '김하은', cls: '2-3' },
    messages: [
      { id: 'm1', from: 'student', author: '김하은', text: '이차함수 실생활 활용 문제 4번 풀이를 잘 모르겠어요.', time: '09:12' },
      { id: 'm2', from: 'teacher', author: '박지현', text: '꼭짓점 구하는 식부터 다시 확인해볼까요? 점심시간에 교무실로 와도 좋아요.', time: '09:40' },
    ],
    unreadStudent: true,
    unreadTeacher: false,
  },
  {
    id: 't2',
    subject: '수학',
    student: { name: '이도윤', cls: '2-1' },
    messages: [
      { id: 'm3', from: 'student', author: '이도윤', text: '수행평가 보고서는 분량 제한이 있나요? A4 두 장이 넘어도 괜찮을까요?', time: '08:50' },
    ],
    unreadStudent: false,
    unreadTeacher: true,
  },
  {
    id: 't3',
    subject: '수학',
    student: { name: '최서연', cls: '2-3' },
    messages: [
      { id: 'm4', from: 'student', author: '최서연', text: '모의고사 21번 해설에서 두 번째 줄부터 이해가 안 돼요.', time: '07:58' },
    ],
    unreadStudent: false,
    unreadTeacher: true,
  },
  {
    id: 't4',
    subject: '영어',
    student: { name: '김하은', cls: '2-3' },
    messages: [
      { id: 'm5', from: 'student', author: '김하은', text: '단어 시험 범위를 다시 알려주실 수 있나요?', time: '어제' },
    ],
    unreadStudent: false,
    unreadTeacher: true,
  },
  {
    id: 't5',
    subject: '수학',
    student: { name: '정우진', cls: '2-1' },
    messages: [
      { id: 'm6', from: 'student', author: '정우진', text: '다음 주 보충 수업은 몇 시에 시작하나요?', time: '어제' },
      { id: 'm7', from: 'teacher', author: '박지현', text: '화요일 7교시 끝나고 바로 시작해요. 3층 수학실로 오세요.', time: '어제' },
    ],
    unreadStudent: false,
    unreadTeacher: false,
  },
  {
    id: 't6',
    subject: '과학',
    student: { name: '김하은', cls: '2-3' },
    messages: [
      { id: 'm8', from: 'student', author: '김하은', text: '탐구 보고서에 사진을 넣어도 되나요?', time: '월요일' },
      { id: 'm9', from: 'teacher', author: '정민재', text: '네, 사진 아래에 출처만 적어주면 괜찮아요.', time: '월요일' },
    ],
    unreadStudent: false,
    unreadTeacher: false,
  },
];
