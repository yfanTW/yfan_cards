// Shared helpers: data loading, teams, favourites (localStorage).
const DATA_BASE = "../data/";

async function loadJSON(path) {
  const r = await fetch(DATA_BASE + path, { cache: "no-cache" });
  if (!r.ok) throw new Error(path + " → HTTP " + r.status);
  return r.json();
}

function esc(s) {
  return String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

// Same rule as admin/cardlib.py player_key()
function playerKey(name) {
  return String(name).normalize("NFKD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/\s+/g, " ").trim();
}
function splitMulti(s) { return String(s).split(" / ").map(x => x.trim()).filter(Boolean); }

// ── Teams ──
let TEAMS = { teams: {}, legacy: {} };
async function loadTeams() { try { TEAMS = await loadJSON("teams.json"); } catch (e) { console.warn(e); } }
function franchise(t) { return TEAMS.legacy[t] || t; }
function teamInfo(t) {
  const info = TEAMS.teams[t] || TEAMS.teams[franchise(t)];
  return info || { abbr: t.replace(/[^A-Za-z]/g, "").slice(0, 3).toUpperCase(), color: "#6366f1" };
}

// ── Favourites ──
// Stored as { v:1, cards: { "<slug>/<id>": {p, n, s, t, at} }, players: { "<key>": {name, at} } }
// Card entries carry a small snapshot so the favourites page works even if a product fails to load.
const FAV_KEY = "cardchecklist.favs.v1";
const Fav = {
  data: { v: 1, cards: {}, players: {} },
  load() {
    try {
      const d = JSON.parse(localStorage.getItem(FAV_KEY) || "null");
      if (d && d.cards && d.players) this.data = d;
    } catch (e) { /* private mode etc. */ }
  },
  save() {
    try { localStorage.setItem(FAV_KEY, JSON.stringify(this.data)); }
    catch (e) { toast("無法儲存最愛（瀏覽器封鎖了儲存空間）"); }
  },
  cardKey(slug, card) { return slug + "/" + card.id; },
  hasCard(slug, card) { return !!this.data.cards[this.cardKey(slug, card)]; },
  toggleCard(slug, card) {
    const k = this.cardKey(slug, card);
    if (this.data.cards[k]) delete this.data.cards[k];
    else this.data.cards[k] = { p: card.player, n: card.no, s: card.set, t: card.team, at: Date.now() };
    this.save(); return !!this.data.cards[k];
  },
  hasPlayer(name) { return !!this.data.players[playerKey(name)]; },
  anyPlayer(name) { return splitMulti(name).some(n => this.hasPlayer(n)); },
  togglePlayer(name) {
    const k = playerKey(name);
    if (this.data.players[k]) delete this.data.players[k];
    else this.data.players[k] = { name, at: Date.now() };
    this.save(); return !!this.data.players[k];
  },
  // Export/import as a compact base64 string so it can be pasted on another device.
  exportCode() { return btoa(unescape(encodeURIComponent(JSON.stringify(this.data)))); },
  importCode(code, merge = true) {
    const d = JSON.parse(decodeURIComponent(escape(atob(code.trim()))));
    if (!d || typeof d.cards !== "object" || typeof d.players !== "object") throw new Error("格式不正確");
    if (merge) {
      Object.assign(this.data.cards, d.cards);
      Object.assign(this.data.players, d.players);
    } else this.data = { v: 1, cards: d.cards, players: d.players };
    this.save();
  },
};
Fav.load();
// Keep multiple open tabs in sync.
window.addEventListener("storage", e => { if (e.key === FAV_KEY) { Fav.load(); window.onFavsChanged && window.onFavsChanged(); } });

function toast(msg) {
  let el = document.getElementById("toast");
  if (!el) { el = document.createElement("div"); el.id = "toast"; el.className = "toast"; document.body.appendChild(el); }
  el.textContent = msg; el.classList.add("show");
  clearTimeout(toast._t); toast._t = setTimeout(() => el.classList.remove("show"), 1600);
}

// Natural sort for card numbers: "2" < "10", "BCP-2" < "BCP-10"
const collator = new Intl.Collator(undefined, { numeric: true, sensitivity: "base" });

// One card row. data-k is used by click delegation: "<slug>|<index>"
function cardRow(slug, card, idx) {
  const teams = splitMulti(card.team);
  const t0 = teamInfo(teams[0] || "");
  const players = splitMulti(card.player);
  const favP = Fav.anyPlayer(card.player);
  const tags = (card.tags || []).map(t => `<span class="badge tag">${esc(t)}</span>`).join("");
  const stars = players.map(p =>
    `<button class="icon star ${Fav.hasPlayer(p) ? "on" : ""}" data-act="player" data-name="${esc(p)}" title="最愛球員：${esc(p)}" aria-label="最愛球員 ${esc(p)}">${Fav.hasPlayer(p) ? "★" : "☆"}</button>`).join("");
  return `<div class="card ${favP ? "favplayer" : ""} ${card.pulled ? "is-pulled" : ""}" style="--team:${esc(t0.color)}">
    <div class="no">#${esc(card.no)}</div>
    <div class="who">
      <div class="player">${esc(card.player)} ${card.rc ? '<span class="badge rc">RC</span>' : ""}${card.first ? '<span class="badge first">1st</span>' : ""}${card.pulled ? '<span class="badge pulled">已抽出</span>' : ""}${tags}</div>
      <div class="meta">${esc(card.set)}${card.note ? " · " + esc(card.note) : ""}</div>
    </div>
    <div class="team">${teams.map(t => `<span class="abbr" style="background:${esc(teamInfo(t).color)}">${esc(teamInfo(t).abbr)}</span>`).join("")}<span class="full">${esc(card.team)}</span></div>
    <div class="icons">${stars}<button class="icon heart ${Fav.hasCard(slug, card) ? "on" : ""}" data-act="card" data-k="${esc(slug)}|${idx}" title="最愛卡片" aria-label="最愛卡片">${Fav.hasCard(slug, card) ? "♥" : "♡"}</button></div>
  </div>`;
}

// In-page confirmation dialog (works everywhere, unlike window.confirm in some embedded browsers).
// confirmDialog("訊息", { ok: "移除", danger: true }) -> Promise<boolean>
function confirmDialog(message, opt = {}) {
  let d = document.getElementById("confirm-dlg");
  if (!d) {
    d = document.createElement("dialog");
    d.id = "confirm-dlg"; d.className = "confirm";
    d.innerHTML = `<p class="msg"></p><div class="actions"><button class="btn" data-r="0">取消</button><button class="btn ok" data-r="1">確定</button></div>`;
    document.body.appendChild(d);
  }
  d.querySelector(".msg").textContent = message;
  const ok = d.querySelector(".ok");
  ok.textContent = opt.ok || "確定";
  ok.classList.toggle("danger", !!opt.danger);
  return new Promise(resolve => {
    let done = false;
    const finish = v => { if (done) return; done = true; d.close(); resolve(v); };
    d.onclick = e => {
      const b = e.target.closest("[data-r]");
      if (b) finish(b.dataset.r === "1");
      else if (e.target === d) finish(false);          // click on the backdrop
    };
    d.onclose = () => finish(false);                     // Esc
    d.showModal(); ok.focus();
  });
}
