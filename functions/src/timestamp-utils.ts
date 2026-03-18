import { existsSync } from 'node:fs';
import path from 'node:path';

type TimestampUtilsModule = typeof import('../shared/timestamp-utils.js');

function resolveSharedTimestampUtilsPath() {
  const candidates = [
    path.resolve(__dirname, '../shared/timestamp-utils.js'),
    path.resolve(__dirname, '../../shared/timestamp-utils.js'),
  ];

  const resolvedPath = candidates.find((candidate) => existsSync(candidate));
  if (!resolvedPath) {
    throw new Error('Shared timestamp utils module not found.');
  }

  return resolvedPath;
}

const sharedTimestampUtils = require(resolveSharedTimestampUtilsPath()) as TimestampUtilsModule;

export const compareTimestampsAsc = sharedTimestampUtils.compareTimestampsAsc;
export const compareTimestampsDesc = sharedTimestampUtils.compareTimestampsDesc;
export const isTimestampOnOrAfter = sharedTimestampUtils.isTimestampOnOrAfter;
export const isTimestampOnOrBefore = sharedTimestampUtils.isTimestampOnOrBefore;
