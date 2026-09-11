import AsyncStorage from '@react-native-async-storage/async-storage';

import type { SchoolInfo } from '@/lib/api';

/**
 * 내가 고른 학교와 반이에요. 앱을 껐다 켜도 남아 있어요.
 *
 * 학교 코드를 들고 있어야 서버에 "어느 학교"를 물어볼 수 있어요.
 * 이름은 화면에 보여주려고 같이 담아둬요.
 */
export type MySchool = {
  office: string;
  officeName: string;
  code: string;
  name: string;
  grade: number;
  cls: string;
};

const KEY = 'my-school';

/** 저장된 값이 우리가 아는 모양인지 봐요. 앱을 고치는 사이 모양이 바뀔 수 있어서요. */
function parse(raw: string | null): MySchool | null {
  if (!raw) return null;
  try {
    const v = JSON.parse(raw) as Partial<MySchool>;
    if (
      typeof v.office === 'string' &&
      typeof v.code === 'string' &&
      typeof v.name === 'string' &&
      typeof v.grade === 'number' &&
      typeof v.cls === 'string'
    ) {
      return {
        office: v.office,
        officeName: v.officeName ?? '',
        code: v.code,
        name: v.name,
        grade: v.grade,
        cls: v.cls,
      };
    }
  } catch {
    // 못 읽으면 없는 셈 쳐요. 다음에 고르면 덮어써져요.
  }
  return null;
}

export async function loadMySchool(): Promise<MySchool | null> {
  try {
    return parse(await AsyncStorage.getItem(KEY));
  } catch {
    // 저장소를 못 쓰는 기기도 있어요. 그래도 앱은 돌아가야 해요.
    return null;
  }
}

export async function saveMySchool(school: MySchool): Promise<void> {
  try {
    await AsyncStorage.setItem(KEY, JSON.stringify(school));
  } catch {
    // 저장이 안 돼도 이번 실행 동안은 쓸 수 있어요.
  }
}

export async function clearMySchool(): Promise<void> {
  try {
    await AsyncStorage.removeItem(KEY);
  } catch {
    // 지우기에 실패해도 할 수 있는 게 없어요.
  }
}

/** 검색 결과 한 줄과 고른 학년·반을 합쳐요. */
export const toMySchool = (found: SchoolInfo, grade: number, cls: string): MySchool => ({
  office: found.office,
  officeName: found.officeName,
  code: found.code,
  name: found.name,
  grade,
  cls,
});

/** '2학년 3반' */
export const classLabelOf = (s: MySchool) => `${s.grade}학년 ${s.cls}반`;


// ---------------------------------------------------------------- 선생님 코드

/**
 * 수행평가를 등록·삭제할 수 있는 선생님 코드예요.
 *
 * 아직 로그인이 없어서 이 코드가 열쇠 역할을 해요. 학교마다 하나씩 정해두고
 * 선생님들만 알고 있으면 돼요. 기기에만 담고 어디에도 올리지 않아요.
 */
const CODE_KEY = 'teacher-code';

export async function loadTeacherCode(): Promise<string> {
  try {
    return (await AsyncStorage.getItem(CODE_KEY)) ?? '';
  } catch {
    return '';
  }
}

export async function saveTeacherCode(code: string): Promise<void> {
  try {
    if (code) await AsyncStorage.setItem(CODE_KEY, code);
    else await AsyncStorage.removeItem(CODE_KEY);
  } catch {
    // 저장이 안 돼도 이번 실행 동안은 쓸 수 있어요.
  }
}
