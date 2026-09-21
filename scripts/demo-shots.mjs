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

/*
 * 화면이 다 뜰 때까지 기다렸다가 찍어요.
 *
 * 전에는 1.2초만 기다리고 찍었어요. 그래서 시간표가 아직 받아오는 중인
 * 회색 뼈대만 찍힌 적이 있어요. 포트폴리오에 그게 들어가서 "최종 화면"이
 * 옛날 판보다 못해 보였어요. 시간으로 재지 말고 글자가 멈출 때까지 봐요.
 */
async function settled(page, tries = 30) {
  /*
   * 글자가 안 바뀌는 걸로만 재면 안 돼요.
   *
   * 받아오는 동안에는 회색 뼈대만 있고 글자가 아예 없어요. 그래서 "두 번
   * 연속 같으면 다 뜬 것" 으로 보면 **로딩 중인 화면을 다 뜬 걸로 착각**해요.
   * 실제로 그래서 시간표 뼈대가 포트폴리오에 들어갔어요.
   *
   * 뼈대가 사라졌는지를 같이 봐요. 뼈대는 글자가 없는 둥근 회색 칸이라,
   * 글자 없이 높이만 있는 칸이 여럿이면 아직 받아오는 중이에요.
   *
   * 달력은 이 셈에 걸려요. 일정 없는 날 칸도 글자 없는 네모라서요. 그래서
   * 달력에서는 "다 안 떴을 수도 있어요" 가 뜨는데, 기다릴 만큼 기다린 뒤에
   * 찍으니 그림은 멀쩡해요. 굳이 더 손대지 않았어요.
   */
  let last = '';
  for (let i = 0; i < tries; i++) {
    await page.waitForTimeout(400);
    const [now, bones] = await Promise.all([
      page.locator('body').innerText(),
      page.evaluate(() => {
        let n = 0;
        for (const el of document.querySelectorAll('div')) {
          if (el.children.length) continue;
          if ((el.textContent ?? '').trim()) continue;
          const r = el.getBoundingClientRect();
          if (r.height >= 10 && r.width >= 40) n++;
        }
        return n;
      }),
    ]);
    // 재보니 받아오는 중에는 20개쯤, 다 뜨면 8개쯤이었어요. 12로 가릅니다.
    if (now === last && now.trim().length > 40 && bones < 12) return true;
    last = now;
  }
  return false;
}

const shot = async (page, name) => {
  const ok = await settled(page);
  await page.screenshot({ path: join(OUT, `${name}.png`) });
  console.log(`   찍음  docs/demo/${name}.png${ok ? '' : '  (다 안 떴을 수도 있어요)'}`);
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

  // 일정이 몰린 날은 다음 달에 있어요. 줄무늬와 "이 날 N개" 표시를 보여줘요.
  try {
    await page.getByRole('button', { name: /다음 달|›|>/ }).last().click({ timeout: 5000 });
    await shot(page, 'student-calendar-busy');
  } catch {
    console.log('   건너뜀  student-calendar-busy.png');
  }
  await tab(page, '커뮤니티|쪽지함', 'student-threads');

  // 답변완료된 쪽지를 열어서 찍어요. 못 열어도 나머지는 계속 찍어요.
  // 목록에 보이는 글자가 잘릴 수 있어서 과목 딱지로 찾아요.
  try {
    await page.getByText('국어', { exact: true }).first().click({ timeout: 8000 });
    await page.waitForTimeout(1500);
    const t = await page.locator('body').innerText();
    if (!/답변\s*완료/.test(t)) throw new Error('답변완료 쪽지가 아니에요');
    await shot(page, 'student-thread-done');
    await page.goBack();
    await page.waitForTimeout(1200);
  } catch (e) {
    console.log(`   건너뜀  student-thread-done.png (${e.message.slice(0, 40)})`);
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
  /*
   * 쪽지함 한 줄은 "이름 학생  2학년 3반 7번" 모양이에요. 학년까지 같이
   * 봐야 해요. '학생' 앞 두 글자만 보면 "다른 학생이나 선생님에게는" 같은
   * 안내 문구에서 '다른' 을 사람 이름으로 읽어요. 실제로 그랬어요.
   */
  const rowName = /([가-힣]{2,4})\s*학생\s+\d+학년/g;
  const outsiders = [...inbox.matchAll(rowName)]
    .map((m) => m[1])
    .filter((n) => n !== '이수민');
  if (outsiders.length) {
    console.log(`   '답변 대기' 에 시연용이 아닌 학생이 있어요 (${[...new Set(outsiders)].join(', ')})`);
    /*
     * 그래도 쪽지함 화면은 보여줘야 해요. '답변 완료' 칸으로 가요.
     * 남의 쪽지는 아직 대기 중이라 거기엔 안 나와요. 그래도 한 번 더 보고
     * 찍어요 — 안 보이겠거니 하고 찍으면 언젠가 찍혀요.
     */
    await page.getByText(/답변\s*완료/).first().click().catch(() => {});
    await page.waitForTimeout(1800);
    const done = await page.locator('body').innerText();
    const still = [...done.matchAll(rowName)].map((m) => m[1]).filter((n) => n !== '이수민');
    if (still.length) {
      console.log(`   건너뜀  teacher-inbox.png — '답변 완료' 에도 보여요 (${[...new Set(still)].join(', ')})`);
    } else {
      await shot(page, 'teacher-inbox');
      console.log("           ('답변 완료' 칸으로 찍었어요)");
    }
  } else {
    await shot(page, 'teacher-inbox');
  }
  console.log('   ' + (await page.locator('body').innerText()).slice(0, 100).replace(/\n/g, ' / '));
  await ctx.close();
}
await browser.close();
server.close();
console.log('\n끝났어요. docs/demo/ 를 보세요.\n');
