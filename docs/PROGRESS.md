# DASIDA — 개발 진행 기록
> 날짜별 작업 로그 + 커밋 기록
> AI(Claude/GPT/Gemini)가 현재 상태를 파악하기 위한 파일

---

## 진행 현황 요약

| 단계 | 내용 | 상태 |
|------|------|------|
| 환경 세팅 | Expo 프로젝트 생성, 기기 테스트 | ✅ 완료 |
| 구조 정의 | 화면/파일 구조, 네비게이션 설계 | ✅ 완료 |
| 데이터 작성 | problemData, practiceMap, diagnosisMap | ⬜ |
| 화면 구현 | 4개 화면 (문제/결과/연습/피드백) | 🟡 뼈대 완료 |
| Firebase 연결 | Firestore 피드백 저장 | ⬜ |
| OpenAI 연결 | AI 판정 API 호출 | ⬜ |
| 앱스토어 준비 | 개인정보처리방침, 심사 체크리스트 | ⬜ |

---

## 로그

### 2026.03.05

**환경 세팅 완료**
- Node.js v23.7.0 확인
- `npx create-expo-app@latest` 로 프로젝트 생성
- `tsconfig.json` jsx 설정 수정 (`react` → `react-jsx`)
- Expo Go 앱으로 안드로이드 기기 테스트 성공

**문서 구조 세팅**
- `PROJECT.md` — 전체 기획서 작성
- `docs/STRUCTURE.md` — 앱 구조 정의
- `docs/PROGRESS.md` — 진행 기록 (이 파일)
- `docs/DATA.md` — 데이터 구조 정의

**네비게이션 정합화 완료 (Tabs + Nested Stack)**
- 하단 탭을 `문제 풀기(quiz) / 내 기록(history) / 설정(profile)`으로 고정
- `quiz` 내부 Stack 경로를 `index → result → practice → feedback`으로 정리
- `feedback.tsx` 화면 파일 추가 및 `params` 안전 처리 반영
- 미사용 템플릿 라우트(`app/modal.tsx`) 제거
- `docs/STRUCTURE.md` 경로/상태표를 실제 코드와 동기화

**다음 작업**
- [x] 기본 템플릿 정리 (tabs 구조 제거)
- [x] Stack 네비게이션으로 `app/_layout.tsx` 교체
- [ ] `data/` 폴더 생성 및 데이터 파일 작성
- [ ] 화면 4개 상세 기능 구현 (AI/Firebase 연결 전 단계)

---

<!-- 새 작업 로그는 위 형식으로 날짜별로 추가 -->
