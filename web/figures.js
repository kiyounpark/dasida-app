// 진단 대화에 삽입되는 개념 그림 (정적 SVG, 신뢰된 로컬 데이터)
window.FIGURES = {
  // 삼차함수 + 수평선: 가장 큰 실근이 극솟값 아래로 내려가는 순간 점프
  cubic: `
<svg viewBox="0 0 300 195" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="삼차함수와 수평선 그림">
  <path d="M 12 175 C 45 60 80 28 105 55 C 130 82 138 148 172 148 C 206 148 232 96 288 26"
        fill="none" stroke="#243229" stroke-width="2.5" stroke-linecap="round"/>
  <line x1="14" y1="100" x2="286" y2="100" stroke="#5C8C5A" stroke-width="1.5" stroke-dasharray="5 4"/>
  <circle cx="32" cy="100" r="3.5" fill="#AECBAA"/>
  <circle cx="120" cy="100" r="3.5" fill="#AECBAA"/>
  <circle cx="237" cy="100" r="5" fill="#2F9E44"/>
  <text x="232" y="88" text-anchor="end" font-size="10.5" font-weight="700" fill="#2F9E44">가장 큰 실근</text>
  <line x1="14" y1="148" x2="286" y2="148" stroke="#8A958B" stroke-width="1.2" stroke-dasharray="3 4"/>
  <text x="288" y="143" text-anchor="end" font-size="10" fill="#8A958B">극솟값</text>
  <circle cx="172" cy="148" r="4" fill="#243229"/>
  <path d="M 163 154 Q 95 186 30 154" fill="none" stroke="#D64545" stroke-width="1.6" stroke-dasharray="4 3"/>
  <path d="M 36 147 L 27 156 L 39 158 Z" fill="#D64545"/>
  <circle cx="20" cy="150" r="5" fill="#D64545"/>
  <text x="97" y="183" text-anchor="middle" font-size="11" font-weight="800" fill="#D64545">아래로 내려가는 순간, 점프!</text>
</svg>`,

  // 위로 볼록한 포물선 k(t): 꼭짓점 접함 = 딱 한 번 / 두 번 가로지르면 불연속 2곳
  parabola: `
<svg viewBox="0 0 300 170" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="위로 볼록한 포물선과 수평선 그림">
  <path d="M 30 160 Q 150 -60 270 160" fill="none" stroke="#243229" stroke-width="2.5" stroke-linecap="round"/>
  <line x1="20" y1="50" x2="280" y2="50" stroke="#2F9E44" stroke-width="1.5" stroke-dasharray="5 4"/>
  <circle cx="150" cy="50" r="5" fill="#2F9E44"/>
  <text x="150" y="38" text-anchor="middle" font-size="10.5" font-weight="700" fill="#2F9E44">꼭짓점에서 접함 = 딱 한 번 (t=3)</text>
  <line x1="20" y1="110" x2="280" y2="110" stroke="#D64545" stroke-width="1.4" stroke-dasharray="4 3"/>
  <circle cx="61" cy="110" r="4.5" fill="#D64545"/>
  <circle cx="239" cy="110" r="4.5" fill="#D64545"/>
  <text x="150" y="130" text-anchor="middle" font-size="10.5" font-weight="700" fill="#D64545">두 번 만나면 불연속 2곳 ✗</text>
</svg>`,
};
