import { useCallback, useEffect, useRef, useState } from 'react';

import { ApiError } from '@/lib/api';

export type Remote<T> = {
  data: T | null;
  /** 불러오는 중 */
  loading: boolean;
  /** 화면에 그대로 보여줄 수 있는 문구. 없으면 null */
  error: string | null;
  /** 다시 해볼 만한 오류인지 */
  retryable: boolean;
  retry: () => void;
};

type Done<T> = {
  /** 어떤 요청의 결과인지. 지금 필요한 것과 다르면 낡은 결과예요. */
  stamp: string;
  data: T | null;
  error: string | null;
  retryable: boolean;
};

/**
 * 서버에서 하나 받아와서 화면에 쓰기 좋은 모양으로 내놔요.
 *
 *   const meals = useRemote(`meal:${date}`, () => getMeals(date));
 *
 * 첫 번째 값은 "무엇을 받아오는지"를 나타내는 이름이에요.
 * 이 이름이 바뀌면 다시 받아와요. 날짜나 반처럼 바뀌는 값을 넣어주세요.
 *
 * 신경 쓴 것 세 가지예요.
 *  - 화면을 떠난 뒤 늦게 도착한 답은 버려요. 없어진 화면을 고치려 들면 안 되니까요.
 *  - 빠르게 여러 번 부르면(요일을 탁탁 누르면) 마지막 것만 반영해요.
 *    먼저 보낸 요청이 나중에 도착해 엉뚱한 날 급식을 덮어쓰면 안 되거든요.
 *  - "불러오는 중"은 따로 저장하지 않고 계산해요. 받아둔 결과가 지금 필요한
 *    것과 다르면 그게 곧 불러오는 중이에요. 상태가 하나뿐이라 어긋날 일이 없어요.
 */
export function useRemote<T>(key: string, fetcher: () => Promise<T>): Remote<T> {
  const [done, setDone] = useState<Done<T> | null>(null);
  const [nonce, setNonce] = useState(0);
  const stamp = `${key}#${nonce}`;

  // fetcher는 화면이 그려질 때마다 새로 만들어져요. 그걸 기준으로 다시 받아오면
  // 끝없이 돌아가니까, 최신 것만 담아뒀다가 꺼내 써요.
  // 이 effect를 먼저 적어둬야 아래 effect가 돌 때 최신 값이 들어 있어요.
  const latest = useRef(fetcher);
  useEffect(() => {
    latest.current = fetcher;
  });

  // 이 요청이 아직 최신인지 판단하려고 번호를 매겨요.
  const seq = useRef(0);

  useEffect(() => {
    const mine = ++seq.current;
    let alive = true;

    const settle = (d: Omit<Done<T>, 'stamp'>) => {
      if (alive && mine === seq.current) setDone({ stamp, ...d });
    };

    latest
      .current()
      .then((data) => settle({ data, error: null, retryable: false }))
      .catch((e: unknown) => {
        const api = e instanceof ApiError;
        settle({
          data: null,
          error: api ? e.message : '알 수 없는 문제가 생겼어요',
          retryable: api ? e.retryable : true,
        });
      });

    return () => {
      alive = false;
    };
  }, [stamp]);

  const retry = useCallback(() => setNonce((n) => n + 1), []);

  // 받아둔 결과가 지금 필요한 것이 아니면 아직 불러오는 중이에요.
  const fresh = done?.stamp === stamp ? done : null;

  return {
    data: fresh?.data ?? null,
    loading: fresh === null,
    error: fresh?.error ?? null,
    retryable: fresh?.retryable ?? false,
    retry,
  };
}
