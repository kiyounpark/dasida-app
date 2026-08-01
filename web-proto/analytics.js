// GA4 연결 — window.track(name, params)를 GA4 이벤트로 전달.
// app.js의 logEvent가 이 함수를 호출한다(사진제출·노트도달·수요버튼·스토어클릭).
// 속성은 web/(구버전 랜딩, G-FC6DM6V021)과 분리한다 — 두 페이지 트래픽이 섞이면
// 5호 성과를 볼 때마다 URL 필터를 걸어야 하고, store_click은 이름까지 겹친다.
// Netlify가 web-proto 폴더만 배포해도 되도록 참조가 아니라 사본으로 둔다.
(function () {
  // GA4 속성 "다시다 웹 프로토(사진)" / 스트림 "웹프로토(사진)" (시간대 KST)
  var MEASUREMENT_ID = 'G-4HW2VRNME0';

  if (MEASUREMENT_ID === 'G-PLACEHOLDER') return; // ID 넣기 전엔 아무 것도 안 함

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
