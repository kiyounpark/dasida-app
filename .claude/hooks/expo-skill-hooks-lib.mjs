import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const SKILL_DEFINITIONS = [
  {
    name: 'expo-api-routes',
    keywords: [
      'expo-api-routes',
      'api route',
      'api routes',
      'route handler',
      'server endpoint',
      'eas hosting',
      'api 라우트',
      '서버 엔드포인트',
    ],
    reason: 'API route 또는 EAS Hosting 엔드포인트 관련 키워드를 감지했습니다.',
  },
  {
    name: 'expo-tailwind-setup',
    keywords: ['expo-tailwind-setup', 'nativewind', 'tailwind'],
    reason: 'NativeWind 또는 Tailwind 관련 키워드를 감지했습니다.',
  },
  {
    name: 'expo-dev-client',
    keywords: [
      'expo-dev-client',
      'dev client',
      'development build',
      'testflight',
      'device test',
      '개발 빌드',
      '디바이스 테스트',
    ],
    reason: '개발 빌드 또는 디바이스 테스트 관련 키워드를 감지했습니다.',
  },
  {
    name: 'expo-deployment',
    keywords: [
      'expo-deployment',
      'app store',
      'appstore',
      'play store',
      'release',
      'submit',
      'submission',
      '배포',
      '앱스토어',
      '스토어 제출',
    ],
    reason: '배포 또는 스토어 제출 관련 키워드를 감지했습니다.',
  },
  {
    name: 'expo-cicd-workflows',
    keywords: [
      'expo-cicd-workflows',
      'github actions',
      'workflow',
      'pipeline',
      'cicd',
      'ci/cd',
      'automation',
      '자동화',
      '파이프라인',
    ],
    reason: 'CI/CD 또는 자동화 관련 키워드를 감지했습니다.',
  },
  {
    name: 'upgrading-expo',
    keywords: [
      'upgrading-expo',
      'expo sdk',
      'sdk upgrade',
      'upgrade expo',
      'dependency upgrade',
      '버전 업그레이드',
      '업그레이드',
      '마이그레이션',
    ],
    reason: 'Expo SDK 업그레이드 또는 마이그레이션 관련 키워드를 감지했습니다.',
  },
  {
    name: 'use-dom',
    keywords: ['use-dom', 'webview', 'web view', 'dom', 'html', '브라우저', '웹뷰'],
    reason: 'WebView 또는 DOM 기반 실행 관련 키워드를 감지했습니다.',
  },
  {
    name: 'native-data-fetching',
    keywords: [
      'native-data-fetching',
      'firebase',
      'firestore',
      'supabase',
      'api',
      'fetch',
      'query',
      'cache',
      'caching',
      'network',
      'backend',
      '에러 처리',
      '캐시',
      '네트워크',
      '데이터 연동',
    ],
    reason: 'API, Firebase, 네트워크 또는 캐싱 관련 키워드를 감지했습니다.',
  },
  {
    name: 'building-native-ui',
    keywords: [
      'building-native-ui',
      'ui',
      'screen',
      'layout',
      'navigation',
      'navigator',
      'component',
      'animation',
      'gesture',
      '화면',
      '스크린',
      '레이아웃',
      '네비게이션',
      '라우팅',
      '컴포넌트',
      '애니메이션',
    ],
    reason: 'UI, 화면, 레이아웃 또는 네비게이션 관련 키워드를 감지했습니다.',
  },
];

export async function readHookInput() {
  const chunks = [];

  for await (const chunk of process.stdin) {
    chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
  }

  const raw = Buffer.concat(chunks).toString('utf8').trim();
  return raw ? JSON.parse(raw) : {};
}

export function resolveProjectDir(input = {}) {
  return process.env.CLAUDE_PROJECT_DIR || input.cwd || process.cwd();
}

export function detectSkill(prompt) {
  const normalizedPrompt = String(prompt || '').trim();

  if (!normalizedPrompt) {
    return null;
  }

  const loweredPrompt = normalizedPrompt.toLowerCase();
  const directMatch = SKILL_DEFINITIONS.find((skill) => loweredPrompt.includes(skill.name));

  if (directMatch) {
    return {
      ...directMatch,
      reason: '프롬프트에 스킬 이름이 직접 언급되었습니다.',
    };
  }

  return (
    SKILL_DEFINITIONS.find((skill) =>
      skill.keywords.some((keyword) => loweredPrompt.includes(keyword.toLowerCase()))
    ) || null
  );
}

export function buildSkillState(projectDir, selection) {
  return {
    selectedSkill: selection.name,
    skillPath: path.join(projectDir, '.claude', 'skills', selection.name, 'SKILL.md'),
    sourcePath: path.join(projectDir, '.agents', 'skills', selection.name, 'SKILL.md'),
    reason: selection.reason,
  };
}

function getStateDir() {
  return path.join(os.tmpdir(), 'dasida-claude-hooks');
}

function getProjectHash(projectDir) {
  return crypto.createHash('sha1').update(projectDir).digest('hex').slice(0, 12);
}

export function getStatePath(projectDir, sessionId) {
  return path.join(getStateDir(), `${getProjectHash(projectDir)}-${sessionId}.json`);
}

export function readState(projectDir, sessionId) {
  if (!sessionId) {
    return null;
  }

  try {
    return JSON.parse(fs.readFileSync(getStatePath(projectDir, sessionId), 'utf8'));
  } catch {
    return null;
  }
}

export function writeState(projectDir, sessionId, state) {
  if (!sessionId) {
    return;
  }

  fs.mkdirSync(getStateDir(), { recursive: true });
  fs.writeFileSync(getStatePath(projectDir, sessionId), JSON.stringify(state, null, 2));
}

export function clearState(projectDir, sessionId) {
  if (!sessionId) {
    return;
  }

  fs.rmSync(getStatePath(projectDir, sessionId), { force: true });
}

export function isSkillFilePath(candidatePath, state, projectDir) {
  if (!candidatePath || !state?.skillPath || !state?.sourcePath) {
    return false;
  }

  const resolvedCandidate = path.resolve(projectDir, candidatePath);
  const resolvedSkillPath = path.resolve(state.skillPath);
  const resolvedSourcePath = path.resolve(state.sourcePath);

  return (
    resolvedCandidate === resolvedSkillPath ||
    resolvedCandidate === resolvedSourcePath ||
    resolvedCandidate.endsWith(`/${state.selectedSkill}/SKILL.md`)
  );
}
