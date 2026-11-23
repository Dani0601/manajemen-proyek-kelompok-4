(function () {
  "use strict";

  const section = document.querySelector('[data-dash-section="trend"]');
  if (!section) return;

  const box = section.querySelector("[data-dash-panel]");
  const slot = box ? box.querySelector(".dash-state-slot") : null;

  const TOP_N = 5;
  const MIN_PICKS_FOR_WR = 5; // hero dengan pick lebih sedikit tidak masuk daftar WR

  // id = suffix elemen #trend-<id>, key = field pengurut dan nilai
  const GROUPS = [
    { id: "wr", key: "win_rate",  minPicks: MIN_PICKS_FOR_WR },
    { id: "br", key: "ban_rate",  minPicks: 0 },
    { id: "pr", key: "pick_rate", minPicks: 0 },
  ];

  const esc = (v) => String(v ?? "").replace(/[&<>"']/g, (c) => (
    { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]
  ));

  const num = (v) => (v === null || v === undefined || v === "" || Number.isNaN(Number(v)) ? null : Number(v));

  // ---------- Normalisasi ----------
  function normalize(payload) {
    const list = Array.isArray(payload?.heroes) ? payload.heroes : [];
    const heroes = list.map((h) => ({
      id: h.hero_id,
      name: h.hero_name || "",
      icon: h.hero_icon_url || "",
      picked: num(h.total_picked) ?? 0,
      pickRate: num(h.pick_rate),
      winRate: num(h.win_rate),
      banRate: num(h.ban_rate),
    }));
    return {
      seasonId: payload?.season_id ?? null,
      totalGames: num(payload?.total_games) ?? 0,
      available: payload?.has_trend_data === true && heroes.length > 0,
      heroes,
    };
  }

  const FIELD = { win_rate: "winRate", ban_rate: "banRate", pick_rate: "pickRate" };

  function topBy(heroes, group) {
    const f = FIELD[group.key];
    return heroes
      .filter((h) => h[f] !== null && h.picked >= group.minPicks)
      .sort((a, b) => b[f] - a[f] || b.picked - a.picked)
      .slice(0, TOP_N)
      .map((h) => ({ hero: h, value: h[f] }));
  }

  // ---------- Render ----------
  function row(rank, item, max) {
    const { hero, value } = item;
    const width = max > 0 ? Math.min(100, (value / max) * 100) : 0;
    return `
      <li class="dash-trend__row">
        <span class="dash-trend__rank">${rank}</span>
        <span class="dash-trend__media">
          <img class="dash-trend__icon" src="${esc(hero.icon)}" alt="" loading="lazy"
               onerror="this.onerror=null;this.style.visibility='hidden'">
        </span>
        <span class="dash-trend__name" title="${esc(hero.name)}">${esc(hero.name)}</span>
        <span class="dash-trend__bar"><span class="dash-trend__fill" style="width:${width.toFixed(1)}%"></span></span>
        <span class="dash-trend__value">${value.toFixed(1)}%</span>
      </li>`;
  }

  function renderGroup(id, items) {
    const list = document.getElementById("trend-" + id);
    if (!list) return;
    const max = Math.max(...items.map((i) => i.value), 0);
    list.innerHTML = items.map((it, i) => row(i + 1, it, max)).join("");
  }

  function render(data) {
    GROUPS.forEach((g) => renderGroup(g.id, topBy(data.heroes, g)));
  }

  // ---------- State ----------
  function skelRow() {
    return `
      <div class="dash-trend-skel__row">
        <span class="dash-skeleton dash-skeleton--dot"></span>
        <span class="dash-skeleton dash-trend-skel__thumb"></span>
        <span class="dash-skeleton dash-skeleton--line"></span>
        <span class="dash-skeleton dash-skeleton--line"></span>
        <span class="dash-skeleton dash-skeleton--line"></span>
      </div>`;
  }

  function skelGroup() {
    return `
      <div class="dash-trend-skel__group">
        <span class="dash-skeleton dash-skeleton--line dash-trend-skel__title"></span>
        ${skelRow().repeat(5)}
      </div>`;
  }

  function setState(name) {
    if (!box || !slot) return;
    box.classList.toggle("is-stated", name !== "ready");
    section.dataset.state = name;
    slot.hidden = name === "ready";

    if (name === "loading") {
      slot.innerHTML = `<div class="dash-trend-skel" role="status" aria-label="Memuat Hero Tren">${skelGroup().repeat(3)}</div>`;
    } else if (name === "empty") {
      slot.innerHTML = `
        <div class="dash-trend-empty" role="status">
          <span class="dash-trend-empty__icon" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.6" stroke-linecap="round">
              <path d="M7 18v-6M12 18V7M17 18v-9"/>
            </svg>
          </span>
          <strong class="dash-trend-empty__title">Data tren belum tersedia</strong>
          <span class="dash-trend-empty__text">Hero tren pada pertandingan ini belum tersedia</span>
        </div>`;
    } else if (name === "error") {
      slot.innerHTML = `
        <div class="dash-trend-empty" role="alert">
          <strong class="dash-trend-empty__title">Gagal memuat Hero Tren</strong>
          <span class="dash-trend-empty__text">Periksa koneksi internet Anda lalu coba lagi.</span>
          <button type="button" class="dash-empty__button" data-trend-retry>Coba Lagi</button>
        </div>`;
    } else {
      slot.innerHTML = "";
    }
  }

  // ---------- Muat data ----------
  async function load() {
    setState("loading");
    try {
      const data = normalize(await window.ApiClient.getMetaTrends());
      if (!data.available) {
        setState("empty"); // belum ada data: pesan, bukan error
        return;
      }
      setState("ready");
      render(data);
    } catch (err) {
      console.error("[HeroTrend]", err);
      setState("error");
    }
  }

  section.addEventListener("click", (e) => {
    if (e.target.closest("[data-trend-retry]")) load();
  });

  window.HeroTrend = { load, setState, normalize, topBy };

  if (!window.ApiClient || typeof window.ApiClient.getMetaTrends !== "function") {
    console.error("[HeroTrend] ApiClient.getMetaTrends belum tersedia. Periksa api-client.js.");
    setState("error");
    return;
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", load);
  } else {
    load();
  }
})();