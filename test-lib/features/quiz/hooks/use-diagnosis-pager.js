"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.useDiagnosisPager = useDiagnosisPager;
const react_1 = require("react");
function useDiagnosisPager({ diagnosisPageWidth, diagnosisPages, isDiagnosing, }) {
    const diagnosisPagerRef = (0, react_1.useRef)(null);
    const diagnosisScrollOffsetsRef = (0, react_1.useRef)({});
    const diagnosisHasInteractedRef = (0, react_1.useRef)({});
    const diagnosisPendingAutoScrollRef = (0, react_1.useRef)({});
    const diagnosisPendingRestoreRef = (0, react_1.useRef)({});
    const activeDiagnosisAnswerIndexRef = (0, react_1.useRef)(null);
    const [activeDiagnosisPageIndex, setActiveDiagnosisPageIndex] = (0, react_1.useState)(0);
    (0, react_1.useEffect)(() => {
        if (!isDiagnosing) {
            setActiveDiagnosisPageIndex(0);
            diagnosisScrollOffsetsRef.current = {};
            diagnosisHasInteractedRef.current = {};
            diagnosisPendingAutoScrollRef.current = {};
            diagnosisPendingRestoreRef.current = {};
            activeDiagnosisAnswerIndexRef.current = null;
            return;
        }
        setActiveDiagnosisPageIndex((prev) => Math.min(prev, Math.max(diagnosisPages.length - 1, 0)));
    }, [diagnosisPages.length, isDiagnosing]);
    (0, react_1.useEffect)(() => {
        if (!isDiagnosing || diagnosisPages.length === 0) {
            return;
        }
        const targetIndex = Math.min(activeDiagnosisPageIndex, diagnosisPages.length - 1);
        if (targetIndex < 0) {
            return;
        }
        const timeoutId = setTimeout(() => {
            diagnosisPagerRef.current?.scrollToIndex({
                animated: false,
                index: targetIndex,
            });
        }, 0);
        return () => {
            clearTimeout(timeoutId);
        };
    }, [activeDiagnosisPageIndex, diagnosisPageWidth, diagnosisPages.length, isDiagnosing]);
    (0, react_1.useEffect)(() => {
        activeDiagnosisAnswerIndexRef.current =
            diagnosisPages[activeDiagnosisPageIndex]?.answerIndex ?? null;
    }, [activeDiagnosisPageIndex, diagnosisPages]);
    const hasStoredDiagnosisOffset = (answerIndex) => Object.prototype.hasOwnProperty.call(diagnosisScrollOffsetsRef.current, answerIndex);
    const shouldRestoreDiagnosisOffset = (answerIndex) => diagnosisHasInteractedRef.current[answerIndex] === true &&
        hasStoredDiagnosisOffset(answerIndex);
    const setDiagnosisInteracted = (answerIndex) => {
        diagnosisHasInteractedRef.current[answerIndex] = true;
    };
    const requestDiagnosisAutoScroll = (answerIndex) => {
        if (activeDiagnosisAnswerIndexRef.current !== answerIndex) {
            return;
        }
        diagnosisPendingAutoScrollRef.current[answerIndex] = true;
    };
    const requestDiagnosisRestore = (answerIndex) => {
        if (shouldRestoreDiagnosisOffset(answerIndex)) {
            diagnosisPendingRestoreRef.current[answerIndex] = true;
            return;
        }
        delete diagnosisPendingRestoreRef.current[answerIndex];
    };
    const scrollToDiagnosisPage = (pageIndex, animated = true) => {
        if (pageIndex < 0 || pageIndex >= diagnosisPages.length) {
            return;
        }
        const targetAnswerIndex = diagnosisPages[pageIndex]?.answerIndex;
        if (targetAnswerIndex !== undefined) {
            requestDiagnosisRestore(targetAnswerIndex);
        }
        setActiveDiagnosisPageIndex(pageIndex);
        diagnosisPagerRef.current?.scrollToIndex({
            animated,
            index: pageIndex,
        });
    };
    const handleDiagnosisMomentumEnd = (event) => {
        const nextPageIndex = Math.round(event.nativeEvent.contentOffset.x / diagnosisPageWidth);
        if (nextPageIndex !== activeDiagnosisPageIndex) {
            const targetAnswerIndex = diagnosisPages[nextPageIndex]?.answerIndex;
            if (targetAnswerIndex !== undefined) {
                requestDiagnosisRestore(targetAnswerIndex);
            }
            setActiveDiagnosisPageIndex(nextPageIndex);
        }
    };
    const handleDiagnosisScrollOffsetChange = (answerIndex, offsetY) => {
        diagnosisScrollOffsetsRef.current[answerIndex] = Math.max(offsetY, 0);
    };
    const handleDiagnosisAutoScrollHandled = (answerIndex) => {
        delete diagnosisPendingAutoScrollRef.current[answerIndex];
    };
    const handleDiagnosisRestoreHandled = (answerIndex) => {
        delete diagnosisPendingRestoreRef.current[answerIndex];
    };
    return {
        activeDiagnosisPageIndex,
        diagnosisPagerRef,
        diagnosisPendingAutoScrollRef,
        diagnosisPendingRestoreRef,
        diagnosisScrollOffsetsRef,
        handleDiagnosisAutoScrollHandled,
        handleDiagnosisMomentumEnd,
        handleDiagnosisRestoreHandled,
        handleDiagnosisScrollOffsetChange,
        hasStoredDiagnosisOffset,
        requestDiagnosisAutoScroll,
        requestDiagnosisRestore,
        scrollToDiagnosisPage,
        setActiveDiagnosisPageIndex,
        setDiagnosisInteracted,
    };
}
