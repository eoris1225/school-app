import { SymbolView } from 'expo-symbols';
import type { ComponentProps } from 'react';

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
} satisfies Record<string, SymbolName>;

export type IconName = keyof typeof ICONS;

export function Icon({ name, size = 22, color }: { name: IconName; size?: number; color: string }) {
  return <SymbolView name={ICONS[name]} size={size} tintColor={color} />;
}
