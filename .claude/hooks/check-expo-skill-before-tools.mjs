#!/usr/bin/env node

import {
  findSkillNameForPath,
  getUnreadSkillEntries,
  hasReadAllSkills,
  markSkillAsRead,
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

if (!state?.selectedSkill && (!Array.isArray(state?.selectedSkills) || state.selectedSkills.length === 0)) {
  process.exit(0);
}

if (toolName === 'Read') {
  const filePath = input.tool_input?.file_path;
  const skillName = findSkillNameForPath(filePath, state, projectDir);

  if (skillName) {
    const nextState = markSkillAsRead(state, skillName);

    writeState(projectDir, sessionId, {
      ...nextState,
      promptedOnce: false,
      lastReadAt: new Date().toISOString(),
      lastReadSkill: skillName,
    });
  }

  process.exit(0);
}

if (!['Edit', 'MultiEdit', 'Write', 'Bash'].includes(toolName)) {
  process.exit(0);
}

if (hasReadAllSkills(state) || state.promptedOnce === true) {
  process.exit(0);
}

const unreadSkillEntries = getUnreadSkillEntries(state);

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
      permissionDecisionReason: `이 세션은 스킬 검토 대상입니다. 먼저 ${unreadSkillEntries.map((entry) => entry.skillPath).join(', ')} 를 Read 한 뒤 변경 또는 실행을 시작하는 것이 권장됩니다.`,
    },
  })
);
