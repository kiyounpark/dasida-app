# Playwright Smoke Test — Design Spec

**Date:** 2026-04-03
**Status:** Approved

## Goal

Expo 웹(`expo start --web`)에서 DASIDA 앱의 기본 흐름이 동작하는지 확인하는 Playwright E2E smoke test를 구축한다.
현재 프로젝트에 Playwright가 전혀 없으므로, 설치부터 첫 테스트 실행까지 최소한의 기반을 만든다.

## Background

- Playwright 미설치 — `playwright.config.ts` 없음, `e2e/` 디렉토리 없음
- `package.json`에 playwright 의존성 없음
- 앱 로그인 화면에 **"개발용 익명으로 계속"** 버튼 존재 (`features/auth/components/sign-in-screen-view.tsx:308`)
  → Google OAuth 없이 dev-guest 세션으로 테스트 통과 가능
- Expo 웹 서버 기본 포트: `8081`

## 소셜 로그인 테스트 불가 이유

Google OAuth는 자동화 브라우저를 봇으로 감지해 차단한다. 대신 dev-guest 로그인으로 인증 계층을 우회한다. 이는 업계 표준 접근 방식이다.

## 설계

### 패키지 설치

```bash
npm install -D @playwright/test
npx playwright install chromium
```

Chromium만 설치한다. Firefox/WebKit은 Expo 웹 검증 목적에 불필요하다.

### 설정 파일

**`playwright.config.ts`** (프로젝트 루트)

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

`reuseExistingServer: true` — 이미 웹 서버가 떠 있으면 재사용, 없으면 자동 시작.

### Smoke Test

**`e2e/smoke.spec.ts`**

```ts
import { test, expect } from '@playwright/test';

test('dev-guest 로그인 후 퀴즈 홈 진입', async ({ page }) => {
  await page.goto('/');
  await page.getByText('개발용 익명으로 계속').click();
  await expect(page).toHaveURL(/quiz/);
});
```

### package.json 스크립트

```json
"test:e2e": "playwright test",
"test:e2e:ui": "playwright test --ui"
```

`--ui` 모드는 Playwright의 시각적 디버거로, 실패 시 어떤 화면에서 멈췄는지 직접 확인 가능.

## 실행 흐름

```
npm run test:e2e
  → Expo 웹 서버 자동 시작 (포트 8081)
  → Chromium에서 앱 열기
  → "/" 진입 → 로그인 화면 표시
  → "개발용 익명으로 계속" 클릭
  → /quiz 경로 진입 확인
  → 테스트 통과/실패 출력
```

## 변경 파일

| 파일 | 변경 종류 | 내용 |
|------|----------|------|
| `package.json` | Modify | `devDependencies`에 `@playwright/test` 추가, `test:e2e` / `test:e2e:ui` 스크립트 추가 |
| `playwright.config.ts` | Create | Playwright 설정 파일 |
| `e2e/smoke.spec.ts` | Create | dev-guest 로그인 → 퀴즈 홈 진입 smoke test |
| `.gitignore` | Modify | `playwright-report/`, `test-results/` 추가 |

## Out of Scope

- Google OAuth 소셜 로그인 테스트 (봇 감지로 불가)
- Firefox / WebKit 멀티 브라우저 테스트
- 서브에이전트 기반 테스트 자동 생성 (Planner→Generator→Healer 패턴, 이 기반 완성 후 확장)
- CI/CD 파이프라인 연동 (EAS Workflow)
- 네이티브(iOS/Android) Detox 테스트

## Future

이 기반이 작동하면 다음 단계로 확장:
1. 영상에서 본 Planner→Generator→Healer 서브에이전트 패턴으로 테스트 시나리오 자동 생성
2. EAS Workflow에 Playwright 테스트 단계 추가
3. 핵심 플로우(온보딩 → 진단 → 결과 → 여정 보드) 커버리지 확장
