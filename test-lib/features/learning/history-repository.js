"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DEFAULT_FEATURED_EXAM_ID = void 0;
exports.createDefaultFeaturedExamState = createDefaultFeaturedExamState;
exports.createEmptyLearnerSummary = createEmptyLearnerSummary;
exports.DEFAULT_FEATURED_EXAM_ID = 'featured-mock-1';
function createDefaultFeaturedExamState() {
    return {
        examId: exports.DEFAULT_FEATURED_EXAM_ID,
        status: 'not_started',
    };
}
function createEmptyLearnerSummary(accountKey) {
    return {
        accountKey,
        updatedAt: new Date().toISOString(),
        repeatedWeaknesses: [],
        dueReviewTasks: [],
        featuredExamState: createDefaultFeaturedExamState(),
        totals: {
            diagnosticAttempts: 0,
            featuredExamAttempts: 0,
            reviewAttempts: 0,
        },
        recentActivity: [],
    };
}
