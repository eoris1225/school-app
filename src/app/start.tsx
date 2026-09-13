import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Emoji } from '@/components/emoji';
import { Icon } from '@/components/icon';
import { Pop, Tap } from '@/components/motion';
import { Sheet } from '@/components/sheet';
import { Text } from '@/components/text';
import { Button, Field, Loading, Segmented } from '@/components/ui';
import { ThemeSwatches } from '@/components/color-picker';
import { useApp } from '@/lib/app-state';
import { resendConfirm, signIn, signUp } from '@/lib/auth';
import { useLayout } from '@/lib/layout';
import { classLabelOf } from '@/lib/my-school';

type Mode = 'signin' | 'signup';

export default function StartScreen() {
  const { palette, accent, setAccent, school, schoolLoading, me, authLoading, setupSeen } = useApp();
  const insets = useSafeAreaInsets();
  const { content } = useLayout();

  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<Mode>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState<string | null>(null);
  const [justSignedIn, setJustSignedIn] = useState(false);
  /*
   * 가입 뒤에 팝업이 보여줄 것이에요.
   *
   *   null    평소. 입력하는 칸이 보여요.
   *   mail    메일 확인이 켜져 있어요. 메일함을 봐야 해요.
   *   skipped 메일 확인이 꺼져 있어서 그 과정을 지나갔어요. 바로 시작해요.
   *
   * skipped 를 따로 두는 이유가 있어요. 조용히 지나가면 나중에 "메일 확인이
   * 켜져 있는 줄 알았는데?" 하고 헷갈려요. 앱 테스트 때문에 꺼둔 것이라고
   * 한 줄 적어두면 그럴 일이 없어요.
   */
  const [after, setAfter] = useState<{ kind: 'mail'; email: string } | { kind: 'skipped' } | null>(null);
  const [resent, setResent] = useState<string | null>(null);

  /**
   * 방금 로그인했고 내 정보까지 왔으면 다음 화면으로 넘어가요.
   *
   * 로그인 직후 바로 홈으로 보내면 안 돼요. 서버에서 내가 누구인지
   * 받아오는 데 잠깐 걸리는데, 그 사이에 홈이 "로그인 안 함"으로 보고
   * 시작 화면으로 되돌려버려요.
   *
   * 계정에 학교가 적혀 있으면 기기로 내려오는 것을 기다려요. 다른 기기에서
   * 로그인했을 때 기기 저장소는 비어 있는데, 그걸 보고 바로 학교 고르기로
   * 보내버리면 이미 골라둔 걸 또 고르라는 얘기가 돼요.
   */
  useEffect(() => {
    if (!justSignedIn || !me) return;
    if (!school) {
      // 계정에 있으면 곧 채워져요. 그때 이 effect가 다시 돌아요.
      if (!me.school) router.push('/pick-school');
      return;
    }
    // 처음이면 설정 안내를 한 번 지나가요. 건너뛸 수 있어요.
    router.replace(setupSeen ? '/' : '/setup');
  }, [justSignedIn, me, school, setupSeen]);

  // 저장해둔 것을 읽는 동안은 아무것도 안 보여줘요.
  // 로그인 화면이 깜빡였다가 홈으로 바뀌면 이상하니까요.
  if (schoolLoading || authLoading) {
    return (
      <View style={[styles.screen, styles.center, { backgroundColor: palette.bg }]}>
        <Loading text="" rows={2} />
      </View>
    );
  }

  const ready =
    mode === 'signin'
      ? email.trim().length > 0 && password.length > 0
      : email.trim().length > 0 && password.length >= 6 && name.trim().length > 0;

  const start = (m: Mode) => {
    setMode(m);
    setFailed(null);
    setAfter(null);
    setResent(null);
    setOpen(true);
  };

  const submit = async () => {
    setBusy(true);
    setFailed(null);

    if (mode === 'signin') {
      const problem = await signIn(email, password);
      setBusy(false);
      if (problem) return setFailed(problem);
      // 로그인은 됐지만 서버에서 내 정보를 받아오는 데 잠깐 걸려요.
      // app-state가 me를 채우면 위 effect가 알아서 넘겨줘요.
      setJustSignedIn(true);
      return;
    }

    const result = await signUp(email, password, name);
    setBusy(false);
    if (result.kind === 'problem') return setFailed(result.message);
    if (result.kind === 'mail') return setAfter({ kind: 'mail', email: result.email });
    /*
     * 바로 로그인됐어요. 넘어가기 전에 한 번 알려줘요.
     *
     * 여기서 바로 홈으로 보내지 않아요. 메일 확인을 지나갔다는 걸 읽을
     * 틈이 없으면 적어둔 의미가 없어요. 버튼을 누르면 넘어가요.
     */
    setAfter({ kind: 'skipped' });
  };

  return (
    <View style={[styles.screen, { backgroundColor: palette.bg }]}>
      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 24 },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}>
        <View style={[styles.column, { maxWidth: Math.min(content, 620) }]}>
          <View style={styles.top}>
            <Pop style={[styles.mark, { backgroundColor: palette.tint }]}>
              <Emoji name="home" size={40} tone="mono" />
            </Pop>
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
            ) : null}

            {/* 학교는 로그인과 별개예요. 로그인 전에도 고를 수 있어요. */}
            <Tap
              onPress={() => router.push('/pick-school')}
              accessibilityRole="button"
              accessibilityLabel={school ? `${school.name} ${classLabelOf(school)}, 학교 바꾸기` : '학교 고르기'}
              depth={0.03}
              style={[styles.pick, { backgroundColor: palette.tint }]}>
              <Emoji name="map" size={28} tone="mono" />
              <View style={styles.fill}>
                {school ? (
                  <>
                    <Text style={[styles.pickName, { color: palette.text }]}>{school.name}</Text>
                    <Text style={[styles.pickMeta, { color: palette.sub }]}>
                      {classLabelOf(school)} · 눌러서 바꾸기
                    </Text>
                  </>
                ) : (
                  <>
                    <Text style={[styles.pickName, { color: palette.text }]}>다니는 학교 고르기</Text>
                    <Text style={[styles.pickMeta, { color: palette.sub }]}>급식과 시간표를 받아올 곳이에요</Text>
                  </>
                )}
              </View>
              <Icon name="next" size={20} color={palette.sub} />
            </Tap>

            <Text style={[styles.swatchLabel, { color: palette.sub }]}>마음에 드는 색을 골라보세요</Text>
            <ThemeSwatches value={accent} onChange={setAccent} />
          </View>

          <View style={styles.actions}>
            {me ? (
              <>
                <Button
                  label={school ? '시작하기' : '학교를 먼저 골라주세요'}
                  disabled={!school}
                  onPress={() => router.replace(setupSeen ? '/' : '/setup')}
                />
                <Text style={[styles.note, { color: palette.sub }]}>
                  학교와 반을 고르면 급식과 시간표를 받아올 수 있어요.
                </Text>
              </>
            ) : (
              <>
                <Button label="로그인" onPress={() => start('signin')} />
                <View style={styles.gap} />
                <Button label="회원가입" variant="secondary" onPress={() => start('signup')} />
                <Text style={[styles.note, { color: palette.sub }]}>
                  가입하면 학생으로 시작해요. 선생님은 가입 뒤 내 정보에서 코드를 넣어주세요.
                </Text>
              </>
            )}
          </View>
        </View>
      </ScrollView>

      {/*
        로그인이 끝나면 me가 채워지면서 저절로 닫혀요. 효과 안에서 닫으라고
        시키지 않아요. 그러면 학교 고르기 화면 위에 팝업이 그대로 덮여요.

        메일 확인을 지나간 경우만 예외예요. 그때는 me가 바로 채워지는데,
        저절로 닫히면 적어둔 안내를 읽을 틈이 없어요.
      */}
      <Sheet
        visible={open && (!me || after?.kind === 'skipped')}
        onClose={() => setOpen(false)}
        title={
          after?.kind === 'mail'
            ? '메일을 보냈어요'
            : after?.kind === 'skipped'
              ? '가입됐어요'
              : mode === 'signin'
                ? '로그인'
                : '회원가입'
        }>
        {/* 메일 확인이 켜져 있어요. 메일함을 봐야 다음으로 갈 수 있어요. */}
        {after?.kind === 'mail' ? (
          <>
            {/*
              주소 뒤에 조사를 붙이지 않아요. '.com'을 글자로 읽으면 '엠'이라
              '으로'인데 사람은 '컴'이라고 읽어요. 어느 쪽을 골라도 절반은
              어색해서, 주소는 줄을 따로 떼어 보여줘요. 눈에도 더 잘 띄어요.
            */}
            <Text style={[styles.afterBody, { color: palette.text }]}>
              확인 링크를 보냈어요.
            </Text>
            <Text style={[styles.afterMail, { color: palette.accentDeep }]}>{after.email}</Text>
            <Text style={[styles.afterBody, { color: palette.sub }]}>
              메일함에서 링크를 누르면 가입이 끝나요. 안 보이면 스팸함도 봐주세요.
              링크를 누른 뒤에 여기서 로그인하면 돼요.
            </Text>
            <View style={styles.sheetAction}>
              <Button
                label="로그인하러 가기"
                onPress={() => {
                  setAfter(null);
                  setMode('signin');
                  setPassword('');
                }}
              />
              <View style={styles.gap} />
              <Button
                label={resent ?? '메일을 못 받았어요'}
                variant="secondary"
                disabled={!!resent}
                onPress={async () => {
                  const problem = await resendConfirm(after.email);
                  setResent(problem ?? '다시 보냈어요');
                }}
              />
            </View>
          </>
        ) : after?.kind === 'skipped' ? (
          /*
           * 메일 확인이 꺼져 있어서 그 과정을 지나갔어요.
           * 조용히 넘어가면 나중에 헷갈려요. 한 줄 적어두고 넘어가요.
           */
          <>
            <Text style={[styles.afterBody, { color: palette.text }]}>
              앱 테스트를 위해 메일 확인 과정을 스킵했어요.
            </Text>
            <Text style={[styles.afterMail, { color: palette.accentDeep }]}>{email.trim()}</Text>
            <Text style={[styles.afterBody, { color: palette.sub }]}>
              이 프로젝트는 아직 메일 확인이 꺼져 있어요. 그래서 이 주소로 바로
              가입됐어요. 나중에 켜면 메일함에서 링크를 눌러야 가입이 끝나요.
            </Text>
            <View style={styles.sheetAction}>
              {/*
                팝업을 직접 닫아요. 안 닫으면 다음 화면 위에 그대로 덮여요.
                after를 비우는 대신 open을 내려요. after를 비우면 내 정보가
                아직 안 온 사이에 입력 칸이 잠깐 다시 보여요.
              */}
              <Button
                label="시작하기"
                onPress={() => {
                  setOpen(false);
                  setJustSignedIn(true);
                }}
              />
            </View>
          </>
        ) : (
          <>
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

            <View style={styles.sheetAction}>
              <Button
                label={busy ? '잠시만요' : mode === 'signin' ? '로그인' : '가입하고 시작하기'}
                disabled={!ready || busy}
                onPress={submit}
              />
            </View>
          </>
        )}
      </Sheet>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  center: { alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24 },
  scroll: { flexGrow: 1 },
  column: {
    flex: 1,
    width: '100%',
    alignSelf: 'center',
    paddingHorizontal: 24,
    justifyContent: 'space-between',
  },
  fill: { flex: 1 },
  gap: { height: 12 },
  top: { marginTop: 32 },
  mark: { width: 72, height: 72, borderRadius: 24, alignItems: 'center', justifyContent: 'center', marginBottom: 20 },
  title: { fontSize: 32, lineHeight: 46, fontWeight: '800', letterSpacing: -2 },
  desc: { fontSize: 15, lineHeight: 23, marginTop: 16 },

  input: { borderRadius: 16, height: 52, paddingHorizontal: 16, marginTop: 12 },
  failed: { borderRadius: 16, padding: 16, marginTop: 12 },
  failedText: { fontSize: 13, lineHeight: 20 },
  sheetAction: { marginTop: 20 },
  afterBody: { fontSize: 15, lineHeight: 23, marginBottom: 12 },
  afterMail: { fontSize: 15, lineHeight: 23, fontWeight: '700', marginBottom: 12 },

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
    marginTop: 24,
  },
  pickName: { fontSize: 15, fontWeight: '700' },
  pickMeta: { fontSize: 13, marginTop: 2 },

  swatchLabel: { fontSize: 13, marginTop: 24, marginBottom: 12 },

  actions: { marginTop: 32 },
  note: { fontSize: 13, lineHeight: 20, textAlign: 'center', marginTop: 16 },
});
