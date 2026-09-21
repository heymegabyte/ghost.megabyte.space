(function() {
  const MIN_SIGNIFICANT_LENGTH = 20;
  let allEntries = [];
  let currentFilter = "all";

  function setText(id, value) {
    const el = document.getElementById(id);
    if (el) el.textContent = String(value);
  }

  function setLive(status) {
    const indicator = document.getElementById("tx-live-indicator");
    const statusEl = document.getElementById("feed-status");
    if (statusEl) statusEl.textContent = status;
    if (indicator) indicator.classList.toggle("is-offline", status !== "LIVE");
    const since = document.getElementById("tx-last-update");
    if (since && status === "LIVE") {
      const now = new Date();
      since.textContent = " · " + now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
    }
  }

  async function loadTransmissions() {
    try {
      const [liveRes, countRes] = await Promise.all([
        fetch("/api/v1/transmissions/live?limit=50"),
        fetch("/api/v1/transmission-count")
      ]);
      const live = await liveRes.json();
      const count = await countRes.json();

      allEntries = live.entries || [];

      const calls = allEntries.filter(e => e.type === "call");
      const chats = allEntries.filter(e => e.type === "chat");
      setText("tx-total-calls", count.calls ?? calls.length);
      setText("tx-total-chats", count.chats ?? chats.length);
      setText("tx-total", count.count ?? allEntries.length);
      setText("feed-total", live.total ?? allEntries.length);

      buildSynopsis(allEntries);
      renderEntries();
      setLive("LIVE");
    } catch(e) {
      const list = document.getElementById("tx-list");
      const topics = document.getElementById("tx-topics");
      if (list) list.innerHTML =
        '<div class="tx-empty">No transmissions yet. Call <a href="tel:+16016666602" style="color:var(--accent-red);text-decoration:none">(601) 666-6602</a> to be first.</div>';
      if (topics) topics.innerHTML =
        "<li>No significant transmissions yet. Be the first to call.</li>";
      setLive("OFFLINE");
    }
  }

  function isSignificant(entry) {
    if (entry.type === "call") {
      return (entry.transcript || "").length >= MIN_SIGNIFICANT_LENGTH;
    }
    return (entry.content || "").length >= MIN_SIGNIFICANT_LENGTH && entry.role === "user";
  }

  function buildSynopsis(entries) {
    const topics = new Map();
    for (const e of entries) {
      const text = (e.transcript || e.content || "").toLowerCase();
      if (text.length < MIN_SIGNIFICANT_LENGTH) continue;

      const keywords = [
        ["federal reserve", "Federal Reserve / monetary policy"],
        ["president", "Politics / governance"],
        ["entropy", "Entropy / randomness / physics"],
        ["ghost", "Paranormal / ghost encounters"],
        ["alien", "Aliens / extraterrestrial contact"],
        ["time travel", "Time travel / temporal anomalies"],
        ["666", "666 / spiritual warfare"],
        ["emf", "EMF readings / electromagnetic fields"],
        ["ubi", "Universal Basic Income"],
        ["ai", "AI / artificial intelligence"],
        ["exorcis", "Exorcism / spiritual intervention"],
        ["dream", "Dreams / visions"],
        ["gangstal", "Gangstalking / surveillance"],
      ];

      for (const [kw, label] of keywords) {
        if (text.includes(kw)) {
          topics.set(label, (topics.get(label) || 0) + 1);
        }
      }
    }

    const sorted = [...topics.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8);

    const ul = document.getElementById("tx-topics");
    if (sorted.length === 0) {
      ul.innerHTML = "<li>No significant transmissions yet. Call (601) 666-6602.</li>";
      return;
    }
    ul.innerHTML = sorted.map(([label, count]) =>
      '<li>' + label + ' <span style="color:var(--text-muted);font-size:0.75rem">(' + count + ' mentions)</span></li>'
    ).join("");
  }

  function groupEntries(entries) {
    const groups = new Map();
    for (const e of entries) {
      const key = e.type === "call" ? "call:" + e.callSid : "chat:" + e.sessionId;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(e);
    }
    return [...groups.entries()].map(([key, items]) => {
      items.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
      const type = key.startsWith("call:") ? "call" : "chat";
      const id = key.split(":")[1];
      const preview = type === "call"
        ? items.map(i => i.transcript).filter(Boolean).join(" ")
        : items.filter(i => i.role === "user").map(i => i.content).join(" ");
      const significant = preview.length >= MIN_SIGNIFICANT_LENGTH;
      return { key, type, id, items, preview, significant, createdAt: items[0].createdAt };
    }).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  function renderEntries() {
    const container = document.getElementById("tx-list");
    const filtered = currentFilter === "all" ? allEntries
      : currentFilter === "call" ? allEntries.filter(e => e.type === "call")
      : currentFilter === "chat" ? allEntries.filter(e => e.type === "chat")
      : currentFilter === "significant" ? allEntries.filter(isSignificant)
      : allEntries;

    const groups = groupEntries(filtered);

    if (groups.length === 0) {
      const msg = allEntries.length === 0
        ? 'No transmissions yet. Call <a href="tel:+16016666602" style="color:var(--accent-red);text-decoration:none">(601) 666-6602</a> or use the chat to be first on the public record.'
        : 'No transmissions match this filter.';
      container.innerHTML = '<div class="tx-empty">' + msg + '</div>';
      return;
    }

    container.innerHTML = groups.map(g => {
      const timeStr = new Date(g.createdAt).toLocaleString();
      const cls = g.significant ? "" : " tx-insignificant";
      const typeLabel = g.type === "call" ? "HOTLINE CALL" : "AI CHAT";
      const typeCls = g.type;

      let turnsHtml = "";
      if (g.type === "call") {
        turnsHtml = g.items.map(i =>
          '<div class="tx-turn">' +
          '<div class="tx-turn-label caller">CALLER</div>' +
          '<div>' + esc(i.transcript || "") + '</div>' +
          '<div class="tx-turn-label signal">SIGNAL</div>' +
          '<div>' + esc(i.aiResponse || "") + '</div>' +
          '</div>'
        ).join("");
      } else {
        turnsHtml = g.items.map(i =>
          '<div class="tx-turn">' +
          '<div class="tx-turn-label ' + (i.role === "user" ? "caller" : "signal") + '">' +
          (i.role === "user" ? "HUMAN" : "SIGNAL") + '</div>' +
          '<div>' + esc(i.content || "") + '</div>' +
          '</div>'
        ).join("");
      }

      return '<div class="tx-card' + cls + '" data-expandable>' +
        '<div class="tx-card-header">' +
        '<span class="tx-card-type ' + typeCls + '">' + typeLabel + '</span>' +
        '<span class="tx-card-time">' + timeStr + '</span>' +
        '</div>' +
        '<div class="tx-card-preview">' + esc(g.preview || "No content") + '</div>' +
        '<div class="tx-card-turns">' + turnsHtml + '</div>' +
        '</div>';
    }).join("");
  }

  function esc(s) {
    const d = document.createElement("div");
    d.textContent = s;
    return d.innerHTML;
  }

  const txListEl = document.getElementById("tx-list");
  if (txListEl) txListEl.addEventListener("click", function(e) {
    const card = e.target.closest(".tx-card");
    if (card) card.classList.toggle("expanded");
  });

  const txFiltersEl = document.getElementById("tx-filters");
  if (txFiltersEl) txFiltersEl.addEventListener("click", function(e) {
    const btn = e.target.closest(".tx-filter-btn");
    if (!btn) return;
    const filter = btn.dataset.filter;

    if (filter === "show-all") {
      this.classList.toggle("show-all");
      btn.classList.toggle("active");
      renderEntries();
      return;
    }

    currentFilter = filter;
    this.querySelectorAll(".tx-filter-btn:not([data-filter='show-all'])").forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    renderEntries();
  });

  loadTransmissions();
  setInterval(loadTransmissions, 10000);
})();
