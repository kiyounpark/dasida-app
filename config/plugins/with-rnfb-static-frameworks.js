const { withDangerousMod } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

/**
 * RNFirebase + use_frameworks!(:static) 호환 Config Plugin
 *
 * expo prebuild 시 Podfile에 다음 두 줄을 자동 삽입:
 *   - use_modular_headers!  → React-Core 헤더를 modular로 빌드해 RNFB가 import 가능하게
 *   - $RNFirebaseAsStaticFramework = true → RNFB 자체를 static framework로 빌드
 *
 * 없으면 빌드 에러:
 *   "include of non-modular header inside framework module 'RNFBApp.*'"
 */
module.exports = function withRnfbStaticFrameworks(config) {
  return withDangerousMod(config, [
    'ios',
    (config) => {
      const podfilePath = path.join(config.modRequest.platformProjectRoot, 'Podfile');
      let contents = fs.readFileSync(podfilePath, 'utf8');

      if (contents.includes('use_modular_headers!')) {
        // 이미 적용됨, 중복 삽입 방지
        return config;
      }

      // use_frameworks! 줄 바로 뒤에 삽입
      contents = contents.replace(
        /([ \t]*use_frameworks!.*)/,
        '$1\n\n  # RNFirebase + use_frameworks!(:static) 호환 (with-rnfb-static-frameworks plugin)\n  use_modular_headers!\n  $RNFirebaseAsStaticFramework = true',
      );

      fs.writeFileSync(podfilePath, contents);
      return config;
    },
  ]);
};
