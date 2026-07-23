// 인메모리 슬라이딩 윈도우 속도 제한.
// Cloud Functions 인스턴스별 근사치지만, diagnoseFlow는 maxInstances가 낮아 실효적 상한으로 동작한다.
// 목적: 트리 전수 크롤링(BFS)에 필요한 수천 건의 연속 요청을 실용적으로 불가능하게 만든다.
export class SlidingWindowLimiter {
  private readonly hits = new Map<string, number[]>();

  constructor(
    private readonly limit: number,
    private readonly windowMs: number,
    private readonly maxKeys = 10_000,
  ) {}

  /** key(IP)의 이번 요청을 허용하면 true. now는 epoch ms. */
  allow(key: string, now: number): boolean {
    const cutoff = now - this.windowMs;
    let arr = this.hits.get(key);
    if (!arr) {
      if (this.hits.size >= this.maxKeys) this.evict(cutoff);
      arr = [];
      this.hits.set(key, arr);
    }
    while (arr.length > 0 && arr[0] <= cutoff) arr.shift();
    if (arr.length >= this.limit) return false;
    arr.push(now);
    return true;
  }

  /** 만료 키 청소 — 키 수 상한으로 메모리 누수를 막는다. */
  private evict(cutoff: number): void {
    for (const [key, arr] of this.hits) {
      while (arr.length > 0 && arr[0] <= cutoff) arr.shift();
      if (arr.length === 0) this.hits.delete(key);
    }
    if (this.hits.size >= this.maxKeys) {
      const oldest = this.hits.keys().next();
      if (!oldest.done) this.hits.delete(oldest.value);
    }
  }
}
