/*
 * README 에 넣을 화면을 실제로 찍어요.
 *
 *   npm run build:web
 *   node scripts/shots.mjs
 *
 * 그림을 그리지 않고 진짜 앱을 띄워서 찍어요. 손으로 만든 그림은 화면이
 * 바뀌어도 그대로라, 어느 순간 README 만 예전 앱을 보여주게 돼요.
 * 다시 찍으면 되니까 그럴 일이 없어요.
 *
 * 담긴 내용은 전부 지어낸 거예요. 진짜 학생 이름이나 쪽지가 들어가면 안 되죠.
 * 서버는 이 스크립트가 띄우고 답도 여기서 만들어요.
 */
import { createServer } from 'node:http';
import { readFile, mkdir } from 'node:fs/promises';
import { join, extname } from 'node:path';

const PORT = 8801;
const BASE = `http://127.0.0.1:${PORT}`;
const DIST = new URL('../dist/', import.meta.url).pathname;
const OUT = new URL('../docs/shots/', import.meta.url).pathname;

async function loadChromium() {
  for (const where of ['playwright', '@playwright/test', '/opt/node22/lib/node_modules/playwright/index.js']) {
    try {
      const mod = await import(where);
      const got = mod.chromium ?? mod.default?.chromium;
      if (got) return got;
    } catch {
      /* 다음 데를 봐요 */
    }
  }
  console.log('playwright 가 없어요.  npm i -D playwright  하고 다시 돌려주세요.');
  process.exit(2);
}
const chromium = await loadChromium();

const TYPES = {
  '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css',
  '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg',
  '.ttf': 'font/ttf', '.woff2': 'font/woff2', '.ico': 'image/x-icon',
  '.svg': 'image/svg+xml',
};

const html = await readFile(join(DIST, 'index.html'), 'utf8');
// 앱이 어느 주소 밑에 깔리는지는 만들어진 파일이 알고 있어요.
const PREFIX = html.match(/"(\/[^"]*?)\/_expo\//)?.[1] ?? '';

const server = createServer(async (req, res) => {
  const asked = decodeURIComponent(new URL(req.url, BASE).pathname);
  const path = PREFIX && asked.startsWith(PREFIX) ? asked.slice(PREFIX.length) : asked;
  for (const p of [join(DIST, path), join(DIST, 'index.html')]) {
    try {
      const body = await readFile(p);
      res.writeHead(200, { 'content-type': TYPES[extname(p)] ?? 'application/octet-stream' });
      res.end(body);
      return;
    } catch {
      /* 다음 걸로 */
    }
  }
  res.writeHead(404).end();
});
await new Promise((r) => server.listen(PORT, '127.0.0.1', r));
await mkdir(OUT, { recursive: true });

/* ---------------------------------------------------------------- 지어낸 내용 */

const T = 'fake-token';
const SCHOOL = { office: 'G10', code: '7430062', name: '서일여자고등학교', officeName: '대전광역시교육청' };
const MON = '2026-09-14';
const DAYS = [MON, '2026-09-15', '2026-09-16', '2026-09-17', '2026-09-18'];

const STUDENT = {
  id: 'u1', role: 'student', name: '이채율', subjects: [], teaches: [],
  school: SCHOOL, cls: '2-3', no: 12, swaps: {}, setupSeen: true,
  teach: { classes: [], edits: {} }, allergies: [5, 6],
  myEvents: [{ id: 'my-1', date: '2026-09-16', title: '학원 레벨테스트' }],
  accent: null, schemePref: null,
};
const TEACHER = { ...STUDENT, id: 'u2', role: 'teacher', name: '허유미', subjects: ['수학'], teaches: ['미적분Ⅰ'], no: null, allergies: [] };

const WEEK = [
  ['공통국어2', '미적분Ⅰ', '영어Ⅰ', '통합사회2', '체육', '음악', '한국사2'],
  ['미적분Ⅰ', '통합과학2', '공통국어2', '영어Ⅰ', '정보', '체육', '창의적 체험활동'],
  ['영어Ⅰ', '공통국어2', '한국사2', '미적분Ⅰ', '통합사회2', null, '미술 창작'],
  ['통합과학2', '영어Ⅰ', '미적분Ⅰ', '음악', '공통국어2', '진로활동', '정보'],
  ['한국사2', '체육', '통합사회2', '공통국어2', '미적분Ⅰ', '통합과학2', '동아리활동'],
];
const lessons = [];
WEEK.forEach((day, d) =>
  day.forEach((subject, i) => {
    if (subject) lessons.push({ date: DAYS[d], grade: 2, cls: '3', period: i + 1, subject });
  }),
);

const bells = {
  periods: [
    { period: 1, start: '08:10', end: '09:00' }, { period: 2, start: '09:10', end: '10:00' },
    { period: 3, start: '10:10', end: '11:00' }, { period: 4, start: '11:10', end: '12:00' },
    { period: 5, start: '13:00', end: '13:50' }, { period: 6, start: '14:00', end: '14:50' },
    { period: 7, start: '15:00', end: '15:50' },
  ],
  lunchAfter: 4,
};

const dish = (name, allergy) => ({ name, allergy });
const meals = [
  {
    date: MON, type: 'lunch', kcal: 876, people: 501,
    items: [
      dish('찹쌀밥', []), dish('돼지고기김치찌개', [5, 6, 10]), dish('치즈감자고로케', [1, 2, 5, 6]),
      dish('배추겉절이', []), dish('오이무침', []), dish('요구르트', [2]),
    ],
    origin: [{ item: '쌀', from: '국내산' }, { item: '돼지고기', from: '국내산' }],
    nutrition: [{ item: '탄수화물(g)', from: '146.5' }, { item: '단백질(g)', from: '21.9' }],
  },
];

const events = [
  { date: '2026-09-15', title: '2학년 진로체험의 날', detail: '', grades: [2], holiday: false },
  { date: '2026-09-18', title: '전국연합학력평가', detail: '', grades: [2, 3], holiday: false },
];
const assessments = [
  { id: 'a1', date: '2026-09-17', title: '미적분 수행평가', subject: '미적분Ⅰ',
    detail: '교과서 132~150쪽 범위예요. 자와 각도기 꼭 챙겨오세요.',
    grades: [2], classes: ['2-3'], by: { id: 'u2', name: '허유미' } },
  { id: 'a2', date: '2026-09-17', title: '영어 말하기', subject: '영어Ⅰ', detail: null,
    grades: [2], classes: [], by: { id: 'u9', name: '김영수' } },
  { id: 'a3', date: '2026-09-24', title: '통합과학 실험 보고서', subject: '통합과학2',
    detail: '보고서 양식은 교실에 붙여뒀어요.', grades: [2], classes: ['2-3'], by: { id: 'u7', name: '최민' } },
];

const msg = (from, author, text, at) => ({ id: `m${at}`, from, author, text, at, image: null });
const talk = [
  msg('student', '이채율', '선생님, 수행평가 범위가 어디까지예요?', '2026-09-14T08:12:00Z'),
  msg('teacher', '허유미', '교과서 132쪽부터 150쪽까지예요. 자와 각도기 꼭 챙겨오세요.', '2026-09-14T09:10:00Z'),
  msg('student', '이채율', '감사합니다! 계산기도 쓸 수 있나요?', '2026-09-14T09:14:00Z'),
  msg('teacher', '허유미', '계산기는 안 돼요. 손으로 푸는 것까지 보려고 해요.', '2026-09-14T09:20:00Z'),
];
const THREAD = {
  id: 't1', subject: '수학', student: { name: '이채율', cls: '2-3', no: 12 },
  teacher: { id: 'u2', name: '허유미' }, last: talk[talk.length - 1],
  count: talk.length, unread: false, pending: false, answeredBy: '허유미', at: talk[talk.length - 1].at,
};
const WAITING = {
  ...THREAD, id: 't2', subject: '국어',
  student: { name: '박서윤', cls: '2-1', no: 5 }, teacher: null,
  last: msg('student', '박서윤', '독서와 작문 발표 순서가 언제 나와요?', '2026-09-14T10:02:00Z'),
  count: 1, unread: true, pending: true, answeredBy: null, at: '2026-09-14T10:02:00Z',
};

/* ---------------------------------------------------------------- 찍기 */

function serve(me) {
  return (r) => {
    const q = new URL(r.request().url()).searchParams;
    const k = q.get('kind');
    let out = '{}';
    if (k === 'meal') out = JSON.stringify({ meals });
    else if (k === 'timetable') out = JSON.stringify({ lessons });
    else if (k === 'schedule') out = JSON.stringify({ events });
    else if (k === 'assessments') out = JSON.stringify({ assessments });
    else if (k === 'bells') out = JSON.stringify({ bells });
    else if (k === 'classes') out = JSON.stringify({ classes: [{ grade: 2, cls: '3' }] });
    else if (k === 'threads') out = JSON.stringify({ threads: me.role === 'teacher' ? [WAITING, THREAD] : [THREAD] });
    else if (k === 'thread') out = JSON.stringify({ thread: THREAD, messages: talk });
    else if (k === 'teachers') out = JSON.stringify({ teachers: [] });
    else if (k === 'subjects') out = JSON.stringify({ subjects: ['미적분Ⅰ'] });
    else if (k === 'push') out = JSON.stringify({ ready: false, key: '', count: 0 });
    else if (k === 'me' || k === 'my-school' || k === 'my-settings') out = JSON.stringify({ me });
    r.fulfill({ status: 200, contentType: 'application/json', body: out });
  };
}

const browser = await chromium.launch().catch(async () => {
  const at = process.env.PLAYWRIGHT_BROWSERS_PATH;
  if (!at) throw new Error('브라우저를 못 찾았어요. npx playwright install chromium 을 해보세요');
  return await chromium.launch({ executablePath: `${at}/chromium` });
});

async function open(me) {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
  const page = await ctx.newPage();
  // 월요일 3교시 한창일 때예요. 홈 화면이 제일 할 말이 많은 시각이에요.
  await page.clock.setFixedTime(new Date('2026-09-14T10:20:00'));
  await page.addInitScript(
    (s) => localStorage.setItem('sb-isxbdvgvzdqpugaxqrzs-auth-token', s),
    JSON.stringify({
      access_token: T, token_type: 'bearer', expires_in: 3600,
      expires_at: Math.floor(Date.now() / 1000) + 3600, refresh_token: 'r',
      user: { id: me.id, email: 'x@example.com', aud: 'authenticated', role: 'authenticated' },
    }),
  );
  await page.route('**/auth/v1/**', (r) =>
    r.fulfill({ status: 200, contentType: 'application/json',
      body: JSON.stringify({ access_token: T, user: { id: me.id }, expires_in: 3600, refresh_token: 'r' }) }),
  );
  await page.route('**/functions/v1/neis*', serve(me));
  await page.goto(`${BASE}${PREFIX}/`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(3000);
  return page;
}

const shot = async (page, name) => {
  await page.waitForTimeout(1200);
  await page.screenshot({ path: join(OUT, `${name}.png`) });
  console.log(`  ${name}.png`);
};
const tab = async (page, name) => {
  await page.getByRole('tab', { name }).last().click();
  await page.waitForTimeout(2200);
};

console.log('\n찍는 중...');
{
  const page = await open(STUDENT);
  await shot(page, 'home');
  await tab(page, /^급식/);
  await shot(page, 'meal');
  await tab(page, /^시간표/);
  await shot(page, 'timetable');
  await tab(page, /^달력/);
  await shot(page, 'calendar');
  await tab(page, /커뮤니티/);
  await page.getByText(THREAD.last.text).first().click();
  await shot(page, 'thread');
  await page.context().close();
}
{
  const page = await open(TEACHER);
  await shot(page, 'teacher-home');
  await tab(page, /쪽지함/);
  await shot(page, 'inbox');
  await page.context().close();
}

await browser.close();
server.close();
console.log(`\ndocs/shots/ 에 넣었어요\n`);
