"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.REVIEW_STAGE_OFFSETS = exports.REVIEW_STAGE_ORDER = void 0;
exports.formatReviewStageLabel = formatReviewStageLabel;
exports.getNextReviewStage = getNextReviewStage;
exports.REVIEW_STAGE_ORDER = ['day1', 'day3', 'day7', 'day30'];
exports.REVIEW_STAGE_OFFSETS = {
    day1: 1,
    day3: 3,
    day7: 7,
    day30: 30,
};
function formatReviewStageLabel(stage) {
    switch (stage) {
        case 'day1':
            return 'DAY 1';
        case 'day3':
            return 'DAY 3';
        case 'day7':
            return 'DAY 7';
        case 'day30':
            return 'DAY 30';
    }
}
function getNextReviewStage(stage) {
    const stageIndex = exports.REVIEW_STAGE_ORDER.indexOf(stage);
    if (stageIndex === -1 || stageIndex >= exports.REVIEW_STAGE_ORDER.length - 1) {
        return null;
    }
    return exports.REVIEW_STAGE_ORDER[stageIndex + 1];
}
