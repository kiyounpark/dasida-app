import { act, renderHook } from '@testing-library/react-native';

import { logEvent } from '@/features/analytics/log-event';
import type { HeardFromAnswer } from '@/features/learner/types';
import type { NoteView, ScriptIO, ScriptEnding } from '../../script/script-io';
import { usePhotoFlow } from '../use-photo-flow';

jest.mock('../../flow/analyze-photo-request', () => ({
  pickPhoto: jest.fn(async () => ({ uri: 'file://photo.jpg' })),
  downscaleToDataUrl: jest.fn(async () => 'data:image/jpeg;base64,photo'),
  requestAnalyze: jest.fn(async () => ({ errorCandidates: [] })),
  newSubmissionId: jest.fn(() => 'submission'),
}));
jest.mock('../../flow/ask-photo-source', () => ({ askPhotoSource: jest.fn(async () => 'library') }));
jest.mock('../../flow/verify-quiz-request', () => ({ requestQuizVerify: jest.fn() }));
jest.mock('../../flow/diagnose-method-request', () => ({ requestDiagnoseMethod: jest.fn() }));
jest.mock('../../note-store', () => ({ savePhotoNote: jest.fn() }));
jest.mock('../../photo-file-store', () => ({ persistNotePhoto: jest.fn(() => null) }));
jest.mock('../../cloud/save-note-remote', () => ({ uploadPhotoNote: jest.fn() }));
jest.mock('@/features/analytics/log-event', () => ({ logEvent: jest.fn() }));

let mockIO: ScriptIO;
jest.mock('../../script/photo-script', () => ({
  createPhotoScript: jest.fn((io: ScriptIO) => {
    mockIO = io;
    return { start: jest.fn(), dispose: jest.fn() };
  }),
}));

const NOTE: NoteView = {
  dateLabel: '10/20', photoUri: null, quote: '', why: '', fix: '',
  methodId: 'cps', mistakeType: 'unclassified', methodLabel: '완전제곱식',
  typeLabel: '', weaknessIds: [], primaryWeaknessId: null, checkResult: 'skip',
  retryResult: 'none', askLine: true,
};
const QUESTION = '하나만 물어볼게요. 다시다를 처음 어디서 알게 됐어요?';
const CHOICES = [
  ['유튜브 쇼츠', 'youtube_shorts'], ['유튜브 긴 영상', 'youtube_long'],
  ['인스타그램', 'instagram'], ['오르비', 'orbi'], ['스토어에서 우연히 봤어요', 'store_chance'],
  ['친구·선생님 추천', 'friend_teacher'], ['그 밖의 곳', 'other'], ['기억이 안 나요', 'dont_remember'],
] as const;
let accountNumber = 0;
function setup(overrides: NonNullable<Parameters<typeof usePhotoFlow>[0]> = {}) {
  const props = {
    accountKey: `user:heard-from-${++accountNumber}`,
    canAskHeardFrom: true,
    saveHeardFrom: jest.fn<Promise<void>, [string, HeardFromAnswer]>(() => Promise.resolve()),
    ...overrides,
  };
  const hook = renderHook((options: typeof props) => usePhotoFlow(options), { initialProps: props });
  return { ...hook, props };
}
async function finish(result: ReturnType<typeof setup>['result'], variant: 'success' | 'fail' = 'success') {
  await act(async () => { result.current.start(); });
  act(() => {
    // 이전 대본에서 입력칸을 쓰던 경우에도 질문 버튼이 보여야 한다.
    mockIO.askText({ placeholder: '방법', maxLength: 80, submitLabel: '보내기', onSubmit: () => {} });
    mockIO.showNote(NOTE);
    mockIO.end({ kind: 'note', variant, note: NOTE });
  });
}
function expectRestart(result: ReturnType<typeof setup>['result']) {
  expect(result.current.thread.actions.map(({ label, kind }) => ({ label, kind }))).toEqual([
    { label: '처음부터 다시', kind: 'ghost' },
  ]);
  expect(result.current.thread.textPrompt).toBeNull();
}
beforeEach(() => jest.clearAllMocks());

it.each(['success', 'fail'] as const)('노트 끝 %s: 카드 바로 뒤 정확한 질문과 버튼 9개, 건너뛰기만 ghost', async (variant) => {
  const { result } = setup();
  await finish(result, variant);
  expect(result.current.thread.bubbles.slice(-2)).toEqual([
    expect.objectContaining({ kind: 'note' }),
    expect.objectContaining({ kind: 'coach', paras: [QUESTION], ask: true }),
  ]);
  expect(result.current.thread.actions.map(({ label, kind }) => ({ label, kind }))).toEqual([
    ...CHOICES.map(([label]) => ({ label, kind: undefined })),
    { label: '건너뛰기', kind: 'ghost' },
  ]);
  expect(result.current.thread.textPrompt).toBeNull();
});

it.each(CHOICES)('칩 %s: 저장 1번, 학생 말풍선, 감사, 다시 시작, 이벤트 1번', async (label, source) => {
  // 저장이 영원히 끝나지 않아도 화면은 바로 끝난다.
  const saveHeardFrom = jest.fn(() => new Promise<void>(() => {}));
  const { result, props } = setup({ saveHeardFrom });
  await finish(result);
  const action = result.current.thread.actions.find((item) => item.label === label)!;
  act(() => { result.current.thread.press(action); });
  act(() => { action.onPress(); }); // 이미 눌렀던 콜백도 이중 기록하지 않는다.
  expect(saveHeardFrom).toHaveBeenCalledTimes(1);
  expect(saveHeardFrom).toHaveBeenCalledWith(props.accountKey, { status: 'answered', source });
  expect(result.current.thread.bubbles.slice(-2)).toEqual([
    expect.objectContaining({ kind: 'me', paras: [label] }),
    expect.objectContaining({ kind: 'coach', paras: ['고마워요!'] }),
  ]);
  expect(logEvent).toHaveBeenCalledTimes(3); // photo_submit, photo_analyzed, heard_from_answered
  expect(logEvent).toHaveBeenLastCalledWith('heard_from_answered', { status: 'answered', source });
  expectRestart(result);
});

it('건너뛰기: skipped/null 저장, 학생 말풍선, 감사, 이벤트 source none', async () => {
  const { result, props } = setup();
  await finish(result);
  act(() => { result.current.thread.press(result.current.thread.actions[8]); });
  expect(props.saveHeardFrom).toHaveBeenCalledTimes(1);
  expect(props.saveHeardFrom).toHaveBeenCalledWith(props.accountKey, { status: 'skipped', source: null });
  expect(result.current.thread.bubbles.slice(-2)).toEqual([
    expect.objectContaining({ kind: 'me', paras: ['건너뛰기'] }),
    expect.objectContaining({ kind: 'coach', paras: ['고마워요!'] }),
  ]);
  expect(logEvent).toHaveBeenLastCalledWith('heard_from_answered', { status: 'skipped', source: 'none' });
  expect(logEvent).toHaveBeenCalledTimes(3);
  expectRestart(result);
});

it.each([
  ['heardFrom 있음 또는 프로필 미확인', { canAskHeardFrom: false }],
  ['accountKey 없음', { accountKey: null }],
  ['익명 계정', { accountKey: 'anonymous:test' }],
  ['빈 UID', { accountKey: 'user:' }],
  ['저장 함수 없음', { saveHeardFrom: undefined }],
])('%s: 질문 없이 처음부터 다시만', async (_name, overrides) => {
  const { result } = setup(overrides);
  await finish(result);
  expectRestart(result);
  expect(JSON.stringify(result.current.thread.bubbles)).not.toContain(QUESTION);
});

it.each(['closed', 'weakness'] as const)('%s 끝: 질문 없이 처음부터 다시만', async (kind) => {
  const { result } = setup();
  await act(async () => { result.current.start(); });
  act(() => { mockIO.end({ kind } as ScriptEnding); });
  expectRestart(result);
  expect(result.current.thread.bubbles).toEqual([]);
});

it('같은 실행의 두 번째 노트와 화면 재진입: 응답 전에도 다시 안 묻는다', async () => {
  const first = setup();
  await finish(first.result);
  act(() => { first.result.current.restart(); });
  await finish(first.result);
  expectRestart(first.result);
  first.unmount();
  const second = setup({ accountKey: first.props.accountKey });
  await finish(second.result);
  expectRestart(second.result);
});

it('저장 실패해도 감사와 다시 시작을 유지하고 다음 노트에 다시 안 묻는다', async () => {
  const { result } = setup({ saveHeardFrom: jest.fn(async () => { throw new Error('offline'); }) });
  await finish(result);
  await act(async () => { result.current.thread.press(result.current.thread.actions[0]); });
  expectRestart(result);
  expect(result.current.thread.bubbles.slice(-1)[0]).toEqual(expect.objectContaining({ paras: ['고마워요!'] }));
  act(() => { result.current.restart(); });
  await finish(result);
  expectRestart(result);
});

it('대화 중 프로필 읽기가 끝나면 end 시점의 최신 판단을 쓴다', async () => {
  const hook = setup({ canAskHeardFrom: false });
  await act(async () => { hook.result.current.start(); });
  hook.rerender({ ...hook.props, canAskHeardFrom: true });
  act(() => { mockIO.showNote(NOTE); mockIO.end({ kind: 'note', variant: 'success', note: NOTE }); });
  expect(hook.result.current.thread.actions).toHaveLength(9);
});
