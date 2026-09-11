import type { Scheme } from '@/constants/themes';

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
  slate: { light: { bg: '#ECEDF1', fg: '#525762' }, dark: { bg: '#1D1F26', fg: '#A4AAB8' } },
};

/** 과목마다 고정된 색이에요. 오늘 바뀌고 내일 달라지면 헷갈리니까 표로 박아 뒀어요. */
const SUBJECT_TONES: Record<string, ToneKey> = {
  국어: 'rose',
  수학: 'blue',
  영어: 'violet',
  과학: 'teal',
  사회: 'amber',
  한국사: 'orange',
  정보: 'indigo',
  체육: 'green',
  음악: 'pink',
  미술: 'lime',
  자율활동: 'slate',
  동아리: 'slate',
  진로: 'slate',
};

/** 표에 없는 이름은 글자를 더해서 색을 정해요. 같은 이름이면 늘 같은 색이 나와요. */
const FALLBACK: ToneKey[] = ['rose', 'blue', 'violet', 'teal', 'amber', 'orange', 'indigo', 'green', 'pink', 'lime'];

export function toneKeyFor(name: string): ToneKey {
  const known = SUBJECT_TONES[name];
  if (known) return known;
  let sum = 0;
  for (let i = 0; i < name.length; i++) sum += name.charCodeAt(i);
  return FALLBACK[sum % FALLBACK.length];
}

export function tone(key: ToneKey, scheme: Scheme): ToneColor {
  return TONES[key][scheme];
}

/** 과목 이름만 주면 바로 색 한 쌍을 줘요. */
export function subjectTone(name: string, scheme: Scheme): ToneColor {
  return tone(toneKeyFor(name), scheme);
}
