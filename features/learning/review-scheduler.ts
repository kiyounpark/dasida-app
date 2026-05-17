// features/learning/review-scheduler.ts
import { REVIEW_STAGE_OFFSETS, REVIEW_STAGE_ORDER, getNextReviewStage } from './review-stage';
import type { ReviewTaskStore } from './review-task-store';
import type { ReviewStage } from './history-types';
import type { WeaknessId } from '@/data/diagnosisMap';

function toDateString(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function addDaysToToday(days: number): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  const result = new Date(d.getFullYear(), d.getMonth(), d.getDate() + days);
  return `${result.getFullYear()}-${pad(result.getMonth() + 1)}-${pad(result.getDate())}`;
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
    if (task.completed || task.scheduledFor.slice(0, 10) >= today) {
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

/**
 * "오답 기반 복습 자동 생성" — 세션에서 틀린 실수가 데려간 약점들을
 * day1·내일로 생성/갱신한다. 중복키 = (sourceId, weaknessId), stage 무시.
 * 상위 단계 미완료 task는 id/stage 정합성을 위해 삭제 후 __day1 재생성한다.
 */
export async function spawnMistakeReviewTasks(
  accountKey: string,
  sourceId: string,
  mistakeWeaknessIds: WeaknessId[],
  store: ReviewTaskStore,
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
      source: 'weakness-practice',
      sourceId,
      scheduledFor: tomorrow,
      stage: 'day1',
      completed: false,
      createdAt: now,
    });
  }

  await store.saveAll(accountKey, next);
}
