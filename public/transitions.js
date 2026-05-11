/* Ghost Signal — Smooth page transitions.
   Pattern modeled on install.doctor: intercept same-origin <a> clicks, fetch
   the target HTML, swap <main> in place inside a View-Transitions wrapper.
   Cross-document `@view-transition { navigation: auto; }` is already set in
   styles.css; this layer adds an SPA-style fadeOut + slideIn fallback for
   browsers without View Transitions and keeps the audio/header persistent. */
(function () {
  'use strict';

  if (window.__ghostTransitionsBooted) return;
  window.__ghostTransitionsBooted = true;

  var prefersReducedMotion =
    window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  var hasViewTransition = typeof document.startViewTransition === 'function';

  // First-paint reveal — let the page entrance animate without flashing.
  document.documentElement.classList.add('gh-page-enter');
  requestAnimationFrame(function () {
    requestAnimationFrame(function () {
      document.documentElement.classList.remove('gh-page-enter');
      document.documentElement.classList.add('gh-page-entered');
    });
  });

  var INTERNAL_NAV_SELECTOR =
    'a[href]:not([target]):not([download]):not([data-no-transition]):not([rel~="external"])';

  function sameOrigin(url) {
    try {
      var u = new URL(url, window.location.href);
      return u.origin === window.location.origin;
    } catch (_) { return false; }
  }

  function isInternalHTML(url) {
    if (!sameOrigin(url)) return false;
    var u = new URL(url, window.location.href);
    if (u.hash && u.pathname === window.location.pathname && u.search === window.location.search) {
      return false; // pure in-page anchor; let browser handle
    }
    var path = u.pathname.toLowerCase();
    if (path.startsWith('/api/') || path.startsWith('/ws/')) return false;
    if (/\.(?:mp4|webm|ogg|mp3|wav|pdf|zip|png|jpe?g|webp|gif|svg|ico|xml|txt|json|webmanifest)$/.test(path)) {
      return false;
    }
    return true;
  }

  function showVeil() {
    if (prefersReducedMotion) return;
    document.documentElement.classList.add('gh-page-leaving');
  }
  function hideVeil() {
    document.documentElement.classList.remove('gh-page-leaving');
    document.documentElement.classList.add('gh-page-entering');
    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        document.documentElement.classList.remove('gh-page-entering');
      });
    });
  }

  function swapDoc(html, targetUrl, push) {
    var parser = new DOMParser();
    var doc = parser.parseFromString(html, 'text/html');
    var nextMain = doc.querySelector('main');
    var currMain = document.querySelector('main');
    if (!nextMain || !currMain) {
      window.location.href = targetUrl;
      return;
    }
    // Replace title + meta description if present.
    if (doc.title) document.title = doc.title;
    var nextDesc = doc.querySelector('meta[name="description"]');
    var currDesc = document.querySelector('meta[name="description"]');
    if (nextDesc && currDesc) currDesc.setAttribute('content', nextDesc.getAttribute('content') || '');
    var nextCanonical = doc.querySelector('link[rel="canonical"]');
    var currCanonical = document.querySelector('link[rel="canonical"]');
    if (nextCanonical && currCanonical) currCanonical.setAttribute('href', nextCanonical.getAttribute('href') || '');

    function doSwap() {
      // Drop any leaflet/xterm instances from the old main to avoid duplicates.
      try {
        if (window.__celestialMap && window.__celestialMap.remove) {
          window.__celestialMap.remove();
          window.__celestialMap = null;
        }
      } catch (_) {}
      currMain.replaceWith(nextMain);
      window.scrollTo({ top: 0, behavior: prefersReducedMotion ? 'auto' : 'instant' });
      // Re-run lightweight enhancers for the new content (idempotent).
      try { if (window.__ghostRescan) window.__ghostRescan(); } catch (_) {}
      // Re-execute any inline <script> tags within the new main.
      var scripts = nextMain.querySelectorAll('script');
      scripts.forEach(function (s) {
        var n = document.createElement('script');
        if (s.src) n.src = s.src; else n.textContent = s.textContent || '';
        Array.from(s.attributes).forEach(function (a) { if (a.name !== 'src') n.setAttribute(a.name, a.value); });
        s.parentNode.replaceChild(n, s);
      });
      hideVeil();
      // Notify listeners (analytics, etc.).
      window.dispatchEvent(new CustomEvent('gh:navigate', { detail: { url: targetUrl } }));
    }

    if (hasViewTransition && !prefersReducedMotion) {
      document.startViewTransition(doSwap);
    } else {
      doSwap();
    }
    if (push) history.pushState({ url: targetUrl }, '', targetUrl);
  }

  function navigate(targetUrl, push) {
    showVeil();
    fetch(targetUrl, { credentials: 'same-origin', headers: { 'Accept': 'text/html' } })
      .then(function (r) {
        if (!r.ok) throw new Error('HTTP ' + r.status);
        return r.text();
      })
      .then(function (html) { swapDoc(html, targetUrl, push); })
      .catch(function () { window.location.href = targetUrl; });
  }

  document.addEventListener('click', function (ev) {
    if (ev.defaultPrevented) return;
    if (ev.button !== 0) return;
    if (ev.metaKey || ev.ctrlKey || ev.shiftKey || ev.altKey) return;
    var a = ev.target && ev.target.closest && ev.target.closest(INTERNAL_NAV_SELECTOR);
    if (!a) return;
    var href = a.getAttribute('href');
    if (!href || href.startsWith('#')) return;
    if (!isInternalHTML(href)) return;
    ev.preventDefault();
    var url = new URL(href, window.location.href).href;
    navigate(url, true);
  }, { passive: false });

  window.addEventListener('popstate', function (ev) {
    var url = (ev.state && ev.state.url) ? ev.state.url : window.location.href;
    navigate(url, false);
  });

  // Hint browser to preload likely-next pages on hover/touch.
  function preconnectAndPrefetch(url) {
    try {
      var u = new URL(url, window.location.href);
      if (u.origin !== window.location.origin) return;
      if (document.querySelector('link[rel="prefetch"][href="' + u.pathname + '"]')) return;
      var link = document.createElement('link');
      link.rel = 'prefetch';
      link.as = 'document';
      link.href = u.pathname + u.search;
      document.head.appendChild(link);
    } catch (_) {}
  }
  document.addEventListener('pointerenter', function (ev) {
    var a = ev.target && ev.target.closest && ev.target.closest(INTERNAL_NAV_SELECTOR);
    if (a && a.href && isInternalHTML(a.href)) preconnectAndPrefetch(a.href);
  }, { capture: true });
  document.addEventListener('touchstart', function (ev) {
    var a = ev.target && ev.target.closest && ev.target.closest(INTERNAL_NAV_SELECTOR);
    if (a && a.href && isInternalHTML(a.href)) preconnectAndPrefetch(a.href);
  }, { capture: true, passive: true });
})();
