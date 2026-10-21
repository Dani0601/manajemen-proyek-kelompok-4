"use strict";

console.log("dashboard.js berhasil dijalankan");

document.addEventListener("DOMContentLoaded", loadDashboard);

// ==================================================
// KONFIGURASI
// ==================================================

const ASSET_BASE =
  (window.APP_CONFIG && window.APP_CONFIG.assetBase)
    ? window.APP_CONFIG.assetBase
    : "/assets";

const HERO_PLACEHOLDER =
  `${ASSET_BASE}/images/hero-placeholder.png`;

// ==================================================
// UTILITAS
// ==================================================

function formatPercent(value) {
  if (value === null || value === undefined || value === "") {
    return "-";
  }

  const number = Number(value);

  return Number.isFinite(number)
    ? `${number.toFixed(2)}%`
    : "-";
}

function escapeHTML(value) {
  return String(value ?? "").replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[char]);
}

function setDashboardState(state) {
  const root = document.getElementById("dashboard");

  if (root) {
    root.dataset.state = state;
  }
}

function showDashboardError(message) {
  const content = document.getElementById("dashboard-content");
  const status = document.getElementById("dashboard-status");
  const error = document.getElementById("dashboard-error");

  if (content) {
    content.hidden = true;
  }

  if (status) {
    status.hidden = true;
  }

  if (error) {
    error.textContent = message;
    error.hidden = false;
  }

  setDashboardState("error");
}

// ==================================================
// STATE DATA KOSONG / GALAT PER SECTION
// Tampilan mengikuti Figma "Dashboard - data kosong".
// Markup slot sudah ada di dashboard.php (.dash-state-slot),
// gaya ada di dashboard.css (.dash-empty, is-stated).
// ==================================================

const STATE_COPY = {
  empty: {
    title: "Data belum tersedia",
    text: "Saat ini belum ada data untuk ditampilkan. Silahkan coba lagi nanti atau jelajahi fitur lainnya."
  },
  error: {
    title: "Data gagal dimuat",
    text: "Terjadi kendala saat mengambil data. Periksa koneksi internet Anda lalu coba lagi."
  }
};

const DASH_SECTIONS = ["wr", "br", "pr", "chart", "schedule"];

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

function showSectionState(sectionId, type = "empty") {
  const parts = getSectionParts(sectionId);

  if (!parts) {
    return;
  }

  const copy = STATE_COPY[type] || STATE_COPY.empty;

  parts.section.dataset.state = type;
  parts.panel.classList.add("is-stated");

  parts.slot.innerHTML = `
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
  `;

  parts.slot.hidden = false;
}

// Satu tombol "Coba Lagi" untuk semua section: muat ulang seluruh dashboard.
document.addEventListener("click", (event) => {
  const button = event.target.closest("[data-dash-retry]");

  if (!button) {
    return;
  }

  button.disabled = true;
  button.textContent = "Memuat...";
  loadDashboard();
});

// Hanya hero dengan nilai angka yang valid yang dianggap sebagai data.
function withValidRate(list, key) {
  return (Array.isArray(list) ? list : []).filter((item) => {
    const raw = item?.[key];
    return raw !== null && raw !== undefined && raw !== "" &&
      Number.isFinite(Number(raw));
  });
}

// ==================================================
// DATA HERO
// ==================================================

function attachHeroImages(heroes, heroMeta) {
  if (!Array.isArray(heroes)) {
    return [];
  }

  const metadata = Array.isArray(heroMeta) ? heroMeta : [];

  return heroes.map((hero) => {
    const meta = metadata.find(
      (item) =>
        Number(item.hero_id) === Number(hero.hero_id)
    );

    return {
      ...hero,
      hero_url: hero.hero_url || meta?.hero_url || null
    };
  });
}

// ==================================================
// RENDER TOP 5 HERO
// Class disesuaikan dengan dashboard.css
// ==================================================

function renderHeroes(container, heroes, rateKey, prefix) {
  if (!container) {
    console.error("Container hero tidak ditemukan.");
    return;
  }

  if (!Array.isArray(heroes) || heroes.length === 0) {
    // State "Data belum tersedia" ditampilkan oleh loadDashboard().
    container.innerHTML = "";
    return;
  }

  container.innerHTML = heroes.slice(0, 5).map((hero, index) => {
    const imageUrl = escapeHTML(
      hero.hero_url || HERO_PLACEHOLDER
    );

    const heroName = escapeHTML(hero.hero_name || "Hero");
    const rate = escapeHTML(formatPercent(hero[rateKey]));
    const safePrefix = escapeHTML(prefix);

    return `
      <li class="dash-hero">
        <div class="dash-hero__media">
          <span class="dash-hero__rank">${index + 1}</span>

          <img
            src="${imageUrl}"
            alt="${heroName}"
            class="dash-hero__image"
            loading="lazy"
            onerror="this.onerror=null;this.src='${HERO_PLACEHOLDER}';"
          >
        </div>

        <div
          class="dash-hero__name"
          title="${heroName}"
        >
          ${heroName}
        </div>

        <div class="dash-hero__stat">
          ${safePrefix}: ${rate}
        </div>
      </li>
    `;
  }).join("");
}

// ==================================================
// LOGO TIM
// ==================================================

const TEAM_LOGOS = {
  "ONIC":
    "https://wsrv.nl/?url=https://ik.imagekit.io/nloe8dhf7w/mplid/s14/teams/onic-b-256.png",

  "Dewa United Esports":
    "https://wsrv.nl/?url=https://ik.imagekit.io/nloe8dhf7w/mplid/s14/teams/dewa-united-500.png",

  "RRQ Hoshi":
    "https://wsrv.nl/?url=https://ik.imagekit.io/nloe8dhf7w/mplid/s14/teams/rrq-500.png",

  "Alter Ego":
    "https://wsrv.nl/?url=https://ik.imagekit.io/nloe8dhf7w/mplid/s14/teams/ae-256.png",

  "EVOS":
    "https://wsrv.nl/?url=https://ik.imagekit.io/nloe8dhf7w/mplid/s14/teams/evos-500.png",

  "Bigetron by Vitality":
    "https://wsrv.nl/?url=https://ik.imagekit.io/nloe8dhf7w/mplid/s14/teams/btr_vit.png",

  "Team Liquid ID":
    "https://wsrv.nl/?url=https://ik.imagekit.io/nloe8dhf7w/mplid/s14/teams/TLID-Primary500x500.png",

  "Geek Fam ID":
    "https://wsrv.nl/?url=https://ik.imagekit.io/nloe8dhf7w/mplid/s14/teams/geek-500.png",

  "Natus Vincere":
    "https://wsrv.nl/?url=https://ik.imagekit.io/nloe8dhf7w/mplid/s14/teams/NAVI-2.png"
};

function getTeamLogo(teamName) {
  return TEAM_LOGOS[teamName] || "";
}

// ==================================================
// RENDER JADWAL PERTANDINGAN
// Class disesuaikan dengan dashboard.css
// ==================================================


function renderMatches(matches) {
  const container = document.getElementById("match-schedule");
  const statusElement = document.getElementById("schedule-status");

  if (!container) {
    console.error('Container "match-schedule" tidak ditemukan.');
    return;
  }

  // Tampilkan maksimal 3 pertandingan pertama dari API.
  const displayedMatches = Array.isArray(matches)
    ? matches.slice(0, 3)
    : [];

  if (displayedMatches.length === 0) {
    container.innerHTML = "";

    if (statusElement) {
      statusElement.textContent = "Belum ada jadwal pertandingan.";
      statusElement.hidden = false;
    }

    return;
  }

  container.innerHTML = displayedMatches.map((match) => {
    const team1 = match.team1_name || "Tim 1";
    const team2 = match.team2_name || "Tim 2";

    const safeTeam1 = escapeHTML(team1);
    const safeTeam2 = escapeHTML(team2);

    const time = match.match_time
      ? `${String(match.match_time).slice(0, 5)} WIB`
      : "-";

    const safeTime = escapeHTML(time);

    const logo1 = getTeamLogo(team1);
    const logo2 = getTeamLogo(team2);

    const team1Logo = logo1
      ? `
        <img
          src="${escapeHTML(logo1)}"
          alt="Logo ${safeTeam1}"
          class="dash-team__logo"
          loading="lazy"
          onerror="this.onerror=null;this.style.display='none';"
        >
      `
      : `
        <span class="dash-avatar" aria-hidden="true">
          ${escapeHTML(team1.slice(0, 2).toUpperCase())}
        </span>
      `;

    const team2Logo = logo2
      ? `
        <img
          src="${escapeHTML(logo2)}"
          alt="Logo ${safeTeam2}"
          class="dash-team__logo"
          loading="lazy"
          onerror="this.onerror=null;this.style.display='none';"
        >
      `
      : `
        <span class="dash-avatar" aria-hidden="true">
          ${escapeHTML(team2.slice(0, 2).toUpperCase())}
        </span>
      `;

    return `
      <li class="dash-match">
        <div class="dash-team dash-team--home">
          ${team1Logo}
          <span class="dash-team__name">${safeTeam1}</span>
        </div>

        <div class="dash-match__info">
          <span class="dash-match__vs">VS</span>
          <span class="dash-match__time">${safeTime}</span>
        </div>

        <div class="dash-team dash-team--away">
          ${team2Logo}
          <span class="dash-team__name">${safeTeam2}</span>
        </div>
      </li>
    `;
  }).join("");

  if (statusElement) {
    statusElement.hidden = true;
  }
}


// ==================================================
// GRAFIK WIN RATE DAN BAN RATE
// ==================================================


function renderWRBRChart(topWR, topBR, heroMeta) {
  const canvas = document.getElementById("win-ban-chart");

  if (!canvas) {
    console.error('Canvas "win-ban-chart" tidak ditemukan.');
    return;
  }

  if (!window.Chart) {
    console.error("Chart.js belum dimuat.");
    return;
  }

  const winRateHeroes = Array.isArray(topWR) ? topWR : [];
  const banRateHeroes = Array.isArray(topBR) ? topBR : [];
  const allHeroes = Array.isArray(heroMeta) ? heroMeta : [];

  // Gabungkan nama hero tanpa duplikasi.
  const heroNames = [
    ...new Set([
      ...winRateHeroes.map((hero) => hero.hero_name),
      ...banRateHeroes.map((hero) => hero.hero_name)
    ].filter(Boolean))
  ];

  // Cari data hero berdasarkan nama.
  function findHero(heroName) {
    return allHeroes.find(
      (hero) => hero.hero_name === heroName
    ) || winRateHeroes.find(
      (hero) => hero.hero_name === heroName
    ) || banRateHeroes.find(
      (hero) => hero.hero_name === heroName
    );
  }

  const winRateData = heroNames.map((name) => {
    const hero = findHero(name);
    const value = Number(hero?.win_rate);

    return hero && hero.win_rate !== null &&
      hero.win_rate !== undefined &&
      hero.win_rate !== "" &&
      Number.isFinite(value)
      ? value
      : null;
  });

  const banRateData = heroNames.map((name) => {
    const hero = findHero(name);
    const value = Number(hero?.ban_rate);

    return hero && hero.ban_rate !== null &&
      hero.ban_rate !== undefined &&
      hero.ban_rate !== "" &&
      Number.isFinite(value)
      ? value
      : null;
  });

  // Hindari grafik bertumpuk jika fungsi dipanggil ulang.
  const oldChart = Chart.getChart(canvas);

  if (oldChart) {
    oldChart.destroy();
  }

  // Tidak ada hero untuk dibandingkan: jangan gambar grafik kosong.
  if (heroNames.length === 0) {
    return;
  }

  window.dashboardChart = new Chart(canvas, {
    type: "bar",

    data: {
      labels: heroNames,

      datasets: [
        {
          label: "Win Rate",
          data: winRateData,
          backgroundColor: "#2874d0",
          borderRadius: 4,
          barPercentage: 0.8,
          categoryPercentage: 0.75
        },
        {
          label: "Ban Rate",
          data: banRateData,
          backgroundColor: "#f28c28",
          borderRadius: 4,
          barPercentage: 0.8,
          categoryPercentage: 0.75
        }
      ]
    },

    options: {
      indexAxis: "y",
      responsive: true,
      maintainAspectRatio: false,

      interaction: {
        mode: "index",
        intersect: false
      },

      plugins: {
        // Legenda sudah tersedia di HTML (.dash-legend).
        legend: {
          display: false
        },

        tooltip: {
          callbacks: {
            label(context) {
              const value = context.raw;

              return `${context.dataset.label}: ${
                value === null ? "-" : `${value.toFixed(2)}%`
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
            callback(value) {
              return `${value}%`;
            }
          },

          grid: {
            color: "rgba(0, 0, 0, 0.12)"
          }
        },

        y: {
          ticks: {
            autoSkip: false
          },

          grid: {
            color: "rgba(0, 0, 0, 0.10)"
          }
        }
      }
    }
  });
}


// ==================================================
// MEMUAT DASHBOARD DARI API
// ==================================================

async function loadDashboard() {
  const content = document.getElementById("dashboard-content");
  const status = document.getElementById("dashboard-status");
  const error = document.getElementById("dashboard-error");

  // Sembunyikan konten sampai proses pemuatan selesai.
  if (content) {
    content.hidden = true;
  }

  if (status) {
    status.hidden = false;
    status.textContent = "Memuat statistik dari API...";
  }

  if (error) {
    error.hidden = true;
    error.textContent = "";
  }

  setDashboardState("loading");
  DASH_SECTIONS.forEach(clearSectionState);

  try {
    if (
      !window.ApiClient ||
      typeof window.ApiClient.getDashboard !== "function"
    ) {
      throw new Error(
        "ApiClient.getDashboard() tidak tersedia. Periksa api-client.js."
      );
    }

    // Gunakan endpoint Dashboard, bukan endpoint Tournament.
    // Simulasi untuk uji tampilan: ?demo=empty (data kosong) / ?demo=error (API gagal)
    const demo = new URLSearchParams(window.location.search).get("demo");

    if (demo === "error") {
      throw new Error("Simulasi galat API (?demo=error).");
    }

    const data = demo === "empty"
      ? { top_win_rate: [], top_pick_rate: [], hero_meta: [], schedule: [] }
      : await window.ApiClient.getDashboard();

    console.log("Dashboard berhasil dimuat:", data);

    if (!data || typeof data !== "object") {
      throw new Error("Format data dashboard tidak valid.");
    }

    // Metadata seluruh hero dari respons API.
    const heroMeta = Array.isArray(data.hero_meta)
      ? data.hero_meta
      : [];

    // 1. Top 5 Win Rate.
    const topWR = attachHeroImages(
      withValidRate(data.top_win_rate, "win_rate"),
      heroMeta
    );

    // 2. Top 5 Ban Rate.
    const topBR = attachHeroImages(
      withValidRate(heroMeta, "ban_rate")
        .sort(
          (a, b) =>
            Number(b.ban_rate || 0) -
            Number(a.ban_rate || 0)
        )
        .slice(0, 5),
      heroMeta
    );

    // 3. Top 5 Pick Rate.
    const topPR = attachHeroImages(
      withValidRate(data.top_pick_rate, "pick_rate"),
      heroMeta
    );

    console.log("Jumlah Top WR:", topWR.length);
    console.log("Jumlah Top BR:", topBR.length);
    console.log("Jumlah Top PR:", topPR.length);
    console.log(
      "Jumlah jadwal:",
      Array.isArray(data.schedule) ? data.schedule.length : 0
    );

    // Render daftar hero.
    renderHeroes(
      document.getElementById("top-win-rate"),
      topWR,
      "win_rate",
      "WR"
    );

    renderHeroes(
      document.getElementById("top-ban-rate"),
      topBR,
      "ban_rate",
      "BR"
    );

    renderHeroes(
      document.getElementById("top-pick-rate"),
      topPR,
      "pick_rate",
      "PR"
    );

    // Render grafik.
    renderWRBRChart(topWR, topBR);

    // Render jadwal dari respons API Dashboard.
    renderMatches(data.schedule);

    // Section tanpa data menampilkan "Data belum tersedia".
    const hasMatches =
      Array.isArray(data.schedule) && data.schedule.length > 0;

    if (topWR.length === 0) showSectionState("wr");
    if (topBR.length === 0) showSectionState("br");
    if (topPR.length === 0) showSectionState("pr");
    if (topWR.length === 0 && topBR.length === 0) {
      showSectionState("chart");
    }
    if (!hasMatches) showSectionState("schedule");

    // Tampilkan konten setelah proses render selesai.
    if (content) {
      content.hidden = false;
    }

    if (status) {
      status.hidden = true;
    }

    if (error) {
      error.hidden = true;
      error.textContent = "";
    }

    setDashboardState("loaded");

    console.log("Semua data dashboard selesai diproses.");
  } catch (err) {
    console.error("Gagal memuat dashboard:", err);

    // Semua section menampilkan state galat dengan tombol "Coba Lagi".
    DASH_SECTIONS.forEach((id) => showSectionState(id, "error"));

    showDashboardError(
      `Data dashboard gagal ditampilkan. ${
        err?.message || "Periksa Console."
      }`
    );
  }
}