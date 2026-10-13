#!/usr/bin/env node
// 사용: node scripts/verify-web-proto-store-link.mjs
// 실제 HTML의 인라인 스크립트를 최소 가짜 DOM에서 실행한다. 브라우저·네트워크·추가 패키지 없음.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const html = readFileSync(new URL('../web-proto/app/index.html', import.meta.url), 'utf8');
const scripts = [...html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script\s*>/gi)];
assert.equal(scripts.length, 1, 'HTML: 인라인 스크립트 하나');
const script = scripts[0][1];
const APP_STORE_BASE = 'https://apps.apple.com/kr/app/id6761792023';
const PLAY_BASE = 'https://play.google.com/store/apps/details?id=com.dasida.app';

function loadDecide(source) {
  const elements = Object.fromEntries(['heading', 'sub', 'app-store', 'play-store'].map((id) => [id, {}]));
  const context = {
    window: {},
    document: { getElementById: (id) => elements[id] },
    location: { search: '', replace() { assert.fail('가짜 데스크톱에서 자동 이동하면 안 된다'); } },
    navigator: { userAgent: 'Mozilla/5.0', platform: 'MacIntel', maxTouchPoints: 0 },
    URLSearchParams,
  };
  vm.runInNewContext(source, context, { filename: 'web-proto/app/index.html', timeout: 1000 });
  assert.deepEqual(Object.keys(context.window), ['__dasidaStoreLink'], '다른 window 전역 없음');
  assert.equal(typeof context.window.__dasidaStoreLink.decide, 'function');
  return context.window.__dasidaStoreLink.decide;
}

const decide = loadDecide(script);
const providerDeclaration = "APPLE_PROVIDER_TOKEN = '128473134'";
assert.ok(script.includes(providerDeclaration), "현재 provider token은 '128473134'");
const decideWithoutProvider = loadDecide(script.replace(providerDeclaration, "APPLE_PROVIDER_TOKEN = ''"));
const iphone = {
  userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1',
  platform: 'iPhone', maxTouchPoints: 5,
};
const ipad = {
  userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1',
  platform: 'MacIntel', maxTouchPoints: 5,
};
const android = {
  userAgent: 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Mobile Safari/537.36',
  platform: 'Linux armv8l', maxTouchPoints: 5,
};
const mac = {
  userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
  platform: 'MacIntel', maxTouchPoints: 0,
};
const windows = {
  userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
  platform: 'Win32', maxTouchPoints: 0,
};
const YT_PLAY = PLAY_BASE + '&referrer=utm_source%3Dyt_channel%26utm_campaign%3Dprofile_link';
const INSTA_PLAY = PLAY_BASE + '&referrer=utm_source%3Dinsta%26utm_campaign%3Dprofile_link';
const YT_APPLE = 'https://apps.apple.com/app/apple-store/id6761792023?pt=128473134&ct=yt_channel&mt=8';
const INSTA_APPLE = 'https://apps.apple.com/app/apple-store/id6761792023?pt=128473134&ct=insta&mt=8';
let cases = 0;

function check(label, device, search, expected, fn = decide) {
  const actual = fn({ ...device, search });
  for (const [key, value] of Object.entries(expected)) {
    assert.equal(actual[key], value, `${label}: ${key}`);
  }
  cases += 1;
}

check('case 1 iPhone Safari', iphone, '?utm_source=yt_channel', {
  os: 'ios',
  appStoreUrl: 'https://apps.apple.com/app/apple-store/id6761792023?pt=128473134&ct=yt_channel&mt=8',
  redirectTo: 'https://apps.apple.com/app/apple-store/id6761792023?pt=128473134&ct=yt_channel&mt=8',
});
check('case 2 empty Apple provider token', iphone, '?utm_source=yt_channel', {
  os: 'ios', appStoreUrl: APP_STORE_BASE, redirectTo: APP_STORE_BASE,
}, decideWithoutProvider);
check('case 3 iPadOS touch', ipad, '?utm_source=insta', {
  os: 'ios', appStoreUrl: INSTA_APPLE, redirectTo: INSTA_APPLE,
});
check('case 4 Android Chrome encoded referrer', android, '?utm_source=yt_channel', {
  os: 'android', redirectTo: YT_PLAY, playUrl: YT_PLAY, appStoreUrl: YT_APPLE,
});
check('case 5 Android Instagram', {
  ...android,
  userAgent: 'Mozilla/5.0 (Linux; Android 14; Pixel 8 Build/AP2A.240905.003; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/128.0.6613.127 Mobile Safari/537.36 Instagram 348.0.0.39.109 Android (34/14; 420dpi; 1080x2400; Google/google; Pixel 8; shiba; arm64-v8a; ko_KR; 650000000)',
}, '?utm_source=insta', {
  os: 'android', redirectTo: INSTA_PLAY, playUrl: INSTA_PLAY, appStoreUrl: INSTA_APPLE,
});
check('case 6 Mac desktop Chrome', mac, '?utm_source=yt_channel', {
  os: 'other', redirectTo: null, playUrl: YT_PLAY, appStoreUrl: YT_APPLE,
});
check('case 7 Windows Chrome', windows, '?utm_source=yt_channel', {
  os: 'other', redirectTo: null, playUrl: YT_PLAY, appStoreUrl: YT_APPLE,
});
check('case 9 Android Chrome emulated on touch Mac', {
  ...android, platform: 'MacIntel', maxTouchPoints: 5,
}, '?utm_source=yt_channel', {
  os: 'android', redirectTo: YT_PLAY,
});
for (const search of ['', '?utm_source=<script>', '?utm_source=' + 'a'.repeat(31)]) {
  // provider가 있어도 유효한 source가 없으면 양쪽 링크 모두 BASE다.
  for (const fn of [decide, decideWithoutProvider]) {
    check(`case 8 ignored source ${JSON.stringify(search)}`, android, search, {
      os: 'android', appStoreUrl: APP_STORE_BASE, playUrl: PLAY_BASE, redirectTo: PLAY_BASE,
    }, fn);
  }
}

for (const forbidden of ['analytics.js', 'gtag', 'googletagmanager', 'posthog']) {
  assert.ok(!html.toLowerCase().includes(forbidden), `HTML: ${forbidden} 없음`);
}
assert.doesNotMatch(html, /<script\b[^>]*\bsrc\s*=/i, 'HTML: 외부 스크립트 없음');
assert.doesNotMatch(html, /<link\s/i, 'HTML: 외부 link 없음');
cases += 1;

console.log(`ok — ${cases} cases`);
