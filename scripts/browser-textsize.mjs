/*
 * 글자 크기를 키웠을 때 화면이 안 깨지는지 봐요.
 *
 *   npm run build:web
 *   node scripts/browser-textsize.mjs
 *
 * 글씨를 키우면 제일 흔한 사고가 "화면 밖으로 나가는 것" 이에요. 한 줄에
 * 나란히 놓은 것들이 안 줄어들고 옆으로 삐져나가요. 눈으로 보면 괜찮아
 * 보이는데 실제로는 잘려 있어요. 그래서 좌표로 재요.
 *
 * 계정에 안 올라가는 것도 같이 봐요. 폰과 태블릿에서 편한 크기가 달라서
 * 일부러 기기에만 담기로 한 값이거든요.
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
const MON = '2026-09-14';
const lessons = ['공통국어2', '미적분Ⅰ', '영어Ⅰ', '통합사회2', '체육', '음악', '한국사2'].map((subject, i) => ({
  date: MON, grade: 2, cls: '3', period: i + 1, subject,
}));
const bells = {
  periods: Array.from({ length: 7 }, (_, i) => ({
    period: i + 1,
    start: `${String(8 + i).padStart(2, '0')}:10`,
    end: `${String(9 + i).padStart(2, '0')}:00`,
  })),
  lunchAfter: 4,
};

const sent = [];

const browser = await chromium.launch().catch(async () => {
  const at = process.env.PLAYWRIGHT_BROWSERS_PATH;
  if (!at) throw new Error('브라우저를 못 찾았어요. npx playwright install chromium 을 해보세요');
  return await chromium.launch({ executablePath: `${at}/chromium` });
});
// 제일 좁은 폰 기준이에요. 여기서 안 나가면 다른 데서도 안 나가요.
const ctx = await browser.newContext({ viewport: { width: 320, height: 800 } });
const page = await ctx.newPage();

await page.clock.setFixedTime(new Date('2026-09-14T10:20:00'));
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
  if (k === 'my-settings') {
    sent.push(JSON.parse(r.request().postData() ?? '{}'));
    out = JSON.stringify({ me: ME });
  } else if (k === 'timetable') out = JSON.stringify({ lessons });
  else if (k === 'bells') out = JSON.stringify({ bells });
  else if (k === 'me' || k === 'my-school') out = JSON.stringify({ me: ME });
  else if (k === 'meal') out = JSON.stringify({ meals: [] });
  else if (k === 'schedule') out = JSON.stringify({ events: [] });
  else if (k === 'assessments') out = JSON.stringify({ assessments: [] });
  else if (k === 'threads') out = JSON.stringify({ threads: [] });
  else if (k === 'classes') out = JSON.stringify({ classes: [{ grade: 2, cls: '3' }] });
  else if (k === 'push') out = JSON.stringify({ ready: false, key: '', count: 0 });
  r.fulfill({ status: 200, contentType: 'application/json', body: out });
});

const tab = async (name) => {
  await page.getByRole('tab', { name }).last().click();
  await page.waitForTimeout(2000);
};
/** 글씨 하나를 골라 실제로 몇 픽셀인지 재요. */
const sizeOf = (text) =>
  page.getByText(text).first().evaluate((el) => parseFloat(getComputedStyle(el).fontSize));
/** 화면 밖으로 삐져나간 게 있는지. 가로로는 절대 안 밀려야 해요. */
const overflow = () =>
  page.evaluate(() => {
    const root = document.documentElement;
    return Math.round(root.scrollWidth - root.clientWidth);
  });

await page.goto(`${BASE}${PREFIX}/`, { waitUntil: 'networkidle' });
await page.waitForTimeout(3000);

console.log('\n=== 기본 크기 ===');
const before = await sizeOf('지금은');
{
  ok(before > 0, `글씨 크기를 잴 수 있음 (${before}px)`);
  ok((await overflow()) <= 0, `가로로 안 밀림 (${await overflow()}px)`);
}

console.log('\n=== 아주 크게로 바꾸면 ===');
{
  await page.getByLabel('내 정보와 테마 열기').first().click({ force: true });
  await page.waitForTimeout(2000);
  await page.getByText('아주 크게').first().click();
  await page.waitForTimeout(1500);

  await page.goBack();
  await page.waitForTimeout(2000);
  const after = await sizeOf('지금은');
  ok(after > before, `글씨가 실제로 커짐 (${before} -> ${after}px)`);
  ok(Math.abs(after / before - 1.3) < 0.05, `배율이 1.3배쯤 (${(after / before).toFixed(2)}배)`);

  for (const [name, where] of [['홈', /^홈/], ['시간표', /^시간표/], ['달력', /^달력/], ['급식', /^급식/]]) {
    await tab(where);
    const over = await overflow();
    ok(over <= 0, `${name} 화면이 가로로 안 밀림 (${over}px)`);
  }
}

console.log('\n=== 계정에는 안 올라가는지 ===');
{
  // 폰과 태블릿에서 편한 크기가 달라요. 일부러 기기에만 담기로 한 값이에요.
  const leaked = sent.find((b) => 'textScale' in b);
  ok(!leaked, `서버로 안 보냄 ${leaked ? `(${JSON.stringify(leaked)})` : ''}`);
  const kept = await page.evaluate(() => localStorage.getItem('my-text-scale'));
  ok(kept === '1.3', `기기에는 담김 (${kept})`);
}

console.log('\n=== 앱을 다시 열어도 그대로인지 ===');
{
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForTimeout(3500);
  // 새로고침하면 마지막에 보던 탭이 아니라 홈으로 와요. 그래도 눌러서 확실히.
  await tab(/^홈/);
  const again = await sizeOf('지금은');
  ok(Math.abs(again / before - 1.3) < 0.05, `크기가 그대로 (${(again / before).toFixed(2)}배)`);
}

await browser.close();
server.close();

console.log(fails.length === 0 ? '\n다 통과했어요\n' : `\n${fails.length}개 실패\n${fails.map((f) => '  - ' + f).join('\n')}\n`);
process.exit(fails.length ? 1 : 0);
