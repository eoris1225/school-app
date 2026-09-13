/*
 * 진짜 서버에 대고 하는 검사예요.
 *
 *   TEACHER_CODE=선생님코드 node scripts/live-check.mjs
 *
 * 왜 따로 있냐면, 브라우저 검사는 서버를 흉내내거든요. 흉내는 우리가 기대한
 * 대로만 답해요. 그래서 이런 것들을 한 번도 못 잡았어요.
 *
 *   - PATCH 가 맨 위 method 목록에 없어서 405
 *   - assessments 표에 update 권한이 없어서 502
 *   - allergies 가 "바꿀 것이 없어요" 검사 목록에 안 적혀서 400
 *   - push_subs 표에 update 권한이 없어서 500 (덮어쓰기가 update 를 써요)
 *
 * 넷 다 흉내내는 검사는 전부 통과했어요. 진짜 서버에 보내야 나와요.
 *
 * ──────────────────────────────────────────────────────────────
 * 계정은 돌릴 때마다 새로 만들어요. 미리 만들어둔 걸 안 써요.
 *
 * 예전에는 시험 계정 두 개를 정해두고 "이건 지우면 안 돼요" 라고 적어뒀어요.
 * 그게 어디에 적혀 있었냐면 채팅에요. 당연히 지워졌고 검사가 통째로 멈췄어요.
 * 기억해야 굴러가는 건 언젠가 안 굴러가요.
 *
 * 그래서 이 스크립트가 만드는 계정은 이름이 이래요.
 *
 *     delete-me-<시각>-a@example.com
 *
 * **delete-me- 로 시작하는 계정은 전부 지워도 돼요.** 다음에 돌릴 때 새로
 * 만들어요. 지우면 안 되는 계정 같은 건 없어요.
 * ──────────────────────────────────────────────────────────────
 */

const U = 'https://isxbdvgvzdqpugaxqrzs.supabase.co';
// 이 열쇠는 공개된 값이에요. 앱에도 그대로 들어 있어요.
const KEY = 'sb_publishable_GfkqM8siiAriyu2jfYM8kw_erGjWr6n';
const SCHOOL = { office: 'G10', code: '7430062', name: '서일여자고등학교', officeName: '대전광역시교육청' };
const AT = `office=${SCHOOL.office}&school=${SCHOOL.code}`;
const PW = 'delete-me-123456';

const CODE = process.env.TEACHER_CODE;
if (!CODE) {
  console.log('TEACHER_CODE 를 넣어주세요.  TEACHER_CODE=... node scripts/live-check.mjs');
  console.log('(코드를 모르면 Supabase 대시보드 > Edge Functions > Secrets 에 있어요)');
  process.exit(2);
}

const fails = [];
const ok = (c, m) => {
  console.log(`${c ? '  통과' : '  실패'}  ${m}`);
  if (!c) fails.push(m);
};

/** 지워도 되는 계정을 하나 만들어요. 이름이 그렇게 말해줘요. */
async function makeAccount(tag) {
  const email = `delete-me-${Date.now()}-${tag}@example.com`;
  const r = await fetch(`${U}/auth/v1/signup`, {
    method: 'POST',
    headers: { apikey: KEY, 'content-type': 'application/json' },
    body: JSON.stringify({ email, password: PW, data: { name: `검사용${tag.toUpperCase()}` } }),
  });
  const j = await r.json();
  if (!j.access_token) {
    console.log(`계정을 못 만들었어요 (${r.status})`, JSON.stringify(j).slice(0, 200));
    console.log('메일 확인이 켜져 있으면 여기서 막혀요. Authentication > Sign In / Providers 를 보세요.');
    process.exit(1);
  }
  return { email, token: j.access_token };
}

const call = async (token, q, init = {}) => {
  const r = await fetch(`${U}/functions/v1/neis?${q}`, {
    ...init,
    headers: {
      apikey: KEY,
      ...(token ? { authorization: `Bearer ${token}` } : {}),
      'content-type': 'application/json',
      ...(init.headers ?? {}),
    },
  });
  return { status: r.status, body: await r.json().catch(() => null) };
};

const post = (token, q, body) => call(token, q, { method: 'POST', body: JSON.stringify(body) });

console.log('\n=== 지워도 되는 계정 만들기 ===');
const a = await makeAccount('a');
const b = await makeAccount('b');
console.log(`  ${a.email}`);
console.log(`  ${b.email}`);
console.log('  (둘 다 delete-me- 로 시작해요. 아무 때나 지우세요)');

for (const who of [a, b]) {
  const r = await post(who.token, 'kind=my-school', { ...SCHOOL, grade: 2, cls: '3', no: 1 });
  if (r.status !== 200) {
    console.log('  학교를 못 붙였어요', r.status, JSON.stringify(r.body));
    process.exit(1);
  }
}

console.log('\n=== 선생님으로 올리기 ===');
{
  for (const who of [a, b]) {
    const r = await post(who.token, 'kind=promote', {
      code: CODE,
      subjects: ['수학'],
      teaches: ['미적분Ⅰ'],
    });
    if (r.status !== 200) {
      console.log('  못 올렸어요', r.status, JSON.stringify(r.body));
      console.log('  TEACHER_CODE 가 맞는지 보세요. (한글 코드는 헤더에 못 실려서 조용히 실패해요)');
      process.exit(1);
    }
  }
  const meA = (await call(a.token, 'kind=me')).body?.me;
  const meB = (await call(b.token, 'kind=me')).body?.me;
  ok(meA?.role === 'teacher' && meB?.role === 'teacher', '둘 다 선생님이 됨');
  a.id = meA?.id;
  b.id = meB?.id;
}

console.log('\n=== 수행평가: 올리고 고치고 지우기 ===');
let made = null;
{
  const r = await post(a.token, `kind=assessments&${AT}`, {
    date: '2026-11-20',
    title: `검사용 ${Date.now()}`,
    subject: '미적분Ⅰ',
    detail: '검사용이에요. 곧 지워요.',
    grades: [2],
    classes: ['2-1', '1-5'],
  });
  ok(r.status === 201, `올라감 (${r.status})`);
  made = r.body?.assessment?.id ?? null;
  ok(r.body?.assessment?.by?.id === a.id, '올린 사람이 담김');
  // 학년과 반을 따로 담으면 1-1 과 2-5 까지 걸려요. '2-1' 모양 그대로여야 해요.
  ok(
    JSON.stringify(r.body?.assessment?.classes) === JSON.stringify(['2-1', '1-5']),
    `반이 '2-1' 모양 그대로 (${JSON.stringify(r.body?.assessment?.classes)})`,
  );
}

if (made) {
  // PATCH 는 맨 위 method 목록과 표 update 권한 둘 다 있어야 돼요.
  // 예전에 405 한 번, 502 한 번 났던 자리예요.
  const r = await call(a.token, `kind=assessments&id=${made}&${AT}`, {
    method: 'PATCH',
    body: JSON.stringify({
      date: '2026-11-24',
      title: '검사용 (고침)',
      subject: '미적분Ⅰ',
      detail: '검사용이에요.',
      grades: [2],
      classes: ['2-1'],
    }),
  });
  ok(r.status === 200, `올린 사람은 고칠 수 있음 (${r.status} ${r.body?.error ?? ''})`);

  const other = await call(b.token, `kind=assessments&id=${made}&${AT}`, {
    method: 'PATCH',
    body: JSON.stringify({
      date: '2026-11-24',
      title: '남이 고침',
      subject: '미적분Ⅰ',
      detail: '',
      grades: [2],
      classes: ['2-1'],
    }),
  });
  ok(other.status >= 400, `남은 못 고침 (${other.status})`);

  const del = await call(b.token, `kind=assessments&id=${made}&${AT}`, { method: 'DELETE' });
  ok(del.status >= 400, `남은 못 지움 (${del.status})`);

  const mine = await call(a.token, `kind=assessments&id=${made}&${AT}`, { method: 'DELETE' });
  ok(mine.status === 200, `올린 사람은 지울 수 있음 (${mine.status})`);
}

console.log('\n=== 내 설정: 칸마다 진짜로 담기는지 ===');
{
  /*
   * 칸을 하나 늘릴 때마다 서버 세 군데를 같이 고쳐야 해요. 읽는 목록,
   * 쓰는 목록, 그리고 "바꿀 것이 없어요" 검사요. 하나만 빠뜨려도 그 칸만
   * 조용히 안 담겨요. 그래서 칸마다 하나씩 따로 보내봐요.
   */
  const cases = [
    ['알레르기', { allergies: [6, 1, 9, 1] }, (me) => JSON.stringify(me?.allergies) === '[1,6,9]'],
    ['교시 바꾸기', { swaps: { '월-6': '역학과 에너지' } }, (me) => me?.swaps?.['월-6'] === '역학과 에너지'],
    ['내 일정', { myEvents: [{ id: 'my-1', date: '2026-09-14', title: '치과' }] }, (me) => me?.myEvents?.[0]?.title === '치과'],
    ['테마 색', { accent: '#22c55e' }, (me) => me?.accent === '#22c55e'],
    ['화면 밝기', { schemePref: 'dark' }, (me) => me?.schemePref === 'dark'],
  ];
  for (const [what, body, check] of cases) {
    const r = await post(a.token, 'kind=my-settings', body);
    ok(r.status === 200 && check(r.body?.me), `${what} 담김 (${r.status} ${r.body?.error ?? ''})`);
    // 돌려준 값만 보면 안 돼요. 표에 안 들어갔어도 돌려줄 수는 있거든요.
    const again = (await call(a.token, 'kind=me')).body?.me;
    ok(check(again), `${what} 다시 물어봐도 그대로`);
  }

  const bad = await post(a.token, 'kind=my-settings', { allergies: [0] });
  ok(bad.status >= 400, `이상한 알레르기 번호는 거절 (${bad.status})`);
}

console.log('\n=== 교시 시각 ===');
{
  const got = await call(null, `kind=bells&${AT}`);
  ok(got.status === 200, `로그인 없이도 읽힘 (${got.status})`);
  const before = got.body?.bells ?? null;
  ok(before === null || Array.isArray(before?.periods), '모양이 맞음');

  const mine = {
    periods: Array.from({ length: 7 }, (_, i) => ({
      period: i + 1,
      start: `${String(8 + i).padStart(2, '0')}:10`,
      end: `${String(9 + i).padStart(2, '0')}:00`,
    })),
    lunchAfter: 4,
  };
  const put = await post(a.token, `kind=bells&${AT}`, mine);
  ok(put.status === 200, `선생님은 넣을 수 있음 (${put.status} ${put.body?.error ?? ''})`);

  const crooked = await post(a.token, `kind=bells&${AT}`, {
    periods: [{ period: 1, start: '09:50', end: '09:00' }],
    lunchAfter: 0,
  });
  ok(crooked.status === 400, `거꾸로 된 시각은 거절 (${crooked.status} ${crooked.body?.error ?? ''})`);

  const anon = await post(null, `kind=bells&${AT}`, mine);
  ok(anon.status >= 400, `로그인 없이는 못 넣음 (${anon.status})`);

  // 검사 때문에 학교 시각이 바뀌면 안 돼요. 원래대로 돌려놔요.
  if (before) {
    const back = await post(a.token, `kind=bells&${AT}`, before);
    ok(back.status === 200, `원래 시각으로 되돌림 (${back.status})`);
  }
}

console.log('\n=== 알림 ===');
{
  const r = await call(a.token, 'kind=push');
  ok(r.status === 200, `상태를 물어볼 수 있음 (${r.status})`);
  ok(typeof r.body?.ready === 'boolean', `열쇠가 준비됐는지 알려줌 (ready: ${r.body?.ready})`);
}

console.log(
  fails.length
    ? `\n실패 ${fails.length}건\n` + fails.map((f) => '  - ' + f).join('\n') + '\n'
    : '\n다 통과했어요\n',
);
console.log(`만든 계정 둘은 그냥 두셔도 되고 지우셔도 돼요: delete-me-* (${a.email}, ${b.email})\n`);
process.exit(fails.length ? 1 : 0);
