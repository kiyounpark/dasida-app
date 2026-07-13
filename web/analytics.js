// GA4 연결 — window.track(name, params)를 GA4 이벤트로 전달.
// app.js의 logEvent가 이 함수를 호출한다(문제제출·진단완주·CTA클릭 등).
(function () {
  // ↓↓↓ GA4 웹 데이터 스트림의 "측정 ID"만 여기 넣으면 켜짐 (G-XXXXXXXXXX)
  var MEASUREMENT_ID = 'G-FC6DM6V021';

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
