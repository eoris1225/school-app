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

/** 기본 수업 시간이에요. 시작만 넣으면 끝을 이만큼 뒤로 채워드려요. */
const LESSON_MINUTES = 50;

const pad = (n: number) => String(n).padStart(2, '0');

/** '08:10' 에 50분을 더해 '09:00' */
function plus(hhmm: string, minutes: number): string {
  const t = toMin(hhmm) + minutes;
  return `${pad(Math.floor(t / 60) % 24)}:${pad(t % 60)}`;
}

export default function BellTimesScreen() {
  const { palette, role, bells, bellsLoading, setBells } = useApp();

  const [rows, setRows] = useState<Row[]>(() => bells?.periods ?? blankBells());
  const [lunch, setLunch] = useState(() => bells?.lunchAfter ?? 0);
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
    setRows((list) =>
      list.map((r, k) =>
        k === i ? { ...r, start: fixed, end: r.end.trim() ? r.end : plus(fixed, LESSON_MINUTES) } : r,
      ),
    );
  };

  const leaveEnd = (i: number) => {
    const fixed = tidyTime(rows[i].end);
    if (fixed) setRow(i, { end: fixed });
  };

  const addRow = () =>
    setRows((list) => [...list, { period: list.length + 1, start: '', end: '' }]);

  const dropRow = () =>
    setRows((list) => {
      const next = list.slice(0, -1);
      // 점심이 사라진 교시 뒤를 가리키고 있으면 같이 내려요.
      setLunch((l) => Math.min(l, next.length));
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
        시작 시각을 넣고 다음 칸으로 넘어가면 끝나는 시각을 {LESSON_MINUTES}분 뒤로 채워드려요.
        다르면 고쳐주세요.
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
      <ChipRow>
        <Chip label="없음" selected={lunch === 0} onPress={() => setLunch(0)} />
        {rows.map((r) => (
          <Chip
            key={r.period}
            label={`${r.period}교시 뒤`}
            selected={lunch === r.period}
            onPress={() => setLunch(r.period)}
          />
        ))}
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
