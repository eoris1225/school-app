import { createContext, useContext } from 'react';
import { Text as RNText, StyleSheet, type TextProps, type TextStyle } from 'react-native';

/**
 * 글꼴은 두 벌을 써요.
 * - Neischool Sans: 한글과 일반 글씨. 굵기 네 단계.
 * - Outfit: 숫자와 영문만 나오는 자리(시각, 날짜, D-day, 열량 등).
 *   숫자를 다른 글꼴로 두면 화면이 단조롭지 않고, 숫자가 또렷하게 읽혀요.
 *
 * Neischool Sans 는 Pretendard 를 글자 수만 줄여서 쓴 거예요. 이름을 왜
 * 바꿨냐면, Pretendard 는 OFL 의 '예약 글꼴 이름' 이 걸려 있거든요. 글자를
 * 덜어내면 OFL 기준으로는 수정본이고, 수정본에는 원래 이름을 못 써요.
 * 만든 분 표시는 assets/fonts/LICENSE.md 와 글꼴 파일 안에 그대로 있어요.
 */
export const FONT = {
  regular: 'NeischoolSans',
  medium: 'NeischoolSansMedium',
  semibold: 'NeischoolSansSemiBold',
  bold: 'NeischoolSansBold',
  num: 'Outfit',
  numBold: 'OutfitBold',
} as const;

/** _layout에서 useFonts에 그대로 넘겨요. */
export const FONT_ASSETS = {
  [FONT.regular]: require('../../assets/fonts/NeischoolSans.ttf'),
  [FONT.medium]: require('../../assets/fonts/NeischoolSansMedium.ttf'),
  [FONT.semibold]: require('../../assets/fonts/NeischoolSansSemiBold.ttf'),
  [FONT.bold]: require('../../assets/fonts/NeischoolSansBold.ttf'),
  [FONT.num]: require('../../assets/fonts/Outfit.ttf'),
  [FONT.numBold]: require('../../assets/fonts/OutfitBold.ttf'),
};

/*
 * 글자 크기 배율이에요.
 *
 * 앱 전체 상태(app-state)에 두지 않고 따로 뒀어요. 글씨는 화면마다 수십 개씩
 * 있는데, 전체 상태에 붙여두면 거기서 뭐 하나만 바뀌어도(1분마다 도는 시계
 * 같은 것도요) 글씨가 전부 다시 그려져요.
 *
 * 기본값이 1이라 감싸는 게 없어도 안 터져요.
 */
export const TextScaleContext = createContext(1);
export const useTextScale = () => useContext(TextScaleContext);

const weightOf = (w?: TextStyle['fontWeight']) => {
  if (w === 'bold') return 700;
  const n = Number(w);
  return Number.isNaN(n) ? 400 : n;
};

export function fontFor(weight?: TextStyle['fontWeight'], numeric = false) {
  const w = weightOf(weight);
  if (numeric) return w >= 600 ? FONT.numBold : FONT.num;
  if (w >= 700) return FONT.bold;
  if (w >= 600) return FONT.semibold;
  if (w >= 500) return FONT.medium;
  return FONT.regular;
}

export type AppTextProps = TextProps & {
  /** 숫자·영문만 있는 글씨. Outfit으로 그려요. */
  numeric?: boolean;
};

/**
 * react-native의 Text 대신 쓰는 글씨예요.
 * 굵기 파일이 따로라서 fontWeight를 보고 알맞은 파일을 고르고,
 * 두 번 굵어지지 않게 fontWeight는 normal로 되돌려요.
 */
export function Text({ style, numeric = false, ...props }: AppTextProps) {
  const flat = StyleSheet.flatten(style) as TextStyle | undefined;
  const scale = useTextScale();
  return (
    <RNText
      {...props}
      style={[
        style,
        { fontFamily: fontFor(flat?.fontWeight, numeric), fontWeight: 'normal' },
        // 줄 높이도 같이 키워요. 글씨만 키우면 윗줄 아랫줄이 서로 겹쳐요.
        scaled(flat?.fontSize, scale, 'fontSize'),
        scaled(flat?.lineHeight, scale, 'lineHeight'),
      ]}
    />
  );
}

/** 크기가 적혀 있을 때만 곱해요. 안 적힌 건 그대로 둬요. */
function scaled(value: number | undefined, scale: number, key: 'fontSize' | 'lineHeight') {
  if (scale === 1 || typeof value !== 'number') return null;
  return { [key]: Math.round(value * scale) } as TextStyle;
}
