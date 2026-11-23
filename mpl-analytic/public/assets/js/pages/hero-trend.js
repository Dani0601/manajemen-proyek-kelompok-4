(function () {
  "use strict";

  const panel = document.querySelector('[data-dash-section="trend"]');
  if (!panel) return;

  // SEMENTARA: ganti dengan data dari service API saat endpoint siap
  const ICON = "";
  const MOCK = {
    wr: [["Lunox", 67.7], ["Tigreal", 62.1], ["Lolita", 58.3], ["Aamon", 54.7], ["Lancelot", 50.2]],
    br: [["Lancelot", 88.7], ["Fanny", 79.1], ["Hylos", 74.4], ["Barats", 21.4], ["Valir", 20.7]],
    pr: [["Lancelot", 56.1], ["Fanny", 51.4], ["Hylos", 48.3], ["Barats", 44.9], ["Valir", 41.7]],
  };

  const esc = (v) => String(v ?? "").replace(/[&<>"']/g, (c) => (
    { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]
  ));

  function row(rank, name, value, max) {
    const width = max > 0 ? Math.min(100, (value / max) * 100) : 0;
    return `
      <li class="dash-trend__row">
        <span class="dash-trend__rank">${rank}</span>
        <img class="dash-trend__icon" src="${esc(ICON)}" alt="" loading="lazy"
             onerror="this.onerror=null;this.style.visibility='hidden'">
        <span class="dash-trend__name" title="${esc(name)}">${esc(name)}</span>
        <span class="dash-trend__bar"><span class="dash-trend__fill" style="width:${width.toFixed(1)}%"></span></span>
        <span class="dash-trend__value">${value.toFixed(1)}%</span>
      </li>`;
  }

  function renderGroup(id, items) {
    const list = document.getElementById("trend-" + id);
    if (!list) return;
    const max = Math.max(...items.map((i) => i[1]), 0);
    list.innerHTML = items.map(([n, v], i) => row(i + 1, n, v, max)).join("");
  }

  const box = panel.querySelector("[data-dash-panel]");
  const slot = box ? box.querySelector(".dash-state-slot") : null;

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
    panel.dataset.state = name;
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
    } else {
      slot.innerHTML = "";
    }
  }


  Object.entries(MOCK).forEach(([id, items]) => renderGroup(id, items));
  window.HeroTrend = { renderGroup, setState };
})();