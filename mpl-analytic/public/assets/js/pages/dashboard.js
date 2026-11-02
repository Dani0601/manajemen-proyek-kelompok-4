"use strict";

/**
 * Dashboard Analitik (Figma: Dashboard-state loading, Dashboard-data, Dashboard-Eror).
 *
 * Alur:
 *  1. loading  -> skeleton satu halaman + "Memuat Dashboard"
 *  2. sukses   -> Top 5 WR/BR/PR, grafik WR vs BR, jadwal
 *                 (section tanpa data => "Data belum tersedia")
 *  3. galat    -> satu panel "Gagal memuat data" + tombol "Coba Lagi"
 */

document.addEventListener("DOMContentLoaded", loadDashboard);

// ==================================================
// KONFIGURASI
// ==================================================

const ASSET_BASE =
  (window.APP_CONFIG && window.APP_CONFIG.assetBase)
    ? window.APP_CONFIG.assetBase
    : "/assets";

const HERO_DETAIL_URL =
  ASSET_BASE.replace(/\/assets\/?$/, "") + "/hero-detail";

const MAX_HEROES = 5;
const MAX_MATCHES = 3;

// Logo lokal (public/assets/images/teams) diutamakan, URL jarak jauh sebagai cadangan.
const TEAM_LOGOS_LOCAL = {
  "ONIC": "onic.png",
  "RRQ Hoshi": "rrq.png",
  "EVOS": "evos.png",
  "Bigetron by Vitality": "bigetron.png",
  "Geek Fam ID": "geek-fam.png",
  "Aura Fire": "aura-fire.png"
};

const REMOTE = "https://wsrv.nl/?url=https://ik.imagekit.io/nloe8dhf7w/mplid/s14/teams/";

const TEAM_LOGOS_REMOTE = {
  "ONIC": REMOTE + "onic-b-256.png",
  "Dewa United Esports": REMOTE + "dewa-united-500.png",
  "RRQ Hoshi": REMOTE + "rrq-500.png",
  "Alter Ego": REMOTE + "ae-256.png",
  "EVOS": REMOTE + "evos-500.png",
  "Bigetron by Vitality": REMOTE + "btr_vit.png",
  "Team Liquid ID": REMOTE + "TLID-Primary500x500.png",
  "Geek Fam ID": REMOTE + "geek-500.png",
  "Natus Vincere": REMOTE + "NAVI-2.png"
};

const STATE_COPY = {
  empty: {
    title: "Data belum tersedia",
    text: "Saat ini belum ada data untuk ditampilkan. Silahkan coba lagi nanti atau jelajahi fitur lainnya."
  },
  error: {
    title: "Gagal memuat data",
    text: "Terjadi kesalahan saat mengambil data. Periksa koneksi internet Anda dan coba lagi."
  }
};

const DASH_SECTIONS = ["wr", "br", "pr", "chart", "schedule"];

// Token permintaan: hanya pemuatan terbaru yang boleh menggambar ke layar.
let loadToken = 0;

// ==================================================
// UTILITAS
// ==================================================

function escapeHTML(value) {
  return String(value ?? "").replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[char]);
}

function toRate(value) {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const number = Number(value);

  return Number.isFinite(number) ? number : null;
}

// Desain: "WR 62.4%" (satu desimal).
function formatPercent(value) {
  const number = toRate(value);

  return number === null ? "-" : `${number.toFixed(1)}%`;
}

function getInitials(name) {
  const words = String(name ?? "").trim().split(/\s+/).filter(Boolean);

  if (words.length === 0) {
    return "?";
  }

  return (
    words.length > 1
      ? words[0][0] + words[1][0]
      : words[0].slice(0, 2)
  ).toUpperCase();
}

// Hanya hero dengan nilai angka valid yang dianggap sebagai data.
function withValidRate(list, key) {
  return (Array.isArray(list) ? list : []).filter(
    (item) => toRate(item?.[key]) !== null
  );
}

function sortedTop(list, key) {
  return withValidRate(list, key)
    .slice()
    .sort((a, b) => toRate(b[key]) - toRate(a[key]))
    .slice(0, MAX_HEROES);
}

function getRoot() {
  return document.getElementById("dashboard");
}

// ==================================================
// GAMBAR CADANGAN
// Urutan: URL utama -> data-fallback-src (sekali) -> avatar inisial.
// error tidak bubble, jadi didengarkan pada fase capture.
// ==================================================

document.addEventListener(
  "error",
  (event) => {
    const img = event.target;

    if (!(img instanceof HTMLImageElement) || !img.dataset.initials) {
      return;
    }

    const next = img.dataset.fallbackSrc;

    if (next && img.getAttribute("src") !== next) {
      img.removeAttribute("data-fallback-src");
      img.src = next;
      return;
    }

    const avatar = document.createElement("span");
    avatar.className = "dash-avatar";
    avatar.setAttribute("aria-hidden", "true");
    avatar.textContent = img.dataset.initials;
    img.replaceWith(avatar);
  },
  true
);

// ==================================================
// STATE HALAMAN: loading / loaded / error
// ==================================================

function setPageState(state) {
  const root = getRoot();
  const content = document.getElementById("dashboard-content");
  const status = document.getElementById("dashboard-status");
  const error = document.getElementById("dashboard-error");

  if (root) {
    root.dataset.state = state;
    root.classList.toggle("is-page-loading", state === "loading");
  }

  if (content) {
    content.hidden = state === "error";
  }

  if (status) {
    status.hidden = state !== "loading";
  }

  if (error) {
    error.hidden = state !== "error";
  }

  if (state !== "error") {
    resetRetryButtons();
  }
}

function resetRetryButtons() {
  document.querySelectorAll("[data-dash-retry]").forEach((button) => {
    button.disabled = false;
    button.textContent = "Coba Lagi";
  });
}

// ==================================================
// SLOT PER SECTION (skeleton dan data kosong)
// ==================================================

function getSectionParts(sectionId) {
  const section = document.querySelector(
    `[data-dash-section="${sectionId}"]`
  );
  const panel = section?.querySelector("[data-dash-panel]");

  if (!section || !panel) {
    return null;
  }

  // renderMatches() mengganti isi <ul>, jadi slot dibuat ulang bila hilang.
  let slot = panel.querySelector(":scope > .dash-state-slot");

  if (!slot) {
    slot = document.createElement(panel.tagName === "UL" ? "li" : "div");
    slot.className = "dash-state-slot";
    slot.hidden = true;
    panel.appendChild(slot);
  }

  return { section, panel, slot };
}

function clearSectionState(sectionId) {
  const parts = getSectionParts(sectionId);

  if (!parts) {
    return;
  }

  parts.panel.classList.remove("is-stated");
  parts.slot.hidden = true;
  parts.slot.innerHTML = "";
  delete parts.section.dataset.state;
}

function fillSlot(sectionId, state, html) {
  const parts = getSectionParts(sectionId);

  if (!parts) {
    return;
  }

  parts.section.dataset.state = state;
  parts.panel.classList.add("is-stated");
  parts.slot.innerHTML = html;
  parts.slot.hidden = false;
}

function showSectionState(sectionId, type = "empty") {
  const copy = STATE_COPY[type] || STATE_COPY.empty;

  fillSlot(
    sectionId,
    type,
    `
    <div class="dash-empty" role="${type === "error" ? "alert" : "status"}">
      <span class="dash-empty__icon" aria-hidden="true">
        <img src="${ASSET_BASE}/images/icons/Bar%20Chart.png" alt="">
      </span>
      <h3 class="dash-empty__title">${copy.title}</h3>
      <p class="dash-empty__text">${copy.text}</p>
      <button type="button" class="dash-empty__button" data-dash-retry>
        Coba Lagi
      </button>
    </div>
  `
  );
}

// ==================================================
// SKELETON (Figma: Dashboard-state loading)
// ==================================================

function skeletonHeroes() {
  const item = `
    <div class="dash-skeleton-hero">
      <span class="dash-skeleton dash-skeleton--thumb"></span>
      <span class="dash-skeleton dash-skeleton--name"></span>
      <span class="dash-skeleton dash-skeleton--pill"></span>
    </div>`;

  return `<div class="dash-heroes" aria-hidden="true">${item.repeat(MAX_HEROES)}</div>`;
}

function skeletonChart() {
  const widths = [88, 72, 80, 64, 76, 58, 68, 52, 60];
  const rows = widths.map((w) => `
    <div class="dash-skeleton-chart__row">
      <span class="dash-skeleton dash-skeleton--line"></span>
      <div class="dash-skeleton-chart__bars">
        <span class="dash-skeleton dash-skeleton--line" style="width:${w}%"></span>
        <span class="dash-skeleton dash-skeleton--line" style="width:${Math.max(w - 30, 20)}%"></span>
      </div>
    </div>`).join("");

  const legend = `
    <span class="dash-skeleton-legend">
      <span class="dash-skeleton dash-skeleton--dot"></span>
      <span class="dash-skeleton dash-skeleton--line"></span>
    </span>`;

  const ticks = Array.from({ length: 5 }, () =>
    '<span class="dash-skeleton dash-skeleton--line" style="width:22px"></span>'
  ).join("");

  return `
    <div class="dash-skeleton-chart" aria-hidden="true">
      <div class="dash-skeleton-chart__art">
        <div class="dash-skeleton-chart__head">${legend}${legend}</div>
        <div class="dash-skeleton-chart__body">${rows}</div>
        <div class="dash-skeleton-chart__ticks">${ticks}</div>
      </div>
    </div>`;
}

function skeletonMatches() {
  const row = `
    <div class="dash-match dash-match--skeleton">
      <div class="dash-team dash-team--home">
        <span class="dash-skeleton dash-skeleton--team-name"></span>
      </div>
      <div class="dash-match__info">
        <span class="dash-skeleton dash-skeleton--vs"></span>
        <span class="dash-skeleton dash-skeleton--time"></span>
      </div>
      <div class="dash-team dash-team--away">
        <span class="dash-skeleton dash-skeleton--team-name"></span>
      </div>
    </div>`;

  return `<div class="dash-matches__skeleton" aria-hidden="true">${row.repeat(MAX_MATCHES)}</div>`;
}

function showLoadingSkeleton() {
  fillSlot("wr", "loading", skeletonHeroes());
  fillSlot("br", "loading", skeletonHeroes());
  fillSlot("pr", "loading", skeletonHeroes());
  fillSlot("chart", "loading", skeletonChart());
  fillSlot("schedule", "loading", skeletonMatches());
}

// ==================================================
// DATA HERO
// ==================================================

// Daftar Top 5 dari API tidak membawa gambar/slug: ambil dari hero_meta.
function attachHeroInfo(heroes, heroMeta) {
  const metaById = new Map(
    heroMeta.map((item) => [Number(item.hero_id), item])
  );

  return heroes.map((hero) => {
    const meta = metaById.get(Number(hero.hero_id));

    return {
      ...hero,
      hero_url: hero.hero_url || meta?.hero_url || null,
      hero_slug: hero.hero_slug || meta?.hero_slug || null
    };
  });
}

function heroDetailHref(hero) {
  const id = Number(hero?.hero_id);

  return Number.isInteger(id) && id > 0
    ? `${HERO_DETAIL_URL}?id=${id}`
    : null;
}

function heroImageTag(hero, heroName, linked) {
  const initials = escapeHTML(getInitials(hero.hero_name));
  const local = hero.hero_slug
    ? `${ASSET_BASE}/images/heroes/${encodeURIComponent(hero.hero_slug)}.png`
    : "";

  // URL dari API diutamakan; berkas lokal dan terakhir avatar inisial sebagai cadangan.
  const primary = hero.hero_url || local;
  const fallback = hero.hero_url && local ? local : "";

  if (!primary) {
    return `<span class="dash-avatar" aria-hidden="true">${initials}</span>`;
  }

  return `
    <img
      src="${escapeHTML(primary)}"
      ${fallback ? `data-fallback-src="${escapeHTML(fallback)}"` : ""}
      data-initials="${initials}"
      alt="${linked ? "" : heroName}"
      class="dash-hero__image"
      loading="lazy"
    >`;
}

// ==================================================
// RENDER TOP 5 HERO
// Slot yang belum ada datanya tampil sebagai kotak abu-abu
// dengan keterangan "Data WR belum tersedia" (Figma data belum lengkap).
// ==================================================

function renderHeroes(container, heroes, rateKey, prefix) {
  if (!container) {
    return;
  }

  const list = Array.isArray(heroes) ? heroes.slice(0, MAX_HEROES) : [];

  if (list.length === 0) {
    // State "Data belum tersedia" ditampilkan oleh loadDashboard().
    container.innerHTML = "";
    return;
  }

  const safePrefix = escapeHTML(prefix);

  const items = list.map((hero, index) => {
    const heroName = escapeHTML(hero.hero_name || "Hero");
    const rate = escapeHTML(formatPercent(hero[rateKey]));
    const href = heroDetailHref(hero);

    const inner = `
      <div class="dash-hero__media">
        <span class="dash-hero__rank">${index + 1}</span>
        ${heroImageTag(hero, heroName, Boolean(href))}
      </div>

      <div class="dash-hero__name" title="${heroName}">${heroName}</div>

      <div class="dash-hero__stat">${safePrefix} ${rate}</div>
    `;

    return href
      ? `<li class="dash-hero">
           <a class="dash-hero__link" href="${href}" aria-label="Lihat detail ${heroName}">${inner}</a>
         </li>`
      : `<li class="dash-hero">${inner}</li>`;
  });

  for (let i = list.length; i < MAX_HEROES; i++) {
    items.push(`
      <li class="dash-hero dash-hero--empty">
        <div class="dash-hero__media">
          <span class="dash-hero__placeholder" aria-hidden="true"></span>
        </div>
        <div class="dash-hero__stat dash-hero__stat--empty">Data ${safePrefix} belum tersedia</div>
      </li>`);
  }

  container.innerHTML = items.join("");
}

// ==================================================
// RENDER JADWAL PERTANDINGAN
// Desain: "Vs" di atas jam "14 : 00".
// ==================================================

function teamLogoTag(teamName) {
  const initials = escapeHTML(getInitials(teamName));
  const local = TEAM_LOGOS_LOCAL[teamName]
    ? `${ASSET_BASE}/images/teams/${encodeURIComponent(TEAM_LOGOS_LOCAL[teamName])}`
    : "";
  const remote = TEAM_LOGOS_REMOTE[teamName] || "";
  const primary = local || remote;
  const fallback = local && remote ? remote : "";

  if (!primary) {
    return `<span class="dash-avatar" aria-hidden="true">${initials}</span>`;
  }

  return `
    <img
      src="${escapeHTML(primary)}"
      ${fallback ? `data-fallback-src="${escapeHTML(fallback)}"` : ""}
      data-initials="${initials}"
      alt=""
      class="dash-team__logo"
      loading="lazy"
    >`;
}

function formatMatchTime(value) {
  const match = String(value ?? "").match(/^(\d{1,2}):(\d{2})/);

  return match
    ? `${match[1].padStart(2, "0")} : ${match[2]}`
    : "-";
}

function renderMatches(matches) {
  const container = document.getElementById("match-schedule");

  if (!container) {
    return;
  }

  const displayed = Array.isArray(matches)
    ? matches.slice(0, MAX_MATCHES)
    : [];

  container.innerHTML = displayed.map((match) => {
    const team1 = match.team1_name || "Tim 1";
    const team2 = match.team2_name || "Tim 2";

    return `
      <li class="dash-match">
        <div class="dash-team dash-team--home">
          ${teamLogoTag(team1)}
          <span class="dash-team__name">${escapeHTML(team1)}</span>
        </div>

        <div class="dash-match__info">
          <span class="dash-match__vs">Vs</span>
          <span class="dash-match__time">${escapeHTML(formatMatchTime(match.match_time))}</span>
        </div>

        <div class="dash-team dash-team--away">
          ${teamLogoTag(team2)}
          <span class="dash-team__name">${escapeHTML(team2)}</span>
        </div>
      </li>
    `;
  }).join("");
}

// ==================================================
// GRAFIK WIN RATE DAN BAN RATE
// ==================================================

function renderWRBRChart(topWR, topBR, heroMeta) {
  const canvas = document.getElementById("win-ban-chart");

  if (!canvas || !window.Chart) {
    return false;
  }

  // Hindari grafik bertumpuk jika fungsi dipanggil ulang.
  Chart.getChart(canvas)?.destroy();

  // Gabungkan hero dari Top WR dan Top BR tanpa duplikasi.
  const byId = new Map();

  [...topWR, ...topBR].forEach((hero) => {
    const id = Number(hero.hero_id);

    if (hero.hero_name && !byId.has(id)) {
      byId.set(id, hero);
    }
  });

  const metaById = new Map(
    heroMeta.map((item) => [Number(item.hero_id), item])
  );

  const rows = [...byId.entries()].map(([id, hero]) => {
    // hero_meta memuat WR dan BR lengkap untuk semua hero.
    const source = metaById.get(id) || hero;

    return {
      name: hero.hero_name,
      wr: toRate(source.win_rate ?? hero.win_rate),
      br: toRate(source.ban_rate ?? hero.ban_rate)
    };
  });

  if (rows.length === 0) {
    return false;
  }

  window.dashboardChart = new Chart(canvas, {
    type: "bar",

    data: {
      labels: rows.map((row) => row.name),

      datasets: [
        {
          label: "Win Rate",
          data: rows.map((row) => row.wr),
          backgroundColor: "#2874d0",
          borderRadius: 3,
          barPercentage: 0.8,
          categoryPercentage: 0.75
        },
        {
          label: "Ban Rate",
          data: rows.map((row) => row.br),
          backgroundColor: "#f28c28",
          borderRadius: 3,
          barPercentage: 0.8,
          categoryPercentage: 0.75
        }
      ]
    },

    options: {
      indexAxis: "y",
      responsive: true,
      maintainAspectRatio: false,
      animation: { duration: 400 },

      interaction: {
        mode: "index",
        intersect: false
      },

      plugins: {
        // Legenda memakai HTML (.dash-legend) agar sama dengan desain.
        legend: { display: false },

        tooltip: {
          callbacks: {
            label(context) {
              const value = context.raw;

              return `${context.dataset.label}: ${
                value === null ? "-" : `${Number(value).toFixed(1)}%`
              }`;
            }
          }
        }
      },

      scales: {
        x: {
          min: 0,
          max: 100,

          ticks: {
            stepSize: 25,
            font: { size: 10, weight: "600" },
            callback: (value) => `${value}%`
          },

          grid: { color: "rgba(0, 0, 0, 0.12)" }
        },

        y: {
          ticks: {
            autoSkip: false,
            font: { size: 10 }
          },

          grid: { color: "rgba(0, 0, 0, 0.10)" }
        }
      }
    }
  });

  return true;
}

// ==================================================
// MEMUAT DASHBOARD DARI API
// ==================================================

async function loadDashboard() {
  const token = ++loadToken;

  // 1. LOADING: skeleton seluruh halaman.
  setPageState("loading");
  DASH_SECTIONS.forEach(clearSectionState);
  showLoadingSkeleton();

  try {
    if (
      !window.ApiClient ||
      typeof window.ApiClient.getDashboard !== "function"
    ) {
      throw new Error(
        "ApiClient.getDashboard() tidak tersedia. Periksa api-client.js."
      );
    }

    // Simulasi untuk uji tampilan:
    //   ?demo=loading (skeleton terus), ?demo=empty (data kosong),
    //   ?demo=partial (WR hanya 4 hero), ?demo=error (API gagal)
    const demo = new URLSearchParams(window.location.search).get("demo");

    if (demo === "loading") {
      return;
    }

    if (demo === "error") {
      throw new Error("Simulasi galat API (?demo=error).");
    }

    const data = demo === "empty"
      ? { top_win_rate: [], top_ban_rate: [], top_pick_rate: [], hero_meta: [], schedule: [] }
      : await window.ApiClient.getDashboard();

    // Permintaan lama (mis. Coba Lagi ditekan dua kali) diabaikan.
    if (token !== loadToken) {
      return;
    }

    if (!data || typeof data !== "object") {
      throw new Error("Format data dashboard tidak valid.");
    }

    const heroMeta = Array.isArray(data.hero_meta) ? data.hero_meta : [];

    // 2. Top 5 dari API; jika top_ban_rate belum ada, urutkan dari hero_meta.
    let topWR = attachHeroInfo(sortedTop(data.top_win_rate, "win_rate"), heroMeta);
    const banSource = Array.isArray(data.top_ban_rate) && data.top_ban_rate.length
      ? data.top_ban_rate
      : heroMeta;
    const topBR = attachHeroInfo(sortedTop(banSource, "ban_rate"), heroMeta);
    const topPR = attachHeroInfo(sortedTop(data.top_pick_rate, "pick_rate"), heroMeta);

    if (demo === "partial") {
      topWR = topWR.slice(0, 4);
    }

    const schedule = Array.isArray(data.schedule) ? data.schedule : [];

    // 3. Keluar dari loading sebelum menggambar (grafik butuh container terlihat).
    DASH_SECTIONS.forEach(clearSectionState);
    setPageState("loaded");

    renderHeroes(document.getElementById("top-win-rate"), topWR, "win_rate", "WR");
    renderHeroes(document.getElementById("top-ban-rate"), topBR, "ban_rate", "BR");
    renderHeroes(document.getElementById("top-pick-rate"), topPR, "pick_rate", "PR");
    renderMatches(schedule);

    const chartDrawn = renderWRBRChart(topWR, topBR, heroMeta);

    // Section tanpa data menampilkan "Data belum tersedia".
    if (topWR.length === 0) showSectionState("wr");
    if (topBR.length === 0) showSectionState("br");
    if (topPR.length === 0) showSectionState("pr");
    if (schedule.length === 0) showSectionState("schedule");

    if (!chartDrawn) {
      // Tanpa data (atau Chart.js gagal dimuat) grafik tidak digambar kosong.
      showSectionState("chart", window.Chart ? "empty" : "error");
    }
  } catch (err) {
    if (token !== loadToken) {
      return;
    }

    console.error("Gagal memuat dashboard:", err);

    // 4. GALAT: satu panel "Gagal memuat data" + tombol "Coba Lagi".
    DASH_SECTIONS.forEach(clearSectionState);
    setPageState("error");
  }
}

// Tombol "Coba Lagi": muat ulang seluruh dashboard.
document.addEventListener("click", (event) => {
  const button = event.target.closest("[data-dash-retry]");

  if (!button || button.disabled) {
    return;
  }

  button.disabled = true;
  button.textContent = "Memuat...";
  loadDashboard();
});
