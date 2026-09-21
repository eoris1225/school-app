/*
 * 시연용 환경을 만들어요.
 *
 *   TEACHER_CODE=선생님코드 node scripts/demo-setup.mjs
 *
 * 대회 제출 영상을 찍으려면 화면에 뭔가가 있어야 해요. 빈 앱으로는
 * 쪽지도 수행평가도 보여줄 수가 없어요. 그래서 선생님 세 분과 학생 하나,
 * 그리고 주고받은 쪽지와 수행평가를 미리 넣어둬요.
 *
 * ──────────────────────────────────────────────────────────────
 * 여기서 만드는 계정은 이름이 전부 demo- 로 시작해요.
 *
 *     demo-student@example.com
 *     demo-teacher-math@example.com
 *
 * **demo- 로 시작하는 계정은 영상을 다 찍고 나면 지워도 돼요.**
 * 지우면 안 되는 계정 같은 건 없어요. 이 스크립트를 다시 돌리면
 * 똑같이 다시 만들어져요. (이미 있으면 로그인해서 그대로 써요)
 *
 * 선생님 성함은 실제 서일여고 선생님이 아니에요. 지어낸 이름이에요.
 * 혹시 같은 성함의 선생님이 계시면 아래 TEACHERS 의 name 을 바꾸세요.
 * ──────────────────────────────────────────────────────────────
 */

const U = 'https://isxbdvgvzdqpugaxqrzs.supabase.co';
// 이 열쇠는 공개된 값이에요. 앱에도 그대로 들어 있어요.
const KEY = 'sb_publishable_GfkqM8siiAriyu2jfYM8kw_erGjWr6n';
const SCHOOL = { office: 'G10', code: '7430062', name: '서일여자고등학교', officeName: '대전광역시교육청' };
const AT = `office=${SCHOOL.office}&school=${SCHOOL.code}`;

/** 시연 계정 비밀번호. 영상 찍고 지울 거라 외우기 쉬운 걸로 해요. */
export const PW = 'neischool-demo-2026';

const STUDENT = { email: 'demo-student@example.com', name: '이수민', grade: 2, cls: '3', no: 7 };
const TEACHERS = [
  { key: 'kor', email: 'demo-teacher-kor@example.com', name: '김서연',
    subjects: ['국어'], teaches: ['공통국어2', '독서와 작문'], grade: 2, cls: '1' },
  { key: 'math', email: 'demo-teacher-math@example.com', name: '박지훈',
    subjects: ['수학'], teaches: ['미적분Ⅰ', '경제 수학'], grade: 2, cls: '3' },
  { key: 'eng', email: 'demo-teacher-eng@example.com', name: '이하늘',
    subjects: ['영어'], teaches: ['영어Ⅱ', '심화 영어Ⅰ'], grade: 1, cls: '5' },
];

const CODE = process.env.TEACHER_CODE;
if (!CODE) {
  console.log('TEACHER_CODE 를 넣어주세요.  TEACHER_CODE=... node scripts/demo-setup.mjs');
  process.exit(2);
}

const day = (plus) => {
  const d = new Date();
  d.setDate(d.getDate() + plus);
  return d.toISOString().slice(0, 10);
};

/*
 * 일정을 몰아둘 날을 고를 때 주말을 피해요.
 *
 * 처음에는 그냥 오늘+12일로 뒀는데 하필 토요일이자 개천절이었어요.
 * 그 날에 수행평가 여섯 개가 잡힌 달력은 아무도 안 믿어요.
 * 12일 뒤부터 세어서 첫 수요일을 써요.
 */
function midweek(after) {
  const d = new Date();
  d.setDate(d.getDate() + after);
  while (d.getDay() !== 3) d.setDate(d.getDate() + 1);
  return d.toISOString().slice(0, 10);
}
const BUSY = midweek(12);

/** 계정을 만들어요. 이미 있으면 그냥 로그인해요. */
async function account(email, name) {
  const body = JSON.stringify({ email, password: PW, data: { name } });
  const head = { apikey: KEY, 'content-type': 'application/json' };

  const up = await fetch(`${U}/auth/v1/signup`, { method: 'POST', headers: head, body });
  const j = await up.json();
  if (j.access_token) return { email, name, token: j.access_token, made: true };

  const inn = await fetch(`${U}/auth/v1/token?grant_type=password`, {
    method: 'POST', headers: head, body: JSON.stringify({ email, password: PW }),
  });
  const k = await inn.json();
  if (k.access_token) return { email, name, token: k.access_token, made: false };

  console.log(`계정 실패 ${email}:`, JSON.stringify(j).slice(0, 200), JSON.stringify(k).slice(0, 200));
  process.exit(1);
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
const post = (t, q, b) => call(t, q, { method: 'POST', body: JSON.stringify(b) });
const patch = (t, q, b) => call(t, q, { method: 'PATCH', body: JSON.stringify(b) });

const step = (m) => console.log(`\n== ${m}`);
const line = (m) => console.log(`   ${m}`);

// ── 선생님 세 분 ────────────────────────────────────────────────
step('선생님 계정');
for (const t of TEACHERS) {
  const who = await account(t.email, t.name);
  t.token = who.token;
  /*
   * 선생님도 학년·반을 줘야 해요. 안 주면 400 이 나고 학교가 안 붙는데,
   * 학교가 안 붙은 선생님은 학생의 쪽지 상대 목록에 아예 안 나와요.
   * (listTeachers 가 school_office/school_code 로 거르거든요)
   */
  await post(t.token, 'kind=my-school', { ...SCHOOL, grade: t.grade, cls: t.cls, no: null });
  const up = await post(t.token, 'kind=promote', {
    code: CODE, subjects: t.subjects, teaches: t.teaches,
  });
  if (up.status !== 200) {
    line(`못 올렸어요 ${t.email} (${up.status}) ${JSON.stringify(up.body).slice(0, 120)}`);
    line('TEACHER_CODE 가 맞는지 보세요. 한글 코드는 헤더에 못 실려서 조용히 실패해요.');
    process.exit(1);
  }
  const me = (await call(t.token, 'kind=me')).body?.me;
  t.id = me?.id;
  line(`${t.name} (${t.subjects.join('/')}) ${t.grade}-${t.cls} 담임 ${who.made ? '새로 만듦' : '이미 있어서 로그인'}`);
}

// ── 학생 ────────────────────────────────────────────────────────
step('학생 계정');
const s = await account(STUDENT.email, STUDENT.name);
await post(s.token, 'kind=my-school', {
  ...SCHOOL, grade: STUDENT.grade, cls: STUDENT.cls, no: STUDENT.no,
});
line(`${STUDENT.name} ${STUDENT.grade}학년 ${STUDENT.cls}반 ${STUDENT.no}번 ${s.made ? '새로 만듦' : '이미 있어서 로그인'}`);

// ── 학생 개인 설정 ──────────────────────────────────────────────
step('학생 개인 설정');
{
  // 오늘 급식에 실제로 걸리는 번호를 골라요. 안 걸리면 보여줄 게 없어요.
  const today = day(0).replace(/-/g, '');
  const meal = (await call(null, `kind=meal&${AT}&from=${today}`)).body?.meals?.[0];
  const nums = [...new Set((meal?.items ?? []).flatMap((i) => i.allergy ?? []))].slice(0, 2);
  const allergies = nums.length ? nums : [1, 5];
  await post(s.token, 'kind=my-settings', { allergies });
  line(`알레르기 ${allergies.join(', ')}번 (오늘 급식에 실제로 걸리는 번호예요)`);

  await post(s.token, 'kind=my-settings', {
    myEvents: [
      { id: 'demo-1', date: day(1), title: '수학 학원 레벨테스트' },
      { id: 'demo-2', date: day(4), title: '동아리 발표 준비' },
      { id: 'demo-3', date: day(9), title: '치과' },
      // 아래 날은 일부러 몰아뒀어요 (아래 '몰린 날' 참고)
      { id: 'demo-4', date: BUSY, title: '학원 모의고사' },
    ],
  });
  line('내 일정 4개');

  // 선택과목이 갈린 칸을 하나 바꿔놔요. 이게 이 앱의 핵심이라 시연에 꼭 필요해요.
  const week = (await call(null,
    `kind=timetable&${AT}&grade=${STUDENT.grade}&class=${STUDENT.cls}&from=${day(0).replace(/-/g, '')}&to=${day(4).replace(/-/g, '')}`,
  )).body?.lessons ?? [];
  const names = ['월', '화', '수', '목', '금', '토', '일'];
  const pick = week.find((l) => l.subject === '법과 사회') ?? week.find((l) => l.period >= 5) ?? week[0];
  if (pick) {
    const key = `${names[(new Date(pick.date).getDay() + 6) % 7]}-${pick.period}`;
    await post(s.token, 'kind=my-settings', { swaps: { [key]: '심리학' } });
    line(`시간표 ${key} 칸을 '${pick.subject}' → '심리학' 로 (선택과목 시연용)`);
  }

  await post(s.token, 'kind=my-settings', { accent: '#2563eb' });
  line('테마 색 파랑');
}

// ── 전에 만든 시연 데이터 치우기 ────────────────────────────────
/*
 * 이 스크립트는 여러 번 돌릴 수 있어야 해요. 안 그러면 돌릴 때마다
 * 수행평가와 쪽지가 두 배씩 늘어나요. 실제로 한 번 그랬어요.
 */
step('전에 만든 시연 데이터 치우기');
{
  let gone = 0;
  for (const t of TEACHERS) {
    // 한 번에 200일까지만 받아줘요. 넓게 부르면 400 이 나고 빈 목록처럼 보여요.
    const span = `from=${day(-30).replace(/-/g, '')}&to=${day(150).replace(/-/g, '')}`;
    const got = await call(t.token, `kind=assessments&${AT}&${span}`);
    if (got.status !== 200) line(`수행평가를 못 읽었어요 (${got.status}) ${JSON.stringify(got.body).slice(0, 100)}`);
    const rows = got.body?.assessments ?? [];
    for (const a of rows) {
      if (a.by?.id !== t.id) continue;
      const r = await call(t.token, `kind=assessments&id=${a.id}&${AT}`, { method: 'DELETE' });
      if (r.status === 200) gone++;
    }
    /*
     * 쪽지는 여기서 못 지워요. 보낸 학생만, 그것도 선생님이 답하기 전에만
     * 지울 수 있게 일부러 막아뒀거든요 (선생님이 쓴 답이 한쪽 뜻만으로
     * 사라지면 안 되니까요). 그래서 쪽지는 아래에서 "있으면 안 만들기" 로
     * 다뤄요.
     */
  }
  line(gone ? `${gone}개 치웠어요` : '치울 게 없었어요');
}

// ── 수행평가 ────────────────────────────────────────────────────
step('수행평가');
{
  const mine = `${STUDENT.grade}-${STUDENT.cls}`;
  const rows = [
    [TEACHERS[1], day(3), '미적분Ⅰ 수행평가 (도함수 활용)', '미적분Ⅰ', '연습장, 공학용 계산기. 3단원까지예요.'],
    [TEACHERS[0], day(8), '독서와 작문 서평 발표', '독서와 작문', '읽은 책 1권, 발표 원고. 5분 발표예요.'],
    [TEACHERS[2], day(15), '영어Ⅱ 말하기 수행평가', '영어Ⅱ', '대본 미리 제출. 짝과 2분 대화예요.'],

    /*
     * 하루에 일정이 몰린 날이에요.
     *
     * 달력 칸의 줄무늬와 홈의 "이 날 N개" 표시는 하루에 여럿 있을 때만
     * 보여요. 하나씩만 있으면 그 기능이 화면에 안 나타나요. 그래서 일부러
     * 한 날에 몰아뒀어요. 내 일정 하나까지 합쳐 그날 일곱 개예요.
     */
    [TEACHERS[1], BUSY, '미적분Ⅰ 단원평가', '미적분Ⅰ', '연습장, 공학용 계산기'],
    [TEACHERS[1], BUSY, '경제 수학 과제 제출', '경제 수학', '보고서 2쪽, 인쇄해서 제출'],
    [TEACHERS[0], BUSY, '공통국어2 발표', '공통국어2', '발표 자료, 대본'],
    [TEACHERS[0], BUSY, '독서와 작문 쪽지시험', '독서와 작문', '교과서 3단원까지'],
    [TEACHERS[2], BUSY, '영어Ⅱ 듣기평가', '영어Ⅱ', '이어폰 챙기기'],
    [TEACHERS[2], BUSY, '심화 영어Ⅰ 단어시험', '심화 영어Ⅰ', '단어장 1~30과'],
  ];
  for (const [t, date, title, subject, detail] of rows) {
    const r = await post(t.token, `kind=assessments&${AT}`, {
      date, title, subject, detail, grades: [STUDENT.grade], classes: [mine],
    });
    line(`${r.status === 201 ? '올림' : `실패(${r.status})`}  ${date}  ${title}`);
  }
}

// ── 쪽지 ────────────────────────────────────────────────────────
step('쪽지');
{
  // 이미 있는 쪽지를 먼저 봐요. 안 그러면 돌릴 때마다 똑같은 질문이 쌓여요.
  const already = (await call(s.token, 'kind=threads')).body?.threads ?? [];

  // 지울 수 있는 중복은 지워요 (답이 안 달린 것만 지울 수 있어요)
  {
    // 과목 + 완료 여부가 같은 게 둘 이상이면 중복이에요.
    const seen = new Set();
    for (const one of already) {
      const key = `${one.subject}:${one.pending}`;
      if (!seen.has(key)) { seen.add(key); continue; }
      const r = await call(s.token, `kind=thread&id=${one.id}`, { method: 'DELETE' });
      if (r.status === 200) line(`중복 쪽지 하나 지움 [${one.subject}]`);
    }
  }
  const mine = (await call(s.token, 'kind=threads')).body?.threads ?? [];
  /*
   * 과목이 아니라 질문 글로 가려요. 수학에 두 개를 두거든요. 하나는 영상에서
   * 직접 답해 보일 것이고, 하나는 선생님 쪽지함 '답변 완료' 칸에 보여줄
   * 것이에요. 과목으로만 가리면 둘째가 안 만들어져요.
   */
  /*
   * 이미 있는지 가릴 때 과목만 보면 안 돼요. 수학에 둘을 두거든요. 하나는
   * 영상에서 직접 답해 보일 것(답변대기), 하나는 선생님 쪽지함 '답변 완료'
   * 칸에 보여줄 것이에요. 과목으로만 가리면 한쪽이 안 만들어지거나 둘 다
   * 또 만들어져요. 실제로 한 번 수학이 셋이 됐어요.
   *
   * 목록에는 글 내용이 안 실려와요. 그래서 과목 + 완료 여부로 가려요.
   * 그 둘이면 넷을 구분하기에 충분해요.
   */
  const ask = async (group, teacher, text, wantDone = false) => {
    const same = mine.find((t) => t.subject === group && t.pending === !wantDone);
    if (same) {
      line(`[${group}] ${wantDone ? '답변완료' : '답변대기'} 짜리가 이미 있어서 그대로 써요`);
      return null;   // 이미 있으면 답·완료 처리도 건드리지 않아요
    }
    const r = await post(s.token, 'kind=threads', { subject: group, text, teacher: teacher.id });
    if (r.status !== 201) {
      line(`질문 실패 (${r.status}) ${JSON.stringify(r.body).slice(0, 150)}`);
      return null;
    }
    return r.body?.thread?.id ?? null;
  };
  const say = (t, id, text) => post(t.token, `kind=thread&id=${id}`, { text });

  // 1) 답변완료까지 끝난 것 — 학생 화면에 '답변완료'가 보여요
  const a = await ask('국어', TEACHERS[0], '선생님, 서평 발표 때 책은 소설이어도 괜찮나요?', true);
  if (a) {
    await say(TEACHERS[0], a, '네, 소설도 괜찮아요. 다만 줄거리 요약만 하지 말고 본인 생각이 꼭 들어가야 해요.');
    await patch(TEACHERS[0].token, `kind=thread&id=${a}`, { done: true });
    line('① 국어 — 답변완료까지 끝난 쪽지');
  }

  // 2) 답을 달았지만 아직 완료가 아닌 것 — "답했다고 자동 완료가 아니다" 를 보여줘요
  const b = await ask('영어', TEACHERS[2], '말하기 수행평가 대본 언제까지 내면 되나요?');
  if (b) {
    await say(TEACHERS[2], b, '잠깐만요, 일정 확인하고 알려줄게요.');
    line('② 영어 — 답은 왔지만 아직 답변대기');
  }

  // 3) 아직 아무 답도 없는 것 — 영상에서 직접 답하고 완료를 눌러 보여줄 거예요
  const c = await ask('수학', TEACHERS[1], '선생님, 수행평가 범위가 3단원 전체인가요 아니면 도함수 활용까지인가요?');
  if (c) line('③ 수학 — 아직 답변 없음 (영상에서 직접 답해 보세요)');

  /*
   * 4) 수학 선생님 쪽지함 '답변 완료' 칸을 채우려고 하나 더 둬요.
   *
   * 포트폴리오에 넣을 쪽지함 화면이 필요한데, '답변 대기' 칸에는 시연용이
   * 아닌 진짜 학생 쪽지가 섞여 있어요. 남의 이름을 제출물에 넣을 수 없어서
   * '답변 완료' 칸을 찍는데, 거기가 비어 있으면 보여줄 게 없어요.
   */
  const d = await ask('수학', TEACHERS[1], '미적분 3단원 연습문제 12번이 잘 안 풀려요. 힌트만 주실 수 있을까요?', true);
  if (d) {
    await say(TEACHERS[1], d, '치환을 먼저 해보세요. t = x² 으로 두면 훨씬 간단해져요. 그래도 막히면 쉬는 시간에 오세요.');
    await patch(TEACHERS[1].token, `kind=thread&id=${d}`, { done: true });
    line('④ 수학 — 답변완료 (선생님 쪽지함 캡처용)');
  }

  line('');
  line('영상 찍는 순서 추천:');
  line('  학생으로 ③ 을 보여주고 → 선생님(박지훈)으로 바꿔 답 쓰고 답변완료 누르고');
  line('  → 다시 학생으로 돌아오면 답변완료로 바뀐 게 보여요');
}

// ── 정리 ────────────────────────────────────────────────────────
console.log(`
== 시연 계정 (비밀번호는 전부 ${PW})

  학생    ${STUDENT.email}   ${STUDENT.name} ${STUDENT.grade}학년 ${STUDENT.cls}반 ${STUDENT.no}번
${TEACHERS.map((t) => `  선생님  ${t.email}   ${t.name} (${t.subjects.join('/')}, ${t.grade}-${t.cls} 담임)`).join('\n')}

  https://eoris1225.github.io/school-app/

영상을 다 찍으면 Supabase 대시보드에서 demo- 로 시작하는 계정을 지우세요.
`);
