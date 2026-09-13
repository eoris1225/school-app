/**
 * 이름 뒤에 붙는 조사를 골라줘요.
 *
 * '수학' 뒤에는 '으로', '기하' 뒤에는 '로'가 붙어요. 받침이 있냐 없냐로
 * 갈려요. 그냥 '로'를 붙여두면 "수학 로 온 쪽지"처럼 어색해지고, 그런 글이
 * 한 군데만 있어도 앱 전체가 대충 만든 티가 나요.
 *
 * '(으)로' 처럼 괄호로 도망갈 수도 있지만, 그건 사람이 읽는 글이 아니라
 * 서식 같아요. 학교에서 쓰는 앱이니 제대로 붙여요.
 */

/**
 * 마지막 글자에 받침이 있는지 봐요.
 *
 * 한글은 글자 하나가 초성·중성·종성을 담은 숫자 하나예요. 0xAC00('가')에서
 * 얼마나 떨어졌는지를 28로 나눈 나머지가 종성이에요. 0이면 받침이 없어요.
 *
 * 숫자와 영문은 소리 나는 대로 봐요. '3'은 '삼'이라 받침이 있고, '2'는 '이'라
 * 없어요. 'm'은 '엠'이라 있고, 's'는 '에스'라 없어요.
 */
function finalOf(word: string): { has: boolean; rieul: boolean } {
  const last = word.trim().slice(-1);
  if (!last) return { has: false, rieul: false };

  const code = last.charCodeAt(0);
  if (code >= 0xac00 && code <= 0xd7a3) {
    const jong = (code - 0xac00) % 28;
    // 8은 ㄹ이에요. ㄹ 받침은 '로'와 '으로' 중에 '로'를 써요 ('발로', '물로').
    return { has: jong !== 0, rieul: jong === 8 };
  }

  // 0영 1일 3삼 6육 7칠 8팔 은 받침이 있고, 2이 4사 5오 9구 는 없어요.
  if (last >= '0' && last <= '9') {
    return { has: '013678'.includes(last), rieul: '178'.includes(last) };
  }

  // 영문은 읽는 이름 기준이에요. 엘·엠·엔만 받침이 있어요.
  const alpha = last.toLowerCase();
  if (alpha >= 'a' && alpha <= 'z') {
    return { has: 'lmn'.includes(alpha), rieul: alpha === 'l' };
  }

  // 기호로 끝나면 어느 쪽도 확실하지 않아요. 받침 없는 쪽이 덜 어색해요.
  return { has: false, rieul: false };
}

/** '로'와 '으로' 중에 맞는 것. ㄹ 받침은 '로'예요. */
export function ro(word: string): string {
  const { has, rieul } = finalOf(word);
  return has && !rieul ? '으로' : '로';
}

/** '을'과 '를' 중에 맞는 것 */
export function eul(word: string): string {
  return finalOf(word).has ? '을' : '를';
}

/** '이'와 '가' 중에 맞는 것 */
export function i(word: string): string {
  return finalOf(word).has ? '이' : '가';
}

/** '은'과 '는' 중에 맞는 것 */
export function eun(word: string): string {
  return finalOf(word).has ? '은' : '는';
}

/** '과'와 '와' 중에 맞는 것 */
export function wa(word: string): string {
  return finalOf(word).has ? '과' : '와';
}
