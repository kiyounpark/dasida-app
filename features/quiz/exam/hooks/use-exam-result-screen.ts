import { useFocusEffect, useLocalSearchParams, router } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { useCurrentLearner } from '@/features/learner/provider';
import { EXAM_CATALOG_BY_ID } from '@/features/quiz/data/exam-catalog';
import { getExamProblems } from '@/features/quiz/data/exam-problems';

import { buildDiagnosisQueue } from '../build-diagnosis-queue';
import { buildExamAttemptInput, buildExamAttemptInputWithDiagnosis } from '../build-exam-attempt-input';
import { computeExamTopWeaknesses } from '../compute-exam-top-weaknesses';
import {
  getDiagnosisProgress,
  purgeLegacyDiagnosisKey,
  type ExamDiagnosisProgress,
} from '../exam-diagnosis-progress';
import { useExamSession } from '../exam-session';
import { saveLatestExamAttempt } from '../latest-exam-attempt-store';
import type { ExamResultSummary } from '../types';

export type ResultSaveState = 'idle' | 'saving' | 'saved' | 'error';

export type ProblemTile = {
  number: number;
  topic: string;
  score: number;
  status: 'undone' | 'done' | 'blank';
};

export type UseExamResultScreenResult = {
  result: ExamResultSummary | null;
  examTitle: string;
  saveState: ResultSaveState;
  problemTiles: ProblemTile[];
  diagnosedCount: number;
  wrongCount: number;
  onAnalyzeProblem: (problemNumber: number) => void;
  onReturnHome: () => void;
};

export function useExamResultScreen(): UseExamResultScreenResult {
  const { state, resetExam } = useExamSession();
  const { profile, recordAttempt, session } = useCurrentLearner();
  const { resumed } = useLocalSearchParams<{ resumed?: string }>();
  // resumed=1: diagnosis 완료 후 resume 경로에서 진입. 초기 recordAttempt는 이미 최초 채점 시 호출됨.
  const isResumed = resumed === '1';
  const [saveState, setSaveState] = useState<ResultSaveState>('idle');
  const [diagnosedProblems, setDiagnosedProblems] = useState<ExamDiagnosisProgress>({});
  const saveAttempted = useRef(false);
  const hasNavigatedToReportRef = useRef(false);

  const result = state.result;
  const examId = result?.examId ?? null;
  const examTitle = result ? (EXAM_CATALOG_BY_ID[result.examId]?.title ?? result.examId) : '';

  const examProblems = useMemo(
    () => (result ? getExamProblems(result.examId) : []),
    [result],
  );

  // 결과 저장 (최초 1회)
  useEffect(() => {
    if (!result || !profile || !session) return;
    if (saveAttempted.current) return;
    saveAttempted.current = true;

    if (isResumed) {
      // resume 경로: 최초 채점 시 이미 저장됨. 비멱등 POST 중복 방지.
      setSaveState('saved');
    } else {
      setSaveState('saving');
      recordAttempt(buildExamAttemptInput({ session, profile, result }))
        .then(() => setSaveState('saved'))
        .catch(() => setSaveState('error'));
    }

    // Persist latest attempt so quiz hub can detect in-progress analysis.
    // Always save (even with empty wrongNums) to overwrite stale data from
    // previous attempts — computeAnalysisInProgressState handles [] → isInProgress:false.
    const wrongNums = result.perProblem
      .filter((p) => !p.isCorrect && p.userAnswer !== null)
      .map((p) => p.number);
    void saveLatestExamAttempt(session.accountKey, {
      examId: result.examId,
      attemptId: result.attemptId,
      attemptDateISO: result.completedAt,
      wrongProblemNumbers: wrongNums,
      result,
    });
  }, [result, profile, session, recordAttempt]);

  // 포커스 시 진단 진행 상태 갱신
  useFocusEffect(
    useCallback(() => {
      if (!result) return;
      getDiagnosisProgress({
        examId: result.examId,
        attemptId: result.attemptId,
        attemptDateISO: result.completedAt,
      }).then(setDiagnosedProblems);
    }, [result]),
  );

  // 옛날 키 형태(attemptId 없는 dasida/exam-diagnosis/{examId})를 한 번 정리.
  // 진단 이력은 백엔드 attempt 레코드에 보존되므로 캐시 삭제는 안전하다.
  useEffect(() => {
    if (!examId) return;
    purgeLegacyDiagnosisKey(examId);
  }, [examId]);

  const wrongCount = result
    ? result.perProblem.filter((p) => !p.isCorrect && p.userAnswer !== null).length
    : 0;
  const diagnosedCount = Object.keys(diagnosedProblems).length;

  // 모든 오답 진단 완료 시 리포트로 이동
  // wrongCount === 0: 만점 또는 전부 공란(userAnswer === null). 공란은 diagnosedProblems에 기록되지 않으므로
  // 진단 대상이 없다. 이 분기에서는 attempt 재기록도 라우팅도 하지 않고 결과 화면에 머문다.
  useEffect(() => {
    if (wrongCount === 0 || diagnosedCount < wrongCount) return;
    if (!result || !profile || !session) return;
    if (hasNavigatedToReportRef.current) return;
    hasNavigatedToReportRef.current = true;

    // 진단 결과로 attempt 갱신 + ReviewTask 생성
    const diagnosedInput = buildExamAttemptInputWithDiagnosis({
      session,
      profile,
      result,
      diagnosedProblems,
    });
    // recordAttempt는 비동기이지만 라우팅은 즉시 진행한다 (사용자 경험 우선, spec 명시).
    // 실패 시 ref를 리셋해 두면, 컴포넌트가 unmount 전에 useFocusEffect로 diagnosedProblems가
    // 한 번 더 갱신되는 좁은 윈도우에서 useEffect가 재실행될 때 한 번 더 시도할 수 있다.
    // 컴포넌트가 이미 unmount된 뒤라면 무의미하지만 부작용도 없다.
    void recordAttempt(diagnosedInput).catch((err) => {
      console.warn('[Exam] attempt weakness update failed', err);
      hasNavigatedToReportRef.current = false;
    });

    const topWeaknesses = computeExamTopWeaknesses(diagnosedProblems);
    router.replace({
      pathname: '/quiz/result',
      params: {
        source: 'exam',
        examId: result.examId,
        examTotal: String(result.total),
        examCorrect: String(result.correct),
        examAccuracy: String(result.accuracy),
        examTopWeaknesses: JSON.stringify(topWeaknesses),
        examWrong: String(wrongCount),
      },
    });
  }, [diagnosedCount, wrongCount, result, diagnosedProblems, profile, session, recordAttempt]);

  // 문제 타일 계산
  const problemTiles: ProblemTile[] = result
    ? result.perProblem
        .filter((p) => !p.isCorrect)
        .sort((a, b) => {
          const aBlank = a.userAnswer === null;
          const bBlank = b.userAnswer === null;
          if (aBlank !== bBlank) return aBlank ? 1 : -1;
          const aScore = examProblems.find((ep) => ep.number === a.number)?.score ?? 0;
          const bScore = examProblems.find((ep) => ep.number === b.number)?.score ?? 0;
          return bScore - aScore;
        })
        .map((p) => {
          const ep = examProblems.find((e) => e.number === p.number);
          return {
            number: p.number,
            topic: ep?.topic ?? '문제',
            score: ep?.score ?? 0,
            status:
              p.userAnswer === null
                ? 'blank'
                : diagnosedProblems[p.number]
                  ? 'done'
                  : 'undone',
          };
        })
    : [];

  return {
    result,
    examTitle,
    saveState,
    problemTiles,
    diagnosedCount,
    wrongCount,
    onAnalyzeProblem: (problemNumber: number) => {
      if (!result) return;
      const allWrong = result.perProblem
        .filter((p) => !p.isCorrect && p.userAnswer !== null)
        .map((p) => p.number);
      // diagnosedProblems는 useFocusEffect로 진단 세션 복귀 시 비동기 갱신된다.
      // async 읽기 완료 전 짧은 stale 윈도우가 있을 수 있으나, 빈 큐 가드가 방어한다.
      const queue = buildDiagnosisQueue(allWrong, diagnosedProblems, problemNumber);
      if (queue.length === 0) return;
      router.push({
        pathname: '/quiz/exam/diagnosis-session',
        params: {
          examId: result.examId,
          wrongProblemNumbers: JSON.stringify(queue),
          startIndex: '0', // buildDiagnosisQueue가 클릭한 문제를 큐 첫 자리에 두므로 항상 0
          totalNotes: String(wrongCount),
          diagnosedCountBefore: String(diagnosedCount),
        },
      });
    },
    onReturnHome: () => {
      resetExam();
      router.replace('/quiz');
    },
  };
}
