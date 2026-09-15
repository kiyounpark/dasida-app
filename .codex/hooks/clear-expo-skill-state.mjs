#!/usr/bin/env node

import { clearState, readHookInput, resolveProjectDir } from './expo-skill-hooks-lib.mjs';

const input = await readHookInput();
const projectDir = resolveProjectDir(input);
const sessionId = String(input.session_id || '');

clearState(projectDir, sessionId);
