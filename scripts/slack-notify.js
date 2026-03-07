#!/usr/bin/env node

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const phase = (process.argv[2] || 'test').toLowerCase();
const detail = process.argv.slice(3).join(' ').trim();
const agentName = (process.env.AI_AGENT_NAME || 'AI').trim() || 'AI';
const defaultConfigPath = path.join(os.homedir(), '.config', 'dasida', 'slack-webhook');
const configPath = process.env.SLACK_WEBHOOK_URL_FILE || defaultConfigPath;

const titleByPhase = {
  start: `🚀 ${agentName} 작업 시작`,
  done: `✅ ${agentName} 작업 완료`,
  test: `🧪 ${agentName} 테스트 알림`,
  progress: `🔄 ${agentName} 작업 진행`,
  fail: `❌ ${agentName} 작업 실패`,
};

function printUsage() {
  console.error('사용법: node scripts/slack-notify.js <start|done|test|progress|fail> [내용]');
  console.error('예시: node scripts/slack-notify.js test "웹훅 연결 테스트"');
  console.error(`기본 설정 파일: ${defaultConfigPath}`);
}

function formatKstTimestamp() {
  // KST는 고정 UTC+09:00이므로 계산식을 단순화했습니다.
  const kstDate = new Date(Date.now() + 9 * 60 * 60 * 1000);
  return `${kstDate.toISOString().slice(0, 19).replace('T', ' ')} KST`;
}

function readWebhookUrlFromFile(filePath) {
  try {
    return fs.readFileSync(filePath, 'utf8').trim();
  } catch (error) {
    if (error.code === 'ENOENT') {
      return '';
    }
    throw error;
  }
}

function resolveWebhookUrl() {
  const envValue = (process.env.SLACK_WEBHOOK_URL || '').trim();
  if (envValue) {
    return envValue;
  }

  return readWebhookUrlFromFile(configPath);
}

async function main() {
  const title = titleByPhase[phase];
  const webhookUrl = resolveWebhookUrl();
  if (!title) {
    printUsage();
    process.exit(1);
  }

  if (!webhookUrl) {
    console.error('Slack Webhook URL이 없습니다.');
    console.error(`환경변수 \`SLACK_WEBHOOK_URL\` 또는 설정 파일 \`${configPath}\`를 준비하세요.`);
    process.exit(1);
  }

  if (!webhookUrl.startsWith('https://hooks.slack.com/services/')) {
    console.error('유효한 Slack Webhook URL이 아닙니다. (SLACK_WEBHOOK_URL / 설정 파일 확인)');
    process.exit(1);
  }

  const lines = [title];
  if (detail) {
    lines.push(`- 내용: ${detail}`);
  }
  lines.push(`- 시간: ${formatKstTimestamp()}`);

  const response = await fetch(webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text: lines.join('\n') }),
  });

  const body = (await response.text()).trim();

  if (!response.ok || body.toLowerCase() !== 'ok') {
    console.error(`전송 실패: status=${response.status}, body=${body || '(empty)'}`);
    process.exit(1);
  }

  console.log('ok');
}

main().catch((error) => {
  console.error(`전송 중 예외 발생: ${error.message}`);
  process.exit(1);
});
