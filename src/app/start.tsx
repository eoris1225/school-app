import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icon } from '@/components/icon';
import { Tap } from '@/components/motion';
import { Text } from '@/components/text';
import { Button, Field, Loading, Segmented } from '@/components/ui';
import { buildPalette, THEMES } from '@/constants/themes';
import { useApp } from '@/lib/app-state';
import { signIn, signUp } from '@/lib/auth';
import { useLayout } from '@/lib/layout';
import { classLabelOf } from '@/lib/my-school';

type Mode = 'signin' | 'signup';

export default function StartScreen() {
  const { palette, scheme, themeKey, setThemeKey, school, schoolLoading, me, authLoading } = useApp();
  const insets = useSafeAreaInsets();
  const { content } = useLayout();

  const [mode, setMode] = useState<Mode>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState<string | null>(null);
  const [justSignedIn, setJustSignedIn] = useState(false);

  /**
   * 방금 로그인했고 내 정보까지 왔으면 다음 화면으로 넘어가요.
   *
   * 로그인 직후 바로 홈으로 보내면 안 돼요. 서버에서 내가 누구인지
   * 받아오는 데 잠깐 걸리는데, 그 사이에 홈이 "로그인 안 함"으로 보고
   * 시작 화면으로 되돌려버려요.
   */
  useEffect(() => {
    if (!justSignedIn || !me) return;
    if (!school) router.push('/pick-school');
    else router.replace('/');
  }, [justSignedIn, me, school]);

  // 저장해둔 것을 읽는 동안은 아무것도 안 보여줘요.
  // 로그인 화면이 깜빡였다가 홈으로 바뀌면 이상하니까요.
  if (schoolLoading || authLoading) {
    return (
      <View style={[styles.screen, styles.center, { backgroundColor: palette.bg }]}>
        <Loading text="" />
      </View>
    );
  }

  const ready = mode === 'signin'
    ? email.trim().length > 0 && password.length > 0
    : email.trim().length > 0 && password.length >= 6 && name.trim().length > 0;

  const submit = async () => {
    setBusy(true);
    setFailed(null);
    const problem = mode === 'signin'
      ? await signIn(email, password)
      : await signUp(email, password, name);
    if (problem) {
      setBusy(false);
      setFailed(problem);
      return;
    }
    // 로그인은 됐지만 서버에서 내 정보를 받아오는 데 잠깐 걸려요.
    // 그전에 홈으로 보내면 "아직 로그인 안 함"으로 보여서 되돌아와요.
    // app-state가 me를 채우면 아래 effect가 알아서 넘겨줘요.
    setBusy(false);
    setJustSignedIn(true);
  };

  return (
    <ScrollView
      style={[styles.screen, { backgroundColor: palette.bg }]}
      contentContainerStyle={[styles.scroll, { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 24 }]}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}>
      <View style={[styles.column, { maxWidth: Math.min(content, 620) }]}>
        <View style={styles.top}>
          <Text style={[styles.title, { color: palette.text }]} accessibilityRole="header">
            학교생활{'\n'}도우미
          </Text>
          <Text style={[styles.desc, { color: palette.sub }]}>
            급식, 시간표, 학교 일정, 선생님께 질문하기까지 한곳에서 확인해요.
          </Text>

          {/* 이미 로그인했는데 여기 있으면 학교만 고르면 돼요. */}
          {me ? (
            <View style={[styles.signed, { backgroundColor: palette.tint }]}>
              <Text style={[styles.signedName, { color: palette.text }]}>
                {me.name || '이름 없음'}님으로 로그인했어요
              </Text>
              <Text style={[styles.signedRole, { color: palette.sub }]}>
                {me.role === 'teacher' ? '선생님' : '학생'}
              </Text>
            </View>
          ) : (
            <>
              <View style={styles.modeRow}>
                <Segmented
                  value={mode}
                  onChange={(v) => {
                    setMode(v);
                    setFailed(null);
                  }}
                  options={[
                    { value: 'signin', label: '로그인' },
                    { value: 'signup', label: '회원가입' },
                  ]}
                />
              </View>

              {mode === 'signup' ? (
                <Field
                  value={name}
                  onChangeText={setName}
                  placeholder="이름"
                  accessibilityLabel="이름"
                  style={styles.input}
                />
              ) : null}

              <Field
                value={email}
                onChangeText={setEmail}
                placeholder="이메일"
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                accessibilityLabel="이메일"
                style={styles.input}
              />
              <Field
                value={password}
                onChangeText={setPassword}
                placeholder={mode === 'signup' ? '비밀번호 (6자 이상)' : '비밀번호'}
                secureTextEntry
                autoCapitalize="none"
                accessibilityLabel="비밀번호"
                style={styles.input}
              />

              {failed ? (
                <View style={[styles.failed, { backgroundColor: palette.tint }]}>
                  <Text style={[styles.failedText, { color: palette.text }]}>{failed}</Text>
                </View>
              ) : null}
            </>
          )}

          {/* 학교는 로그인과 별개예요. 로그인 전에도 고를 수 있어요. */}
          <Tap
            onPress={() => router.push('/pick-school')}
            accessibilityRole="button"
            accessibilityLabel={school ? `${school.name} ${classLabelOf(school)}, 학교 바꾸기` : '학교 고르기'}
            depth={0.03}
            style={[styles.pick, { backgroundColor: school ? palette.tint : palette.accent }]}>
            <View style={styles.fill}>
              {school ? (
                <>
                  <Text style={[styles.pickName, { color: palette.text }]}>{school.name}</Text>
                  <Text style={[styles.pickMeta, { color: palette.sub }]}>
                    {classLabelOf(school)} · 눌러서 바꾸기
                  </Text>
                </>
              ) : (
                <Text style={[styles.pickName, { color: palette.onAccent }]}>다니는 학교 고르기</Text>
              )}
            </View>
            <Icon name="next" size={20} color={school ? palette.sub : palette.onAccent} />
          </Tap>

          <Text style={[styles.swatchLabel, { color: palette.sub }]}>마음에 드는 색을 골라보세요</Text>
          <View style={styles.swatches} accessibilityRole="radiogroup">
            {THEMES.map((t) => {
              const selected = t.key === themeKey;
              return (
                <Pressable
                  key={t.key}
                  onPress={() => setThemeKey(t.key)}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: selected }}
                  accessibilityLabel={`${t.name} 색`}
                  style={({ pressed }) => [
                    styles.swatchWrap,
                    { borderColor: selected ? palette.accent : 'transparent' },
                    pressed && styles.pressed,
                  ]}>
                  <View style={[styles.swatch, { backgroundColor: buildPalette(t.accent, scheme).accent }]} />
                </Pressable>
              );
            })}
          </View>
        </View>

        <View style={styles.actions}>
          {me ? (
            <Button
              label={school ? '시작하기' : '학교를 먼저 골라주세요'}
              disabled={!school}
              onPress={() => router.replace('/')}
            />
          ) : (
            <Button
              label={busy ? '잠시만요' : mode === 'signin' ? '로그인' : '가입하고 시작하기'}
              disabled={!ready || busy}
              onPress={submit}
            />
          )}
          <Text style={[styles.note, { color: palette.sub }]}>
            {me
              ? '학교와 반을 고르면 급식과 시간표를 받아올 수 있어요.'
              : mode === 'signup'
                ? '가입하면 학생으로 시작해요. 선생님은 가입 뒤 내 정보에서 코드를 넣어주세요.'
                : '처음이면 회원가입을 눌러주세요.'}
          </Text>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  center: { alignItems: 'center', justifyContent: 'center' },
  scroll: { flexGrow: 1 },
  column: {
    flex: 1,
    width: '100%',
    alignSelf: 'center',
    paddingHorizontal: 24,
    justifyContent: 'space-between',
  },
  fill: { flex: 1 },
  top: { marginTop: 32 },
  title: { fontSize: 32, lineHeight: 46, fontWeight: '800', letterSpacing: -2 },
  desc: { fontSize: 15, lineHeight: 23, marginTop: 16 },

  modeRow: { marginTop: 24 },
  input: { borderRadius: 16, height: 52, paddingHorizontal: 16, marginBottom: 8 },
  failed: { borderRadius: 16, padding: 16, marginTop: 4 },
  failedText: { fontSize: 13, lineHeight: 20 },

  signed: { borderRadius: 18, padding: 16, marginTop: 24 },
  signedName: { fontSize: 15, fontWeight: '700' },
  signedRole: { fontSize: 13, marginTop: 4 },

  pick: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minHeight: 64,
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginTop: 16,
  },
  pickName: { fontSize: 15, fontWeight: '700' },
  pickMeta: { fontSize: 13, marginTop: 2 },

  swatchLabel: { fontSize: 13, fontWeight: '600', marginTop: 24 },
  swatches: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 8, marginLeft: -8 },
  swatchWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 2.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  swatch: { width: 24, height: 24, borderRadius: 12 },
  pressed: { opacity: 0.6 },
  actions: { gap: 12, marginTop: 24 },
  note: { fontSize: 12, lineHeight: 18, textAlign: 'center', marginTop: 4 },
});
