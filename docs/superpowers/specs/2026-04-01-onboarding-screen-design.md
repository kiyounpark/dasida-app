# 온보딩 화면 설계

> 작성일: 2026-04-01
> 대상: 소셜 로그인 후 신규 유저 온보딩 플로우

---

## 배경 및 목적

소셜 로그인(Apple/Google) 완료 후 여정 맵 화면이 바로 나와 신규 유저가 "이게 뭔지" 알 수 없는 문제가 있다. 로그인 직후 닉네임과 학년을 입력받는 온보딩 화면을 추가해 게임의 "캐릭터 생성" 같은 첫 경험을 제공한다.

---

## 진입 조건

- 이번 구현에서는 리디렉트 연결을 하지 않음 — 화면 구현만 완료
- `/onboarding` 라우트로 직접 접근해서 확인 가능
- 리디렉트 연결 (`profile.grade === 'unknown'` → `/onboarding`) 은 별도 작업으로 처리
- 온보딩 완료 후 → `router.replace('/(tabs)/quiz')` (뒤로 가기 불가)

---

## 수집 정보

| 필드 | 타입 | 조건 |
|------|------|------|
| `nickname` | `string` | 필수, 1자 이상 10자 이하 |
| `grade` | `'g1' \| 'g2' \| 'g3'` | 필수, 3개 중 선택 |

- `LearnerProfile` 타입에 `nickname: string` 필드 추가
- 기존 `grade: LearnerGrade` 필드 활용 (`'unknown'` → `'g1'|'g2'|'g3'` 업데이트)

---

## 화면 구성

```
[배경 글로우 — 로그인 화면과 동일]

[말풍선] "어떻게 불러드릴까요?"
[캐릭터] dasida-login-character.png (로그인 화면 재사용)

[닉네임 입력창]
  - placeholder: "불러드릴 이름을 입력해주세요"
  - maxLength: 10

[학년 선택 카드 3개: 고1 / 고2 / 고3]
  - 선택 시: #4A7C59 초록 배경 + withSpring 애니메이션
  - 미선택: 흰 배경 + 연한 테두리

[다시다 시작하기 버튼]
  - 닉네임 + 학년 모두 입력 시 활성화
  - 비활성: 흐린 상태
  - 활성화 시: FadeIn + withSpring scale 애니메이션
```

---

## 라우트 및 파일 구조

```
app/onboarding.tsx                          — 라우트 파일
features/onboarding/
  screens/onboarding-screen.tsx             — Thin Screen
  hooks/use-onboarding-screen.ts            — 로직 훅
  components/onboarding-screen-view.tsx     — UI
```

- `app/_layout.tsx` Stack에 `onboarding` 스크린 추가 (`headerShown: false`)
- `app/index.tsx` 에서 `grade === 'unknown'` 조건 추가 → `/onboarding` 리디렉트

---

## 데이터 저장

- **로컬**: `LocalLearnerProfileStore` (AsyncStorage) — 기존 방식 유지
- **원격**: Firestore SDK 직접 사용 — `users/{uid}/profile` 문서에 저장
  - 모바일/태블릿 기기 간 동기화를 위해 필수
  - 로그인 후 Firestore에서 profile을 읽어 로컬에 캐시
  - 온보딩 완료 시 로컬 + Firestore 동시 저장
- `FirestoreLearnerProfileStore` 클래스 신규 추가 (`LearnerProfileStore` 인터페이스 구현)
- `createLearnerProfileStore()` 팩토리 함수: Firebase 설정 여부에 따라 Firestore or Local 반환
- 저장 완료 후 `router.replace('/(tabs)/quiz')`

### Firestore 문서 구조

```
users/{uid}/profile
  nickname: string
  grade: 'g1' | 'g2' | 'g3' | 'unknown'
  createdAt: string (ISO)
  updatedAt: string (ISO)
```

### Security Rules (추가 필요)
```
match /users/{uid}/profile {
  allow read, write: if request.auth.uid == uid;
}
```

---

## 애니메이션

- 섹션별 등장: `FadeInUp` stagger (로그인 화면과 동일 패턴)
- 학년 카드 선택: `withSpring` scale + 색상 전환
- 버튼 활성화: `withSpring` scale up

---

## 제외 범위

- 닉네임 중복 검사 없음 (로컬 저장, 서버 검증 없음)
- 학년 변경 기능은 이후 프로필 설정 화면에서 처리
- N수생 선택지 없음 (고1/고2/고3 만)
