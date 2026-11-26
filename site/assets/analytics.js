// Google Analytics 4 loader. Does nothing unless SITE_CONFIG.gaMeasurementId is set.
// Pages call track(name, params) for a few useful events; it is a no-op when GA is off.
(function () {
  const id = (window.SITE_CONFIG || {}).gaMeasurementId;
  window.track = function () {};
  if (!id || !/^G-[A-Z0-9]+$/.test(id)) return;
  // Skip local previews so testing doesn't pollute the numbers.
  if (/^(localhost|127\.0\.0\.1|\[::1\])$/.test(location.hostname)) return;

  const s = document.createElement("script");
  s.async = true;
  s.src = "https://www.googletagmanager.com/gtag/js?id=" + encodeURIComponent(id);
  document.head.appendChild(s);

  window.dataLayer = window.dataLayer || [];
  window.gtag = function () { dataLayer.push(arguments); };
  gtag("js", new Date());
  gtag("config", id, { anonymize_ip: true });
  window.track = function (name, params) {
    try { gtag("event", name, params || {}); } catch (e) { /* never break the page */ }
  };
})();
