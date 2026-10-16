
console.log("dashboard.js berhasil dijalankan");

document.addEventListener("DOMContentLoaded", loadDashboard);

async function loadDashboard() {
  try {
    const data = await window.ApiClient.getDashboard();

    console.log("Dashboard berhasil dimuat:", data);

    // Ambil elemen HTML
    const topOverpowered = document.getElementById("topOverpowered");
    const topMostBanned = document.getElementById("topMostBanned");
    const matchList = document.getElementById("matchList");

    // Format angka persen dari API
    // Nilai API sudah dalam persen, jadi jangan dikali 100.
    const formatPercent = (value) => {
      const number = Number(value);
      return Number.isFinite(number) ? `${number.toFixed(2)}%` : "-";
    };

    // Render kartu hero
    function renderHeroes(container, heroes, rateKey, prefix) {
      if (!container) return;

      if (!Array.isArray(heroes) || heroes.length === 0) {
        container.innerHTML = "<p>Data hero belum tersedia.</p>";
        return;
      }

      container.innerHTML = heroes.slice(0, 5).map((hero, index) => `
        <div class="hero-card">
          <div class="hero-image-wrapper">
            <span class="rank-badge">${index + 1}</span>
            <img
              src="${hero.hero_url || "https://placehold.co/70x70"}"
              alt="${hero.hero_name || "Hero"}"
              class="hero-image"
              onerror="this.onerror=null;this.src='https://placehold.co/70x70';"
            >
          </div>
          <div class="hero-name">${hero.hero_name || "-"}</div>
          <div class="hero-rate">
            ${prefix} ${formatPercent(hero[rateKey])}
          </div>
        </div>
      `).join("");
    }

    // Top 5 berdasarkan win rate
    const topWR = Array.isArray(data.top_win_rate)
      ? data.top_win_rate
      : [];

    renderHeroes(topOverpowered, topWR, "win_rate", "WR");

    // Fallback daftar ban rate dari hero_meta
    const metaHeroes = Array.isArray(data.hero_meta)
      ? data.hero_meta
      : [];

    const topBR = [...metaHeroes].sort(
      (a, b) => Number(b.ban_rate || 0) - Number(a.ban_rate || 0)
    );

    renderHeroes(topMostBanned, topBR, "ban_rate", "BR");

    // Grafik WR dan BR
    const chartElement = document.getElementById("wrBrChart");

    if (chartElement && window.Chart) {
      const chartLabels = [
        ...new Set([
          ...topWR.map(hero => hero.hero_name),
          ...topBR.slice(0, 5).map(hero => hero.hero_name)
        ])
      ];

      if (window.dashboardChart) {
        window.dashboardChart.destroy();
      }

      window.dashboardChart = new Chart(chartElement, {
        type: "bar",
        data: {
          labels: chartLabels,
          datasets: [
            {
              label: "Win Rate (WR)",
              data: chartLabels.map(name => {
                const hero = topWR.find(h => h.hero_name === name);
                return hero ? Number(hero.win_rate) : null;
              }),
              backgroundColor: "#2874d0"
            },
            {
              label: "Ban Rate (BR)",
              data: chartLabels.map(name => {
                const hero = topBR.find(h => h.hero_name === name);
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
                callback: value => `${value}%`
              }
            }
          }
        }
      });
    }

    // Tampilkan jadwal API untuk diperiksa

function renderMatches(matches) {
  const matchList = document.getElementById("matchList");

  if (!matchList) {
    console.error('Elemen "#matchList" tidak ditemukan di HTML.');
    return;
  }

  if (!Array.isArray(matches) || matches.length === 0) {
    matchList.innerHTML = "<p>Belum ada jadwal pertandingan.</p>";
    return;
  }

  matchList.innerHTML = matches.map((match) => {
    const date = match.match_date
      ? new Date(`${match.match_date}T00:00:00`).toLocaleDateString("id-ID", {
          day: "2-digit",
          month: "short",
          year: "numeric"
        })
      : "-";

    const time = match.match_time
      ? match.match_time.slice(0, 5)
      : "-";

    return `
      <div class="match-card">
        <div class="match-date">${date}</div>

        <div class="match-team team-left">
          <span>${match.team1_name || "Tim 1"}</span>
        </div>

        <div class="match-info">
          <span class="match-time">${time} WIB</span>
          <span class="match-status">${match.status || ""}</span>
        </div>

        <div class="match-team team-right">
          <span>${match.team2_name || "Tim 2"}</span>
        </div>
      </div>
    `;
  }).join("");
}

// Panggil di dalam loadDashboard(), setelah data API berhasil diterima:
renderMatches(data.schedule);


    // Belum merender jadwal karena perlu memastikan
    // nama field tim dan waktu pada objek schedule.
  } catch (error) {
    console.error("Gagal memuat dashboard:", error);
  }
}
