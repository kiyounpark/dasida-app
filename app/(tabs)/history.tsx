import { useIsFocused } from '@react-navigation/native';

import HistoryTabScreen from '@/features/history/screens/history-screen';
import { useCurrentLearner } from '@/features/learner/provider';
import { PhotoNotesScreen } from '@/features/photo/screens/photo-notes-screen';
import { EXAM_DOORS_VISIBLE } from '@/features/quiz/exam/exam-doors';

// 기출을 화면에서 내린 동안 「내 기록」은 오답노트만 보여준다(10.05 기윤 그림 · q-5).
// 옛 기출 기록 화면(HistoryTabScreen)은 그대로 두고 스위치로만 고른다 — exam-doors.ts.
export default function HistoryScreen() {
  return EXAM_DOORS_VISIBLE ? <HistoryTabScreen /> : <HistoryNotesTab />;
}

// 탭은 한 번 뜨면 계속 붙어 있어서, 그대로 두면 탭을 처음 연 뒤에 만든 노트가 안 보인다.
// 보일 때만 그려서 들를 때마다 새로 읽는다 — 스택 주소(app/photo-notes.tsx)를 열 때와 같다.
function HistoryNotesTab() {
  const isFocused = useIsFocused();
  const { session, getRemoteAuthHeaders } = useCurrentLearner();

  if (!isFocused) return null;
  return (
    <PhotoNotesScreen
      accountKey={session?.accountKey ?? null}
      getRemoteAuthHeaders={getRemoteAuthHeaders}
      inTab
    />
  );
}
