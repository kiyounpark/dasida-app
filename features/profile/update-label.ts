/**
 * 설정 「앱 정보」 버전 줄 끝에 붙는 OTA 표시 — 받은 업데이트(OTA)로 돌 때만 `업데이트 a1b2c3d4`(id 앞 8자리).
 * 앱에 들어 있던 코드로 돌 때(스토어에서 깐 뒤 첫 실행)와 개발 빌드는 null — 줄에 아무것도 안 붙는다.
 *
 * 첫 OTA(10.07)가 TestFlight 폰에 실제로 도착했는지 눈으로 볼 자리가 없어서 붙였다.
 * 8자리는 `eas update` 출력의 플랫폼별 update ID(그룹 ID 아님) 앞자리와 같다.
 */
export function updateLabelOf(updates: {
  isEnabled: boolean;
  isEmbeddedLaunch: boolean;
  updateId: string | null;
}): string | null {
  if (!updates.isEnabled || updates.isEmbeddedLaunch || !updates.updateId) {
    return null;
  }
  return `업데이트 ${updates.updateId.slice(0, 8)}`;
}
