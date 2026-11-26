// Analytics loader: Google Tag Manager (preferred) or Google Analytics 4 directly.
// Does nothing unless an ID is set in SITE_CONFIG, and never runs on local previews.
// Pages call track(name, params) for a few useful events; it is a no-op when analytics is off.
(function () {
  const cfg = window.SITE_CONFIG || {};
  const gtm = cfg.gtmContainerId, ga = cfg.gaMeasurementId;
  window.track = function () {};
  if (/^(localhost|127\.0\.0\.1|\[::1\])$/.test(location.hostname)) return;   // keep test visits out

  function load(src) {
    const s = document.createElement("script");
    s.async = true; s.src = src;
    document.head.appendChild(s);
  }
  window.dataLayer = window.dataLayer || [];

  if (gtm && /^GTM-[A-Z0-9]+$/.test(gtm)) {
    // Standard Tag Manager bootstrap. Custom events arrive in GTM as dataLayer events
    // (event name + params), ready to be sent on to GA4 with a "Custom Event" trigger.
    dataLayer.push({ "gtm.start": new Date().getTime(), event: "gtm.js" });
    load("https://www.googletagmanager.com/gtm.js?id=" + encodeURIComponent(gtm));
    window.track = function (name, params) {
      try { dataLayer.push(Object.assign({ event: name }, params || {})); } catch (e) { /* never break the page */ }
    };
    return;
  }

  if (ga && /^G-[A-Z0-9]+$/.test(ga)) {
    load("https://www.googletagmanager.com/gtag/js?id=" + encodeURIComponent(ga));
    window.gtag = function () { dataLayer.push(arguments); };
    gtag("js", new Date());
    gtag("config", ga, { anonymize_ip: true });
    window.track = function (name, params) {
      try { gtag("event", name, params || {}); } catch (e) { /* never break the page */ }
    };
  }
})();
