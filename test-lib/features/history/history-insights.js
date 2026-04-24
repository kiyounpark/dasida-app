"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildHistoryInsights = buildHistoryInsights;
const timestamp_utils_1 = require("@/functions/shared/timestamp-utils");
const diagnosisMap_1 = require("../../data/diagnosisMap");
const STAGE_LABELS = {
    day1: '1단계',
    day3: '2단계',
    day7: '3단계',
    day30: '4단계',
};
const STAGE_PROGRESS = {
    day1: 0.25,
    day3: 0.5,
    day7: 0.75,
    day30: 1.0,
};
function getWeaknessLabel(weaknessId) {
    if (!weaknessId)
        return '기록 없음';
    return diagnosisMap_1.diagnosisMap[weaknessId]?.labelKo ?? '알 수 없는 약점';
}
function formatDateTime(timestamp) {
    return new Intl.DateTimeFormat('ko-KR', {
        month: 'numeric',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
    }).format(new Date(timestamp));
}
function formatNextLabel(scheduledFor, isDue) {
    if (isDue)
        return '오늘 복습';
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const scheduled = new Date(scheduledFor);
    scheduled.setHours(0, 0, 0, 0);
    const diffDays = Math.round((scheduled.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays <= 0)
        return '오늘 복습';
    if (diffDays === 1)
        return '내일 복습';
    return `${diffDays}일 후 복습`;
}
function buildHero(summary, attempts, isLoadingAttempts) {
    const dueReviewTasks = summary.dueReviewTasks ?? [];
    const hasDue = dueReviewTasks.length > 0;
    const dueWeaknesses = dueReviewTasks.slice(0, 3).map((task) => ({
        weaknessId: task.weaknessId,
        label: getWeaknessLabel(task.weaknessId),
        stageLabel: STAGE_LABELS[task.stage],
    }));
    const sorted = [...attempts].sort((a, b) => (0, timestamp_utils_1.compareTimestampsAsc)(a.completedAt, b.completedAt));
    let accuracyValue = '—';
    let accuracyBadgeText = null;
    let accuracyBadgeTone = 'neutral';
    if (!isLoadingAttempts && sorted.length > 0) {
        const latest = sorted[sorted.length - 1];
        accuracyValue = `${latest.accuracy}%`;
        if (sorted.length >= 2) {
            const previous = sorted[sorted.length - 2];
            const delta = latest.accuracy - previous.accuracy;
            accuracyBadgeText = delta >= 0 ? `▲ +${delta}%p` : `▼ ${Math.abs(delta)}%p`;
            accuracyBadgeTone = delta >= 0 ? 'positive' : 'warning';
        }
    }
    let ctaLabel;
    if (hasDue) {
        ctaLabel =
            dueReviewTasks.length > 1
                ? `오늘 복습 ${dueReviewTasks.length}개 시작하기 →`
                : '오늘 복습 시작하기 →';
    }
    else if (summary.latestDiagnosticSummary) {
        ctaLabel = '빠른 재진단 하기 →';
    }
    else {
        ctaLabel = '첫 진단 시작하기 →';
    }
    return {
        reviewAttempts: summary.totals.reviewAttempts,
        dueWeaknesses,
        accuracyValue,
        accuracyBadgeText,
        accuracyBadgeTone,
        ctaLabel,
        ctaKind: hasDue ? 'review' : 'diagnostic',
    };
}
function buildWeaknessProgress(summary) {
    const dueReviewTasks = summary.dueReviewTasks ?? [];
    const dueIds = new Set(dueReviewTasks.map((t) => t.weaknessId));
    const allTasks = [
        ...dueReviewTasks,
        ...(summary.nextReviewTask && !dueIds.has(summary.nextReviewTask.weaknessId)
            ? [summary.nextReviewTask]
            : []),
    ];
    return allTasks.slice(0, 4).map((task) => {
        const isDue = dueIds.has(task.weaknessId);
        return {
            weaknessId: task.weaknessId,
            label: getWeaknessLabel(task.weaknessId),
            stageLabel: STAGE_LABELS[task.stage],
            progressRatio: STAGE_PROGRESS[task.stage],
            isDue,
            nextLabel: formatNextLabel(task.scheduledFor, isDue),
        };
    });
}
function buildPulseItems(summary) {
    return summary.recentActivity.slice(0, 3).map((item) => {
        const kindLabel = item.kind === 'diagnostic' ? '진단' : item.kind === 'review' ? '복습' : '실전';
        return {
            id: item.id,
            kind: item.kind,
            kindLabel,
            title: item.title,
            occurredAtLabel: formatDateTime(item.occurredAt),
            valueBadge: item.kind === 'diagnostic' ? item.subtitle : null,
        };
    });
}
function buildHistoryInsights(summary, recentDiagnosticAttempts, options) {
    return {
        hero: buildHero(summary, recentDiagnosticAttempts, options?.isLoadingAttempts ?? false),
        weaknessProgress: buildWeaknessProgress(summary),
        pulseItems: buildPulseItems(summary),
    };
}
