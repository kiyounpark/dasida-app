// Firestore는 undefined 값을 거부한다. firebase-admin 13.x의
// initializeFirestore는 ignoreUndefinedProperties를 지원하지 않으므로
// write 직전에 이 함수로 undefined 키를 재귀 제거해야 한다.
export function stripUndefined<T>(value: T): T {
  if (Array.isArray(value)) {
    return value.map((item) => stripUndefined(item)) as unknown as T;
  }
  if (value !== null && typeof value === 'object') {
    const result: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
      if (val !== undefined) {
        result[key] = stripUndefined(val);
      }
    }
    return result as T;
  }
  return value;
}
