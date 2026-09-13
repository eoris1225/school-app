/*
 * 탭에 돌아오면 낡은 내용이 갈리는지 봐요.
 *
 *   npm run build:web
 *   node scripts/browser-return.mjs
 *
 * 탭 화면은 한 번 열리면 안 닫혀요. 그래서 처음 받아온 값이 계속 남아요.
 * 학생이 '국어'를 골랐을 때 가입한 국어 선생님이 없었으면, 그 뒤에 선생님이
 * 가입해도 "아직 가입하지 않았어요"가 계속 떠 있었어요. 같은 칩을 다시
 * 눌러도 소용없어요. 고른 값이 그대로라 화면이 다시 안 그려지거든요.
 *
 * 화면은 멀쩡해 보이고 내용만 낡은 거라 눈으로는 못 잡아요. 그래서 여기서
 * 재요. 서버 답을 도중에 바꿔놓고, 탭을 나갔다 들어와서 갈리는지 봐요.
 */
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';

import { join, extname } from 'node:path';


const PORT = 8799;
const BASE = `http://127.0.0.1:${PORT}`;
const DIST = new URL('../dist/', import.meta.url).pathname;

/*
 * playwright 를 어디에 깔았든 찾아요.
 *
 * 저장소 의존성에는 안 넣었어요. 브라우저까지 따라와서 무겁고, 앱을 받는
 * 사람은 쓸 일이 없거든요. 없으면 없다고 알려주고 끝내요.
 */
async function loadChromium() {
  const places = ['playwright', '@playwright/test', '/opt/node22/lib/node_modules/playwright/index.js'];
  for (const where of places) {
    try {
      const mod = await import(where);
      // CommonJS 로 깔린 판은 chromium 이 default 안에 들어 있어요.
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

const fails = [];
const ok = (c, m) => {
  console.log(`${c ? '  통과' : '  실패'}  ${m}`);
  if (!c) fails.push(m);
};

const TYPES = {
  '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css',
  '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg',
  '.ttf': 'font/ttf', '.woff2': 'font/woff2', '.ico': 'image/x-icon',
  '.svg': 'image/svg+xml',
};

/*
 * 앱이 어느 주소 밑에 깔리는지 알아내요.
 *
 * GitHub Pages 는 /school-app 밑에 얹어요(EXPO_BASE_URL). 그 값을 모르고
 * 루트에 붙이면 자바스크립트를 못 찾아서 앱이 아예 안 떠요. 화면은 하얗고요.
 * 여기에 '/school-app' 이라고 박아두면 나중에 주소가 바뀔 때 또 여기서
 * 막혀요. 만들어진 파일이 이미 알고 있으니 거기서 읽어요.
 */
const html = await readFile(join(DIST, 'index.html'), 'utf8');
const PREFIX = html.match(/"(\/[^"]*?)\/_expo\//)?.[1] ?? '';

const server = createServer(async (req, res) => {
  // expo 는 한 장짜리(single)로 내보내요. 모르는 주소는 index.html 로 되돌려요.
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



const T = 'fake-token';
const SCHOOL = { office: 'G10', code: '7430062', name: '서일여자고등학교', officeName: '대전광역시교육청' };
const ME = {
  id: 'u1', role: 'student', name: '이채율', subjects: [], teaches: [],
  school: SCHOOL, cls: '2-3', no: 12, swaps: {}, setupSeen: true,
  teach: { classes: [], edits: {} }, allergies: [], myEvents: [], accent: null, schemePref: null,
};

/** 서버가 지금 아는 국어 선생님. 검사 도중에 바꿔요. */
let staff = [];

const browser = await chromium.launch().catch(async () => {
  const at = process.env.PLAYWRIGHT_BROWSERS_PATH;
  if (!at) throw new Error('브라우저를 못 찾았어요. npx playwright install chromium 을 해보세요');
  return await chromium.launch({ executablePath: `${at}/chromium` });
});
const page = await (await browser.newContext({ viewport: { width: 390, height: 900 } })).newPage();

await page.addInitScript(
  (s) => localStorage.setItem('sb-isxbdvgvzdqpugaxqrzs-auth-token', s),
  JSON.stringify({
    access_token: T, token_type: 'bearer', expires_in: 3600,
    expires_at: Math.floor(Date.now() / 1000) + 3600, refresh_token: 'r',
    user: { id: 'u1', email: 's@t.com', aud: 'authenticated', role: 'authenticated' },
  }),
);
await page.route('**/auth/v1/**', (r) =>
  r.fulfill({ status: 200, contentType: 'application/json',
    body: JSON.stringify({ access_token: T, user: { id: 'u1' }, expires_in: 3600, refresh_token: 'r' }) }),
);
await page.route('**/functions/v1/neis*', (r) => {
  const k = new URL(r.request().url()).searchParams.get('kind');
  let out = '{}';
  if (k === 'teachers') out = JSON.stringify({ teachers: staff });
  else if (k === 'threads') out = JSON.stringify({ threads: [] });
  else if (k === 'me' || k === 'my-school' || k === 'my-settings') out = JSON.stringify({ me: ME });
  else if (k === 'bells') out = JSON.stringify({ bells: null });
  else if (k === 'meal') out = JSON.stringify({ meals: [] });
  else if (k === 'timetable') out = JSON.stringify({ lessons: [] });
  else if (k === 'schedule') out = JSON.stringify({ events: [] });
  else if (k === 'assessments') out = JSON.stringify({ assessments: [] });
  else if (k === 'classes') out = JSON.stringify({ classes: [{ grade: 2, cls: '3' }] });
  else if (k === 'push') out = JSON.stringify({ ready: false, key: '', count: 0 });
  r.fulfill({ status: 200, contentType: 'application/json', body: out });
});

const text = () => page.evaluate(() => document.body.innerText);
const tab = async (name) => {
  await page.getByRole('tab', { name }).last().click();
  await page.waitForTimeout(2000);
};

await page.goto(`${BASE}${PREFIX}/`, { waitUntil: 'networkidle' });
await page.waitForTimeout(3000);

console.log('\n=== 아직 아무도 가입 안 했을 때 ===');
{
  await tab(/커뮤니티/);
  // 시간표를 안 받아와서 교과군으로 골라요. 학생이 실제로 하는 것과 같아요.
  await page.getByLabel('국어', { exact: true }).click();
  await page.waitForTimeout(2000);
  const t = await text();
  ok(/아직 가입하지 않았어요/.test(t), '아무도 없다고 알려줌');
}

console.log('\n=== 그 사이에 선생님이 가입하면 ===');
{
  // 다른 기기에서 선생님이 담당 과목을 저장한 셈이에요.
  staff = [{ id: 'u9', name: '허유미', teaches: ['공통국어2'], cls: '2-3' }];

  // 같은 칩을 다시 눌러봐요. 예전에는 이걸로 아무 일도 안 일어났어요.
  await page.getByLabel('국어', { exact: true }).click();
  await page.waitForTimeout(1500);

  // 탭을 나갔다 들어와요. 사람이 실제로 하는 동작이에요.
  await tab(/^홈/);
  await tab(/커뮤니티/);
  await page.waitForTimeout(2000);

  const t = await text();
  ok(/허유미 선생님/.test(t), '가입한 선생님이 보임');
  ok(!/아직 가입하지 않았어요/.test(t), '"아직 가입 안 했어요"가 사라짐');
  ok(/어느 선생님께 보낼까요/.test(t), '고르는 줄이 뜸');
}

await browser.close();
server.close();

console.log(fails.length === 0 ? '\n다 통과했어요\n' : `\n${fails.length}개 실패\n${fails.map((f) => '  - ' + f).join('\n')}\n`);
process.exit(fails.length ? 1 : 0);
