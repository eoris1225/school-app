import { useWindowDimensions } from 'react-native';

/**
 * 화면 크기를 한곳에서 판단해요. 폰 세로, 폰 가로, 태블릿을 모두 다르게 다뤄요.
 *
 * - tablet   : 짧은 쪽이 600 이상이면 태블릿으로 봐요. (폰을 눕힌 것과 구분돼요)
 * - twoColumn: 홈 본문을 두 칸으로 나눌 만큼 넓은 화면
 * - short    : 눕힌 폰처럼 위아래가 아주 짧은 화면. 홈도 스크롤을 허용해요.
 * - compact  : 작은 폰. 글씨와 여백을 한 단계 줄여요.
 */
export type Layout = {
  width: number;
  height: number;
  tablet: boolean;
  twoColumn: boolean;
  short: boolean;
  compact: boolean;
  /** 글이 너무 넓게 퍼지지 않게 잡아 두는 가운데 기둥 너비 */
  content: number;
  /** 홈 화면 기둥 너비. 두 칸으로 나눌 때는 더 넓게 써요. */
  home: number;
};

export function useLayout(): Layout {
  const { width, height } = useWindowDimensions();
  const tablet = Math.min(width, height) >= 600;
  // 두 칸은 가로로 누운 태블릿에서만. 세로 태블릿은 한 칸이 더 자연스러워요.
  const twoColumn = tablet && width >= 900;
  // 한 줄짜리 목록이 너무 길게 퍼지면 읽기 힘들어서 720에서 끊어요.
  const content = tablet ? 720 : 560;
  return {
    width,
    height,
    tablet,
    twoColumn,
    short: height < 560,
    compact: !tablet && height < 760,
    content,
    home: twoColumn ? Math.min(width - 40, 1040) : content,
  };
}
