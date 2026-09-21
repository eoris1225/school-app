/*
 * 좁은 화면에서 안 깨지는지, 인터넷이 끊기면 뭐라고 하는지 봐요.
 *
 *   node scripts/demo-setup.mjs
 *   npm run build:web
 *   node scripts/browser-narrow.mjs
 *
 * 두 가지를 봐요.
 *
 * 1) 320px 에서 가로로 삐져나오는 화면이 있는지. 320은 요즘 파는 폰 중
 *    제일 좁은 축이에요(아이폰 SE 1세대). 삐져나오면 글자가 잘리거나
 *    좌우로 흔들려요. 교시 시각 화면에서 실제로 그랬던 적이 있어요.
 *
 * 2) 서버가 안 될 때 화면에 뭐가 뜨는지. 빈 화면이나 영어 오류가 뜨면
 *    학생은 자기가 뭘 잘못한 줄 알아요.
 */
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { join, extname } from 'node:path';
import pw from 'playwright';

const { chromium } = pw;
const PORT = 8805;
const BASE = `http://127.0.0.1:${PORT}`;
const DIST = new URL('../dist/', import.meta.url).pathname;
const PW_ = 'neischool-demo-2026';
const SB = '**://isxbdvgvzdqpugaxqrzs.supabase.co/**';

const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css',
  '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg',
  '.ttf': 'font/ttf', '.woff2': 'font/woff2', '.ico': 'image/x-icon', '.svg': 'image/svg+xml' };
const html = await readFile(join(DIST, 'index.html'), 'utf8');
const PREFIX = html.match(/"(\/[^"]*?)\/_expo\//)?.[1] ?? '';
const server = createServer(async (req, res) => {
  const asked = decodeURIComponent(new URL(req.url, BASE).pathname);
  const path = PREFIX && asked.startsWith(PREFIX) ? asked.slice(PREFIX.length) : asked;
  for (const p of [join(DIST, path), join(DIST, 'index.html')]) {
    try {
      const body = await readFile(p);
      res.writeHead(200, { 'content-type': TYPES[extname(p)] ?? 'application/octet-stream' });
      res.end(body); return;
    } catch { /* 다음 */ }
  }
  res.writeHead(404).end();
});
await new Promise((go) => server.listen(PORT, go));

const fails = [];
const ok = (c, m) => { console.log(`  ${c ? '통과' : '실패'}  ${m}`); if (!c) fails.push(m); };
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });

/** 진짜 서버에 붙는 창. node 가 대신 물어봐요. */
async function live(width) {
  const ctx = await browser.newContext({ viewport: { width, height: 720 }, locale: 'ko-KR' });
  await ctx.route(SB, async (route) => {
    const r = route.request();
    try {
      const res = await fetch(r.url(), { method: r.method(), headers: r.headers(),
        body: ['GET', 'HEAD'].includes(r.method()) ? undefined : (r.postDataBuffer() ?? undefined) });
      await route.fulfill({ status: res.status,
        headers: { 'content-type': res.headers.get('content-type') ?? 'application/json',
                   'access-control-allow-origin': '*' },
        body: Buffer.from(await res.arrayBuffer()) });
    } catch (e) { await route.fulfill({ status: 500, body: JSON.stringify({ error: String(e) }) }); }
  });
  const page = await ctx.newPage();
  await page.goto(`${BASE}${PREFIX}/`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1500);
  return { ctx, page };
}
async function signIn(page, email) {
  const pick = page.getByText('학교를 먼저 골라주세요').first();
  if (await pick.isVisible().catch(() => false)) {
    await pick.click(); await page.waitForTimeout(800);
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
  await page.waitForTimeout(5000);
  for (let i = 0; i < 6; i++) {
    const s = page.getByText('건너뛰기').first();
    if (!(await s.isVisible().catch(() => false))) break;
    await s.click(); await page.waitForTimeout(800);
  }
}
/** 가로로 삐져나온 게 있는지 재요. */
const overflow = (page) => page.evaluate(() => {
  const doc = document.documentElement;
  const over = doc.scrollWidth - doc.clientWidth;
  if (over <= 1) return { over: 0, who: '' };
  let worst = '', width = 0;
  for (const el of document.querySelectorAll('*')) {
    const r = el.getBoundingClientRect();
    if (r.right > doc.clientWidth + 1 && r.width > width) {
      width = r.width;
      worst = `${el.tagName.toLowerCase()} "${(el.textContent ?? '').trim().slice(0, 40)}"`;
    }
  }
  return { over, who: worst };
});

console.log('\n== 320px 에서 가로로 삐져나오는 데가 있나');
{
  const { ctx, page } = await live(320);
  await signIn(page, 'demo-student@example.com');
  for (const [name, tab] of [['홈', null], ['급식', '급식'], ['시간표', '시간표'],
                             ['달력', '달력'], ['커뮤니티', '커뮤니티']]) {
    if (tab) {
      await page.getByRole('tab', { name: new RegExp(tab) }).last().click();
      await page.waitForTimeout(1800);
    }
    const o = await overflow(page);
    ok(o.over === 0, `${name} — 삐져나온 폭 ${o.over}px ${o.who}`);
  }
  // 일정 일곱 개 몰린 달도 봐요
  await page.getByRole('tab', { name: /달력/ }).last().click();
  await page.waitForTimeout(1500);
  await page.getByRole('button', { name: /다음 달|›|>/ }).last().click().catch(() => {});
  await page.waitForTimeout(1500);
  const o = await overflow(page);
  ok(o.over === 0, `달력(일정 몰린 달) — 삐져나온 폭 ${o.over}px ${o.who}`);

  for (const path of ['profile', 'bell-times']) {
    await page.goto(`${BASE}${PREFIX}/${path}`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);
    const r = await overflow(page);
    ok(r.over === 0, `${path} — 삐져나온 폭 ${r.over}px ${r.who}`);
  }
  await ctx.close();
}

console.log('\n== 쓰다가 인터넷이 끊기면');
{
  /*
   * 로그인한 뒤에 끊는 게 진짜 상황이에요. 처음부터 끊긴 채로 열면
   * 시작 화면만 보고 끝나서 아무것도 확인 못 해요.
   */
  const { ctx, page } = await live(390);
  await signIn(page, 'demo-student@example.com');
  await ctx.route(SB, (route) => route.abort('failed'));   // 여기서부터 끊겨요
  for (const [name, tab] of [['급식', '급식'], ['시간표', '시간표'], ['달력', '달력'], ['커뮤니티', '커뮤니티']]) {
    await page.getByRole('tab', { name: new RegExp(tab) }).last().click();
    await page.waitForTimeout(3500);
    const t = await page.locator('body').innerText();
    const bad = t.match(/(Error|failed|Failed|undefined|NetworkError|TypeError|\[object)/);
    ok(!bad, `${name} — 영어 오류가 안 보임 ${bad ? `(${bad[0]})` : ''}`);
    ok(t.trim().length > 20, `${name} — 빈 화면이 아님 (${t.trim().length}자)`);
  }
  console.log(`      끊긴 뒤 화면: ${(await page.locator('body').innerText()).replace(/\n/g, ' / ').slice(0, 150)}`);
  await ctx.close();
}

console.log('\n== 처음부터 서버가 안 될 때');
{
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, locale: 'ko-KR' });
  await ctx.route(SB, (route) => route.abort('failed'));   // 인터넷이 끊긴 셈
  const page = await ctx.newPage();
  await page.goto(`${BASE}${PREFIX}/`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(6000);
  const text = await page.locator('body').innerText();
  ok(text.trim().length > 0, `빈 화면이 아님 (${text.trim().length}자)`);
  // 화면에 남은 영어 오류 문구가 있으면 안 돼요
  const english = text.match(/[A-Za-z]{6,}[^가-힣]{0,20}(Error|failed|Failed|undefined|NetworkError|TypeError)/);
  ok(!english, `영어 오류가 안 보임 ${english ? `(${english[0]})` : ''}`);
  console.log(`      화면: ${text.replace(/\n/g, ' / ').slice(0, 160)}`);
  await ctx.close();
}

await browser.close();
server.close();
console.log(fails.length ? `\n실패 ${fails.length}건\n` : '\n다 통과했어요\n');
process.exit(fails.length ? 1 : 0);
