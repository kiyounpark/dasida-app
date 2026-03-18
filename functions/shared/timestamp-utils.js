function parseTimestamp(value) {
  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? null : parsed;
}

function compareTimestampsAsc(left, right) {
  const leftTimestamp = parseTimestamp(left);
  const rightTimestamp = parseTimestamp(right);

  if (leftTimestamp !== null && rightTimestamp !== null && leftTimestamp !== rightTimestamp) {
    return leftTimestamp - rightTimestamp;
  }

  return left.localeCompare(right);
}

function compareTimestampsDesc(left, right) {
  return compareTimestampsAsc(right, left);
}

function isTimestampOnOrAfter(left, right) {
  return compareTimestampsAsc(left, right) >= 0;
}

function isTimestampOnOrBefore(left, right) {
  return compareTimestampsAsc(left, right) <= 0;
}

module.exports = {
  compareTimestampsAsc,
  compareTimestampsDesc,
  isTimestampOnOrAfter,
  isTimestampOnOrBefore,
};
