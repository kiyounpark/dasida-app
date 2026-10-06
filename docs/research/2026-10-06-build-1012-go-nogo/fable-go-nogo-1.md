# Fable 1차 — 1.0.12 빌드 go/no-go (2026-10-06 저녁, 241,886토큰)

**판정: 「빌드 전에 이것만」** — `app.config.js:7` 버전 한 줄. 그 밖엔 빌드를 막는 게 없다.

**1. 빌드 전 반드시**
- `app.config.js:7` `version: '1.0.11'` → `'1.0.12'`. `./node_modules/.bin/expo config --type public`로 풀어 보니 `version: '1.0.11'`(app.json:5의 1.0.5는 무시됨 — app.config.js가 이긴다). `ios/`·`android/`는 `.gitignore:54-55`라 EAS가 이 값으로 prebuild한다. 안 올리면 ⑴ 이미 출시된 1.0.11에 빌드를 못 붙인다 ⑵ `runtimeVersion.policy: 'appVersion'`(app.config.js:17-19)이라 새 빌드가 1.0.11 런타임으로 잡힌다 ⑶ 노트 서버 문서 `appVersion`이 1.0.11로 찍힌다(`save-note-remote.ts:90,97` — `Constants.expoConfig?.version`). buildNumber·versionCode는 `eas.json:4,44`(remote·autoIncrement)라 손 안 댄다.
- 나머지 없음. `/usr/bin/git diff f17461d..HEAD -- package.json package-lock.json app.config.js eas.json` 0줄 → prebuild 불필요. 서버는 main과 같다: 배포된 8개 함수가 쓰는 `learning-history.ts`·`review-task-contract.ts`는 `ebb516ac`에서만, `save-photo-note.ts`·`photo-store-contract.ts`는 `95a76c40`에서만 바뀜(파일별 git log). 알림 파일 셋만 `3902081c`·`1a6246cc`(미배포, 기윤 결정). HEAD `8238e06a`의 코드는 `1a6246cc`와 같다(docs 제외 diff 0줄).
- main HEAD에서 내가 다시 돌림: tsc 앱 0 · functions 0 · functions 295/295. 앱 jest 전체는 988/992 — 실패 4개 전부 사진 suite 3개의 `Exceeded timeout of 5000 ms`(다른 작업과 동시 실행 중). 그 3개만 다시 돌리니 79/79. STATUS:22에 적힌 같은 부하 현상.

**2. 커밋끼리 부딪히는 곳 — 반드시 고칠 것: 없음.** 본 것:
- ① id 새 단계(`review-scheduler.ts:141-147`) × 서버: `saveReviewTasks`가 diff로 옛 id 문서를 지운다(`learning-history.ts:1159-1171`) → `__day7` 유령 없음. `completeReviewTask`는 id에서 단계를 읽어(`:56-58`) 새 id와 맞는다.
- ① × ②: 내려간 과제는 날짜가 오늘 → 홈이 'review' → `eligible` 거짓(`use-quiz-hub-screen.ts:287-288,301`) → 허락 카드는 'resting'에만. 안 부딪힘.
- ① × 로컬 알림 문구: 로컬은 오늘 과제만 고른다(`review-notification-scheduler.ts:36-43,89`) — 이미 내려간 단계로 문구가 난다.
- ⑵ × 10.02판 `listPhotoNotes`: 문서를 그대로 돌려준다(`list-photo-notes.ts:53`, 스키마 없음) → 새 칸 통과. `canonicalNoteJson`은 savePhotoNote만 쓴다(grep).
- (가) null × 화면: `resolveWeaknessLabel`이 null을 받는다(`diagnosisMap.ts:587-591`). 1.0.12는 null 과제를 만들지도 않는다.
- ② canAskAgain은 훅(`use-notification-opt-in.ts:115`)·권한 요청(`review-notification-scheduler.ts:60-62`) 둘 다 고쳐져 있다.
- 고칠 건 아닌데 알아둘 창: 알림 함수 배포 전까지 1.0.12 학생(토큰 있는 소수)에게 **옛 서버 문구** 「오늘 안 하면 내일 처음부터예요」가 간다 — 앱은 한 칸만 내리니 그 며칠은 거짓 문구. 「어제 못 한 복습」 알림도 그동안 없다. 기윤 결정(스토어 뜨는 날 배포) 그대로 두되 창이 있다는 것만.

**3. 빌드 뒤·제출 전 폰 확인(최소)**
- 아이폰(TestFlight): ⑴ 사진 한 장 끝까지 → 노트 생김 + ☁ 저장됨 — 10.05 「다시다 Dev」에서 노트 안 생긴 것 재확인 ⑵ 사진 화면 시트 열고 닫기 → 「< 홈」 → 홈 · 지난 노트 「< 뒤로」 ⑶ 약점 이름이 붙은 노트가 생기면: 「내일 복습」 카드 아래 허락 카드 → 「다음」 → iOS 창 → 허용 → 카드 사라짐(이름이 안 붙으면 이 칸은 못 본다).
- 안드(기윤 폰, 13+인지 먼저): ⑴ 앱 지우고 새로 설치 → 기출 하나 → 결과 화면 「다음」 → 안드 허락 창 ⑵ 사진 화면에서 기기 뒤로 버튼 → 홈 · 카메라 취소 → 「< 홈」.
- 폰으로 안 봐도 되는 것: 한 칸 내림(하루 기다려야 함 · 시뮬레이터로 봤다).

**4. 제출·초대 전 남은 것**
- 제출 때: App Store 「What's New」 채우기(비면 거부, 09.07). 안드는 `eas.json:14` track `internal` → Play Console에서 프로덕션으로 올리고 다음 날 제출 활동 확인(1.0.10이 「임시」로 멈춘 전례, STATUS:51).
- 두 스토어에 뜨는 날: `firebase deploy --only functions:sendReviewRemindersMorning,functions:sendReviewRemindersEvening`.
- 나중(빌드와 무관): 개발용 테스트 알림 옛 문구 · 서버 완료 경로가 완료본까지 봄 · `CHANGELOG.md`가 0.1.0.1에 멈춤 · `app.json:5` 1.0.5(무시되지만 헷갈림) · 3월 말 아티팩트 M1 줄 · OTA 질문(안 정함).
- EAS 월 한도 숫자·이번 달 남은 횟수는 저장소로는 못 본다 — 확인 안 했다.
