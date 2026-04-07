#!/usr/bin/env node

import fs from 'node:fs';

let input = {};
try {
  const raw = fs.readFileSync('/dev/stdin', 'utf8');
  input = JSON.parse(raw);
} catch {
  process.exit(0);
}

const toolName = String(input.tool_name ?? '');
const filePath = String(input.tool_input?.file_path ?? '');

if (toolName !== 'Write') process.exit(0);
if (!filePath.includes('docs/superpowers/specs/') || !filePath.endsWith('.md')) process.exit(0);

const lines = [
  `NOTION_REMINDER: spec 파일이 저장되었습니다 → ${filePath}`,
  '',
  '지금 바로 Notion "DASIDA 개발 기록" 데이터베이스에 초안 페이지를 생성하세요:',
  '1. notion-search 로 "DASIDA 개발 기록" 데이터베이스 ID 확인',
  '2. notion-create-pages 로 신규 페이지 생성:',
  '   - 기능명: spec 파일명에서 날짜 제외한 기능 이름 (한국어로)',
  '   - 날짜: 오늘 날짜',
  '   - 상태: 기획중',
  '   - 카테고리: spec 내용에서 판단',
  '   - Spec: 파일 경로 (커밋 후 GitHub permalink로 업데이트)',
  '   - 본문: ## 배경/목적 / ## 아키텍처 요약 / ## 변경 파일 섹션 포함',
];

process.stdout.write(
  JSON.stringify({
    hookSpecificOutput: {
      hookEventName: 'PostToolUse',
      additionalContext: lines.join('\n'),
    },
  })
);
