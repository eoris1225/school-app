import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * 나만의 설정이에요. 남에게 보이지 않아요.
 *
 *   과목 바꾸기  NEIS 시간표와 내가 실제로 듣는 과목이 다를 때
 *   알레르기     내가 못 먹는 급식 번호
 *   내 일정      나만 보는 일정
 *   테마 색·밝기 고른 색과 화면 밝기
 *
 * 여기는 **기기 저장소**예요. 로그인하면 이것들이 계정에도 같이 담겨요
 * (`saveMySettings`). 그래서 폰을 바꿔도 따라와요.
 *
 * 그런데도 기기에 계속 담는 이유가 있어요.
 *   1. 로그인 안 한 사람도 앱을 멀쩡히 써야 해요
 *   2. 인터넷이 끊겨도 급식 알레르기와 달력이 보여야 해요
 *   3. 앱을 켜자마자 그릴 수 있어요. 계정은 한 번 다녀와야 하거든요
 *
 * 둘 중 누가 이기는지는 `app-state.tsx` 의 pull 이 한 곳에서 정해요.
 * 여기서 정하려 들면 안 돼요.
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
/**
 * 내가 실제로 듣는 과목. 열쇠는 "월-6" 처럼 요일과 교시예요.
 *
 * 예전에는 과목 이름을 열쇠로 썼어요. "역학과 에너지"를 한 번 바꾸면 그
 * 이름이 나오는 모든 교시가 같이 바뀌었죠. 편해 보였는데 틀린 방식이었어요.
 *
 * NEIS는 선택 블록에 대표 과목 하나만 적어요. 서일여고 2학년 6반 월요일이
 * 그래요. 실제로는 6교시가 선택B, 7교시가 선택C인데 NEIS는 둘 다
 * "역학과 에너지"로 줘요. 서로 다른 시간인데 이름이 같은 거예요.
 * 이름으로 묶으면 한쪽을 고칠 때 다른 쪽까지 잘못 바뀌어요.
 *
 * 그래서 교시마다 따로 담아요. 여러 교시를 한 번에 바꾸고 싶으면 바꾸는
 * 화면에서 골라서 하면 돼요.
 */
export type SubjectSwaps = Record<string, string>;

/** 교시 하나를 가리키는 열쇠예요. */
export const slotKey = (day: string, period: number) => `${day}-${period}`;

// 열쇠 모양이 바뀌어서 이름을 v2로 올렸어요. 예전에 저장한 건 그냥 안 읽어요.
// 잘못 읽으면 엉뚱한 교시가 바뀐 것처럼 보여서 더 헷갈려요.
const SWAPS_KEY = 'my-subject-swaps-v2';

const okSwaps = (v: unknown) =>
  typeof v === 'object' && v !== null && !Array.isArray(v) &&
  Object.values(v as object).every((x) => typeof x === 'string');

export const loadSwaps = () => read<SubjectSwaps>(SWAPS_KEY, {}, okSwaps);
export const saveSwaps = (v: SubjectSwaps) => write(SWAPS_KEY, v);

/** 그 교시를 내가 듣는 과목으로 바꿔요. 안 바꿨으면 그대로 돌려줘요. */
export const applySwap = (day: string, period: number, subject: string, swaps: SubjectSwaps) =>
  swaps[slotKey(day, period)] ?? subject;

// ---------------------------------------------------------------- 처음 설정

/**
 * 가입하고 나서 안내를 한 번 봤는지.
 *
 * 건너뛰어도 봤다고 표시해요. 귀찮아서 넘긴 사람에게 매번 다시 물으면
 * 더 귀찮아요. 넘긴 것들은 내 정보에서 언제든 할 수 있어요.
 */
const SETUP_KEY = 'my-setup-seen';

export const loadSetupSeen = () => read<boolean>(SETUP_KEY, false, (v) => typeof v === 'boolean');
export const saveSetupSeen = () => write(SETUP_KEY, true);

// ---------------------------------------------------------------- 테마

/**
 * 고른 테마 색과 밝기예요.
 *
 * 여태 저장을 안 하고 있었어요. 색을 골라도 앱을 껐다 켜면 기본색으로
 * 돌아갔어요. 고르는 화면까지 만들어 놓고 안 남긴 건 반쪽이에요.
 */
const ACCENT_KEY = 'my-accent';
const SCHEME_KEY = 'my-scheme-pref';

const okString = (v: unknown) => typeof v === 'string';

export const loadAccent = () => read<string>(ACCENT_KEY, '', okString);
export const saveAccent = (v: string) => write(ACCENT_KEY, v);

export const loadSchemePref = () => read<string>(SCHEME_KEY, '', okString);
export const saveSchemePref = (v: string) => write(SCHEME_KEY, v);

// ---------------------------------------------------------------- 글자 크기

/**
 * 글자 크기 배율이에요. 화면에 적힌 크기에 이걸 곱해요.
 *
 * **이건 계정에 안 담아요.** 일부러 그랬어요. 같은 사람이라도 폰과 태블릿에서
 * 보기 편한 크기가 달라요. 폰에서 크게 해뒀다고 태블릿까지 커지면 그게 더
 * 불편해요. 기기마다 따로 정하는 게 맞는 값이에요.
 *
 * 크기를 새로 만드는 게 아니라 있는 걸 곱하는 거예요. DESIGN.md 의 여섯 단계
 * (12 / 13 / 15 / 18 / 24 / 32)는 그대로 있고 비율도 그대로예요.
 */
export const TEXT_SCALES = [
  { value: 0.9, label: '작게' },
  { value: 1, label: '보통' },
  { value: 1.15, label: '크게' },
  { value: 1.3, label: '아주 크게' },
] as const;

export const DEFAULT_TEXT_SCALE = 1;

const TEXT_KEY = 'my-text-scale';

const okScale = (v: unknown) => typeof v === 'number' && TEXT_SCALES.some((s) => s.value === v);

export const loadTextScale = () => read<number>(TEXT_KEY, DEFAULT_TEXT_SCALE, okScale);
export const saveTextScale = (v: number) => write(TEXT_KEY, v);

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
