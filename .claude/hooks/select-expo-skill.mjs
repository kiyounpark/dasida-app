#!/usr/bin/env node

import {
  buildSkillState,
  detectSkill,
  readHookInput,
  readState,
  resolveProjectDir,
  writeState,
} from './expo-skill-hooks-lib.mjs';

const input = await readHookInput();
const projectDir = resolveProjectDir(input);
const sessionId = String(input.session_id || '');
const prompt = String(input.prompt || '');
const selection = detectSkill(prompt);

if (!selection || !sessionId) {
  process.exit(0);
}

const existingState = readState(projectDir, sessionId);
const baseState = buildSkillState(projectDir, selection);
const shouldReuseFlags = existingState?.selectedSkill === baseState.selectedSkill;

writeState(projectDir, sessionId, {
  ...baseState,
  skillRead: shouldReuseFlags ? existingState.skillRead === true : false,
  promptedOnce: shouldReuseFlags ? existingState.promptedOnce === true : false,
  updatedAt: new Date().toISOString(),
});

const lines = [
  '이 프롬프트는 저장소 스킬 작업으로 분류되었습니다.',
  `- 선택 스킬: ${baseState.selectedSkill}`,
  `- 먼저 확인할 파일: ${baseState.skillPath}`,
  `- 스킬 원본: ${baseState.sourcePath}`,
  `- 분류 이유: ${baseState.reason}`,
  '',
  '작업 규칙:',
  '1. 변경 전에 위 SKILL.md를 먼저 Read 하세요.',
  '2. 필요한 references/만 최소한으로 확인하세요.',
  '3. 이 저장소에서 Claude는 Expo 검증과 로컬 구조 규칙 확인을 우선합니다.',
];

process.stdout.write(
  JSON.stringify({
    hookSpecificOutput: {
      hookEventName: 'UserPromptSubmit',
      additionalContext: lines.join('\n'),
    },
  })
);
