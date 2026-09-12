import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Tap } from '@/components/motion';
import { Text } from '@/components/text';
import { BackHeader, Divider, Empty, ErrorNote, Field, Loading, Screen } from '@/components/ui';
import { findSchools, type SchoolInfo } from '@/lib/api';
import { useApp } from '@/lib/app-state';
import { useRemote } from '@/lib/use-remote';

/** 두 글자보다 짧으면 검색하지 않아요. 결과가 수천 개 나와서 의미가 없어요. */
const MIN = 2;

export default function PickSchoolScreen() {
  const { palette } = useApp();
  const [text, setText] = useState('');

  // 입력할 때마다 부르면 너무 자주 불러요. 다 치고 확인 버튼을 누르면 찾아요.
  const [query, setQuery] = useState('');
  const ready = query.length >= MIN;

  const found = useRemote(`school:${query}`, () =>
    ready ? findSchools(query) : Promise.resolve({ schools: [], total: 0 }),
  );
  const schools = found.data?.schools ?? [];
  const total = found.data?.total ?? 0;

  const pick = (s: SchoolInfo) => {
    router.push({
      pathname: '/pick-class',
      params: { office: s.office, officeName: s.officeName, code: s.code, name: s.name },
    });
  };

  return (
    <Screen bottomInset>
      <BackHeader title="학교 찾기" subtitle="다니는 학교 이름을 적어주세요" />

      <Field
        value={text}
        onChangeText={setText}
        onSubmitEditing={() => setQuery(text.trim())}
        placeholder="예) 서일여자고등학교"
        returnKeyType="search"
        autoFocus
        accessibilityLabel="학교 이름"
      />

      <Tap
        onPress={() => setQuery(text.trim())}
        disabled={text.trim().length < MIN}
        accessibilityRole="button"
        depth={0.04}
        style={[
          styles.search,
          { backgroundColor: text.trim().length < MIN ? palette.tint : palette.accent },
        ]}>
        <Text
          style={[
            styles.searchText,
            { color: text.trim().length < MIN ? palette.sub : palette.onAccent },
          ]}>
          찾기
        </Text>
      </Tap>

      {!ready ? (
        <Empty art="map" text="다니는 학교를 찾아주세요" hint={`이름을 ${MIN}글자 이상 적고 찾기를 누르면 돼요.`} />
      ) : found.loading ? (
        <Loading text="학교를 찾는 중이에요" />
      ) : found.error ? (
        <ErrorNote text={found.error} onRetry={found.retryable ? found.retry : undefined} />
      ) : schools.length === 0 ? (
        <Empty
          art="warn"
          text={`'${query}' 로 찾은 학교가 없어요`}
          hint="띄어쓰기를 빼거나 앞 두 글자만 적어보세요."
        />
      ) : (
        <View style={styles.list}>
          {total > schools.length ? (
            <Text style={[styles.hint, { color: palette.sub }]}>
              {total}곳 중 {schools.length}곳만 보여요. 이름을 더 자세히 적으면 찾기 쉬워요
            </Text>
          ) : null}
          {schools.map((s, i, arr) => (
            <View key={`${s.office}-${s.code}`}>
              <Tap
                onPress={() => pick(s)}
                accessibilityRole="button"
                accessibilityLabel={`${s.name}, ${s.officeName}`}
                depth={0.02}
                style={styles.row}>
                <View style={styles.fill}>
                  <Text style={[styles.name, { color: palette.text }]}>{s.name}</Text>
                  <Text style={[styles.meta, { color: palette.sub }]} numberOfLines={1}>
                    {s.officeName} · {s.address}
                  </Text>
                </View>
              </Tap>
              {i < arr.length - 1 ? <Divider /> : null}
            </View>
          ))}
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  search: { height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginTop: 12 },
  searchText: { fontSize: 15, fontWeight: '700' },
  list: { marginTop: 8 },
  hint: { fontSize: 13, lineHeight: 20, paddingVertical: 12 },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, minHeight: 44 },
  name: { fontSize: 15, fontWeight: '700' },
  meta: { fontSize: 13, marginTop: 2 },
});
