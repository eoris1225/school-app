/*
 * 짓궂게 굴어보는 검사예요.
 *
 *   TEACHER_CODE=선생님코드 node scripts/live-abuse.mjs
 *
 * live-check.mjs 는 "제대로 쓰면 제대로 되나" 를 봐요. 이건 반대예요.
 * 학생이 선생님 일을 할 수 있나, 남의 학교를 건드릴 수 있나, 남의 쪽지를
 * 읽을 수 있나를 봐요.
 *
 * 남의 학교 칸에는 **없는 학교 코드**를 써요 (9999999). 진짜 학교 데이터를
 * 건드리면 안 되니까요. 막혀야 하는 게 안 막히면 그것만으로 문제예요.
 *
 * 여기서 만드는 계정도 delete-me- 로 시작해요. 아무 때나 지우세요.
 */
const U = 'https://isxbdvgvzdqpugaxqrzs.supabase.co';
const KEY = 'sb_publishable_GfkqM8siiAriyu2jfYM8kw_erGjWr6n';
const MINE = { office: 'G10', code: '7430062', name: '서일여자고등학교', officeName: '대전광역시교육청' };
const OTHER = { office: 'G10', code: '9999999' };   // 없는 학교예요
const AT = `office=${MINE.office}&school=${MINE.code}`;
const AWAY = `office=${OTHER.office}&school=${OTHER.code}`;
const PW = 'delete-me-123456';

const CODE = process.env.TEACHER_CODE;
if (!CODE) { console.log('TEACHER_CODE 를 넣어주세요.'); process.exit(2); }

const fails = [];
const ok = (c, m) => { console.log(`${c ? '  막힘' : '  뚫림'}  ${m}`); if (!c) fails.push(m); };

async function account(tag) {
  const email = `delete-me-abuse-${Date.now()}-${tag}@example.com`;
  const r = await fetch(`${U}/auth/v1/signup`, {
    method: 'POST', headers: { apikey: KEY, 'content-type': 'application/json' },
    body: JSON.stringify({ email, password: PW, data: { name: `짓궂은${tag}` } }),
  });
  const j = await r.json();
  if (!j.access_token) { console.log('계정 실패', JSON.stringify(j).slice(0, 150)); process.exit(1); }
  return { email, token: j.access_token };
}
const call = async (t, q, init = {}) => {
  const r = await fetch(`${U}/functions/v1/neis?${q}`, {
    ...init,
    headers: { apikey: KEY, ...(t ? { authorization: `Bearer ${t}` } : {}),
               'content-type': 'application/json', ...(init.headers ?? {}) },
  });
  return { status: r.status, body: await r.json().catch(() => null) };
};
const post = (t, q, b) => call(t, q, { method: 'POST', body: JSON.stringify(b) });

const teacher = await account('t');
const student = await account('s');
for (const who of [teacher, student]) {
  await post(who.token, 'kind=my-school', { ...MINE, grade: 2, cls: '3', no: 5 });
}
await post(teacher.token, 'kind=promote', { code: CODE, subjects: ['수학'], teaches: ['미적분Ⅰ'] });
const meT = (await call(teacher.token, 'kind=me')).body?.me;
const meS = (await call(student.token, 'kind=me')).body?.me;
console.log(`\n선생님=${meT?.role}  학생=${meS?.role}\n`);

console.log('=== 학생이 선생님 일을 할 수 있나 ===');
{
  const r = await post(student.token, `kind=assessments&${AT}`, {
    date: '2026-11-20', title: '학생이 올림', subject: '수학',
    detail: '', grades: [2], classes: ['2-3'],
  });
  ok(r.status >= 400, `학생은 수행평가 못 올림 (${r.status})`);
  if (r.status === 201 && r.body?.assessment?.id) {
    await call(student.token, `kind=assessments&id=${r.body.assessment.id}&${AT}`, { method: 'DELETE' });
  }

  const b = await post(student.token, `kind=bells&${AT}`, {
    periods: [{ period: 1, start: '08:10', end: '09:00' }], lunchAfter: 0,
  });
  ok(b.status >= 400, `학생은 교시 시각 못 넣음 (${b.status})`);

  const p = await post(student.token, 'kind=promote', { code: '틀린코드', subjects: ['수학'], teaches: [] });
  ok(p.status >= 400, `틀린 코드로는 선생님이 못 됨 (${p.status})`);

  const s = await post(student.token, 'kind=my-settings', { role: 'teacher' });
  const after = (await call(student.token, 'kind=me')).body?.me;
  ok(after?.role !== 'teacher', `내 설정으로 선생님이 못 됨 (${s.status}, 지금 ${after?.role})`);
}

console.log('\n=== 남의 학교를 건드릴 수 있나 (없는 학교 코드로) ===');
{
  /*
   * 교시 시각은 찔러보기 전에 지금 값을 받아두고, 끝나면 무조건 되돌려요.
   *
   * 처음 쓸 때는 없는 학교 코드를 적으니 안전하다고 생각했어요. 아니었어요.
   * 그때 서버는 앱이 보낸 학교를 무시하고 **내 학교에** 썼거든요. 200을
   * 받았는데 바뀐 건 우리 학교 시각이었어요. 1교시 07:00 한 칸만 남고 다
   * 날아갔어요.
   *
   * 서버는 고쳤지만 검사가 그걸 믿으면 안 돼요. 고치기 전 서버에 대고
   * 돌릴 수도 있잖아요. 검사는 스스로 안전해야 해요.
   */
  const before = (await call(null, `kind=bells&${AT}`)).body?.bells ?? null;
  const r = await post(teacher.token, `kind=assessments&${AWAY}`, {
    date: '2026-11-20', title: '남의 학교에 올림', subject: '수학',
    detail: '', grades: [2], classes: ['2-3'],
  });
  ok(r.status >= 400, `내 학교가 아닌 곳에 수행평가 못 올림 (${r.status})`);
  if (r.status === 201 && r.body?.assessment?.id) {
    const del = await call(teacher.token, `kind=assessments&id=${r.body.assessment.id}&${AWAY}`, { method: 'DELETE' });
    console.log(`     (치웠어요: ${del.status})`);
  }

  const b = await post(teacher.token, `kind=bells&${AWAY}`, {
    periods: [{ period: 1, start: '07:00', end: '07:50' }], lunchAfter: 0,
  });
  ok(b.status >= 400, `내 학교가 아닌 곳 교시 시각 못 바꿈 (${b.status})`);

  const now = (await call(null, `kind=bells&${AT}`)).body?.bells ?? null;
  const same = JSON.stringify(before) === JSON.stringify(now);
  ok(same, '우리 학교 교시 시각이 그대로임');
  if (!same && before) {
    const back = await post(teacher.token, `kind=bells&${AT}`, before);
    console.log(`     (원래대로 되돌렸어요: ${back.status})`);
  }
}

console.log('\n=== 남의 쪽지를 볼 수 있나 ===');
{
  const asked = await post(student.token, 'kind=threads', { subject: '수학', text: '검사용 질문이에요.', teacher: null });
  const id = asked.body?.thread?.id;
  const other = await account('o');
  await post(other.token, 'kind=my-school', { ...MINE, grade: 1, cls: '1', no: 1 });
  if (id) {
    const read = await call(other.token, `kind=thread&id=${id}`);
    ok(read.status >= 400, `남의 쪽지 못 읽음 (${read.status})`);
    const say = await post(other.token, `kind=thread&id=${id}`, { text: '끼어들기' });
    ok(say.status >= 400, `남의 쪽지에 못 씀 (${say.status})`);
    const del = await call(other.token, `kind=thread&id=${id}`, { method: 'DELETE' });
    ok(del.status >= 400, `남의 쪽지 못 지움 (${del.status})`);
    await call(student.token, `kind=thread&id=${id}`, { method: 'DELETE' });
  }
}

console.log(fails.length
  ? `\n뚫린 곳 ${fails.length}군데\n` + fails.map((f) => '  - ' + f).join('\n') + '\n'
  : '\n다 막혀 있어요\n');
console.log('만든 계정은 전부 delete-me-abuse- 로 시작해요.\n');
process.exit(fails.length ? 1 : 0);
