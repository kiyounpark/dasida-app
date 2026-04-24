"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.completeReviewTask = completeReviewTask;
exports.rescheduleReviewTask = rescheduleReviewTask;
exports.applyOverduePenalties = applyOverduePenalties;
// features/learning/review-scheduler.ts
const review_stage_1 = require("./review-stage");
function toDateString(date) {
    return date.toISOString().split('T')[0];
}
function addDaysToToday(days) {
    const d = new Date();
    d.setUTCDate(d.getUTCDate() + days);
    return toDateString(d);
}
/**
 * "기억났어요!" — 현재 task를 완료 처리하고 다음 stage task를 생성한다.
 * day30 완료 시 다음 task 없이 완전 졸업.
 */
async function completeReviewTask(accountKey, taskId, store) {
    const tasks = await store.load(accountKey);
    const task = tasks.find((t) => t.id === taskId);
    if (!task) {
        console.warn('[review-scheduler] completeReviewTask: task not found', taskId);
        return;
    }
    const now = new Date().toISOString();
    const completedTask = { ...task, completed: true, completedAt: now };
    const nextStage = (0, review_stage_1.getNextReviewStage)(task.stage);
    if (!nextStage) {
        // day30 완료 → 졸업
        await store.saveAll(accountKey, tasks.map((t) => (t.id === taskId ? completedTask : t)));
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
            scheduledFor: addDaysToToday(review_stage_1.REVIEW_STAGE_OFFSETS[nextStage]),
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
async function rescheduleReviewTask(accountKey, taskId, store) {
    const tasks = await store.load(accountKey);
    const task = tasks.find((t) => t.id === taskId);
    if (!task) {
        console.warn('[review-scheduler] rescheduleReviewTask: task not found', taskId);
        return;
    }
    const updated = tasks.map((t) => t.id === taskId
        ? { ...t, scheduledFor: addDaysToToday(review_stage_1.REVIEW_STAGE_OFFSETS[t.stage]) }
        : t);
    await store.saveAll(accountKey, updated);
}
/**
 * 앱 시작 시 기한 초과(overdue) task의 stage를 한 단계 하락시킨다.
 * day1 초과는 day1 유지.
 */
async function applyOverduePenalties(accountKey, store) {
    const tasks = await store.load(accountKey);
    const today = toDateString(new Date());
    const updated = tasks.map((task) => {
        if (task.completed || task.scheduledFor >= today) {
            return task;
        }
        const currentIndex = review_stage_1.REVIEW_STAGE_ORDER.indexOf(task.stage);
        const newStage = currentIndex > 0 ? review_stage_1.REVIEW_STAGE_ORDER[currentIndex - 1] : 'day1';
        return {
            ...task,
            stage: newStage,
            scheduledFor: addDaysToToday(review_stage_1.REVIEW_STAGE_OFFSETS[newStage]),
        };
    });
    await store.saveAll(accountKey, updated);
}
