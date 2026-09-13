/*
 * 일정이 누구에게 보이는지를 재요.
 *
 *   deno run --allow-read --sloppy-imports scripts/check-target.ts
 *
 * 여기가 틀리면 남의 반 수행평가가 내 달력에 뜨거나, 내 것이 안 떠요.
 * 둘 다 조용히 틀려서 눈으로는 알아채기 어려워요.
 */
import { showsTo, targetLabel } from '@/data/mock';

const fails: string[] = [];
const ok = (c: boolean, m: string) => {
  console.log(`${c ? '  통과' : '  실패'}  ${m}`);
  if (!c) fails.push(m);
};

console.log('\n=== 전체에게 ===');
{
  const e = { grades: [], classes: [] };
  ok(showsTo(e, 1, '1') && showsTo(e, 3, '8'), '아무나 다 봐요');
  ok(targetLabel(e) === '전체', `적힌 말: ${targetLabel(e)}`);
}

console.log('\n=== 학년만 ===');
{
  const e = { grades: [2], classes: [] };
  ok(showsTo(e, 2, '1') && showsTo(e, 2, '8'), '2학년은 다 봐요');
  ok(!showsTo(e, 1, '1'), '1학년은 안 봐요');
  ok(targetLabel(e) === '2학년', `적힌 말: ${targetLabel(e)}`);
}

console.log('\n=== 예전 방식: 학년 + 반 번호 ===');
{
  const e = { grades: [2], classes: ['1', '3'] };
  ok(showsTo(e, 2, '1') && showsTo(e, 2, '3'), '2-1과 2-3이 봐요');
  ok(!showsTo(e, 2, '2'), '2-2는 안 봐요');
  ok(!showsTo(e, 1, '1'), '1-1도 안 봐요');
  ok(targetLabel(e) === '2학년 1·3반', `적힌 말: ${targetLabel(e)}`);
}

console.log('\n=== 예전 방식의 한계 (학년이 둘이면 곱해져요) ===');
{
  // 1-5와 2-1에만 들어가는 선생님이 이렇게 적으면 1-1과 2-5까지 딸려 와요.
  const e = { grades: [1, 2], classes: ['5', '1'] };
  ok(showsTo(e, 1, '1'), '1-1까지 보여요 (그래서 새 방식이 필요해요)');
  ok(showsTo(e, 2, '5'), '2-5까지 보여요');
}

console.log('\n=== 새 방식: 반을 콕 집어서 ===');
{
  const e = { grades: [1, 2], classes: ['1-5', '2-1'] };
  ok(showsTo(e, 1, '5'), '1-5는 봐요');
  ok(showsTo(e, 2, '1'), '2-1도 봐요');
  ok(!showsTo(e, 1, '1'), '1-1은 안 봐요');
  ok(!showsTo(e, 2, '5'), '2-5도 안 봐요');
  ok(!showsTo(e, 3, '1'), '3-1도 안 봐요');
  ok(targetLabel(e) === '1-5·2-1', `적힌 말: ${targetLabel(e)}`);
}

console.log('\n=== 학년 칸이 비어 있어도 콕 집은 반은 맞아요 ===');
{
  const e = { grades: [], classes: ['2-3'] };
  ok(showsTo(e, 2, '3'), '2-3은 봐요');
  ok(!showsTo(e, 2, '1'), '2-1은 안 봐요');
}

console.log(fails.length ? `\n실패 ${fails.length}개\n` + fails.join('\n') : '\n전부 통과');
if (fails.length) Deno.exit(1);
