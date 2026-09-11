import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Text } from '@/components/text';
import { BackHeader, Button, Divider, Field, Screen } from '@/components/ui';
import { useApp } from '@/lib/app-state';

/**
 * NEIS 시간표에 적힌 과목 대신 내가 실제로 듣는 과목을 적어요.
 *
 * 선택과목은 반 단위로 등록되는데, 같은 반에서도 학생마다 다른 과목을
 * 듣는 경우가 있어요. 반 시간표에 '지구과학'이라고 돼 있어도 나는
 * '역학과 에너지'를 들을 수 있어요.
 */
export default function SwapSubjectScreen() {
  const { palette, swaps, setSwap } = useApp();
  const params = useLocalSearchParams<{ subject: string }>();
  const original = params.subject ?? '';

  const [text, setText] = useState(swaps[original] ?? '');
  const changed = Boolean(swaps[original]);

  const save = () => {
    setSwap(original, text.trim());
    router.back();
  };

  const reset = () => {
    setSwap(original, '');
    router.back();
  };

  return (
    <Screen bottomInset>
      <BackHeader title="내가 듣는 과목" subtitle="시간표와 다르면 여기서 바꿔요" />

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
        한 번 바꾸면 이 과목이 나오는 모든 교시가 같이 바뀌어요. 시간표를 볼 때마다
        고칠 필요가 없어요. 나만 보이고 다른 학생에게는 영향이 없어요.
      </Text>

      <Divider />

      <View style={styles.buttons}>
        <Button
          label={text.trim() && text.trim() !== original ? `'${text.trim()}'(으)로 바꾸기` : '바꿀 과목을 적어주세요'}
          icon="check"
          disabled={!text.trim() || text.trim() === original}
          onPress={save}
        />
        {changed ? (
          <Button label="원래대로 되돌리기" variant="secondary" onPress={reset} />
        ) : null}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  box: { borderRadius: 18, padding: 16, marginBottom: 20 },
  label: { fontSize: 13, fontWeight: '700' },
  original: { fontSize: 18, fontWeight: '800', marginTop: 4 },
  label2: { fontSize: 13, fontWeight: '800', marginBottom: 8 },
  input: { borderRadius: 16, height: 52, paddingHorizontal: 16, marginBottom: 12 },
  help: { fontSize: 13, lineHeight: 20, marginBottom: 20 },
  buttons: { gap: 12, marginTop: 20 },
});
