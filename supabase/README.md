# 서버 (Supabase Edge Function)

앱과 NEIS 사이에 서는 함수예요. **NEIS 인증키를 앱에 넣지 않으려고** 있어요.

```
앱 (키 없음)  ──▶  이 함수 (키 있음)  ──▶  NEIS 열린 API
```

앱에 키를 넣으면 안 되는 이유는, Expo가 `EXPO_PUBLIC_` 값을 번들에 그대로
박아넣기 때문이에요. 웹으로 내보내면 브라우저에서 바로 꺼내 볼 수 있어요.

## 파일

    supabase/
      config.toml                  어떤 함수를 배포할지
      functions/
        deno.json / deno.lock      Deno 설정과 테스트용 의존성
        .env.example               로컬 환경변수 견본 (.env는 커밋 안 됨)
        _shared/neis.ts            NEIS 호출 + 응답 변환 (핵심)
        _shared/neis_test.ts       변환 함수 테스트
        neis/index.ts              HTTP 입구, 입력값 검사, 오류 처리

## 부르는 법

| 요청 | 받는 것 |
|---|---|
| `?kind=meal&from=2026-09-07&to=2026-09-11` | 급식 (중식·석식) |
| `?kind=timetable&grade=2&class=3&from=…&to=…` | 시간표 |
| `?kind=schedule&from=2026-09-01&to=2026-09-30` | 학사일정 |
| `?kind=classes&year=2026` | 학년·반 목록 |
| `?kind=school&name=서일여자고등학교` | 학교 검색 (코드 찾을 때) |

`to`를 빼면 `from` 하루만 받아요. `year`와 `term`을 빼면 오늘 날짜로 정해요.

응답은 이런 모양이에요. NEIS의 `<br/>` 덩어리나 `20260911` 같은 건 전부 걷어냈어요.

```json
{ "meals": [ {
    "date": "2026-09-11",
    "type": "lunch",
    "items": [ { "name": "카레라이스", "allergy": [2,5,6,10,12,13,16,18] } ],
    "kcal": 876, "people": 501,
    "origin": [ { "item": "쌀", "from": "국내산" } ],
    "nutrition": [ { "item": "단백질(g)", "from": "21.9" } ]
} ] }
```

급식이 없는 날은 오류가 아니라 `{"meals": []}` 예요. 빈 화면으로 보여주면 돼요.

## 오류

| 상태 | 뜻 |
|---|---|
| 400 | 우리가 잘못 불렀어요 (날짜 모양, 빠진 값, 200일 초과 등) |
| 502 | 인증키 문제예요 (`ERROR-290` 등). 시크릿을 확인하세요 |
| 405 | GET 말고 다른 방법으로 불렀어요 |

## 배포

Supabase 프로젝트가 아직 없으면 supabase.com 에서 하나 만들고 시작해요.

```bash
npm i -g supabase           # CLI 설치
supabase login              # 브라우저가 열려요
supabase link --project-ref <프로젝트 ref>

# 키 넣기. 이 값은 Supabase 서버에만 저장되고 저장소에는 안 남아요.
supabase secrets set NEIS_API_KEY=받은키

supabase functions deploy neis
```

배포되면 주소가 이렇게 나와요.

    https://<프로젝트 ref>.supabase.co/functions/v1/neis?kind=meal&from=2026-09-11

## 고칠 때

변환 규칙을 건드렸으면 테스트부터 돌려요.

```bash
cd supabase/functions
deno test --allow-net _shared/neis_test.ts
```

함수를 직접 띄워서 눌러볼 수도 있어요. 키 없이 띄우면 응답이 5행에서 잘리지만
모양을 확인하기에는 충분해요.

```bash
cd supabase/functions
deno run --allow-net --allow-env neis/index.ts
curl 'http://localhost:8000/?kind=meal&from=2026-09-11'
```

## 알아두면 좋은 것

- **`accept: application/json` 헤더를 붙이면 NEIS가 500을 뱉어요.** 헤더 없이 불러야 해요.
- **인증키가 없으면 응답이 5행에서 잘려요.** `pSize`를 올려도, `pIndex`로 넘겨도 안 돼요.
- NEIS에 **조식은 없어요.** 중식·석식만 올라와요.
- 시간표에 **교시 시각이 없어요.** 몇 시에 시작하는지는 앱이 들고 있어야 해요.
- **수행평가·성적·공지는 NEIS에 아예 없어요.** 우리가 직접 저장해야 해요.

자세한 조사 내용은 저장소 루트의 `NEIS.md` 에 있어요.
