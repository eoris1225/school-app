import { SymbolView } from 'expo-symbols';
import type { ComponentProps } from 'react';
import { subjectGroup, type SubjectGroup } from '@/lib/subject';

type SymbolName = ComponentProps<typeof SymbolView>['name'];

/** 아이폰은 SF Symbols, 안드로이드와 웹은 Material Symbols를 써요. */
const ICONS = {
  home: { ios: 'house', android: 'home', web: 'home' },
  meal: { ios: 'fork.knife', android: 'restaurant', web: 'restaurant' },
  timetable: { ios: 'tablecells', android: 'grid_view', web: 'grid_view' },
  calendar: { ios: 'calendar', android: 'calendar_month', web: 'calendar_month' },
  chat: { ios: 'bubble.left.and.bubble.right', android: 'forum', web: 'forum' },
  inbox: { ios: 'tray', android: 'inbox', web: 'inbox' },
  plus: { ios: 'plus', android: 'add', web: 'add' },
  send: { ios: 'paperplane.fill', android: 'send', web: 'send' },
  back: { ios: 'chevron.left', android: 'chevron_left', web: 'chevron_left' },
  next: { ios: 'chevron.right', android: 'chevron_right', web: 'chevron_right' },
  check: { ios: 'checkmark', android: 'check', web: 'check' },
  trash: { ios: 'trash', android: 'delete', web: 'delete' },
  swap: { ios: 'arrow.left.arrow.right', android: 'swap_horiz', web: 'swap_horiz' },

  // 과목 아이콘
  book: { ios: 'book', android: 'menu_book', web: 'menu_book' },
  number: { ios: 'number', android: 'calculate', web: 'calculate' },
  globe: { ios: 'globe', android: 'language', web: 'language' },
  flask: { ios: 'flask', android: 'science', web: 'science' },
  map: { ios: 'map', android: 'public', web: 'public' },
  clock: { ios: 'clock', android: 'history', web: 'history' },
  laptop: { ios: 'laptopcomputer', android: 'computer', web: 'computer' },
  run: { ios: 'figure.run', android: 'directions_run', web: 'directions_run' },
  music: { ios: 'music.note', android: 'music_note', web: 'music_note' },
  brush: { ios: 'paintbrush', android: 'brush', web: 'brush' },
  star: { ios: 'star', android: 'star', web: 'star' },
} satisfies Record<string, SymbolName>;

export type IconName = keyof typeof ICONS;

/**
 * 교과군마다 어울리는 아이콘이에요.
 * NEIS는 "미적분Ⅰ" 같은 선택과목 이름을 주기 때문에 이름이 아니라
 * 교과군으로 골라요. 어떤 이름이 어느 교과군인지는 `src/lib/subject.ts` 가 정해요.
 */
const GROUP_ICONS: Record<SubjectGroup, IconName> = {
  국어: 'book',
  수학: 'number',
  영어: 'globe',
  외국어: 'globe',
  과학: 'flask',
  사회: 'map',
  역사: 'clock',
  정보: 'laptop',
  체육: 'run',
  음악: 'music',
  미술: 'brush',
  교양: 'book',
  창체: 'star',
  휴일: 'star',
  기타: 'star',
};

export const subjectIcon = (name: string): IconName => GROUP_ICONS[subjectGroup(name)];

export function Icon({ name, size = 22, color }: { name: IconName; size?: number; color: string }) {
  return <SymbolView name={ICONS[name]} size={size} tintColor={color} />;
}
