#!/usr/bin/env node

import {
  buildSkillState,
  detectSkills,
  getSkillEntries,
  readHookInput,
  readState,
  resolveProjectDir,
  summarizeRecentChangeInfo,
  writeState,
} from './expo-skill-hooks-lib.mjs';

const input = await readHookInput();
const projectDir = resolveProjectDir(input);
const sessionId = String(input.session_id || '');
const prompt = String(input.prompt || '');
const selection = detectSkills(prompt, projectDir);

if (!selection || selection.skills.length === 0 || !sessionId) {
  process.exit(0);
}

const existingState = readState(projectDir, sessionId);
const baseState = buildSkillState(projectDir, selection);
const existingReadMap = existingState?.skillReadMap ?? {};
const nextReadMap = Object.fromEntries(
  getSkillEntries(baseState).map((entry) => [
    entry.name,
    existingReadMap[entry.name] === true,
  ])
);

writeState(projectDir, sessionId, {
  ...baseState,
  skillReadMap: nextReadMap,
  skillRead: Object.values(nextReadMap).every((value) => value === true),
  promptedOnce: false,
  updatedAt: new Date().toISOString(),
});

const skillEntries = getSkillEntries(baseState);
const lines = [
  '이 프롬프트는 저장소 스킬 작업으로 분류되었습니다.',
  `- 선택 스킬: ${skillEntries.map((entry) => entry.name).join(', ')}`,
  '',
  '먼저 확인할 파일:',
  ...skillEntries.map((entry) => `- ${entry.skillPath}`),
  '',
  '스킬 원본:',
  ...skillEntries.map((entry) => `- ${entry.sourcePath}`),
  '',
  '분류 이유:',
  ...skillEntries.map((entry) => `- ${entry.name}: ${entry.reason}`),
];

if (selection.reviewMode) {
  lines.push(
    '',
    '최근 변경 검토 규칙:',
    '1. 최근 변경 파일을 먼저 Read/Bash로 확인하세요.',
    '2. findings, 회귀 위험, 누락 테스트를 우선 보고하세요.',
    '3. Expo/React Native 관점과 DASIDA 구조 기준을 함께 점검하세요.'
  );
}

const recentChangeLines = summarizeRecentChangeInfo(selection.recentChangeInfo);

if (recentChangeLines.length > 0) {
  lines.push('', '최근 변경 문맥:', ...recentChangeLines);
}

lines.push(
  '',
  '작업 규칙:',
  '1. 변경 전에 위 SKILL.md를 먼저 Read 하세요.',
  '2. 필요한 references/만 최소한으로 확인하세요.',
  '3. 이 저장소에서 Claude는 Expo 검증과 로컬 구조 규칙 확인을 우선합니다.'
);

process.stdout.write(
  JSON.stringify({
    hookSpecificOutput: {
      hookEventName: 'UserPromptSubmit',
      additionalContext: lines.join('\n'),
    },
  })
);
