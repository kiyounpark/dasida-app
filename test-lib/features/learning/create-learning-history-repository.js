"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isLearningHistoryRemoteCrudConfigured = isLearningHistoryRemoteCrudConfigured;
exports.isLearningHistoryImportConfigured = isLearningHistoryImportConfigured;
exports.createLearningHistoryRepository = createLearningHistoryRepository;
const env_1 = require("../../constants/env");
const firebase_learning_history_repository_1 = require("./firebase-learning-history-repository");
const local_learning_history_repository_1 = require("./local-learning-history-repository");
const learning_history_repository_router_1 = require("./learning-history-repository-router");
function isLearningHistoryRemoteCrudConfigured() {
    return Boolean(env_1.learningHistoryRecordAttemptUrl &&
        env_1.learningHistoryGetLearnerSummaryUrl &&
        env_1.learningHistorySaveFeaturedExamStateUrl &&
        env_1.learningHistoryListLearningAttemptsUrl &&
        env_1.learningHistoryGetLearningAttemptResultsUrl &&
        env_1.learningHistoryListReviewTasksUrl);
}
function isLearningHistoryImportConfigured() {
    return Boolean(env_1.learningHistoryImportLocalSnapshotUrl);
}
function createLearningHistoryRepository(authClient) {
    const localRepository = new local_learning_history_repository_1.LocalLearningHistoryRepository();
    const remoteRepository = isLearningHistoryRemoteCrudConfigured()
        ? new firebase_learning_history_repository_1.FirebaseLearningHistoryRepository({
            authClient,
            recordLearningAttemptUrl: env_1.learningHistoryRecordAttemptUrl,
            getLearnerSummaryUrl: env_1.learningHistoryGetLearnerSummaryUrl,
            saveFeaturedExamStateUrl: env_1.learningHistorySaveFeaturedExamStateUrl,
            listLearningAttemptsUrl: env_1.learningHistoryListLearningAttemptsUrl,
            getLearningAttemptResultsUrl: env_1.learningHistoryGetLearningAttemptResultsUrl,
            listReviewTasksUrl: env_1.learningHistoryListReviewTasksUrl,
        })
        : null;
    return new learning_history_repository_router_1.LearningHistoryRepositoryRouter({
        authClient,
        localRepository,
        remoteRepository,
    });
}
