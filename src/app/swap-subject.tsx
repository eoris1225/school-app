import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Icon } from '@/components/icon';
import { Tap } from '@/components/motion';
import { Text } from '@/components/text';
import { BackHeader, Button, Divider, Field, Screen } from '@/components/ui';
import { useApp } from '@/lib/app-state';
import { slotKey } from '@/lib/my-settings';

/**
 * NEIS 시간표에 적힌 과목 대신 내가 실제로 듣는 과목을 적어요.
 *
 * 교시 하나씩 바꿔요. 예전에는 과목 이름으로 묶어서 한 번에 바꿨는데
 * 그게 틀렸어요. NEIS는 선택 블록에 대표 과목 하나만 적거든요.
 * 서일여고 2학년 6반 월요일이 그래요. 실제로는 6교시가 선택B,
 * 7교시가 선택C인데 NEIS는 둘 다 "역학과 에너지"로 줘요.
 * 이름으로 묶으면 한쪽을 고칠 때 다른 쪽까지 잘못 바뀌어요.
 *
 * 대신 같은 이름이 나오는 다른 교시를 알려주고, 함께 바꿀지 고르게 해요.
 */
export default function SwapSubjectScreen() {
  const { palette, swaps, setSwap } = useApp();
  const params = useLocalSearchParams<{ day: string; period: string; subject: string; same: string }>();

  const day = params.day ?? '';
  const period = Number(params.period ?? 0);
  const original = params.subject ?? '';
  const here = slotKey(day, period);
  // 같은 이름이 나오는 다른 교시들. '화-7' 모양이에요.
  const same = (params.same ?? '').split(',').filter(Boolean);

  const [text, setText] = useState(swaps[here] ?? '');
  const [alsoSame, setAlsoSame] = useState(false);
  const changed = swaps[here] !== undefined;

  const targets = alsoSame ? [here, ...same] : [here];

  const save = () => {
    setSwap(targets, text.trim());
    router.back();
  };

  const reset = () => {
    setSwap(alsoSame ? [here, ...same] : [here], '');
    router.back();
  };

  const pretty = (slot: string) => {
    const [d, p] = slot.split('-');
    return `${d} ${p}교시`;
  };

  return (
    <Screen bottomInset>
      <BackHeader title="내가 듣는 과목" subtitle={`${day}요일 ${period}교시`} />

      <View style={[styles.box, { backgroundColor: palette.tint }]}>
        <Text style={[styles.label, { color: palette.sub }]}>시간표에 적힌 과목</Text>
        <Text style={[styles.original, { color: palette.text }]}>{original}</Text>
      </View>

      <Text style={[styles.label2, { color: palette.text }]}>내가 실제로 듣는 과목</Text>
      <Field
        value={text}
        onChangeText={setText}
        placeholder={original}
        autoFocus
        accessibilityLabel="내가 듣는 과목 이름"
        style={styles.input}
      />

      <Text style={[styles.help, { color: palette.sub }]}>
        이 교시 하나만 바뀌어요. 나만 보이고 다른 학생에게는 영향이 없어요.
      </Text>

      {/*
        같은 이름이 여러 교시에 나올 때만 보여줘요.
        기본은 꺼둬요. 이름이 같다고 같은 수업이라는 보장이 없거든요.
        선택 블록이 다르면 이름만 같고 실제로는 다른 과목이에요.
      */}
      {same.length > 0 ? (
        <>
          <Divider />
          <Tap
            onPress={() => setAlsoSame((v) => !v)}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: alsoSame }}
            accessibilityLabel={`같은 이름인 다른 교시 ${same.length}곳도 함께 바꾸기`}
            depth={0.03}
            style={[styles.check, { backgroundColor: alsoSame ? palette.tint : 'transparent' }]}>
            <View
              style={[
                styles.tick,
                { borderColor: alsoSame ? palette.accent : palette.line },
                alsoSame && { backgroundColor: palette.accent },
              ]}>
              {alsoSame ? <Icon name="check" size={16} color={palette.onAccent} /> : null}
            </View>
            <View style={styles.fill}>
              <Text style={[styles.checkTitle, { color: palette.text }]}>
                {`‘${original}’`}인 다른 {same.length}교시도 함께 바꾸기
              </Text>
              <Text style={[styles.checkSub, { color: palette.sub }]}>
                {same.map(pretty).join(' · ')}
              </Text>
            </View>
          </Tap>

          <Text style={[styles.warn, { color: palette.sub }]}>
            이름이 같아도 다른 수업일 수 있어요. 선택과목은 시간표에 대표 과목
            하나만 적히거든요. 6교시와 7교시가 둘 다 {`‘${original}’`}로 보여도
            실제로는 선택B와 선택C처럼 서로 다른 시간일 수 있어요.
            확실하지 않으면 켜지 말고 교시마다 따로 바꿔주세요.
          </Text>
        </>
      ) : null}

      <Divider />

      <View style={styles.buttons}>
        <Button
          label={
            text.trim() && text.trim() !== original
              ? `‘${text.trim()}’(으)로 바꾸기${alsoSame ? ` (${targets.length}교시)` : ''}`
              : '바꿀 과목을 적어주세요'
          }
          icon="check"
          disabled={!text.trim() || text.trim() === original}
          onPress={save}
        />
        {changed ? <Button label="원래대로 되돌리기" variant="secondary" onPress={reset} /> : null}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  box: { borderRadius: 18, padding: 16, marginBottom: 20 },
  label: { fontSize: 13, fontWeight: '700' },
  original: { fontSize: 18, fontWeight: '800', marginTop: 4 },
  label2: { fontSize: 13, fontWeight: '800', marginBottom: 8 },
  input: { borderRadius: 16, height: 52, paddingHorizontal: 16, marginBottom: 12 },
  help: { fontSize: 13, lineHeight: 20, marginBottom: 20 },

  check: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minHeight: 44,
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 12,
    marginVertical: 12,
  },
  tick: { width: 24, height: 24, borderRadius: 8, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  checkTitle: { fontSize: 15, fontWeight: '700' },
  checkSub: { fontSize: 13, marginTop: 2 },
  warn: { fontSize: 13, lineHeight: 20, marginBottom: 20 },

  buttons: { gap: 12, marginTop: 20 },
});
