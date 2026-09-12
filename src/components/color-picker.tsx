import { LinearGradient } from 'expo-linear-gradient';
import { useState } from 'react';
import { StyleSheet, View, type LayoutChangeEvent } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { runOnJS } from 'react-native-reanimated';

import { Icon } from '@/components/icon';
import { Tap } from '@/components/motion';
import { Text } from '@/components/text';
import { buildPalette, THEMES } from '@/constants/themes';
import { useApp } from '@/lib/app-state';

/*
 * 테마 색을 고르는 곳이에요.
 *
 * 미리 고른 색을 동그라미로 늘어놓고, 그 아래에서 색상환으로 직접 고를 수도
 * 있어요. 이름표는 안 붙여요. '토마토' 같은 이름을 붙이면 목록에 있는 색만
 * 쓸 수 있는데, 색 자체를 담으면 직접 고른 색도 똑같이 다뤄져요.
 */

/** 색상환 한 바퀴를 몇 조각으로 그릴지. 많을수록 매끄럽고 무거워요. */
const SLICES = 36;

/** 색상(0~360)과 진하기(0~1)로 색을 만들어요. */
function fromWheel(hue: number, depth: number): string {
  // 진하기가 0.5면 가장 선명해요. 낮으면 연하고 높으면 어두워요.
  const light = 0.92 - depth * 0.62;
  const sat = 0.55 + Math.min(depth, 1 - depth) * 0.7;
  const c = (1 - Math.abs(2 * light - 1)) * sat;
  const x = c * (1 - Math.abs(((hue / 60) % 2) - 1));
  const m = light - c / 2;
  const [r, g, b] =
    hue < 60 ? [c, x, 0]
    : hue < 120 ? [x, c, 0]
    : hue < 180 ? [0, c, x]
    : hue < 240 ? [0, x, c]
    : hue < 300 ? [x, 0, c]
    : [c, 0, x];
  const hex = (v: number) => Math.round((v + m) * 255).toString(16).padStart(2, '0');
  return `#${hex(r)}${hex(g)}${hex(b)}`.toUpperCase();
}

export function ColorPicker({ value, onChange }: { value: string; onChange: (hex: string) => void }) {
  const { palette, scheme } = useApp();
  const [open, setOpen] = useState(false);
  const [hue, setHue] = useState(20);
  const [depth, setDepth] = useState(0.5);
  const [barWidth, setBarWidth] = useState(0);

  const custom = fromWheel(hue, depth);
  const mine = !(THEMES as readonly string[]).includes(value.toLowerCase());

  /** 색상환에서 누른 자리의 각도를 재요. */
  const onWheel = (x: number, y: number, size: number) => {
    const dx = x - size / 2;
    const dy = y - size / 2;
    const deg = (Math.atan2(dy, dx) * 180) / Math.PI;
    setHue((deg + 450) % 360);
  };

  return (
    <>
      <View style={styles.grid}>
        {THEMES.map((hex) => {
          const on = hex.toLowerCase() === value.toLowerCase();
          return (
            <Tap
              key={hex}
              onPress={() => onChange(hex)}
              accessibilityRole="radio"
              accessibilityState={{ checked: on }}
              accessibilityLabel={`${hex} 색`}
              depth={0.08}
              style={[styles.swatchWrap, { borderColor: on ? palette.accentDeep : 'transparent' }]}>
              <View style={[styles.swatch, { backgroundColor: buildPalette(hex, scheme).accent }]}>
                {on ? <Icon name="check" size={18} color={buildPalette(hex, scheme).onAccent} /> : null}
              </View>
            </Tap>
          );
        })}

        {/* 직접 고른 색도 목록 끝에 같이 보여줘요. */}
        {mine ? (
          <Tap
            onPress={() => setOpen(true)}
            accessibilityRole="radio"
            accessibilityState={{ checked: true }}
            accessibilityLabel="직접 고른 색"
            depth={0.08}
            style={[styles.swatchWrap, { borderColor: palette.accentDeep }]}>
            <View style={[styles.swatch, { backgroundColor: palette.accent }]}>
              <Icon name="check" size={18} color={palette.onAccent} />
            </View>
          </Tap>
        ) : null}
      </View>

      <Tap
        onPress={() => setOpen((v) => !v)}
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        depth={0.04}
        style={styles.more}>
        <Text style={[styles.moreText, { color: palette.accentDeep }]}>
          {open ? '색 직접 고르기 닫기' : '원하는 색이 없나요? 직접 고르기'}
        </Text>
      </Tap>

      {open ? (
        <View style={styles.picker}>
          <Wheel hue={hue} depth={depth} onPick={onWheel} />

          <Text style={[styles.label, { color: palette.sub }]}>진하기</Text>
          <View
            onLayout={(e: LayoutChangeEvent) => setBarWidth(e.nativeEvent.layout.width)}
            style={styles.barWrap}>
            <DepthBar
              hue={hue}
              depth={depth}
              width={barWidth}
              onPick={(v) => setDepth(Math.min(1, Math.max(0, v)))}
            />
          </View>

          <View style={styles.previewRow}>
            <View style={[styles.preview, { backgroundColor: buildPalette(custom, scheme).accent }]}>
              <Text style={[styles.previewText, { color: buildPalette(custom, scheme).onAccent }]}>
                이 색으로
              </Text>
            </View>
            <Tap
              onPress={() => {
                onChange(custom);
                setOpen(false);
              }}
              accessibilityRole="button"
              accessibilityLabel={`${custom} 색으로 바꾸기`}
              depth={0.05}
              style={[styles.apply, { backgroundColor: palette.accent }]}>
              <Text style={[styles.applyText, { color: palette.onAccent }]}>고르기</Text>
            </Tap>
          </View>
        </View>
      ) : null}
    </>
  );
}

/** 색상환. 조각을 빙 둘러 그리고 가운데를 비워요. */
function Wheel({
  hue,
  depth,
  onPick,
}: {
  hue: number;
  depth: number;
  onPick: (x: number, y: number, size: number) => void;
}) {
  const { palette } = useApp();
  const [size, setSize] = useState(0);

  const pan = Gesture.Pan()
    .onBegin((e) => runOnJS(onPick)(e.x, e.y, size))
    .onUpdate((e) => runOnJS(onPick)(e.x, e.y, size));

  const r = size / 2;
  // 고른 자리를 가리키는 점. 위쪽이 0도예요.
  const rad = ((hue - 90) * Math.PI) / 180;
  const knob = { x: r + Math.cos(rad) * (r * 0.78), y: r + Math.sin(rad) * (r * 0.78) };

  return (
    <GestureDetector gesture={pan}>
      <View
        onLayout={(e) => setSize(e.nativeEvent.layout.width)}
        accessibilityRole="adjustable"
        accessibilityLabel="색상환"
        accessibilityValue={{ text: `${Math.round(hue)}도` }}
        style={styles.wheel}>
        {Array.from({ length: SLICES }, (_, i) => {
          const a = (i * 360) / SLICES;
          return (
            <View
              key={i}
              pointerEvents="none"
              style={[
                StyleSheet.absoluteFill,
                styles.slice,
                { transform: [{ rotate: `${a}deg` }] },
              ]}>
              <View style={[styles.sliceInk, { backgroundColor: fromWheel(a, depth) }]} />
            </View>
          );
        })}
        {/* 가운데를 비워서 고리로 보이게 해요. */}
        <View
          pointerEvents="none"
          style={[styles.hole, { backgroundColor: palette.surface, borderColor: palette.line }]}
        />
        {size > 0 ? (
          <View
            pointerEvents="none"
            style={[
              styles.knob,
              { left: knob.x - 13, top: knob.y - 13, borderColor: palette.surface },
              { backgroundColor: fromWheel(hue, depth) },
            ]}
          />
        ) : null}
      </View>
    </GestureDetector>
  );
}

/** 진하기 막대. 왼쪽이 연하고 오른쪽이 어두워요. */
function DepthBar({
  hue,
  depth,
  width,
  onPick,
}: {
  hue: number;
  depth: number;
  width: number;
  onPick: (v: number) => void;
}) {
  const { palette } = useApp();
  const pan = Gesture.Pan()
    .onBegin((e) => runOnJS(onPick)(e.x / Math.max(width, 1)))
    .onUpdate((e) => runOnJS(onPick)(e.x / Math.max(width, 1)));

  const stops = [0, 0.25, 0.5, 0.75, 1].map((t) => fromWheel(hue, t));

  return (
    <GestureDetector gesture={pan}>
      <View
        accessibilityRole="adjustable"
        accessibilityLabel="진하기"
        accessibilityValue={{ text: `${Math.round(depth * 100)}%` }}
        style={styles.bar}>
        <LinearGradient
          colors={stops as unknown as readonly [string, string, ...string[]]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={[StyleSheet.absoluteFill, styles.barFill]}
        />
        <View
          pointerEvents="none"
          style={[
            styles.knob,
            { left: Math.max(0, Math.min(width - 26, depth * width - 13)), top: -1 },
            { backgroundColor: fromWheel(hue, depth), borderColor: palette.surface },
          ]}
        />
      </View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  swatchWrap: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  swatch: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },

  more: { minHeight: 44, justifyContent: 'center' },
  moreText: { fontSize: 13, fontWeight: '700' },

  picker: { alignItems: 'center', gap: 12, marginTop: 8, marginBottom: 12 },
  wheel: { width: 220, height: 220, borderRadius: 110, overflow: 'hidden' },
  // 조각 하나. 가운데를 축으로 돌려서 부채꼴처럼 둘러요.
  slice: { alignItems: 'center' },
  sliceInk: { width: 22, height: '50%' },
  hole: { position: 'absolute', left: 55, top: 55, width: 110, height: 110, borderRadius: 55, borderWidth: 1.5 },
  knob: { position: 'absolute', width: 26, height: 26, borderRadius: 13, borderWidth: 3 },

  label: { fontSize: 13, fontWeight: '700', alignSelf: 'flex-start' },
  barWrap: { width: '100%' },
  bar: { height: 24, borderRadius: 12, justifyContent: 'center' },
  barFill: { borderRadius: 12 },

  previewRow: { flexDirection: 'row', gap: 8, width: '100%' },
  preview: { flex: 1, minHeight: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  previewText: { fontSize: 13, fontWeight: '700' },
  apply: { minWidth: 96, minHeight: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  applyText: { fontSize: 13, fontWeight: '800' },
});
