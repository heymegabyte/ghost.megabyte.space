/* Ghost Signal — UX enhancements: reading progress, back-to-top, Konami, SW update toast, console glyph */
(function () {
  'use strict';

  var prefersReducedMotion =
    window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // 1. Console branding + Easter egg hint
  try {
    var titleStyle = 'font:900 28px "Cinzel","Times New Roman",serif;color:#FF1744;text-shadow:0 0 12px rgba(255,23,68,0.55),0 0 32px rgba(124,58,237,0.45);padding:8px 0;';
    var bodyStyle = 'font:500 12px "Inter",system-ui;color:#00E5FF;line-height:1.6;';
    var muteStyle = 'font:400 11px "Inter",system-ui;color:#7C3AED;';
    console.log('%cGHOST // SIGNAL', titleStyle);
    console.log('%cYou found the console.\nThe sensor is real. The hotline is (601) 666-6602.\nEvery call is recorded. Every reading is public.', bodyStyle);
    console.log('%cTry the Konami code on the page. ↑ ↑ ↓ ↓ ← → ← → B A', muteStyle);
    console.log('%cContribute, report a bug, or just say hi: hey@megabyte.space\nGitHub: https://github.com/HeyMegabyte', muteStyle);
  } catch (e) {}

  // 2. Reading progress bar
  var progressBar = document.querySelector('.reading-progress-bar');
  if (progressBar) {
    var ticking = false;
    var updateProgress = function () {
      var doc = document.documentElement;
      var scrollTop = window.scrollY || doc.scrollTop;
      var scrollHeight = doc.scrollHeight - doc.clientHeight;
      var pct = scrollHeight > 0 ? Math.min(100, Math.max(0, (scrollTop / scrollHeight) * 100)) : 0;
      progressBar.style.transform = 'scaleX(' + (pct / 100).toFixed(4) + ')';
      ticking = false;
    };
    window.addEventListener('scroll', function () {
      if (!ticking) {
        window.requestAnimationFrame(updateProgress);
        ticking = true;
      }
    }, { passive: true });
    updateProgress();
  }

  // 3. Back-to-top
  var backToTop = document.getElementById('back-to-top');
  if (backToTop) {
    var threshold = 600;
    var visible = false;
    var updateButton = function () {
      var should = (window.scrollY || document.documentElement.scrollTop) > threshold;
      if (should !== visible) {
        visible = should;
        backToTop.hidden = !should;
        backToTop.classList.toggle('is-visible', should);
      }
    };
    window.addEventListener('scroll', updateButton, { passive: true });
    backToTop.addEventListener('click', function () {
      window.scrollTo({ top: 0, behavior: prefersReducedMotion ? 'auto' : 'smooth' });
    });
    updateButton();
  }

  // 4. Konami code: ↑ ↑ ↓ ↓ ← → ← → B A
  var konami = ['ArrowUp','ArrowUp','ArrowDown','ArrowDown','ArrowLeft','ArrowRight','ArrowLeft','ArrowRight','b','a'];
  var konamiIdx = 0;
  document.addEventListener('keydown', function (e) {
    var key = e.key.length === 1 ? e.key.toLowerCase() : e.key;
    if (key === konami[konamiIdx]) {
      konamiIdx += 1;
      if (konamiIdx === konami.length) {
        konamiIdx = 0;
        triggerKonami();
      }
    } else {
      konamiIdx = key === konami[0] ? 1 : 0;
    }
  });
  function triggerKonami() {
    document.documentElement.classList.add('konami-active');
    var notice = document.createElement('div');
    notice.className = 'konami-notice';
    notice.setAttribute('role', 'status');
    notice.setAttribute('aria-live', 'polite');
    notice.innerHTML =
      '<div class="konami-notice-inner">' +
      '<strong>SIGNAL UNLOCKED</strong>' +
      '<p>The entropy is yours. Call <a href="tel:+16016666602">(601) 666-6602</a>.</p>' +
      '</div>';
    document.body.appendChild(notice);
    setTimeout(function () { notice.classList.add('is-out'); }, 3500);
    setTimeout(function () { notice.remove(); document.documentElement.classList.remove('konami-active'); }, 4400);
  }

  // 5. Service worker update toast
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js').then(function (reg) {
      function notify(worker) {
        var toast = document.createElement('div');
        toast.className = 'sw-update-toast';
        toast.setAttribute('role', 'status');
        toast.setAttribute('aria-live', 'polite');
        toast.innerHTML =
          '<span>New version available.</span>' +
          '<button type="button" class="sw-update-refresh">Refresh</button>' +
          '<button type="button" class="sw-update-dismiss" aria-label="Dismiss">×</button>';
        toast.querySelector('.sw-update-refresh').addEventListener('click', function () {
          worker.postMessage({ type: 'SKIP_WAITING' });
        });
        toast.querySelector('.sw-update-dismiss').addEventListener('click', function () {
          toast.remove();
        });
        document.body.appendChild(toast);
      }
      if (reg.waiting) notify(reg.waiting);
      reg.addEventListener('updatefound', function () {
        var w = reg.installing;
        if (!w) return;
        w.addEventListener('statechange', function () {
          if (w.state === 'installed' && navigator.serviceWorker.controller) notify(w);
        });
      });
      var refreshing;
      navigator.serviceWorker.addEventListener('controllerchange', function () {
        if (refreshing) return;
        refreshing = true;
        window.location.reload();
      });
    }).catch(function () {});
  }

  // 6. External-link safety: ensure rel + new-tab on all body external links
  document.querySelectorAll('a[href^="http"]').forEach(function (a) {
    try {
      var u = new URL(a.href);
      if (u.host !== window.location.host && !a.hasAttribute('data-internal')) {
        if (!a.hasAttribute('target')) a.setAttribute('target', '_blank');
        var rel = (a.getAttribute('rel') || '').split(/\s+/).filter(Boolean);
        if (rel.indexOf('noopener') === -1) rel.push('noopener');
        if (rel.indexOf('noreferrer') === -1) rel.push('noreferrer');
        a.setAttribute('rel', rel.join(' '));
      }
    } catch (e) {}
  });

  // 7. Lazy-load images that aren't already
  document.querySelectorAll('img:not([loading]):not([fetchpriority])').forEach(function (img) {
    img.setAttribute('loading', 'lazy');
    img.setAttribute('decoding', 'async');
  });

  // 8. Online/offline indicator (subtle)
  function networkPing(online) {
    var existing = document.querySelector('.net-status-pill');
    if (existing) existing.remove();
    if (online) return;
    var pill = document.createElement('div');
    pill.className = 'net-status-pill';
    pill.setAttribute('role', 'status');
    pill.setAttribute('aria-live', 'polite');
    pill.textContent = 'OFFLINE — cached data only';
    document.body.appendChild(pill);
  }
  window.addEventListener('online', function () { networkPing(true); });
  window.addEventListener('offline', function () { networkPing(false); });

  // 9. Hotline anchor — annotate phone clicks for analytics later
  document.querySelectorAll('a[href^="tel:"]').forEach(function (a) {
    a.addEventListener('click', function () {
      try { console.log('[ghost] hotline click', a.href); } catch (e) {}
    });
  });
})();
