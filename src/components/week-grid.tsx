import { StyleSheet, View } from 'react-native';

import { Tap } from '@/components/motion';
import { Text } from '@/components/text';
import { subjectTone } from '@/constants/tones';
import { WEEKDAYS, type Weekday } from '@/data/mock';
import { useApp } from '@/lib/app-state';
import { slotKey, type SubjectSwaps } from '@/lib/my-settings';
import { readSubject } from '@/lib/subject';
import { lunchAfter } from '@/lib/bells';
import { rowsOf, type Week } from '@/lib/timetable';

/*
 * 한 주 시간표 컬러표예요.
 *
 * 시간표 화면의 '한 주'와 가입 직후 설정에서 같은 표를 써요. 두 군데에
 * 따로 그려두면 한쪽만 고쳐지거든요.
 *
 * 칸 색은 과목이 정해요. 국어면 늘 같은 색이라 표를 훑기만 해도 오늘이
 * 무슨 날인지 보여요. 지금 하는 수업만 테마색으로 도드라지게 해요.
 *
 * onPick을 넘기면 칸을 누를 수 있어요. 선택과목은 반마다 대표 과목 하나만
 * 올라와서, 실제로 듣는 과목으로 바꿔야 하는 칸이 생겨요.
 */
export function WeekGrid({
  week,
  today,
  nowPeriod,
  onPick,
  swaps,
}: {
  week: Week;
  /** 오늘 요일. 주말이면 null이에요. */
  today: Weekday | null;
  /** 지금이 몇 교시인지. 수업 시간이 아니면 null이에요. */
  nowPeriod: number | null;
  /** 칸을 눌렀을 때. 안 넘기면 누를 수 없어요. */
  onPick?: (day: Weekday, period: number) => void;
  /** 바꾼 칸에 점을 찍어요. */
  swaps?: SubjectSwaps;
}) {
  const { palette, bells } = useApp();
  // 줄 수는 시간표가 정해요. 점심 줄은 학교가 넣어둔 시각표가 있을 때만 그려요.
  const rows = rowsOf(week);
  const lunch = lunchAfter(bells);

  return (
    <View>
      <View style={styles.row}>
        <View style={styles.periodCell} />
        {WEEKDAYS.map((d) => (
          <View key={d} style={[styles.head, d === today && { backgroundColor: palette.tint }]}>
            <Text style={[styles.headText, { color: d === today ? palette.accentDeep : palette.sub }]}>{d}</Text>
          </View>
        ))}
      </View>

      {Array.from({ length: rows }, (_, i) => i + 1).map((period, i) => (
        <View key={period}>
          {lunch > 0 && period === lunch + 1 ? (
            <View style={[styles.lunch, { borderTopColor: palette.line }]}>
              <Text style={[styles.lunchText, { color: palette.sub }]}>점심시간</Text>
            </View>
          ) : null}
          <View style={styles.row}>
            <View style={styles.periodCell}>
              <Text numeric style={[styles.period, { color: palette.sub }]}>
                {period}
              </Text>
            </View>
            {WEEKDAYS.map((d) => {
              const subject = week[d][i];
              // 그 반에 그 교시가 없으면 빈 칸으로 둬요.
              if (!subject) return <View key={d} style={styles.cellEmpty} />;
              const isNow = d === today && period === nowPeriod;
              const changed = !!swaps && swaps[slotKey(d, period)] !== undefined;
              const st = subjectTone(subject, palette.scheme);
              const label = `${d}요일 ${period}교시 ${readSubject(subject).name}${isNow ? ', 지금 수업 중' : ''}${changed ? ', 바꿈' : ''}${onPick ? ', 눌러서 내가 듣는 과목으로 바꾸기' : ''}`;

              const inside = (
                <>
                  <Text
                    style={[styles.cellText, { color: isNow ? palette.onAccent : st.fg }]}
                    numberOfLines={1}>
                    {readSubject(subject).short}
                  </Text>
                  {/* 바꾼 칸에는 점을 하나 찍어요. 글자를 더 넣기에는 칸이 좁아요. */}
                  {changed ? (
                    <View style={[styles.mark, { backgroundColor: isNow ? palette.onAccent : st.fg }]} />
                  ) : null}
                </>
              );

              const look = [
                styles.cell,
                { backgroundColor: st.bg },
                isNow && { backgroundColor: palette.accent },
              ];

              if (!onPick) {
                return (
                  <View key={d} style={look} accessible accessibilityLabel={label}>
                    {inside}
                  </View>
                );
              }
              return (
                <Tap
                  key={d}
                  onPress={() => onPick(d, period)}
                  accessibilityRole="button"
                  accessibilityLabel={label}
                  depth={0.06}
                  style={look}>
                  {inside}
                </Tap>
              );
            })}
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row' },
  periodCell: { width: 26, alignItems: 'center', justifyContent: 'center' },
  period: { fontSize: 12, fontWeight: '800' },
  head: { flex: 1, alignItems: 'center', paddingVertical: 8, marginHorizontal: 1, borderRadius: 10 },
  headText: { fontSize: 13, fontWeight: '800' },
  cellEmpty: { flex: 1, height: 50, margin: 2 },
  cell: { flex: 1, height: 50, alignItems: 'center', justifyContent: 'center', margin: 2, borderRadius: 12 },
  cellText: { fontSize: 12, fontWeight: '700' },
  mark: { width: 4, height: 4, borderRadius: 2, marginTop: 3 },
  lunch: { borderTopWidth: 1.5, borderStyle: 'dashed', marginTop: 4, paddingTop: 4 },
  lunchText: { fontSize: 12, fontWeight: '700', textAlign: 'center' },
});
