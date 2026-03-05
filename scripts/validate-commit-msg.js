const fs = require('node:fs');

const commitMsgPath = process.argv[2];

if (!commitMsgPath) {
  console.error('commit message 파일 경로가 필요합니다.');
  process.exit(1);
}

if (!fs.existsSync(commitMsgPath)) {
  console.error(`파일을 찾을 수 없습니다: ${commitMsgPath}`);
  process.exit(1);
}

const rawMessage = fs.readFileSync(commitMsgPath, 'utf8').replace(/\r/g, '');
const firstLine = rawMessage.split('\n')[0].trim();

if (!firstLine) {
  console.error('커밋 메시지 첫 줄이 비어 있습니다.');
  process.exit(1);
}

const bypassPatterns = [/^Merge\b/, /^Revert\b/, /^fixup!/, /^squash!/];
if (bypassPatterns.some((pattern) => pattern.test(firstLine))) {
  process.exit(0);
}

const conventionalPattern =
  /^(feat|fix|chore|docs|style|refactor|test|build|ci|perf|revert):\s(.+)$/;
const match = firstLine.match(conventionalPattern);

if (!match) {
  console.error('커밋 메시지 형식이 올바르지 않습니다.');
  console.error('형식: <type>: <설명>');
  console.error('예시: feat: 퀴즈 탭 네비게이션 추가');
  process.exit(1);
}

const subject = match[2].trim();

if (!/[가-힣]/.test(subject)) {
  console.error('설명에는 한글이 반드시 1자 이상 포함되어야 합니다.');
  process.exit(1);
}

if (/[A-Za-z]/.test(subject)) {
  console.error('설명에는 영문자를 사용할 수 없습니다. 한글 중심으로 작성해주세요.');
  process.exit(1);
}
