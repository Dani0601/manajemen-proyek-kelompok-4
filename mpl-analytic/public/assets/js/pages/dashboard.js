"use strict";

console.log("dashboard.js berhasil dijalankan");

document.addEventListener("DOMContentLoaded", loadDashboard);

// URL dasar aset project
const ASSET_BASE =
  "/manajemen-proyek-kelompok-4/mpl-analytic/public/assets";

const HERO_PLACEHOLDER = `${ASSET_BASE}/images/hero-placeholder.png`;

// Format angka persen
function formatPercent(value) {
  if (value === null || value === undefined || value === "") {
    return "-";
  }

  const number = Number(value);

  return Number.isFinite(number)
    ? `${number.toFixed(2)}%`
    : "-";
}

// Cari URL gambar hero dari metadata API
function attachHeroImages(heroes, heroMeta) {
  if (!Array.isArray(heroes)) return [];

  return heroes.map((hero) => {
    const meta = Array.isArray(heroMeta)
      ? heroMeta.find(
          (item) =>
            Number(item.hero_id) === Number(hero.hero_id)
        )
      : null;

    return {
      ...hero,
      hero_url: hero.hero_url || meta?.hero_url || null
    };
  });
}

// Render kartu hero
function renderHeroes(container, heroes, rateKey, prefix) {
  if (!container) {
    console.error("Container hero tidak ditemukan.");
    return;
  }

  if (!Array.isArray(heroes) || heroes.length === 0) {
    container.innerHTML =
      '<li class="empty-state">Data hero belum tersedia.</li>';
    return;
  }

  container.innerHTML = heroes.slice(0, 5).map((hero, index) => {
    const imageUrl = hero.hero_url || HERO_PLACEHOLDER;
    const heroName = hero.hero_name || "Hero";
    const rate = formatPercent(hero[rateKey]);

    return `
      <li class="hero-card">
        <div class="hero-image-wrapper">
          <span class="rank-badge">${index + 1}</span>

          <img
            src="${imageUrl}"
            alt="${heroName}"
            class="hero-image"
            loading="lazy"
            onerror="this.onerror=null;this.src='${HERO_PLACEHOLDER}';"
          >
        </div>

        <div class="hero-name">${heroName}</div>
        <div class="hero-rate">${prefix}: ${rate}</div>
      </li>
    `;
  }).join("");
}

// Data logo tim
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

// Render jadwal pertandingan
function renderMatches(matches) {
  const container = document.getElementById("match-schedule");

  if (!container) {
    console.error('Container "match-schedule" tidak ditemukan.');
    return;
  }

  if (!Array.isArray(matches) || matches.length === 0) {
    container.innerHTML =
      '<p class="empty-state">Belum ada jadwal pertandingan.</p>';
    return;
  }

  container.innerHTML = matches.map((match) => {
    const date = match.match_date
      ? new Date(`${match.match_date}T00:00:00`).toLocaleDateString(
          "id-ID",
          {
            day: "2-digit",
            month: "short",
            year: "numeric"
          }
        )
      : "-";

    const time = match.match_time
      ? String(match.match_time).slice(0, 5)
      : "-";

    const team1 = match.team1_name || "Tim 1";
    const team2 = match.team2_name || "Tim 2";
    const logo1 = getTeamLogo(team1);
    const logo2 = getTeamLogo(team2);

    return `
      <article class="match-card">
        <div class="match-date">${date}</div>

        <div class="match-team team-left">
          ${
            logo1
              ? `<img src="${logo1}" alt="Logo ${team1}"
                   class="team-logo"
                   onerror="this.onerror=null;this.style.display='none';">`
              : ""
          }
          <span>${team1}</span>
        </div>

        <div class="match-info">
          <span class="match-time">${time} WIB</span>
          <span class="match-status">${match.status || ""}</span>
        </div>

        <div class="match-team team-right">
          <span>${team2}</span>
          ${
            logo2
              ? `<img src="${logo2}" alt="Logo ${team2}"
                   class="team-logo"
                   onerror="this.onerror=null;this.style.display='none';">`
              : ""
          }
        </div>
      </article>
    `;
  }).join("");
}

// Render grafik Win Rate dan Ban Rate
function renderWRBRChart(topWR, topBR) {
  const canvas = document.getElementById("win-ban-chart");

  if (!canvas) {
    console.error('Canvas "win-ban-chart" tidak ditemukan.');
    return;
  }

  if (!window.Chart) {
    console.error(
      "Chart.js belum dimuat. Periksa script Chart.js di dashboard.php."
    );
    return;
  }

  const oldChart = Chart.getChart(canvas);

  if (oldChart) {
    oldChart.destroy();
  }

  const winRateHeroes = Array.isArray(topWR) ? topWR : [];
  const banRateHeroes = Array.isArray(topBR) ? topBR : [];

  const chartLabels = [
    ...new Set([
      ...winRateHeroes.map((hero) => hero.hero_name),
      ...banRateHeroes.slice(0, 5).map((hero) => hero.hero_name)
    ])
  ];

  window.dashboardChart = new Chart(canvas, {
    type: "bar",

    data: {
      labels: chartLabels,

      datasets: [
        {
          label: "Win Rate",
          data: chartLabels.map((name) => {
            const hero = winRateHeroes.find(
              (item) => item.hero_name === name
            );

            return hero ? Number(hero.win_rate) : null;
          }),
          backgroundColor: "#2874d0"
        },

        {
          label: "Ban Rate",
          data: chartLabels.map((name) => {
            const hero = banRateHeroes.find(
              (item) => item.hero_name === name
            );

            return hero ? Number(hero.ban_rate) : null;
          }),
          backgroundColor: "#f28c28"
        }
      ]
    },

    options: {
      indexAxis: "y",
      responsive: true,
      maintainAspectRatio: false,

      scales: {
        x: {
          min: 0,
          max: 100,
          ticks: {
            callback: (value) => `${value}%`
          }
        }
      }
    }
  });
}

// Mengambil data API dan menampilkannya di dashboard
async function loadDashboard() {
  try {
    if (!window.ApiClient ||
        typeof window.ApiClient.getDashboard !== "function") {
      throw new Error(
        "ApiClient belum tersedia. Periksa pemanggilan api-client.js."
      );
    }

    const data = await window.ApiClient.getDashboard("dashboard-status");

    console.log("Dashboard berhasil dimuat:", data);

    if (!data || typeof data !== "object") {
      throw new Error("Format data dashboard tidak valid.");
    }

    // 1. Top 5 Win Rate
    const topWR = attachHeroImages(
      data.top_win_rate,
      data.hero_meta
    );

    renderHeroes(
      document.getElementById("top-win-rate"),
      topWR,
      "win_rate",
      "WR"
    );

    // 2. Top 5 Ban Rate
    const metaHeroes = Array.isArray(data.hero_meta)
      ? data.hero_meta
      : [];

    const topBR = [...metaHeroes]
      .sort(
        (a, b) =>
          Number(b.ban_rate || 0) - Number(a.ban_rate || 0)
      )
      .slice(0, 5);

    renderHeroes(
      document.getElementById("top-ban-rate"),
      topBR,
      "ban_rate",
      "BR"
    );

    // 3. Top 5 Pick Rate
    const topPR = attachHeroImages(
      data.top_pick_rate,
      data.hero_meta
    );

    renderHeroes(
      document.getElementById("top-pick-rate"),
      topPR,
      "pick_rate",
      "PR"
    );

    // 4. Grafik Win Rate vs Ban Rate
    renderWRBRChart(topWR, topBR);

    // 5. Jadwal pertandingan
    renderMatches(data.schedule);

    console.log("Semua data dashboard selesai diproses.");
  } catch (error) {
    console.error("Gagal memuat dashboard:", error);

    const status = document.getElementById("dashboard-error");

    if (status) {
      status.textContent =
        "Data dashboard gagal ditampilkan. Periksa Console.";
    }
  }
}
