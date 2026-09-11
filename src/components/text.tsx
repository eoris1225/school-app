import { Text as RNText, StyleSheet, type TextProps, type TextStyle } from 'react-native';

/**
 * 앱 전체가 쓰는 둥근 글꼴(나눔스퀘어라운드)이에요.
 * 리액트 네이티브는 굵기별로 파일이 따로라, 스타일에 적힌 fontWeight를 보고
 * 맞는 파일을 골라 줘요. 화면 코드는 지금처럼 fontWeight만 적으면 돼요.
 */
export const FONT = {
  regular: 'NanumSquareRound',
  bold: 'NanumSquareRoundBold',
  extraBold: 'NanumSquareRoundExtraBold',
} as const;

/** _layout에서 useFonts에 그대로 넘겨요. */
export const FONT_ASSETS = {
  [FONT.regular]: require('../../assets/fonts/NanumSquareRoundR.ttf'),
  [FONT.bold]: require('../../assets/fonts/NanumSquareRoundB.ttf'),
  [FONT.extraBold]: require('../../assets/fonts/NanumSquareRoundEB.ttf'),
};

export function fontFor(weight?: TextStyle['fontWeight']) {
  if (weight === 'bold') return FONT.bold;
  const n = Number(weight);
  if (Number.isNaN(n)) return FONT.regular;
  if (n >= 800) return FONT.extraBold;
  if (n >= 600) return FONT.bold;
  return FONT.regular;
}

/**
 * react-native의 Text 대신 쓰는 글씨예요.
 * fontWeight를 'normal'로 되돌려서, 글꼴 파일이 이미 굵은데 한 번 더 굵어지는 걸 막아요.
 */
export function Text({ style, ...props }: TextProps) {
  const flat = StyleSheet.flatten(style) as TextStyle | undefined;
  return <RNText {...props} style={[style, { fontFamily: fontFor(flat?.fontWeight), fontWeight: 'normal' }]} />;
}
