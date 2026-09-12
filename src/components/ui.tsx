import { router } from 'expo-router';
import { useState, type ReactNode } from 'react';
import { LinearGradient } from 'expo-linear-gradient';
import { ScrollView, StyleSheet, TextInput, View, type TextInputProps } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Emoji, fitArt, type EmojiName } from '@/components/emoji';
import { Icon, type IconName } from '@/components/icon';
import { Pop, Shimmer, SlidingPill, Tap } from '@/components/motion';
import { FONT, Text } from '@/components/text';
import { useApp } from '@/lib/app-state';
import { useLayout } from '@/lib/layout';
import { mix } from '@/constants/themes';
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
  const { palette, me } = useApp();
  // 이름 첫 글자예요. 성이 두 글자인 이름도 있어서 잘라내지 않고 그대로 써요.
  const initial = me?.name.trim().slice(0, 1) || '?';
  /*
   * 아바타도 누르는 것이라 살짝 솟아 보이게 해요. 버튼과 같은 규칙이에요.
   *
   * 테두리를 바탕색으로 둘러요. 홈 맨 위 색 상자 위에 아바타가 올라가는데
   * 둘 다 테마색이라 어디까지가 아바타인지 안 보였어요. 바탕색 테두리를
   * 두르면 색 상자 위에서는 또렷하게 잘리고, 평범한 화면에서는 바탕과
   * 같은 색이라 아예 안 보여요. 필요한 데서만 보이는 거예요.
   */
  const ring = Math.max(2, Math.round(size * 0.045));
  const circle = (
    <View
      style={[
        styles.avatar,
        styles.raised,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          shadowColor: palette.accent,
          borderWidth: ring,
          borderColor: palette.bg,
        },
      ]}>
      <LinearGradient
        colors={[mix(palette.accent, '#FFFFFF', 0.2), palette.accent, mix(palette.accent, '#000000', 0.12)]}
        locations={[0, 0.55, 1]}
        start={{ x: 0.2, y: 0 }}
        end={{ x: 0.8, y: 1 }}
        style={[StyleSheet.absoluteFill, { borderRadius: size / 2 }]}
      />
      <View style={[styles.gloss, { borderRadius: size / 2 }]} />
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
export function BackHeader({
  title,
  subtitle,
  right,
}: {
  title: string;
  subtitle?: string;
  /** 오른쪽 끝에 놓을 것. 지우기 같은 거요. */
  right?: ReactNode;
}) {
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
      {right}
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

/*
 * 버튼에는 입체감을 줘요.
 *
 * 아이콘 상자에서는 걷어냈지만 버튼은 달라요. 아이콘 상자는 "보는 것"이라
 * 번들거리면 안의 그림을 방해하지만, 버튼은 "누르는 것"이에요. 살짝 솟아
 * 보이면 눌러도 된다는 게 손에 먼저 읽혀요.
 *
 * 세 겹을 겹쳐요.
 *   1. 위에서 아래로 옅은 그라데이션 (빛이 위에서 온다는 뜻)
 *   2. 맨 윗줄에 머리카락 굵기의 흰 선 (모서리가 깎인 느낌)
 *   3. 버튼 색과 같은 계열의 그림자 (검정 그림자는 탁해 보여요)
 *
 * 처음에는 윗면 절반에 흰 광택을 깔았는데, 가로로 긴 버튼에서는 광택이
 * 끝나는 자리가 가로줄로 딱 보여서 두 색이 겹친 것처럼 됐어요.
 * 색이 위에서 아래로 부드럽게 변하기만 하면 충분해요.
 */
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
  const raised = primary && !disabled;

  return (
    <Tap
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      depth={0.035}
      style={[
        styles.button,
        { backgroundColor: bg, borderColor: primary && !disabled ? bg : palette.line },
        raised && { shadowColor: palette.accent, ...styles.raised },
      ]}>
      {raised ? (
        <>
          <LinearGradient
            colors={[mix(bg, '#FFFFFF', 0.13), bg, mix(bg, '#000000', 0.09)]}
            locations={[0, 0.5, 1]}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
            style={[StyleSheet.absoluteFill, styles.buttonFill]}
          />
          <View style={styles.topLine} />
        </>
      ) : null}
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
  art,
  subject,
  tone,
  size = 40,
  quiet = false,
}: {
  art: EmojiName;
  /** 과목 이름을 주면 그 과목 색을 써요. */
  subject?: string;
  /** 색을 직접 고르고 싶을 때. */
  tone?: ToneKey;
  size?: number;
  /** 조용히 둘 것인지. 목록에서 지금 중요한 줄만 색을 남길 때 써요. */
  quiet?: boolean;
}) {
  const { palette } = useApp();
  // 조용한 칸은 테마색을 아주 옅게 깔아요. 회색으로 두면 꺼진 것처럼 보여요.
  const t = quiet
    ? { bg: palette.tint, fg: palette.sub }
    : tone
      ? toneColor(tone, palette.scheme)
      : subjectTone(subject ?? '', palette.scheme);
  return (
    <View
      style={[
        styles.iconChip,
        { width: size, height: size, borderRadius: size * 0.32, backgroundColor: t.bg },
      ]}>
      <Emoji name={art} size={fitArt(size, 0.58)} tone={quiet ? 'mono' : 'color'} />
    </View>
  );
}

/**
 * 아무것도 없을 때 보여줘요.
 *
 * 회색 문장 한 줄만 덩그러니 두면 앱이 고장 난 것처럼 보여요. 그림을
 * 얹어서 "비어 있는 게 맞다"는 느낌을 주고, 다음에 뭘 하면 되는지
 * 한 줄 더 적을 수 있게 해뒀어요.
 */
export function Empty({
  text,
  art = 'pin',
  hint,
  action,
  onAction,
}: {
  text: string;
  /** 위에 올릴 3D 그림. 자리마다 어울리는 걸 골라주세요. */
  art?: EmojiName;
  /** 다음에 뭘 하면 되는지 한 줄 */
  hint?: string;
  /** 바로 할 수 있게 해주는 버튼 */
  action?: string;
  onAction?: () => void;
}) {
  const { palette } = useApp();
  return (
    <Pop delay={60} style={styles.emptyWrap}>
      <View style={[styles.emptyArt, { backgroundColor: palette.tint }]}>
        {/* 빈 화면은 급한 일이 아니라 조용히 둬요. 경고만 색으로 남겨요. */}
        <Emoji name={art} size={fitArt(72, 0.56)} tone={art === 'warn' ? 'color' : 'mono'} />
      </View>
      <Text style={[styles.empty, { color: palette.text }]}>{text}</Text>
      {hint ? <Text style={[styles.emptyHint, { color: palette.sub }]}>{hint}</Text> : null}
      {action && onAction ? (
        <Tap
          onPress={onAction}
          accessibilityRole="button"
          accessibilityLabel={action}
          depth={0.05}
          style={[styles.emptyBtn, { backgroundColor: palette.tint }]}>
          <Text style={[styles.emptyBtnText, { color: palette.accentDeep }]}>{action}</Text>
        </Tap>
      ) : null}
    </Pop>
  );
}

/**
 * 불러오는 중에 보여줘요.
 *
 * 빙글빙글 도는 동그라미 대신 들어올 내용의 자리를 미리 잡아둬요. 글이
 * 도착할 때 화면이 덜 덜컹거리고, 얼마나 올지도 눈에 보여요.
 * 화면 읽어주는 기능한테는 글로 알려줘요.
 */
export function Loading({ text = '불러오는 중이에요', rows = 4 }: { text?: string; rows?: number }) {
  const { palette } = useApp();
  return (
    <View accessibilityRole="progressbar" accessibilityLabel={text} style={styles.skeleton}>
      {Array.from({ length: rows }, (_, i) => (
        <View key={i} style={styles.skeletonRow}>
          <Shimmer width={40} height={40} radius={13} delay={i * 110} color={palette.tint} />
          <View style={styles.skeletonLines}>
            <Shimmer width={`${64 - (i % 3) * 12}%`} height={14} delay={i * 110 + 40} color={palette.tint} />
            <Shimmer width={`${38 - (i % 2) * 8}%`} height={12} radius={6} delay={i * 110 + 80} color={palette.tint} />
          </View>
        </View>
      ))}
    </View>
  );
}

/**
 * 못 불러왔을 때 보여줘요.
 * 무엇이 잘못됐는지 적고, 다시 해볼 수 있으면 버튼도 같이 줘요.
 * 가짜 데이터로 때우지 않아요. 틀린 급식을 보여주는 것보다 못 불러왔다고
 * 말하는 게 나으니까요.
 */
export function ErrorNote({ text, onRetry }: { text: string; onRetry?: () => void }) {
  const { palette } = useApp();
  return (
    <View style={styles.center}>
      <Text style={[styles.empty, { color: palette.sub }]}>{text}</Text>
      {onRetry ? (
        <Tap onPress={onRetry} accessibilityRole="button" hitSlop={10} depth={0.06}>
          <Text style={[styles.retry, { color: palette.accentDeep }]}>다시 시도</Text>
        </Tap>
      ) : null}
    </View>
  );
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

  avatar: { alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
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
  raised: { shadowOpacity: 0.28, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 4 },
  buttonFill: { borderRadius: 18 },
  // 맨 윗줄 한 겹만 밝혀요. 면으로 깔면 끝나는 자리가 줄로 보여요.
  topLine: { position: 'absolute', top: 0, left: 14, right: 14, height: 1, backgroundColor: '#FFFFFF', opacity: 0.3 },
  // 동그란 것에는 면으로 얹어도 돼요. 경계가 곡선이라 줄로 안 보여요.
  gloss: { position: 'absolute', top: 0, left: 0, right: 0, height: '48%', backgroundColor: '#FFFFFF', opacity: 0.13 },
  emptyWrap: { alignItems: 'center', gap: 12, paddingVertical: 32 },
  emptyArt: { width: 72, height: 72, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  emptyHint: { fontSize: 13, lineHeight: 19, textAlign: 'center', marginTop: -4 },
  emptyBtn: { minHeight: 44, borderRadius: 14, paddingHorizontal: 20, justifyContent: 'center', marginTop: 4 },
  emptyBtnText: { fontSize: 13, fontWeight: '700' },
  skeleton: { gap: 16, paddingVertical: 8 },
  skeletonRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  skeletonLines: { flex: 1, gap: 8 },
  field: { borderWidth: 1.5, fontSize: 15, fontFamily: FONT.regular },
  empty: { fontSize: 15, fontWeight: '600', textAlign: 'center', lineHeight: 22 },
  center: { alignItems: 'center', justifyContent: 'center', paddingVertical: 40, gap: 12 },
  retry: { fontSize: 15, fontWeight: '700' },
  divider: { height: 1, marginVertical: 2 },
});
