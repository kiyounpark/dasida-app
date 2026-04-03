# Playwright Smoke Test Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Expo 웹에서 dev-guest 로그인 → 퀴즈 홈 진입을 검증하는 Playwright smoke test를 작동하는 상태로 만든다.

**Architecture:** `feat/playwright-e2e` 브랜치에서 작업. `@playwright/test` 설치 → `playwright.config.ts` 설정 → `e2e/smoke.spec.ts` 작성 → 실행 확인 순서로 진행한다. Expo 웹 서버(`expo start --web`, 포트 8081)를 Playwright가 자동으로 시작/재사용하도록 `webServer` 옵션을 사용한다.

**Tech Stack:** Playwright (`@playwright/test`), Expo Router (web), Chromium

---

## 파일 구조

| 파일 | 변경 종류 | 역할 |
|------|----------|------|
| `package.json` | Modify | `@playwright/test` devDependency 추가, `test:e2e` / `test:e2e:ui` 스크립트 추가 |
| `playwright.config.ts` | Create | Playwright 설정 (baseURL, webServer, testDir) |
| `e2e/smoke.spec.ts` | Create | dev-guest 로그인 → /quiz 진입 smoke test |
| `.gitignore` | Modify | `playwright-report/`, `test-results/` 추가 |

---

### Task 1: 브랜치 생성 및 패키지 설치

**Files:**
- Modify: `package.json` (devDependencies 자동 추가됨)

- [ ] **Step 1: 브랜치 생성**

```bash
git checkout -b feat/playwright-e2e
```

Expected: `Switched to a new branch 'feat/playwright-e2e'`

- [ ] **Step 2: Playwright 설치**

```bash
npm install -D @playwright/test
```

Expected: `package.json`의 `devDependencies`에 `@playwright/test` 추가됨.

- [ ] **Step 3: Chromium 브라우저 설치**

```bash
npx playwright install chromium
```

Expected: Chromium 바이너리 다운로드 완료 메시지. (Firefox/WebKit은 설치하지 않는다.)

---

### Task 2: .gitignore 업데이트

**Files:**
- Modify: `.gitignore`

- [ ] **Step 1: .gitignore에 Playwright 아티팩트 추가**

`.gitignore` 파일 맨 아래에 다음 두 줄을 추가한다:

```
playwright-report/
test-results/
```

- [ ] **Step 2: 커밋**

```bash
git add .gitignore package.json package-lock.json
git commit -m "chore: Playwright 설치 및 .gitignore 업데이트"
```

---

### Task 3: playwright.config.ts 생성

**Files:**
- Create: `playwright.config.ts`

- [ ] **Step 1: 설정 파일 생성**

프로젝트 루트에 `playwright.config.ts`를 다음 내용으로 만든다:

```ts
import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  use: {
    baseURL: 'http://localhost:8081',
  },
  webServer: {
    command: 'npx expo start --web',
    url: 'http://localhost:8081',
    reuseExistingServer: true,
    timeout: 60_000,
  },
});
```

- [ ] **Step 2: package.json에 스크립트 추가**

`package.json`의 `scripts` 섹션에 다음 두 항목을 추가한다:

```json
"test:e2e": "playwright test",
"test:e2e:ui": "playwright test --ui"
```

- [ ] **Step 3: 커밋**

```bash
git add playwright.config.ts package.json
git commit -m "chore: playwright.config.ts 추가 및 test:e2e 스크립트 등록"
```

---

### Task 4: Smoke Test 작성 및 실행

**Files:**
- Create: `e2e/smoke.spec.ts`

- [ ] **Step 1: e2e 디렉토리 및 smoke test 파일 생성**

`e2e/smoke.spec.ts`를 다음 내용으로 만든다:

```ts
import { test, expect } from '@playwright/test';

test('dev-guest 로그인 후 퀴즈 홈 진입', async ({ page }) => {
  await page.goto('/');
  await page.getByText('개발용 익명으로 계속').click();
  await expect(page).toHaveURL(/quiz/);
});
```

- [ ] **Step 2: 테스트 실행 (첫 실행 — 실패할 수 있음)**

```bash
npm run test:e2e
```

실패하면 출력 메시지를 읽는다. 가능한 실패 원인:

| 증상 | 원인 | 해결 |
|------|------|------|
| `"개발용 익명으로 계속" not found` | 웹에서 버튼이 렌더링 안 됨 | Step 3으로 |
| Timeout (웹 서버 시작 안 됨) | Expo 웹 서버 기동 실패 | `npm run web`으로 먼저 수동 확인 |
| URL이 `/quiz`가 아닌 다른 경로 | 리다이렉트 로직 문제 | `await expect(page).toHaveURL(/quiz/, { timeout: 10_000 })` 으로 타임아웃 늘리기 |

- [ ] **Step 3: 버튼이 렌더링 안 되는 경우 디버그**

웹에서 버튼 텍스트가 다를 수 있다. UI 모드로 확인한다:

```bash
npm run test:e2e:ui
```

브라우저에서 실제 렌더링 상태를 확인하고, 버튼 텍스트가 다르면 `e2e/smoke.spec.ts`의 `getByText(...)` 인자를 실제 텍스트로 수정한다.

- [ ] **Step 4: 테스트 통과 확인**

```bash
npm run test:e2e
```

Expected 출력:
```
Running 1 test using 1 worker
  ✓  e2e/smoke.spec.ts:3:1 › dev-guest 로그인 후 퀴즈 홈 진입 (xxxx ms)

  1 passed (xxxx ms)
```

- [ ] **Step 5: 커밋**

```bash
git add e2e/smoke.spec.ts
git commit -m "test: Playwright smoke test 추가 — dev-guest 로그인 → 퀴즈 홈 진입"
```

---

### Task 5: main 머지

- [ ] **Step 1: main으로 전환 후 머지**

```bash
git checkout main
git merge feat/playwright-e2e
```

- [ ] **Step 2: 원격 푸시**

```bash
git push origin main
```

- [ ] **Step 3: 개발 기록 업데이트**

`docs/PROGRESS.md`에 오늘 날짜(2026-04-03) 항목으로 다음을 추가한다:

```markdown
### 2026.04.03

**Playwright smoke test 세팅**
- `playwright.config.ts`: Expo 웹 서버(포트 8081) 자동 시작, Chromium 단일 브라우저
- `e2e/smoke.spec.ts`: dev-guest 로그인 → /quiz 진입 smoke test
- `package.json`: `test:e2e` / `test:e2e:ui` 스크립트 추가
- **검증**: `npm run test:e2e` 통과
```
