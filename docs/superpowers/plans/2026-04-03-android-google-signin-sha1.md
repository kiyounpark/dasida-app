# Android Google 로그인 SHA-1 등록 플랜

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 안드로이드 Google 로그인 시 발생하는 400 에러("doesn't comply with Google's OAuth 2.0 policy")를 해결한다.

**Architecture:** 코드 변경 없음. Firebase Console에 debug SHA-1을 등록하고, 업데이트된 `google-services.json`을 앱에 반영하는 설정 작업이다.

**Tech Stack:** Firebase Console, google-services.json, Expo Android 빌드

---

## 에러 원인

Google OAuth는 Android 앱의 서명 키 SHA-1이 Google Cloud Console에 등록된 것과 일치해야 로그인을 허용한다.
현재 `android/app/debug.keystore`의 SHA-1이 Firebase에 등록되어 있지 않아 400 에러가 발생한다.

**현재 debug SHA-1:**
```
5E:8F:16:06:2E:A3:CD:2C:4A:0D:54:78:76:BA:A6:F3:8C:AB:F6:25
```

---

## 변경 파일 목록

| 파일 | 변경 내용 |
|---|---|
| `android/app/google-services.json` | Firebase Console에서 재다운로드 (SHA-1 등록 후 갱신) |

---

### Task 1: Firebase Console에 debug SHA-1 등록

이 Task는 Firebase Console 웹사이트에서 수동으로 진행한다.

- [ ] **Step 1: Firebase Console 접속**

브라우저에서 Firebase Console 접속 → `dasida-app` 프로젝트 선택

- [ ] **Step 2: Android 앱 설정 열기**

프로젝트 설정(⚙️) → 일반 탭 → 하단 "앱" 섹션에서 Android 앱(`com.dasida.app`) 선택

- [ ] **Step 3: SHA-1 지문 추가**

"디지털 지문 추가" 클릭 → 아래 SHA-1 입력 후 저장:

```
5E:8F:16:06:2E:A3:CD:2C:4A:0D:54:78:76:BA:A6:F3:8C:AB:F6:25
```

- [ ] **Step 4: google-services.json 다운로드**

같은 화면에서 "google-services.json 다운로드" 버튼 클릭

- [ ] **Step 5: 파일 교체**

다운로드한 `google-services.json`을 아래 경로에 덮어쓰기:

```
android/app/google-services.json
```

---

### Task 2: 앱 리빌드 및 동작 확인

SHA-1이 포함된 `google-services.json`으로 앱을 다시 빌드해야 반영된다.

- [ ] **Step 1: 클린 prebuild**

```bash
npx expo prebuild --clean
```

Expected: `android/` 폴더가 새로 생성됨

- [ ] **Step 2: Android 빌드 및 실행**

```bash
npx expo run:android
```

Expected: 기기 또는 에뮬레이터에 앱이 설치되고 실행됨

- [ ] **Step 3: Google 로그인 동작 확인**

앱에서 Google 로그인 버튼 클릭 → Google 계정 선택 → 로그인 성공 확인 (400 에러 미발생)

- [ ] **Step 4: 커밋**

```bash
git add android/app/google-services.json
git commit -m "fix: Android debug SHA-1 반영된 google-services.json 업데이트"
```

---

## 참고: SHA-1 확인 방법

현재 debug.keystore SHA-1 재확인 필요 시:

```bash
keytool -list -v \
  -keystore android/app/debug.keystore \
  -alias androiddebugkey \
  -storepass android \
  -keypass android \
  | grep "SHA1:"
```

Expected:
```
SHA1: 5E:8F:16:06:2E:A3:CD:2C:4A:0D:54:78:76:BA:A6:F3:8C:AB:F6:25
```

---

## 주의사항

- `npx expo prebuild --clean` 실행 시 `android/app/google-services.json`이 초기화될 수 있다. prebuild 후 반드시 다운로드한 파일로 다시 교체할 것.
- 이 SHA-1은 **개발(debug) 빌드 전용**이다. 프로덕션 배포 시에는 release 키스토어의 SHA-1도 별도로 등록해야 한다.
- Expo Go 앱으로 QR 스캔하는 방식에서는 이 설정이 적용되지 않는다. Google 로그인 테스트는 `npx expo run:android`로 빌드한 dev 빌드에서 해야 한다.
