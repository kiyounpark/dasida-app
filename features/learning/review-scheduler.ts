// features/learning/review-scheduler.ts
import { REVIEW_STAGE_OFFSETS, REVIEW_STAGE_ORDER, getNextReviewStage } from './review-stage';
import type { ReviewTaskStore } from './review-task-store';
import type { LearningSource, ReviewStage } from './history-types';
import type { WeaknessId } from '@/data/diagnosisMap';

/**
 * days일 뒤를 서버 스키마(`z.string().datetime()`)가 받는 ISO datetime으로 만든다.
 * 날짜는 기기 시간대 기준이고, due 판정·푸시 예약은 모두 앞 10글자만 읽는다.
 * 뒤의 T00:00:00.000Z는 검사 통과용 고정값이며 시각으로 쓰이지 않는다.
 */
export function addDaysToToday(days: number): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  const result = new Date(d.getFullYear(), d.getMonth(), d.getDate() + days);
  return `${result.getFullYear()}-${pad(result.getMonth() + 1)}-${pad(result.getDate())}T00:00:00.000Z`;
}

/**
 * 오늘부터 scheduledFor 날짜까지 며칠인지. 과제 날짜는 기기 날짜로 만들어지니(addDaysToToday)
 * 오늘도 기기 날짜로 센다 — toISOString()(UTC)으로 세면 한국 00~09시에 하루가 더 나온다.
 * 막지 않는다(오늘 0, 어제 -1) — 홈을 켜 둔 채 자정이 지나면 resting 과제가 오늘이 될 수 있고,
 * 그때 1로 막으면 「내일」이 거짓이 된다. D-N 표시는 부르는 쪽이 Math.max(1, …).
 */
export function daysUntilScheduled(scheduledFor: string, now: Date = new Date()): number {
  const [y, m, d] = scheduledFor.slice(0, 10).split('-').map(Number);
  const target = Date.UTC(y, m - 1, d);
  const today = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.round((target - today) / 86_400_000);
}

/**
 * "기억났어요!" — 현재 task를 완료 처리하고 다음 stage task를 생성한다.
 * day30 완료 시 다음 task 없이 완전 졸업.
 */
export async function completeReviewTask(
  accountKey: string,
  taskId: string,
  store: ReviewTaskStore,
): Promise<void> {
  const tasks = await store.load(accountKey);
  const task = tasks.find((t) => t.id === taskId);
  if (!task) {
    console.warn('[review-scheduler] completeReviewTask: task not found', taskId);
    return;
  }

  const now = new Date().toISOString();
  const completedTask = { ...task, completed: true, completedAt: now };
  // 1.0.11까지 내려간 과제가 아직 안 고쳐졌어도(repairDemotedReviewTasks 저장 실패 등) id 단계로 센다 —
  // stage로 세면 다음 id가 자기 자신과 겹쳐 다음 복습이 안 생긴다.
  const nextStage = getNextReviewStage(stageFromTaskId(task.id) ?? task.stage);

  if (!nextStage) {
    // day30 완료 → 졸업
    await store.saveAll(
      accountKey,
      tasks.map((t) => (t.id === taskId ? completedTask : t)),
    );
    return;
  }

  const nextTaskId = `${task.sourceId}__${task.weaknessId}__${nextStage}`;
  const alreadyExists = tasks.some((t) => t.id === nextTaskId);

  const updatedTasks = tasks.map((t) => (t.id === taskId ? completedTask : t));
  if (!alreadyExists) {
    updatedTasks.push({
      id: nextTaskId,
      accountKey,
      weaknessId: task.weaknessId,
      source: task.source,
      sourceId: task.sourceId,
      scheduledFor: addDaysToToday(REVIEW_STAGE_OFFSETS[nextStage]),
      stage: nextStage,
      completed: false,
      createdAt: now,
    });
  }

  await store.saveAll(accountKey, updatedTasks);
}

/** 과제 id 끝(`…__day3`)이 말하는 단계. id는 만들 때 단계로 박히고 바뀌지 않는다. */
function stageFromTaskId(taskId: string): ReviewStage | null {
  const tail = taskId.slice(taskId.lastIndexOf('__') + 2);
  return (REVIEW_STAGE_ORDER as string[]).includes(tail) ? (tail as ReviewStage) : null;
}

/**
 * 놓친 복습은 단계·날짜를 그대로 둔다(🔒 10.04 ① astra·Fable · 기윤 10.05 「놓친 날 다음 날」).
 * due 판정이 `<= today`라 다음에 앱을 연 날 홈 「오늘 복습할 것」에 그대로 뜬다.
 *
 * 1.0.11까지는 앱을 열 때 연체 과제를 한 단계 내리고 「오늘+간격」으로 다시 밀었다 — 돌아온 학생이
 * 또 「내일」만 봤다. 그때 내려간 과제는 id(`…__day3`)와 stage(day1)가 어긋나 있어서, 끝내면 다음 id가
 * 자기 자신과 겹쳐 다음 복습이 안 생겼다(앱 completeReviewTask·서버 같은 자리).
 * 그래서 앱을 열 때 stage를 id의 단계로 되돌린다. 날짜는 손대지 않는다.
 */
export async function repairDemotedReviewTasks(
  accountKey: string,
  store: ReviewTaskStore,
): Promise<void> {
  const tasks = await store.load(accountKey);

  const updated = tasks.map((task) => {
    if (task.completed) {
      return task;
    }
    const idStage = stageFromTaskId(task.id);
    if (!idStage || idStage === task.stage) {
      return task;
    }
    return { ...task, stage: idStage };
  });

  await store.saveAll(accountKey, updated);
}

/**
 * "오답 기반 복습 자동 생성" — 세션에서 틀린 실수가 데려간 약점들을
 * day1·내일로 생성/갱신한다. 중복키 = (sourceId, weaknessId), stage 무시.
 * 상위 단계 미완료 task는 id/stage 정합성을 위해 삭제 후 __day1 재생성한다.
 *
 * source는 Firestore 문서에 남는다 — 사진 노트가 만든 과제는 'photo' (E칸, 09.23 🔒).
 * 나중에 바꾸면 서버 enum과 저장된 문서를 둘 다 고쳐야 하니 부르는 쪽이 정확히 넘긴다.
 */
export async function spawnMistakeReviewTasks(
  accountKey: string,
  sourceId: string,
  mistakeWeaknessIds: WeaknessId[],
  store: ReviewTaskStore,
  source: LearningSource = 'weakness-practice',
): Promise<void> {
  const unique = Array.from(new Set(mistakeWeaknessIds));
  if (unique.length === 0) return;

  const tasks = await store.load(accountKey);
  const tomorrow = addDaysToToday(1);
  const now = new Date().toISOString();
  let next = [...tasks];

  for (const weaknessId of unique) {
    const pending = next.filter(
      (t) => !t.completed && t.sourceId === sourceId && t.weaknessId === weaknessId,
    );

    const day1Existing = pending.find((t) => t.stage === 'day1');
    if (day1Existing) {
      next = next.map((t) =>
        t.id === day1Existing.id ? { ...t, scheduledFor: tomorrow } : t,
      );
      const stale = new Set(
        pending.filter((t) => t.id !== day1Existing.id).map((t) => t.id),
      );
      next = next.filter((t) => !stale.has(t.id));
      continue;
    }

    const removeIds = new Set(pending.map((t) => t.id));
    next = next.filter((t) => !removeIds.has(t.id));
    const day1Id = `${sourceId}__${weaknessId}__day1`;
    next.push({
      id: day1Id,
      accountKey,
      weaknessId,
      source,
      sourceId,
      scheduledFor: tomorrow,
      stage: 'day1',
      completed: false,
      createdAt: now,
    });
  }

  await store.saveAll(accountKey, next);
}
