import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Tap } from '@/components/motion';
import { Sheet } from '@/components/sheet';
import { Text } from '@/components/text';
import { IconButton } from '@/components/ui';
import { useApp } from '@/lib/app-state';
import { DOW, toYmd } from '@/lib/time';

/*
 * 달력에서 날짜를 골라요.
 *
 * 예전에는 '하루 전 / 하루 뒤' 화살표뿐이었어요. 오늘이 9월 9일인데 11월
 * 수행평가를 잡으려면 화살표를 일흔 번 넘게 눌러야 했어요. 선생님이 수행평가를
 * 미리 잡는 건 보통 한두 달 뒤라서, 실제로는 거의 못 쓰는 거나 마찬가지였어요.
 *
 * 달 단위로 넘기고 날짜를 바로 짚어요. 오늘로 돌아오는 길도 둬요.
 */
export function DateSheet({
  visible,
  value,
  onPick,
  onClose,
  /** 날짜마다 아래에 찍을 점 개수. 그 날 이미 뭐가 있는지 알려줘요. */
  marksOf,
}: {
  visible: boolean;
  value: Date;
  onPick: (d: Date) => void;
  onClose: () => void;
  marksOf?: (ymd: string) => number;
}) {
  const { palette, now } = useApp();
  const [cursor, setCursor] = useState({ y: value.getFullYear(), m: value.getMonth() });

  const firstDow = new Date(cursor.y, cursor.m, 1).getDay();
  const days = new Date(cursor.y, cursor.m + 1, 0).getDate();
  const cells: (number | null)[] = [
    ...Array.from({ length: firstDow }, () => null),
    ...Array.from({ length: days }, (_, i) => i + 1),
  ];
  while (cells.length % 7) cells.push(null);
  const weeks = Array.from({ length: cells.length / 7 }, (_, i) => cells.slice(i * 7, i * 7 + 7));

  const move = (delta: number) => {
    const d = new Date(cursor.y, cursor.m + delta, 1);
    setCursor({ y: d.getFullYear(), m: d.getMonth() });
  };

  const today = toYmd(now);
  const picked = toYmd(value);

  return (
    <Sheet visible={visible} onClose={onClose} title="날짜 고르기">
      <View style={[styles.head, { backgroundColor: palette.tint }]}>
        <IconButton icon="back" label="지난달" onPress={() => move(-1)} />
        <Text style={[styles.month, { color: palette.text }]}>
          {cursor.y}년 {cursor.m + 1}월
        </Text>
        <IconButton icon="next" label="다음달" onPress={() => move(1)} />
      </View>

      <View style={styles.row}>
        {DOW.map((d, i) => (
          <View key={d} style={styles.cell}>
            <Text
              style={[
                styles.dow,
                { color: i === 0 ? palette.sunday : i === 6 ? palette.saturday : palette.sub },
              ]}>
              {d}
            </Text>
          </View>
        ))}
      </View>

      {weeks.map((week, wi) => (
        <View key={wi} style={styles.row}>
          {week.map((day, di) => {
            if (day === null) return <View key={di} style={styles.cell} />;
            const ymd = toYmd(new Date(cursor.y, cursor.m, day));
            const on = ymd === picked;
            const isToday = ymd === today;
            const marks = marksOf?.(ymd) ?? 0;
            return (
              <Tap
                key={di}
                onPress={() => onPick(new Date(cursor.y, cursor.m, day))}
                accessibilityRole="button"
                accessibilityState={{ selected: on }}
                accessibilityLabel={`${cursor.m + 1}월 ${day}일${isToday ? ', 오늘' : ''}${marks ? `, 일정 ${marks}개` : ''}`}
                depth={0.06}
                style={[
                  styles.cell,
                  styles.day,
                  isToday && !on && { backgroundColor: palette.tint },
                  on && { backgroundColor: palette.accent },
                ]}>
                <Text
                  numeric
                  style={[
                    styles.dayText,
                    {
                      color: on
                        ? palette.onAccent
                        : di === 0
                          ? palette.sunday
                          : di === 6
                            ? palette.saturday
                            : palette.text,
                    },
                  ]}>
                  {day}
                </Text>
                {/* 그 날 이미 있는 일정 개수예요. 몰린 날을 피해서 잡으라고요. */}
                {marks ? (
                  <View
                    style={[
                      styles.mark,
                      { backgroundColor: on ? palette.onAccent : palette.accentDeep },
                    ]}
                  />
                ) : null}
              </Tap>
            );
          })}
        </View>
      ))}

      <View style={styles.footer}>
        <Tap
          onPress={() => {
            setCursor({ y: now.getFullYear(), m: now.getMonth() });
            onPick(new Date(now.getFullYear(), now.getMonth(), now.getDate()));
          }}
          accessibilityRole="button"
          depth={0.05}
          style={[styles.todayBtn, { backgroundColor: palette.tint }]}>
          <Text style={[styles.todayText, { color: palette.accentDeep }]}>오늘로</Text>
        </Tap>
      </View>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  head: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 16,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginBottom: 12,
  },
  month: { fontSize: 15, fontWeight: '700' },
  row: { flexDirection: 'row' },
  cell: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  dow: { fontSize: 12, fontWeight: '700', paddingVertical: 8 },
  day: { height: 44, margin: 1, borderRadius: 12 },
  dayText: { fontSize: 15, fontWeight: '700' },
  mark: { width: 4, height: 4, borderRadius: 2, marginTop: 2 },
  footer: { alignItems: 'center', marginTop: 12 },
  todayBtn: { minHeight: 44, justifyContent: 'center', paddingHorizontal: 20, borderRadius: 22 },
  todayText: { fontSize: 13, fontWeight: '700' },
});
