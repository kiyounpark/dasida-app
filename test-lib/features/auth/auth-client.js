"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthFlowCancelledError = void 0;
class AuthFlowCancelledError extends Error {
    constructor(message = 'Authentication was cancelled.') {
        super(message);
        this.name = 'AuthFlowCancelledError';
    }
}
exports.AuthFlowCancelledError = AuthFlowCancelledError;
