/* Ghost Signal — Cinematic layer.
   Christ-guided scripture rotation, click ripple, in-view reveal choreography,
   candle easter egg. GPU-only animations to keep 60+ FPS. */
(function () {
  'use strict';

  if (window.__ghostCinemaBooted) return;
  window.__ghostCinemaBooted = true;

  var reduced =
    window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // 1) Scripture whisper rotation — gentle, low-frequency.
  var verses = [
    '“For nothing is hidden that will not be made manifest.” — Luke 8:17',
    '“The light shines in the darkness, and the darkness has not overcome it.” — John 1:5',
    '“And ye shall know the truth, and the truth shall make you free.” — John 8:32',
    '“Test all things; hold fast that which is good.” — 1 Thessalonians 5:21',
    '“For we walk by faith, not by sight.” — 2 Corinthians 5:7',
    '“Where the Spirit of the Lord is, there is liberty.” — 2 Corinthians 3:17',
    '“Be still, and know that I am God.” — Psalm 46:10',
    '“The truth is the truth, even if no one believes it.” — Anonymous',
  ];
  var whisper = document.querySelector('[data-scripture-rotate]');
  if (whisper) {
    var idx = 0;
    function rotateVerse() {
      idx = (idx + 1) % verses.length;
      whisper.style.transition = 'opacity 800ms ease, transform 800ms ease';
      whisper.style.opacity = '0';
      whisper.style.transform = 'translateY(6px)';
      setTimeout(function () {
        whisper.textContent = verses[idx];
        whisper.style.opacity = '';
        whisper.style.transform = '';
      }, 820);
    }
    if (!reduced) setInterval(rotateVerse, 16000);
  }

  // 2) Click ripple — gold halo at click point, GPU only.
  function spawnRipple(ev) {
    if (reduced) return;
    if (ev.button !== undefined && ev.button !== 0) return;
    // Skip ripple on form controls + inside iframes/maps to avoid noise.
    var t = ev.target;
    if (!t) return;
    if (t.closest && t.closest('input, textarea, select, .leaflet-container, .xterm, .terminal-frame')) return;
    var r = document.createElement('span');
    r.className = 'gh-click-ripple';
    r.style.left = ev.clientX + 'px';
    r.style.top = ev.clientY + 'px';
    document.body.appendChild(r);
    setTimeout(function () { r.remove(); }, 700);
  }
  document.addEventListener('pointerdown', spawnRipple, { passive: true });

  // 3) Reveal-on-scroll choreography for sections + cards.
  if (!reduced && 'IntersectionObserver' in window) {
    var selector = [
      '.reveal-section',
      '.dossier-card',
      '.feature-card',
      '.timeline-event',
      '.evidence-card',
      '.entropy-card',
      '.gh-chapter-divider',
    ].join(',');
    var nodes = document.querySelectorAll(selector);
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) {
          e.target.classList.add('is-revealed');
          io.unobserve(e.target);
        }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -8% 0px' });
    nodes.forEach(function (n) {
      n.classList.add('reveal-section');
      io.observe(n);
    });
  } else {
    document.querySelectorAll('.reveal-section').forEach(function (n) {
      n.classList.add('is-revealed');
    });
  }

  // 3b) Hash-target hardening — when a deep link points to a section
  //     (e.g. /#transmissions), every reveal-section *above* the target
  //     would otherwise sit at opacity:0 + translateY(40px) and collapse
  //     the layout, so the browser scrolls to a stale position. Reveal
  //     the target + every section above it immediately, then re-scroll
  //     to the correct location after layout settles.
  function unblockHashTarget() {
    var hash = window.location.hash;
    if (!hash || hash.length < 2) return '';
    var target;
    try { target = document.querySelector(hash); } catch (_) { return ''; }
    if (!target) return '';
    // Reveal *every* section so layout-above stops shifting as images load —
    // the IntersectionObserver would do this eventually but the hash target
    // needs a stable layout NOW so the browser lands at the right scroll.
    document.querySelectorAll('.reveal-section').forEach(function (n) {
      n.classList.add('is-revealed');
    });
    target.classList.add('is-revealed');
    return hash;
  }
  function scrollToHashTarget() {
    var hash = window.location.hash;
    if (!hash || hash.length < 2) return;
    var target;
    try { target = document.querySelector(hash); } catch (_) { return; }
    if (!target) return;
    try { target.scrollIntoView({ block: 'start', behavior: 'auto' }); } catch (_) {}
  }
  // Stability-watch re-scroll: chart canvases + SSE feeds mount asynchronously
  // and keep pushing layout *down* for several seconds after first paint.
  // MutationObserver fires on every DOM change — re-scroll until target's
  // absolute Y stays put across observations OR the user scrolls/clicks OR
  // the 8-second watchdog expires. The watchdog is generous because chart
  // libs sometimes mount canvases >3s in on slow networks.
  function lockScrollToHashTarget() {
    var hash = window.location.hash;
    if (!hash || hash.length < 2) return;
    var target;
    try { target = document.querySelector(hash); } catch (_) { return; }
    if (!target) return;
    var deadline = Date.now() + 8000;
    var userScrolled = false;
    var done = false;
    function cleanup() {
      done = true;
      window.removeEventListener('wheel', onUserScroll);
      window.removeEventListener('touchstart', onUserScroll);
      window.removeEventListener('keydown', onUserScroll);
      if (mo) mo.disconnect();
    }
    function onUserScroll() { userScrolled = true; cleanup(); }
    function reScroll() {
      if (done || userScrolled || Date.now() > deadline) { cleanup(); return; }
      scrollToHashTarget();
    }
    window.addEventListener('wheel', onUserScroll, { passive: true });
    window.addEventListener('touchstart', onUserScroll, { passive: true });
    window.addEventListener('keydown', onUserScroll, { passive: true });
    // Re-scroll on every relevant DOM mutation. Throttle via rAF so we
    // batch consecutive mutations into one scroll per frame.
    var rafQueued = false;
    var mo = new MutationObserver(function () {
      if (rafQueued || done) return;
      rafQueued = true;
      requestAnimationFrame(function () {
        rafQueued = false;
        reScroll();
      });
    });
    try {
      mo.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['class', 'style'] });
    } catch (_) {}
    // Also re-scroll on a fixed cadence (covers cases where layout grows
    // without DOM mutation — e.g. fonts swap, image decode).
    var tick = 0;
    function periodic() {
      if (done || userScrolled || Date.now() > deadline) { cleanup(); return; }
      reScroll();
      tick += 1;
      var delay = tick < 6 ? 100 : tick < 20 ? 250 : 500;
      setTimeout(periodic, delay);
    }
    scrollToHashTarget();
    setTimeout(periodic, 60);
  }
  if (unblockHashTarget()) {
    requestAnimationFrame(function () {
      requestAnimationFrame(lockScrollToHashTarget);
    });
    if (document.readyState !== 'complete') {
      window.addEventListener('load', lockScrollToHashTarget, { once: true });
    }
  }
  window.addEventListener('hashchange', function () {
    if (unblockHashTarget()) {
      requestAnimationFrame(function () {
        requestAnimationFrame(lockScrollToHashTarget);
      });
    }
  });

  // 4) Candle easter egg — type "candle" anywhere to ignite a divine glow.
  var buf = '';
  document.addEventListener('keydown', function (e) {
    if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA')) return;
    if (e.key && e.key.length === 1) {
      buf = (buf + e.key.toLowerCase()).slice(-12);
      if (buf.endsWith('candle')) {
        igniteCandle();
        buf = '';
      }
    }
  });
  function igniteCandle() {
    if (document.querySelector('.gh-candle-flame')) return;
    var flame = document.createElement('div');
    flame.className = 'gh-candle-flame';
    flame.setAttribute('aria-hidden', 'true');
    flame.innerHTML =
      '<div class="gh-candle-glow"></div>' +
      '<div class="gh-candle-text">A candle is lit. Light wins.</div>';
    document.body.appendChild(flame);
    setTimeout(function () { flame.classList.add('is-out'); }, 4200);
    setTimeout(function () { flame.remove(); }, 5400);
  }

  // 5) Rescan hook for transitions.js page swaps — keep cinema in sync.
  window.__ghostRescan = function () {
    if (!('IntersectionObserver' in window)) return;
    document.querySelectorAll('.dossier-card,.feature-card,.timeline-event,.evidence-card,.entropy-card,.gh-chapter-divider')
      .forEach(function (n) {
        if (!n.classList.contains('is-revealed')) n.classList.add('reveal-section');
      });
  };
})();
