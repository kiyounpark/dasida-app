import { execFileSync } from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const REVIEW_KEYWORDS = [
  'review',
  'verify',
  'verification',
  'validate',
  'validation',
  'check',
  '검토',
  '검증',
  '리뷰',
  '확인',
  '최근 수정',
  '최근 변경',
  '방금 수정',
  '최근에 수정',
];

const PRODUCT_CODE_PREFIXES = [
  'app/',
  'features/',
  'components/',
  'constants/',
  'data/',
  'functions/src/',
  'hooks/',
  'providers/',
  'utils/',
];

const SKILL_DEFINITIONS = [
  {
    name: 'dasida-code-structure',
    keywords: [
      'dasida-code-structure',
      'refactor',
      'architecture',
      'custom hook',
      'hook 분리',
      '구조 정리',
      '가독성',
      'thin screen',
      'feature-based',
      '아키텍처',
      '리팩터링',
      '커스텀 훅',
      '코드 구조',
    ],
    reason: '코드 구조 리팩터링 또는 custom hook 분리 관련 키워드를 감지했습니다.',
  },
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
    name: 'dasida-exam-extraction',
    keywords: [
      'dasida-exam-extraction',
      'pdf 추출',
      '기출 추출',
      '시험지 추출',
      '해설 추출',
      'ocr',
      'exam extraction',
      '문제 추출',
      '해설 데이터',
      'problems.json',
      'explanations.json',
      'diagnosisMethods',
      '기출 pdf',
      '모의고사 pdf',
    ],
    reason: '기출 PDF 추출 또는 해설 데이터 관련 키워드를 감지했습니다.',
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
  {
    name: 'superpowers',
    keywords: [
      'superpowers',
      '슈퍼파워스',
      'brainstorming',
      '브레인스토밍',
      'executing-plans',
      'subagent-driven-development',
      '스펙 작성',
      '스펙 써줘',
      'docs/superpowers',
      '아이디어 정리',
      '플랜 실행',
      '구현 계획',
    ],
    reason: '슈퍼파워스 브레인스토밍 또는 구현 계획 실행 관련 키워드를 감지했습니다.',
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

function runGit(projectDir, args, allowFailure = false) {
  try {
    return execFileSync('git', args, {
      cwd: projectDir,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
  } catch (error) {
    if (allowFailure) {
      return '';
    }

    throw error;
  }
}

function parseGitFileList(value) {
  return String(value || '')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);
}

function dedupeStrings(values) {
  return [...new Set(values.map((value) => String(value || '').trim()).filter(Boolean))];
}

function isOperationalOnlyFile(filePath) {
  const normalized = String(filePath || '').replace(/\\/g, '/');

  if (!normalized) {
    return true;
  }

  return normalized === 'docs/PROGRESS.md' || normalized.endsWith('.md');
}

function hasProductCodeChanges(files) {
  return files.some((filePath) => PRODUCT_CODE_PREFIXES.some((prefix) => filePath.startsWith(prefix)));
}

function pickMeaningfulFiles(files) {
  const uniqueFiles = dedupeStrings(files);
  const productFiles = uniqueFiles.filter((filePath) => !isOperationalOnlyFile(filePath));

  return productFiles.length > 0 ? productFiles : uniqueFiles;
}

function getSkillByName(name) {
  return SKILL_DEFINITIONS.find((skill) => skill.name === name) || null;
}

function addSkillSelection(selectionMap, skillName, reason) {
  const skill = getSkillByName(skillName);

  if (!skill) {
    return;
  }

  const existing = selectionMap.get(skill.name) ?? { skill, reasons: new Set() };

  if (reason) {
    existing.reasons.add(reason);
  }

  selectionMap.set(skill.name, existing);
}

function inferSkillsFromFiles(files) {
  const selections = new Map();

  for (const filePath of files) {
    const normalized = String(filePath || '').replace(/\\/g, '/');
    const lowered = normalized.toLowerCase();

    if (
      normalized.startsWith('app/') ||
      /features\/[^/]+\/components\//.test(normalized) ||
      /features\/[^/]+\/screens\//.test(normalized)
    ) {
      addSkillSelection(
        selections,
        'building-native-ui',
        `최근 변경 파일 ${normalized} 이(가) UI/화면 계층에 속합니다.`
      );
    }

    if (
      normalized.startsWith('app/') ||
      /features\/[^/]+\/screens\//.test(normalized) ||
      /features\/[^/]+\/hooks\/use-.*-screen\.ts$/.test(normalized) ||
      normalized === 'docs/ARCHITECTURE.md'
    ) {
      addSkillSelection(
        selections,
        'dasida-code-structure',
        `최근 변경 파일 ${normalized} 이(가) route/screen/hook 구조 검토 대상입니다.`
      );
    }

    if (
      lowered.includes('firebase') ||
      lowered.includes('fetch') ||
      lowered.includes('repository') ||
      lowered.includes('provider') ||
      lowered.includes('api') ||
      lowered.startsWith('functions/src/')
    ) {
      addSkillSelection(
        selections,
        'native-data-fetching',
        `최근 변경 파일 ${normalized} 이(가) 네트워크/저장소 계층과 관련됩니다.`
      );
    }

    if (lowered.includes('tailwind') || lowered.includes('nativewind')) {
      addSkillSelection(
        selections,
        'expo-tailwind-setup',
        `최근 변경 파일 ${normalized} 이(가) Tailwind/NativeWind 설정과 관련됩니다.`
      );
    }

    if (lowered.startsWith('.eas/workflows/') || lowered.includes('workflow')) {
      addSkillSelection(
        selections,
        'expo-cicd-workflows',
        `최근 변경 파일 ${normalized} 이(가) CI/CD 워크플로우와 관련됩니다.`
      );
    }

    if (lowered.includes('webview') || lowered.includes('dom')) {
      addSkillSelection(
        selections,
        'use-dom',
        `최근 변경 파일 ${normalized} 이(가) DOM/WebView 실행과 관련됩니다.`
      );
    }
  }

  return [...selections.values()].map((entry) => ({
    ...entry.skill,
    reason: [...entry.reasons].join(' / ') || entry.skill.reason,
  }));
}

export function isReviewPrompt(prompt) {
  const loweredPrompt = String(prompt || '').trim().toLowerCase();

  if (!loweredPrompt) {
    return false;
  }

  return REVIEW_KEYWORDS.some((keyword) => loweredPrompt.includes(keyword.toLowerCase()));
}

export function getRecentChangeInfo(projectDir) {
  const stagedFiles = parseGitFileList(runGit(projectDir, ['diff', '--cached', '--name-only'], true));
  const unstagedFiles = parseGitFileList(runGit(projectDir, ['diff', '--name-only'], true));
  const untrackedFiles = parseGitFileList(
    runGit(projectDir, ['ls-files', '--others', '--exclude-standard'], true)
  );
  const workingTreeFiles = dedupeStrings([...stagedFiles, ...unstagedFiles, ...untrackedFiles]);
  const meaningfulWorkingTreeFiles = pickMeaningfulFiles(workingTreeFiles);

  if (meaningfulWorkingTreeFiles.length > 0 && hasProductCodeChanges(meaningfulWorkingTreeFiles)) {
    return {
      source: 'working-tree',
      label: '현재 워크트리 변경',
      files: meaningfulWorkingTreeFiles,
      totalFiles: meaningfulWorkingTreeFiles.length,
      hasProductCodeChanges: true,
    };
  }

  const latestCommitFiles = pickMeaningfulFiles(
    parseGitFileList(runGit(projectDir, ['show', '--pretty=format:', '--name-only', 'HEAD'], true))
  );

  if (latestCommitFiles.length === 0) {
    return null;
  }

  const shortHash = runGit(projectDir, ['rev-parse', '--short', 'HEAD'], true);
  const subject = runGit(projectDir, ['show', '-s', '--format=%s', 'HEAD'], true);

  return {
    source: 'latest-commit',
    label: `최신 커밋 ${shortHash}${subject ? ` · ${subject}` : ''}`,
    files: latestCommitFiles,
    totalFiles: latestCommitFiles.length,
    hasProductCodeChanges: hasProductCodeChanges(latestCommitFiles),
  };
}

export function summarizeRecentChangeInfo(changeInfo, maxFiles = 8) {
  if (!changeInfo) {
    return [];
  }

  const lines = [
    `- 최근 변경 기준: ${changeInfo.label}`,
    `- 검토 파일 수: ${changeInfo.totalFiles}`,
  ];

  for (const filePath of changeInfo.files.slice(0, maxFiles)) {
    lines.push(`- 변경 파일: ${filePath}`);
  }

  if (changeInfo.files.length > maxFiles) {
    lines.push(`- 나머지 파일: ${changeInfo.files.length - maxFiles}개 더 있음`);
  }

  return lines;
}

export function detectSkills(prompt, projectDir) {
  const normalizedPrompt = String(prompt || '').trim();

  if (!normalizedPrompt) {
    return {
      skills: [],
      reviewMode: false,
      recentChangeInfo: null,
    };
  }

  const loweredPrompt = normalizedPrompt.toLowerCase();
  const selectionMap = new Map();

  for (const skill of SKILL_DEFINITIONS) {
    if (loweredPrompt.includes(skill.name)) {
      addSkillSelection(selectionMap, skill.name, '프롬프트에 스킬 이름이 직접 언급되었습니다.');
    }
  }

  for (const skill of SKILL_DEFINITIONS) {
    const matchedKeyword = skill.keywords.find((keyword) => loweredPrompt.includes(keyword.toLowerCase()));

    if (matchedKeyword) {
      addSkillSelection(selectionMap, skill.name, skill.reason);
    }
  }

  const reviewMode = isReviewPrompt(normalizedPrompt);
  const recentChangeInfo = reviewMode ? getRecentChangeInfo(projectDir) : null;

  if (recentChangeInfo) {
    for (const skill of inferSkillsFromFiles(recentChangeInfo.files)) {
      addSkillSelection(selectionMap, skill.name, skill.reason);
    }
  }

  const hasExpoOrFeatureSkill = [...selectionMap.keys()].some((name) => name !== 'dasida-code-structure');

  if (recentChangeInfo?.hasProductCodeChanges && (reviewMode || hasExpoOrFeatureSkill)) {
    addSkillSelection(
      selectionMap,
      'dasida-code-structure',
      '최근 변경 검토에서는 Expo 스킬과 함께 DASIDA 구조 기준도 함께 확인합니다.'
    );
  }

  const orderedSkills = SKILL_DEFINITIONS
    .filter((skill) => selectionMap.has(skill.name))
    .map((skill) => {
      const selection = selectionMap.get(skill.name);

      return {
        ...selection.skill,
        reason: [...selection.reasons].join(' / ') || selection.skill.reason,
      };
    });

  return {
    skills: orderedSkills,
    reviewMode,
    recentChangeInfo,
  };
}

function buildSkillEntry(projectDir, skill) {
  return {
    name: skill.name,
    reason: skill.reason,
    skillPath: path.join(projectDir, '.claude', 'skills', skill.name, 'SKILL.md'),
    sourcePath: path.join(projectDir, '.agents', 'skills', skill.name, 'SKILL.md'),
  };
}

export function buildSkillState(projectDir, selectionBundle) {
  const skillEntries = selectionBundle.skills.map((skill) => buildSkillEntry(projectDir, skill));

  return {
    selectedSkill: skillEntries[0]?.name ?? '',
    selectedSkills: skillEntries.map((entry) => entry.name),
    skillPath: skillEntries[0]?.skillPath ?? '',
    sourcePath: skillEntries[0]?.sourcePath ?? '',
    reason: skillEntries.map((entry) => `${entry.name}: ${entry.reason}`).join(' / '),
    skillEntries,
    reviewMode: selectionBundle.reviewMode === true,
    recentChangeInfo: selectionBundle.recentChangeInfo ?? null,
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

export function getSkillEntries(state) {
  if (Array.isArray(state?.skillEntries) && state.skillEntries.length > 0) {
    return state.skillEntries;
  }

  if (!state?.selectedSkill || !state?.skillPath || !state?.sourcePath) {
    return [];
  }

  return [
    {
      name: state.selectedSkill,
      reason: state.reason ?? '',
      skillPath: state.skillPath,
      sourcePath: state.sourcePath,
    },
  ];
}

export function getUnreadSkillEntries(state) {
  const skillEntries = getSkillEntries(state);

  if (skillEntries.length === 0) {
    return [];
  }

  const legacySingleSkillRead = skillEntries.length === 1 && state?.skillRead === true;
  const skillReadMap = state?.skillReadMap ?? {};

  return skillEntries.filter((entry) => !legacySingleSkillRead && skillReadMap[entry.name] !== true);
}

export function hasReadAllSkills(state) {
  return getUnreadSkillEntries(state).length === 0;
}

export function markSkillAsRead(state, skillName) {
  const nextState = {
    ...state,
    skillReadMap: {
      ...(state?.skillReadMap ?? {}),
      [skillName]: true,
    },
  };

  return {
    ...nextState,
    skillRead: hasReadAllSkills(nextState),
  };
}

export function findSkillNameForPath(candidatePath, state, projectDir) {
  if (!candidatePath) {
    return null;
  }

  const resolvedCandidate = path.resolve(projectDir, candidatePath);

  for (const skillEntry of getSkillEntries(state)) {
    const resolvedSkillPath = path.resolve(skillEntry.skillPath);
    const resolvedSourcePath = path.resolve(skillEntry.sourcePath);

    if (
      resolvedCandidate === resolvedSkillPath ||
      resolvedCandidate === resolvedSourcePath ||
      resolvedCandidate.endsWith(`/${skillEntry.name}/SKILL.md`)
    ) {
      return skillEntry.name;
    }
  }

  return null;
}
