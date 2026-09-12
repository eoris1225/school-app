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

/*
 * 한 번 받아온 것은 담아뒀다가 다시 들어오면 바로 보여줘요.
 *
 * 예전에는 탭을 옮길 때마다 처음부터 다시 받아왔어요. 달력에 들어가면
 * 잠깐 아무것도 없다가 일정이 뿅 하고 나타났어요. 매번요.
 *
 * 이제는 담아둔 게 있으면 그걸 먼저 보여주고, 뒤에서 조용히 다시 받아와요.
 * 새 값이 오면 조용히 갈려요. 기다리는 시간이 눈에 안 보여요.
 *
 * 오래된 것부터 버려요. 날짜나 반이 키에 들어가서 그냥 두면 계속 쌓여요.
 */
const CACHE = new Map<string, unknown>();
const LIMIT = 50;

function remember(key: string, data: unknown) {
  // 다시 넣어서 맨 뒤로 보내요. Map은 넣은 순서를 지켜요.
  CACHE.delete(key);
  CACHE.set(key, data);
  while (CACHE.size > LIMIT) CACHE.delete(CACHE.keys().next().value as string);
}

/**
 * 미리 받아둬요. 이미 담아둔 게 있으면 아무것도 안 해요.
 *
 * 화면에 들어가기 전에 불러두면 들어가는 순간 이미 차 있어요.
 * 실패해도 조용히 넘어가요. 어차피 화면이 다시 물어봐요.
 */
export function primeRemote<T>(key: string, fetcher: () => Promise<T>): void {
  if (CACHE.has(key)) return;
  fetcher()
    .then((data) => remember(key, data))
    .catch(() => {});
}

/**
 * 담아둔 것을 전부 버려요. 로그아웃할 때 불러요.
 * 다른 사람으로 다시 들어왔는데 앞사람 것이 남아 있으면 안 돼요.
 */
export function clearRemoteCache(): void {
  CACHE.clear();
}

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
      .then((data) => {
        remember(key, data);
        settle({ data, error: null, retryable: false });
      })
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
  }, [stamp, key]);

  const retry = useCallback(() => setNonce((n) => n + 1), []);

  // 받아둔 결과가 지금 필요한 것이 아니면 아직 받아오는 중이에요.
  const fresh = done?.stamp === stamp ? done : null;
  // 받아오는 동안에는 지난번에 담아둔 것을 보여줘요. 빈 화면보다 나아요.
  const kept = fresh === null ? (CACHE.get(key) as T | undefined) : undefined;

  return {
    data: fresh ? fresh.data : (kept ?? null),
    // 보여줄 게 있으면 "불러오는 중"이 아니에요. 뒤에서 받아오고 있을 뿐이에요.
    loading: fresh === null && kept === undefined,
    error: fresh?.error ?? null,
    retryable: fresh?.retryable ?? false,
    retry,
  };
}
