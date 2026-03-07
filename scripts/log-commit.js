const { execFileSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

const progressPath = path.resolve(process.cwd(), 'docs/PROGRESS.md');
const ref = process.argv[2] || 'HEAD';

const START_MARKER = '<!-- COMMIT_LOGS_START -->';
const END_MARKER = '<!-- COMMIT_LOGS_END -->';

function runGit(args, allowFailure = false) {
  try {
    return execFileSync('git', args, { encoding: 'utf8' }).trim();
  } catch (error) {
    if (allowFailure) return '';
    throw error;
  }
}

function getSingleLine(value) {
  return value.replace(/\r/g, '').split('\n').map((line) => line.trim()).filter(Boolean).join(' / ');
}

function toWebUrl(remoteUrl) {
  if (!remoteUrl) return '';
  const sshMatch = remoteUrl.match(/^git@([^:]+):(.+?)(?:\.git)?$/);
  if (sshMatch) {
    return `https://${sshMatch[1]}/${sshMatch[2]}`;
  }

  const httpMatch = remoteUrl.match(/^https?:\/\/[^/]+\/.+$/);
  if (httpMatch) {
    return remoteUrl.replace(/\.git$/, '');
  }

  return '';
}

function getCommitLink(remoteWebUrl, hash) {
  if (!remoteWebUrl) return '';
  if (remoteWebUrl.includes('github.com')) {
    return `${remoteWebUrl}/commit/${hash}`;
  }
  if (remoteWebUrl.includes('gitlab.com')) {
    return `${remoteWebUrl}/-/commit/${hash}`;
  }
  return `${remoteWebUrl}/commit/${hash}`;
}

function toDateKey(dateText) {
  const normalized = (dateText || '').replace(/[^\d]/g, '');
  return Number(normalized || 0);
}

function parseEntryDateKey(entryText) {
  const firstLine = entryText.split('\n')[0].trim();
  const match = firstLine.match(/^### 커밋 (\d{4}\.\d{2}\.\d{2} \d{2}:\d{2})$/);
  return match ? toDateKey(match[1]) : 0;
}

function extractSection(content, startMarker, endMarker) {
  const startIndex = content.indexOf(startMarker);
  const endIndex = content.indexOf(endMarker);

  if (startIndex < 0 || endIndex < 0 || startIndex >= endIndex) {
    return null;
  }

  const before = content.slice(0, startIndex + startMarker.length);
  const middle = content.slice(startIndex + startMarker.length, endIndex);
  const after = content.slice(endIndex);

  return { before, middle, after };
}

function parseEntries(middleText) {
  const trimmed = middleText.trim();
  if (!trimmed) return [];

  return trimmed
    .split(/\n{2,}(?=### 커밋 )/)
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function rebuildContentWithEntries(content, entries) {
  const section = extractSection(content, START_MARKER, END_MARKER);
  if (!section) return content;

  const sorted = [...entries].sort((a, b) => parseEntryDateKey(b) - parseEntryDateKey(a));
  const middle = sorted.length > 0 ? `\n\n${sorted.join('\n\n')}\n\n` : '\n';

  return `${section.before}${middle}${section.after}`;
}

if (!fs.existsSync(progressPath)) {
  console.error('docs/PROGRESS.md 파일이 없습니다.');
  process.exit(1);
}

let content = fs.readFileSync(progressPath, 'utf8');

if (!content.includes(START_MARKER) || !content.includes(END_MARKER)) {
  console.error('docs/PROGRESS.md에 커밋 로그 마커가 없습니다.');
  process.exit(1);
}

let fullHash = '';
let shortHash = '';
let date = '';
let author = '';
let subject = '';
let body = '';
let commitLink = '';
let branchName = '';
let remoteName = 'origin';
let remoteUrl = '';

try {
  fullHash = runGit(['rev-parse', ref]);
  shortHash = runGit(['rev-parse', '--short', ref]);
  date = runGit(['show', '-s', '--date=format:%Y.%m.%d %H:%M', '--format=%cd', ref]);
  author = runGit(['show', '-s', '--format=%an', ref]);
  subject = runGit(['show', '-s', '--format=%s', ref]);
  body = runGit(['show', '-s', '--format=%b', ref], true);
  branchName = runGit(['rev-parse', '--abbrev-ref', ref], true);
  remoteUrl = runGit(['remote', 'get-url', remoteName], true);
  const remoteWebUrl = toWebUrl(remoteUrl);
  commitLink = getCommitLink(remoteWebUrl, fullHash);
} catch (error) {
  console.error(`커밋 정보를 읽지 못했습니다: ${ref}`);
  process.exit(1);
}

if (content.includes(`\`${fullHash}\``)) {
  const section = extractSection(content, START_MARKER, END_MARKER);
  const existingEntries = section ? parseEntries(section.middle) : [];
  const normalized = rebuildContentWithEntries(content, existingEntries);
  if (normalized !== content) {
    fs.writeFileSync(progressPath, normalized, 'utf8');
    console.log(`이미 기록된 커밋이며 정렬만 갱신했습니다: ${shortHash}`);
  } else {
    console.log(`이미 기록된 커밋입니다: ${shortHash}`);
  }
  process.exit(0);
}

const commitBody = getSingleLine(body);

const entryLines = [
  `### 커밋 ${date}`,
  `- 해시: \`${shortHash}\` (\`${fullHash}\`)`,
  `- 브랜치: ${branchName || '(브랜치 정보 없음)'}`,
  `- 원격: ${remoteName}`,
  `- 원격 URL: ${remoteUrl || '(원격 URL 없음)'}`,
  `- 링크: ${commitLink || '(원격 URL 없음)'}`,
  `- 작성자: ${author}`,
  `- 메시지: ${subject}`,
];

if (commitBody) {
  entryLines.push(`- 본문: ${commitBody}`);
}

const entry = `${entryLines.join('\n')}\n\n`;
const section = extractSection(content, START_MARKER, END_MARKER);
const existingEntries = section ? parseEntries(section.middle) : [];
const nextContent = rebuildContentWithEntries(content, [entry.trim(), ...existingEntries]);

fs.writeFileSync(progressPath, nextContent, 'utf8');

console.log(`docs/PROGRESS.md에 커밋 로그를 기록했습니다: ${shortHash}`);
