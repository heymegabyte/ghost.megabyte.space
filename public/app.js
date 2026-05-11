/* Ghost Signal — Frontend Controller */

const $ = (id) => document.getElementById(id);
const $$ = (sel) => Array.from(document.querySelectorAll(sel));

const currentValueEl = $("current-value");
const currentUnitEl = $("current-unit");
const currentStateEl = $("current-state");
const entropyValueEl = $("entropy-value");
const signalAgeEl = $("signal-age");
const transmissionCountEl = $("transmission-count");
const chartCanvas = $("history-chart");
const chartMetaEl = $("chart-meta");
const historyFormEl = $("history-range-form");
const historyStartEl = $("history-start");
const historyEndEl = $("history-end");
const earliestKnownFactEl = $("earliest-known-fact");
const snapshotJsonLinkEl = $("snapshot-json-link");
const exportCsvLinkEl = $("export-csv-link");
const exportExcelLinkEl = $("export-excel-link");
const snapshotCsvLinkEl = $("snapshot-csv-link");
const snapshotExcelLinkEl = $("snapshot-excel-link");
const sheetsFormulaEl = $("sheets-formula");
const copySheetsFormulaEl = $("copy-sheets-formula");
const copySheetsStatusEl = $("copy-sheets-status");
const copyRangeLinkEl = $("copy-range-link");
const randomNumberEl = $("random-number");
const randomMetaEl = $("random-meta");
const chartSkeletonEl = $("chart-skeleton");
const chartTooltipEl = $("chart-tooltip");
const copyEntropyBtn = $("copy-entropy");
const copyEntropyStatusEl = $("copy-entropy-status");
const safetyNoteEl = $("safety-note");
const timelineTrackEl = $("timeline-track");
const timelineContainerEl = $("timeline-container");
const timelineDetailEl = $("timeline-detail");
const chatWidgetEl = $("chat-widget");
const chatToggleEl = $("chat-toggle");
const chatPanelEl = $("chat-panel");
const chatBackdropEl = $("chat-backdrop");
const chatCloseEl = $("chat-close");
const chatFormEl = $("chat-form");
const chatInputEl = $("chat-input");
const chatInputCountEl = $("chat-input-count");
const chatMessagesEl = $("chat-messages");
const chatMessagesWrapEl = $("chat-messages-wrap");
const chatStartersEl = $("chat-starters");
const chatAttachEl = $("chat-attach");
const chatAttachmentsEl = $("chat-attachments");
const chatDropOverlayEl = $("chat-drop-overlay");
const chatMicEl = $("chat-mic");
const chatTtsEl = $("chat-tts-toggle");
const chatTtsStopEl = $("chat-tts-stop");
const chatSendEl = $("chat-send");
const chatSettingsToggleEl = $("chat-settings-toggle");
const chatSettingsEl = $("chat-settings");
const chatSettingsCloseEl = $("chat-settings-close");
const chatSearchToggleEl = $("chat-search-toggle");
const chatSearchBarEl = $("chat-search-bar");
const chatSearchInputEl = $("chat-search-input");
const chatSearchCountEl = $("chat-search-count");
const chatStatusDotEl = $("chat-status-dot");
const chatStatusTextEl = $("chat-status-text");
const chatScrollBottomEl = $("chat-scroll-bottom");
const chatUnreadBadgeEl = $("chat-unread-badge");
const chatResizeHandleEl = $("chat-resize-handle");
const chatHelpLinkEl = $("chat-help-link");
const chatShortcutsEl = $("chat-shortcuts");
const chatShortcutsCloseEl = $("chat-shortcuts-close");
const chatModeLabelEl = $("chat-mode-label");
const chatSetVoiceEl = $("chat-set-voice");
const chatSetRateEl = $("chat-set-rate");
const chatSetRateValEl = $("chat-set-rate-val");
const chatSetLangEl = $("chat-set-lang");
const chatSetSoundEl = $("chat-set-sound");
const chatSetNotifyEl = $("chat-set-notify");
const chatSetAutoscrollEl = $("chat-set-autoscroll");
const chatSetConfidentialEl = $("chat-set-confidential");
const chatSetSuggestEl = $("chat-set-suggest");
const chatSetCompactEl = $("chat-set-compact");
const chatSetContrastEl = $("chat-set-contrast");
const chatSetReduceMotionEl = $("chat-set-reducemotion");
const chatFontDecEl = $("chat-font-dec");
const chatFontIncEl = $("chat-font-inc");
const chatFontValEl = $("chat-font-val");
const chatThemeSwatchEls = $$(".chat-theme-swatch");
const chatActionExportEl = $("chat-action-export");
const chatActionShareEl = $("chat-action-share");
const chatActionClearEl = $("chat-action-clear");
const openChatEl = $("open-chat");
const rangeButtons = $$(".range-button[data-range]");
const efValueEl = $("ef-value");
const efUnitEl = $("ef-unit");
const efStateEl = $("ef-state");
const rfValueEl = $("rf-value");
const rfUnitEl = $("rf-unit");
const rfStateEl = $("rf-state");
const teleEmfEl = $("tele-emf");
const teleEfEl = $("tele-ef");
const teleRfEl = $("tele-rf");
const teleEntropyEl = $("tele-entropy");
const teleAgeEl = $("tele-age");
const teleTxEl = $("tele-tx");
const teleRangeEl = $("tele-range");

const CATEGORY_COLORS = {
  signal: "#FF1744",
  discovery: "#7C3AED",
  narrative: "#00E5FF",
  technical: "#7AFFAE",
  transmission: "#FF6D00",
};

const state = {
  chartPoints: [],
  meta: null,
  timeline: null,
  activeTimelineIndex: -1,
  chatSessionId: localStorage.getItem("ghost-chat-session") || crypto.randomUUID(),
  chatOpen: false,
  range: { preset: "24h", start: null, end: null },
};

localStorage.setItem("ghost-chat-session", state.chatSessionId);

/* ── Helpers ── */

function formatTimestamp(iso) {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "Unknown" : d.toLocaleString();
}

function formatInputDT(iso) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
}

function parseDT(val) {
  if (!val) return null;
  const d = new Date(val);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

function el(tag, cls, text) {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (text != null) n.textContent = text;
  return n;
}

function formatAge(startIso) {
  const ms = Date.now() - new Date(startIso).getTime();
  const days = Math.floor(ms / 86400000);
  const hours = Math.floor((ms % 86400000) / 3600000);
  return days > 0 ? `${days}d ${hours}h` : `${hours}h`;
}

/* ── Range ── */

function getPresetRange(preset) {
  const now = new Date();
  const earliest = new Date(state.meta?.earliestKnownAt ?? now.toISOString());
  let start = new Date(now.getTime() - 24 * 3600000);
  if (preset === "7d") start = new Date(now.getTime() - 7 * 86400000);
  else if (preset === "30d") start = new Date(now.getTime() - 30 * 86400000);
  else if (preset === "all") start = earliest;
  if (start < earliest) start = earliest;
  return { start: start.toISOString(), end: now.toISOString() };
}

function setRange(preset, range, { persist = false } = {}) {
  state.range = { preset, ...range };
  if (historyStartEl && document.activeElement !== historyStartEl) historyStartEl.value = formatInputDT(range.start);
  if (historyEndEl && document.activeElement !== historyEndEl) historyEndEl.value = formatInputDT(range.end);
  rangeButtons.forEach((b) => b.classList.toggle("is-active", b.dataset.range === preset));
  if (teleRangeEl) teleRangeEl.textContent = preset === "custom" ? "custom" : preset;
  if (persist) updateRangeUrl();
}

function refreshPreset() {
  if (state.range.preset !== "custom") setRange(state.range.preset, getPresetRange(state.range.preset));
}

function updateRangeUrl() {
  const u = new URL(location.href);
  u.searchParams.delete("range");
  u.searchParams.delete("start");
  u.searchParams.delete("end");
  if (state.range.preset === "custom" && state.range.start && state.range.end) {
    u.searchParams.set("start", state.range.start);
    u.searchParams.set("end", state.range.end);
  } else if (state.range.preset) {
    u.searchParams.set("range", state.range.preset);
  }
  history.replaceState({}, "", u);
}

function parseInitialRange() {
  const u = new URL(location.href);
  const s = u.searchParams.get("start"), e = u.searchParams.get("end"), p = u.searchParams.get("range");
  if (s && e) {
    const sd = new Date(s), ed = new Date(e);
    if (!Number.isNaN(sd.getTime()) && !Number.isNaN(ed.getTime()) && ed > sd)
      return { preset: "custom", start: sd.toISOString(), end: ed.toISOString() };
  }
  if (p && ["24h", "7d", "30d", "all"].includes(p)) {
    const r = getPresetRange(p);
    return { preset: p, ...r };
  }
  const r = getPresetRange("24h");
  return { preset: "24h", ...r };
}

function rangeParams() {
  const p = new URLSearchParams();
  if (state.range.start) p.set("start", state.range.start);
  if (state.range.end) p.set("end", state.range.end);
  const tp = chartCanvas ? Math.min(1440, Math.max(160, Math.round(chartCanvas.clientWidth * 1.15))) : 720;
  p.set("targetPoints", String(tp));
  return p;
}

function snapshotParams() {
  const p = new URLSearchParams();
  if (state.range.start) p.set("start", state.range.start);
  if (state.range.end) p.set("end", state.range.end);
  return p;
}

function updateExportLinks() {
  const sp = snapshotParams().toString();
  const csvP = new URLSearchParams(snapshotParams()); csvP.set("format", "csv");
  const xlP = new URLSearchParams(snapshotParams()); xlP.set("format", "excel");
  [snapshotJsonLinkEl].forEach((a) => { if (a) a.href = `/api/v1/ghost-emf/snapshot?${sp}`; });
  [exportCsvLinkEl, snapshotCsvLinkEl].forEach((a) => { if (a) a.href = `/api/v1/ghost-emf/export?${csvP}`; });
  [exportExcelLinkEl, snapshotExcelLinkEl].forEach((a) => { if (a) a.href = `/api/v1/ghost-emf/export?${xlP}`; });
}

/* ── Chart ── */

function drawChart(points) {
  if (!(chartCanvas instanceof HTMLCanvasElement)) return;
  const ctx = chartCanvas.getContext("2d");
  if (!ctx) return;

  const w = Math.max(320, chartCanvas.clientWidth);
  const h = Math.max(300, Math.round(w * 0.35));
  const dpr = devicePixelRatio || 1;
  chartCanvas.width = Math.round(w * dpr);
  chartCanvas.height = Math.round(h * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, w, h);

  const padTop = 28, padRight = 28, padBottom = 38, padLeft = 52;
  const pad = padTop; // legacy compat for area fills

  // Grid lines
  ctx.strokeStyle = "rgba(255, 23, 68, 0.06)";
  ctx.lineWidth = 1;
  for (let i = 0; i <= 4; i++) {
    const y = padTop + ((h - padTop - padBottom) / 4) * i;
    ctx.beginPath(); ctx.moveTo(padLeft, y); ctx.lineTo(w - padRight, y); ctx.stroke();
  }

  if (points.length === 0) {
    ctx.fillStyle = "rgba(240, 230, 255, 0.6)";
    ctx.font = "14px 'JetBrains Mono', monospace";
    ctx.fillText("No data for this range.", padLeft, h / 2);
    return;
  }

  const vals = points.map((p) => p.value);
  const min = Math.min(...vals), max = Math.max(...vals);
  const span = Math.max(0.0001, max - min);
  const rangeStart = new Date(state.range.start ?? points[0].timestamp).getTime();
  const rangeEnd = new Date(state.range.end ?? points[points.length - 1].timestamp).getTime();
  const rangeSpan = Math.max(1, rangeEnd - rangeStart);

  function px(pt, i) {
    const t = new Date(pt.timestamp).getTime();
    const x = padLeft + ((t - rangeStart) / rangeSpan) * (w - padLeft - padRight);
    const norm = (pt.value - min) / span;
    const y = h - padBottom - norm * (h - padTop - padBottom);
    return { x, y };
  }

  // Area gradient (red to transparent)
  const areaGrad = ctx.createLinearGradient(0, padTop, 0, h - padBottom);
  areaGrad.addColorStop(0, "rgba(255, 23, 68, 0.18)");
  areaGrad.addColorStop(0.5, "rgba(124, 58, 237, 0.08)");
  areaGrad.addColorStop(1, "rgba(122, 255, 174, 0)");

  ctx.beginPath();
  points.forEach((pt, i) => {
    const { x, y } = px(pt, i);
    i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
  });
  const lastPx = px(points[points.length - 1]);
  const firstPx = px(points[0]);
  ctx.lineTo(lastPx.x, h - padBottom);
  ctx.lineTo(firstPx.x, h - padBottom);
  ctx.closePath();
  ctx.fillStyle = areaGrad;
  ctx.fill();

  // Line
  ctx.lineJoin = "round";
  ctx.lineCap = "round";
  ctx.lineWidth = 2.5;

  const lineGrad = ctx.createLinearGradient(padLeft, 0, w - padRight, 0);
  lineGrad.addColorStop(0, "#FF1744");
  lineGrad.addColorStop(0.5, "#7C3AED");
  lineGrad.addColorStop(1, "#7AFFAE");
  ctx.strokeStyle = lineGrad;

  ctx.beginPath();
  points.forEach((pt, i) => {
    const { x, y } = px(pt, i);
    i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
  });
  ctx.stroke();

  // Timeline annotations on chart
  const events = state.timeline?.events ?? [];
  const visibleEvents = events.filter((ev) => {
    const t = new Date(ev.date).getTime();
    return t >= rangeStart && t <= rangeEnd;
  });
  visibleEvents.slice(0, 6).forEach((ev, i) => {
    const t = new Date(ev.date).getTime();
    const x = padLeft + ((t - rangeStart) / rangeSpan) * (w - padLeft - padRight);
    const color = CATEGORY_COLORS[ev.category] || "#FF6D00";
    ctx.strokeStyle = color + "44";
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(x, padTop); ctx.lineTo(x, h - padBottom); ctx.stroke();
    ctx.fillStyle = color + "BB";
    ctx.font = "10px 'JetBrains Mono', monospace";
    ctx.textAlign = "left";
    ctx.fillText(ev.title, Math.min(x + 4, w - 140), padTop + 13 + (i % 3) * 13);
  });

  // Latest point dot
  if (points.length > 0) {
    const last = px(points[points.length - 1]);
    ctx.fillStyle = "#FF1744";
    ctx.beginPath(); ctx.arc(last.x, last.y, 5, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#FF174466";
    ctx.beginPath(); ctx.arc(last.x, last.y, 10, 0, Math.PI * 2); ctx.fill();
  }

  // Anomaly threshold (mean + 1σ)
  const mean = vals.reduce((a, b) => a + b, 0) / vals.length;
  const variance = vals.map((v) => (v - mean) ** 2).reduce((a, b) => a + b, 0) / vals.length;
  const threshold = mean + Math.sqrt(variance);
  if (threshold <= max) {
    const ty = h - padBottom - ((threshold - min) / span) * (h - padTop - padBottom);
    ctx.save();
    ctx.strokeStyle = "rgba(255,109,0,0.6)";
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);
    ctx.beginPath(); ctx.moveTo(padLeft, ty); ctx.lineTo(w - padRight, ty); ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = "rgba(255,109,0,0.85)";
    ctx.font = "8px 'JetBrains Mono', monospace";
    ctx.textAlign = "right";
    ctx.fillText(`ANOMALY +1σ ${threshold.toFixed(3)}`, w - padRight - 2, ty - 3);
    ctx.restore();
  }

  // Y-axis value labels
  ctx.fillStyle = "rgba(240, 230, 255, 0.4)";
  ctx.font = "9px 'JetBrains Mono', monospace";
  ctx.textAlign = "right";
  for (let i = 0; i <= 4; i++) {
    const frac = i / 4;
    const val = min + span * (1 - frac);
    const y = padTop + ((h - padTop - padBottom) / 4) * i;
    ctx.fillText(val.toFixed(3), padLeft - 4, y + 3);
  }

  // X-axis time labels
  ctx.textAlign = "center";
  const tickCount = Math.min(6, Math.max(3, Math.floor(w / 160)));
  for (let i = 0; i <= tickCount; i++) {
    const frac = i / tickCount;
    const t = new Date(rangeStart + rangeSpan * frac);
    const x = padLeft + frac * (w - padLeft - padRight);
    const label = rangeSpan > 7 * 86400000
      ? t.toLocaleDateString(undefined, { month: "short", day: "numeric" })
      : t.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
    ctx.fillText(label, x, h - 6);
    ctx.strokeStyle = "rgba(255, 23, 68, 0.04)";
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(x, padTop); ctx.lineTo(x, h - padBottom); ctx.stroke();
  }
  ctx.textAlign = "left";
}

/* ── Timeline Navigator ── */

function renderTimeline() {
  if (!timelineTrackEl || !state.timeline?.events) return;
  timelineTrackEl.replaceChildren();
  // Track items so initTimelineReveal can observe newly created nodes
  state.__timelineNeedsReveal = true;

  const events = [...state.timeline.events].sort((a, b) => new Date(a.date) - new Date(b.date));
  const now = new Date();

  events.forEach((ev, i) => {
    const color = CATEGORY_COLORS[ev.category] || "#FF6D00";
    const isFuture = new Date(ev.date) > now;
    const side = i % 2 === 0 ? "left" : "right";

    const item = el("div", `tl-item tl-${side}${isFuture ? " tl-future" : ""}`);
    item.setAttribute("role", "listitem");

    // Dot on the spine
    const dot = el("div", "tl-dot");
    dot.style.borderColor = color;
    dot.style.setProperty("--dot-color", color);
    if (i === events.length - 1 || (events[i + 1] && new Date(events[i + 1].date) > now && !isFuture)) {
      dot.classList.add("tl-dot-now");
    }

    // Card
    const card = el("div", "tl-card");
    card.style.setProperty("--card-accent", color);
    const dateStr = new Date(ev.date).toLocaleDateString("en-US", { year: "numeric", month: "short" });
    const header = el("div", "tl-card-header");
    const dateEl = el("span", "tl-date", dateStr);
    const catEl = el("span", "tl-cat", ev.category);
    catEl.style.color = color;
    header.append(dateEl, catEl);
    const title = el("h3", "tl-title", ev.title);
    const body = el("p", "tl-body", ev.body);
    const severity = el("div", "tl-severity");
    for (let s = 0; s < 5; s++) {
      const pip = el("span", s < ev.severity ? "tl-pip tl-pip-on" : "tl-pip");
      pip.style.setProperty("--pip-color", color);
      severity.append(pip);
    }
    card.append(header, title, body, severity);
    item.append(dot, card);
    timelineTrackEl.append(item);
  });
  initTimelineReveal();
  // Hard fallback so no timeline items get stuck at opacity 0
  setTimeout(() => {
    document.querySelectorAll(".tl-item:not(.is-visible)").forEach((n) => n.classList.add("is-visible"));
  }, 2500);
}

function selectTimelineEvent(index) {
  // Vertical timeline doesn't need selection — all events visible
  state.activeTimelineIndex = index;
}

/* ── Chat ── */

const SpeechRecognitionCtor = window.SpeechRecognition || window.webkitSpeechRecognition;
let chatRecognition = null;
let chatRecognitionActive = false;
const chatAttachments = [];
const chatHistory = [];
let chatAutoScrollLocked = true;
let chatUnreadCount = 0;
let chatLastSentMessage = "";

const CHAT_PREFS_KEY = "ghost-chat-prefs";
const CHAT_TRANSCRIPT_KEY = "ghost-chat-transcript";
const CHAT_PREF_DEFAULTS = {
  tts: false, voice: "", rate: 1.0, lang: "en-US",
  sound: false, notify: false, autoscroll: true, confidential: false, suggest: true,
  theme: "red", fontPct: 100, compact: false, contrast: false, reducemotion: false,
  width: 440,
};

function loadChatPrefs() {
  try {
    const raw = localStorage.getItem(CHAT_PREFS_KEY);
    return Object.assign({}, CHAT_PREF_DEFAULTS, raw ? JSON.parse(raw) : {});
  } catch { return { ...CHAT_PREF_DEFAULTS }; }
}
function saveChatPrefs() { try { localStorage.setItem(CHAT_PREFS_KEY, JSON.stringify(chatPrefs)); } catch {} }
const chatPrefs = loadChatPrefs();

function applyChatPrefs() {
  if (!chatPanelEl) return;
  chatPanelEl.dataset.theme = chatPrefs.theme;
  chatPanelEl.classList.toggle("is-compact", !!chatPrefs.compact);
  chatPanelEl.classList.toggle("is-high-contrast", !!chatPrefs.contrast);
  chatPanelEl.classList.toggle("is-reduce-motion", !!chatPrefs.reducemotion);
  chatPanelEl.style.fontSize = `${chatPrefs.fontPct}%`;
  if (chatPrefs.width && chatPrefs.width > 320) {
    chatPanelEl.style.width = `min(${chatPrefs.width}px, 100vw)`;
  }
  if (chatTtsEl) chatTtsEl.setAttribute("aria-pressed", String(chatPrefs.tts));
}

function toggleChat(open) {
  state.chatOpen = open ?? !state.chatOpen;
  chatWidgetEl?.classList.toggle("is-open", state.chatOpen);
  chatPanelEl?.classList.toggle("is-open", state.chatOpen);
  chatToggleEl?.setAttribute("aria-expanded", String(state.chatOpen));
  chatPanelEl?.setAttribute("aria-hidden", String(!state.chatOpen));
  document.body.classList.toggle("chat-open", state.chatOpen);
  if (state.chatOpen) {
    chatUnreadCount = 0;
    updateUnreadBadge();
    setTimeout(() => chatInputEl?.focus(), 320);
  } else {
    if (chatRecognitionActive) chatRecognition?.stop();
    closeChatSettings();
    closeChatShortcuts();
  }
}

function fmtTime(d = new Date()) {
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

function renderRichText(text) {
  let html = escapeHtml(text);
  html = html.replace(/```([\s\S]*?)```/g, (_, code) => `<pre><code>${code}</code></pre>`);
  html = html.replace(/`([^`\n]+)`/g, "<code>$1</code>");
  html = html.replace(/\*\*([^*\n]+)\*\*/g, "<strong>$1</strong>");
  html = html.replace(/(^|[^a-z])(https?:\/\/[^\s<]+)/g, (m, lead, url) => `${lead}<a href="${url}" target="_blank" rel="noopener noreferrer">${url}</a>`);
  return html;
}

function addChatMessage(role, text, opts = {}) {
  if (!chatMessagesEl) return null;
  const msg = el("div", `chat-message chat-${role}`);
  msg.dataset.msgRole = role;
  msg.dataset.msgText = text;
  const time = fmtTime();
  const latencyHtml = opts.latencyMs ? `<span class="chat-msg-latency">${Math.round(opts.latencyMs)}ms</span>` : "";
  const actionsHtml = role === "assistant"
    ? `<button type="button" class="chat-msg-action" data-msg-action="copy" aria-label="Copy">copy</button>
       <button type="button" class="chat-msg-action" data-msg-action="speak" aria-label="Read aloud">speak</button>
       <button type="button" class="chat-msg-action" data-msg-action="regen" aria-label="Regenerate">regen</button>`
    : `<button type="button" class="chat-msg-action" data-msg-action="copy" aria-label="Copy">copy</button>`;
  const attachmentsHtml = opts.attachments?.length
    ? `<div class="chat-msg-attachments">${opts.attachments.map((a) => a.previewUrl ? `<img class="chat-msg-attachment-img" src="${a.previewUrl}" alt="${escapeHtml(a.name)}" />` : `<span class="chat-attachment-chip"><span>${escapeHtml(a.name)}</span></span>`).join("")}</div>`
    : "";
  const avatar = role === "assistant" ? "◊" : "✶";
  msg.innerHTML = `
    <div class="chat-msg-row">
      <span class="chat-avatar chat-avatar-${role === "assistant" ? "ai" : "user"}" aria-hidden="true">${avatar}</span>
      <div class="chat-msg-body">
        <p class="chat-msg-text">${renderRichText(text)}</p>
        ${attachmentsHtml}
        <div class="chat-msg-meta">
          <time class="chat-msg-time">${time}</time>
          ${latencyHtml}
          ${actionsHtml}
        </div>
      </div>
    </div>`;
  chatMessagesEl.append(msg);
  chatHistory.push({ role, text, ts: Date.now() });
  saveTranscript();
  if (chatAutoScrollLocked) scrollChatToBottom();
  else if (role === "assistant") { chatUnreadCount++; updateUnreadBadge(); }
  if (role === "assistant" && chatPrefs.tts) speakText(text);
  if (role === "assistant" && chatPrefs.sound) playReplyChime();
  if (role === "assistant" && chatPrefs.notify && document.hidden) tryNotify(text);
  return msg;
}

function scrollChatToBottom() {
  if (!chatMessagesEl) return;
  chatMessagesEl.scrollTop = chatMessagesEl.scrollHeight;
  chatScrollBottomEl?.setAttribute("hidden", "");
  chatUnreadCount = 0;
  updateUnreadBadge();
}

function updateUnreadBadge() {
  if (!chatUnreadBadgeEl) return;
  if (chatUnreadCount > 0) {
    chatUnreadBadgeEl.hidden = false;
    chatUnreadBadgeEl.textContent = String(chatUnreadCount > 99 ? "99+" : chatUnreadCount);
  } else {
    chatUnreadBadgeEl.hidden = true;
  }
}

function showTyping() {
  if (!chatMessagesEl) return;
  const typing = el("div", "chat-message chat-assistant chat-typing-msg");
  typing.id = "chat-typing";
  typing.innerHTML = `
    <div class="chat-msg-row">
      <span class="chat-avatar chat-avatar-ai" aria-hidden="true">◊</span>
      <div class="chat-msg-body"><p class="chat-msg-text">The signal is processing<span class="chat-typing-dots">…</span></p></div>
    </div>`;
  chatMessagesEl.append(typing);
  if (chatAutoScrollLocked) scrollChatToBottom();
}

function removeTyping() {
  const t = $("chat-typing");
  if (t) t.remove();
}

function hideStarters() { chatStartersEl?.classList.add("is-hidden"); }
function showStarters() { chatStartersEl?.classList.remove("is-hidden"); }

function speakText(text, opts = {}) {
  if (!("speechSynthesis" in window) || !text) return;
  try {
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text.replace(/<[^>]+>/g, ""));
    u.rate = opts.rate ?? chatPrefs.rate ?? 1.0;
    u.pitch = 0.9;
    u.volume = 0.95;
    if (chatPrefs.voice) {
      const voices = window.speechSynthesis.getVoices();
      const v = voices.find((vc) => vc.name === chatPrefs.voice);
      if (v) u.voice = v;
    }
    u.onstart = () => { chatTtsStopEl?.removeAttribute("hidden"); };
    u.onend = () => { chatTtsStopEl?.setAttribute("hidden", ""); };
    u.onerror = () => { chatTtsStopEl?.setAttribute("hidden", ""); };
    window.speechSynthesis.speak(u);
  } catch {}
}

let chatChimeCtx = null;
function playReplyChime() {
  try {
    chatChimeCtx ||= new (window.AudioContext || window.webkitAudioContext)();
    const o = chatChimeCtx.createOscillator();
    const g = chatChimeCtx.createGain();
    o.connect(g); g.connect(chatChimeCtx.destination);
    o.frequency.value = 880;
    g.gain.setValueAtTime(0.001, chatChimeCtx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.06, chatChimeCtx.currentTime + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, chatChimeCtx.currentTime + 0.4);
    o.start();
    o.stop(chatChimeCtx.currentTime + 0.4);
  } catch {}
}

function tryNotify(text) {
  if (!("Notification" in window)) return;
  if (Notification.permission !== "granted") return;
  try { new Notification("Ghost Signal", { body: text.slice(0, 140), silent: true }); } catch {}
}

function saveTranscript() {
  if (chatPrefs.confidential) return;
  try { localStorage.setItem(CHAT_TRANSCRIPT_KEY, JSON.stringify(chatHistory.slice(-100))); } catch {}
}

function restoreTranscript() {
  if (chatPrefs.confidential) return;
  try {
    const raw = localStorage.getItem(CHAT_TRANSCRIPT_KEY);
    if (!raw) return;
    const arr = JSON.parse(raw);
    if (!Array.isArray(arr) || arr.length === 0) return;
    chatMessagesEl?.querySelectorAll(".chat-message").forEach((n, i) => { if (i > 0) n.remove(); });
    arr.forEach((m) => addChatMessage(m.role, m.text));
    hideStarters();
  } catch {}
}

function renderAttachments() {
  if (!chatAttachmentsEl) return;
  if (chatAttachments.length === 0) {
    chatAttachmentsEl.hidden = true;
    chatAttachmentsEl.innerHTML = "";
    return;
  }
  chatAttachmentsEl.hidden = false;
  chatAttachmentsEl.innerHTML = chatAttachments.map((f, i) => {
    const isImage = f.type?.startsWith("image/");
    const preview = isImage && f.previewUrl ? `<img src="${f.previewUrl}" alt="" class="chat-attachment-preview" />` : "";
    return `<span class="chat-attachment-chip">${preview}<span title="${escapeHtml(f.name)}">${escapeHtml(f.name)}</span><button type="button" class="chat-attachment-remove" data-idx="${i}" aria-label="Remove ${escapeHtml(f.name)}">&times;</button></span>`;
  }).join("");
}

async function sendChatMessage(message) {
  hideStarters();
  const attachmentsForRender = chatAttachments.map((a) => ({ name: a.name, previewUrl: a.previewUrl }));
  const attachmentSuffix = chatAttachments.length > 0
    ? ` [attached: ${chatAttachments.map((f) => f.name).join(", ")}]`
    : "";
  const displayMessage = message + attachmentSuffix;
  addChatMessage("user", displayMessage, { attachments: attachmentsForRender });
  chatLastSentMessage = message;
  chatAttachments.length = 0;
  renderAttachments();
  showTyping();
  const t0 = performance.now();

  try {
    const res = await fetch("/api/v1/chat", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ message, sessionId: state.chatSessionId }),
    });
    removeTyping();
    const latencyMs = performance.now() - t0;
    if (!res.ok) {
      setChatStatus(false);
      addChatMessage("assistant", "The signal encountered interference. Try again.", { latencyMs });
      return;
    }
    setChatStatus(true);
    const data = await res.json();
    if (data.sessionId) {
      state.chatSessionId = data.sessionId;
      localStorage.setItem("ghost-chat-session", data.sessionId);
    }
    addChatMessage("assistant", data.response, { latencyMs });
  } catch {
    removeTyping();
    setChatStatus(false);
    addChatMessage("assistant", "Connection lost. The signal will return.");
  }
}

function setChatStatus(online) {
  if (chatStatusDotEl) chatStatusDotEl.classList.toggle("is-offline", !online);
  if (chatStatusTextEl) chatStatusTextEl.textContent = online ? "Online" : "Offline";
}

function autoGrowTextarea() {
  if (!chatInputEl) return;
  chatInputEl.style.height = "auto";
  chatInputEl.style.height = Math.min(chatInputEl.scrollHeight, 200) + "px";
}

function updateCharCount() {
  if (!chatInputCountEl || !chatInputEl) return;
  const len = chatInputEl.value.length;
  const max = Number(chatInputEl.maxLength || 2000);
  chatInputCountEl.textContent = `${len}/${max}`;
  chatInputCountEl.classList.toggle("is-near", len > max * 0.85 && len <= max);
  chatInputCountEl.classList.toggle("is-over", len >= max);
  if (chatSendEl) chatSendEl.disabled = len === 0 || len > max;
}

function runSlashCommand(cmd) {
  const c = cmd.trim().toLowerCase();
  if (c === "/clear") { clearConversation(); return true; }
  if (c === "/help") { openChatShortcuts(); return true; }
  if (c === "/stop") { window.speechSynthesis?.cancel(); chatTtsStopEl?.setAttribute("hidden", ""); return true; }
  if (c === "/export") { exportTranscript(); return true; }
  if (c === "/share") { shareConversation(); return true; }
  if (c === "/search") { toggleChatSearch(true); return true; }
  return false;
}

function clearConversation() {
  if (!chatMessagesEl) return;
  chatHistory.length = 0;
  saveTranscript();
  Array.from(chatMessagesEl.querySelectorAll(".chat-message")).slice(1).forEach((n) => n.remove());
  showStarters();
  state.chatSessionId = crypto.randomUUID();
  localStorage.setItem("ghost-chat-session", state.chatSessionId);
}

function exportTranscript() {
  const lines = chatHistory.map((m) => `### ${m.role === "user" ? "You" : "Signal"} · ${new Date(m.ts).toLocaleString()}\n\n${m.text}\n`);
  const md = `# Ghost Signal — Transcript\n\nSession: ${state.chatSessionId}\n\n${lines.join("\n")}`;
  const blob = new Blob([md], { type: "text/markdown" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = `ghost-signal-${state.chatSessionId.slice(0, 8)}.md`;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

async function shareConversation() {
  const url = `${location.origin}/?session=${state.chatSessionId}`;
  try {
    await navigator.clipboard.writeText(url);
    addChatMessage("assistant", `Share link copied: ${url}`);
  } catch {
    addChatMessage("assistant", `Share link: ${url}`);
  }
}

function openChatSettings() {
  chatSettingsEl?.removeAttribute("hidden");
  requestAnimationFrame(() => chatSettingsEl?.classList.add("is-open"));
  chatSettingsToggleEl?.setAttribute("aria-expanded", "true");
}
function closeChatSettings() {
  chatSettingsEl?.classList.remove("is-open");
  chatSettingsToggleEl?.setAttribute("aria-expanded", "false");
  setTimeout(() => chatSettingsEl?.setAttribute("hidden", ""), 220);
}
function openChatShortcuts() {
  chatShortcutsEl?.removeAttribute("hidden");
  requestAnimationFrame(() => chatShortcutsEl?.classList.add("is-open"));
}
function closeChatShortcuts() {
  chatShortcutsEl?.classList.remove("is-open");
  setTimeout(() => chatShortcutsEl?.setAttribute("hidden", ""), 220);
}

function toggleChatSearch(force) {
  const next = typeof force === "boolean" ? force : !!chatSearchBarEl?.hasAttribute("hidden");
  if (next) {
    chatSearchBarEl?.removeAttribute("hidden");
    chatSearchToggleEl?.setAttribute("aria-pressed", "true");
    setTimeout(() => chatSearchInputEl?.focus(), 50);
  } else {
    chatSearchBarEl?.setAttribute("hidden", "");
    chatSearchToggleEl?.setAttribute("aria-pressed", "false");
    if (chatSearchInputEl) chatSearchInputEl.value = "";
    applyChatSearchFilter("");
  }
}

function applyChatSearchFilter(query) {
  if (!chatMessagesEl) return;
  const q = query.trim().toLowerCase();
  const msgs = Array.from(chatMessagesEl.querySelectorAll(".chat-message"));
  let matches = 0;
  msgs.forEach((m) => {
    if (!q) { m.classList.remove("is-hidden"); return; }
    const t = (m.dataset.msgText || m.textContent || "").toLowerCase();
    const hit = t.includes(q);
    m.classList.toggle("is-hidden", !hit);
    if (hit) matches++;
  });
  if (chatSearchCountEl) chatSearchCountEl.textContent = q ? String(matches) : "0";
}

function initChatVoice() {
  if (!chatMicEl) return;
  if (!SpeechRecognitionCtor) {
    chatMicEl.disabled = true;
    chatMicEl.title = "Voice input not supported in this browser";
    chatMicEl.setAttribute("aria-label", "Voice input unavailable");
    return;
  }
  chatRecognition = new SpeechRecognitionCtor();
  chatRecognition.continuous = false;
  chatRecognition.interimResults = true;
  chatRecognition.lang = chatPrefs.lang || "en-US";
  let finalTranscript = "";
  chatRecognition.onstart = () => {
    chatRecognitionActive = true;
    chatMicEl.classList.add("is-recording");
    chatMicEl.setAttribute("aria-pressed", "true");
    chatMicEl.setAttribute("aria-label", "Stop voice input");
    finalTranscript = chatInputEl?.value ? chatInputEl.value + " " : "";
  };
  chatRecognition.onresult = (event) => {
    let interim = "";
    for (let i = event.resultIndex; i < event.results.length; i++) {
      const transcript = event.results[i][0].transcript;
      if (event.results[i].isFinal) finalTranscript += transcript;
      else interim += transcript;
    }
    if (chatInputEl) {
      chatInputEl.value = (finalTranscript + interim).trim();
      autoGrowTextarea();
      updateCharCount();
    }
  };
  const stopRecording = () => {
    chatRecognitionActive = false;
    chatMicEl.classList.remove("is-recording");
    chatMicEl.setAttribute("aria-pressed", "false");
    chatMicEl.setAttribute("aria-label", "Start voice input");
  };
  chatRecognition.onerror = stopRecording;
  chatRecognition.onend = stopRecording;
  chatMicEl.addEventListener("click", () => {
    if (chatRecognitionActive) chatRecognition?.stop();
    else { try { chatRecognition.lang = chatPrefs.lang || "en-US"; chatRecognition.start(); } catch {} }
  });
}

function initChatTts() {
  if (!chatTtsEl) return;
  if (!("speechSynthesis" in window)) {
    chatTtsEl.disabled = true;
    chatTtsEl.title = "Text-to-speech not supported";
    return;
  }
  chatTtsEl.setAttribute("aria-pressed", String(chatPrefs.tts));
  chatTtsEl.addEventListener("click", () => {
    chatPrefs.tts = !chatPrefs.tts;
    saveChatPrefs();
    chatTtsEl.setAttribute("aria-pressed", String(chatPrefs.tts));
    if (!chatPrefs.tts) window.speechSynthesis?.cancel();
  });
  chatTtsStopEl?.addEventListener("click", () => {
    window.speechSynthesis?.cancel();
    chatTtsStopEl.setAttribute("hidden", "");
  });
  if ("speechSynthesis" in window && chatSetVoiceEl) {
    const populate = () => {
      const voices = window.speechSynthesis.getVoices();
      chatSetVoiceEl.innerHTML = '<option value="">Default</option>' +
        voices.map((v) => `<option value="${escapeHtml(v.name)}"${v.name === chatPrefs.voice ? " selected" : ""}>${escapeHtml(v.name)} (${v.lang})</option>`).join("");
    };
    populate();
    window.speechSynthesis.onvoiceschanged = populate;
  }
}

function initChatSettings() {
  if (chatSetRateEl) {
    chatSetRateEl.value = String(chatPrefs.rate);
    if (chatSetRateValEl) chatSetRateValEl.textContent = `${Number(chatPrefs.rate).toFixed(2)}×`;
    chatSetRateEl.addEventListener("input", () => {
      chatPrefs.rate = Number(chatSetRateEl.value);
      if (chatSetRateValEl) chatSetRateValEl.textContent = `${chatPrefs.rate.toFixed(2)}×`;
      saveChatPrefs();
    });
  }
  if (chatSetVoiceEl) {
    chatSetVoiceEl.addEventListener("change", () => { chatPrefs.voice = chatSetVoiceEl.value; saveChatPrefs(); });
  }
  if (chatSetLangEl) {
    chatSetLangEl.value = chatPrefs.lang;
    chatSetLangEl.addEventListener("change", () => {
      chatPrefs.lang = chatSetLangEl.value; saveChatPrefs();
      if (chatRecognition) chatRecognition.lang = chatPrefs.lang;
    });
  }
  const checks = [
    [chatSetSoundEl, "sound"], [chatSetNotifyEl, "notify"], [chatSetAutoscrollEl, "autoscroll"],
    [chatSetConfidentialEl, "confidential"], [chatSetSuggestEl, "suggest"],
    [chatSetCompactEl, "compact"], [chatSetContrastEl, "contrast"], [chatSetReduceMotionEl, "reducemotion"],
  ];
  checks.forEach(([el2, key]) => {
    if (!el2) return;
    el2.checked = !!chatPrefs[key];
    el2.addEventListener("change", () => {
      chatPrefs[key] = el2.checked;
      saveChatPrefs();
      applyChatPrefs();
      if (key === "notify" && el2.checked && "Notification" in window && Notification.permission === "default") {
        Notification.requestPermission().catch(() => {});
      }
      if (key === "confidential" && el2.checked) {
        try { localStorage.removeItem(CHAT_TRANSCRIPT_KEY); } catch {}
      }
      if (key === "autoscroll") chatAutoScrollLocked = el2.checked;
    });
  });
  chatThemeSwatchEls.forEach((sw) => {
    sw.classList.toggle("is-active", sw.dataset.theme === chatPrefs.theme);
    sw.addEventListener("click", () => {
      chatPrefs.theme = sw.dataset.theme; saveChatPrefs();
      chatThemeSwatchEls.forEach((s) => s.classList.toggle("is-active", s === sw));
      applyChatPrefs();
    });
  });
  if (chatFontValEl) chatFontValEl.textContent = `${chatPrefs.fontPct}%`;
  chatFontDecEl?.addEventListener("click", () => { chatPrefs.fontPct = Math.max(80, chatPrefs.fontPct - 10); saveChatPrefs(); applyChatPrefs(); if (chatFontValEl) chatFontValEl.textContent = `${chatPrefs.fontPct}%`; });
  chatFontIncEl?.addEventListener("click", () => { chatPrefs.fontPct = Math.min(140, chatPrefs.fontPct + 10); saveChatPrefs(); applyChatPrefs(); if (chatFontValEl) chatFontValEl.textContent = `${chatPrefs.fontPct}%`; });
  chatActionExportEl?.addEventListener("click", exportTranscript);
  chatActionShareEl?.addEventListener("click", shareConversation);
  chatActionClearEl?.addEventListener("click", () => { if (confirm("Clear conversation? This cannot be undone.")) clearConversation(); });
}

function initChatResize() {
  if (!chatResizeHandleEl || !chatPanelEl) return;
  let startX = 0; let startW = 0; let dragging = false;
  const onMove = (e) => {
    if (!dragging) return;
    const x = e.touches ? e.touches[0].clientX : e.clientX;
    const dx = startX - x;
    const next = Math.max(340, Math.min(window.innerWidth, startW + dx));
    chatPanelEl.style.width = `${next}px`;
  };
  const onUp = () => {
    if (!dragging) return;
    dragging = false;
    chatPrefs.width = parseInt(chatPanelEl.style.width || "440", 10);
    saveChatPrefs();
    window.removeEventListener("mousemove", onMove);
    window.removeEventListener("mouseup", onUp);
    window.removeEventListener("touchmove", onMove);
    window.removeEventListener("touchend", onUp);
  };
  const onDown = (e) => {
    dragging = true;
    startX = e.touches ? e.touches[0].clientX : e.clientX;
    startW = chatPanelEl.offsetWidth;
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    window.addEventListener("touchmove", onMove, { passive: true });
    window.addEventListener("touchend", onUp);
  };
  chatResizeHandleEl.addEventListener("mousedown", onDown);
  chatResizeHandleEl.addEventListener("touchstart", onDown, { passive: true });
  chatResizeHandleEl.addEventListener("keydown", (e) => {
    if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
    const cur = chatPanelEl.offsetWidth;
    const next = e.key === "ArrowLeft" ? cur + 24 : cur - 24;
    chatPanelEl.style.width = `${Math.max(340, Math.min(window.innerWidth, next))}px`;
    chatPrefs.width = parseInt(chatPanelEl.style.width, 10); saveChatPrefs();
  });
}

function initChatScrollWatch() {
  if (!chatMessagesEl) return;
  chatMessagesEl.addEventListener("scroll", () => {
    const nearBottom = chatMessagesEl.scrollTop + chatMessagesEl.clientHeight >= chatMessagesEl.scrollHeight - 40;
    chatAutoScrollLocked = nearBottom && chatPrefs.autoscroll;
    if (nearBottom) {
      chatScrollBottomEl?.setAttribute("hidden", "");
      chatUnreadCount = 0; updateUnreadBadge();
    } else {
      chatScrollBottomEl?.removeAttribute("hidden");
    }
  }, { passive: true });
  chatScrollBottomEl?.addEventListener("click", scrollChatToBottom);
}

function initChatDragDrop() {
  if (!chatPanelEl) return;
  let dragDepth = 0;
  chatPanelEl.addEventListener("dragenter", (e) => {
    e.preventDefault();
    dragDepth++;
    chatWidgetEl?.classList.add("is-dragging");
    chatDropOverlayEl?.removeAttribute("hidden");
  });
  chatPanelEl.addEventListener("dragover", (e) => e.preventDefault());
  chatPanelEl.addEventListener("dragleave", () => {
    dragDepth = Math.max(0, dragDepth - 1);
    if (dragDepth === 0) {
      chatWidgetEl?.classList.remove("is-dragging");
      chatDropOverlayEl?.setAttribute("hidden", "");
    }
  });
  chatPanelEl.addEventListener("drop", (e) => {
    e.preventDefault();
    dragDepth = 0;
    chatWidgetEl?.classList.remove("is-dragging");
    chatDropOverlayEl?.setAttribute("hidden", "");
    const files = Array.from(e.dataTransfer?.files || []);
    addAttachments(files);
  });
}

function addAttachments(files) {
  for (const f of files) {
    const entry = { name: f.name, size: f.size, type: f.type, previewUrl: null };
    if (f.type?.startsWith("image/")) {
      try { entry.previewUrl = URL.createObjectURL(f); } catch {}
    }
    chatAttachments.push(entry);
  }
  renderAttachments();
}

function initChatOnlineWatch() {
  setChatStatus(navigator.onLine);
  window.addEventListener("online", () => setChatStatus(true));
  window.addEventListener("offline", () => setChatStatus(false));
}

/* ── API Loaders ── */

async function loadMeta() {
  const res = await fetch("/api/v1/ghost-emf/meta", { headers: { accept: "application/json" } });
  if (!res.ok) return;
  state.meta = await res.json();
  if (earliestKnownFactEl && state.meta?.earliestKnownAt)
    earliestKnownFactEl.textContent = `Earliest reading: ${formatTimestamp(state.meta.earliestKnownAt)}`;
  if (signalAgeEl && state.meta?.earliestKnownAt) {
    signalAgeEl.textContent = formatAge(state.meta.earliestKnownAt);
    if (teleAgeEl) teleAgeEl.textContent = formatAge(state.meta.earliestKnownAt);
  }
}

async function loadTimeline() {
  const res = await fetch("/api/v1/ghost-emf/timeline", { headers: { accept: "application/json" } });
  if (!res.ok) return;
  state.timeline = await res.json();
  renderTimeline();
  if (safetyNoteEl && state.timeline?.safetyNote) safetyNoteEl.textContent = state.timeline.safetyNote;
}

async function loadCurrent() {
  const res = await fetch("/api/v1/sensors", { headers: { accept: "application/json" } });
  if (!res.ok) return;
  const d = await res.json();

  // EMF (primary)
  if (d.emf) {
    if (currentValueEl) currentValueEl.textContent = Number(d.emf.numericValue).toFixed(3);
    if (currentUnitEl) currentUnitEl.textContent = d.emf.unit ? ` ${d.emf.unit}` : "";
    if (currentStateEl) currentStateEl.textContent = `${d.emf.friendlyName} reporting ${d.emf.state}.`;
    if (teleEmfEl) teleEmfEl.textContent = Number(d.emf.numericValue).toFixed(3);
  }

  // EF
  if (d.ef) {
    if (efValueEl) efValueEl.textContent = Number(d.ef.numericValue).toFixed(1);
    if (efUnitEl) efUnitEl.textContent = d.ef.unit ? ` ${d.ef.unit}` : "";
    if (efStateEl) efStateEl.textContent = `${d.ef.friendlyName} reporting ${d.ef.state}.`;
    if (teleEfEl) teleEfEl.textContent = Number(d.ef.numericValue).toFixed(1);
  }

  // RF
  if (d.rf) {
    if (rfValueEl) rfValueEl.textContent = Number(d.rf.numericValue).toFixed(3);
    if (rfUnitEl) rfUnitEl.textContent = d.rf.unit ? ` ${d.rf.unit}` : "";
    if (rfStateEl) rfStateEl.textContent = `${d.rf.friendlyName} reporting ${d.rf.state}.`;
    if (teleRfEl) teleRfEl.textContent = Number(d.rf.numericValue).toFixed(3);
  }
}

async function loadHistory() {
  if (chartSkeletonEl) { chartSkeletonEl.hidden = false; chartSkeletonEl.removeAttribute("aria-hidden"); }
  try {
    const res = await fetch(`/api/v1/ghost-emf/history?${rangeParams()}`, { headers: { accept: "application/json" } });
    if (!res.ok) return;
    const d = await res.json();
    state.chartPoints = Array.isArray(d.points) ? d.points : [];
    drawChart(state.chartPoints);
    if (chartMetaEl)
      chartMetaEl.textContent = `${d.displayPointCount} points from ${d.rawPointCount} samples.`;
  } finally {
    if (chartSkeletonEl) { chartSkeletonEl.hidden = true; chartSkeletonEl.setAttribute("aria-hidden", "true"); }
  }
}

async function loadEntropy() {
  const p = rangeParams(); p.set("bins", "24");
  const res = await fetch(`/api/v1/ghost-emf/entropy?${p}`, { headers: { accept: "application/json" } });
  if (!res.ok) return;
  const d = await res.json();
  if (entropyValueEl) entropyValueEl.textContent = `${Number(d.entropyBits).toFixed(4)} bits`;
  if (teleEntropyEl) teleEntropyEl.textContent = Number(d.entropyBits).toFixed(2);
}

async function loadTransmissionCount() {
  try {
    const res = await fetch("/api/v1/transmission-count", { headers: { accept: "application/json" } });
    if (!res.ok) return;
    const d = await res.json();
    if (transmissionCountEl) transmissionCountEl.textContent = String(d.count);
    if (teleTxEl) teleTxEl.textContent = String(d.count);
  } catch { /* ignore */ }
}

async function loadSnapshotUtils() {
  updateExportLinks();
  try {
    const sp = snapshotParams();
    const [sheetsRes, randomRes] = await Promise.all([
      fetch(`/api/v1/ghost-emf/google-sheets?${sp}`, { headers: { accept: "application/json" } }),
      fetch(`/api/v1/ghost-emf/random?${sp}&digits=10`, { headers: { accept: "application/json" } }),
    ]);
    if (sheetsRes.ok) {
      const s = await sheetsRes.json();
      if (sheetsFormulaEl) renderSheetsFormula(s.importDataFormula);
    }
    if (randomRes.ok) {
      const r = await randomRes.json();
      if (randomNumberEl) randomNumberEl.textContent = r.randomNumber;
      if (randomMetaEl) randomMetaEl.textContent = `${r.sampleCount} rows contributed.`;
    }
  } catch {
    if (sheetsFormulaEl) sheetsFormulaEl.textContent = "Export unavailable for this range.";
    if (randomNumberEl) randomNumberEl.textContent = "--";
  }
}

function renderSheetsFormula(formula) {
  if (!sheetsFormulaEl || !formula) return;
  const escapeHtml = (s) =>
    String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const m = formula.match(/^(=)([A-Z_]+)(\()(["'])(.*?)\4(\))$/);
  let html;
  if (m) {
    const [, eq, fn, lp, q, url, rp] = m;
    const urlHtml = escapeHtml(url).replace(/(%[0-9A-Fa-f]{2})/g, '<span class="tok-pct">$1</span>');
    html =
      `<span class="tok-op">${escapeHtml(eq)}</span>` +
      `<span class="tok-fn">${escapeHtml(fn)}</span>` +
      `<span class="tok-punc">${escapeHtml(lp)}</span>` +
      `<span class="tok-str">${escapeHtml(q)}${urlHtml}${escapeHtml(q)}</span>` +
      `<span class="tok-punc">${escapeHtml(rp)}</span>`;
  } else {
    html = escapeHtml(formula);
  }
  sheetsFormulaEl.innerHTML = html;
}

/* ── Story Slider ── */

function initStorySlider() {
  const track = $("story-slider-track");
  const counter = $("story-slider-counter");
  if (!track) return;

  const slides = track.querySelectorAll(".slider-slide");
  const total = slides.length;
  let current = 0;
  let autoTimer = null;

  function goTo(index) {
    current = ((index % total) + total) % total;
    track.style.transform = `translateX(-${current * 100}%)`;
    if (counter) counter.textContent = `${current + 1} / ${total}`;
  }

  const slider = track.closest(".story-slider");
  if (!slider) return;

  const prevBtn = slider.querySelector(".slider-prev");
  const nextBtn = slider.querySelector(".slider-next");

  prevBtn?.addEventListener("click", () => { goTo(current - 1); resetAuto(); });
  nextBtn?.addEventListener("click", () => { goTo(current + 1); resetAuto(); });

  // Touch/swipe support
  let touchStartX = 0;
  slider.addEventListener("touchstart", (e) => { touchStartX = e.touches[0].clientX; }, { passive: true });
  slider.addEventListener("touchend", (e) => {
    const dx = e.changedTouches[0].clientX - touchStartX;
    if (Math.abs(dx) > 50) {
      goTo(dx > 0 ? current - 1 : current + 1);
      resetAuto();
    }
  }, { passive: true });

  // Auto-advance every 4s
  function startAuto() { autoTimer = setInterval(() => goTo(current + 1), 4000); }
  function resetAuto() { clearInterval(autoTimer); startAuto(); }
  startAuto();

  // Pause on hover
  slider.addEventListener("mouseenter", () => clearInterval(autoTimer));
  slider.addEventListener("mouseleave", () => startAuto());
}

/* ── Avatar Frame Slideshow ── */

function initAvatarSlideshow() {
  const root = document.querySelector('[data-component="avatar-slideshow"]');
  if (!root) return;

  // Hydrate per-image caption attribute for the on-image overlay strip
  root.querySelectorAll(".avatar-slide").forEach((slide) => {
    const fig = slide.querySelector(".avatar-slide-figure");
    const label = slide.querySelector(".avatar-frame-label")?.textContent.trim();
    if (fig && label) fig.setAttribute("data-caption", label);
  });

  const slides = Array.from(root.querySelectorAll(".avatar-slide"));
  const thumbs = Array.from(root.querySelectorAll("[data-slide-jump]"));
  const counter = root.querySelector("[data-slide-counter]");
  const prevBtn = root.querySelector("[data-slide-prev]");
  const nextBtn = root.querySelector("[data-slide-next]");
  const total = slides.length;
  if (!total) return;

  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const AUTO_DELAY = 6000;
  let current = 0;
  let autoTimer = null;

  function goTo(index) {
    current = ((index % total) + total) % total;
    slides.forEach((s, i) => s.classList.toggle("is-active", i === current));
    thumbs.forEach((t, i) => {
      t.classList.toggle("is-active", i === current);
      t.setAttribute("aria-selected", i === current ? "true" : "false");
    });
    if (counter) counter.textContent = `${current + 1} / ${total}`;
  }

  function next() { goTo(current + 1); }
  function prev() { goTo(current - 1); }

  function startAuto() {
    if (reducedMotion) return;
    stopAuto();
    autoTimer = setInterval(next, AUTO_DELAY);
  }
  function stopAuto() {
    if (autoTimer) { clearInterval(autoTimer); autoTimer = null; }
  }
  function resetAuto() { stopAuto(); startAuto(); }

  prevBtn?.addEventListener("click", () => { prev(); resetAuto(); });
  nextBtn?.addEventListener("click", () => { next(); resetAuto(); });
  thumbs.forEach((t, i) => {
    t.addEventListener("click", () => { goTo(i); resetAuto(); });
  });

  root.addEventListener("keydown", (e) => {
    if (e.key === "ArrowRight") { e.preventDefault(); next(); resetAuto(); }
    else if (e.key === "ArrowLeft") { e.preventDefault(); prev(); resetAuto(); }
    else if (e.key === "Home") { e.preventDefault(); goTo(0); resetAuto(); }
    else if (e.key === "End") { e.preventDefault(); goTo(total - 1); resetAuto(); }
  });

  let touchStartX = 0;
  let touchStartY = 0;
  const stage = root.querySelector(".avatar-stage-frame") || root;
  stage.addEventListener("touchstart", (e) => {
    touchStartX = e.touches[0].clientX;
    touchStartY = e.touches[0].clientY;
  }, { passive: true });
  stage.addEventListener("touchend", (e) => {
    const dx = e.changedTouches[0].clientX - touchStartX;
    const dy = e.changedTouches[0].clientY - touchStartY;
    if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy)) {
      if (dx > 0) prev(); else next();
      resetAuto();
    }
  }, { passive: true });

  root.addEventListener("mouseenter", stopAuto);
  root.addEventListener("mouseleave", startAuto);
  root.addEventListener("focusin", stopAuto);
  root.addEventListener("focusout", (e) => {
    if (!root.contains(e.relatedTarget)) startAuto();
  });

  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) startAuto();
      else stopAuto();
    });
  }, { threshold: 0.25 });
  observer.observe(root);

  document.addEventListener("visibilitychange", () => {
    if (document.hidden) stopAuto();
    else startAuto();
  });

  goTo(0);
}

/* ── Polaroid Animation Indexing ── */

function initAvatarSpread() {
  const photos = $$(".spread-photo");
  const rotations = [-4, 3, -2, 5, -3, 2, -5, 4, -1, 3, -4, 2, -3, 5, -2, 4, -5, 1];
  photos.forEach((p, i) => {
    p.style.setProperty("--i", String(i));
    p.style.setProperty("--spread-rot", String(rotations[i % rotations.length]));
  });

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.style.animationPlayState = "running";
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.1 }
  );
  photos.forEach((p) => {
    p.style.animationPlayState = "paused";
    observer.observe(p);
  });
}

/* ── Timeline Scroll Reveal ── */

function initTimelineReveal() {
  const items = $$(".tl-item");
  if (!items.length) return;

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.15, rootMargin: "0px 0px -40px 0px" }
  );
  items.forEach((item) => observer.observe(item));
}

/* ── Floating Orbs — ambient particle system ── */

function initOrbs() {
  const canvas = $("orb-canvas");
  if (!canvas || !(canvas instanceof HTMLCanvasElement)) return;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  const orbs = [];
  const ORB_COUNT = 18;

  function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  }
  resize();
  window.addEventListener("resize", resize);

  for (let i = 0; i < ORB_COUNT; i++) {
    const isWhite = Math.random() > 0.35;
    orbs.push({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      r: 2 + Math.random() * 4,
      dx: (Math.random() - 0.5) * 0.3,
      dy: -0.15 - Math.random() * 0.25,
      alpha: 0.05 + Math.random() * 0.15,
      color: isWhite
        ? `rgba(240, 230, 255, VAL)`
        : `rgba(${Math.random() > 0.5 ? "255, 23, 68" : "124, 58, 237"}, VAL)`,
      pulse: Math.random() * Math.PI * 2,
      pulseSpeed: 0.008 + Math.random() * 0.012,
    });
  }

  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    for (const orb of orbs) {
      orb.x += orb.dx;
      orb.y += orb.dy;
      orb.pulse += orb.pulseSpeed;

      if (orb.y < -20) { orb.y = canvas.height + 20; orb.x = Math.random() * canvas.width; }
      if (orb.x < -20) orb.x = canvas.width + 20;
      if (orb.x > canvas.width + 20) orb.x = -20;

      const a = orb.alpha * (0.5 + 0.5 * Math.sin(orb.pulse));
      const c = orb.color.replace("VAL", String(a));

      ctx.beginPath();
      ctx.arc(orb.x, orb.y, orb.r, 0, Math.PI * 2);
      ctx.fillStyle = c;
      ctx.fill();

      // Glow
      ctx.beginPath();
      ctx.arc(orb.x, orb.y, orb.r * 3, 0, Math.PI * 2);
      ctx.fillStyle = orb.color.replace("VAL", String(a * 0.15));
      ctx.fill();
    }
    requestAnimationFrame(draw);
  }
  draw();
}

/* ── Hero Waveform — real-time EMF-style oscilloscope ── */

function initWaveform() {
  const canvas = $("hero-waveform");
  if (!canvas || !(canvas instanceof HTMLCanvasElement)) return;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  let phase = 0;

  function resize() {
    const rect = canvas.parentElement.getBoundingClientRect();
    const dpr = devicePixelRatio || 1;
    canvas.width = Math.round(rect.width * dpr);
    canvas.height = Math.round(rect.height * dpr);
    canvas.style.width = rect.width + "px";
    canvas.style.height = rect.height + "px";
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  resize();
  window.addEventListener("resize", resize);

  function draw() {
    const w = canvas.width / (devicePixelRatio || 1);
    const h = canvas.height / (devicePixelRatio || 1);
    ctx.clearRect(0, 0, w, h);

    phase += 0.015;

    // Draw 3 waveforms — one for each sensor axis
    const waves = [
      { color: "rgba(255, 23, 68, 0.25)", freq: 0.008, amp: 0.2, speed: 1, offset: 0 },
      { color: "rgba(124, 58, 237, 0.2)", freq: 0.012, amp: 0.15, speed: 1.3, offset: 2 },
      { color: "rgba(0, 229, 255, 0.15)", freq: 0.006, amp: 0.25, speed: 0.7, offset: 4 },
    ];

    for (const wave of waves) {
      ctx.beginPath();
      ctx.strokeStyle = wave.color;
      ctx.lineWidth = 1.5;
      ctx.lineJoin = "round";

      for (let x = 0; x <= w; x += 2) {
        const noise = Math.sin(x * 0.05 + phase * 3) * 0.03;
        const y = h * 0.5 +
          Math.sin(x * wave.freq + phase * wave.speed + wave.offset) * h * wave.amp +
          Math.sin(x * wave.freq * 2.7 + phase * wave.speed * 1.8) * h * wave.amp * 0.3 +
          noise * h;
        x === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
      }
      ctx.stroke();
    }

    requestAnimationFrame(draw);
  }
  draw();
}

/* ── Scroll Reveal ── */

function initScrollReveal() {
  const reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (reduce) {
    document.documentElement.classList.remove("js-reveal-active");
    return;
  }

  const universalSelector = [
    ".reveal-section",
    "main > section",
    "main > article",
    ".panel",
    ".usecase-card",
    ".family-card",
    ".docs-sensor-chip",
    ".dossier-card",
    ".docs-example",
    ".legal-section",
    ".manifesto-frame",
    ".entropy-section > *",
  ].join(",");

  const targets = Array.from(document.querySelectorAll(universalSelector));
  targets.forEach((el, i) => {
    if (!el.classList.contains("reveal")) el.classList.add("reveal");
    if (!el.style.getPropertyValue("--reveal-delay")) {
      const delay = Math.min(i * 35, 280);
      el.style.setProperty("--reveal-delay", delay + "ms");
    }
  });

  if (!targets.length) {
    document.documentElement.classList.remove("js-reveal-active");
    return;
  }

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-revealed", "is-visible");
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.08, rootMargin: "0px 0px -60px 0px" }
  );

  targets.forEach((t) => observer.observe(t));

  setTimeout(() => {
    targets.forEach((t) => t.classList.add("is-revealed", "is-visible"));
  }, 3500);
}

/* ── Plate Vault: hover-autoplay + click-to-lightbox ── */

function initPlateVault() {
  const cards = $$(".plate-vault-card");
  if (!cards.length) return;

  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const isCoarsePointer = window.matchMedia("(pointer: coarse)").matches;

  cards.forEach((card) => {
    const video = card.querySelector("video");
    const img = card.querySelector("img");

    // Hover autoplay for video tiles (skip on touch + reduced-motion)
    if (video && !reduceMotion && !isCoarsePointer) {
      const sourceEl = video.querySelector("source");
      const srcUrl = sourceEl?.getAttribute("src");
      let loaded = false;
      const ensureLoaded = () => {
        if (loaded || !srcUrl) return;
        if (!video.querySelector("source[src]")) return;
        loaded = true;
        video.preload = "auto";
        video.muted = true;
        video.playsInline = true;
        video.load();
      };
      const tryPlay = () => {
        ensureLoaded();
        video.muted = true;
        const p = video.play();
        if (p && typeof p.catch === "function") p.catch(() => {});
      };
      const stopPlay = () => {
        try { video.pause(); video.currentTime = 0; } catch {}
      };
      card.addEventListener("pointerenter", tryPlay);
      card.addEventListener("pointerleave", stopPlay);
      card.addEventListener("focusin", tryPlay);
      card.addEventListener("focusout", stopPlay);
      // Hide native controls; the lightbox owns play UX
      video.removeAttribute("controls");
      video.setAttribute("tabindex", "-1");
    }

    // Click anywhere on card → lightbox
    if (video || img) {
      card.style.cursor = "zoom-in";
      card.setAttribute("role", "button");
      card.setAttribute("tabindex", "0");
      const open = (e) => {
        e.preventDefault();
        openPlateLightbox(card);
      };
      card.addEventListener("click", open);
      card.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") open(e);
      });
    }
  });
}

/* ── Plate Vault: cursor-tracked magnifier loupe over the merged grid ── */

function initPlateLoupe() {
  const wrap = document.querySelector(".plate-loupe-wrap");
  const grid = document.getElementById("plate-vault-grid");
  const loupe = document.getElementById("plate-loupe");
  const clone = document.getElementById("plate-loupe-clone");
  if (!wrap || !grid || !loupe || !clone) return;
  if (window.matchMedia("(pointer: coarse)").matches) return;
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  const ZOOM = 5;
  const SIZE = 360;
  loupe.style.setProperty("--loupe-size", SIZE + "px");

  let cloned = false;
  let resizeRaf = 0;

  const buildClone = () => {
    clone.innerHTML = "";
    const tree = grid.cloneNode(true);
    tree.removeAttribute("id");
    tree.classList.add("plate-vault-grid--clone");
    tree.querySelectorAll("video").forEach((v) => {
      const placeholder = document.createElement("img");
      placeholder.src = v.poster || "";
      placeholder.alt = "";
      placeholder.decoding = "async";
      placeholder.loading = "eager";
      v.replaceWith(placeholder);
    });
    tree.querySelectorAll("img").forEach((img) => {
      img.removeAttribute("loading");
      img.decoding = "async";
    });
    tree.style.width = grid.offsetWidth + "px";
    clone.appendChild(tree);
    cloned = true;
  };

  const sync = () => {
    if (!cloned) return;
    const cloneTree = clone.firstElementChild;
    if (cloneTree) cloneTree.style.width = grid.offsetWidth + "px";
  };

  const onMove = (e) => {
    const rect = wrap.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    if (x < 0 || y < 0 || x > rect.width || y > rect.height) {
      loupe.classList.remove("is-active");
      return;
    }
    if (!cloned) buildClone();
    loupe.classList.add("is-active");
    loupe.style.transform = `translate3d(${x - SIZE / 2}px, ${y - SIZE / 2}px, 0)`;
    const cx = -(x * ZOOM - SIZE / 2);
    const cy = -(y * ZOOM - SIZE / 2);
    clone.style.transform = `translate3d(${cx}px, ${cy}px, 0) scale(${ZOOM})`;
  };

  const onLeave = () => loupe.classList.remove("is-active");

  wrap.addEventListener("pointermove", onMove);
  wrap.addEventListener("pointerleave", onLeave);
  wrap.addEventListener("pointerenter", (e) => onMove(e));

  window.addEventListener(
    "resize",
    () => {
      cancelAnimationFrame(resizeRaf);
      resizeRaf = requestAnimationFrame(sync);
    },
    { passive: true },
  );
}

function ensurePlateLightbox() {
  let host = document.getElementById("plate-lightbox");
  if (host) return host;
  host = document.createElement("div");
  host.id = "plate-lightbox";
  host.className = "plate-lightbox";
  host.setAttribute("role", "dialog");
  host.setAttribute("aria-modal", "true");
  host.setAttribute("aria-label", "License plate viewer");
  host.hidden = true;
  host.innerHTML = `
    <button class="plate-lightbox-close" type="button" aria-label="Close (Esc)">×</button>
    <button class="plate-lightbox-nav plate-lightbox-prev" type="button" aria-label="Previous (←)">‹</button>
    <button class="plate-lightbox-nav plate-lightbox-next" type="button" aria-label="Next (→)">›</button>
    <div class="plate-lightbox-stage"></div>
    <div class="plate-lightbox-caption" aria-live="polite"></div>
  `;
  document.body.appendChild(host);

  host.addEventListener("click", (e) => {
    if (e.target === host) closePlateLightbox();
  });
  host.querySelector(".plate-lightbox-close").addEventListener("click", closePlateLightbox);
  host.querySelector(".plate-lightbox-prev").addEventListener("click", () => stepPlateLightbox(-1));
  host.querySelector(".plate-lightbox-next").addEventListener("click", () => stepPlateLightbox(1));

  document.addEventListener("keydown", (e) => {
    if (host.hidden) return;
    if (e.key === "Escape") closePlateLightbox();
    else if (e.key === "ArrowLeft") stepPlateLightbox(-1);
    else if (e.key === "ArrowRight") stepPlateLightbox(1);
  });
  return host;
}

function getPlateCards() {
  return $$(".plate-vault-card").filter((c) => c.querySelector("video, img"));
}

function openPlateLightbox(card) {
  const host = ensurePlateLightbox();
  const cards = getPlateCards();
  const idx = cards.indexOf(card);
  if (idx < 0) return;
  host.dataset.index = String(idx);
  host.hidden = false;
  document.body.classList.add("plate-lightbox-open");
  renderPlateLightbox();
  host.querySelector(".plate-lightbox-close").focus();
}

function closePlateLightbox() {
  const host = document.getElementById("plate-lightbox");
  if (!host) return;
  const stage = host.querySelector(".plate-lightbox-stage");
  if (stage) stage.innerHTML = "";
  host.hidden = true;
  document.body.classList.remove("plate-lightbox-open");
}

function stepPlateLightbox(delta) {
  const host = document.getElementById("plate-lightbox");
  if (!host) return;
  const cards = getPlateCards();
  if (!cards.length) return;
  let idx = Number(host.dataset.index || 0) + delta;
  if (idx < 0) idx = cards.length - 1;
  if (idx >= cards.length) idx = 0;
  host.dataset.index = String(idx);
  renderPlateLightbox();
}

function renderPlateLightbox() {
  const host = document.getElementById("plate-lightbox");
  if (!host) return;
  const cards = getPlateCards();
  const idx = Number(host.dataset.index || 0);
  const card = cards[idx];
  if (!card) return;
  const stage = host.querySelector(".plate-lightbox-stage");
  const caption = host.querySelector(".plate-lightbox-caption");
  stage.innerHTML = "";

  const sourceVideo = card.querySelector("video");
  const sourceImg = card.querySelector("img");
  if (sourceVideo) {
    const src = sourceVideo.querySelector("source")?.getAttribute("src");
    const poster = sourceVideo.getAttribute("poster") || "";
    const v = document.createElement("video");
    v.src = src || "";
    v.poster = poster;
    v.controls = true;
    v.autoplay = true;
    v.playsInline = true;
    v.loop = true;
    stage.appendChild(v);
    const p = v.play();
    if (p && typeof p.catch === "function") p.catch(() => {});
  } else if (sourceImg) {
    const i = document.createElement("img");
    i.src = sourceImg.currentSrc || sourceImg.src;
    i.alt = sourceImg.alt || "";
    stage.appendChild(i);
  }

  const labelEl = card.querySelector(".plate-vault-label");
  caption.textContent = labelEl ? labelEl.textContent.trim() : "";
}

/* ── Generic Gallery Lightbox ── */

function initGalleryLightbox() {
  const triggers = $$("[data-zoomable][data-gallery]");
  if (!triggers.length) return;

  const groups = new Map();
  triggers.forEach((img) => {
    const key = img.getAttribute("data-gallery");
    if (!key) return;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(img);
  });

  triggers.forEach((img) => {
    img.style.cursor = "zoom-in";
    img.setAttribute("tabindex", "0");
    img.setAttribute("role", "button");
    const open = (e) => {
      e.preventDefault();
      const key = img.getAttribute("data-gallery");
      const list = groups.get(key) || [];
      const idx = list.indexOf(img);
      openGalleryLightbox(key, idx >= 0 ? idx : 0);
    };
    img.addEventListener("click", open);
    img.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") open(e);
    });
  });

  function captionFor(img) {
    const fig = img.closest("figure");
    const cap = fig?.querySelector("figcaption");
    if (cap) return cap.textContent.trim();
    const slide = img.closest(".avatar-slide");
    if (slide) {
      const label = slide.querySelector(".avatar-frame-label")?.textContent.trim();
      const bullets = Array.from(slide.querySelectorAll(".avatar-slide-bullets li"))
        .slice(0, 1)
        .map((li) => li.textContent.trim());
      return [label, ...bullets].filter(Boolean).join(" — ");
    }
    return img.getAttribute("alt") || "";
  }

  function ensureLightbox() {
    let host = document.getElementById("gallery-lightbox");
    if (host) return host;
    host = document.createElement("div");
    host.id = "gallery-lightbox";
    host.className = "gallery-lightbox";
    host.setAttribute("role", "dialog");
    host.setAttribute("aria-modal", "true");
    host.setAttribute("aria-label", "Image viewer");
    host.hidden = true;
    host.innerHTML = `
      <button class="gallery-lightbox-close" type="button" aria-label="Close (Esc)">×</button>
      <button class="gallery-lightbox-nav gallery-lightbox-prev" type="button" aria-label="Previous (←)">‹</button>
      <button class="gallery-lightbox-nav gallery-lightbox-next" type="button" aria-label="Next (→)">›</button>
      <div class="gallery-lightbox-stage"></div>
      <div class="gallery-lightbox-caption" aria-live="polite"></div>
      <div class="gallery-lightbox-counter" aria-live="polite"></div>
    `;
    document.body.appendChild(host);

    host.addEventListener("click", (e) => { if (e.target === host) closeLightbox(); });
    host.querySelector(".gallery-lightbox-close").addEventListener("click", closeLightbox);
    host.querySelector(".gallery-lightbox-prev").addEventListener("click", () => step(-1));
    host.querySelector(".gallery-lightbox-next").addEventListener("click", () => step(1));

    document.addEventListener("keydown", (e) => {
      if (host.hidden) return;
      if (e.key === "Escape") closeLightbox();
      else if (e.key === "ArrowLeft") step(-1);
      else if (e.key === "ArrowRight") step(1);
      else if (e.key === "Home") jumpTo(0);
      else if (e.key === "End") jumpTo((groups.get(host.dataset.group) || []).length - 1);
    });

    let touchStartX = 0;
    host.addEventListener("touchstart", (e) => {
      touchStartX = e.touches[0].clientX;
    }, { passive: true });
    host.addEventListener("touchend", (e) => {
      const dx = e.changedTouches[0].clientX - touchStartX;
      if (Math.abs(dx) > 50) { dx > 0 ? step(-1) : step(1); }
    }, { passive: true });

    return host;
  }

  function openGalleryLightbox(group, index) {
    const host = ensureLightbox();
    host.dataset.group = group;
    host.dataset.index = String(index);
    host.hidden = false;
    document.body.classList.add("gallery-lightbox-open");
    render();
    host.querySelector(".gallery-lightbox-close").focus();
  }

  function closeLightbox() {
    const host = document.getElementById("gallery-lightbox");
    if (!host) return;
    host.querySelector(".gallery-lightbox-stage").innerHTML = "";
    host.hidden = true;
    document.body.classList.remove("gallery-lightbox-open");
  }

  function step(delta) {
    const host = document.getElementById("gallery-lightbox");
    if (!host) return;
    const list = groups.get(host.dataset.group) || [];
    if (!list.length) return;
    let idx = Number(host.dataset.index || 0) + delta;
    if (idx < 0) idx = list.length - 1;
    if (idx >= list.length) idx = 0;
    host.dataset.index = String(idx);
    render();
  }

  function jumpTo(idx) {
    const host = document.getElementById("gallery-lightbox");
    if (!host) return;
    host.dataset.index = String(idx);
    render();
  }

  function render() {
    const host = document.getElementById("gallery-lightbox");
    const list = groups.get(host.dataset.group) || [];
    const idx = Number(host.dataset.index || 0);
    const img = list[idx];
    if (!img) return;
    const stage = host.querySelector(".gallery-lightbox-stage");
    stage.innerHTML = "";
    const big = document.createElement("img");
    big.src = img.currentSrc || img.src;
    big.alt = img.alt || "";
    stage.appendChild(big);

    // Preload neighbors
    [idx - 1, idx + 1].forEach((n) => {
      const norm = ((n % list.length) + list.length) % list.length;
      const neighbor = list[norm];
      if (neighbor) { const pre = new Image(); pre.src = neighbor.currentSrc || neighbor.src; }
    });

    host.querySelector(".gallery-lightbox-caption").textContent = captionFor(img);
    host.querySelector(".gallery-lightbox-counter").textContent = `${idx + 1} / ${list.length}`;
  }
}

/* ── YouTube Facade ──
   Progressive enhancement: <div class="yt-facade" data-yt="VIDEO_ID"
        data-title="…" data-start="0" data-allow="…">
   Renders a poster + play button, then swaps in the real iframe on click.
   Falls back to plain anchor if JS is disabled (server-side <noscript> link). */
function initYouTubeFacades() {
  const facades = $$(".yt-facade");
  if (!facades.length) return;

  // hqdefault.jpg + mqdefault.jpg are guaranteed for every YouTube video.
  // maxresdefault/sddefault only exist for HD uploads — probing them fires
  // 404s in DevTools for SD/older videos, so we use the guaranteed tier.
  const thumbCandidates = (id) => [
    `https://i.ytimg.com/vi/${id}/hqdefault.jpg`,
    `https://i.ytimg.com/vi/${id}/mqdefault.jpg`,
  ];

  facades.forEach((facade) => {
    const id = facade.dataset.yt;
    if (!id) return;
    const title = facade.dataset.title || "Play video";
    const start = facade.dataset.start || "0";
    const allow = facade.dataset.allow ||
      "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share";

    if (!facade.style.backgroundImage) {
      const candidates = thumbCandidates(id);
      const probe = (i) => {
        if (i >= candidates.length) return;
        const im = new Image();
        im.onload = () => {
          if (im.naturalWidth >= 320) {
            facade.style.backgroundImage = `url("${candidates[i]}")`;
          } else {
            probe(i + 1);
          }
        };
        im.onerror = () => probe(i + 1);
        im.src = candidates[i];
      };
      probe(0);
    }

    if (!facade.querySelector(".yt-facade-play")) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "yt-facade-play";
      btn.setAttribute("aria-label", `Play: ${title}`);
      facade.appendChild(btn);
    }
    if (title && !facade.querySelector(".yt-facade-title")) {
      const lbl = document.createElement("span");
      lbl.className = "yt-facade-title";
      lbl.textContent = title;
      facade.appendChild(lbl);
    }
    facade.setAttribute("role", "button");
    facade.setAttribute("tabindex", "0");
    facade.setAttribute("aria-label", `Play: ${title}`);

    const activate = () => {
      if (facade.classList.contains("is-playing")) return;
      const iframe = document.createElement("iframe");
      iframe.src = `https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0&modestbranding=1&playsinline=1&start=${start}`;
      iframe.title = title;
      iframe.setAttribute("allow", allow);
      iframe.setAttribute("allowfullscreen", "");
      iframe.referrerPolicy = "strict-origin-when-cross-origin";
      iframe.loading = "eager";
      facade.classList.add("is-playing");
      facade.appendChild(iframe);
    };

    facade.addEventListener("click", (e) => {
      if (e.target.tagName === "A") return;
      activate();
    });
    facade.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        activate();
      }
    });

    // Warm the YT origin once the user mouses over — speeds up first play
    let warmed = false;
    facade.addEventListener("pointerover", () => {
      if (warmed) return;
      warmed = true;
      const link = document.createElement("link");
      link.rel = "preconnect";
      link.href = "https://www.youtube-nocookie.com";
      link.crossOrigin = "";
      document.head.appendChild(link);
    }, { once: true });
  });
}

/* ── Live Transmission Feed ── */

const feedStreamEl = $("feed-stream");
const feedEmptyEl = $("feed-empty");
const feedTotalEl = $("feed-total");
const feedStatusEl = $("feed-status");
const feedFilterButtons = $$("[data-feed]");

const feedState = {
  latestAt: null,
  filter: "all",
  entries: [],
  seenIds: new Set(),
};

function feedEntryId(entry) {
  if (entry.type === "call") return `call:${entry.callSid}:${entry.turnNumber}`;
  return `chat:${entry.sessionId}:${entry.createdAt}`;
}

function formatFeedTime(iso) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const now = Date.now();
  const diff = now - d.getTime();
  if (diff < 60000) return "just now";
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
  return d.toLocaleDateString();
}

function renderFeedEntry(entry) {
  const div = document.createElement("div");
  div.className = `feed-entry feed-entry-${entry.type}`;

  const header = document.createElement("div");
  header.className = "feed-entry-header";

  const typeBadge = el("span", "feed-entry-type", entry.type === "call" ? "HOTLINE" : "CHAT");
  const time = el("span", "feed-entry-time", formatFeedTime(entry.createdAt));
  header.append(typeBadge, time);

  const content = document.createElement("div");
  content.className = "feed-entry-content";

  if (entry.type === "call") {
    const callerTurn = document.createElement("div");
    callerTurn.className = "feed-turn";
    const callerLabel = el("span", "feed-entry-speaker feed-entry-speaker-caller", "CALLER:");
    callerTurn.append(callerLabel, document.createTextNode(" " + entry.transcript));
    content.append(callerTurn);

    if (entry.aiResponse) {
      const signalTurn = document.createElement("div");
      signalTurn.className = "feed-turn";
      const signalLabel = el("span", "feed-entry-speaker feed-entry-speaker-signal", "SIGNAL:");
      signalTurn.append(signalLabel, document.createTextNode(" " + entry.aiResponse));
      content.append(signalTurn);
    }
  } else {
    const label = entry.role === "user" ? "HUMAN" : "SIGNAL";
    const cls = entry.role === "user" ? "feed-entry-speaker-human" : "feed-entry-speaker-signal";
    const speaker = el("span", `feed-entry-speaker ${cls}`, `${label}:`);
    content.append(speaker, document.createTextNode(" " + entry.content));
  }

  div.append(header, content);
  return div;
}

function applyFeedFilter() {
  if (!feedStreamEl) return;
  const children = feedStreamEl.querySelectorAll(".feed-entry");
  children.forEach((child) => {
    if (feedState.filter === "all") {
      child.style.display = "";
    } else if (feedState.filter === "calls") {
      child.style.display = child.classList.contains("feed-entry-call") ? "" : "none";
    } else {
      child.style.display = child.classList.contains("feed-entry-chat") ? "" : "none";
    }
  });
}

async function loadFeed(isPolling) {
  if (!feedStreamEl) return;
  try {
    const params = new URLSearchParams({ limit: "30" });
    if (isPolling && feedState.latestAt) params.set("since", feedState.latestAt);

    const res = await fetch(`/api/v1/transmissions/live?${params}`, {
      headers: { accept: "application/json" },
    });
    if (!res.ok) return;
    const data = await res.json();

    if (feedTotalEl) feedTotalEl.textContent = String(data.total);
    if (data.latestAt) feedState.latestAt = data.latestAt;

    const newEntries = data.entries.filter((e) => !feedState.seenIds.has(feedEntryId(e)));

    if (newEntries.length > 0) {
      if (feedEmptyEl) feedEmptyEl.style.display = "none";

      // Newest first — prepend to stream
      for (const entry of newEntries.reverse()) {
        const id = feedEntryId(entry);
        feedState.seenIds.add(id);
        const node = renderFeedEntry(entry);
        feedStreamEl.prepend(node);
      }

      applyFeedFilter();

      // Cap DOM entries
      const allEntries = feedStreamEl.querySelectorAll(".feed-entry");
      if (allEntries.length > 60) {
        for (let i = 60; i < allEntries.length; i++) allEntries[i].remove();
      }
    }

    if (feedStatusEl) feedStatusEl.textContent = "LIVE";
  } catch {
    if (feedStatusEl) feedStatusEl.textContent = "OFFLINE";
  }
}

/* ── Refresh ── */

async function refreshAll() {
  try {
    refreshPreset();
    await Promise.all([loadCurrent(), loadHistory(), loadEntropy(), loadTransmissionCount()]);
    loadSnapshotUtils().catch(() => {});
  } catch {
    if (currentStateEl) currentStateEl.textContent = "Signal not responding.";
    if (chartMetaEl) chartMetaEl.textContent = "Unable to load data.";
  }
}

/* ── Event Listeners ── */

window.addEventListener("resize", () => drawChart(state.chartPoints));
/* Prevent browser from restoring scroll position on reload/back-forward */
history.scrollRestoration = 'manual';

// Chart tooltip — mousemove on canvas
if (chartCanvas) {
  const canvasWrap = chartCanvas.closest(".chart-canvas-wrap") || chartCanvas.parentElement;

  function showChartTooltip(e) {
    if (!state.chartPoints.length || !chartTooltipEl) return;
    const rect = chartCanvas.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const frac = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));

    const vals = state.chartPoints.map((p) => p.value);
    const min = Math.min(...vals), max = Math.max(...vals);
    const span = Math.max(0.0001, max - min);
    const rangeStart = new Date(state.range.start ?? state.chartPoints[0].timestamp).getTime();
    const rangeEnd = new Date(state.range.end ?? state.chartPoints[state.chartPoints.length - 1].timestamp).getTime();
    const tAtCursor = rangeStart + frac * (rangeEnd - rangeStart);
    let nearest = state.chartPoints[0];
    let bestDist = Infinity;
    state.chartPoints.forEach((pt) => {
      const d = Math.abs(new Date(pt.timestamp).getTime() - tAtCursor);
      if (d < bestDist) { bestDist = d; nearest = pt; }
    });

    const ptFrac = (new Date(nearest.timestamp).getTime() - rangeStart) / Math.max(1, rangeEnd - rangeStart);
    const xPct = ptFrac * 100;
    const yFrac = (nearest.value - min) / span;

    const label = new Date(nearest.timestamp).toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
    chartTooltipEl.innerHTML = `<span class="chart-tooltip-val">${nearest.value.toFixed(4)} mG</span><span class="chart-tooltip-time">${label}</span>`;
    chartTooltipEl.style.left = `${Math.min(xPct, 88)}%`;
    chartTooltipEl.style.top = `${Math.max(8, (1 - yFrac) * 80)}%`;
    chartTooltipEl.removeAttribute("aria-hidden");
    chartTooltipEl.style.opacity = "1";
  }

  function hideChartTooltip() {
    if (!chartTooltipEl) return;
    chartTooltipEl.style.opacity = "0";
    chartTooltipEl.setAttribute("aria-hidden", "true");
  }

  chartCanvas.addEventListener("mousemove", showChartTooltip);
  chartCanvas.addEventListener("touchmove", showChartTooltip, { passive: true });
  chartCanvas.addEventListener("mouseleave", hideChartTooltip);
  chartCanvas.addEventListener("touchend", hideChartTooltip);
}

// Service worker registration
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => { navigator.serviceWorker.register("/sw.js").catch(() => {}); });
}

initOrbs();
initWaveform();
initScrollReveal();
initStorySlider();
initAvatarSpread();
initAvatarSlideshow();
initPlateVault();
initPlateLoupe();
initGalleryLightbox();
initYouTubeFacades();
initHobbitAudio();

if (document.body.dataset.page === "home") {
  Promise.all([loadMeta(), loadTimeline()])
    .then(() => {
      const r = parseInitialRange();
      const u = new URL(location.href);
      const userPicked = u.searchParams.has("range") || (u.searchParams.has("start") && u.searchParams.has("end"));
      setRange(r.preset, { start: r.start, end: r.end }, { persist: userPicked });
      return refreshAll();
    })
    .catch((err) => {
      if (currentStateEl) currentStateEl.textContent = "Signal not responding.";
      console.error(err);
    });

  // Range presets
  rangeButtons.forEach((btn) => {
    btn.addEventListener("click", async () => {
      const p = btn.dataset.range;
      if (!p) return;
      setRange(p, getPresetRange(p), { persist: true });
      try {
        await Promise.all([loadHistory(), loadEntropy()]);
        loadSnapshotUtils().catch(() => {});
      } catch { if (chartMetaEl) chartMetaEl.textContent = "Unable to load range."; }
    });
  });

  // Custom range form
  historyFormEl?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const s = parseDT(historyStartEl?.value), en = parseDT(historyEndEl?.value);
    if (!s || !en || new Date(en) <= new Date(s)) {
      if (chartMetaEl) chartMetaEl.textContent = "Choose a valid start and end time.";
      return;
    }
    setRange("custom", { start: s, end: en }, { persist: true });
    try {
      await Promise.all([loadHistory(), loadEntropy()]);
      loadSnapshotUtils().catch(() => {});
    } catch { if (chartMetaEl) chartMetaEl.textContent = "Unable to load range."; }
  });

  // Copy buttons
  copyRangeLinkEl?.addEventListener("click", async () => {
    try { await navigator.clipboard.writeText(location.href); } catch {}
  });

  copySheetsFormulaEl?.addEventListener("click", async () => {
    const formula = sheetsFormulaEl?.textContent;
    if (!formula) return;
    const labelEl = copySheetsFormulaEl.querySelector("span");
    try {
      await navigator.clipboard.writeText(formula);
      if (copySheetsStatusEl) copySheetsStatusEl.textContent = "Copied to clipboard.";
      copySheetsFormulaEl.classList.add("is-copied");
      if (labelEl) labelEl.textContent = "Copied";
      setTimeout(() => {
        copySheetsFormulaEl.classList.remove("is-copied");
        if (labelEl) labelEl.textContent = "Copy";
      }, 1800);
    } catch {
      if (copySheetsStatusEl) copySheetsStatusEl.textContent = "Copy failed.";
    }
  });

  // Entropy copy button
  copyEntropyBtn?.addEventListener("click", async () => {
    const val = randomNumberEl?.textContent?.trim();
    if (!val || val === "--") return;
    try {
      await navigator.clipboard.writeText(val);
      if (copyEntropyStatusEl) copyEntropyStatusEl.textContent = "Copied.";
      copyEntropyBtn.classList.add("is-copied");
      setTimeout(() => {
        if (copyEntropyStatusEl) copyEntropyStatusEl.textContent = "";
        copyEntropyBtn.classList.remove("is-copied");
      }, 1800);
    } catch {
      if (copyEntropyStatusEl) copyEntropyStatusEl.textContent = "Copy failed.";
    }
  });

  // Timeline: vertical, all events visible — no keyboard nav needed

  // Chat widget
  chatToggleEl?.addEventListener("click", () => toggleChat());
  chatCloseEl?.addEventListener("click", () => toggleChat(false));
  chatBackdropEl?.addEventListener("click", () => toggleChat(false));
  openChatEl?.addEventListener("click", () => toggleChat(true));
  document.querySelectorAll('[data-action="open-chat"]').forEach((el) =>
    el.addEventListener("click", () => toggleChat(true))
  );

  chatFormEl?.addEventListener("submit", (e) => {
    e.preventDefault();
    const msg = chatInputEl?.value?.trim();
    if (!msg) return;
    if (msg.startsWith("/")) {
      const handled = runSlashCommand(msg);
      if (handled) {
        chatInputEl.value = "";
        autoGrowTextarea();
        updateCharCount();
        return;
      }
    }
    chatInputEl.value = "";
    autoGrowTextarea();
    updateCharCount();
    sendChatMessage(msg);
  });

  // Textarea: Enter→send, Shift+Enter→newline, ↑ recalls last sent
  chatInputEl?.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey && !e.isComposing) {
      e.preventDefault();
      chatFormEl?.dispatchEvent(new Event("submit", { cancelable: true }));
      return;
    }
    if (e.key === "ArrowUp" && !chatInputEl.value && chatLastSentMessage) {
      e.preventDefault();
      chatInputEl.value = chatLastSentMessage;
      autoGrowTextarea();
      updateCharCount();
      chatInputEl.setSelectionRange(chatInputEl.value.length, chatInputEl.value.length);
    }
  });
  chatInputEl?.addEventListener("input", () => {
    autoGrowTextarea();
    updateCharCount();
  });

  // Starter prompts: click → send immediately + hide bar
  chatStartersEl?.addEventListener("click", (e) => {
    const btn = e.target.closest(".chat-starter");
    if (!btn) return;
    const prompt = btn.dataset.starter || btn.textContent.trim();
    if (!prompt) return;
    if (chatInputEl) chatInputEl.value = "";
    autoGrowTextarea();
    updateCharCount();
    sendChatMessage(prompt);
  });

  // Per-message action delegation (copy/speak/regen)
  chatMessagesEl?.addEventListener("click", (e) => {
    const btn = e.target.closest(".chat-msg-action");
    if (!btn) return;
    const action = btn.dataset.msgAction;
    const row = btn.closest(".chat-message");
    const text = row?.querySelector(".chat-msg-text")?.textContent || "";
    if (action === "copy") {
      navigator.clipboard?.writeText(text).then(() => {
        btn.textContent = "Copied";
        setTimeout(() => { btn.textContent = "Copy"; }, 1200);
      });
    } else if (action === "speak") {
      speakText(text);
    } else if (action === "regen") {
      const last = chatHistory.slice().reverse().find((m) => m.role === "user");
      if (last) sendChatMessage(last.content);
    }
  });

  // File attachments
  chatAttachEl?.addEventListener("change", (e) => {
    addAttachments(e.target.files);
    e.target.value = "";
  });
  chatAttachmentsEl?.addEventListener("click", (e) => {
    const rm = e.target.closest(".chat-attachment-remove");
    if (!rm) return;
    const idx = Number(rm.dataset.idx);
    if (Number.isFinite(idx)) chatAttachments.splice(idx, 1);
    renderAttachments();
  });

  // Search bar
  chatSearchToggleEl?.addEventListener("click", () => toggleChatSearch());
  chatSearchInputEl?.addEventListener("input", (e) => applyChatSearchFilter(e.target.value));

  // Settings drawer
  chatSettingsToggleEl?.addEventListener("click", openChatSettings);
  chatSettingsCloseEl?.addEventListener("click", closeChatSettings);

  // Shortcuts overlay
  chatHelpLinkEl?.addEventListener("click", openChatShortcuts);
  chatShortcutsCloseEl?.addEventListener("click", closeChatShortcuts);
  chatShortcutsEl?.addEventListener("click", (e) => {
    if (e.target === chatShortcutsEl) closeChatShortcuts();
  });

  // Scroll-to-bottom button
  chatScrollBottomEl?.addEventListener("click", () => {
    chatAutoScrollLocked = true;
    chatUnreadCount = 0;
    updateUnreadBadge();
    scrollChatToBottom();
  });

  // TTS stop
  chatTtsStopEl?.addEventListener("click", () => {
    try { window.speechSynthesis?.cancel(); } catch {}
    chatTtsStopEl.hidden = true;
  });

  // Chat init chain
  applyChatPrefs();
  restoreTranscript();
  initChatVoice();
  initChatTts();
  initChatSettings();
  initChatResize();
  initChatScrollWatch();
  initChatDragDrop();
  initChatOnlineWatch();
  autoGrowTextarea();
  updateCharCount();
  setChatStatus(navigator.onLine);

  // Global keyboard shortcuts
  document.addEventListener("keydown", (e) => {
    const t = e.target;
    const inField = t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable);
    if (e.key === "Escape") {
      if (chatShortcutsEl && !chatShortcutsEl.hidden) { closeChatShortcuts(); return; }
      if (chatSettingsEl && chatSettingsEl.classList.contains("is-open")) { closeChatSettings(); return; }
      if (state.chatOpen) { toggleChat(false); return; }
    }
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
      e.preventDefault();
      toggleChat(true);
      setTimeout(() => chatInputEl?.focus(), 50);
      return;
    }
    if ((e.metaKey || e.ctrlKey) && e.key === "/") {
      if (state.chatOpen) {
        e.preventDefault();
        toggleChatSearch();
      }
      return;
    }
    if (e.key === "?" && !inField && state.chatOpen) {
      e.preventDefault();
      openChatShortcuts();
    }
  });

  // Scroll-triggered dossier cards and emo ducks
  const dossierObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          dossierObserver.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.15, rootMargin: "0px 0px -60px 0px" }
  );
  $$(".dossier-card").forEach((card) => dossierObserver.observe(card));
  // Hard fallback so no dossier card stays at opacity 0
  setTimeout(() => {
    $$(".dossier-card:not(.is-visible)").forEach((c) => c.classList.add("is-visible"));
  }, 3000);

  const duckObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        entry.target.querySelectorAll(".emo-duck").forEach((duck) => {
          duck.classList.toggle("is-peeking", entry.isIntersecting);
        });
      });
    },
    { threshold: 0.3 }
  );
  $$(".duck-row").forEach((row) => duckObserver.observe(row));

  // MUD terminal — xterm.js + WebSocket-to-TCP proxy (lazy-connect on scroll)
  const mudXtermEl = $("mud-xterm");
  const mudStatusEl = $("mud-status");
  const mudStatusDot = $("mud-status-dot");
  if (mudXtermEl && window.Terminal) {
    const term = new window.Terminal({
      cursorBlink: true,
      cursorStyle: "underline",
      fontFamily: "'Fira Code', 'JetBrains Mono', 'Cascadia Code', monospace",
      fontSize: 13,
      lineHeight: 1.25,
      rows: 28,
      cols: 80,
      scrollback: 2000,
      allowTransparency: true,
      theme: {
        background: "rgba(6, 6, 16, 0)",
        foreground: "#c8ffd4",
        cursor: "#FF1744",
        cursorAccent: "#060610",
        selectionBackground: "rgba(255, 23, 68, 0.25)",
        selectionForeground: "#ffffff",
        black: "#0a0a1a",
        red: "#ff1744",
        green: "#7affae",
        yellow: "#ffd740",
        blue: "#50aae3",
        magenta: "#7c3aed",
        cyan: "#00e5ff",
        white: "#e0e0e0",
        brightBlack: "#4a4a6a",
        brightRed: "#ff5252",
        brightGreen: "#b9f6ca",
        brightYellow: "#ffe57f",
        brightBlue: "#82ccff",
        brightMagenta: "#b388ff",
        brightCyan: "#84ffff",
        brightWhite: "#ffffff",
      },
    });

    function setMudStatus(status, dotClass) {
      if (mudStatusEl) mudStatusEl.textContent = status;
      if (mudStatusDot) mudStatusDot.className = "mud-status-dot " + dotClass;
    }

    let ws = null;
    let mudConnected = false;
    let mudOpened = false;

    function openSocket() {
      setMudStatus("Connecting", "mud-dot-pulse");
      const protocol = location.protocol === "https:" ? "wss:" : "ws:";
      ws = new WebSocket(`${protocol}//${location.host}/ws/mud`);
      ws.binaryType = "arraybuffer";

      ws.addEventListener("open", () => {
        setMudStatus("Connected", "mud-dot-live");
      });

      ws.addEventListener("message", (e) => {
        const text = typeof e.data === "string" ? e.data : new TextDecoder().decode(e.data);
        term.write(text);
      });

      ws.addEventListener("close", () => {
        setMudStatus("Disconnected", "mud-dot-dead");
        term.write("\r\n\x1b[2m--- Connection closed. Click Reconnect to retry. ---\x1b[0m\r\n");
      });

      ws.addEventListener("error", () => {
        setMudStatus("Error", "mud-dot-dead");
      });
    }

    function reconnectMud() {
      if (ws && (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING)) {
        try { ws.close(); } catch (_) { /* noop */ }
      }
      term.write("\r\n\x1b[2m--- Reconnecting... ---\x1b[0m\r\n");
      openSocket();
    }

    function connectMud() {
      if (mudConnected) return;
      mudConnected = true;
      if (!mudOpened) {
        term.open(mudXtermEl);
        mudOpened = true;
        // xterm focuses its textarea on open — blur it without scrolling.
        if (document.activeElement && document.activeElement !== document.body) {
          document.activeElement.blur();
        }
      }
      openSocket();

      // Local echo — Avatar MUD operates in character mode without server-side echo,
      // so we display each keystroke locally as we send it to the WebSocket.
      term.onData((data) => {
        if (ws && ws.readyState === WebSocket.OPEN) ws.send(data);
        if (data === "\r") term.write("\r\n");
        else if (data === "\x7f" || data === "\b") term.write("\b \b");
        else if (data >= " " || data === "\t") term.write(data);
      });

      // Ensure clicking anywhere on the terminal container focuses xterm
      const focusTerm = () => {
        term.focus();
        const ta = mudXtermEl.querySelector(".xterm-helper-textarea");
        if (ta) ta.focus();
      };
      mudXtermEl.addEventListener("click", focusTerm);
      mudXtermEl.addEventListener("touchstart", focusTerm, { passive: true });
      mudXtermEl.addEventListener("focusin", focusTerm);
      mudXtermEl.setAttribute("tabindex", "0");
      mudXtermEl.style.cursor = "text";
    }

    // Connect only after user has scrolled (never on fresh page load —
    // term.open() focuses xterm's textarea which can scroll the page).
    const startMudObserver = () => {
      const mudObserver = new IntersectionObserver(
        (entries) => {
          if (entries[0].isIntersecting) {
            connectMud();
            mudObserver.disconnect();
          }
        },
        { rootMargin: "0px" },
      );
      mudObserver.observe(mudXtermEl);
    };
    window.addEventListener("scroll", startMudObserver, { passive: true, once: true });

    const mudReconnectBtn = $("mud-reconnect");
    mudReconnectBtn?.addEventListener("click", () => {
      if (!mudOpened) {
        connectMud();
        return;
      }
      reconnectMud();
    });
  }

  // Newsletter form (email only — anonymous by design)
  const newsletterForm = $("newsletter-form");
  const newsletterEmail = $("newsletter-email");
  const newsletterWebsite = $("newsletter-website");
  const newsletterSubmit = $("newsletter-submit");
  const newsletterStatus = $("newsletter-status");
  const setNewsletterState = (state, message) => {
    if (!newsletterStatus) return;
    newsletterStatus.dataset.state = state;
    newsletterStatus.textContent = message;
  };
  newsletterForm?.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (newsletterWebsite?.value) return; // honeypot tripped
    const email = newsletterEmail?.value?.trim();
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setNewsletterState("error", "Enter a valid email.");
      newsletterEmail?.focus();
      return;
    }
    if (newsletterSubmit) {
      newsletterSubmit.disabled = true;
      newsletterSubmit.dataset.label = newsletterSubmit.textContent;
      newsletterSubmit.textContent = "Subscribing…";
    }
    setNewsletterState("pending", "Routing through the signal relay…");
    try {
      const res = await fetch("/api/v1/newsletter/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setNewsletterState("success", data.message || "Subscribed. The signal will find you.");
        newsletterEmail.value = "";
      } else if (res.status === 429) {
        setNewsletterState("error", "Too many attempts. Wait a minute and try again.");
      } else {
        setNewsletterState("error", data.error || "Something went wrong. Try again.");
      }
    } catch {
      setNewsletterState("error", "Network error. The signal is disrupted.");
    } finally {
      if (newsletterSubmit) {
        newsletterSubmit.disabled = false;
        newsletterSubmit.textContent = newsletterSubmit.dataset.label || "Subscribe";
      }
    }
  });

  // Feed — only wired when a standalone feed-stream exists. Merged Transmission Log
  // (transmissions.js) owns feed-total + feed-status when there is no feed-stream.
  if (feedStreamEl) {
    loadFeed(false).catch(() => {});
    feedFilterButtons.forEach((btn) => {
      btn.addEventListener("click", () => {
        feedState.filter = btn.dataset.feed;
        feedFilterButtons.forEach((b) => b.classList.toggle("is-active", b === btn));
        applyFeedFilter();
      });
    });
    setInterval(() => loadFeed(true).catch(() => {}), 5000);
  }

  // Auto-refresh
  setInterval(() => loadCurrent().catch(() => {}), 2000);
  setInterval(() => {
    refreshPreset();
    loadHistory().catch(() => {});
    loadEntropy().catch(() => {});
    loadSnapshotUtils().catch(() => {});
  }, 10000);
  setInterval(() => loadTransmissionCount().catch(() => {}), 30000);

  // Signal age update
  setInterval(() => {
    if (state.meta?.earliestKnownAt) {
      const age = formatAge(state.meta.earliestKnownAt);
      if (signalAgeEl) signalAgeEl.textContent = age;
      if (teleAgeEl) teleAgeEl.textContent = age;
    }
  }, 60000);
}

/* ---------- Middle-Earth Map (ambient CSS-only — no JS needed) ---------- */
function initMiddleEarthMap() {
  return;
}

/* ---------- Hobbit Kettle Fire — Web Audio API (120fps cinematic) ---------- */
function initHobbitAudio() {
  const section   = document.getElementById('hobbits');
  const playBtn   = document.getElementById('hobbit-play');
  const canvas    = document.getElementById('hobbit-viz');
  const embersDiv = document.getElementById('hobbit-embers');
  const fillEl    = document.getElementById('hobbit-progress-fill');
  const glowEl    = document.getElementById('hobbit-progress-glow');
  const timeEl    = document.getElementById('hobbit-time');
  const progOuter = document.getElementById('hobbit-progress-outer');
  const badge     = document.getElementById('hobbit-badge');
  const badgeText = document.getElementById('hobbit-badge-text');
  const vuL       = document.getElementById('vu-fill-l');
  const vuR       = document.getElementById('vu-fill-r');

  if (!playBtn || !canvas) return;

  const ctx2d = canvas.getContext('2d', { alpha: true });
  let audioCtx, analyser, source, audio;
  let isPlaying = false;
  let rafId = null;
  let idleRafId = null;
  let t = 0;

  // Fire color palette — sub-bass (deep red) through treble (white-gold)
  const FIRE = ['#1a0400','#3d0800','#7a1200','#c42200','#ff3800','#ff6200','#ff8f00','#ffbc00','#ffd84d','#fff0a0'];

  function fireColor(val) {
    const i = Math.min(FIRE.length - 1, Math.floor(Math.max(0, val) * (FIRE.length - 1)));
    return FIRE[i];
  }

  function formatTime(s) {
    const m = Math.floor(s / 60);
    return `${m}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
  }

  function syncCanvasSize() {
    const w = canvas.offsetWidth;
    const h = canvas.offsetHeight || 220;
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w; canvas.height = h;
    }
  }

  // Pre-baked ambient spectrum profile for idle state
  // Mimics acoustic fire/kettle ambient: heavy bass, rolling mids, sparse treble
  function makeIdleProfile(bins) {
    return Array.from({ length: bins }, (_, i) => {
      const p = i / bins;
      let v;
      if      (p < 0.04)  v = 0.82 + Math.random() * 0.16;  // sub-bass
      else if (p < 0.10)  v = 0.68 + Math.random() * 0.22;  // bass
      else if (p < 0.22)  v = 0.42 + Math.random() * 0.28;  // low-mid
      else if (p < 0.40)  v = 0.24 + Math.random() * 0.22;  // mid
      else if (p < 0.62)  v = 0.10 + Math.random() * 0.16;  // hi-mid
      else                v = 0.02 + Math.random() * 0.08;   // treble
      return v;
    });
  }

  const IDLE_BINS = 128;
  let idleProfile = makeIdleProfile(IDLE_BINS);
  // Smooth the profile
  idleProfile = idleProfile.map((v, i) => {
    const neighbors = idleProfile.slice(Math.max(0, i - 2), i + 3);
    return neighbors.reduce((a, b) => a + b, 0) / neighbors.length;
  });

  // Perlin-like noise for idle breathing
  function noise(x) {
    return (Math.sin(x * 1.7) + Math.sin(x * 3.1) + Math.sin(x * 0.4)) / 3;
  }

  function drawIdleFrame(timestamp) {
    syncCanvasSize();
    const W = canvas.width, H = canvas.height;
    const ts = (timestamp || 0) * 0.0004;

    ctx2d.clearRect(0, 0, W, H);

    // Background gradient — deep ember glow
    const bg = ctx2d.createLinearGradient(0, H, 0, 0);
    bg.addColorStop(0, 'rgba(60,12,2,0.85)');
    bg.addColorStop(0.4, 'rgba(20,6,2,0.6)');
    bg.addColorStop(1, 'rgba(6,6,16,0.95)');
    ctx2d.fillStyle = bg;
    ctx2d.fillRect(0, 0, W, H);

    // Subtle warm glow from bottom center
    const glow = ctx2d.createRadialGradient(W / 2, H, 0, W / 2, H, H * 0.7);
    glow.addColorStop(0, 'rgba(200,60,0,0.22)');
    glow.addColorStop(1, 'rgba(0,0,0,0)');
    ctx2d.fillStyle = glow;
    ctx2d.fillRect(0, 0, W, H);

    const barCount = IDLE_BINS;
    const centerY  = H * 0.72;
    const step     = W / barCount;
    const barW     = Math.max(1, step - 1.2);

    for (let i = 0; i < barCount; i++) {
      // Breathing: each bar oscillates gently with unique phase
      const breathe = 0.06 * noise(ts + i * 0.18);
      const val = Math.max(0.01, Math.min(1, idleProfile[i] + breathe));
      const barH = val * centerY * 0.94;
      const x    = i * step;

      // Bar gradient (bottom = deep red, top = gold/white)
      const g = ctx2d.createLinearGradient(x, centerY - barH, x, centerY);
      g.addColorStop(0, fireColor(Math.min(1, val + 0.15)));
      g.addColorStop(0.55, fireColor(val * 0.75));
      g.addColorStop(1, 'rgba(80,10,0,0.3)');
      ctx2d.fillStyle = g;
      ctx2d.globalAlpha = 0.82;
      ctx2d.beginPath();
      if (ctx2d.roundRect) ctx2d.roundRect(x, centerY - barH, barW, barH, [1.5, 1.5, 0, 0]);
      else ctx2d.rect(x, centerY - barH, barW, barH);
      ctx2d.fill();

      // Reflection below centerline — dim mirror
      if (barH > 2) {
        const rH  = barH * 0.28;
        const rg  = ctx2d.createLinearGradient(x, centerY, x, centerY + rH);
        rg.addColorStop(0, `rgba(180,40,0,${val * 0.25})`);
        rg.addColorStop(1, 'rgba(0,0,0,0)');
        ctx2d.fillStyle = rg;
        ctx2d.globalAlpha = 1;
        ctx2d.fillRect(x, centerY, barW, rH);
      }

      // Peak cap dots on tall bars
      if (val > 0.5) {
        ctx2d.fillStyle = FIRE[FIRE.length - 1];
        ctx2d.globalAlpha = (val - 0.5) * 0.9;
        ctx2d.fillRect(x, centerY - barH - 2, barW, 2);
      }
    }
    ctx2d.globalAlpha = 1;

    // Static waveform — ambient sine-composite across top third
    ctx2d.beginPath();
    const wH  = H * 0.14;
    const wY  = H * 0.22;
    const wg  = ctx2d.createLinearGradient(0, 0, W, 0);
    wg.addColorStop(0,   'rgba(255,180,60,0)');
    wg.addColorStop(0.1, 'rgba(255,200,80,0.45)');
    wg.addColorStop(0.5, 'rgba(255,230,120,0.6)');
    wg.addColorStop(0.9, 'rgba(255,200,80,0.45)');
    wg.addColorStop(1,   'rgba(255,180,60,0)');
    ctx2d.strokeStyle = wg;
    ctx2d.lineWidth = 1.5;
    for (let x = 0; x <= W; x++) {
      const p  = x / W;
      const yn = (Math.sin(p * Math.PI * 6 + ts) * 0.4 + Math.sin(p * Math.PI * 2.3 + ts * 1.6) * 0.3 + Math.sin(p * Math.PI * 11 + ts * 0.5) * 0.08) * wH;
      x === 0 ? ctx2d.moveTo(x, wY + yn) : ctx2d.lineTo(x, wY + yn);
    }
    ctx2d.stroke();

    // Overlay info text
    ctx2d.save();
    ctx2d.font = '500 10px "JetBrains Mono", monospace';
    ctx2d.letterSpacing = '0.1em';

    // Frequency band zone labels in upper area
    const zones = [
      { label: 'SUB', x: W * 0.03 },
      { label: 'BASS', x: W * 0.10 },
      { label: 'LOW MID', x: W * 0.22 },
      { label: 'MID', x: W * 0.40 },
      { label: 'HI MID', x: W * 0.62 },
      { label: 'TREBLE', x: W * 0.82 },
    ];
    zones.forEach(({ label, x }) => {
      ctx2d.fillStyle = 'rgba(255,180,80,0.3)';
      ctx2d.fillText(label, x, H * 0.10);
    });

    // Vertical zone dividers
    [0.085, 0.19, 0.36, 0.56, 0.76].forEach(pct => {
      ctx2d.strokeStyle = 'rgba(255,148,38,0.08)';
      ctx2d.lineWidth = 0.5;
      ctx2d.setLineDash([3, 6]);
      ctx2d.beginPath();
      ctx2d.moveTo(W * pct, H * 0.06);
      ctx2d.lineTo(W * pct, H * 0.95);
      ctx2d.stroke();
    });
    ctx2d.setLineDash([]);

    // dB scale labels on right side
    ctx2d.textAlign = 'right';
    ['0 dB', '-12', '-24', '-36'].forEach((label, i) => {
      const y = centerY * (0.05 + i * 0.32);
      ctx2d.fillStyle = 'rgba(255,180,80,0.22)';
      ctx2d.fillText(label, W - 6, y + 3);
      ctx2d.strokeStyle = 'rgba(255,148,38,0.06)';
      ctx2d.lineWidth = 0.5;
      ctx2d.setLineDash([2, 8]);
      ctx2d.beginPath();
      ctx2d.moveTo(0, y); ctx2d.lineTo(W - 30, y);
      ctx2d.stroke();
      ctx2d.setLineDash([]);
    });
    ctx2d.restore();

    // Scanlines
    for (let y = 0; y < H; y += 3) {
      ctx2d.fillStyle = 'rgba(0,0,0,0.03)';
      ctx2d.fillRect(0, y, W, 1);
    }

    idleRafId = requestAnimationFrame(drawIdleFrame);
  }

  // ── Particle system ──
  const particles = [];
  function addParticles(energy, W, H) {
    const n = Math.floor(energy * 10);
    for (let i = 0; i < n; i++) {
      particles.push({
        x: W * (0.1 + Math.random() * 0.8),
        y: H * 0.72,
        vx: (Math.random() - 0.5) * 1.5,
        vy: -(2 + Math.random() * 4) * energy,
        life: 1,
        decay: 0.014 + Math.random() * 0.018,
        r: 1.5 + Math.random() * 3,
      });
    }
  }

  function updateParticles(W) {
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.x += p.vx; p.y += p.vy;
      p.vy *= 0.97; p.vx *= 0.98;
      p.life -= p.decay;
      if (p.life <= 0 || p.y < 0) { particles.splice(i, 1); continue; }
      ctx2d.globalAlpha = p.life * 0.85;
      ctx2d.fillStyle = fireColor(1 - p.life * 0.4);
      ctx2d.beginPath();
      ctx2d.arc(p.x, p.y, p.r * p.life, 0, Math.PI * 2);
      ctx2d.fill();
    }
    ctx2d.globalAlpha = 1;
  }

  // ── Live frame (playing) ──
  function drawLiveFrame() {
    rafId = requestAnimationFrame(drawLiveFrame);
    t += 0.008;
    syncCanvasSize();

    const W = canvas.width, H = canvas.height;
    const FFT = analyser.frequencyBinCount;
    const freq = new Uint8Array(FFT);
    const wave = new Uint8Array(FFT);
    analyser.getByteFrequencyData(freq);
    analyser.getByteTimeDomainData(wave);

    const bass    = freq.slice(0, FFT >> 3).reduce((a, b) => a + b, 0) / (FFT >> 3) / 255;
    const mid     = freq.slice(FFT >> 3, FFT >> 1).reduce((a, b) => a + b, 0) / (FFT * 3 / 8) / 255;
    const treble  = freq.slice(FFT >> 1, (FFT * 3) >> 2).reduce((a, b) => a + b, 0) / (FFT >> 2) / 255;
    const overall = bass * 0.6 + mid * 0.3 + treble * 0.1;

    // Phosphor trail
    ctx2d.fillStyle = `rgba(6,6,16,${0.22 + bass * 0.22})`;
    ctx2d.fillRect(0, 0, W, H);

    // Ember bg glow
    const bgG = ctx2d.createRadialGradient(W / 2, H, H * 0.05, W / 2, H, H);
    bgG.addColorStop(0, `rgba(${Math.round(110 + bass * 90)},${Math.round(25 + bass * 20)},0,${0.45 + bass * 0.4})`);
    bgG.addColorStop(0.6, 'rgba(30,6,0,0.25)');
    bgG.addColorStop(1, 'rgba(6,6,16,0)');
    ctx2d.fillStyle = bgG;
    ctx2d.fillRect(0, 0, W, H);

    // Mirrored bars
    const BARS = Math.min(128, FFT);
    const centerY = H * 0.72;
    const step = W / BARS;
    for (let i = 0; i < BARS; i++) {
      const raw  = freq[Math.floor(i * FFT / BARS)] / 255;
      const hUp  = raw * centerY * 0.95;
      const x    = i * step;
      const barW = step - 1;
      const g = ctx2d.createLinearGradient(x, centerY - hUp, x, centerY);
      g.addColorStop(0, fireColor(Math.min(1, raw + 0.18)));
      g.addColorStop(0.5, fireColor(raw * 0.7));
      g.addColorStop(1, 'rgba(60,8,0,0.25)');
      ctx2d.fillStyle = g;
      ctx2d.beginPath();
      if (ctx2d.roundRect) ctx2d.roundRect(x, centerY - hUp, barW, hUp, [2, 2, 0, 0]);
      else ctx2d.rect(x, centerY - hUp, barW, hUp);
      ctx2d.fill();
      // Reflection
      if (hUp > 2) {
        const rg = ctx2d.createLinearGradient(x, centerY, x, centerY + hUp * 0.3);
        rg.addColorStop(0, `rgba(160,35,0,${raw * 0.35})`);
        rg.addColorStop(1, 'rgba(0,0,0,0)');
        ctx2d.fillStyle = rg;
        ctx2d.fillRect(x, centerY, barW, hUp * 0.3);
      }
      if (raw > 0.55) {
        ctx2d.fillStyle = '#fff0a0';
        ctx2d.globalAlpha = (raw - 0.55) * 1.4;
        ctx2d.fillRect(x, centerY - hUp - 2, barW, 2);
        ctx2d.globalAlpha = 1;
      }
    }

    // Waveform
    ctx2d.beginPath();
    ctx2d.lineWidth = 1.5 + overall * 2;
    const wg = ctx2d.createLinearGradient(0, 0, W, 0);
    wg.addColorStop(0,   'rgba(255,180,50,0)');
    wg.addColorStop(0.1, `rgba(255,200,80,${0.5 + overall * 0.4})`);
    wg.addColorStop(0.5, `rgba(255,240,160,${0.65 + overall * 0.3})`);
    wg.addColorStop(0.9, `rgba(255,200,80,${0.5 + overall * 0.4})`);
    wg.addColorStop(1,   'rgba(255,180,50,0)');
    ctx2d.strokeStyle = wg;
    const waveH = H * 0.16, waveY = H * 0.2;
    for (let i = 0; i < FFT; i++) {
      const x = (i / FFT) * W;
      const y = waveY + ((wave[i] - 128) / 128) * waveH;
      i === 0 ? ctx2d.moveTo(x, y) : ctx2d.lineTo(x, y);
    }
    ctx2d.stroke();

    // Bass pulse ring
    if (bass > 0.4) {
      const ring = ctx2d.createRadialGradient(W / 2, centerY, 10 + bass * 50, W / 2, centerY, 20 + bass * 100);
      ring.addColorStop(0, `rgba(255,100,0,${(bass - 0.4) * 1.2})`);
      ring.addColorStop(1, 'rgba(255,60,0,0)');
      ctx2d.fillStyle = ring;
      ctx2d.beginPath();
      ctx2d.arc(W / 2, centerY, 20 + bass * 100, 0, Math.PI * 2);
      ctx2d.fill();
    }

    // Scanlines
    for (let y = 0; y < H; y += 3) {
      ctx2d.fillStyle = 'rgba(0,0,0,0.03)';
      ctx2d.fillRect(0, y, W, 1);
    }

    // Particles
    if (overall > 0.28 && Math.random() < 0.5) addParticles(overall, W, H);
    updateParticles(W);

    // VU meters
    if (vuL) vuL.style.width = `${Math.min(100, bass * 160 + mid * 40)}%`;
    if (vuR) vuR.style.width = `${Math.min(100, bass * 150 + mid * 50 + Math.random() * 5)}%`;

    // Section beat
    if (section) section.dataset.beat = bass > 0.5 ? '1' : '0';

    // Progress
    if (audio && audio.duration && Math.random() < 0.12) {
      const pct = (audio.currentTime / audio.duration) * 100;
      if (fillEl) fillEl.style.width = `${pct}%`;
      if (glowEl) glowEl.style.width = `${pct}%`;
      if (progOuter) progOuter.setAttribute('aria-valuenow', Math.round(pct));
      if (timeEl) timeEl.textContent = formatTime(audio.currentTime);
    }
  }

  async function setupAudio() {
    if (audioCtx) return;
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    analyser  = audioCtx.createAnalyser();
    analyser.fftSize = 2048;
    analyser.smoothingTimeConstant = 0.88;
    analyser.minDecibels = -90;
    analyser.maxDecibels = -10;

    audio = new Audio();
    audio.preload = 'none';
    audio.crossOrigin = 'anonymous';
    audio.loop = true;
    audio.src = '/hobbit-kettle-fire.mp3';
    source = audioCtx.createMediaElementSource(audio);
    source.connect(analyser);
    analyser.connect(audioCtx.destination);
  }

  async function play() {
    cancelAnimationFrame(idleRafId);
    idleRafId = null;
    ctx2d.clearRect(0, 0, canvas.width, canvas.height);

    await setupAudio();
    if (audioCtx.state === 'suspended') await audioCtx.resume();
    audio.play();
    isPlaying = true;
    playBtn.setAttribute('aria-pressed', 'true');
    playBtn.querySelector('.hobbit-play-icon svg').innerHTML = '<path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/>';
    if (badge) badge.classList.add('is-live');
    if (badgeText) badgeText.textContent = 'LIVE';
    if (!rafId) drawLiveFrame();
  }

  function pause() {
    if (audio) audio.pause();
    isPlaying = false;
    cancelAnimationFrame(rafId);
    rafId = null;
    playBtn.setAttribute('aria-pressed', 'false');
    playBtn.querySelector('.hobbit-play-icon svg').innerHTML = '<path d="M8 5v14l11-7z"/>';
    if (badge) badge.classList.remove('is-live');
    if (badgeText) badgeText.textContent = 'PAUSED';
    if (section) section.dataset.beat = '0';
    if (vuL) vuL.style.width = '0%';
    if (vuR) vuR.style.width = '0%';
    ctx2d.clearRect(0, 0, canvas.width, canvas.height);
    idleRafId = requestAnimationFrame(drawIdleFrame);
  }

  playBtn.addEventListener('click', () => {
    if (isPlaying) pause(); else play();
  });

  if (progOuter) {
    progOuter.addEventListener('click', (e) => {
      if (!audio || !audio.duration) return;
      const rect = progOuter.getBoundingClientRect();
      audio.currentTime = ((e.clientX - rect.left) / rect.width) * audio.duration;
    });
  }

  // Start idle visualization immediately on init
  syncCanvasSize();
  idleRafId = requestAnimationFrame(drawIdleFrame);
}
