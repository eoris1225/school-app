import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, View } from 'react-native';

import { Fade } from '@/components/motion';
import { Text } from '@/components/text';
import type { ToneColor } from '@/constants/tones';
import { useApp } from '@/lib/app-state';

/*
 * 달력의 날짜 한 칸이에요.
 *
 * 예전에는 날짜 아래에 얇은 막대를 하나 그렸어요. 작아서 잘 안 보이고,
 * "이 날 뭔가 있다"를 알려면 숫자가 아니라 그 밑을 봐야 했어요.
 *
 * 지금은 날짜 숫자가 앉은 네모 자체를 칠해요. 한눈에 들어오고,
 * 종류가 여러 개면 색을 대각선으로 섞어서 "여러 가지가 있다"를 보여줘요.
 */

const SIZE = 38;

type Stops = readonly [number, number, ...number[]];
type Colors = readonly [string, string, ...string[]];

/*
 * 색 여러 개를 대각선 줄무늬로 잘라요.
 *
 * 사이에 아주 가는 흰 선을 끼워요. 왜냐면 우리 파스텔들은 밝기가 거의
 * 같거든요 (초록과 분홍의 밝기 차이가 0.000이에요). 색조만 다른 색을
 * 맞붙여 놓으면 38px 네모 안에서는 한 덩어리로 보여요. 선이 한 줄
 * 들어가면 "둘이다"가 바로 읽혀요.
 *
 * 색을 더 진하게 하는 방법도 재봤는데 안 돼요. 조금만 진해져도 그 위에
 * 올릴 숫자의 대비가 4.5 아래로 떨어져요. 우리 팔레트는 연한 바탕 +
 * 진한 글씨 짝일 때만 읽혀요.
 */
const GAP = 0.035;

function bands(colors: string[], line: string): { colors: Colors; locations: Stops } {
  const out: string[] = [];
  const at: number[] = [];
  const slice = 1 / colors.length;
  colors.forEach((c, i) => {
    const from = i * slice;
    const to = (i + 1) * slice;
    if (i > 0) {
      // 앞 색이 끝나는 곳에 선을 한 줄 끼워요.
      out.push(line, line);
      at.push(from, from + GAP);
    }
    // 같은 색을 두 번 넣고 경계를 붙여두면 그라데이션이 아니라 줄무늬가 돼요.
    out.push(c, c);
    at.push(i > 0 ? from + GAP : from, to);
  });
  return { colors: out as unknown as Colors, locations: at as unknown as Stops };
}

export function DayCell({
  day,
  tones,
  today,
  selected,
  count,
  textColor,
}: {
  day: number;
  /** 이 날 있는 일정 종류의 색들. 없으면 빈 배열이에요. */
  tones: ToneColor[];
  today: boolean;
  selected: boolean;
  /** 일정 개수. 두 개 이상이면 오른쪽 위에 점을 찍어요. */
  count: number;
  /** 주말이면 빨강·파랑이 들어와요. */
  textColor: string;
}) {
  const { palette } = useApp();

  // 오늘이 가장 세요. 그다음이 일정 색, 아무것도 없으면 빈 칸이에요.
  const fill = today ? [palette.accent] : tones.map((t) => t.bg);
  const ink = today ? palette.onAccent : tones.length ? tones[0].fg : textColor;

  return (
    <View style={styles.wrap}>
      <View style={styles.box}>
        {/*
          칠은 스르르 나타나요. 일정을 받아오면 마흔두 칸이 한꺼번에 색을
          얻는데, 그게 뿅 하고 바뀌면 화면이 덜컥거려요.
        */}
        {fill.length > 1 ? (
          <Fade style={StyleSheet.absoluteFill}>
            <LinearGradient
              {...bands(fill, palette.surface)}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={StyleSheet.absoluteFill}
            />
          </Fade>
        ) : fill.length === 1 ? (
          <Fade style={[StyleSheet.absoluteFill, { backgroundColor: fill[0] }]} />
        ) : null}

        {/* 고른 날은 테두리로 표시해요. 칠은 일정 색이 맡고 있어서요. */}
        {selected ? (
          <View style={[StyleSheet.absoluteFill, styles.ring, { borderColor: palette.accent }]} />
        ) : null}

        {/* 색만으로 알리지 않아요. 일정이 있으면 숫자도 굵어져요. */}
        <Text numeric style={[styles.day, { color: ink }, (today || selected || tones.length > 0) && styles.bold]}>
          {day}
        </Text>
      </View>

      {/*
        두 개 이상이면 개수를 따로 알려줘요. 색만으로는 몇 개인지 모르고,
        오늘은 칸이 테마색으로 덮여서 일정 색도 안 보여요. 그래서 오늘도 붙여요.
      */}
      {count > 1 ? (
        <View style={[styles.count, { backgroundColor: palette.surface, borderColor: palette.line }]}>
          <Text numeric style={[styles.countText, { color: palette.sub }]}>
            {count}
          </Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { width: SIZE, height: SIZE },
  box: {
    width: SIZE,
    height: SIZE,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  ring: { borderRadius: 13, borderWidth: 2 },
  day: { fontSize: 13, fontWeight: '600', fontVariant: ['tabular-nums'] },
  bold: { fontWeight: '800' },
  count: {
    position: 'absolute',
    top: -3,
    right: -3,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  countText: { fontSize: 12, fontWeight: '700' },
});
