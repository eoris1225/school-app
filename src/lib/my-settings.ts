import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * 나만의 설정이에요. 남에게 보이지 않고 이 기기에만 담겨요.
 *
 *   과목 바꾸기  NEIS 시간표와 내가 실제로 듣는 과목이 다를 때
 *   알레르기     내가 못 먹는 급식 번호
 *   내 일정      나만 보는 일정
 *
 * 나중에 로그인이 붙으면 계정에 담아서 기기를 바꿔도 따라오게 할 수 있어요.
 * 지금은 기기에만 있어요.
 */

async function read<T>(key: string, fallback: T, ok: (v: unknown) => boolean): Promise<T> {
  try {
    const raw = await AsyncStorage.getItem(key);
    if (!raw) return fallback;
    const v: unknown = JSON.parse(raw);
    return ok(v) ? (v as T) : fallback;
  } catch {
    // 못 읽으면 없는 셈 쳐요. 앱은 계속 돌아가야 하니까요.
    return fallback;
  }
}

async function write(key: string, value: unknown): Promise<void> {
  try {
    await AsyncStorage.setItem(key, JSON.stringify(value));
  } catch {
    // 저장이 안 돼도 이번 실행 동안은 쓸 수 있어요.
  }
}

// ---------------------------------------------------------------- 과목 바꾸기

/**
 * NEIS 시간표에 적힌 과목 -> 내가 실제로 듣는 과목.
 *
 * 선택과목은 반 단위로 등록되지만, 같은 반에서도 학생마다 다른 과목을
 * 듣는 경우가 있어요. 반 시간표에 '지구과학'이 적혀 있어도 나는
 * '역학과 에너지'를 들을 수 있어요.
 *
 * 교시마다가 아니라 과목 이름으로 바꿔요. 한 번 고치면 그 과목이 나오는
 * 모든 교시가 같이 바뀌어요. 매주 같은 걸 여러 번 고칠 필요가 없어요.
 */
export type SubjectSwaps = Record<string, string>;

const SWAPS_KEY = 'my-subject-swaps';

const okSwaps = (v: unknown) =>
  typeof v === 'object' && v !== null && !Array.isArray(v) &&
  Object.values(v as object).every((x) => typeof x === 'string');

export const loadSwaps = () => read<SubjectSwaps>(SWAPS_KEY, {}, okSwaps);
export const saveSwaps = (v: SubjectSwaps) => write(SWAPS_KEY, v);

/** 바꿀 과목이면 바꿔주고, 아니면 그대로 돌려줘요. */
export const applySwap = (subject: string, swaps: SubjectSwaps) => swaps[subject] ?? subject;

// ---------------------------------------------------------------- 알레르기

/** 내가 못 먹는 알레르기 번호들. 1~19예요. */
export type Allergies = number[];

const ALLERGY_KEY = 'my-allergies';

const okAllergies = (v: unknown) =>
  Array.isArray(v) && v.every((n) => Number.isInteger(n) && n >= 1 && n <= 19);

export const loadAllergies = () => read<Allergies>(ALLERGY_KEY, [], okAllergies);
export const saveAllergies = (v: Allergies) => write(ALLERGY_KEY, v);

/** 이 메뉴에 내가 못 먹는 게 들어 있나. 들어 있으면 그 번호들을 돌려줘요. */
export function allergyHits(itemAllergy: number[], mine: Allergies): number[] {
  if (mine.length === 0) return [];
  return itemAllergy.filter((n) => mine.includes(n));
}

// ---------------------------------------------------------------- 내 일정

/** 나만 보는 일정이에요. 선생님이 올린 것과 섞이지 않아요. */
export type MyEvent = {
  id: string;
  /** YYYY-MM-DD */
  date: string;
  title: string;
};

const EVENTS_KEY = 'my-events';

const okEvents = (v: unknown) =>
  Array.isArray(v) &&
  v.every(
    (e) =>
      typeof e === 'object' && e !== null &&
      typeof (e as MyEvent).id === 'string' &&
      typeof (e as MyEvent).date === 'string' &&
      typeof (e as MyEvent).title === 'string',
  );

export const loadMyEvents = () => read<MyEvent[]>(EVENTS_KEY, [], okEvents);
export const saveMyEvents = (v: MyEvent[]) => write(EVENTS_KEY, v);

/** 겹치지 않는 새 id를 만들어요. */
export const newEventId = () => `my-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
