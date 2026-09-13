import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Reveal } from '@/components/motion';
import { Text } from '@/components/text';
import {
  BackHeader,
  Button,
  Chip,
  ChipRow,
  Divider,
  Field,
  goBack,
  Screen,
} from '@/components/ui';
import { useApp } from '@/lib/app-state';
import { blankBells, checkBells, MAX_PERIODS, tidyTime, toMin, type Bells } from '@/lib/bells';

/*
 * 교시 시각을 넣는 화면이에요. 선생님만 들어와요.
 *
 * 왜 사람이 넣어야 하냐면, NEIS에 이 정보가 없어요. 시간표 API는 학년·반·
 * 교시·과목명만 줘요. 몇 시에 종이 치는지는 학교마다 다르고 어디에도 공개돼
 * 있지 않아요.
 *
 * 예전에는 코드에 08:40 시작 7교시라고 박아뒀어요. 어느 학교 것도 아닌
 * 값이었고, 서일여고는 08:10 시작에 8교시까지예요. 전부 틀렸던 거예요.
 * 한 분이 한 번 넣으면 그 학교 학생 전부가 맞는 시각을 봐요.
 *
 * 안 넣은 학교에서는 앱이 시각을 아예 안 보여줘요. 그러니 여기가 비어 있어도
 * 앱은 멀쩡히 돌아가요. 급한 일이 아니에요.
 */

/** 한 줄에 담는 값. 다듬기 전이라 '0810' 같은 것도 잠깐 들어 있어요. */
type Row = { period: number; start: string; end: string };

/*
 * 처음 채워드릴 때 쓰는 길이예요.
 *
 * 한 교시 50분에 쉬는 시간 10분. 우리나라 고등학교에서 제일 흔한 모양이에요.
 * 점심은 한 시간으로 잡고요.
 *
 * 이건 **넣는 화면에서만** 쓰는 값이에요. 학생 화면에는 안 나가요. 선생님이
 * 보고 저장을 눌러야 그때 올라가요. 그러니까 지어낸 값을 보여주는 게 아니라,
 * 빈 칸 열네 개를 마주하지 않게 먼저 적어드리는 거예요.
 *
 * 여기에 특정 학교 시각을 박아두면 안 돼요. 그러면 다른 학교 선생님이
 * 확인 없이 저장했을 때 남의 학교 종소리가 그 학교 학생 화면에 떠요.
 * 그래서 시작 시각은 안 정해둬요. 그건 선생님이 치는 한 칸이에요.
 */
const LESSON_MINUTES = 50;
const BREAK_MINUTES = 10;
const LUNCH_MINUTES = 60;

const pad = (n: number) => String(n).padStart(2, '0');
const hhmm = (t: number) => `${pad(Math.floor(t / 60) % 24)}:${pad(t % 60)}`;

/** '08:10' 에 50분을 더해 '09:00' */
const plus = (at: string, minutes: number) => hhmm(toMin(at) + minutes);

/**
 * 1교시 시작 하나로 표를 쭉 깔아요.
 *
 * 점심이 있는 교시 뒤에만 더 길게 쉬어요. 나머지는 10분씩이고요.
 */
function spread(rows: Row[], firstStart: string, lunchAfter: number): Row[] {
  let at = toMin(firstStart);
  return rows.map((r) => {
    const end = at + LESSON_MINUTES;
    const line = { period: r.period, start: hhmm(at), end: hhmm(end) };
    at = end + (r.period === lunchAfter ? LUNCH_MINUTES : BREAK_MINUTES);
    return line;
  });
}

/** 1교시 시작 말고는 아무것도 안 적힌 표인지. 그럴 때만 통째로 깔아요. */
const onlyFirstStart = (rows: Row[]) =>
  rows.every((r, i) => (i === 0 ? !r.end.trim() : !r.start.trim() && !r.end.trim()));

/** 손 안 대고 깔린 그대로인지. 그럴 때만 점심 자리를 따라 다시 깔아요. */
function untouched(rows: Row[], lunchAfter: number): boolean {
  const first = tidyTime(rows[0]?.start ?? '');
  if (!first) return false;
  const same = spread(rows, first, lunchAfter);
  return rows.every((r, i) => r.start === same[i].start && r.end === same[i].end);
}

export default function BellTimesScreen() {
  const { palette, role, bells, bellsLoading, setBells } = useApp();

  const [rows, setRows] = useState<Row[]>(() => bells?.periods ?? blankBells());
  /*
   * 점심 자리는 4교시 뒤를 미리 골라둬요.
   *
   * 시각과 달리 이건 "몇 번째 칸"이라 학교마다 크게 다르지 않고, 무엇보다
   * 화면에 보이는 채로 고를 수 있어요. 틀리면 칩 하나 누르면 되고요.
   * 이것도 저장을 눌러야 나가는 값이에요.
   */
  const [lunch, setLunchState] = useState(() => bells?.lunchAfter ?? 4);
  const [saving, setSaving] = useState(false);
  const [failed, setFailed] = useState<string | null>(null);

  // 화면에는 적은 그대로 보여주고, 검사할 때만 '0810' -> '08:10' 로 다듬어요.
  // 적는 도중에 글자가 튀면 지우기가 힘들어요.
  const draft: Bells = {
    periods: rows.map((r) => ({
      period: r.period,
      start: tidyTime(r.start) ?? r.start,
      end: tidyTime(r.end) ?? r.end,
    })),
    lunchAfter: lunch,
  };
  const bad = checkBells(draft);

  const setRow = (i: number, patch: Partial<Row>) =>
    setRows((list) => list.map((r, k) => (k === i ? { ...r, ...patch } : r)));

  /*
   * 칸에서 손을 뗄 때 모양을 맞춰요.
   *
   * 끝나는 시각이 비어 있으면 50분 뒤로 채워드려요. 여덟 교시면 칸이 열여섯
   * 개인데 절반은 어차피 "시작 + 50분" 이거든요. 채워 넣은 값도 그대로
   * 보이고 고칠 수 있어요. 몰래 정하는 게 아니라 먼저 적어드리는 거예요.
   */
  const leaveStart = (i: number) => {
    const fixed = tidyTime(rows[i].start);
    if (!fixed) return;
    // 1교시만 적고 나머지가 텅 비어 있으면 표를 통째로 깔아드려요.
    if (i === 0 && onlyFirstStart(rows)) {
      setRows(spread(rows, fixed, lunch));
      return;
    }
    setRows((list) =>
      list.map((r, k) =>
        k === i ? { ...r, start: fixed, end: r.end.trim() ? r.end : plus(fixed, LESSON_MINUTES) } : r,
      ),
    );
  };

  /*
   * 점심 자리를 옮기면 표도 따라 움직여요. 단, 손 안 댄 표만요.
   *
   * 깔아드린 표는 점심 자리를 보고 깐 거라, 자리를 옮겼는데 시각이 그대로면
   * 점심이 사라진 자리에 구멍이 남아요. 반대로 선생님이 한 칸이라도 고쳤으면
   * 절대 안 건드려요. 고쳐놓은 걸 화면이 되돌리는 게 제일 나빠요.
   */
  const setLunch = (next: number) => {
    const first = tidyTime(rows[0]?.start ?? '');
    if (first && untouched(rows, lunch)) setRows(spread(rows, first, next));
    setLunchState(next);
  };

  const leaveEnd = (i: number) => {
    const fixed = tidyTime(rows[i].end);
    if (fixed) setRow(i, { end: fixed });
  };

  const addRow = () =>
    setRows((list) => {
      // 앞 교시가 끝나는 시각을 이어받아요. 또 처음부터 칠 이유가 없어요.
      const last = list[list.length - 1];
      const from = last ? tidyTime(last.end) : null;
      const start = from ? plus(from, last.period === lunch ? LUNCH_MINUTES : BREAK_MINUTES) : '';
      return [
        ...list,
        { period: list.length + 1, start, end: start ? plus(start, LESSON_MINUTES) : '' },
      ];
    });

  const dropRow = () =>
    setRows((list) => {
      const next = list.slice(0, -1);
      // 점심이 사라진 교시 뒤를 가리키고 있으면 같이 내려요.
      setLunchState((l) => Math.min(l, next.length));
      return next;
    });

  const save = async () => {
    setFailed(null);
    setSaving(true);
    const problem = await setBells(draft);
    setSaving(false);
    if (problem) setFailed(problem);
    else goBack();
  };

  if (role !== 'teacher') {
    return (
      <Screen bottomInset>
        <BackHeader title="교시 시각" />
        <Text style={[styles.body, { color: palette.sub }]}>
          교시 시각은 그 학교 선생님이 넣어요. 한 분이 넣으면 우리 학교 모두가 같이 써요.
        </Text>
      </Screen>
    );
  }

  return (
    <Screen
      bottomInset
      footer={
        <Button
          label={saving ? '담는 중이에요' : bells ? '교시 시각 고치기' : '교시 시각 넣기'}
          onPress={save}
          disabled={saving || bad !== null || bellsLoading}
        />
      }>
      <BackHeader
        title="교시 시각"
        subtitle={bells ? '고치면 우리 학교 모두에게 바로 바뀌어요' : '넣으면 우리 학교 모두가 같이 써요'}
      />

      <Text style={[styles.body, { color: palette.sub }]}>
        NEIS에는 교시 시각이 없어요. 학교마다 달라서 지어낼 수도 없고요. 그래서 여기 넣어주시면
        그걸로 지금 몇 교시인지 알려드려요. 비워두면 시각을 아예 안 보여줘요.
      </Text>

      {rows.map((row, i) => (
        <Reveal key={row.period} delay={i * 45} distance={10}>
          <View style={styles.row}>
            <Text numeric style={[styles.period, { color: palette.accentDeep }]}>
              {row.period}교시
            </Text>
            <Field
              value={row.start}
              onChangeText={(t) => setRow(i, { start: t })}
              onBlur={() => leaveStart(i)}
              placeholder="08:10"
              keyboardType="number-pad"
              maxLength={5}
              accessibilityLabel={`${row.period}교시 시작 시각`}
              style={styles.time}
            />
            <Text style={[styles.tilde, { color: palette.sub }]}>–</Text>
            <Field
              value={row.end}
              onChangeText={(t) => setRow(i, { end: t })}
              onBlur={() => leaveEnd(i)}
              placeholder="09:00"
              keyboardType="number-pad"
              maxLength={5}
              accessibilityLabel={`${row.period}교시 끝나는 시각`}
              style={styles.time}
            />
          </View>
        </Reveal>
      ))}

      <Text style={[styles.hint, { color: palette.sub }]}>
        1교시 시작만 넣으면 나머지를 {LESSON_MINUTES}분 수업 · {BREAK_MINUTES}분 쉬는 시간으로
        쭉 채워드려요. 다른 데는 고치면 되고, 고친 칸은 다시 안 건드려요.
      </Text>

      <View style={styles.buttons}>
        <View style={styles.fill}>
          <Button
            label="교시 늘리기"
            variant="secondary"
            onPress={addRow}
            disabled={rows.length >= MAX_PERIODS}
          />
        </View>
        <View style={styles.fill}>
          <Button
            label="마지막 교시 빼기"
            variant="secondary"
            onPress={dropRow}
            disabled={rows.length <= 1}
          />
        </View>
      </View>

      <Divider />

      <Text style={[styles.label, { color: palette.text }]}>점심시간</Text>
      <Text style={[styles.body, { color: palette.sub }]}>
        몇 교시 뒤인지만 골라주세요. 시각은 그 교시가 끝나는 때부터 다음 교시가 시작할 때까지예요.
      </Text>
      {/*
        미리 골라둔 '4교시'가 화면 밖으로 밀려 있었어요. 뭐가 골라져 있는지
        보려면 옆으로 밀어야 했죠. 골라진 걸 안 보여주는 고르개는 고장난
        거예요. '뒤'를 떼고 '없음'을 끝으로 보내서 흔한 자리를 앞에 뒀어요.
        ("몇 교시 뒤인지"는 바로 위 설명에 적혀 있어요)
      */}
      <ChipRow>
        {rows.map((r) => (
          <Chip
            key={r.period}
            label={`${r.period}교시`}
            say={`점심은 ${r.period}교시 뒤`}
            selected={lunch === r.period}
            onPress={() => setLunch(r.period)}
          />
        ))}
        <Chip label="없음" say="점심 자리 안 그림" selected={lunch === 0} onPress={() => setLunch(0)} />
      </ChipRow>

      {/*
        왜 저장을 못 하는지 적어요. 버튼만 꺼져 있으면 뭘 더 해야 하는지
        알 길이 없어요. 혼내는 말투가 아니라 남은 할 일처럼 적어요.
      */}
      {bad ? <Text style={[styles.hint, { color: palette.sub }]}>{bad}</Text> : null}
      {failed ? (
        <View style={[styles.failed, { backgroundColor: palette.tint }]}>
          <Text style={[styles.failedText, { color: palette.text }]}>{failed}</Text>
        </View>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  body: { fontSize: 13, lineHeight: 20, marginBottom: 16 },
  label: { fontSize: 13, fontWeight: '700', marginBottom: 8, marginTop: 4 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  /*
   * 교시 이름은 안 줄어들게 박아둬요. 안 그러면 칸 두 개가 자리를 다 가져가고
   * '1교시'가 '1 / 교 / 시' 로 세 줄이 됐어요. 390짜리 폰에서 끝나는 시각 칸은
   * 아예 화면 밖으로 나갔고요.
   */
  period: { width: 52, flexShrink: 0, fontSize: 13, fontWeight: '700' },
  /*
   * minWidth: 0 이 있어야 칸이 줄어들어요. 안 적으면 안에 든 글자 너비가
   * 바닥이 돼서 flex: 1 을 줘도 안 줄어들어요. (DESIGN.md "폭을 박아두지 않아요")
   */
  time: { flex: 1, minWidth: 0, borderRadius: 16, height: 48, paddingHorizontal: 8, textAlign: 'center' },
  tilde: { fontSize: 13, fontWeight: '700' },
  hint: { fontSize: 12, lineHeight: 18, marginTop: 8, marginBottom: 16 },
  buttons: { flexDirection: 'row', gap: 8, marginBottom: 8 },
  failed: { borderRadius: 16, padding: 16, marginTop: 8 },
  failedText: { fontSize: 13, lineHeight: 20 },
});
