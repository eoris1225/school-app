import { useFocusEffect } from 'expo-router';
import { useCallback, useRef } from 'react';

/**
 * 화면으로 **돌아올 때마다** 다시 받아와요. 처음 들어올 때는 안 해요.
 *
 * 탭 화면은 한 번 열리면 안 닫혀요. 다른 탭으로 갔다 와도 그대로 떠 있어요.
 * 그래서 처음 받아온 값이 계속 남아요. 화면은 멀쩡해 보이는데 내용만 낡은
 * 거라 제일 알아채기 어려워요.
 *
 * 실제로 이런 일이 있었어요. 학생이 커뮤니티에서 '국어'를 골랐는데 아직
 * 가입한 국어 선생님이 없었어요. 그 뒤에 선생님이 담당 과목을 저장했는데도
 * 학생 화면에는 계속 "아직 가입하지 않았어요"가 떠 있었어요. 같은 칩을
 * 다시 눌러도 소용없어요. 고른 값이 그대로라 화면이 다시 안 그려지거든요.
 * 탭을 나갔다 와야 갈렸어요.
 *
 * 처음 들어올 때를 건너뛰는 건, 그때는 화면이 이미 받아오고 있어서예요.
 * 같이 부르면 들어갈 때마다 두 번 다녀와요.
 */
export function useReturn(refresh: () => void): void {
  const first = useRef(true);
  useFocusEffect(
    useCallback(() => {
      if (first.current) {
        first.current = false;
        return;
      }
      refresh();
    }, [refresh]),
  );
}
