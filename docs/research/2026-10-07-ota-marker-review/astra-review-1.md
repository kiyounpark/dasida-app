**반드시 고칠 것: 없음**

지정된 변경과 참고 파일 기준, 표시 조건이나 모듈 상수 사용에서 확정적인 결함은 찾지 못했다. 다만 빌드 25 실물의 네이티브 구성까지 검증한 결과는 아니다.

**권고(기록만)**

1. **호환성:** SDK 자체가 실행 중인 ID와 활성 여부를 상수로 내보내므로 모듈에서 한 번 계산해도 적절하다(`node_modules/expo-updates/src/Updates.ts:26,35,100`, `features/profile/components/profile-screen-view.tsx:28`). 의존성도 이미 있다(`package.json:72`). 단, import는 네이티브 모듈을 요구한다(`node_modules/expo-updates/src/ExpoUpdates.ts:8`). 빌드 25에 해당 모듈이 있다는 전제에서 안전하다는 판단이며, iOS·Android 실물 호환성을 저장소만으로 단정하면 짐작이다.

2. **조건:** 내장 실행·업데이트 비활성·ID 없음은 모두 숨긴다(`features/profile/update-label.ts:13`). 내장으로 롤백한 경우도 숨기는 의미가 맞다(`node_modules/expo-updates/build/Updates.d.ts:58`). 이전 OTA로 돌아간 경우에는 그 OTA의 ID가 표시된다. 이는 “최신 배포”가 아니라 “현재 실행 중인 업데이트”라는 정의와 일치한다(같은 파일:13). 기존 테스트는 주요 분기를 확인하지만, 비활성 테스트는 ID도 null이라 비활성 조건만 독립적으로 검증하지는 않는다(`features/profile/__tests__/update-label.test.ts:16`).

3. **ID 대조:** 플랫폼별 `iOS update ID` 또는 `Android update ID` 앞 8자리와 비교해야 한다. 그룹 ID가 아니다(`features/profile/update-label.ts:6,16`; [Expo 공식 플랫폼별 ID 설명](https://github.com/expo/expo-github-action/blob/main/preview/README.md)). 이후 배포에서는 표시 유무만 보지 말고 예상 ID까지 대조할 것을 권한다.

4. **문구·확인 방법:** 앱 정보의 선택 가능한 일반 텍스트라 업데이트 버튼으로 오인시킬 구조는 없다(`features/profile/components/profile-screen-view.tsx:423–430`). 학생에게 난해할 수 있다는 평가는 짐작이며 필수 수정 사유는 아니다. 새 빌드 없이 특정 기기의 적용을 확인하려는 목적에는 현재 표시가 충분하다고 판단한다. 다만 “두 번 열면 반드시 적용”은 보장하지 말자. SDK는 다운로드 후 다음 **콜드 스타트**에 적용된다고 명시한다(`node_modules/expo-updates/build/Updates.d.ts:165–171`). 현재 production 채널 설정과 발행 명령은 일치한다(`eas.json:45`, `package.json:27`).

파일 수정·알림·테스트 실행은 하지 않았다.
