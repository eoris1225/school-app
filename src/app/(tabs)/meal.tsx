import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Tap } from '@/components/motion';
import { Text } from '@/components/text';
import { Divider, Empty, ErrorNote, Header, Loading, Screen, SectionTitle, Segmented } from '@/components/ui';
import { ALLERGENS, WEEKDAYS, type Weekday } from '@/data/mock';
import { allergyHits } from '@/lib/my-settings';
import { getMeals } from '@/lib/api';
import { useApp } from '@/lib/app-state';
import { useLayout } from '@/lib/layout';
import { fromYmd, weekDates, weekdayOf } from '@/lib/time';
import { useRemote } from '@/lib/use-remote';

/** "9월 7일~11일". 달이 넘어가면 "9월 28일~10월 2일" 로 적어요. */
function weekLabel(from: string, to: string) {
  const a = fromYmd(from);
  const b = fromYmd(to);
  const head = `${a.getMonth() + 1}월 ${a.getDate()}일`;
  const tail = a.getMonth() === b.getMonth() ? `${b.getDate()}일` : `${b.getMonth() + 1}월 ${b.getDate()}일`;
  return `${head}~${tail}`;
}

export default function MealScreen() {
  const { palette, now, school, allergies } = useApp();
  const { tablet } = useLayout();
  const today = weekdayOf(now);
  const [day, setDay] = useState<Weekday>(today ?? '월');
  const [type, setType] = useState<'lunch' | 'dinner'>('lunch');
  const [showAllergy, setShowAllergy] = useState(false);

  // 한 주치를 한 번에 받아둬요. 요일을 눌러도 다시 부르지 않아 바로 바뀌어요.
  const dates = weekDates(now);
  const week = useRemote(`meal:${school?.code}:${dates.월}`, () =>
    getMeals(dates.월, dates.금, school ?? undefined),
  );

  const meal = week.data?.find((m) => m.date === dates[day] && m.type === type) ?? null;
  // 내가 못 먹는 재료가 든 메뉴들
  const risky = (meal?.items ?? []).filter((i) => allergyHits(i.allergy, allergies).length > 0);

  return (
    <Screen>
      <Header subtitle={weekLabel(dates.월, dates.금)} title="급식" />

      {/* 요일 고르기. 테두리 없이 고른 날만 색으로 표시해요. */}
      <View style={styles.week} accessibilityRole="tablist">
        {WEEKDAYS.map((d) => {
          const selected = d === day;
          const isToday = d === today;
          const date = fromYmd(dates[d]).getDate();
          return (
            <Tap
              key={d}
              onPress={() => setDay(d)}
              accessibilityRole="tab"
              accessibilityState={{ selected }}
              accessibilityLabel={`${d}요일 ${date}일${isToday ? ', 오늘' : ''}`}
              depth={0.05}
              style={[
                styles.dayBtn,
                selected && { backgroundColor: palette.accent },
                !selected && isToday && { backgroundColor: palette.tint },
              ]}>
              <Text style={[styles.dayName, { color: selected ? palette.onAccent : palette.sub }]}>{d}</Text>
              <Text numeric style={[styles.dayNum, { color: selected ? palette.onAccent : palette.text }]}>
                {date}
              </Text>
            </Tap>
          );
        })}
      </View>

      <Segmented
        value={type}
        onChange={setType}
        options={[
          { value: 'lunch', label: '점심' },
          { value: 'dinner', label: '저녁' },
        ]}
      />

      {week.loading ? (
        <Loading text="급식을 불러오는 중이에요" />
      ) : week.error ? (
        <ErrorNote text={week.error} onRetry={week.retryable ? week.retry : undefined} />
      ) : (
        <>
          <SectionTitle
            title={`${day}요일 ${type === 'lunch' ? '점심' : '저녁'}`}
            value={meal ? `${meal.items.length}가지${meal.kcal ? ` · ${meal.kcal}kcal` : ''}` : undefined}
          />

          {/* 내가 못 먹는 게 들어 있으면 맨 위에 한 번 모아서 알려줘요.
              메뉴를 하나하나 훑기 전에 먼저 보이게요. */}
          {meal && risky.length > 0 ? (
            <View style={[styles.warn, { backgroundColor: palette.tint }]}>
              <Text style={[styles.warnTitle, { color: palette.accentDeep }]}>
                못 먹는 재료가 든 메뉴가 {risky.length}가지 있어요
              </Text>
              <Text style={[styles.warnBody, { color: palette.text }]}>
                {risky.map((r) => r.name).join(', ')}
              </Text>
            </View>
          ) : null}

          {meal ? (
            meal.items.map((item, i, arr) => {
              const hits = allergyHits(item.allergy, allergies);
              return (
                <View key={`${item.name}-${i}`}>
                  <View style={styles.itemRow}>
                    <View style={styles.itemLeft}>
                      {hits.length ? (
                        <View style={[styles.dot, { backgroundColor: palette.accent }]} />
                      ) : null}
                      <Text
                        style={[
                          styles.itemName,
                          { color: hits.length ? palette.accentDeep : palette.text },
                        ]}>
                        {item.name}
                      </Text>
                    </View>
                    {item.allergy.length ? (
                      <Text
                        numeric
                        style={[
                          styles.itemAllergy,
                          { color: hits.length ? palette.accentDeep : palette.sub },
                        ]}
                        accessibilityLabel={`알레르기 ${item.allergy.map((n) => ALLERGENS[n - 1]).join(', ')}${
                          hits.length ? `. 내가 못 먹는 ${hits.map((n) => ALLERGENS[n - 1]).join(', ')} 들어 있어요` : ''
                        }`}>
                        {item.allergy.join(' ')}
                      </Text>
                    ) : null}
                  </View>
                  {i < arr.length - 1 ? <Divider /> : null}
                </View>
              );
            })
          ) : (
            <Empty text={`${day}요일은 ${type === 'lunch' ? '점심' : '저녁'} 급식이 없어요`} />
          )}

          <Tap
            onPress={() => setShowAllergy((v) => !v)}
            accessibilityRole="button"
            accessibilityState={{ expanded: showAllergy }}
            depth={0.03}
            style={styles.allergyToggle}>
            <Text style={[styles.allergyToggleText, { color: palette.accentDeep }]}>
              {showAllergy ? '알레르기 번호 닫기' : '메뉴 옆 숫자는 알레르기 번호예요. 번호 보기'}
            </Text>
          </Tap>

          {showAllergy ? (
            <View style={[styles.allergyGrid, { backgroundColor: palette.tint }]}>
              {ALLERGENS.map((name, i) => (
                <Text key={name} style={[styles.allergyItem, { width: tablet ? '20%' : '33.33%', color: palette.text }]}>
                  <Text numeric style={{ color: palette.accentDeep, fontWeight: '700' }}>
                    {i + 1}{' '}
                  </Text>
                  {name}
                </Text>
              ))}
            </View>
          ) : null}
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  week: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  dayBtn: { flex: 1, height: 64, borderRadius: 18, alignItems: 'center', justifyContent: 'center', gap: 2 },
  dayName: { fontSize: 12, fontWeight: '700' },
  dayNum: { fontSize: 18, fontWeight: '800' },

  itemRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 12, gap: 12 },
  itemLeft: { flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  warn: { borderRadius: 18, padding: 16, marginBottom: 8 },
  warnTitle: { fontSize: 13, fontWeight: '800' },
  warnBody: { fontSize: 15, lineHeight: 23, marginTop: 4 },
  itemName: { fontSize: 15, fontWeight: '600' },
  itemAllergy: { fontSize: 12, fontWeight: '600' },

  allergyToggle: { paddingVertical: 16 },
  allergyToggleText: { fontSize: 13, fontWeight: '700' },
  allergyGrid: { flexDirection: 'row', flexWrap: 'wrap', rowGap: 8, borderRadius: 18, padding: 16 },
  allergyItem: { fontSize: 13 },
});
