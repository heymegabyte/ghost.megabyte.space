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
