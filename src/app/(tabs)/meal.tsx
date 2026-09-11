import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Text } from '@/components/text';
import { Card, Divider, Empty, Header, IconChip, Screen, Segmented } from '@/components/ui';
import { ALLERGENS, MEAL_DATES, MEALS, WEEKDAYS, type Weekday } from '@/data/mock';
import { useApp } from '@/lib/app-state';
import { useLayout } from '@/lib/layout';
import { fromYmd, weekdayOf } from '@/lib/time';

export default function MealScreen() {
  const { palette, now } = useApp();
  const { tablet } = useLayout();
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
              <Text numeric style={[styles.dayNum, { color: selected ? palette.onAccent : palette.text }]}>
                {date}
              </Text>
              {/* 오늘 표시는 골라도 사라지지 않게 점으로 남겨둬요. */}
              <View
                style={[
                  styles.todayDot,
                  isToday && { backgroundColor: selected ? palette.onAccent : palette.accent },
                ]}
              />
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
        <View style={styles.mealHead}>
          <IconChip icon="meal" tone={type === 'lunch' ? 'orange' : 'indigo'} size={38} />
          <View style={styles.fill}>
            <Text style={[styles.mealTitle, { color: palette.text }]}>
              {day}요일 {type === 'lunch' ? '점심' : '저녁'}
            </Text>
            <Text style={[styles.mealSub, { color: palette.sub }]}>
              {meal ? `${meal.items.length}가지 · ${meal.kcal}kcal` : '급식이 없는 날이에요'}
            </Text>
          </View>
        </View>
        {meal ? (
          <>
            {meal.items.map((item, i) => (
              <View key={item.name}>
                {i > 0 ? <Divider /> : null}
                <View style={styles.itemRow}>
                  <Text style={[styles.itemName, { color: palette.text }]}>{item.name}</Text>
                  {item.allergy.length ? (
                    <Text
                      numeric
                      style={[styles.itemAllergy, { color: palette.sub }]}
                      accessibilityLabel={`알레르기 ${item.allergy.map((n) => ALLERGENS[n - 1]).join(', ')}`}>
                      {item.allergy.join(' ')}
                    </Text>
                  ) : null}
                </View>
              </View>
            ))}
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
              <Text key={name} style={[styles.allergyItem, { width: tablet ? '20%' : '33.33%' }, { color: palette.text }]}>
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
    height: 72,
    borderRadius: 20,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  dayName: { fontSize: 12, fontWeight: '700' },
  dayNum: { fontSize: 19, fontWeight: '800', fontVariant: ['tabular-nums'] },
  todayDot: { width: 5, height: 5, borderRadius: 3, marginTop: 1 },

  fill: { flex: 1 },
  mealHead: { flexDirection: 'row', alignItems: 'center', gap: 11, paddingBottom: 6 },
  mealTitle: { fontSize: 15, fontWeight: '800' },
  mealSub: { fontSize: 12, fontWeight: '600', marginTop: 1 },
  itemRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 13 },
  itemName: { fontSize: 15, fontWeight: '700' },
  itemAllergy: { fontSize: 12, fontWeight: '600', fontVariant: ['tabular-nums'] },
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
  allergyToggleText: { fontSize: 13, fontWeight: '700' },
  allergyGrid: { flexDirection: 'row', flexWrap: 'wrap', rowGap: 10 },
  allergyItem: { fontSize: 13 },
});
