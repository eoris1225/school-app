import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Card, Divider, Empty, Header, Screen, Segmented } from '@/components/ui';
import { ALLERGENS, MEAL_DATES, MEALS, WEEKDAYS, type Weekday } from '@/data/mock';
import { useApp } from '@/lib/app-state';
import { fromYmd, weekdayOf } from '@/lib/time';

export default function MealScreen() {
  const { palette, now } = useApp();
  const today = weekdayOf(now);
  const [day, setDay] = useState<Weekday>(today ?? '월');
  const [type, setType] = useState<'lunch' | 'dinner'>('lunch');
  const [showAllergy, setShowAllergy] = useState(false);
  const meal = MEALS[day][type];

  return (
    <Screen>
      <Header subtitle="이번 주" title="급식" />

      <View style={styles.week} accessibilityRole="tablist">
        {WEEKDAYS.map((d) => {
          const selected = d === day;
          const isToday = d === today;
          const date = fromYmd(MEAL_DATES[d]).getDate();
          return (
            <Pressable
              key={d}
              onPress={() => setDay(d)}
              accessibilityRole="tab"
              accessibilityState={{ selected }}
              accessibilityLabel={`${d}요일 ${date}일${isToday ? ', 오늘' : ''}`}
              style={[
                styles.dayBtn,
                selected
                  ? { backgroundColor: palette.accent, borderColor: palette.accent }
                  : { borderColor: isToday ? palette.accent : palette.line },
              ]}>
              <Text style={[styles.dayName, { color: selected ? palette.onAccent : palette.sub }]}>{d}</Text>
              <Text style={[styles.dayNum, { color: selected ? palette.onAccent : palette.text }]}>{date}</Text>
            </Pressable>
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

      <Card>
        {meal ? (
          <>
            {meal.items.map((item, i) => (
              <View key={item.name}>
                {i > 0 ? <Divider /> : null}
                <View style={styles.itemRow}>
                  <Text style={[styles.itemName, { color: palette.text }]}>{item.name}</Text>
                  {item.allergy.length ? (
                    <Text
                      style={[styles.itemAllergy, { color: palette.sub }]}
                      accessibilityLabel={`알레르기 ${item.allergy.map((n) => ALLERGENS[n - 1]).join(', ')}`}>
                      {item.allergy.join(' ')}
                    </Text>
                  ) : null}
                </View>
              </View>
            ))}
            <View style={[styles.kcalRow, { backgroundColor: palette.tint }]}>
              <Text style={[styles.kcalLabel, { color: palette.accentDeep }]}>열량</Text>
              <Text style={[styles.kcalValue, { color: palette.text }]}>{meal.kcal}kcal</Text>
            </View>
          </>
        ) : (
          <Empty text={`${day}요일은 저녁 급식이 없어요`} />
        )}
      </Card>

      <Pressable
        onPress={() => setShowAllergy((v) => !v)}
        accessibilityRole="button"
        accessibilityState={{ expanded: showAllergy }}
        style={styles.allergyToggle}>
        <Text style={[styles.allergyToggleText, { color: palette.accentDeep }]}>
          {showAllergy ? '알레르기 번호 닫기' : '메뉴 옆 숫자는 알레르기 번호예요. 번호 보기'}
        </Text>
      </Pressable>

      {showAllergy ? (
        <Card>
          <View style={styles.allergyGrid}>
            {ALLERGENS.map((name, i) => (
              <Text key={name} style={[styles.allergyItem, { color: palette.text }]}>
                <Text style={{ color: palette.accentDeep, fontWeight: '800' }}>{i + 1} </Text>
                {name}
              </Text>
            ))}
          </View>
        </Card>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  week: { flexDirection: 'row', gap: 8, marginBottom: 14 },
  dayBtn: {
    flex: 1,
    height: 68,
    borderRadius: 20,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  dayName: { fontSize: 14, fontWeight: '700' },
  dayNum: { fontSize: 22, fontWeight: '800', fontVariant: ['tabular-nums'] },

  itemRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 13 },
  itemName: { fontSize: 18, fontWeight: '700' },
  itemAllergy: { fontSize: 14, fontWeight: '600', fontVariant: ['tabular-nums'] },
  kcalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginTop: 10,
  },
  kcalLabel: { fontSize: 15, fontWeight: '700' },
  kcalValue: { fontSize: 15, fontWeight: '800' },

  allergyToggle: { paddingVertical: 8, marginBottom: 8 },
  allergyToggleText: { fontSize: 15, fontWeight: '700' },
  allergyGrid: { flexDirection: 'row', flexWrap: 'wrap', rowGap: 10 },
  allergyItem: { width: '33.33%', fontSize: 15 },
});
