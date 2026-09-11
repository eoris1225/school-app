import type { Scheme } from '@/constants/themes';
import { subjectGroup, type SubjectGroup } from '@/lib/subject';

/**
 * 과목과 일정 종류마다 쓰는 포인트 색이에요.
 * 테마 색(accent) 하나로만 칠하면 화면이 단조로워서, 과목별로 고유한 색을 줘요.
 * 각 색은 연한 바탕(bg)과 그 위에 올리는 글씨(fg) 한 쌍이에요.
 */
export type ToneKey =
  | 'rose'
  | 'blue'
  | 'violet'
  | 'teal'
  | 'amber'
  | 'orange'
  | 'indigo'
  | 'green'
  | 'pink'
  | 'lime'
  | 'clay'
  | 'slate';

export type ToneColor = { bg: string; fg: string };

/**
 * 앱 아이콘 타일에 쓰는 선명한 색이에요.
 * bg/fg는 글씨 대비를 위해 차분하게 잡았지만, 아이콘은 눈에 띄어야 해서
 * 밝기와 상관없이 같은 색을 써요. (실제 앱 아이콘도 테마 따라 안 바뀌죠)
 */
export const SOLID: Record<ToneKey, string> = {
  rose: '#F04E79',
  blue: '#3B82F6',
  violet: '#8B5CF6',
  teal: '#12B0A5',
  amber: '#F5A524',
  orange: '#FB7A3C',
  indigo: '#6366F1',
  green: '#3BB35F',
  pink: '#EC4899',
  lime: '#9CC22F',
  clay: '#A97F5F',
  slate: '#8A93A5',
};

const TONES: Record<ToneKey, Record<Scheme, ToneColor>> = {
  rose: { light: { bg: '#FAECEF', fg: '#A4506A' }, dark: { bg: '#2C1A20', fg: '#DE97AC' } },
  blue: { light: { bg: '#E9EFF8', fg: '#3A628F' }, dark: { bg: '#161F2C', fg: '#89ADD6' } },
  violet: { light: { bg: '#EEEBF8', fg: '#5B4C93' }, dark: { bg: '#1E1B2C', fg: '#A598DC' } },
  teal: { light: { bg: '#E4F0EF', fg: '#2C6A68' }, dark: { bg: '#13221F', fg: '#7BBCB6' } },
  amber: { light: { bg: '#F8F0DF', fg: '#846128' }, dark: { bg: '#26200F', fg: '#D3AE6B' } },
  orange: { light: { bg: '#F9EBE1', fg: '#95592F' }, dark: { bg: '#271B13', fg: '#D89C74' } },
  indigo: { light: { bg: '#EAECF7', fg: '#4A529A' }, dark: { bg: '#191B2B', fg: '#969CE0' } },
  green: { light: { bg: '#E7F1E7', fg: '#3A6B45' }, dark: { bg: '#162217', fg: '#88BC92' } },
  pink: { light: { bg: '#F9EAF2', fg: '#9A4B7B' }, dark: { bg: '#2A1823', fg: '#DB96BC' } },
  lime: { light: { bg: '#EFF2E0', fg: '#5E6C2B' }, dark: { bg: '#1F2213', fg: '#B1C077' } },
  clay: { light: { bg: '#F1EDE7', fg: '#6B5344' }, dark: { bg: '#221E1A', fg: '#BFAA97' } },
  slate: { light: { bg: '#ECEDF1', fg: '#525762' }, dark: { bg: '#1D1F26', fg: '#A4AAB8' } },
};

/**
 * 교과군마다 고정된 색이에요. 오늘 바뀌고 내일 달라지면 헷갈리니까 표로 박아 뒀어요.
 *
 * 과목 이름이 아니라 교과군으로 정하는 이유는, NEIS가 "국어"가 아니라
 * "공통국어2" "고전 읽기" "독서와 작문"처럼 선택과목 이름을 주기 때문이에요.
 * 어떤 이름이 어느 교과군인지는 `src/lib/subject.ts` 가 정해요.
 *
 * 색을 같이 쓰는 곳이 두 군데 있어요.
 *   영어와 외국어  — 둘 다 언어 과목이라 묶었어요 (영어Ⅱ, 일본 문화)
 *   정보와 기술·가정 — 교육과정에서 원래 한 교과군이에요
 */
const GROUP_TONES: Record<SubjectGroup, ToneKey> = {
  국어: 'rose',
  수학: 'blue',
  영어: 'violet',
  외국어: 'violet',
  과학: 'teal',
  사회: 'amber',
  역사: 'orange',
  정보: 'indigo',
  체육: 'green',
  음악: 'pink',
  미술: 'lime',
  교양: 'clay',
  창체: 'slate',
  휴일: 'slate',
  기타: 'slate',
};

/**
 * 과목이 아닌 라벨이에요. 달력에서 일정 종류를 칠할 때 써요.
 * 과목 분류를 거치지 않고 여기서 바로 색을 정해요.
 */
const LABEL_TONES: Record<string, ToneKey> = {
  학사일정: 'rose',
  수행평가: 'violet',
};

export function toneKeyFor(name: string): ToneKey {
  return LABEL_TONES[name] ?? GROUP_TONES[subjectGroup(name)];
}

export function tone(key: ToneKey, scheme: Scheme): ToneColor {
  return TONES[key][scheme];
}

/** 과목 이름만 주면 바로 색 한 쌍을 줘요. */
export function subjectTone(name: string, scheme: Scheme): ToneColor {
  return tone(toneKeyFor(name), scheme);
}
