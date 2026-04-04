// features/learning/review-scheduler.ts
import { REVIEW_STAGE_OFFSETS, REVIEW_STAGE_ORDER, getNextReviewStage } from './review-stage';
import type { ReviewTaskStore } from './review-task-store';
import type { ReviewStage } from './history-types';

function toDateString(date: Date): string {
  return date.toISOString().split('T')[0];
}

function addDaysToToday(days: number): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + days);
  return toDateString(d);
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
    return;
  }

  const now = new Date().toISOString();
  const completedTask = { ...task, completed: true, completedAt: now };
  const nextStage = getNextReviewStage(task.stage);

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

/**
 * "다시 볼게요" — 현재 stage 유지, scheduledFor를 오늘 기준 N일 후로 갱신한다.
 */
export async function rescheduleReviewTask(
  accountKey: string,
  taskId: string,
  store: ReviewTaskStore,
): Promise<void> {
  const tasks = await store.load(accountKey);
  const task = tasks.find((t) => t.id === taskId);
  if (!task) {
    return;
  }

  const updated = tasks.map((t) =>
    t.id === taskId
      ? { ...t, scheduledFor: addDaysToToday(REVIEW_STAGE_OFFSETS[t.stage]) }
      : t,
  );
  await store.saveAll(accountKey, updated);
}

/**
 * 앱 시작 시 기한 초과(overdue) task의 stage를 한 단계 하락시킨다.
 * day1 초과는 day1 유지.
 */
export async function applyOverduePenalties(
  accountKey: string,
  store: ReviewTaskStore,
): Promise<void> {
  const tasks = await store.load(accountKey);
  const today = toDateString(new Date());

  const updated = tasks.map((task) => {
    if (task.completed || task.scheduledFor >= today) {
      return task;
    }
    const currentIndex = REVIEW_STAGE_ORDER.indexOf(task.stage);
    const newStage: ReviewStage =
      currentIndex > 0 ? REVIEW_STAGE_ORDER[currentIndex - 1] : 'day1';
    return {
      ...task,
      stage: newStage,
      scheduledFor: addDaysToToday(REVIEW_STAGE_OFFSETS[newStage]),
    };
  });

  await store.saveAll(accountKey, updated);
}
