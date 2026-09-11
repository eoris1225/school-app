import { router } from 'expo-router';
import type { ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, TextInput, View, type StyleProp, type TextInputProps, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icon, type IconName } from '@/components/icon';
import { FONT, Text } from '@/components/text';
import { STUDENT, TEACHER } from '@/data/mock';
import { useApp } from '@/lib/app-state';

/** 넓은 화면(웹)에서도 글이 너무 길게 퍼지지 않게 가운데로 모아요. */
export const MAX_WIDTH = 560;

export function goBack() {
  if (router.canGoBack()) router.back();
  else router.replace('/');
}

export function Screen({
  children,
  scroll = true,
  footer,
  /** 탭 막대가 없는 화면(내 정보, 일정 추가)은 아래 여백을 직접 챙겨야 해요. */
  bottomInset = false,
}: {
  children: ReactNode;
  scroll?: boolean;
  footer?: ReactNode;
  bottomInset?: boolean;
}) {
  const insets = useSafeAreaInsets();
  const { palette } = useApp();
  return (
    <View style={[styles.screen, { backgroundColor: palette.bg, paddingTop: insets.top }]}>
      {scroll ? (
        <ScrollView
          contentContainerStyle={[
            styles.scrollContent,
            bottomInset && { paddingBottom: insets.bottom + 32 },
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>
          <View style={styles.column}>{children}</View>
        </ScrollView>
      ) : (
        <View style={[styles.column, styles.fill]}>{children}</View>
      )}
      {footer}
    </View>
  );
}

export function Avatar({ size = 44, onPress }: { size?: number; onPress?: () => void }) {
  const { palette, role } = useApp();
  const initial = role === 'teacher' ? TEACHER.initial : STUDENT.initial;
  const circle = (
    <View
      style={[
        styles.avatar,
        { width: size, height: size, borderRadius: size / 2, backgroundColor: palette.accent },
      ]}>
      <Text style={[styles.avatarText, { color: palette.onAccent, fontSize: size * 0.4 }]}>{initial}</Text>
    </View>
  );
  if (!onPress) return circle;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel="내 정보와 테마 열기"
      hitSlop={6}
      style={({ pressed }) => pressed && styles.pressed}>
      {circle}
    </Pressable>
  );
}

/** 탭 화면 맨 위 제목. 오른쪽 동그라미를 누르면 내 정보가 열려요. */
export function Header({ title, subtitle, right }: { title: string; subtitle?: string; right?: ReactNode }) {
  const { palette } = useApp();
  return (
    <View style={styles.header}>
      <View style={styles.fill}>
        {subtitle ? <Text style={[styles.headerSub, { color: palette.sub }]}>{subtitle}</Text> : null}
        <Text accessibilityRole="header" style={[styles.headerTitle, { color: palette.text }]}>
          {title}
        </Text>
      </View>
      {right}
      <Avatar onPress={() => router.push('/profile')} />
    </View>
  );
}

/** 뒤로 가기 버튼이 있는 제목 (쪽지 상세, 내 정보, 일정 추가) */
export function BackHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  const { palette } = useApp();
  return (
    <View style={styles.backHeader}>
      <IconButton icon="back" label="뒤로 가기" onPress={goBack} />
      <View style={styles.fill}>
        <Text accessibilityRole="header" style={[styles.backTitle, { color: palette.text }]} numberOfLines={1}>
          {title}
        </Text>
        {subtitle ? (
          <Text style={[styles.backSub, { color: palette.sub }]} numberOfLines={1}>
            {subtitle}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

export function IconButton({
  icon,
  label,
  onPress,
  filled = false,
  disabled = false,
}: {
  icon: IconName;
  label: string;
  onPress: () => void;
  filled?: boolean;
  disabled?: boolean;
}) {
  const { palette } = useApp();
  const bg = filled ? (disabled ? palette.tint : palette.accent) : palette.surface;
  const iconColor = filled ? (disabled ? palette.sub : palette.onAccent) : palette.text;
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      style={({ pressed }) => [
        styles.iconButton,
        { backgroundColor: bg, borderColor: filled && !disabled ? bg : palette.line },
        pressed && styles.pressed,
      ]}>
      <Icon name={icon} size={22} color={iconColor} />
    </Pressable>
  );
}

export function Card({
  children,
  style,
  onPress,
  label,
}: {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  onPress?: () => void;
  label?: string;
}) {
  const { palette } = useApp();
  const base = [styles.card, { borderColor: palette.line, backgroundColor: palette.surface }, style];
  if (!onPress) return <View style={base}>{children}</View>;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => [base, pressed && styles.pressed]}>
      {children}
    </Pressable>
  );
}

export function SectionTitle({
  title,
  action,
  onAction,
}: {
  title: string;
  action?: string;
  onAction?: () => void;
}) {
  const { palette } = useApp();
  return (
    <View style={styles.sectionTitle}>
      <Text accessibilityRole="header" style={[styles.sectionText, { color: palette.text }]}>
        {title}
      </Text>
      {action && onAction ? (
        <Pressable onPress={onAction} accessibilityRole="button" hitSlop={10}>
          <Text style={[styles.sectionAction, { color: palette.accentDeep }]}>{action}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

export function Chip({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
  const { palette } = useApp();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      style={({ pressed }) => [
        styles.chip,
        selected
          ? { backgroundColor: palette.accent, borderColor: palette.accent }
          : { backgroundColor: palette.surface, borderColor: palette.line },
        pressed && styles.pressed,
      ]}>
      <Text style={[styles.chipText, { color: selected ? palette.onAccent : palette.text }]}>{label}</Text>
    </Pressable>
  );
}

export function ChipRow({ children }: { children: ReactNode }) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
      {children}
    </ScrollView>
  );
}

export function Segmented<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
}) {
  const { palette } = useApp();
  return (
    <View style={[styles.segmented, { backgroundColor: palette.tint }]} accessibilityRole="tablist">
      {options.map((o) => {
        const selected = o.value === value;
        return (
          <Pressable
            key={o.value}
            onPress={() => onChange(o.value)}
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            style={[
              styles.segment,
              selected && { backgroundColor: palette.raised, borderColor: palette.line },
            ]}>
            <Text
              style={[
                styles.segmentText,
                { color: selected ? palette.text : palette.sub, fontWeight: selected ? '700' : '600' },
              ]}>
              {o.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export function Tag({ label, tone = 'soft' }: { label: string; tone?: 'soft' | 'solid' | 'plain' }) {
  const { palette } = useApp();
  const toneStyle =
    tone === 'solid'
      ? { backgroundColor: palette.accent, borderColor: palette.accent }
      : tone === 'soft'
        ? { backgroundColor: palette.tint, borderColor: palette.tint }
        : { backgroundColor: palette.surface, borderColor: palette.line };
  const color = tone === 'solid' ? palette.onAccent : tone === 'soft' ? palette.accentDeep : palette.sub;
  return (
    <View style={[styles.tag, toneStyle]}>
      <Text style={[styles.tagText, { color }]}>{label}</Text>
    </View>
  );
}

export function Button({
  label,
  onPress,
  variant = 'primary',
  disabled = false,
  icon,
}: {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary';
  disabled?: boolean;
  icon?: IconName;
}) {
  const { palette } = useApp();
  const primary = variant === 'primary';
  // 누를 수 없는 버튼도 글씨는 또렷하게 읽히도록 연한 배경에 회색 글씨를 써요.
  const bg = primary ? (disabled ? palette.tint : palette.accent) : palette.surface;
  const color = primary ? (disabled ? palette.sub : palette.onAccent) : palette.text;
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      style={({ pressed }) => [
        styles.button,
        { backgroundColor: bg, borderColor: primary && !disabled ? bg : palette.line },
        pressed && styles.pressed,
      ]}>
      {icon ? <Icon name={icon} size={20} color={color} /> : null}
      <Text style={[styles.buttonText, { color }]}>{label}</Text>
    </Pressable>
  );
}

/** 앱 안의 모든 글 입력칸. 테마 색과 밝기를 한곳에서 맞춰요. */
export function Field({ style, ...props }: TextInputProps) {
  const { palette } = useApp();
  return (
    <TextInput
      placeholderTextColor={palette.sub}
      keyboardAppearance={palette.scheme}
      selectionColor={palette.accent}
      {...props}
      style={[
        styles.field,
        { borderColor: palette.line, color: palette.text, backgroundColor: palette.surface },
        style,
      ]}
    />
  );
}

export function Empty({ text }: { text: string }) {
  const { palette } = useApp();
  return <Text style={[styles.empty, { color: palette.sub }]}>{text}</Text>;
}

export function Divider() {
  const { palette } = useApp();
  return <View style={[styles.divider, { backgroundColor: palette.line }]} />;
}

export const styles = StyleSheet.create({
  screen: { flex: 1 },
  fill: { flex: 1 },
  scrollContent: { paddingBottom: 32 },
  column: { width: '100%', maxWidth: MAX_WIDTH, alignSelf: 'center', paddingHorizontal: 20 },
  pressed: { opacity: 0.6 },

  header: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingTop: 12, paddingBottom: 20 },
  headerSub: { fontSize: 15, fontWeight: '600', marginBottom: 2 },
  headerTitle: { fontSize: 28, lineHeight: 36, fontWeight: '800', letterSpacing: -0.6 },

  backHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingTop: 8, paddingBottom: 16 },
  backTitle: { fontSize: 20, fontWeight: '800', letterSpacing: -0.3 },
  backSub: { fontSize: 14, fontWeight: '500', marginTop: 1 },

  avatar: { alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontWeight: '800' },

  iconButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },

  card: { borderWidth: 1.5, borderRadius: 22, padding: 18, marginBottom: 14 },

  sectionTitle: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    marginTop: 14,
    marginBottom: 10,
  },
  sectionText: { fontSize: 20, fontWeight: '800', letterSpacing: -0.3 },
  sectionAction: { fontSize: 15, fontWeight: '700' },

  chipRow: { gap: 8, paddingRight: 20 },
  chip: {
    height: 40,
    paddingHorizontal: 16,
    borderRadius: 20,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipText: { fontSize: 15, fontWeight: '700' },

  segmented: { flexDirection: 'row', borderRadius: 16, padding: 4, marginBottom: 16 },
  segment: {
    flex: 1,
    height: 42,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
  },
  segmentText: { fontSize: 15 },

  tag: { borderWidth: 1, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3, alignSelf: 'flex-start' },
  tagText: { fontSize: 13, fontWeight: '700' },

  button: {
    height: 54,
    borderRadius: 18,
    borderWidth: 1.5,
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  buttonText: { fontSize: 17, fontWeight: '800' },

  field: { borderWidth: 1.5, fontSize: 16, fontFamily: FONT.regular },
  empty: { fontSize: 15, textAlign: 'center', paddingVertical: 28, lineHeight: 22 },
  divider: { height: 1, marginVertical: 2 },
});
