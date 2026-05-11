/* Ghost Signal — Celestial Hallucinations world map.
   Pins start collapsed: hover/focus shows compact tag+title.
   Click/tap a pin opens a rich popup with the full field-note body. */
(function () {
  'use strict';

  function init() {
    var el = document.getElementById('celestial-map');
    if (!el || typeof L === 'undefined') return;
    if (el.dataset.mapReady === '1') return;
    el.dataset.mapReady = '1';

    var pins = [];
    try {
      pins = JSON.parse(el.getAttribute('data-pins') || '[]');
    } catch (err) {
      console.error('[celestial-map] failed to parse data-pins', err);
      return;
    }
    if (!pins.length) return;

    var prefersReducedMotion =
      window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    var map = L.map(el, {
      center: [25, -25],
      zoom: 2,
      minZoom: 2,
      maxZoom: 12,
      worldCopyJump: true,
      scrollWheelZoom: false,
      attributionControl: true,
      zoomControl: true,
      fadeAnimation: !prefersReducedMotion,
      zoomAnimation: !prefersReducedMotion,
      markerZoomAnimation: !prefersReducedMotion,
    });

    map.on('focus', function () { map.scrollWheelZoom.enable(); });
    map.on('blur',  function () { map.scrollWheelZoom.disable(); });
    map.on('click', function () { map.scrollWheelZoom.enable(); });

    L.tileLayer(
      'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
      {
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
        subdomains: 'abcd',
        maxZoom: 19,
      }
    ).addTo(map);

    var pinIcon = L.divIcon({
      className: 'celestial-pin',
      html:
        '<span class="celestial-pin-dot" aria-hidden="true"></span>' +
        '<span class="celestial-pin-pulse" aria-hidden="true"></span>',
      iconSize: [22, 22],
      iconAnchor: [11, 11],
      popupAnchor: [0, -10],
      tooltipAnchor: [0, -10],
    });

    var bounds = L.latLngBounds([]);

    pins.forEach(function (pin) {
      if (typeof pin.lat !== 'number' || typeof pin.lng !== 'number') return;

      var marker = L.marker([pin.lat, pin.lng], {
        icon: pinIcon,
        title: pin.title || '',
        keyboard: true,
        riseOnHover: true,
        alt: pin.title || 'Field-note pin',
      }).addTo(map);

      // Compact hover/focus tooltip — just the place + tag. No long body here.
      var tag = pin.tag
        ? '<span class="celestial-tooltip-tag">' + escapeHtml(pin.tag) + '</span>'
        : '';
      var teaserHtml =
        '<div class="celestial-tooltip-inner celestial-tooltip-inner--teaser">' +
        tag +
        '<strong class="celestial-tooltip-title">' + escapeHtml(pin.title || '') + '</strong>' +
        '<span class="celestial-tooltip-hint" aria-hidden="true">Tap to read field note</span>' +
        '</div>';

      marker.bindTooltip(teaserHtml, {
        permanent: false,
        direction: 'top',
        offset: [0, -10],
        className: 'celestial-tooltip celestial-tooltip--teaser',
        interactive: false,
        opacity: 1,
        sticky: false,
      });

      // Expanded popup — the full body, only on click/tap/Enter.
      var popupHtml =
        '<div class="celestial-popup-inner">' +
        (pin.tag ? '<span class="celestial-popup-tag">' + escapeHtml(pin.tag) + '</span>' : '') +
        '<h4 class="celestial-popup-title">' + escapeHtml(pin.title || '') + '</h4>' +
        '<p class="celestial-popup-body">' + escapeHtml(pin.body || '') + '</p>' +
        '</div>';

      marker.bindPopup(popupHtml, {
        className: 'celestial-popup-wrap',
        maxWidth: 360,
        minWidth: 240,
        autoPan: true,
        autoPanPadding: [40, 60],
        closeButton: true,
        keepInView: true,
      });

      // Keyboard activation: Enter/Space opens the popup (Leaflet handles Enter
      // by default; we also tighten Space behavior on the marker icon).
      marker.on('add', function () {
        var icon = marker._icon;
        if (!icon) return;
        icon.setAttribute('role', 'button');
        icon.setAttribute('aria-label', pin.title || 'Field-note pin');
        icon.setAttribute('aria-haspopup', 'dialog');
        icon.addEventListener('keydown', function (ev) {
          if (ev.key === ' ' || ev.key === 'Enter') {
            ev.preventDefault();
            marker.openPopup();
          }
        });
      });

      // Close any teaser tooltip when the popup opens to avoid visual overlap.
      marker.on('popupopen', function () { marker.closeTooltip(); });

      bounds.extend([pin.lat, pin.lng]);
    });

    if (bounds.isValid()) {
      map.fitBounds(bounds, { padding: [80, 80], maxZoom: 3 });
    }

    var resizeTimer = null;
    window.addEventListener('resize', function () {
      if (resizeTimer) clearTimeout(resizeTimer);
      resizeTimer = setTimeout(function () {
        map.invalidateSize();
        if (bounds.isValid()) {
          map.fitBounds(bounds, { padding: [80, 80], maxZoom: 3 });
        }
      }, 200);
    });
  }

  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function ready(fn) {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', fn, { once: true });
    } else {
      fn();
    }
  }

  ready(function () {
    if (typeof L === 'undefined') {
      var tries = 0;
      var poll = setInterval(function () {
        tries += 1;
        if (typeof L !== 'undefined') {
          clearInterval(poll);
          init();
        } else if (tries > 60) {
          clearInterval(poll);
          console.warn('[celestial-map] Leaflet failed to load');
        }
      }, 100);
    } else {
      init();
    }
  });
})();
