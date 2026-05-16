#!/usr/bin/env node

// CCR 자동 루틴 환경에서는 스킵
if (!process.env.HOME?.startsWith('/Users/')) process.exit(0);

process.stderr.write(
  '\n[Notion 체크] "DASIDA 개발 기록" 업데이트 완료됐나요?\n' +
  '  - 새 기능 기획: 초안 페이지 생성 (상태: 기획중)\n' +
  '  - 구현 완료:   상태 → 구현완료, 구현완료일 채우기, Spec GitHub permalink 업데이트\n\n'
);
