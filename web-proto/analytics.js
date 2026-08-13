// GA4 연결 — window.track(name, params)를 GA4 이벤트로 전달.
// app.js의 logEvent가 이 함수를 호출한다(사진제출·노트도달·수요버튼·스토어클릭).
// 속성은 web/(구버전 랜딩, G-FC6DM6V021)과 분리한다 — 두 페이지 트래픽이 섞이면
// 5호 성과를 볼 때마다 URL 필터를 걸어야 하고, store_click은 이름까지 겹친다.
// Netlify가 web-proto 폴더만 배포해도 되도록 참조가 아니라 사본으로 둔다.
(function () {
  // GA4 속성 "다시다 웹 프로토(사진)" / 스트림 "웹프로토(사진)" (시간대 KST)
  var MEASUREMENT_ID = 'G-4HW2VRNME0';

  if (MEASUREMENT_ID === 'G-PLACEHOLDER') return; // ID 넣기 전엔 아무 것도 안 함

  // 검증 트래픽 분리 (2026.08.13) — 실제 세션이 한 자릿수라(5호 104명 중 2세션, 08.04)
  // 우리가 몇 번만 눌러도 깔때기 숫자가 통째로 거짓말이 된다. GA는 지난 데이터를 못 지운다.
  // ① 로컬에서 여는 건 아예 안 쏜다 ② 배포본도 주소에 ?qa=1을 한 번 붙이면 그 브라우저는 계속 빠진다.
  var host = location.hostname;
  var isLocal = host === 'localhost' || host === '127.0.0.1' || host === '[::1]' || host === '';
  var isQa = false;
  try {
    var qa = new URLSearchParams(location.search).get('qa');
    if (qa !== null) {
      // ?qa=0 · ?qa=off 는 해제. 나가는 길이 없으면 QA 링크가 한 번 새는 순간
      // 진짜 학생 하나가 영영 깔때기에서 빠진다 — 세션이 한 자릿수라 방향이 정반대다.
      if (qa === '0' || qa === 'off') localStorage.removeItem('dasida_qa');
      else localStorage.setItem('dasida_qa', '1');
    }
    isQa = localStorage.getItem('dasida_qa') === '1';
  } catch (_e) {
    isQa = false; // 사파리 프라이빗 등에서 막히면 그냥 일반 방문자로 둔다
  }

  if (isLocal || isQa) {
    // gtag를 아예 안 켠다. app.js의 logEvent는 window.track이 없어도 조용히 넘어가지만(app.js:20),
    // 나중에 track을 직접 부르는 코드가 생겨도 안 터지도록 빈 함수를 남겨둔다.
    window.track = function () {};
    return;
  }

  var s = document.createElement('script');
  s.async = true;
  s.src = 'https://www.googletagmanager.com/gtag/js?id=' + MEASUREMENT_ID;
  document.head.appendChild(s);

  window.dataLayer = window.dataLayer || [];
  function gtag() { window.dataLayer.push(arguments); }
  gtag('js', new Date());
  gtag('config', MEASUREMENT_ID);

  window.track = function (name, params) {
    gtag('event', name, params || {});
  };
})();
