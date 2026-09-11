import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Tap } from '@/components/motion';
import { Text } from '@/components/text';
import { BackHeader, Button, Empty, ErrorNote, Loading, Screen, SectionTitle } from '@/components/ui';
import { getClasses } from '@/lib/api';
import { useApp } from '@/lib/app-state';
import { useRemote } from '@/lib/use-remote';

export default function PickClassScreen() {
  const { palette, setSchool, now } = useApp();
  const params = useLocalSearchParams<{
    office: string;
    officeName: string;
    code: string;
    name: string;
  }>();

  const [grade, setGrade] = useState<number | null>(null);
  const [cls, setCls] = useState<string | null>(null);

  const school = { office: params.office, code: params.code };
  const year = now.getFullYear();
  const rooms = useRemote(`classes:${params.code}:${year}`, () => getClasses(year, school));

  const grades = [...new Set((rooms.data ?? []).map((r) => r.grade))].sort((a, b) => a - b);
  const classes = (rooms.data ?? []).filter((r) => r.grade === grade).map((r) => r.cls);

  const done = () => {
    if (grade === null || cls === null) return;
    setSchool({
      office: params.office,
      officeName: params.officeName ?? '',
      code: params.code,
      name: params.name,
      grade,
      cls,
    });
    router.dismissAll();
  };

  return (
    <Screen bottomInset>
      <BackHeader title={params.name} subtitle="몇 학년 몇 반인가요?" />

      {rooms.loading ? (
        <Loading text="학년과 반을 불러오는 중이에요" />
      ) : rooms.error ? (
        <ErrorNote text={rooms.error} onRetry={rooms.retryable ? rooms.retry : undefined} />
      ) : grades.length === 0 ? (
        <Empty text="이 학교는 학년·반 정보가 올라와 있지 않아요. 다른 학교를 골라주세요" />
      ) : (
        <>
          <SectionTitle title="학년" />
          <View style={styles.row}>
            {grades.map((g) => {
              const on = g === grade;
              return (
                <Tap
                  key={g}
                  onPress={() => {
                    setGrade(g);
                    setCls(null); // 학년이 바뀌면 반은 다시 골라야 해요
                  }}
                  accessibilityRole="button"
                  accessibilityState={{ selected: on }}
                  accessibilityLabel={`${g}학년`}
                  depth={0.05}
                  style={[styles.pill, { backgroundColor: on ? palette.accent : palette.tint }]}>
                  <Text numeric style={[styles.pillText, { color: on ? palette.onAccent : palette.text }]}>
                    {g}
                  </Text>
                </Tap>
              );
            })}
          </View>

          {grade !== null ? (
            <>
              <SectionTitle title="반" value={`${classes.length}개`} />
              <View style={styles.row}>
                {classes.map((c) => {
                  const on = c === cls;
                  return (
                    <Tap
                      key={c}
                      onPress={() => setCls(c)}
                      accessibilityRole="button"
                      accessibilityState={{ selected: on }}
                      accessibilityLabel={`${c}반`}
                      depth={0.05}
                      style={[styles.pill, { backgroundColor: on ? palette.accent : palette.tint }]}>
                      <Text numeric style={[styles.pillText, { color: on ? palette.onAccent : palette.text }]}>
                        {c}
                      </Text>
                    </Tap>
                  );
                })}
              </View>
            </>
          ) : null}

          <View style={styles.bottom}>
            <Button
              label={
                grade !== null && cls !== null ? `${grade}학년 ${cls}반으로 시작하기` : '학년과 반을 골라주세요'
              }
              onPress={done}
              disabled={grade === null || cls === null}
            />
          </View>
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  pill: { minWidth: 56, height: 56, borderRadius: 18, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16 },
  pillText: { fontSize: 18, fontWeight: '800' },
  bottom: { marginTop: 32 },
});
