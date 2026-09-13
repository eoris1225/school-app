import { StyleSheet, View } from 'react-native';

import { Tap } from '@/components/motion';
import { Text } from '@/components/text';
import { subjectTone } from '@/constants/tones';
import { BELL, LUNCH, WEEKDAYS, type Weekday } from '@/data/mock';
import { useApp } from '@/lib/app-state';
import { readSubject } from '@/lib/subject';
import { cellsAt, isEdited, type TeachCell, type TeachSettings, type TeachWeek } from '@/lib/teacher-week';

/*
 * 선생님의 한 주 표예요.
 *
 * 학생 표(week-grid.tsx)와 비슷하지만 칸에 들어가는 게 달라요. 학생은
 * "무슨 과목"만 알면 되는데 선생님은 "몇 반"이 더 중요해요. 그래서 칸마다
 * 반을 위에, 과목을 아래에 적어요.
 *
 * 같은 교시에 두 반이 걸릴 수 있어요. 선생님은 한 번에 한 반에만 들어가니
 * 그건 "같은 과목 선생님이 여러 분인데 아직 반을 안 좁혔다"는 뜻이에요.
 * 감추지 않고 둘 다 보여주고 테두리로 표시해요. 화면이 조용히 하나만
 * 고르면 틀린 시간표를 맞는 것처럼 보여주는 셈이에요.
 */
/**
 * 칸 위에 적을 반 이름이에요.
 *
 * 예전에는 겹칠 때 '2곳'이라고만 적었어요. 그런데 선생님한테 '2곳'은 아무
 * 말도 아니에요. 어느 반인지가 궁금한 거지 몇 개인지가 궁금한 게 아니거든요.
 * 그래서 반 이름을 그대로 적어요. 칸이 좁아서 셋부터는 '외 N'으로 줄여요.
 *
 * '2반'처럼 적으면 안 돼요. 2반 수업인 줄 읽혀요. 꼭 '2-6' 모양으로 적어요.
 */
function classLabel(cells: TeachCell[]): string {
  const names = cells.map((c) => c.cls ?? '직접');
  if (names.length === 1) return names[0];
  if (names.length === 2) return names.join('·');
  return `${names[0]} 외 ${names.length - 1}`;
}

export function TeachGrid({
  week,
  settings,
  today,
  nowPeriod,
  onPick,
}: {
  week: TeachWeek;
  settings: TeachSettings;
  today: Weekday | null;
  nowPeriod: number | null;
  /** 칸을 눌렀을 때. 비어 있는 칸도 눌러서 채울 수 있어요. */
  onPick: (day: Weekday, period: number) => void;
}) {
  const { palette } = useApp();

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

      {BELL.map((bell, i) => (
        <View key={bell.period}>
          {bell.period === LUNCH.afterPeriod + 1 ? (
            <View style={[styles.lunch, { borderTopColor: palette.line }]}>
              <Text style={[styles.lunchText, { color: palette.sub }]}>점심시간</Text>
            </View>
          ) : null}
          <View style={styles.row}>
            <View style={styles.periodCell}>
              <Text numeric style={[styles.period, { color: palette.sub }]}>
                {bell.period}
              </Text>
            </View>
            {WEEKDAYS.map((d) => {
              const cells = cellsAt(week, d, bell.period);
              const isNow = d === today && bell.period === nowPeriod;
              const edited = isEdited(settings, d, bell.period);
              const clash = cells.length > 1;
              const first = cells[0];
              const tone = first ? subjectTone(first.subject, palette.scheme) : null;

              const label = cells.length
                ? `${d}요일 ${bell.period}교시 ${cells.map((c) => `${c.cls ?? '직접 넣음'} ${readSubject(c.subject).name}`).join(', ')}${clash ? `, ${cells.length}개 반이 겹쳐요` : ''}${isNow ? ', 지금 수업 중' : ''}, 눌러서 고치기`
                : `${d}요일 ${bell.period}교시 비어 있음, 눌러서 내 수업 넣기`;

              return (
                <Tap
                  key={d}
                  onPress={() => onPick(d, bell.period)}
                  accessibilityRole="button"
                  accessibilityLabel={label}
                  depth={0.06}
                  style={[
                    styles.cell,
                    { borderColor: 'transparent' },
                    tone ? { backgroundColor: tone.bg } : { backgroundColor: palette.bg },
                    // 지금 교시 표시예요. 수업이 없는 칸까지 진하게 칠하면
                    // 빈 네모가 덩그러니 떠서 고장 난 것처럼 보여요.
                    isNow && { backgroundColor: first ? palette.accent : palette.tint },
                    clash && { borderColor: palette.sunday },
                  ]}>
                  {first ? (
                    <>
                      <Text
                        numberOfLines={1}
                        style={[styles.cls, { color: isNow ? palette.onAccent : (tone?.fg ?? palette.sub) }]}>
                        {classLabel(cells)}
                      </Text>
                      <Text
                        numberOfLines={1}
                        style={[styles.subject, { color: isNow ? palette.onAccent : (tone?.fg ?? palette.text) }]}>
                        {readSubject(first.subject).short}
                      </Text>
                      {/* 손으로 고친 칸에는 점을 찍어요. 칸이 좁아서 글자는 못 넣어요. */}
                      {edited ? (
                        <View
                          style={[
                            styles.mark,
                            { backgroundColor: isNow ? palette.onAccent : (tone?.fg ?? palette.sub) },
                          ]}
                        />
                      ) : null}
                    </>
                  ) : edited ? (
                    // 내 수업이 아니라고 표시해둔 칸이에요. 빈 칸과 구분해줘요.
                    <Text style={[styles.off, { color: palette.sub }]}>―</Text>
                  ) : null}
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
  cell: {
    flex: 1,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
    margin: 2,
    borderRadius: 12,
    borderWidth: 1.5,
  },
  cls: { fontSize: 11, fontWeight: '800' },
  subject: { fontSize: 12, fontWeight: '700', marginTop: 1 },
  off: { fontSize: 14, fontWeight: '800' },
  mark: { width: 4, height: 4, borderRadius: 2, marginTop: 2 },
  lunch: { borderTopWidth: 1.5, borderStyle: 'dashed', marginTop: 4, paddingTop: 4 },
  lunchText: { fontSize: 12, fontWeight: '700', textAlign: 'center' },
});
