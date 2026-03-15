#!/usr/bin/env node

import {
  isSkillFilePath,
  readHookInput,
  readState,
  resolveProjectDir,
  writeState,
} from './expo-skill-hooks-lib.mjs';

const input = await readHookInput();
const projectDir = resolveProjectDir(input);
const sessionId = String(input.session_id || '');
const toolName = String(input.tool_name || '');
const state = readState(projectDir, sessionId);

if (!state?.selectedSkill) {
  process.exit(0);
}

if (toolName === 'Read') {
  const filePath = input.tool_input?.file_path;

  if (isSkillFilePath(filePath, state, projectDir) && state.skillRead !== true) {
    writeState(projectDir, sessionId, {
      ...state,
      skillRead: true,
      promptedOnce: false,
      lastReadAt: new Date().toISOString(),
    });
  }

  process.exit(0);
}

if (!['Edit', 'MultiEdit', 'Write', 'Bash'].includes(toolName)) {
  process.exit(0);
}

if (state.skillRead === true || state.promptedOnce === true) {
  process.exit(0);
}

writeState(projectDir, sessionId, {
  ...state,
  promptedOnce: true,
  lastPromptedAt: new Date().toISOString(),
});

process.stdout.write(
  JSON.stringify({
    hookSpecificOutput: {
      hookEventName: 'PreToolUse',
      permissionDecision: 'ask',
      permissionDecisionReason: `이 세션은 스킬 "${state.selectedSkill}" 대상입니다. 먼저 ${state.skillPath} 를 Read 한 뒤 변경을 시작하는 것이 권장됩니다.`,
    },
  })
);
