# iPad 가로 모드 부분 지원 — exam-solve 화면 한정

- **작성일**: 2026-05-07
- **상태**: 기획중
- **범위**: `features/quiz/exam/screens/exam-solve-screen.tsx` 한 화면
- **선행**: `2026-05-05-ipad-math-scratchpad-design.md`

---

## 1. 배경 / 문제

다시다 앱은 현재 `app.config.js`의 `orientation: 'portrait'` 설정으로 모든 화면이 세로로 고정되어 있다. 이는 iPad 가로 모드에서 다음 화면들이 깨지는 것을 막기 위한 안전 장치다:

- **온보딩 화면**: ScrollView 없이 고정 높이 요소들이 쌓여 있어 가로 시 하단 버튼이 화면 밖으로 밀려남
- **홈/결과/히스토리/프로필**: tablet 레이아웃에 `maxWidth: 680~800` 고정 → 가로 너비(1133pt)에서 양옆 공백 과도
- **로그인 화면**: 로고 240×240 고정 → 가로 시 화면 점유 과도

그러나 `exam-solve-screen` 의 scratchpad(필기 캔버스)는 **가로 공간이 본질적으로 가치가 있다**:

- 좌(문제) / 우(scratchpad) split 레이아웃이 가로 방향에서 캔버스 너비를 크게 늘림
- `exam-solve-tablet-layout.tsx`의 `DEFAULT_RATIO`는 이미 11" iPad landscape (1194pt) 기준으로 설계되어 있음 → **원래 가로를 전제로 만든 레이아웃**

**목표**: 다른 화면은 세로 잠금을 유지하되, `exam-solve-screen` 진입 시에만 가로 모드를 허용한다.

---

## 2. 결정 사항 요약

| 항목 | 결정 |
|---|---|
| **범위** | `exam-solve-screen` 한 화면만 가로 허용 |
| **회전 트리거** | 자동 (사용자가 기기를 돌리면 따라감) |
| **사용자 안내** | 첫 진입 시 배너로 안내, AsyncStorage flag로 1회만 표시 |
| **구현 방식** | 옵션 X — 기본 portrait 잠금 + exam-solve에서만 unlock |
| **iPad 멀티태스킹** | 비활성화 (`requireFullScreen: true`) |
| **회전 중 stroke 처리** | 옵션 C — orientation change 감지 시 `endStroke()` 자동 호출 |
| **stroke 좌표 처리** | 옵션 A — 절대 좌표 그대로 유지 (정규화 안 함) |

---

## 3. 아키텍처 (개요)

```
┌─────────────────────────────────────────┐
│      앱 전체 (기본 세로 잠금)            │
│                                         │
│  온보딩, 로그인, 홈, 결과, 프로필 등    │
│  → 항상 세로                             │
│                                         │
│  ┌───────────────────────────────────┐  │
│  │  exam-solve-screen (예외)         │  │
│  │  → 진입 시 가로/세로 모두 허용    │  │
│  │  → 나갈 때 다시 세로 잠금         │  │
│  └───────────────────────────────────┘  │
└─────────────────────────────────────────┘
```

**핵심 원리**:
- `app.config.js` plist에는 portrait + landscape 모두 선언 → 가로 가능성을 시스템 수준에서 열어둠
- 앱 루트에서 `lockToPortrait()` 호출 → 모든 화면 기본 세로 고정
- `exam-solve-screen` 진입 시 `unlockAllOrientations()` → 회전 허용
- `exam-solve-screen` 이탈 시 `lockToPortrait()` 재호출 → 다시 세로 고정

---

## 4. 컴포넌트 / 파일 변경 목록

### 신규 파일

```
hooks/use-orientation-lock.ts
  └─ lockToPortrait() / unlockAllOrientations() 헬퍼

features/quiz/exam/components/landscape-hint-banner.tsx
  └─ "iPad를 옆으로 돌리면 더 넓게 쓸 수 있어요" 배너

features/quiz/exam/storage/landscape-hint-store.ts
  └─ 배너 본 적 있는지 flag 저장/조회 (AsyncStorage)
```

### 수정 파일

```
app.config.js
  └─ ios.infoPlist:
      - UISupportedInterfaceOrientations (iPhone): Portrait only — 변경 없음
      - UISupportedInterfaceOrientations~ipad: Portrait, PortraitUpsideDown,
        LandscapeLeft, LandscapeRight (4 방향)
  └─ ios.requireFullScreen: true (iPad 멀티태스킹 비활성화)

package.json
  └─ expo-screen-orientation 의존성 추가

app/_layout.tsx
  └─ RootLayout 컴포넌트의 useEffect에서 앱 마운트 시 lockToPortrait() 호출
  └─ 기존 useEffect 블록과 분리해 별도 useEffect로 추가

features/quiz/exam/hooks/use-exam-solve-screen.ts ⭐ (DASIDA 구조 규칙)
  └─ use-exam-solve-screen 훅의 useFocusEffect로 진입 시 unlock, 이탈 시 lock
  └─ orientation change 리스너 등록 + cleanup 명시
  └─ 리스너 콜백에서 useScratchpad.endStroke() 호출 (회전 시 stroke 정리)

features/quiz/exam/components/exam-solve-tablet-layout.tsx
  └─ landscape-hint-banner 조건부 렌더링 (UI만, 로직은 hook에)

constants/storage-keys.ts
  └─ landscapeHintSeen 키 추가
```

### DASIDA 구조 규칙 준수

- `exam-solve-screen.tsx` (현재 157줄) 는 그대로 thin screen 유지 — orientation 로직 직접 추가 안 함
- 모든 효과/리스너/lock 호출은 `use-exam-solve-screen.ts` (현재 160줄) 에 집중
- 화면 파일이 200줄 임계값을 넘지 않도록 설계
- `dasida-code-structure` SKILL: *"상태/핸들러/비동기 흐름은 use-*-screen.ts로 이동"* 규칙 준수

### 책임 분리

| 파일 | 책임 |
|---|---|
| `use-orientation-lock.ts` | "어떻게" 잠그고 푸는지 (라이브러리 호출 캡슐화, 실패 graceful 처리) |
| `app/_layout.tsx` | 앱 전체 기본값 (세로 잠금) — 1회 호출 |
| `use-exam-solve-screen.ts` | "언제" 풀고 잠그는지 (focus/blur 타이밍) + orientation 리스너 + endStroke 호출 |
| `exam-solve-screen.tsx` | thin screen — view 조합만 (변경 없음) |
| `exam-solve-tablet-layout.tsx` | 배너 조건부 렌더링 (UI만) |
| `landscape-hint-banner.tsx` | 배너 UI + 닫기 동작 |
| `landscape-hint-store.ts` | 배너 표시 이력 저장 |

---

## 5. 데이터 흐름

### 시나리오 A: 첫 진입 (세로)

```
1. 앱 시작
   └─ app/_layout.tsx → lockToPortrait()

2. 사용자가 exam-solve 진입
   └─ use-exam-solve-screen 훅의 useFocusEffect → unlockAllOrientations()

3. iPad + 세로 + 배너 미열람 → 배너 표시
```

### 시나리오 B: 가로 회전 (필기 중)

```
1. 사용자가 펜으로 그리는 중

2. iPad 회전
   └─ orientation change 이벤트 → useScratchpad.endStroke()

3. 회전 완료
   └─ useWindowDimensions로 split layout 재계산
   └─ 기존 strokes 절대 좌표 그대로 유지 (위치 보존, 사라지지 않음)
```

### 시나리오 C: exam-solve 이탈

```
1. 결과 화면 이동 or 뒤로가기

2. use-exam-solve-screen 훅의 useFocusEffect cleanup → lockToPortrait()
   └─ iOS가 즉시 세로로 회전

3. 다음 화면은 세로 상태로 진입
```

### 시나리오 D: 배너 닫기

```
1. 배너 ✕ 탭

2. landscape-hint-store.markAsSeen()
   └─ AsyncStorage flag 저장

3. 다음 진입부터 배너 숨김
```

---

## 6. 배너 표시 조건

```ts
const shouldShow =
  isTablet &&                          // iPad에서만
  orientation === 'portrait' &&        // 세로일 때만
  !seenBefore;                         // 한 번도 안 닫았을 때만
```

UX:
- 상단 배너 형태, 텍스트 + ✕ 버튼
- 배경 부드러운 강조색 (브랜드 컬러 톤)
- 닫기 시 즉시 사라지고 다시 나타나지 않음
- iPhone 사용자에게는 코드 자체가 실행되지 않음

---

## 7. 엣지 케이스

| # | 케이스 | 처리 |
|---|---|---|
| 1 | iPhone 사용자 | unlock 절대 호출 안 함, 배너 미표시 |
| 2 | 가로 상태에서 백그라운드 → 복귀 | iOS가 마지막 상태 복원, 추가 처리 불필요 |
| 3 | Cold start 시 가로 상태 복원 | 짧은 깜빡임 허용 (드문 케이스) |
| 4 | 자동 네비게이션 (시간 종료 등) | use-exam-solve-screen 훅의 useFocusEffect cleanup이 lockToPortrait 보장 |
| 5 | orientation lock 호출 실패 | try/catch + console.warn, 사용자 영향 없음 |
| 6 | 회전 중 새 stroke 시작 | iOS가 회전 중 터치 일부 흡수, 새 stroke은 회전 후 정상 처리 |
| 7 | AsyncStorage 저장 실패 | console.warn만, 다음에 또 표시될 수 있음 (큰 문제 아님) |
| 8 | Reanimated/Skia 회전 충돌 | iPad 시뮬레이터 회전 테스트 필수 (위험 항목 R1 참조) |

---

## 8. 테스트 전략

### 단위 테스트 (Jest)

- `use-orientation-lock`: lock/unlock API 호출 검증, 실패 시 throw 안 함
- `landscape-hint-store`: AsyncStorage 저장/조회, 실패 graceful 처리
- `landscape-hint-banner`: 표시 조건 분기 (iPad/iPhone, portrait/landscape, seen/unseen), 닫기 동작

### 통합 테스트 (iPad 시뮬레이터, 수동)

| # | 시나리오 | 기대 결과 |
|---|---|---|
| 1 | 앱 시작 → 홈 | 세로 고정, 회전 안 됨 |
| 2 | 홈 → exam-solve 진입 (세로) | 세로 유지, 배너 표시 |
| 3 | 배너 ✕ 닫기 | 사라짐, 재진입 시 미표시 |
| 4 | exam-solve에서 가로 회전 | 회전됨, split layout 가로 비율 |
| 5 | 필기 중 회전 | stroke 종료, 그림 보존, 크래시 없음 |
| 6 | 가로에서 결과 화면 이동 | 자동 세로 복귀 |
| 7 | 가로 + 백그라운드 → 복귀 | 가로 유지 |
| 8 | 빠른 회전 반복 | 크래시 없음 |
| 9 | 세로에서 그린 후 → 가로 → 세로 | 그림 그대로 |

### 회귀 테스트

- 온보딩, 로그인, 홈, 결과, 프로필, 히스토리 → 세로만 유지되는지 1회씩 시뮬레이터 점검
- iPhone에서 전체 동작 정상 (변경 없음 기대)

### 빌드 검증

`expo-screen-orientation`은 네이티브 모듈이므로:

```bash
npx expo prebuild --clean
npx expo run:ios
```

(다시다 CLAUDE.md 빌드 규칙)

---

## 9. 위험 요약

| 위험 | 가능성 | 영향 | 대응 |
|---|---|---|---|
| **R1**: Reanimated/Skia 회전 충돌로 크래시 (직전 dc45701에서 고친 영역) | 중 | 높음 | iPad 시뮬레이터 회전 시나리오 5/8 필수 통과. 발생 시 캔버스 dispose 처리 추가 |
| **R2**: 다른 화면에 가로 누수 | 낮음 | 중 | 기본 잠금 + exam-solve만 unlock 패턴이라 구조적으로 차단 |
| **R3**: Cold start 시 깜빡임 | 낮음 | 낮음 | 허용 |
| **R4**: prebuild 한 번 필요 | 확정 | 낮음 | 빌드 사이클 1회 추가 (CLAUDE.md 규칙대로) |
| **R5**: 좌표 절대값 → 위치 어색함 | 매우 낮음 | 낮음 | 사용자가 자주 회전 안 함, 노트 앱 표준 동작 |

---

## 10. 향후 작업 (Future Work) ⚠️

### F1. scratchpad를 다른 풀이 화면에도 추가 (별도 spec)

이번 spec은 `exam-solve-screen` 한 화면만 다룬다. 다음 화면들도 "문제 푸는 화면"이고 scratchpad가 자연스럽지만, 현재는 인프라가 `exam-solve-tablet-layout`에 묶여 있다:

- `exam-diagnosis-session-screen` (약점 진단 풀이)
- 모의고사 화면 (현재 `exam-solve-screen` 재사용 여부 확인 필요)
- `review-session-screen-view` (복습)

확장 시 필요한 작업:
- 공통 컴포넌트 추출 (split layout, toolbar)
- 화면별 stroke 저장 키 분리
- 각 화면 layout 재설계
- 이번 spec의 orientation lock 패턴을 동일하게 적용 (확장 가능 구조로 설계됨)

→ **별도 spec으로 진행 필요. 사용자에게 잊지 않도록 명시 알림 약속.**

### F2. iPad 멀티태스킹 재고려

`requireFullScreen: true`로 Split View / Stage Manager 비활성화. 향후 iPad 사용자 데이터에서 멀티태스킹 수요 확인되면 재고려.

### F3. 가로 시 추가 UX 개선

- 가로 모드 시 split ratio 기본값 재조정 (현재 `DEFAULT_RATIO`는 landscape 기준이지만 portrait 진입 시 동일 비율 사용)
- 가로 전용 툴바 배치 최적화
- pencil-only 모드 토글 위치 재검토

### F4. `useIsTablet` 잠재 취약점 보강

현재 `hooks/use-is-tablet.ts`는 `width >= 744`만 본다. iPad는 portrait/landscape 모두 width가 744 이상이라 안전하지만, 향후 iPhone landscape를 허용하면 iPhone 가로(약 932pt)도 tablet으로 잘못 판정된다.

이번 spec은 iPhone을 portrait-only로 유지하므로 영향 없음. 단, F1(다른 풀이 화면 확장) 또는 iPhone landscape 허용 시:

```ts
// 보강 버전 예시
export function useIsTablet(): boolean {
  const { width, height } = useWindowDimensions();
  return Math.min(width, height) >= 744; // 회전 불변
}
```

→ 별도 spec 또는 F1 spec에 포함.

---

## 11. 비목표 (이번 spec에서 다루지 않음)

- ❌ 다른 풀이 화면에 scratchpad 추가 (F1으로 분리)
- ❌ 모든 탐색 화면 가로 지원
- ❌ iPad 멀티태스킹 (Split View / Stage Manager)
- ❌ iPhone 가로 지원
- ❌ 안드로이드 태블릿 지원
- ❌ stroke 좌표 정규화 (회전 시 비율 보정)
- ❌ 가로 진입 시 자동 가로 강제 (사용자 회전에 따름)

---

## 12. 참고

- 직전 scratchpad 크래시 수정: 커밋 `dc45701` (Reanimated worklet `.runOnJS(true)`, Skia.PathBuilder 마이그레이션)
- 기존 scratchpad 설계: `docs/superpowers/specs/2026-05-05-ipad-math-scratchpad-design.md`
- 관련 코드:
  - `app.config.js:8` (현재 orientation 설정)
  - `hooks/use-is-tablet.ts` (744pt 기준)
  - `features/quiz/exam/components/exam-solve-tablet-layout.tsx` (split layout, landscape 기준 설계)
  - `features/quiz/exam/hooks/use-scratchpad.ts` (stroke 관리, endStroke API)
  - `features/quiz/exam/storage/scratchpad-strokes-store.ts` (절대 좌표 저장)
