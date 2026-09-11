# 학교생활 도우미

한빛고등학교 학생과 선생님을 위한 학교 정보 앱이에요.
급식, 시간표, 학사일정 달력, 선생님께 질문하는 커뮤니티 네 가지를 담았어요.

- **학생**: 급식 · 시간표 · 달력은 읽기만 하고, 커뮤니티에서만 글을 써요.
- **선생님(관리자)**: 달력에 일정을 추가하고, 쪽지함에서 학생 질문에 답해요.

지금은 **화면(UI)까지** 만들어진 상태예요. 데이터는 `src/data/mock.ts`의 임시 데이터를 쓰고,
NEIS API와 Supabase 연동은 다음 단계예요.

## 팀에서 화면 확인하기 (로그인도 설치도 필요 없어요)

`main`에 푸시하면 GitHub Actions가 웹으로 빌드해서 아래 주소에 올려요.
팀원은 폰이든 노트북이든 이 주소만 열면 돼요.

```
https://eoris1225.github.io/school-app/
```

### 처음 한 번만 해야 하는 설정

1. **Settings › General › Danger Zone › Change visibility** 에서 저장소를 **Public**으로 바꿔요.
   (비공개 저장소는 GitHub Pages가 유료 플랜에서만 돼요)
2. **Settings › Pages › Build and deployment › Source** 를 **GitHub Actions** 로 바꿔요.
3. 이 워크플로가 들어 있는 브랜치를 `main`에 합쳐요. 몇 분 뒤 위 주소가 열려요.

그다음부터는 `main`에 푸시할 때마다 자동으로 새 화면이 올라가요.
다른 브랜치를 보여주고 싶으면 **Actions 탭 › 웹 미리보기 배포 › Run workflow**에서
브랜치를 골라 실행하면 돼요. (이 버튼은 워크플로가 `main`에 있어야 보여요)

### 웹으로 볼 때 알아둘 점

화면 구성, 색, 흐름은 실제 앱과 같아요. 다만 아이폰 전용 아이콘(SF Symbols)이
안드로이드용 아이콘으로 대체되고, 햅틱이나 네이티브 키보드 동작은 확인할 수 없어요.
그런 부분은 아래 Expo Go로 봐주세요.

## 내 폰에서 직접 돌려보기 (개발용)

```bash
npm install
npx expo start --tunnel
```

QR을 카메라(iOS)나 Expo Go 앱(Android)으로 찍으면 열려요.

## 폴더 구조

```
src/app/            화면 (expo-router 파일 기반 라우팅)
  (tabs)/           홈 · 급식 · 시간표 · 달력 · 커뮤니티
  start.tsx         시작 화면 (나중에 로그인으로 바뀜)
  thread.tsx        쪽지 대화
  profile.tsx       내 정보 · 테마 색 · 화면 밝기
  add-event.tsx     일정 추가 (선생님 전용)
src/components/     공통 UI 조각 (버튼, 카드, 입력칸, 탭 막대)
src/constants/      테마 색 (accent 하나로 밝은/어두운 팔레트를 자동으로 만들어요)
src/lib/            앱 상태, 시간 계산
src/data/mock.ts    임시 데이터 (NEIS · Supabase로 교체 예정)
```

## 앞으로 할 일

- [ ] NEIS API로 급식 · 시간표 · 학사일정 받아오기
- [ ] Supabase로 쪽지와 일정 저장하기
- [ ] 진짜 로그인 (학생/교사 구분, 교사 초대코드)
- [ ] EAS Build로 APK 만들기
- [ ] 공개 커뮤니티

## 키 관리

API 키는 코드에 절대 쓰지 말고 저장소 시크릿에 넣어요
(GitHub › Settings › Secrets, 또는 Codespaces 시크릿).

앱 코드에서 읽을 수 있는 값은 `EXPO_PUBLIC_` 접두사가 붙은 것뿐이에요.
접두사가 없는 값(`process.env.NEIS_API_KEY` 같은)은 앱 안에서는 `undefined`가 돼요.
그렇다고 `EXPO_PUBLIC_NEIS_API_KEY`로 바꾸면 안 돼요.
**번들에 들어간 값은 앱을 받은 사람 누구나 꺼내 볼 수 있어요.**
NEIS 키처럼 숨겨야 하는 건 앱에서 바로 부르지 말고
Supabase Edge Function 같은 서버를 한 번 거쳐서 부르는 게 안전해요.
