# scripts/

## 지우면 안 되는 것

**없어요.** 그게 규칙이에요.

한동안 시험 계정 두 개를 정해두고 "이건 지우면 안 돼요" 라고 해뒀어요.
그게 어디에 적혀 있었냐면 채팅에요. 당연히 지워졌고 라이브 검사가 통째로
멈췄어요. 기억해야 굴러가는 건 언젠가 안 굴러가요.

지금은 `scripts/live-check.mjs` 가 돌 때마다 계정을 새로 만들어요.
이름이 `delete-me-` 로 시작해요.

    delete-me-1789309469143-a@example.com
    delete-me-1789309470160-b@example.com

**`delete-me-` 로 시작하는 계정은 전부 지워도 돼요.** 다음에 돌리면 새로
만들어요. Supabase 대시보드에서 보이는 대로 치우세요.

## 검사 종류

세 가지가 있어요. 잡는 게 서로 달라요.

| | 무엇을 보나 | 못 잡는 것 |
|---|---|---|
| `check-*.ts` (deno) | 계산 규칙. 시각, 과목 분류, 한글 조사 | 화면, 서버 |
| 브라우저 검사 (playwright) | 실제로 그려진 화면과 좌표 | 진짜 서버 |
| `live-check.mjs` | **진짜 서버.** 표 권한, 칸 이름, method 목록 | — |

라이브 검사가 따로 있는 이유가 있어요. 브라우저 검사는 서버를 흉내내는데,
흉내는 우리가 기대한 대로만 답해요. 그래서 이 넷을 한 번도 못 잡았어요.

- PATCH 가 맨 위 method 목록에 없어서 405
- `assessments` 표에 update 권한이 없어서 502
- `allergies` 가 "바꿀 것이 없어요" 검사 목록에 안 적혀서 400
- `push_subs` 표에 update 권한이 없어서 500 (덮어쓰기가 update 를 써요)

넷 다 흉내내는 검사는 전부 통과했어요. **표에 칸을 늘렸으면 라이브 검사를
꼭 한 번 돌려보세요.**

## 돌리는 법

```bash
# 계산 규칙 (deno)
deno run --allow-read --sloppy-imports scripts/check-bells.ts
deno run --allow-read --sloppy-imports scripts/check-time.ts
deno run --allow-read --sloppy-imports scripts/check-target.ts
deno run --allow-read --sloppy-imports scripts/check-teacher-week.ts
deno run --allow-read scripts/check-subjects.ts
deno run --allow-read --sloppy-imports scripts/check-korean.ts
deno run --allow-read scripts/check-palette.ts

# 서버 쪽 (deno) — GitHub Actions 도 이걸 돌려요
cd supabase/functions && deno test --allow-env --allow-read _shared/

# 진짜 서버
TEACHER_CODE=선생님코드 node scripts/live-check.mjs
```

`TEACHER_CODE` 는 Supabase 대시보드 > Edge Functions > Secrets 에 있어요.
**영문·숫자만 돼요.** 한글로 넣으면 HTTP 헤더에 못 실려서 조용히 실패해요.

## 나머지

| 파일 | 하는 일 |
|---|---|
| `add-pwa-tags.mjs` | `expo export` 뒤에 manifest·아이콘 태그를 끼워 넣어요 (`npm run build:web` 이 부름) |
| `make-icon.py` | 앱 아이콘 png 들을 만들어요 |
| `pick-palette.ts` | 새 테마 색이 대비 4.5를 넘는지 재봐요 |
| `reset-project.js` | Expo 가 만들어준 초기화 스크립트 |
