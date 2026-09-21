import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { ThreadRow } from '@/components/rows';
import { Text } from '@/components/text';
import { Button, Chip, ChipRow, Empty, ErrorNote, Field, Header, Loading, Screen, SectionTitle, Segmented } from '@/components/ui';
import { readSubject, subjectGroup, TEACHABLE } from '@/lib/subject';
import { classLabel, WEEKDAYS } from '@/data/mock';
import { getLessons, getSubjectTeachers, type TeacherPick, type Thread } from '@/lib/api';
import { isPending, useApp } from '@/lib/app-state';
import { byWeekday, withSwaps } from '@/lib/timetable';
import { weekDates } from '@/lib/time';
import { useRemote } from '@/lib/use-remote';
import { usePoll, useReturn } from '@/lib/live';

export default function CommunityScreen() {
  const { role } = useApp();
  return role === 'teacher' ? <TeacherInbox /> : <StudentCommunity />;
}

const openThread = (t: Thread) => router.push({ pathname: '/thread', params: { id: t.id } });

/**
 * 선생님 이름 밑에 붙일 한 줄을 정해요.
 *
 * 이름만으로는 못 고를 때가 있어요. 박선생이 두 분이면 똑같은 칩이 두 개
 * 뜨고, 학생은 찍는 수밖에 없어요. 같은 성씨는 학교에 흔해요.
 *
 * 맡은 과목을 먼저 보여줘요. '박선생 · 미적분' 이면 어느 박선생인지 알고,
 * 덤으로 "이 선생님이 내가 듣는 그 과목 선생님인가"도 알 수 있어요.
 *
 * 이름이 겹치면 맡은 반까지 붙여요. 과목까지 같은 두 분이 있을 수 있거든요.
 * 겹치지 않는데 과목도 안 적어두셨으면 그때도 반을 보여줘요. 아무것도
 * 없는 것보다 나아요.
 */
function describe(list: TeacherPick[]): Map<string, string> {
  const sameName = new Map<string, number>();
  for (const t of list) sameName.set(t.name, (sameName.get(t.name) ?? 0) + 1);

  const out = new Map<string, string>();
  for (const t of list) {
    const parts: string[] = [];
    if (t.teaches.length) parts.push(t.teaches.join(', '));
    const clash = (sameName.get(t.name) ?? 0) > 1;
    if (t.cls && (clash || parts.length === 0)) parts.push(classLabel(t.cls));
    out.set(t.id, parts.join(' · '));
  }
  return out;
}

/* ---------------- 학생: 질문 보내기 + 내 질문 ---------------- */

function StudentCommunity() {
  const { palette, threads, threadsLoading, askQuestion, school, now, swaps, reloadThreads } = useApp();
  /*
   * 커뮤니티를 보고 있는 동안 쪽지함도 챙겨봐요.
   *
   * 쪽지 안에서는 5초마다 보는데(대화 중이니까요) 목록은 좀 느긋해도 돼요.
   * 답이 왔는지만 알면 되거든요. 자주 물어봐야 이득이 없어요.
   */
  usePoll(reloadThreads, 20000);
  const [subject, setSubject] = useState<string | null>(null);
  /** 교과군 목록을 보고 있는지. 평소에는 내가 듣는 과목을 보여줘요. */
  const [others, setOthers] = useState(false);

  /*
   * 내가 듣는 과목을 먼저 보여줘요.
   *
   * 예전에는 교과군 열둘(국어·수학·영어…)만 골랐어요. 그런데 학생 머릿속에
   * 있는 건 '미적분Ⅰ', '독서와 작문' 이에요. '이거 수학인가 뭔가' 를 한 번
   * 더 생각하게 만들 이유가 없어요.
   *
   * 보낼 때는 교과군으로 바꿔서 보내요. 쪽지는 교과군으로 오가거든요.
   * '미적분Ⅰ' 로 물어봐도 수학 선생님께 가요.
   */
  const dates = weekDates(now);
  const lessons = useRemote(`timetable:${school?.code}:${school?.grade}-${school?.cls}:${dates.월}`, () =>
    school ? getLessons(school.grade, school.cls, dates.월, dates.금, school) : Promise.resolve([]),
  );
  // 시간표 화면과 같은 길로 만들어요. 거기서 바꿔둔 과목이 여기에도 나와야죠.
  const mySubjects = [
    ...new Set(
      WEEKDAYS.flatMap((d) => withSwaps(byWeekday(lessons.data ?? [], dates), swaps)[d])
        .filter((x): x is string => !!x)
        .map((x) => readSubject(x))
        .filter((x) => !x.holiday && !['창체', '기타'].includes(x.group))
        .map((x) => x.name),
    ),
  ].sort((a, b) => a.localeCompare(b, 'ko'));
  const [teacher, setTeacher] = useState<string | null>(null);
  const [text, setText] = useState('');
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [failed, setFailed] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const canSend = !!subject && text.trim().length > 0 && !busy;

  /*
   * 그 과목을 맡은 우리 학교 선생님들.
   *
   * 계정이 있는 분만 나와요. 아직 아무도 가입 안 한 과목이면 빈 목록이고,
   * 그때는 예전처럼 그 과목 선생님 모두에게 가도록 둬요. 고를 게 없는데
   * 고르라고 막아 세우면 질문을 아예 못 보내잖아요.
   */
  /*
   * 고른 게 '미적분Ⅰ' 처럼 구체적인 과목일 수 있어요. 선생님을 찾을 때도,
   * 실제로 보낼 때도 교과군으로 바꿔서 써요. 쪽지는 교과군으로 오가거든요.
   */
  const group = subject ? subjectGroup(subject) : null;
  /*
   * 학교 코드를 열쇠에 같이 넣어요. 여기만 빠져 있었어요.
   *
   * 다른 열쇠는 전부 학교 코드를 넣고 있는데 여기만 과목만 넣었어요.
   * 학교를 바꾸면 앞 학교 선생님 명단이 그대로 남아요. 서버는 내 계정에
   * 적힌 학교로만 찾아주니 서버 쪽은 멀쩡한데, 화면이 낡은 걸 들고 있는
   * 거예요. 그 이름을 눌러 쪽지를 보내면 "그 선생님께는 보낼 수 없어요"
   * 가 뜨고, 학생은 왜 안 되는지 알 수가 없어요.
   */
  const staff = useRemote(`teachers:${school?.code ?? ''}:${group ?? ''}`, () =>
    group ? getSubjectTeachers(group) : Promise.resolve([]),
  );
  /*
   * 탭으로 돌아올 때마다 선생님 목록을 다시 받아와요.
   *
   * 그 사이에 선생님이 가입했거나 담당 과목을 바꿨을 수 있어요. 안 그러면
   * "아직 가입하지 않았어요"가 계속 떠 있어요. 담아둔 걸 먼저 보여주고
   * 뒤에서 갈아치우는 거라 화면이 깜빡이지는 않아요.
   */
  useReturn(staff.retry);

  const list = staff.data ?? [];
  const picked = list.find((t) => t.id === teacher) ?? null;
  const detail = describe(list);

  const send = async () => {
    if (!subject || !canSend) return;
    setBusy(true);
    setFailed(null);
    const problem = await askQuestion(group ?? subject, text.trim(), teacher ?? undefined);
    setBusy(false);
    if (problem) {
      setFailed(problem);
      return;
    }
    setSentTo(
      picked
        ? `${picked.name} 선생님께 쪽지를 보냈어요`
        : `${group ?? subject} 선생님께 쪽지를 보냈어요`,
    );
    setText('');
    setSubject(null);
    setTeacher(null);
  };

  return (
    <Screen>
      <Header subtitle="선생님께 묻고 답을 받아요" title="커뮤니티" />

      <SectionTitle title="선생님께 질문하기" />
      <Text style={[styles.help, { color: palette.sub }]}>
        {mySubjects.length && !others
          ? '내가 듣는 과목이에요. 고르면 그 과목 선생님께 쪽지가 전달돼요.'
          : '과목을 고르면 그 과목 선생님께 쪽지가 전달돼요.'}
      </Text>

      {/*
        내 과목과 교과군을 한 줄에 섞지 않아요.
        섞어두니 '영어Ⅱ' 와 '영어' 가 나란히 떠서 같은 걸 두 번 적어둔 것처럼
        보였어요. 둘은 다른 종류예요. 하나는 내가 듣는 과목, 하나는 과목 묶음.
        한 번에 한 종류만 보여주고, 끝에 있는 칩으로 갈아타요.

        교과군도 남겨둬야 해요. 시간표에 없는 걸 물어볼 수도 있고 (진로 상담
        처럼), 시간표를 아직 못 받아온 학교도 있어요.
      */}
      <View style={styles.subjects}>
        <ChipRow>
          {(others || mySubjects.length === 0 ? [...TEACHABLE] : mySubjects).map((s) => (
            <Chip
              key={s}
              label={s}
              colored
              selected={subject === s}
              onPress={() => {
                setSubject(s);
                // 과목이 바뀌면 고른 선생님은 지워요. 그 과목 선생님이 아니니까요.
                setTeacher(null);
                setSentTo(null);
              }}
            />
          ))}
          {mySubjects.length ? (
            <Chip
              label={others ? '내가 듣는 과목' : '다른 과목'}
              selected={false}
              onPress={() => setOthers((v) => !v)}
            />
          ) : null}
        </ChipRow>
      </View>

      {subject && staff.loading ? (
        <Text style={[styles.to, { color: palette.sub }]}>선생님을 찾는 중이에요</Text>
      ) : null}

      {/* 고를 수 있는 선생님이 있으면 한 분만 골라서 보낼 수 있어요.
          수학 선생님이 여섯 분인데 전부에게 가면 아무도 자기 일로 안 봐요. */}
      {subject && !staff.loading && list.length > 0 ? (
        <>
          <Text style={[styles.pickLabel, { color: palette.text }]}>어느 선생님께 보낼까요?</Text>
          <View style={styles.subjects}>
            <ChipRow>
              <Chip
                label={`${group} 선생님 모두`}
                selected={teacher === null}
                onPress={() => setTeacher(null)}
              />
              {list.map((t) => (
                <Chip
                  key={t.id}
                  label={`${t.name} 선생님`}
                  detail={detail.get(t.id) || undefined}
                  selected={teacher === t.id}
                  onPress={() => setTeacher(t.id)}
                />
              ))}
            </ChipRow>
          </View>
          <Text style={[styles.to, { color: palette.accentDeep }]}>
            {picked
              ? `${picked.name} 선생님께만 가요${detail.get(picked.id) ? ` · ${detail.get(picked.id)}` : ''}`
              : `우리 학교 ${group} 선생님 ${list.length}분께 모두 가요`}
          </Text>
        </>
      ) : null}

      {/* 계정이 있는 선생님이 없으면 고를 게 없어요. 그래도 보낼 수는 있고,
          나중에 그 과목 선생님이 가입하면 그때 쪽지함에 보여요. */}
      {subject && !staff.loading && list.length === 0 ? (
        <Text style={[styles.to, { color: palette.sub }]}>
          {/* '세포와 물질대사 선생님' 같은 건 없어요. 과학 선생님이죠.
              사람을 가리킬 때는 늘 교과군으로 불러요. */}
          우리 학교 {group} 선생님은 아직 가입하지 않았어요. 보내두면 가입하는 대로 전달돼요.
        </Text>
      ) : null}

      <Field
        value={text}
        onChangeText={(v) => {
          setText(v);
          setSentTo(null);
        }}
        placeholder="궁금한 내용을 적어주세요"
        multiline
        accessibilityLabel="질문 내용"
        style={styles.input}
      />
      <Button
        label={
          busy
            ? '보내는 중이에요'
            : picked
              ? `${picked.name} 선생님께 보내기`
              : subject
                ? `${group} 선생님께 보내기`
                : '과목을 먼저 골라주세요'
        }
        icon="send"
        disabled={!canSend}
        onPress={send}
      />
      {failed ? <ErrorNote text={failed} /> : null}
      {sentTo ? <Text style={[styles.sent, { color: palette.accentDeep }]}>{sentTo}</Text> : null}

      <SectionTitle title="내 질문" />
      {threadsLoading ? <Loading text="쪽지를 불러오는 중이에요" rows={2} /> : null}
      {!threadsLoading && threads.length === 0 ? (
        <Empty art="chat" text="아직 보낸 질문이 없어요" hint="궁금한 과목을 고르고 위에 적어서 보내보세요." />
      ) : null}
      {threads.map((t) => (
        <ThreadRow key={t.id} thread={t} onPress={() => openThread(t)} />
      ))}
    </Screen>
  );
}

/* ---------------- 선생님: 쪽지함 ---------------- */

function TeacherInbox() {
  const { palette, threads, threadsLoading, me, reloadThreads } = useApp();
  // 쪽지함도 같아요. 탭에 돌아올 때마다, 그리고 보고 있는 동안에도 챙겨봐요.
  useReturn(reloadThreads);
  usePoll(reloadThreads, 20000);
  const [tab, setTab] = useState<'pending' | 'done' | 'all'>('pending');
  const [find, setFind] = useState('');
  const pending = threads.filter(isPending);
  const done = threads.filter((t) => !isPending(t));
  const byTab = tab === 'pending' ? pending : tab === 'done' ? done : threads;

  /*
   * 찾기예요.
   *
   * 반이 스물넷이고 한 반에 스물몇 명이에요. 시험 기간에는 대기만 서른 개가
   * 쌓여요. 그걸 손가락으로 굴려서 "2학년 3반 이채율"을 찾으라는 건 좀 그래요.
   *
   * 이름·반·내용을 다 봐요. '2-3'으로도 '3반'으로도 찾아지게요. 선생님마다
   * 머릿속에 있는 말이 다르거든요.
   */
  const q = find.trim().toLowerCase();
  const list = q
    ? byTab.filter((t) => {
        const cls = t.student.cls;
        const room = cls ? `${cls} ${classLabel(cls)}` : '';
        return [t.student.name, room, t.subject, t.last?.text ?? '']
          .join(' ')
          .toLowerCase()
          .includes(q);
      })
    : byTab;

  return (
    <Screen>
      <Header
        subtitle={
          me?.teaches?.length
            ? `${me.teaches.join(', ')} 맡고 계세요`
            : me?.subjects.length
              ? `${me.subjects.join(', ')} 과목으로 온 쪽지`
              : '담당 과목으로 온 쪽지'
        }
        title="쪽지함"
      />
      <Segmented
        value={tab}
        onChange={setTab}
        options={[
          { value: 'pending', label: `답변 대기 ${pending.length}` },
          { value: 'done', label: '답변 완료' },
          { value: 'all', label: '전체' },
        ]}
      />
      {/* 쪽지가 몇 개 없으면 찾기 칸이 자리만 차지해요. */}
      {threads.length > 5 ? (
        <Field
          value={find}
          onChangeText={setFind}
          placeholder="이름, 반, 내용으로 찾기"
          accessibilityLabel="쪽지 찾기"
          style={[styles.find, { backgroundColor: palette.surface }]}
        />
      ) : null}

      {threadsLoading ? <Loading text="쪽지를 불러오는 중이에요" rows={3} /> : null}
      {!threadsLoading && list.length === 0 ? (
        <Empty
          art="inbox"
          text={
            q
              ? `‘${find.trim()}’로 찾은 쪽지가 없어요`
              : tab === 'pending'
                ? '답변을 기다리는 쪽지가 없어요'
                : '쪽지가 없어요'
          }
          hint={q ? '이름이나 반으로도 찾을 수 있어요.' : tab === 'pending' ? '새 쪽지가 오면 여기에 쌓여요.' : undefined}
        />
      ) : null}
      {list.map((t) => (
        <ThreadRow key={t.id} thread={t} onPress={() => openThread(t)} />
      ))}
    </Screen>
  );
}

const styles = StyleSheet.create({
  help: { fontSize: 13, lineHeight: 19, marginTop: 4 },
  subjects: { marginTop: 12, marginHorizontal: -20, paddingLeft: 20 },
  to: { fontSize: 13, fontWeight: '700', marginTop: 12 },
  pickLabel: { fontSize: 15, fontWeight: '800', marginTop: 20 },
  input: {
    borderRadius: 16,
    minHeight: 110,
    padding: 12,
    lineHeight: 21,
    textAlignVertical: 'top',
    marginTop: 12,
    marginBottom: 12,
  },
  sent: { fontSize: 13, fontWeight: '700', textAlign: 'center', marginTop: 12 },
  find: { borderRadius: 16, height: 48, paddingHorizontal: 16, marginBottom: 4 },
});
