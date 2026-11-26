# Level Up 배포 가이드 (Supabase + GitHub + Vercel)

> 이 가이드를 끝까지 따라 하면 교수님께 제출할 **공개 URL**(`https://○○○.vercel.app`)이 만들어집니다.
> 소요 시간: 약 20~30분 / 비용: 모두 무료 플랜으로 가능합니다.

## 0. 준비물
- 이메일 주소 (Supabase, GitHub, Vercel 가입용 — GitHub 계정으로 Vercel에 로그인하면 편합니다)
- 이 폴더(`level-up`) 전체

---

## 1. Supabase 프로젝트 만들기 (데이터베이스 + 로그인)

1. https://supabase.com 에 가입 → **New project** 클릭
2. 이름 `level-up`, 데이터베이스 비밀번호 입력(메모해 두기), Region은 `Northeast Asia (Seoul)` 선택 → **Create new project** (1~2분 대기)
3. 왼쪽 메뉴 **SQL Editor → New query** 를 열고, 이 프로젝트의 `supabase/schema.sql` 파일 **내용 전체를 복사해 붙여넣고 Run** 을 누릅니다.
   - "Success" 가 나오면 테이블, 권한(RLS), 시연 데이터(3학년 1반, 학생 6명, 과거시제 평가)가 모두 만들어진 것입니다.
   - 여러 번 실행해도 시연 데이터는 중복 생성되지 않습니다.
4. 왼쪽 **Authentication → Sign In / Providers → Email** 에서
   - **Confirm email** 을 **끄기(OFF)** 로 설정 후 Save (학생이 직접 가입할 때 이메일 인증 없이 바로 로그인되게 하기 위함. 시연 계정은 이미 인증된 상태라 상관없습니다.)
5. 왼쪽 **Project Settings → API** 에서 두 값을 복사해 둡니다.
   - **Project URL** (`https://xxxx.supabase.co`)
   - **anon public** 키 (`eyJ...` 로 시작하는 긴 문자열) — ⚠️ `service_role` 키는 절대 사용/공개하지 마세요.

---

## 2. 내 컴퓨터에서 먼저 실행해 보기 (선택, 권장)

Node.js 18 이상이 설치되어 있어야 합니다. (https://nodejs.org)

```bash
cd level-up
cp .env.example .env        # Windows: copy .env.example .env
# .env 파일을 열어 1-5 에서 복사한 URL, anon 키를 붙여넣기
npm install
npm run dev                 # 표시되는 http://localhost:5173 접속
```
로그인 화면에서 시연 계정 버튼을 눌러 동작을 확인합니다. 빌드 확인: `npm run build` (오류 없이 `dist` 생성).

---

## 3. GitHub에 올리기

1. https://github.com 에서 **New repository** → 이름 `level-up`, Public 또는 Private → Create
2. 터미널에서 (`level-up` 폴더 안):
```bash
git init
git add .
git commit -m "Level Up first commit"
git branch -M main
git remote add origin https://github.com/내아이디/level-up.git
git push -u origin main
```
`.env` 파일은 `.gitignore` 에 들어 있어 올라가지 않습니다. (키가 공개되지 않도록 정상)

> 터미널이 어렵다면: GitHub 저장소 화면의 **uploading an existing file** 로 폴더 안 파일을 끌어다 놓아도 됩니다. (`node_modules`, `.env` 는 제외)

---

## 4. Vercel로 배포하기 (공개 URL 생성)

1. https://vercel.com 에 GitHub 계정으로 로그인
2. **Add New → Project** → `level-up` 저장소 **Import**
3. Framework Preset 이 **Vite** 로 자동 인식되는지 확인 (Build: `npm run build`, Output: `dist`)
4. **Environment Variables** 에 2개 추가
   | Name | Value |
   |---|---|
   | `VITE_SUPABASE_URL` | 1-5 에서 복사한 Project URL |
   | `VITE_SUPABASE_ANON_KEY` | 1-5 에서 복사한 anon public 키 |
5. **Deploy** 클릭 → 1~2분 뒤 `https://level-up-○○○.vercel.app` 형태의 URL 생성
6. 환경변수를 나중에 바꿨다면 **Deployments → Redeploy** 를 눌러야 반영됩니다.

이 URL이 교수님께 제출할 주소입니다. 새로고침/직접 주소 입력 시 404가 나지 않도록 `vercel.json` 에 이미 설정되어 있습니다.

---

## 5. 배포 후 확인 체크리스트 (다른 기기에서)

1. PC 브라우저와 **스마트폰(데이터 연결)** 에서 각각 URL 접속 → 로그인 화면과 테스트 계정 안내가 보이는지
2. 교사로 로그인 → 대시보드 수치/그래프 → 결과 분석 → 맞춤 과제 확인
3. 다른 기기에서 학생으로 로그인 → 홈/내 과제/내 결과에 **본인 데이터만** 보이는지
4. 학생이 과제를 제출 → 교사 화면 새로고침 시 "제출 완료"로 바뀌는지 (기기 간 데이터 공유 확인)

---

## 6. 테스트 계정 (모두 가상 데이터, 비밀번호 `levelup1234`)

| 구분 | 이메일 | 이름 | 시연 포인트 |
|---|---|---|---|
| 교사 | teacher@levelup.demo | 박영어 선생님 | 3학년 1반 전체 결과·분석·과제 관리 |
| 학생 | student1@levelup.demo | 김민준 | 불규칙 동사 보충 과제 제출 + 재평가 완료(33%→100%) |
| 학생 | student2@levelup.demo | 이서연 | 불규칙·의문문 영역 낮음 |
| 학생 | student3@levelup.demo | 박지호 | 일반동사·부정문 보충 |
| 학생 | student4@levelup.demo | 최유나 | 영역별로 서로 다른 수준 배정 |
| 학생 | student5@levelup.demo | 정도윤 | 여러 영역 보충 필요 |
| 학생 | student6@levelup.demo | 한소율 | 고득점이지만 일부 영역만 보충 |

로그인 화면에 같은 안내와 "바로 로그인" 버튼이 있습니다.

## 7. 교수님 시연 시나리오 (약 5분)

1. **교사 로그인** → 대시보드: 학생 수, 평균 정답률, 보충 대상, 미제출 과제, 공통 취약 영역 확인
2. **결과 분석** → 학생별/문항별/영역별 탭 → 학생 이름 클릭(영역별 성취도·배정 이유·재평가 비교)
3. **맞춤 과제** → 학생마다 영역별 보충/기본/심화가 다르게 배정된 표, "이유" 버튼, 기준(60/85)을 바꿔 "저장 후 재배정"
4. **형성평가** → 새 평가 만들기(객관식/단답형/문장 오류 수정, 영역 입력) → 저장 후 공개
5. 로그아웃 → **학생(예: student3)** 로그인 → 내 과제에서 과제 풀기(정답 확인·해설) → 제출
6. 보충 과제 제출 후 **재평가 응시**(student1은 이미 완료, student2·3 등으로 직접 시연) → 변화 확인
7. 다시 교사로 로그인 → 과제 상태가 "제출 완료"로 반영된 것 확인

> 참고: 시연 데이터의 '시간 표현' 영역은 문항이 1개뿐이라 일부러 **성취도 판정 보류**(과제 미배정)로 두었습니다.

---

## 문제 해결
- **로그인 화면에 노란 경고**: 환경변수가 없거나 오타 → Vercel 환경변수 확인 후 Redeploy
- **"이메일 또는 비밀번호가 올바르지 않습니다"**: schema.sql 을 아직 실행하지 않았거나 중간에 오류 → SQL Editor에서 다시 Run
- **로그인은 되는데 빈 화면/권한 오류**: schema.sql 의 RLS 정책까지 모두 실행되었는지 확인
- **학생 가입 후 로그인 불가**: Authentication → Email 의 Confirm email 을 OFF 로 변경
- **빌드 실패**: Vercel 배포 로그 마지막 오류 메시지를 복사해 알려주세요.

## 보안·개인정보 메모
- 학생 데이터는 Supabase RLS 로 분리됩니다: 학생은 본인 결과·과제만, 교사는 본인이 만든 학급 데이터만 접근합니다.
- 회원가입 계정은 항상 학생 권한이며, 교사 권한은 DB에서만 부여됩니다.
- 실제 학생 개인정보는 입력하지 말고 시연용 가상 이름·이메일만 사용하세요.
