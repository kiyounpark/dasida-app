"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.useMockExamIntroScreen = useMockExamIntroScreen;
const expo_router_1 = require("expo-router");
function useMockExamIntroScreen() {
    const onStartExam = () => {
        expo_router_1.router.push('/(tabs)/quiz/exams');
    };
    return { onStartExam };
}
