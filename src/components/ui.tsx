import { router } from 'expo-router';
import { useState, type ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, TextInput, View, type StyleProp, type TextInputProps, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icon, type IconName } from '@/components/icon';
import { SlidingPill, Tap } from '@/components/motion';
import { FONT, Text } from '@/components/text';
import { STUDENT, TEACHER } from '@/data/mock';
import { useApp } from '@/lib/app-state';
import { useLayout } from '@/lib/layout';
import { subjectTone, tone as toneColor, type ToneKey } from '@/constants/tones';

/** 폰에서 쓰는 기본 기둥 너비. 태블릿에서는 useLayout().content가 더 넓은 값을 줘요. */
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
  const { content } = useLayout();
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
          <View style={[styles.column, { maxWidth: content }]}>{children}</View>
        </ScrollView>
      ) : (
        <View style={[styles.column, styles.fill, { maxWidth: content }]}>{children}</View>
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
    <Tap onPress={onPress} accessibilityRole="button" accessibilityLabel="내 정보와 테마 열기" hitSlop={6} depth={0.07}>
      {circle}
    </Tap>
  );
}

/** 탭 화면 맨 위 제목. 오른쪽 동그라미를 누르면 내 정보가 열려요. */
export function Header({ title, subtitle, right }: { title: string; subtitle?: string; right?: ReactNode }) {
  const { palette } = useApp();
  const { tablet, short } = useLayout();
  return (
    <View style={styles.header}>
      <View style={styles.fill}>
        {subtitle ? <Text style={[styles.headerSub, { color: palette.sub }]}>{subtitle}</Text> : null}
        <Text
          accessibilityRole="header"
          style={[styles.headerTitle, tablet && !short && styles.headerTitleWide, { color: palette.text }]}>
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
    <Tap
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      depth={0.08}
      style={[styles.iconButton, { backgroundColor: bg, borderColor: filled && !disabled ? bg : palette.line }]}>
      <Icon name={icon} size={22} color={iconColor} />
    </Tap>
  );
}

export function SectionTitle({
  title,
  value,
  action,
  onAction,
}: {
  title: string;
  /** 제목 옆에 붙는 작은 값 (가짓수, 열량 등) */
  value?: string;
  action?: string;
  onAction?: () => void;
}) {
  const { palette } = useApp();
  return (
    <View style={styles.sectionTitle}>
      <Text accessibilityRole="header" style={[styles.sectionText, { color: palette.text }]}>
        {title}
      </Text>
      {value ? (
        <Text numeric style={[styles.sectionValue, { color: palette.sub }]}>
          {value}
        </Text>
      ) : null}
      <View style={styles.fill} />
      {action && onAction ? (
        <Tap onPress={onAction} accessibilityRole="button" hitSlop={10} depth={0.06}>
          <Text style={[styles.sectionAction, { color: palette.accentDeep }]}>{action}</Text>
        </Tap>
      ) : null}
    </View>
  );
}

export function Chip({
  label,
  selected,
  onPress,
  /** 켜면 label을 과목 이름으로 보고 과목별 포인트 색을 입혀요. */
  colored = false,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
  colored?: boolean;
}) {
  const { palette } = useApp();
  const t = colored ? subjectTone(label, palette.scheme) : null;
  const off = t
    ? { backgroundColor: t.bg, borderColor: t.bg }
    : { backgroundColor: palette.surface, borderColor: palette.line };
  const on = t
    ? { backgroundColor: t.fg, borderColor: t.fg }
    : { backgroundColor: palette.accent, borderColor: palette.accent };
  const color = selected ? '#FFFFFF' : t ? t.fg : palette.text;
  return (
    <Tap
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      depth={0.05}
      style={[styles.chip, selected ? on : off]}>
      <Text style={[styles.chipText, { color }]}>{label}</Text>
    </Tap>
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
  // 선택 표시가 미끄러지게 하려고 안쪽 너비를 재요. (양옆 여백 4씩 빼요)
  const [track, setTrack] = useState(0);
  const index = Math.max(0, options.findIndex((o) => o.value === value));

  return (
    <View
      style={[styles.segmented, { backgroundColor: palette.tint }]}
      accessibilityRole="tablist"
      onLayout={(e) => setTrack(e.nativeEvent.layout.width - 8)}>
      <SlidingPill
        index={index}
        count={options.length}
        width={track}
        style={{
          top: 4,
          bottom: 4,
          left: 4,
          borderRadius: 12,
          borderWidth: 1.5,
          backgroundColor: palette.raised,
          borderColor: palette.line,
        }}
      />
      {options.map((o) => {
        const selected = o.value === value;
        return (
          <Tap
            key={o.value}
            onPress={() => onChange(o.value)}
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            depth={0.03}
            style={styles.segment}>
            <Text
              style={[
                styles.segmentText,
                { color: selected ? palette.text : palette.sub, fontWeight: selected ? '700' : '500' },
              ]}>
              {o.label}
            </Text>
          </Tap>
        );
      })}
    </View>
  );
}

export function Tag({
  label,
  tone = 'soft',
  /** 주면 그 과목 색으로 칠해요. (tone보다 우선) */
  subject,
}: {
  label: string;
  tone?: 'soft' | 'solid' | 'plain';
  subject?: string;
}) {
  const { palette } = useApp();
  const st = subject ? subjectTone(subject, palette.scheme) : null;
  if (st) {
    return (
      <View style={[styles.tag, { backgroundColor: st.bg, borderColor: st.bg }]}>
        <Text style={[styles.tagText, { color: st.fg }]}>{label}</Text>
      </View>
    );
  }
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
    <Tap
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      depth={0.035}
      style={[styles.button, { backgroundColor: bg, borderColor: primary && !disabled ? bg : palette.line }]}>
      {icon ? <Icon name={icon} size={20} color={color} /> : null}
      <Text style={[styles.buttonText, { color }]}>{label}</Text>
    </Tap>
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

/** 색 배경을 깐 아이콘. 회색 화면에 색 점을 찍어 줘요. */
export function IconChip({
  icon,
  subject,
  tone,
  size = 40,
}: {
  icon: IconName;
  /** 과목 이름을 주면 그 과목 색을 써요. */
  subject?: string;
  /** 색을 직접 고르고 싶을 때. */
  tone?: ToneKey;
  size?: number;
}) {
  const { palette } = useApp();
  const t = tone ? toneColor(tone, palette.scheme) : subjectTone(subject ?? '', palette.scheme);
  return (
    <View
      style={[
        styles.iconChip,
        { width: size, height: size, borderRadius: size * 0.32, backgroundColor: t.bg },
      ]}>
      <Icon name={icon} size={Math.round(size * 0.5)} color={t.fg} />
    </View>
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
  headerSub: { fontSize: 13, fontWeight: '600', marginBottom: 2 },
  headerTitle: { fontSize: 24, lineHeight: 31, fontWeight: '800', letterSpacing: -0.6 },
  headerTitleWide: { fontSize: 32, lineHeight: 36 },

  backHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingTop: 8, paddingBottom: 16 },
  backTitle: { fontSize: 18, fontWeight: '800', letterSpacing: -0.3 },
  backSub: { fontSize: 12, fontWeight: '500', marginTop: 1 },

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

  sectionTitle: { flexDirection: 'row', alignItems: 'baseline', marginTop: 12, marginBottom: 8 },
  sectionText: { fontSize: 18, fontWeight: '800', letterSpacing: -0.3 },
  sectionValue: { fontSize: 13, fontWeight: '600', marginLeft: 8 },
  sectionAction: { fontSize: 13, fontWeight: '700' },

  chipRow: { gap: 8, paddingRight: 20 },
  chip: {
    height: 44,
    paddingHorizontal: 16,
    borderRadius: 20,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipText: { fontSize: 13, fontWeight: '700' },

  segmented: { flexDirection: 'row', borderRadius: 16, padding: 4, marginBottom: 16 },
  segment: { flex: 1, height: 44, alignItems: 'center', justifyContent: 'center' },
  segmentText: { fontSize: 13 },

  tag: { borderWidth: 1, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4, alignSelf: 'flex-start' },
  tagText: { fontSize: 12, fontWeight: '700' },

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
  buttonText: { fontSize: 15, fontWeight: '800' },

  iconChip: { alignItems: 'center', justifyContent: 'center' },
  field: { borderWidth: 1.5, fontSize: 15, fontFamily: FONT.regular },
  empty: { fontSize: 13, textAlign: 'center', paddingVertical: 28, lineHeight: 22 },
  divider: { height: 1, marginVertical: 2 },
});
