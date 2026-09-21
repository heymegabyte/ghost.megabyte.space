/* Ghost Signal — 14 Interactive Experiences */

const GhostFeatures = (() => {
  const $ = (id) => document.getElementById(id);
  const $$ = (sel) => Array.from(document.querySelectorAll(sel));
  const el = (tag, cls, text) => {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  };

  /* ═══════════════════════════════════════════════
     #1 — LIVE EMF SÉANCE MODE
     Full-screen dark overlay with live EMF-reactive visuals
     ═══════════════════════════════════════════════ */

  function initSeance() {
    const overlay = $("seance-overlay");
    if (!overlay) return;
    let active = false;
    let animFrame = null;
    const canvas = overlay.querySelector(".seance-canvas");
    const ctx = canvas?.getContext("2d");
    const emfDisplay = overlay.querySelector(".seance-emf-value");
    const statusText = overlay.querySelector(".seance-status");
    const candles = $$(".seance-candle");

    function resize() {
      if (!canvas) return;
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    }

    async function fetchEMF() {
      try {
        const r = await fetch("/api/v1/ghost-emf/current");
        const d = await r.json();
        return d.numericValue ?? 0;
      } catch { return 0; }
    }

    function drawDistortion(emf) {
      if (!ctx || !canvas) return;
      const w = canvas.width, h = canvas.height;
      ctx.clearRect(0, 0, w, h);

      // Intensity based on EMF reading
      const intensity = Math.min(1, emf / 5);

      // Flickering scanlines
      ctx.fillStyle = `rgba(255, 23, 68, ${0.02 + intensity * 0.08})`;
      for (let y = 0; y < h; y += 3) {
        if (Math.random() < 0.3 + intensity * 0.4) {
          ctx.fillRect(0, y, w, 1);
        }
      }

      // EMF-reactive glitch bars
      const barCount = Math.floor(intensity * 8);
      for (let i = 0; i < barCount; i++) {
        const y = Math.random() * h;
        const bh = 2 + Math.random() * 6 * intensity;
        const offset = (Math.random() - 0.5) * 40 * intensity;
        ctx.fillStyle = `rgba(0, 229, 255, ${0.1 + intensity * 0.2})`;
        ctx.fillRect(offset, y, w, bh);
      }

      // Central spirit orb
      const cx = w / 2 + Math.sin(Date.now() / 1000) * 50 * intensity;
      const cy = h / 2 + Math.cos(Date.now() / 1300) * 30 * intensity;
      const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, 100 + intensity * 200);
      grad.addColorStop(0, `rgba(124, 58, 237, ${0.3 * intensity})`);
      grad.addColorStop(0.5, `rgba(255, 23, 68, ${0.1 * intensity})`);
      grad.addColorStop(1, "transparent");
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, h);

      // Status text
      if (statusText) {
        const messages = ["The signal is present...", "Something stirs...", "EMF spike detected...", "The corridor hums...", "Entropy shifting..."];
        if (Math.random() < 0.02) {
          statusText.textContent = messages[Math.floor(Math.random() * messages.length)];
        }
      }
    }

    async function loop() {
      if (!active) return;
      const emf = await fetchEMF();
      if (emfDisplay) emfDisplay.textContent = emf.toFixed(3);

      // Flicker candles based on EMF
      candles.forEach((c, i) => {
        const flicker = Math.random() < (emf / 10);
        c.style.opacity = flicker ? "0.3" : "1";
        c.style.transform = `scaleY(${0.8 + Math.random() * 0.4})`;
      });

      drawDistortion(emf);
      animFrame = requestAnimationFrame(() => setTimeout(loop, 800));
    }

    document.addEventListener("click", (e) => {
      if (e.target.closest("[data-action='start-seance']")) {
        active = true;
        overlay.classList.add("is-active");
        document.body.style.overflow = "hidden";
        resize();
        window.addEventListener("resize", resize);
        loop();
      }
      if (e.target.closest("[data-action='end-seance']")) {
        active = false;
        overlay.classList.remove("is-active");
        document.body.style.overflow = "";
        window.removeEventListener("resize", resize);
        if (animFrame) cancelAnimationFrame(animFrame);
      }
    });
  }

  /* ═══════════════════════════════════════════════
     #2 — OUIJA BOARD NAVIGATOR
     Keyboard-driven planchette spells section names
     ═══════════════════════════════════════════════ */

  function initOuija() {
    const overlay = $("ouija-overlay");
    if (!overlay) return;
    const board = overlay.querySelector(".ouija-board");
    const planchette = overlay.querySelector(".ouija-planchette");
    const output = overlay.querySelector(".ouija-output");
    if (!board || !planchette) return;

    const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    const targets = {
      SIGNAL: "#chart-panel",
      DOSSIER: "[data-testid='dossier']",
      TIMELINE: "[data-testid='timeline-nav']",
      MISSION: "[data-testid='mission-section']",
      HOTLINE: "[data-testid='hotline-section']",
      CASINO: "#casino-overlay",
      SEANCE: "#seance-overlay",
    };
    let typed = "";
    let ouijaActive = false;

    // Build letter grid
    const grid = el("div", "ouija-letter-grid");
    letters.split("").forEach((ch) => {
      const cell = el("span", "ouija-letter", ch);
      cell.dataset.letter = ch;
      grid.appendChild(cell);
    });
    board.prepend(grid);

    function movePlanchette(letter) {
      const cell = grid.querySelector(`[data-letter="${letter}"]`);
      if (!cell) return;
      const rect = cell.getBoundingClientRect();
      const boardRect = board.getBoundingClientRect();
      planchette.style.left = (rect.left - boardRect.left + rect.width / 2 - 25) + "px";
      planchette.style.top = (rect.top - boardRect.top + rect.height / 2 - 25) + "px";
    }

    function handleKey(e) {
      if (!ouijaActive) return;
      const key = e.key.toUpperCase();
      if (key === "ESCAPE") {
        closeOuija();
        return;
      }
      if (key === "BACKSPACE") {
        typed = typed.slice(0, -1);
        if (output) output.textContent = typed || "...";
        return;
      }
      if (key === "ENTER") {
        const match = Object.entries(targets).find(([word]) => word === typed);
        if (match) {
          closeOuija();
          const target = document.querySelector(match[1]);
          if (target) {
            if (target.classList.contains("is-active") === false && target.id?.includes("overlay")) {
              target.classList.add("is-active");
            } else {
              target.scrollIntoView({ behavior: "smooth" });
            }
          }
        }
        typed = "";
        if (output) output.textContent = "...";
        return;
      }
      if (!letters.includes(key)) return;
      typed += key;
      if (output) output.textContent = typed;
      movePlanchette(key);

      // Highlight matches
      Object.keys(targets).forEach((word) => {
        const hint = overlay.querySelector(`[data-ouija-word="${word}"]`);
        if (hint) hint.classList.toggle("ouija-match", word.startsWith(typed));
      });
    }

    function closeOuija() {
      ouijaActive = false;
      overlay.classList.remove("is-active");
      document.body.style.overflow = "";
      document.removeEventListener("keydown", handleKey);
    }

    document.addEventListener("click", (e) => {
      if (e.target.closest("[data-action='open-ouija']")) {
        ouijaActive = true;
        overlay.classList.add("is-active");
        document.body.style.overflow = "hidden";
        document.addEventListener("keydown", handleKey);
        typed = "";
        if (output) output.textContent = "Type a destination...";
      }
      if (e.target.closest("[data-action='close-ouija']")) {
        closeOuija();
      }
    });
  }

  /* ═══════════════════════════════════════════════
     #3 — GHOST SIGNAL SONIFICATION
     Web Audio API converts EMF data to ambient sound
     ═══════════════════════════════════════════════ */

  function initSonification() {
    const btn = $("sonify-toggle");
    if (!btn) return;
    const scope = document.getElementById("listen-scope");
    const scopeCtx = scope ? scope.getContext("2d") : null;
    const spec = document.getElementById("listen-spectrogram");
    const specCtx = spec ? spec.getContext("2d") : null;
    const stateTag = document.querySelector("[data-listen-scope-state]");
    const reduceMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    // Audio graph state
    let audioCtx = null;
    let masterGain = null;          // overall fade in/out
    let busGain = null;             // post-FX bus
    let compressor = null;          // safety limiter
    let convolver = null;           // reverb
    let dryGain = null;
    let wetGain = null;
    let highpass = null;
    let lowpass = null;
    let analyser = null;            // scope + spectrogram source
    let osc1 = null, osc1Gain = null;             // drone fundamental
    let osc1Sub = null, osc1SubGain = null;       // drone detuned sub
    let osc2 = null, osc2Gain = null, osc2Vibrato = null, osc2VibratoDepth = null;
    let osc3 = null, osc3Gain = null, osc3Pan = null, osc3PanLfo = null, osc3PanLfoGain = null;
    let noiseSource = null, noiseGain = null, noiseFilter = null;
    let tremolo = null, tremoloGain = null;
    let pollInterval = null;
    let rafId = null;
    let idleRafId = null;
    let phase = 0;
    let lastEmf = 0;
    let smoothedEmf = 0;
    let emfFloor = 0.4;             // adapt over time
    let emfPeak = 1.0;
    let playing = false;
    let starting = false;
    let stopping = false;
    let visibilityHandler = null;
    let peakHold = null;            // Float32Array peak envelope per scope sample
    let peakDecay = 0.94;

    function brandColor(v) {
      // v: 0..255 → cyan (low) → purple (mid) → red (peak)
      if (v < 6) return null;
      const t = Math.min(1, v / 255);
      let r, g, b;
      if (t < 0.5) {
        const k = t / 0.5;
        r = Math.round(0 + (124 - 0) * k);
        g = Math.round(229 - (229 - 58) * k);
        b = Math.round(255 - (255 - 237) * k);
      } else {
        const k = (t - 0.5) / 0.5;
        r = Math.round(124 + (255 - 124) * k);
        g = Math.round(58 - (58 - 23) * k);
        b = Math.round(237 - (237 - 68) * k);
      }
      const a = Math.min(1, t * 1.45);
      return `rgba(${r},${g},${b},${a.toFixed(3)})`;
    }

    function syncCanvasSize(canvas) {
      if (!canvas) return;
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      const r = canvas.getBoundingClientRect();
      const targetW = Math.max(320, Math.floor(r.width * dpr));
      const targetH = Math.max(80,  Math.floor(r.height * dpr));
      if (canvas.width !== targetW || canvas.height !== targetH) {
        canvas.width = targetW;
        canvas.height = targetH;
      }
    }

    /* ── Synthesised impulse response (haunted corridor reverb) ── */
    function buildImpulseResponse(ctx, durationSec, decay) {
      const rate = ctx.sampleRate;
      const len = Math.max(1, Math.floor(rate * durationSec));
      const ir = ctx.createBuffer(2, len, rate);
      for (let ch = 0; ch < 2; ch++) {
        const data = ir.getChannelData(ch);
        for (let i = 0; i < len; i++) {
          // Exponentially decaying noise — subtle stereo decorrelation per channel
          const t = i / len;
          data[i] = (Math.random() * 2 - 1) * Math.pow(1 - t, decay);
        }
      }
      return ir;
    }

    /* ── Pink-ish noise buffer (filtered white) for whisper bed ── */
    function buildNoiseBuffer(ctx, seconds) {
      const len = Math.floor(ctx.sampleRate * seconds);
      const buf = ctx.createBuffer(1, len, ctx.sampleRate);
      const data = buf.getChannelData(0);
      // Voss-McCartney-ish smoothing for pink character
      let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
      for (let i = 0; i < len; i++) {
        const w = Math.random() * 2 - 1;
        b0 = 0.99886 * b0 + w * 0.0555179;
        b1 = 0.99332 * b1 + w * 0.0750759;
        b2 = 0.96900 * b2 + w * 0.1538520;
        b3 = 0.86650 * b3 + w * 0.3104856;
        b4 = 0.55000 * b4 + w * 0.5329522;
        b5 = -0.7616 * b5 - w * 0.0168980;
        data[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + w * 0.5362) * 0.11;
        b6 = w * 0.115926;
      }
      return buf;
    }

    /* ── Visualisation: scope ── */
    function drawScope() {
      if (!scopeCtx || !scope || !analyser) return;
      syncCanvasSize(scope);
      const w = scope.width;
      const h = scope.height;
      scopeCtx.clearRect(0, 0, w, h);

      const buf = new Uint8Array(analyser.fftSize);
      analyser.getByteTimeDomainData(buf);

      // Initialise peak-hold envelope sized to canvas width
      if (!peakHold || peakHold.length !== Math.floor(w)) {
        peakHold = new Float32Array(Math.floor(w));
      }

      // Glow pass — red (whisper layer) with broader stroke
      scopeCtx.lineWidth = 4;
      scopeCtx.strokeStyle = "rgba(255,23,68,0.22)";
      scopeCtx.shadowBlur = 18;
      scopeCtx.shadowColor = "rgba(255,23,68,0.55)";
      scopeCtx.beginPath();
      for (let i = 0; i < buf.length; i++) {
        const x = (i / buf.length) * w;
        const y = (buf[i] / 255) * h;
        if (i === 0) scopeCtx.moveTo(x, y);
        else scopeCtx.lineTo(x, y);
      }
      scopeCtx.stroke();

      // Main wave — cyan
      scopeCtx.lineWidth = 1.6;
      scopeCtx.strokeStyle = "#00E5FF";
      scopeCtx.shadowBlur = 10;
      scopeCtx.shadowColor = "rgba(0,229,255,0.8)";
      scopeCtx.beginPath();
      for (let i = 0; i < buf.length; i++) {
        const x = (i / buf.length) * w;
        const y = (buf[i] / 255) * h;
        if (i === 0) scopeCtx.moveTo(x, y);
        else scopeCtx.lineTo(x, y);
      }
      scopeCtx.stroke();
      scopeCtx.shadowBlur = 0;

      // Peak-hold envelope — soft purple ribbon
      scopeCtx.beginPath();
      scopeCtx.strokeStyle = "rgba(124,58,237,0.55)";
      scopeCtx.lineWidth = 1;
      const mid = h / 2;
      const samplesPerPx = buf.length / w;
      for (let x = 0; x < w; x++) {
        const sIdx = Math.floor(x * samplesPerPx);
        const v = Math.abs((buf[sIdx] - 128) / 128);
        if (v > peakHold[x]) peakHold[x] = v;
        else peakHold[x] *= peakDecay;
        const y = mid - peakHold[x] * (h * 0.48);
        if (x === 0) scopeCtx.moveTo(x, y);
        else scopeCtx.lineTo(x, y);
      }
      scopeCtx.stroke();
      scopeCtx.beginPath();
      for (let x = 0; x < w; x++) {
        const y = mid + peakHold[x] * (h * 0.48);
        if (x === 0) scopeCtx.moveTo(x, y);
        else scopeCtx.lineTo(x, y);
      }
      scopeCtx.stroke();

      drawSpectrogramFrame();
      rafId = requestAnimationFrame(drawScope);
    }

    function drawSpectrogramFrame() {
      if (!specCtx || !spec || !analyser) return;
      syncCanvasSize(spec);
      const w = spec.width;
      const h = spec.height;
      const scrollPx = 2;

      const img = specCtx.getImageData(scrollPx, 0, w - scrollPx, h);
      specCtx.putImageData(img, 0, 0);
      specCtx.fillStyle = "rgba(6,6,16,0.05)";
      specCtx.fillRect(0, 0, w - scrollPx, h);
      specCtx.clearRect(w - scrollPx, 0, scrollPx, h);

      const bins = analyser.frequencyBinCount;
      const freq = new Uint8Array(bins);
      analyser.getByteFrequencyData(freq);
      const usableBins = Math.floor(bins * 0.5);
      const colH = h / usableBins;
      for (let i = 0; i < usableBins; i++) {
        const v = freq[i];
        const c = brandColor(v);
        if (!c) continue;
        const y = h - (i + 1) * colH;
        specCtx.fillStyle = c;
        specCtx.fillRect(w - scrollPx, y, scrollPx, Math.ceil(colH) + 1);
      }
    }

    function drawIdle() {
      if (!scopeCtx || !scope) return;
      syncCanvasSize(scope);
      const w = scope.width;
      const h = scope.height;
      scopeCtx.clearRect(0, 0, w, h);
      // Idle wave reacts to remote EMF if we have one
      const amp = 4 + Math.min(20, smoothedEmf * 14);
      scopeCtx.lineWidth = 1;
      scopeCtx.strokeStyle = "rgba(0,229,255,0.35)";
      scopeCtx.shadowBlur = 6;
      scopeCtx.shadowColor = "rgba(0,229,255,0.45)";
      scopeCtx.beginPath();
      const mid = h / 2;
      for (let x = 0; x <= w; x += 2) {
        const n = (Math.sin(x * 0.04 + phase) * 0.5 + (Math.random() - 0.5) * 0.6) * amp;
        const y = mid + n;
        if (x === 0) scopeCtx.moveTo(x, y);
        else scopeCtx.lineTo(x, y);
      }
      scopeCtx.stroke();
      scopeCtx.shadowBlur = 0;
      phase += 0.06;
      idleRafId = reduceMotion ? null : requestAnimationFrame(drawIdle);
    }

    function startIdle() {
      if (idleRafId) cancelAnimationFrame(idleRafId);
      drawIdle();
    }
    function stopIdle() {
      if (idleRafId) cancelAnimationFrame(idleRafId);
      idleRafId = null;
    }

    /* ── EMF → synth parameter mapping (smooth, click-free) ── */
    function applyEmf(emfRaw) {
      if (!audioCtx) return;
      lastEmf = emfRaw;
      // Adaptive normalisation — track running floor + peak
      emfFloor = emfFloor * 0.995 + Math.min(emfFloor, emfRaw) * 0.005;
      emfPeak  = Math.max(emfPeak  * 0.997, emfRaw);
      const norm = Math.max(0, Math.min(1, (emfRaw - emfFloor) / Math.max(0.0001, emfPeak - emfFloor)));
      // Exponential smoothing for parameter writes
      smoothedEmf = smoothedEmf * 0.7 + norm * 0.3;

      const t = audioCtx.currentTime;

      // Drone — 40-72 Hz, tiny detune for thickness
      if (osc1) osc1.frequency.setTargetAtTime(40 + smoothedEmf * 32, t, 0.6);
      if (osc1Sub) osc1Sub.frequency.setTargetAtTime(40 + smoothedEmf * 32 - 1.7, t, 0.6);

      // Harmonic — 200-340 Hz with slow vibrato depth following EMF
      if (osc2) osc2.frequency.setTargetAtTime(200 + smoothedEmf * 140, t, 0.35);
      if (osc2VibratoDepth) osc2VibratoDepth.gain.setTargetAtTime(0.6 + smoothedEmf * 4, t, 0.4);

      // Whisper — 600-1400 Hz drift
      if (osc3) osc3.frequency.setTargetAtTime(600 + 800 * smoothedEmf, t, 0.18);
      if (osc3Gain) osc3Gain.gain.setTargetAtTime(0.005 + 0.06 * smoothedEmf, t, 0.25);

      // Pink-noise whisper bed — louder on spike
      if (noiseGain) noiseGain.gain.setTargetAtTime(0.005 + 0.05 * smoothedEmf, t, 0.3);
      if (noiseFilter) noiseFilter.frequency.setTargetAtTime(900 + smoothedEmf * 2200, t, 0.4);

      // Reverb wet — more haunted on spike
      if (wetGain) wetGain.gain.setTargetAtTime(0.18 + 0.32 * smoothedEmf, t, 0.5);

      // Spike accent — when normalised value crosses threshold, fire short bell hit
      if (norm > 0.55 && audioCtx && busGain) spikeAccent(norm);
    }

    /* ── One-shot bell-tone on EMF spike ── */
    function spikeAccent(intensity) {
      if (!audioCtx) return;
      const t = audioCtx.currentTime;
      const osc = audioCtx.createOscillator();
      const g = audioCtx.createGain();
      const pan = audioCtx.createStereoPanner ? audioCtx.createStereoPanner() : null;
      osc.type = "triangle";
      // Harmonic ratio — 4ths and 5ths above whisper for "ringing"
      const baseHz = 660 + Math.random() * 220;
      osc.frequency.setValueAtTime(baseHz, t);
      osc.frequency.exponentialRampToValueAtTime(Math.max(110, baseHz * 0.5), t + 1.4);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.06 * intensity, t + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 1.5);
      if (pan) {
        pan.pan.setValueAtTime((Math.random() * 2 - 1) * 0.7, t);
        osc.connect(g).connect(pan).connect(busGain);
      } else {
        osc.connect(g).connect(busGain);
      }
      osc.start(t);
      osc.stop(t + 1.55);
    }

    /* ── Build full audio graph ── */
    function buildGraph() {
      const Ctor = window.AudioContext || window.webkitAudioContext;
      audioCtx = new Ctor();
      // Master + bus + safety
      masterGain = audioCtx.createGain();
      masterGain.gain.value = 0.0001;             // start silent — we fade in
      compressor = audioCtx.createDynamicsCompressor();
      compressor.threshold.value = -22;
      compressor.knee.value = 24;
      compressor.ratio.value = 6;
      compressor.attack.value = 0.005;
      compressor.release.value = 0.3;
      busGain = audioCtx.createGain();
      busGain.gain.value = 0.85;

      // Reverb send/return
      convolver = audioCtx.createConvolver();
      convolver.buffer = buildImpulseResponse(audioCtx, 3.4, 2.6);
      dryGain = audioCtx.createGain(); dryGain.gain.value = 0.78;
      wetGain = audioCtx.createGain(); wetGain.gain.value = 0.22;

      // Tonal shaping
      highpass = audioCtx.createBiquadFilter();
      highpass.type = "highpass";
      highpass.frequency.value = 32;
      lowpass = audioCtx.createBiquadFilter();
      lowpass.type = "lowpass";
      lowpass.frequency.value = 5800;
      lowpass.Q.value = 0.4;

      // Analyser
      analyser = audioCtx.createAnalyser();
      analyser.fftSize = 2048;
      analyser.smoothingTimeConstant = 0.85;
      analyser.minDecibels = -90;
      analyser.maxDecibels = -10;

      // Routing: bus → highpass → lowpass → split (dry+wet) → compressor → master → dest
      busGain.connect(highpass);
      highpass.connect(lowpass);
      lowpass.connect(dryGain);
      lowpass.connect(convolver);
      convolver.connect(wetGain);
      dryGain.connect(compressor);
      wetGain.connect(compressor);
      compressor.connect(analyser);
      analyser.connect(masterGain);
      masterGain.connect(audioCtx.destination);

      // Tremolo on bus — slow breath
      tremolo = audioCtx.createOscillator();
      tremoloGain = audioCtx.createGain();
      tremolo.frequency.value = 0.28;
      tremoloGain.gain.value = 0.04;
      tremolo.connect(tremoloGain).connect(busGain.gain);
      tremolo.start();

      // ── Drone (CH1) — fundamental + slightly detuned sub
      osc1 = audioCtx.createOscillator(); osc1.type = "sine"; osc1.frequency.value = 55;
      osc1Gain = audioCtx.createGain();   osc1Gain.gain.value = 0.10;
      osc1.connect(osc1Gain).connect(busGain);
      osc1Sub = audioCtx.createOscillator(); osc1Sub.type = "triangle"; osc1Sub.frequency.value = 53.3;
      osc1SubGain = audioCtx.createGain();   osc1SubGain.gain.value = 0.05;
      osc1Sub.connect(osc1SubGain).connect(busGain);
      osc1.start(); osc1Sub.start();

      // ── Harmonic (CH2) — triangle with vibrato LFO
      osc2 = audioCtx.createOscillator(); osc2.type = "triangle"; osc2.frequency.value = 220;
      osc2Gain = audioCtx.createGain();   osc2Gain.gain.value = 0.045;
      osc2Vibrato = audioCtx.createOscillator(); osc2Vibrato.type = "sine"; osc2Vibrato.frequency.value = 4.6;
      osc2VibratoDepth = audioCtx.createGain(); osc2VibratoDepth.gain.value = 0.8;
      osc2Vibrato.connect(osc2VibratoDepth).connect(osc2.frequency);
      osc2.connect(osc2Gain).connect(busGain);
      osc2.start(); osc2Vibrato.start();

      // ── Whisper (CH3) — sawtooth with auto-pan
      osc3 = audioCtx.createOscillator(); osc3.type = "sawtooth"; osc3.frequency.value = 800;
      osc3Gain = audioCtx.createGain();   osc3Gain.gain.value = 0.012;
      if (audioCtx.createStereoPanner) {
        osc3Pan = audioCtx.createStereoPanner();
        osc3PanLfo = audioCtx.createOscillator(); osc3PanLfo.type = "sine"; osc3PanLfo.frequency.value = 0.13;
        osc3PanLfoGain = audioCtx.createGain();   osc3PanLfoGain.gain.value = 0.7;
        osc3PanLfo.connect(osc3PanLfoGain).connect(osc3Pan.pan);
        osc3.connect(osc3Gain).connect(osc3Pan).connect(busGain);
        osc3PanLfo.start();
      } else {
        osc3.connect(osc3Gain).connect(busGain);
      }
      osc3.start();

      // ── Pink noise whisper bed — filtered, very quiet, gated by EMF
      const noiseBuf = buildNoiseBuffer(audioCtx, 4);
      noiseSource = audioCtx.createBufferSource();
      noiseSource.buffer = noiseBuf;
      noiseSource.loop = true;
      noiseFilter = audioCtx.createBiquadFilter();
      noiseFilter.type = "bandpass";
      noiseFilter.frequency.value = 1100;
      noiseFilter.Q.value = 1.4;
      noiseGain = audioCtx.createGain();
      noiseGain.gain.value = 0.005;
      noiseSource.connect(noiseFilter).connect(noiseGain).connect(busGain);
      noiseSource.start();
    }

    async function start() {
      if (playing || starting) return;
      starting = true;
      stopIdle();
      try {
        if (!audioCtx) buildGraph();
        if (audioCtx.state === "suspended") await audioCtx.resume();

        // Fade in master over 800ms — no jump-scare
        const t = audioCtx.currentTime;
        masterGain.gain.cancelScheduledValues(t);
        masterGain.gain.setValueAtTime(0.0001, t);
        masterGain.gain.exponentialRampToValueAtTime(0.32, t + 0.8);

        // First parameter write so we don't hold default until first poll
        applyEmf(lastEmf || 0.6);

        // Poll EMF every second (cache TTL 2s — it's safe)
        if (pollInterval) clearInterval(pollInterval);
        pollInterval = setInterval(async () => {
          try {
            const r = await fetch("/api/v1/ghost-emf/current");
            const d = await r.json();
            applyEmf(Math.max(0, d.numericValue ?? 0));
          } catch {}
        }, 1000);

        // Tab visibility — auto suspend / resume
        if (visibilityHandler) document.removeEventListener("visibilitychange", visibilityHandler);
        visibilityHandler = () => {
          if (!audioCtx) return;
          if (document.hidden && audioCtx.state === "running") audioCtx.suspend().catch(() => {});
          else if (!document.hidden && audioCtx.state === "suspended" && playing) audioCtx.resume().catch(() => {});
        };
        document.addEventListener("visibilitychange", visibilityHandler);

        playing = true;
        btn.textContent = "Stop Listening";
        btn.classList.add("is-active");
        btn.setAttribute("aria-pressed", "true");
        if (stateTag) {
          stateTag.setAttribute("data-listen-scope-state", "LIVE");
          stateTag.textContent = "LIVE";
        }
        if (spec) {
          if (specCtx) specCtx.clearRect(0, 0, spec.width, spec.height);
          spec.classList.add("is-active");
        }
        drawScope();
      } catch (err) {
        console.error("Sonification failed to start:", err);
        btn.textContent = "Audio Blocked — Try Again";
      } finally {
        starting = false;
      }
    }

    async function stop() {
      if (!playing || stopping) return;
      stopping = true;
      // Fade out, then tear down
      const t = audioCtx ? audioCtx.currentTime : 0;
      if (audioCtx && masterGain) {
        masterGain.gain.cancelScheduledValues(t);
        masterGain.gain.setValueAtTime(masterGain.gain.value, t);
        masterGain.gain.exponentialRampToValueAtTime(0.0001, t + 0.6);
      }
      clearInterval(pollInterval);
      pollInterval = null;
      if (visibilityHandler) {
        document.removeEventListener("visibilitychange", visibilityHandler);
        visibilityHandler = null;
      }
      // Wait for fade
      await new Promise((r) => setTimeout(r, 650));
      try { osc1 && osc1.stop(); } catch {}
      try { osc1Sub && osc1Sub.stop(); } catch {}
      try { osc2 && osc2.stop(); } catch {}
      try { osc2Vibrato && osc2Vibrato.stop(); } catch {}
      try { osc3 && osc3.stop(); } catch {}
      try { osc3PanLfo && osc3PanLfo.stop(); } catch {}
      try { tremolo && tremolo.stop(); } catch {}
      try { noiseSource && noiseSource.stop(); } catch {}
      if (rafId) cancelAnimationFrame(rafId);
      rafId = null;
      try { audioCtx && audioCtx.close(); } catch {}
      audioCtx = null;
      analyser = null;
      osc1 = osc1Sub = osc2 = osc2Vibrato = osc3 = osc3PanLfo = tremolo = noiseSource = null;
      osc1Gain = osc1SubGain = osc2Gain = osc2VibratoDepth = osc3Gain = osc3Pan = osc3PanLfoGain = null;
      noiseFilter = noiseGain = highpass = lowpass = dryGain = wetGain = convolver = compressor = busGain = masterGain = null;
      playing = false;
      btn.textContent = "Press to Listen";
      btn.classList.remove("is-active");
      btn.setAttribute("aria-pressed", "false");
      if (stateTag) {
        stateTag.setAttribute("data-listen-scope-state", "STANDBY");
        stateTag.textContent = "STANDBY";
      }
      if (spec) {
        spec.classList.remove("is-active");
        setTimeout(() => specCtx && specCtx.clearRect(0, 0, spec.width, spec.height), 1300);
      }
      stopping = false;
      startIdle();
    }

    btn.addEventListener("click", () => playing ? stop() : start());
    // Keyboard activation feels right
    btn.addEventListener("keydown", (e) => {
      if ((e.key === " " || e.key === "Enter") && !e.repeat) {
        e.preventDefault();
        playing ? stop() : start();
      }
    });

    // Idle scope — react to remote EMF readings even before user presses play
    setInterval(async () => {
      if (playing) return;
      try {
        const r = await fetch("/api/v1/ghost-emf/current");
        const d = await r.json();
        const v = Math.max(0, d.numericValue ?? 0);
        smoothedEmf = smoothedEmf * 0.7 + (v / 5) * 0.3; // crude normalise for idle viz
      } catch {}
    }, 3000);

    // Resize handling
    let resizeT = null;
    window.addEventListener("resize", () => {
      if (resizeT) clearTimeout(resizeT);
      resizeT = setTimeout(() => {
        peakHold = null;
        if (scope) syncCanvasSize(scope);
        if (spec) syncCanvasSize(spec);
      }, 120);
    });

    syncCanvasSize(scope);
    syncCanvasSize(spec);
    startIdle();
  }

  /* ═══════════════════════════════════════════════
     #4 — CONSPIRACY STRING BOARD
     Interactive evidence board with draggable red strings
     ═══════════════════════════════════════════════ */

  function initStringBoard() {
    const overlay = $("stringboard-overlay");
    if (!overlay) return;
    const canvas = overlay.querySelector(".stringboard-canvas");
    const ctx = canvas?.getContext("2d");
    if (!ctx) return;

    let boardActive = false;
    let panX = 0, panY = 0, dragging = false, lastX = 0, lastY = 0;
    let zoom = 1;

    const nodes = [
      { id: "emf", label: "EMF Sensor", x: 400, y: 300, color: "#FF1744" },
      { id: "gondor", label: "4 GONDOR", x: 200, y: 150, color: "#7C3AED" },
      { id: "hobbits", label: "The Hobbits", x: 600, y: 150, color: "#7C3AED" },
      { id: "porcine", label: "Porcine Directive", x: 700, y: 400, color: "#FF1744" },
      { id: "cern", label: "CERN Question", x: 300, y: 500, color: "#7AFFAE" },
      { id: "radiation", label: "WiFi Radiation", x: 500, y: 500, color: "#FF6D00" },
      { id: "exorcism", label: "Rejected Exorcism", x: 150, y: 300, color: "#7C3AED" },
      { id: "phs06", label: "PHS '06", x: 650, y: 300, color: "#00E5FF" },
      { id: "avatar", label: "Avatar Frame", x: 400, y: 100, color: "#FF1744" },
      { id: "666", label: "666 Rock", x: 250, y: 250, color: "#FF1744" },
      { id: "crop", label: "Crop Circle", x: 550, y: 250, color: "#7AFFAE" },
      { id: "dream", label: "Dream Burden", x: 450, y: 450, color: "#00E5FF" },
      { id: "crystal", label: "Crystal Theory", x: 350, y: 200, color: "#7AFFAE" },
    ];

    const connections = [
      ["emf", "radiation"], ["emf", "cern"], ["gondor", "hobbits"],
      ["porcine", "emf"], ["porcine", "666"],
      ["exorcism", "avatar"], ["phs06", "avatar"], ["cern", "crystal"],
      ["dream", "emf"], ["crop", "cern"], ["gondor", "porcine"],
      ["radiation", "phs06"], ["hobbits", "avatar"],
    ];

    function resize() {
      canvas.width = overlay.clientWidth;
      canvas.height = overlay.clientHeight;
      draw();
    }

    function draw() {
      const w = canvas.width, h = canvas.height;
      ctx.clearRect(0, 0, w, h);
      ctx.save();
      ctx.translate(panX + w / 2, panY + h / 2);
      ctx.scale(zoom, zoom);
      ctx.translate(-400, -300);

      // Draw strings
      connections.forEach(([a, b]) => {
        const na = nodes.find((n) => n.id === a);
        const nb = nodes.find((n) => n.id === b);
        if (!na || !nb) return;
        ctx.strokeStyle = "rgba(255, 23, 68, 0.5)";
        ctx.lineWidth = 1.5;
        ctx.setLineDash([8, 4]);
        ctx.beginPath();
        ctx.moveTo(na.x, na.y);
        // Slight curve
        const mx = (na.x + nb.x) / 2 + (Math.random() - 0.5) * 20;
        const my = (na.y + nb.y) / 2 + (Math.random() - 0.5) * 20;
        ctx.quadraticCurveTo(mx, my, nb.x, nb.y);
        ctx.stroke();
        ctx.setLineDash([]);
      });

      // Draw pushpins and labels
      nodes.forEach((node) => {
        // Pushpin
        ctx.fillStyle = node.color;
        ctx.beginPath();
        ctx.arc(node.x, node.y, 8, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = "rgba(0,0,0,0.5)";
        ctx.lineWidth = 1;
        ctx.stroke();

        // Pin highlight
        ctx.fillStyle = "rgba(255,255,255,0.4)";
        ctx.beginPath();
        ctx.arc(node.x - 2, node.y - 2, 3, 0, Math.PI * 2);
        ctx.fill();

        // Label
        ctx.fillStyle = "#F0E6FF";
        ctx.font = "12px 'Fira Code', monospace";
        ctx.textAlign = "center";
        ctx.fillText(node.label, node.x, node.y + 22);
      });

      ctx.restore();
    }

    canvas.addEventListener("mousedown", (e) => {
      dragging = true;
      lastX = e.clientX;
      lastY = e.clientY;
      canvas.style.cursor = "grabbing";
    });
    canvas.addEventListener("mousemove", (e) => {
      if (!dragging) return;
      panX += e.clientX - lastX;
      panY += e.clientY - lastY;
      lastX = e.clientX;
      lastY = e.clientY;
      draw();
    });
    canvas.addEventListener("mouseup", () => { dragging = false; canvas.style.cursor = "grab"; });
    canvas.addEventListener("wheel", (e) => {
      e.preventDefault();
      zoom = Math.max(0.5, Math.min(3, zoom - e.deltaY * 0.001));
      draw();
    }, { passive: false });

    document.addEventListener("click", (e) => {
      if (e.target.closest("[data-action='open-stringboard']")) {
        boardActive = true;
        overlay.classList.add("is-active");
        document.body.style.overflow = "hidden";
        resize();
        window.addEventListener("resize", resize);
      }
      if (e.target.closest("[data-action='close-stringboard']")) {
        boardActive = false;
        overlay.classList.remove("is-active");
        document.body.style.overflow = "";
        window.removeEventListener("resize", resize);
      }
    });
  }

  /* ═══════════════════════════════════════════════
     #5 — TIMELINE TIME MACHINE
     Scroll-driven parallax with wormhole portal effect
     ═══════════════════════════════════════════════ */

  function initTimeMachine() {
    const tlSection = document.querySelector("[data-testid='timeline-nav']");
    if (!tlSection) return;

    // Add portal effect on scroll
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const ratio = entry.intersectionRatio;
          entry.target.style.setProperty("--portal-progress", ratio.toFixed(2));
          if (ratio > 0.1) {
            entry.target.classList.add("tl-portal-active");
          } else {
            entry.target.classList.remove("tl-portal-active");
          }
        });
      },
      { threshold: Array.from({ length: 20 }, (_, i) => i / 20) }
    );

    // Observe each timeline card for parallax
    const cards = $$(".tl-card");
    cards.forEach((card) => observer.observe(card));

    // Scroll-driven warp on the timeline section itself
    if (CSS.supports("animation-timeline: scroll()")) {
      tlSection.style.setProperty("animation-timeline", "scroll()");
    }
  }

  /* ═══════════════════════════════════════════════
     #6 — AI DEBATE ARENA
     Two AI instances argue Signal positions live
     ═══════════════════════════════════════════════ */

  function initDebate() {
    const overlay = $("debate-overlay");
    if (!overlay) return;
    const topicBtns = overlay.querySelectorAll("[data-debate-topic]");
    const transcript = overlay.querySelector(".debate-transcript");
    const scoreA = overlay.querySelector(".debate-score-a");
    const scoreB = overlay.querySelector(".debate-score-b");
    let debateActive = false;
    let votes = { for: 0, against: 0 };

    async function startDebate(topic) {
      if (!transcript) return;
      transcript.innerHTML = "";
      votes = { for: 0, against: 0 };
      updateScores();

      const addMessage = (speaker, text, side) => {
        const msg = el("div", `debate-msg debate-${side}`);
        const label = el("span", "debate-speaker", speaker);
        const body = el("p", "debate-text", text);
        msg.append(label, body);
        transcript.appendChild(msg);
        transcript.scrollTop = transcript.scrollHeight;
      };

      addMessage("MODERATOR", `Tonight's topic: ${topic}. Signal AI argues FOR. Shadow AI argues AGAINST.`, "mod");

      try {
        const res = await fetch("/api/v1/debate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ topic }),
        });
        const data = await res.json();
        if (data.rounds) {
          for (const round of data.rounds) {
            await new Promise((r) => setTimeout(r, 1500));
            addMessage("SIGNAL AI", round.for, "for");
            await new Promise((r) => setTimeout(r, 1500));
            addMessage("SHADOW AI", round.against, "against");
          }
          addMessage("MODERATOR", "The debate concludes. Cast your vote below.", "mod");
        }
      } catch {
        addMessage("SYSTEM", "Debate API unavailable. The signal is disrupted.", "mod");
      }
    }

    function updateScores() {
      if (scoreA) scoreA.textContent = votes.for;
      if (scoreB) scoreB.textContent = votes.against;
    }

    document.addEventListener("click", (e) => {
      if (e.target.closest("[data-action='open-debate']")) {
        overlay.classList.add("is-active");
        document.body.style.overflow = "hidden";
        debateActive = true;
      }
      if (e.target.closest("[data-action='close-debate']")) {
        overlay.classList.remove("is-active");
        document.body.style.overflow = "";
        debateActive = false;
      }
      const topicBtn = e.target.closest("[data-debate-topic]");
      if (topicBtn && debateActive) {
        startDebate(topicBtn.dataset.debateTopic);
      }
      if (e.target.closest("[data-vote='for']")) {
        votes.for++;
        updateScores();
      }
      if (e.target.closest("[data-vote='against']")) {
        votes.against++;
        updateScores();
      }
    });
  }

  /* ═══════════════════════════════════════════════
     #7 — GHOST DETECTOR PWA
     Device magnetometer as local EMF detector
     ═══════════════════════════════════════════════ */

  function initGhostDetector() {
    const panel = $("ghost-detector");
    if (!panel) return;
    const localReading = panel.querySelector(".detector-local-value");
    const remoteReading = panel.querySelector(".detector-remote-value");
    const meterFill = panel.querySelector(".detector-meter-fill");
    const statusText = panel.querySelector(".detector-status");
    const localUnit = panel.querySelector(".listen-feature-reading:not(.listen-feature-reading--remote) .detector-unit");

    /* ── shared state ─────────────────────────────────────── */
    let smoothedLocal = 0;          // EMA mG
    let baselineLocal = 0;          // running floor
    let peakLocal = 0;              // running peak
    let smoothedRemote = 0;         // EMA mG (remote)
    let lastTickTs = 0;             // hz calc
    let tickHz = 0;                 // measured update rate
    let sourceLabel = "";           // "magnetometer" | "motion" | "orientation"
    let permissionGranted = false;
    let sensorOnline = false;
    let permissionButton = null;

    /* ── status helpers ───────────────────────────────────── */
    const setStatus = (txt, kind = "neutral") => {
      if (!statusText) return;
      statusText.textContent = txt;
      statusText.dataset.state = kind; // CSS may color: live | denied | waiting | offline | warn
    };
    const setLocalUnit = (txt) => {
      if (localUnit) localUnit.textContent = txt;
    };

    /* ── EMA + meter renderer ─────────────────────────────── */
    function pushLocal(rawMg) {
      const now = performance.now();
      if (lastTickTs) {
        const dt = (now - lastTickTs) / 1000;
        if (dt > 0) tickHz = tickHz * 0.85 + (1 / dt) * 0.15;
      }
      lastTickTs = now;

      smoothedLocal = smoothedLocal * 0.78 + rawMg * 0.22;
      baselineLocal = baselineLocal === 0
        ? smoothedLocal
        : Math.min(baselineLocal * 1.0005, baselineLocal * 0.995 + smoothedLocal * 0.005);
      peakLocal = Math.max(peakLocal * 0.997, smoothedLocal);

      if (localReading) localReading.textContent = smoothedLocal.toFixed(2);
      renderMeter();
      maybeUpdateStatus();
    }

    function renderMeter() {
      if (!meterFill) return;
      const span = Math.max(0.05, peakLocal - baselineLocal);
      const norm = Math.min(1, Math.max(0, (smoothedLocal - baselineLocal) / span));
      const remoteNorm = Math.min(1, smoothedRemote / 0.4);
      const combined = Math.max(norm, remoteNorm);
      meterFill.style.width = (combined * 100).toFixed(1) + "%";

      // Alarm coloring — both sides hot = ghost detected
      const both = norm > 0.55 && remoteNorm > 0.55;
      const localHot = norm > 0.65;
      const remoteHot = remoteNorm > 0.65;
      meterFill.dataset.state = both
        ? "ghost"
        : localHot
        ? "local"
        : remoteHot
        ? "remote"
        : "calm";
    }

    function maybeUpdateStatus() {
      if (!sensorOnline) return;
      const span = Math.max(0.05, peakLocal - baselineLocal);
      const norm = Math.min(1, Math.max(0, (smoothedLocal - baselineLocal) / span));
      const hzTxt = tickHz ? ` · ${tickHz.toFixed(1)} Hz` : "";
      if (norm > 0.65 && smoothedRemote > 0.18) {
        setStatus(`Both sides spiking${hzTxt} · ${sourceLabel} live`, "warn");
      } else if (norm > 0.6) {
        setStatus(`Local spike${hzTxt} · ${sourceLabel} live`, "live");
      } else if (smoothedRemote > 0.25) {
        setStatus(`Corridor spike · ${sourceLabel} live${hzTxt}`, "live");
      } else {
        setStatus(`${sourceLabel} live${hzTxt}`, "live");
      }
    }

    /* ── sensor sources ───────────────────────────────────── */
    function startMagnetometer() {
      if (!("Magnetometer" in window)) return false;
      try {
        const mag = new Magnetometer({ frequency: 10 });
        mag.addEventListener("reading", () => {
          const mag2 = mag.x * mag.x + mag.y * mag.y + mag.z * mag.z;
          const mG = Math.sqrt(mag2) * 10; // µT → mG (rough; sensor reports µT)
          sensorOnline = true;
          pushLocal(mG);
        });
        mag.addEventListener("error", (e) => {
          sensorOnline = false;
          if (e?.error?.name === "NotAllowedError") {
            setStatus("Magnetometer permission denied", "denied");
          } else {
            attemptDeviceMotion();
          }
        });
        mag.start();
        sourceLabel = "magnetometer";
        setLocalUnit("milligauss");
        return true;
      } catch {
        return false;
      }
    }

    function attemptDeviceMotion() {
      if (typeof DeviceMotionEvent === "undefined") return attemptDeviceOrientation();
      let received = false;
      const handler = (e) => {
        const acc = e.accelerationIncludingGravity || e.acceleration;
        if (!acc) return;
        received = true;
        // Use micro-jitter as a stand-in field disturbance proxy
        const jitter = Math.sqrt(
          (acc.x || 0) ** 2 + (acc.y || 0) ** 2 + (acc.z || 0) ** 2
        );
        // Subtract gravity-magnitude (~9.8) and rescale to a "mG-ish" value
        const proxy = Math.max(0, Math.abs(jitter - 9.8)) * 12;
        sensorOnline = true;
        pushLocal(proxy);
      };
      window.addEventListener("devicemotion", handler);
      sourceLabel = "motion";
      setLocalUnit("milligauss · proxy");
      // If nothing arrives within 2s, fall back further
      setTimeout(() => {
        if (!received) {
          window.removeEventListener("devicemotion", handler);
          attemptDeviceOrientation();
        }
      }, 2000);
      return true;
    }

    function attemptDeviceOrientation() {
      if (!window.DeviceOrientationEvent) {
        sensorOnline = false;
        setStatus("No phone sensors · remote feed only", "offline");
        return false;
      }
      let received = false;
      const handler = (e) => {
        if (e.alpha == null && e.beta == null && e.gamma == null) return;
        received = true;
        const a = Math.abs(((e.alpha || 0) % 90) / 90);
        const b = Math.abs(((e.beta || 0) % 90) / 90);
        const g = Math.abs(((e.gamma || 0) % 90) / 90);
        const proxy = (a + b + g) / 3 * 0.5; // 0..0.5 range pseudo mG
        sensorOnline = true;
        pushLocal(proxy);
      };
      window.addEventListener("deviceorientation", handler);
      sourceLabel = "orientation";
      setLocalUnit("milligauss · proxy");
      setTimeout(() => {
        if (!received) {
          sensorOnline = false;
          setStatus("Phone sensors silent · remote feed only", "offline");
        }
      }, 2500);
      return true;
    }

    /* ── iOS 13+ permission gate ──────────────────────────── */
    function needsPermission() {
      const motionGate =
        typeof DeviceMotionEvent !== "undefined" &&
        typeof DeviceMotionEvent.requestPermission === "function";
      const orientGate =
        typeof DeviceOrientationEvent !== "undefined" &&
        typeof DeviceOrientationEvent.requestPermission === "function";
      return motionGate || orientGate;
    }

    async function requestPermission() {
      try {
        let granted = true;
        if (
          typeof DeviceMotionEvent !== "undefined" &&
          typeof DeviceMotionEvent.requestPermission === "function"
        ) {
          const r = await DeviceMotionEvent.requestPermission();
          granted = granted && r === "granted";
        }
        if (
          typeof DeviceOrientationEvent !== "undefined" &&
          typeof DeviceOrientationEvent.requestPermission === "function"
        ) {
          const r2 = await DeviceOrientationEvent.requestPermission();
          granted = granted && r2 === "granted";
        }
        permissionGranted = granted;
        return granted;
      } catch {
        return false;
      }
    }

    function injectPermissionButton() {
      if (permissionButton) return;
      permissionButton = document.createElement("button");
      permissionButton.type = "button";
      permissionButton.className = "button button-ghost detector-enable-btn";
      permissionButton.textContent = "Enable Phone Sensors";
      permissionButton.setAttribute("aria-label", "Enable phone motion and magnetometer sensors for ghost detection");
      const head = panel.querySelector(".listen-feature-detector-head") || panel;
      head.appendChild(permissionButton);
      permissionButton.addEventListener("click", async () => {
        permissionButton.disabled = true;
        permissionButton.textContent = "Requesting…";
        const ok = await requestPermission();
        if (ok) {
          permissionButton.remove();
          permissionButton = null;
          startSensors();
        } else {
          permissionButton.disabled = false;
          permissionButton.textContent = "Permission denied · try again";
          setStatus("Permission denied · remote feed only", "denied");
        }
      });
    }

    function startSensors() {
      if (!startMagnetometer()) {
        attemptDeviceMotion();
      }
      setStatus("Waiting for first reading…", "waiting");
    }

    /* ── boot ─────────────────────────────────────────────── */
    if (needsPermission()) {
      setStatus("Tap to enable phone sensors", "waiting");
      injectPermissionButton();
    } else {
      startSensors();
    }

    /* ── remote poll w/ EMA + tighter cadence ─────────────── */
    async function pollRemote() {
      try {
        const r = await fetch("/api/v1/ghost-emf/current", { cache: "no-store" });
        const d = await r.json();
        const v = Math.max(0, Number(d.numericValue ?? 0));
        smoothedRemote = smoothedRemote * 0.6 + v * 0.4;
        if (remoteReading) remoteReading.textContent = smoothedRemote.toFixed(3);
        renderMeter();
        if (!sensorOnline) {
          setStatus(
            smoothedRemote > 0.25 ? "Corridor spike · remote feed only" : "Remote feed live",
            smoothedRemote > 0.25 ? "warn" : "offline"
          );
        }
      } catch {}
    }
    pollRemote();
    setInterval(pollRemote, 2500);
  }

  /* ═══════════════════════════════════════════════
     #8 — ENTROPY DICE CASINO
     Provably fair games powered by true EMF entropy
     ═══════════════════════════════════════════════ */

  function initCasino() {
    const overlay = $("casino-overlay");
    if (!overlay) return;
    const diceResult = overlay.querySelector(".casino-dice-result");
    const coinResult = overlay.querySelector(".casino-coin-result");
    const streakDisplay = overlay.querySelector(".casino-streak");
    const historyList = overlay.querySelector(".casino-history");
    let streak = 0;
    let lastResult = null;

    async function getEntropyNumber(max) {
      try {
        const r = await fetch("/api/v1/ghost-emf/entropy");
        const d = await r.json();
        // Use entropy bits to seed a pseudo-random selection
        const seed = d.entropyBits * 1000 + Date.now();
        return Math.floor((seed % max) + 1);
      } catch {
        return Math.floor(Math.random() * max) + 1;
      }
    }

    async function rollDice() {
      if (diceResult) diceResult.textContent = "...";
      diceResult?.classList.add("casino-rolling");
      const val = await getEntropyNumber(6);
      setTimeout(() => {
        const faces = ["", "\u2680", "\u2681", "\u2682", "\u2683", "\u2684", "\u2685"];
        if (diceResult) {
          diceResult.textContent = faces[val];
          diceResult.classList.remove("casino-rolling");
        }
        updateStreak("dice-" + val);
        addHistory(`Dice: ${val} ${faces[val]}`);
      }, 600);
    }

    async function flipCoin() {
      if (coinResult) coinResult.textContent = "...";
      coinResult?.classList.add("casino-flipping");
      const val = await getEntropyNumber(2);
      setTimeout(() => {
        const face = val === 1 ? "HEADS" : "TAILS";
        if (coinResult) {
          coinResult.textContent = face;
          coinResult.classList.remove("casino-flipping");
        }
        updateStreak("coin-" + face);
        addHistory(`Coin: ${face}`);
      }, 500);
    }

    function updateStreak(result) {
      if (result === lastResult) {
        streak++;
      } else {
        streak = 1;
        lastResult = result;
      }
      if (streakDisplay) {
        streakDisplay.textContent = streak > 1 ? `${streak}x streak!` : "";
        if (streak >= 5) streakDisplay.classList.add("casino-hot-streak");
        else streakDisplay.classList.remove("casino-hot-streak");
      }
    }

    function addHistory(text) {
      if (!historyList) return;
      const item = el("div", "casino-history-item", text);
      historyList.prepend(item);
      if (historyList.children.length > 20) historyList.lastChild.remove();
    }

    document.addEventListener("click", (e) => {
      if (e.target.closest("[data-action='open-casino']")) {
        overlay.classList.add("is-active");
        document.body.style.overflow = "hidden";
      }
      if (e.target.closest("[data-action='close-casino']")) {
        overlay.classList.remove("is-active");
        document.body.style.overflow = "";
      }
      if (e.target.closest("[data-action='roll-dice']")) rollDice();
      if (e.target.closest("[data-action='flip-coin']")) flipCoin();
    });
  }

  /* ═══════════════════════════════════════════════
     #9 — MUD SIGNAL HQ
     Text adventure exploring the Ghost Signal as a game
     ═══════════════════════════════════════════════ */

  function initCampaignHQ() {
    const overlay = $("campaign-hq-overlay");
    if (!overlay) return;
    const output = overlay.querySelector(".hq-output");
    const input = overlay.querySelector(".hq-input");
    if (!output || !input) return;

    const rooms = {
      lobby: {
        desc: "You stand in the lobby of the Ghost Signal Headquarters. A giant EMF sensor hums on the wall. Doors lead NORTH to the War Room, EAST to the Entropy Lab, and SOUTH to the Hotline Center.",
        exits: { north: "warroom", east: "lab", south: "hotline" },
        items: ["signal poster", "ghost sensor readings"],
      },
      warroom: {
        desc: "The War Room. Screens display live EMF data, conspiracy string boards, and a wall of plate sightings. A portrait of Tom Greene hangs above the motto: 'I want to throw the Piggy.' Exits: SOUTH to Lobby, EAST to Dossier Vault.",
        exits: { south: "lobby", east: "vault" },
        items: ["entropy roadmap", "porcine directive memo"],
      },
      lab: {
        desc: "The Entropy Lab. A GQ EMF-390 sensor sits in a Faraday cage, generating true random numbers from electromagnetic fluctuations. Monitors show real-time entropy calculations. A sign reads: 'No algorithm can fake this.' Exit: WEST to Lobby.",
        exits: { west: "lobby" },
        items: ["entropy crystal", "iron washer"],
      },
      hotline: {
        desc: "The Hotline Center. Phones ring with transmissions from across the country. A recording plays: 'Everything you say is recorded, transcribed, and published.' Exit: NORTH to Lobby, EAST to Memorial.",
        exits: { north: "lobby", east: "memorial" },
        items: ["phone transcripts", "666 sticker"],
      },
      vault: {
        desc: "The Dossier Vault. Filing cabinets labeled: 4 GONDOR, Crop Circle, Dream Burden, PHS '06, Celestial Hallucinations. Red string connects them all. A single overhead bulb swings. Exit: WEST to War Room.",
        exits: { west: "warroom" },
        items: ["classified dossier", "red string"],
      },
      memorial: {
        desc: "A quiet memorial room. Gravestones for relationships that didn't survive the signal. A candle flickers. 'RIP Friends & Family' is etched into a stone tablet. Exit: WEST to Hotline Center.",
        exits: { west: "hotline" },
        items: ["memorial candle", "old photograph"],
      },
    };

    let currentRoom = "lobby";
    let inventory = [];

    function print(text, cls = "") {
      const line = el("div", "hq-line " + cls, text);
      output.appendChild(line);
      output.scrollTop = output.scrollHeight;
    }

    function look() {
      const room = rooms[currentRoom];
      print(room.desc, "hq-desc");
      if (room.items.length > 0) {
        print("You see: " + room.items.join(", "), "hq-items");
      }
    }

    function processCommand(cmd) {
      const parts = cmd.toLowerCase().trim().split(/\s+/);
      const verb = parts[0];
      const noun = parts.slice(1).join(" ");

      print(`> ${cmd}`, "hq-input-echo");

      if (["n", "north", "s", "south", "e", "east", "w", "west"].includes(verb)) {
        const dirMap = { n: "north", s: "south", e: "east", w: "west" };
        const dir = dirMap[verb] || verb;
        const room = rooms[currentRoom];
        if (room.exits[dir]) {
          currentRoom = room.exits[dir];
          print("---");
          look();
        } else {
          print("You can't go that way.");
        }
      } else if (verb === "look" || verb === "l") {
        look();
      } else if (verb === "take" || verb === "get") {
        const room = rooms[currentRoom];
        const idx = room.items.findIndex((i) => i.toLowerCase().includes(noun));
        if (idx >= 0) {
          const item = room.items.splice(idx, 1)[0];
          inventory.push(item);
          print(`You take the ${item}.`);
        } else {
          print("You don't see that here.");
        }
      } else if (verb === "inventory" || verb === "i") {
        print(inventory.length ? "Carrying: " + inventory.join(", ") : "Your hands are empty.");
      } else if (verb === "help") {
        print("Commands: look, north/south/east/west (or n/s/e/w), take [item], inventory, help");
      } else {
        print("The signal doesn't understand that. Try 'help'.");
      }
    }

    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter" && input.value.trim()) {
        processCommand(input.value.trim());
        input.value = "";
      }
    });

    document.addEventListener("click", (e) => {
      if (e.target.closest("[data-action='open-campaign-hq']")) {
        overlay.classList.add("is-active");
        document.body.style.overflow = "hidden";
        output.innerHTML = "";
        currentRoom = "lobby";
        inventory = [];
        print("=== GHOST SIGNAL HQ ===", "hq-title");
        print("A text adventure through the Signal. Type 'help' for commands.", "hq-subtitle");
        print("---");
        look();
        input.focus();
      }
      if (e.target.closest("[data-action='close-campaign-hq']")) {
        overlay.classList.remove("is-active");
        document.body.style.overflow = "";
      }
    });
  }

  /* ═══════════════════════════════════════════════
     #10 — DOSSIER CARD SHUFFLE
     Tinder-style swipe interface for evidence cards
     ═══════════════════════════════════════════════ */

  function initCardShuffle() {
    const overlay = $("shuffle-overlay");
    if (!overlay) return;
    const deck = overlay.querySelector(".shuffle-deck");
    const scoreEl = overlay.querySelector(".shuffle-score");
    const countEl = overlay.querySelector(".shuffle-count");
    const resultEl = overlay.querySelector(".shuffle-result");
    if (!deck) return;

    const cards = [
      { title: "4 GONDOR", body: "Lord of the Rings license plate spotted across state lines.", severity: 5 },
      { title: "The Crop Circle", body: "Found hiking in an unusual direction with a friend who got a royal flush.", severity: 5 },
      { title: "Dream Burden", body: "Bizarre dreams. A shaggy ghost dog. Unsettling physical sensations.", severity: 4 },
      { title: "The CERN Question", body: "A scientist headed to CERN described teleportation as already possible.", severity: 5 },
      { title: "Porcine Directive", body: "He broke D.C.'s Porcine Directive — and the haunting started.", severity: 5 },
      { title: "The Volume Hack", body: "A hacker remotely adjusting the computer's volume. Nobody else in the room.", severity: 4 },
      { title: "WiFi Radiation", body: "WiFi SSID renamed to 'Radiation TDR' — related to research at Rutgers.", severity: 5 },
      { title: "PHS '06", body: "The ghost spoke: 'Parsippany High School. 06.' The haunting has a yearbook.", severity: 5 },
      { title: "Rejected Exorcism", body: "Multiple priests rejected the exorcism. All of them were scared.", severity: 4 },
      { title: "Crystal Theory", body: "Crystalline consciousness — willing to break down perception itself.", severity: 3 },
      { title: "Celestial Hallucinations", body: "God erased everything with infinite hallucinations into the next dimension.", severity: 5 },
      { title: "Avatar Frame", body: "Angel, prophet, god, demon. Graceful until you mention it. Then brutal.", severity: 5 },
      { title: "666 Rock", body: "666 spray painted at a scenic lake. Scrubbed clean. Washington next.", severity: 5 },
    ];

    let currentIndex = 0;
    let believe = 0;
    let total = 0;

    function renderCard() {
      if (currentIndex >= cards.length) {
        showResult();
        return;
      }
      deck.innerHTML = "";
      const card = cards[currentIndex];
      const cardEl = el("div", "shuffle-card");
      cardEl.innerHTML = `
        <span class="shuffle-label">EVIDENCE #${currentIndex + 1}</span>
        <h3 class="shuffle-title">${card.title}</h3>
        <p class="shuffle-body">${card.body}</p>
        <div class="shuffle-severity">${"\u2588".repeat(card.severity)}</div>
        <div class="shuffle-actions">
          <button class="shuffle-btn shuffle-doubt" data-action="shuffle-left">Prove It</button>
          <button class="shuffle-btn shuffle-believe" data-action="shuffle-right">I Believe</button>
        </div>
      `;
      deck.appendChild(cardEl);
      if (countEl) countEl.textContent = `${currentIndex + 1} / ${cards.length}`;
    }

    function showResult() {
      const pct = Math.round((believe / cards.length) * 100);
      let tier, desc;
      if (pct >= 80) { tier = "TRUE BELIEVER"; desc = "You see the pattern. The signal chose well."; }
      else if (pct >= 50) { tier = "OPEN MIND"; desc = "Skeptical but curious. The signal respects that."; }
      else if (pct >= 20) { tier = "HARD SKEPTIC"; desc = "You need more proof. Fair. Check the EMF data."; }
      else { tier = "TOTAL DENIER"; desc = "You reject the evidence. The ghost notes your position."; }

      deck.innerHTML = "";
      if (resultEl) {
        resultEl.innerHTML = `
          <div class="shuffle-result-card">
            <span class="shuffle-result-tier">${tier}</span>
            <p class="shuffle-result-score">${pct}% belief compatibility</p>
            <p class="shuffle-result-desc">${desc}</p>
            <p class="shuffle-result-share">Share your result: ghost.megabyte.space/belief/${pct}</p>
          </div>
        `;
      }
    }

    document.addEventListener("click", (e) => {
      if (e.target.closest("[data-action='open-shuffle']")) {
        overlay.classList.add("is-active");
        document.body.style.overflow = "hidden";
        currentIndex = 0;
        believe = 0;
        total = 0;
        if (resultEl) resultEl.innerHTML = "";
        renderCard();
      }
      if (e.target.closest("[data-action='close-shuffle']")) {
        overlay.classList.remove("is-active");
        document.body.style.overflow = "";
      }
      if (e.target.closest("[data-action='shuffle-right']")) {
        believe++;
        currentIndex++;
        renderCard();
      }
      if (e.target.closest("[data-action='shuffle-left']")) {
        currentIndex++;
        renderCard();
      }
    });
  }

  /* ═══════════════════════════════════════════════
     #12 — GLITCH ART GENERATOR
     Upload a photo, haunt it with EMF-seeded glitches
     ═══════════════════════════════════════════════ */

  function initGlitchArt() {
    const overlay = $("glitch-overlay");
    if (!overlay) return;
    const fileInput = overlay.querySelector(".glitch-file-input");
    const canvas = overlay.querySelector(".glitch-canvas");
    const ctx = canvas?.getContext("2d");
    const intensitySlider = overlay.querySelector(".glitch-intensity");
    const downloadBtn = overlay.querySelector("[data-action='download-glitch']");
    if (!ctx || !fileInput) return;

    let sourceImage = null;
    let emfSeed = 0;

    fileInput.addEventListener("change", (e) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        const img = new Image();
        img.onload = () => {
          sourceImage = img;
          canvas.width = Math.min(800, img.width);
          canvas.height = Math.min(600, (img.height / img.width) * canvas.width);
          applyGlitch();
        };
        img.src = ev.target.result;
      };
      reader.readAsDataURL(file);
    });

    async function fetchEMFSeed() {
      try {
        const r = await fetch("/api/v1/ghost-emf/current");
        const d = await r.json();
        emfSeed = d.numericValue ?? 0;
      } catch { emfSeed = Math.random() * 5; }
    }

    function applyGlitch() {
      if (!sourceImage || !ctx) return;
      const w = canvas.width, h = canvas.height;
      const intensity = intensitySlider ? parseFloat(intensitySlider.value) : 0.5;
      const glitchLevel = intensity * (1 + emfSeed);

      // Draw base image
      ctx.drawImage(sourceImage, 0, 0, w, h);

      // Get pixel data
      const imageData = ctx.getImageData(0, 0, w, h);
      const data = imageData.data;

      // Channel shift
      const shift = Math.floor(glitchLevel * 15);
      for (let y = 0; y < h; y++) {
        if (Math.random() < glitchLevel * 0.3) {
          const sliceHeight = 1 + Math.floor(Math.random() * 5 * glitchLevel);
          for (let sy = 0; sy < sliceHeight && y + sy < h; sy++) {
            for (let x = 0; x < w; x++) {
              const i = ((y + sy) * w + x) * 4;
              const shiftedI = ((y + sy) * w + Math.min(w - 1, x + shift)) * 4;
              data[i] = data[shiftedI]; // Red channel shift
            }
          }
          y += sliceHeight;
        }
      }

      // Scanline corruption
      for (let y = 0; y < h; y++) {
        if (Math.random() < glitchLevel * 0.1) {
          for (let x = 0; x < w; x++) {
            const i = (y * w + x) * 4;
            data[i] = 255; // Red flash
            data[i + 1] = Math.floor(data[i + 1] * 0.3);
            data[i + 2] = Math.floor(data[i + 2] * 0.3);
          }
        }
      }

      // Block corruption
      const blocks = Math.floor(glitchLevel * 5);
      for (let b = 0; b < blocks; b++) {
        const bx = Math.floor(Math.random() * w);
        const by = Math.floor(Math.random() * h);
        const bw = 20 + Math.floor(Math.random() * 60 * glitchLevel);
        const bh = 5 + Math.floor(Math.random() * 20 * glitchLevel);
        for (let y = by; y < by + bh && y < h; y++) {
          for (let x = bx; x < bx + bw && x < w; x++) {
            const i = (y * w + x) * 4;
            data[i] = (data[i] + 128) % 256;
            data[i + 1] = (data[i + 1] + 64) % 256;
          }
        }
      }

      ctx.putImageData(imageData, 0, 0);

      // Ghost watermark
      ctx.fillStyle = "rgba(255, 23, 68, 0.3)";
      ctx.font = "10px 'Fira Code', monospace";
      ctx.fillText(`ghost.megabyte.space // EMF: ${emfSeed.toFixed(3)}`, 10, h - 10);
    }

    intensitySlider?.addEventListener("input", () => applyGlitch());

    downloadBtn?.addEventListener("click", () => {
      const link = document.createElement("a");
      link.download = "ghost-glitch.png";
      link.href = canvas.toDataURL("image/png");
      link.click();
    });

    document.addEventListener("click", (e) => {
      if (e.target.closest("[data-action='open-glitch']")) {
        overlay.classList.add("is-active");
        document.body.style.overflow = "hidden";
        fetchEMFSeed();
      }
      if (e.target.closest("[data-action='close-glitch']")) {
        overlay.classList.remove("is-active");
        document.body.style.overflow = "";
      }
      if (e.target.closest("[data-action='reglitch']")) {
        fetchEMFSeed().then(() => applyGlitch());
      }
    });
  }

  /* ═══════════════════════════════════════════════
     #13 — ELECTION NIGHT SIMULATOR
     Interactive electoral map with ghost activity
     ═══════════════════════════════════════════════ */

  function initElectionMap() {
    const overlay = $("election-overlay");
    if (!overlay) return;
    const mapContainer = overlay.querySelector(".election-map");
    const infoPanel = overlay.querySelector(".election-info");
    const voteCounter = overlay.querySelector(".election-votes");
    if (!mapContainer) return;

    const states = [
      { abbr: "NJ", name: "New Jersey", ev: 14, relevance: "Signal origin. Morristown — Washington's second winter encampment. Ground zero.", x: 82, y: 35 },
      { abbr: "NY", name: "New York", ev: 28, relevance: "Church of God cult meeting. 4 GONDOR spotted en route.", x: 80, y: 28 },
      { abbr: "PA", name: "Pennsylvania", ev: 19, relevance: "4 GONDOR — Pennsylvania plate on a Kia Stinger.", x: 76, y: 35 },
      { abbr: "MA", name: "Massachusetts", ev: 11, relevance: "Cousin first mentioned 4 GONDOR. Family signal hub.", x: 88, y: 26 },
      { abbr: "DC", name: "Washington D.C.", ev: 3, relevance: "The Porcine Directive. The agencies that did not call back.", x: 78, y: 40 },
      { abbr: "CA", name: "California", ev: 54, relevance: "Tech capital. Where entropy science actually gets built.", x: 12, y: 40 },
      { abbr: "TX", name: "Texas", ev: 40, relevance: "Energy independence. Strong opinions on monetary entropy.", x: 40, y: 60 },
      { abbr: "FL", name: "Florida", ev: 30, relevance: "Anomaly density off the charts. Plates on plates on plates.", x: 75, y: 68 },
      { abbr: "OH", name: "Ohio", ev: 17, relevance: "Rust belt resonance. Hotline calls cluster here.", x: 70, y: 38 },
      { abbr: "MS", name: "Mississippi", ev: 6, relevance: "601 area code. The hotline's home state.", x: 58, y: 58 },
      { abbr: "IL", name: "Illinois", ev: 19, relevance: "Lincoln's state. Entropy meets infrastructure.", x: 58, y: 36 },
      { abbr: "GA", name: "Georgia", ev: 16, relevance: "Sub-tropical anomalies. Digital infrastructure hub.", x: 70, y: 55 },
    ];

    let totalVotes = 0;
    let ghostActivity = {};

    function renderMap() {
      mapContainer.innerHTML = "";
      states.forEach((s) => {
        const dot = el("button", "election-state");
        dot.style.left = s.x + "%";
        dot.style.top = s.y + "%";
        dot.textContent = s.abbr;
        dot.title = s.name;
        const ghost = ghostActivity[s.abbr] || 0;
        dot.style.setProperty("--ghost-intensity", Math.min(1, ghost / 5));
        dot.addEventListener("click", () => {
          if (infoPanel) {
            infoPanel.innerHTML = `
              <h4>${s.name} (${s.ev} electoral votes)</h4>
              <p>${s.relevance}</p>
              <p class="election-ghost-level">Ghost activity: ${ghost.toFixed(1)} mG</p>
            `;
          }
          totalVotes += s.ev;
          if (voteCounter) voteCounter.textContent = `${totalVotes} / 270`;
        });
        mapContainer.appendChild(dot);
      });
    }

    async function fetchGhostActivity() {
      try {
        const r = await fetch("/api/v1/ghost-emf/current");
        const d = await r.json();
        const base = d.numericValue ?? 0;
        states.forEach((s) => {
          ghostActivity[s.abbr] = base + (Math.random() - 0.5) * 2;
        });
        renderMap();
      } catch {}
    }

    document.addEventListener("click", (e) => {
      if (e.target.closest("[data-action='open-election']")) {
        overlay.classList.add("is-active");
        document.body.style.overflow = "hidden";
        totalVotes = 0;
        if (voteCounter) voteCounter.textContent = "0 / 270";
        fetchGhostActivity();
      }
      if (e.target.closest("[data-action='close-election']")) {
        overlay.classList.remove("is-active");
        document.body.style.overflow = "";
      }
    });
  }

  /* ═══════════════════════════════════════════════
     #14 — SCROLL-DRIVEN POSSESSION SEQUENCE
     Headshot morphs through angel/prophet/god/demon
     ═══════════════════════════════════════════════ */

  function initPossessionSequence() {
    const headshot = document.querySelector(".candidate-headshot");
    if (!headshot) return;

    // Track scroll progress across the full page
    let ticking = false;

    function onScroll() {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        const scrollPct = window.scrollY / (document.documentElement.scrollHeight - window.innerHeight);

        // Phase 1: Angel (0-25%) — soft glow
        // Phase 2: Prophet (25-50%) — golden tint
        // Phase 3: God (50-75%) — radiant white
        // Phase 4: Demon (75-100%) — red distortion
        let hue, saturate, brightness, glow, shadow;

        if (scrollPct < 0.25) {
          const t = scrollPct / 0.25;
          hue = 0;
          saturate = 1;
          brightness = 1 + t * 0.3;
          glow = `0 0 ${20 + t * 40}px rgba(124, 58, 237, ${0.3 + t * 0.4})`;
          shadow = "angel";
        } else if (scrollPct < 0.5) {
          const t = (scrollPct - 0.25) / 0.25;
          hue = t * 30;
          saturate = 1.2;
          brightness = 1.3 - t * 0.1;
          glow = `0 0 ${40 + t * 30}px rgba(255, 215, 0, ${0.3 + t * 0.3})`;
          shadow = "prophet";
        } else if (scrollPct < 0.75) {
          const t = (scrollPct - 0.5) / 0.25;
          hue = 30 - t * 30;
          saturate = 0.5 + t * 0.5;
          brightness = 1.2 + t * 0.5;
          glow = `0 0 ${60 + t * 40}px rgba(255, 255, 255, ${0.4 + t * 0.3})`;
          shadow = "god";
        } else {
          const t = (scrollPct - 0.75) / 0.25;
          hue = -20 * t;
          saturate = 1.5 + t * 1;
          brightness = 1.7 - t * 0.7;
          glow = `0 0 ${80 + t * 40}px rgba(255, 23, 68, ${0.5 + t * 0.4})`;
          shadow = "demon";
        }

        headshot.style.filter = `hue-rotate(${hue}deg) saturate(${saturate}) brightness(${brightness})`;
        headshot.style.boxShadow = glow;
        headshot.dataset.phase = shadow;

        // At 100% scroll, invert the page briefly
        if (scrollPct > 0.98) {
          document.body.classList.add("possession-complete");
        } else {
          document.body.classList.remove("possession-complete");
        }

        ticking = false;
      });
    }

    window.addEventListener("scroll", onScroll, { passive: true });
  }

  /* ═══════════════════════════════════════════════
     AVATAR FRAME SLIDESHOW
     ═══════════════════════════════════════════════ */

  function initAvatarSlideshow() {
    const root = document.querySelector('[data-component="avatar-slideshow"]');
    if (!root) return;
    const slides = Array.from(root.querySelectorAll('.avatar-slide'));
    const thumbs = Array.from(root.querySelectorAll('[data-slide-jump]'));
    const counter = root.querySelector('[data-slide-counter]');
    const prevBtn = root.querySelector('[data-slide-prev]');
    const nextBtn = root.querySelector('[data-slide-next]');
    if (!slides.length) return;

    let index = 0;

    function go(next) {
      const target = (next + slides.length) % slides.length;
      slides.forEach((slide, i) => {
        slide.classList.toggle('is-active', i === target);
      });
      thumbs.forEach((thumb, i) => {
        const active = i === target;
        thumb.classList.toggle('is-active', active);
        thumb.setAttribute('aria-selected', active ? 'true' : 'false');
        if (active) {
          thumb.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
        }
      });
      if (counter) counter.textContent = `${target + 1} / ${slides.length}`;
      index = target;
    }

    thumbs.forEach((thumb) => {
      thumb.addEventListener('click', () => {
        const i = parseInt(thumb.getAttribute('data-slide-jump'), 10);
        if (!Number.isNaN(i)) go(i);
      });
    });
    if (prevBtn) prevBtn.addEventListener('click', () => go(index - 1));
    if (nextBtn) nextBtn.addEventListener('click', () => go(index + 1));

    root.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowLeft') { e.preventDefault(); go(index - 1); }
      if (e.key === 'ArrowRight') { e.preventDefault(); go(index + 1); }
      if (e.key === 'Home') { e.preventDefault(); go(0); }
      if (e.key === 'End') { e.preventDefault(); go(slides.length - 1); }
    });
    root.tabIndex = 0;

    let touchStart = null;
    root.addEventListener('touchstart', (e) => { touchStart = e.touches[0].clientX; }, { passive: true });
    root.addEventListener('touchend', (e) => {
      if (touchStart == null) return;
      const dx = e.changedTouches[0].clientX - touchStart;
      if (Math.abs(dx) > 40) go(index + (dx < 0 ? 1 : -1));
      touchStart = null;
    }, { passive: true });

    if (counter) counter.textContent = `1 / ${slides.length}`;
  }

  /* ═══════════════════════════════════════════════
     INIT ALL
     ═══════════════════════════════════════════════ */

  function init() {
    initSeance();
    initOuija();
    initSonification();
    initStringBoard();
    initTimeMachine();
    initDebate();
    initGhostDetector();
    initCasino();
    initCampaignHQ();
    initCardShuffle();
    initGlitchArt();
    initElectionMap();
    initPossessionSequence();
    initAvatarSlideshow();
    initRockScene();
  }

  function initRockScene() {
    const scenes = document.querySelectorAll('[data-component="rock-scene"]');
    if (!scenes.length) return;
    scenes.forEach((scene) => {
      const btn = scene.querySelector('[data-action="rock-scene-replay"]');
      if (!btn) return;
      btn.addEventListener('click', () => {
        scene.classList.remove('is-replaying');
        void scene.offsetWidth;
        scene.classList.add('is-replaying');
        scene.addEventListener('animationend', function handler(e) {
          if (e.animationName === 'rock-sky' || e.animationName === 'rock-graffiti') {
            scene.classList.remove('is-replaying');
            scene.removeEventListener('animationend', handler);
          }
        });
      });
    });
  }

  return { init };
})();

document.addEventListener("DOMContentLoaded", GhostFeatures.init);
