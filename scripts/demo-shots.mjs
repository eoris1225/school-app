/*
 * 시연용 계정으로 진짜 서버에 붙어서 화면을 찍어요.
 *
 *   node scripts/demo-setup.mjs   (먼저 데이터를 넣고)
 *   npm run build:web
 *   node scripts/demo-shots.mjs
 *
 * docs/shots/ 의 그림은 가짜 서버로 찍은 거예요. 포트폴리오에 넣을 화면은
 * 진짜 데이터가 나와야 해서 이걸 따로 뒀어요. 찍은 건 docs/demo/ 에 들어가요.
 *
 * 브라우저가 Supabase 로 보내는 요청은 node 가 대신 보내요. 그래야 이 안에서
 * 돌릴 때 인증서 문제에 안 걸려요. 답은 진짜 서버가 준 그대로 돌려줘요.
 */
import { createServer } from 'node:http';
import { readFile, mkdir } from 'node:fs/promises';
import { join, extname } from 'node:path';
import pw from 'playwright';

const { chromium } = pw;
const PORT = 8802;
const BASE = `http://127.0.0.1:${PORT}`;
const DIST = new URL('../dist/', import.meta.url).pathname;
const OUT = new URL('../docs/demo/', import.meta.url).pathname;
const PW_ = 'neischool-demo-2026';

const TYPES = {
  '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css',
  '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg',
  '.ttf': 'font/ttf', '.woff2': 'font/woff2', '.ico': 'image/x-icon',
  '.svg': 'image/svg+xml',
};

const html = await readFile(join(DIST, 'index.html'), 'utf8');
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
    } catch { /* 다음 걸로 */ }
  }
  res.writeHead(404).end();
});
await new Promise((go) => server.listen(PORT, go));
await mkdir(OUT, { recursive: true });

const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });

async function open() {
  const ctx = await browser.newContext({
    viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, locale: 'ko-KR',
  });
  // 브라우저 대신 node 가 진짜 서버에 물어봐요.
  await ctx.route('**://isxbdvgvzdqpugaxqrzs.supabase.co/**', async (route) => {
    const r = route.request();
    try {
      const res = await fetch(r.url(), {
        method: r.method(),
        headers: r.headers(),
        body: ['GET', 'HEAD'].includes(r.method()) ? undefined : (r.postDataBuffer() ?? undefined),
      });
      const buf = Buffer.from(await res.arrayBuffer());
      await route.fulfill({
        status: res.status,
        headers: { 'content-type': res.headers.get('content-type') ?? 'application/json',
                   'access-control-allow-origin': '*' },
        body: buf,
      });
    } catch (e) {
      await route.fulfill({ status: 500, body: JSON.stringify({ error: String(e) }) });
    }
  });
  const page = await ctx.newPage();
  await page.goto(`${BASE}${PREFIX}/`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1500);
  return { ctx, page };
}

const shot = async (page, name) => {
  await page.waitForTimeout(1200);
  await page.screenshot({ path: join(OUT, `${name}.png`) });
  console.log(`   찍음  docs/demo/${name}.png`);
};

async function signIn(page, email) {
  // 학교를 먼저 고르게 되어 있어요.
  const pick = page.getByText('학교를 먼저 골라주세요').first();
  if (await pick.isVisible().catch(() => false)) {
    await pick.click();
    await page.waitForTimeout(800);
    await page.getByPlaceholder(/학교/).first().fill('서일여자고등학교');
    await page.waitForTimeout(2500);
    await page.getByText('서일여자고등학교').first().click();
    await page.waitForTimeout(1200);
  }
  await page.getByText('로그인', { exact: true }).first().click();
  await page.waitForTimeout(900);
  await page.getByLabel('이메일').fill(email);
  await page.getByLabel('비밀번호').fill(PW_);
  await page.getByText('로그인', { exact: true }).last().click();
  await page.waitForTimeout(4000);
}

/** 가입 직후 뜨는 설정 마법사를 넘겨요. */
async function skipSetup(page) {
  for (let i = 0; i < 6; i++) {
    const skip = page.getByText('건너뛰기').first();
    if (!(await skip.isVisible().catch(() => false))) return;
    await skip.click();
    await page.waitForTimeout(900);
  }
}

/** 탭 하나로 가서 찍어요. */
async function tab(page, name, file) {
  await page.getByRole('tab', { name: new RegExp(name) }).last().click();
  await shot(page, file);
}

console.log('\n== 학생 화면');
{
  const { ctx, page } = await open();
  await signIn(page, 'demo-student@example.com');
  await skipSetup(page);
  await shot(page, 'student-home');
  await tab(page, '급식', 'student-meal');
  await tab(page, '시간표', 'student-timetable');
  await tab(page, '달력', 'student-calendar');
  await tab(page, '커뮤니티|쪽지함', 'student-threads');

  // 답변완료된 쪽지를 열어서 찍어요. 못 열어도 나머지는 계속 찍어요.
  try {
    await page.getByText(/책은 소설이어도/).first().click({ timeout: 8000 });
    await shot(page, 'student-thread-done');
    await page.goBack();
    await page.waitForTimeout(900);
  } catch {
    console.log('   건너뜀  student-thread-done.png');
  }
  console.log('   ' + (await page.locator('body').innerText()).slice(0, 100).replace(/\n/g, ' / '));
  await ctx.close();
}

console.log('\n== 선생님 화면');
{
  const { ctx, page } = await open();
  await signIn(page, 'demo-teacher-math@example.com');
  await skipSetup(page);
  await shot(page, 'teacher-home');
  await tab(page, '시간표', 'teacher-timetable');
  await tab(page, '달력', 'teacher-calendar');
  /*
   * 선생님 쪽지함은 그냥 찍으면 안 돼요.
   *
   * 상대를 안 고르고 보낸 쪽지는 그 과목 선생님 **모두**에게 가요. 그래서
   * 시연용 선생님 계정의 쪽지함에 진짜 학생이 보낸 쪽지가 같이 떠요.
   * 실제로 한 번 찍혔어요 (이름·반·번호까지 그대로요). 제출 영상이나
   * 포트폴리오에 남의 이름이 들어가면 안 되니까, 시연용 학생 말고 다른
   * 이름이 보이면 안 찍고 넘어가요.
   */
  await page.getByRole('tab', { name: /쪽지함|커뮤니티/ }).last().click();
  await page.waitForTimeout(1500);
  const inbox = await page.locator('body').innerText();
  const outsiders = [...inbox.matchAll(/([가-힣]{2,4})\s*학생/g)]
    .map((m) => m[1])
    .filter((n) => n !== '이수민');
  if (outsiders.length) {
    console.log(`   건너뜀  teacher-inbox.png — 시연용이 아닌 학생이 보여요 (${[...new Set(outsiders)].join(', ')})`);
    console.log('           그 쪽지를 먼저 치우고 다시 돌리세요.');
  } else {
    await shot(page, 'teacher-inbox');
  }
  console.log('   ' + (await page.locator('body').innerText()).slice(0, 100).replace(/\n/g, ' / '));
  await ctx.close();
}
await browser.close();
server.close();
console.log('\n끝났어요. docs/demo/ 를 보세요.\n');
