import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useRef } from 'react';
import { AppState } from 'react-native';

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

/**
 * 화면을 보고 있는 동안 몇 초마다 다시 받아와요.
 *
 * 쪽지에 써요. 상대가 답을 보내도 내 화면은 그대로였어요. 새로고침을 해야
 * 보였고요. 대화하는 화면에서 그건 좀 그래요.
 *
 * 진짜 실시간(Realtime)은 못 써요. 우리 표는 RLS를 켜고 정책을 안 만들어서
 * 앱이 직접 못 읽거든요. 서버 함수만 service_role 키로 읽어요. 구독을
 * 붙이려면 그 벽을 허물어야 하는데, 쪽지는 남이 보면 안 되는 내용이라
 * 편하자고 열 자리가 아니에요. 몇 초마다 물어보는 게 훨씬 싸게 먹혀요.
 *
 * 보고 있을 때만 물어봐요. 다른 탭으로 갔거나 앱을 내려놓으면 멈춰요.
 * 안 보는 화면 때문에 배터리와 데이터를 쓰면 안 되니까요.
 */
export function usePoll(refresh: () => void, everyMs: number): void {
  const latest = useRef(refresh);
  useEffect(() => {
    latest.current = refresh;
  });

  useFocusEffect(
    useCallback(() => {
      let timer: ReturnType<typeof setInterval> | null = null;

      const stop = () => {
        if (timer) clearInterval(timer);
        timer = null;
      };
      const start = () => {
        stop();
        timer = setInterval(() => latest.current(), everyMs);
      };

      if (AppState.currentState === 'active') start();
      // 앱을 내려놨다 다시 열면 그 사이에 온 게 있을 수 있어요. 바로 한 번 봐요.
      const watch = AppState.addEventListener('change', (state) => {
        if (state === 'active') {
          latest.current();
          start();
        } else stop();
      });

      return () => {
        stop();
        watch.remove();
      };
    }, [everyMs]),
  );
}

/**
 * 어느 화면에 있든 일정하게 다시 받아와요. 화면과 상관없는 것에 써요.
 *
 * `usePoll` 과 다른 점은 "보고 있는 화면"을 안 따진다는 거예요. 탭 배지가
 * 그래요. 안 읽은 쪽지 개수는 홈에 있든 급식에 있든 맞아야 하는데,
 * 쪽지함을 보고 있을 때만 갱신되면 거기 들어가기 전에는 배지가 안 올라와요.
 * 그러면 새 쪽지가 온 걸 알 방법이 없어요.
 *
 * 대신 느긋하게 물어봐요. 배지는 몇 초 늦어도 아무 일 안 나요. 앱을
 * 내려놓으면 멈추고, 다시 열면 그 사이에 온 게 있으니 바로 한 번 봐요.
 */
export function useHeartbeat(refresh: () => void, everyMs: number): void {
  const latest = useRef(refresh);
  useEffect(() => {
    latest.current = refresh;
  });

  useEffect(() => {
    let timer: ReturnType<typeof setInterval> | null = null;
    const stop = () => {
      if (timer) clearInterval(timer);
      timer = null;
    };
    const start = () => {
      stop();
      timer = setInterval(() => latest.current(), everyMs);
    };

    if (AppState.currentState === 'active') start();
    const watch = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        latest.current();
        start();
      } else stop();
    });

    return () => {
      stop();
      watch.remove();
    };
  }, [everyMs]);
}
