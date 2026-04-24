"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getSingleParam = getSingleParam;
function getSingleParam(value) {
    return Array.isArray(value) ? value[0] : value;
}
