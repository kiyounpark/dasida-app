"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.useExamSelectionScreen = useExamSelectionScreen;
const react_1 = require("react");
const react_native_1 = require("react-native");
const expo_router_1 = require("expo-router");
const provider_1 = require("@/features/learner/provider");
const exam_catalog_1 = require("../../../features/quiz/data/exam-catalog");
function useExamSelectionScreen() {
    const { profile } = (0, provider_1.useCurrentLearner)();
    const { width } = (0, react_native_1.useWindowDimensions)();
    const isCompactLayout = width < 390;
    const rawGrade = profile?.grade;
    const grade = rawGrade === 'g1' || rawGrade === 'g2' || rawGrade === 'g3' ? rawGrade : 'g3';
    const isG3 = grade === 'g3';
    const [selectedType, setSelectedType] = (0, react_1.useState)(isG3 ? 'mock' : 'academic');
    const [selectedSubject, setSelectedSubject] = (0, react_1.useState)(isG3 ? 'stats' : null);
    const examItems = exam_catalog_1.EXAM_CATALOG.filter((e) => {
        if (e.grade !== grade)
            return false;
        if (e.type !== selectedType)
            return false;
        if (isG3 && selectedSubject && e.subject !== selectedSubject)
            return false;
        return true;
    });
    const onSelectExam = (examId) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        expo_router_1.router.push({ pathname: '/quiz/exam/solve', params: { examId } });
    };
    return {
        isCompactLayout,
        showTypeToggle: isG3,
        selectedType,
        selectedSubject,
        onSelectType: setSelectedType,
        onSelectSubject: setSelectedSubject,
        examItems,
        onSelectExam,
        onBack: () => expo_router_1.router.back(),
    };
}
