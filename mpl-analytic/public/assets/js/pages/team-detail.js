(function () {
  "use strict";

  const root = document.getElementById("team-detail");
  if (!root || !window.ApiClient) return;

  const assetBase = root.dataset.assetBase || "";
  const baseUrl = (window.APP_CONFIG && window.APP_CONFIG.baseUrl) || root.dataset.baseUrl || "";
  // Ikon diambil langsung dari path vektor Figma Detail_Team.svg (stroke #192F53, 1.8)
  // viewBox per ikon mengikuti kotak asli di Figma.
  const ICONS = {
    matches: { vb: "38.00 272.08 34.00 34.00", d: [
      "M42.5556 277.076H67.4444C69.4081 277.076 71 278.643 71 280.576V301.576C71 303.509 69.4081 305.076 67.4444 305.076H42.5556C40.5919 305.076 39 303.509 39 301.576V280.576C39 278.643 40.5919 277.076 42.5556 277.076Z",
      "M62.1111 273.076V280.219M47.8889 273.076V280.219M39 285.576H71M46.1111 292.719H49.6667M55 292.719H58.5556M63.8889 292.719H63.9067M46.1111 298.076H49.6667M55 298.076H58.5556",
    ] },
    trophy: { vb: "240.00 274.08 36.00 35.00", d: [
      "M249.5 308.076H258M258 308.076H266.5M258 308.076V300.311M247.375 275.076H268.625V284.782C268.625 287.356 267.506 289.825 265.513 291.645C263.52 293.465 260.818 294.488 258 294.488C255.182 294.488 252.48 293.465 250.487 291.645C248.494 289.825 247.375 287.356 247.375 284.782V275.076Z",
      "M247.375 278.959H241V282.841C241 284.901 241.896 286.876 243.49 288.332C245.084 289.788 247.246 290.606 249.5 290.606M268.625 278.959H275V282.841C275 284.901 274.104 286.876 272.51 288.332C270.916 289.788 268.754 290.606 266.5 290.606",
      "M258 278.959L260.125 282.841L264.375 283.424L261.188 286.141L262.037 290.024L258 288.083L253.963 290.024L254.812 286.141L251.625 283.424L255.875 282.841L258 278.959Z",
    ] },
    close: { vb: "38.00 357.08 34.00 34.00", d: [
      "M71 374.076C71 382.913 63.8366 390.076 55 390.076C46.1634 390.076 39 382.913 39 374.076C39 365.24 46.1634 358.076 55 358.076C63.8366 358.076 71 365.24 71 374.076Z",
      "M49.666 368.742L54.9993 374.076M54.9993 374.076L60.3327 379.409M54.9993 374.076L60.3327 368.742M54.9993 374.076L49.666 379.409",
    ] },
    chart: { vb: "246.00 361.08 30.00 26.00", d: [
      "M249.8 386.076V373.37M249.8 386.076H258.2M249.8 386.076H247M258.2 386.076V367.723M258.2 386.076H266.6M266.6 386.076V362.076M266.6 386.076H275",
    ] },
    controller: { vb: "41.92 490.08 42.16 25.07", d: [
      "M50.912 491.076H75.088C76.3054 491.1 77.502 491.415 78.5879 491.999C79.6737 492.583 80.6206 493.42 81.3573 494.447C82.0941 495.474 82.6016 496.665 82.8417 497.93C83.0819 499.195 83.0484 500.501 82.7438 501.751L80.3262 510.29C80.0704 511.182 79.5987 511.988 78.9578 512.627C78.317 513.265 77.5294 513.715 76.6735 513.931C75.8177 514.147 74.9233 514.122 74.0796 513.857C73.2359 513.593 72.4722 513.099 71.8645 512.425L67.0293 506.02H58.9707L54.1355 512.425C53.5278 513.099 52.7641 513.593 51.9204 513.857C51.0767 514.122 50.1823 514.147 49.3265 513.931C48.4706 513.715 47.683 513.265 47.0422 512.627C46.4013 511.988 45.9296 511.182 45.6738 510.29L43.2562 501.751C42.9516 500.501 42.9181 499.195 43.1583 497.93C43.3984 496.665 43.9059 495.474 44.6427 494.447C45.3794 493.42 46.3263 492.583 47.4121 491.999C48.498 491.415 49.6946 491.1 50.912 491.076Z",
      "M52.9268 497.48V501.75M52.9268 501.75V506.02M52.9268 501.75H48.8975M52.9268 501.75H56.9561M72.0662 499.615H72.0863M77.1028 503.885H77.123",
    ] },
    trophyGame: { vb: "45.00 539.08 36.00 35.00", d: [
      "M54.5 573.076H63M63 573.076H71.5M63 573.076V565.311M52.375 540.076H73.625V549.782C73.625 552.356 72.5056 554.825 70.513 556.645C68.5204 558.465 65.8179 559.488 63 559.488C60.1821 559.488 57.4796 558.465 55.487 556.645C53.4944 554.825 52.375 552.356 52.375 549.782V540.076Z",
      "M52.375 543.959H46V547.841C46 549.901 46.8955 551.876 48.4896 553.332C50.0837 554.788 52.2457 555.606 54.5 555.606M73.625 543.959H80V547.841C80 549.901 79.1045 551.876 77.5104 553.332C75.9163 554.788 73.7543 555.606 71.5 555.606",
      "M63 543.959L65.125 547.841L69.375 548.424L66.1875 551.141L67.0375 555.024L63 553.083L58.9625 555.024L59.8125 551.141L56.625 548.424L60.875 547.841L63 543.959Z",
    ] },
    closeGame: { vb: "45.00 591.08 34.00 34.00", d: [
      "M78 608.076C78 616.913 70.8366 624.076 62 624.076C53.1634 624.076 46 616.913 46 608.076C46 599.24 53.1634 592.076 62 592.076C70.8366 592.076 78 599.24 78 608.076Z",
      "M56.666 602.742L61.9993 608.076M61.9993 608.076L67.3327 613.409M61.9993 608.076L67.3327 602.742M61.9993 608.076L56.666 613.409",
    ] },
    chartGame: { vb: "48.00 649.08 30.00 26.00", d: [
      "M51.8 674.076V661.37M51.8 674.076H60.2M51.8 674.076H49M60.2 674.076V655.723M60.2 674.076H68.6M68.6 674.076V650.076M68.6 674.076H77",
    ] },
    clock: { vb: "48.00 695.08 27.00 31.69", d: [
      "M74 713.264C74 720.167 68.4036 725.764 61.5 725.764C54.5964 725.764 49 720.167 49 713.264C49 706.36 54.5964 700.764 61.5 700.764C68.4036 700.764 74 706.36 74 713.264Z",
      "M61.5 707.014V713.264L66.1875 716.389M56.8125 696.076H61.5M61.5 696.076H66.1875M61.5 696.076V700.764",
    ] },
    sword: { vb: "48.00 746.08 39.00 31.00", d: [
      "M71.6111 748.687L83.9444 758.354M51.0556 774.465L53.1111 772.854L55.1667 771.243M55.1667 771.243L65.4444 763.187M55.1667 771.243L49 766.41M55.1667 771.243L61.3333 776.076M69.5556 750.298L81.8889 759.965M73.6667 747.076L86 756.743",
    ] },
    skull: { vb: "46.00 804.08 30.42 33.00", d: [
      "M61.2083 805.076C57.44 805.076 53.8261 806.383 51.1615 808.708C48.4969 811.033 47 814.187 47 817.476V823.676C47 826.965 48.4969 830.119 51.1615 832.444C53.8261 834.77 57.44 836.076 61.2083 836.076C64.9766 836.076 68.5906 834.77 71.2551 832.444C73.9197 830.119 75.4167 826.965 75.4167 823.676V817.476C75.4167 814.187 73.9197 811.033 71.2551 808.708C68.5906 806.383 64.9766 805.076 61.2083 805.076Z",
      "M58.0105 817.476C58.0105 818.503 57.0564 819.336 55.8793 819.336C54.7022 819.336 53.748 818.503 53.748 817.476C53.748 816.449 54.7022 815.616 55.8793 815.616C57.0564 815.616 58.0105 816.449 58.0105 817.476Z",
      "M68.6668 817.476C68.6668 818.503 67.7126 819.336 66.5355 819.336C65.3585 819.336 64.4043 818.503 64.4043 817.476C64.4043 816.449 65.3585 815.616 66.5355 815.616C67.7126 815.616 68.6668 816.449 68.6668 817.476Z",
      "M57.6562 825.227H64.7604M59.4323 829.877V831.427M62.9844 829.877V831.427",
    ] },
  };

  function icon(name, color = "#192F53") {
    const def = ICONS[name];
    if (!def) return "";
    const paths = def.d
      .map((d) => `<path d="${d}"/>`)
      .join("");
    return `<svg class="td-icon" viewBox="${def.vb}" fill="none" stroke="${color}" stroke-width="1.8"
      stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" preserveAspectRatio="xMidYMid meet">${paths}</svg>`;
  }

  const el = {
    content: document.getElementById("td-content"),
    message: document.getElementById("td-message"),
    bannerImg: document.getElementById("td-banner-img"),
    bannerFallback: document.getElementById("td-banner-fallback"),
    logo: document.getElementById("td-logo"),
    name: document.getElementById("td-name"),
    summary: document.getElementById("td-summary"),
    gameStats: document.getElementById("td-game-stats"),
    roster: document.getElementById("td-roster"),
  };

  function escapeHTML(value) {
    return String(value ?? "").replace(/[&<>"']/g, (c) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
    })[c]);
  }

  // 100, 62.5, 92.31 tanpa nol di belakang
  function formatPercent(value) {
    if (value == null || Number.isNaN(Number(value))) return "-";
    return `${Number(Number(value).toFixed(2))}%`;
  }

  // 957 detik menjadi 15:57
  function formatDuration(seconds) {
    const total = Math.round(Number(seconds) || 0);
    const m = Math.floor(total / 60);
    const s = String(total % 60).padStart(2, "0");
    return `${m}:${s}`;
  }

  function formatDecimal(value) {
    if (value == null || Number.isNaN(Number(value))) return "-";
    return Number(value).toFixed(1);
  }

  function getTeamId() {
    const fromUrl = new URLSearchParams(window.location.search).get("id");
    const id = Number(fromUrl ?? root.dataset.teamId);
    return Number.isInteger(id) && id > 0 ? id : null;
  }

  function setState(state, message = "") {
    root.dataset.state = state;
    if (el.content) el.content.hidden = state !== "ready";
    if (el.message) {
      el.message.hidden = state === "ready";
      el.message.textContent = message;
    }
  }

  function normalizeTeamStats(data) {
    const team = data?.team || {};
    const matches = data?.stats?.matches || {};
    const games = data?.stats?.games || {};
    return {
      id: team.team_id,
      name: team.team_name || "Tim",
      logo: team.logo_url || "",
      matches: {
        total: Number(matches.total ?? 0),
        wins: Number(matches.wins ?? 0),
        losses: Number(matches.losses ?? 0),
        winRate: matches.win_rate == null ? null : Number(matches.win_rate),
      },
      games: {
        total: Number(games.total ?? 0),
        wins: Number(games.wins ?? 0),
        losses: Number(games.losses ?? 0),
        winRate: games.win_rate == null ? null : Number(games.win_rate),
        avgDuration: games.avg_duration_seconds ?? null,
        avgKills: games.avg_kills_per_game ?? null,
        avgDeaths: games.avg_deaths_per_game ?? null,
      },
      players: (data?.players || []).map((p) => ({
        id: p.player_id,
        name: p.player_name || "",
        photo: p.player_photo_url || p.photo_url || "",
        role: p.role || p.player_role || p.position || "",
      })),
    };
  }

  function renderBanner(team) {
    if (el.name) el.name.textContent = team.name;

    if (el.logo) {
      el.logo.alt = team.name;
      el.logo.src = team.logo;
      el.logo.hidden = !team.logo;
      el.logo.onerror = () => { el.logo.hidden = true; };
    }

    if (el.bannerImg) {
      el.bannerImg.alt = team.name;
      el.bannerImg.onload = () => {
        el.bannerImg.hidden = false;
        if (el.bannerFallback) el.bannerFallback.hidden = true;
      };
      el.bannerImg.onerror = () => {
        el.bannerImg.hidden = true;
        if (el.bannerFallback) el.bannerFallback.hidden = false;
      };
      el.bannerImg.src = `${assetBase}/images/teams/banner/${team.id}.png`;
    }
  }

  // Kartu ringkasan: ikon di kiri, label dan nilai di kanan. Kartu Rasio berwarna biru.
  function summaryCard(iconName, label, value, accent = false) {
    const color = accent ? "#2F6FED" : "#192F53";
    return `
      <div class="td-card">
        <span class="td-card__icon">${icon(iconName, color)}</span>
        <div class="td-card__text">
          <span class="td-card__label">${label}</span>
          <span class="td-card__value${accent ? " td-card__value--accent" : ""}">${escapeHTML(value)}</span>
        </div>
      </div>`;
  }

  function renderSummary(m) {
    if (!el.summary) return;
    el.summary.innerHTML = [
      summaryCard("matches", "Total Pertandingan", m.total),
      summaryCard("trophy", "Menang", m.wins),
      summaryCard("close", "Kalah", m.losses),
      summaryCard("chart", "Rasio Menang Pertandingan", formatPercent(m.winRate), true),
    ].join("");
  }

  function gameRow(iconName, label, value) {
    return `
      <li class="td-row">
        <span class="td-row__icon">${icon(iconName)}</span>
        <span class="td-row__label">${label}</span>
        <span class="td-row__value">${escapeHTML(value)}</span>
      </li>`;
  }

  function renderGameStats(g) {
    if (!el.gameStats) return;
    if (g.total === 0) {
      el.gameStats.innerHTML = `<li class="td-empty">Data statistik game belum tersedia</li>`;
      return;
    }
    el.gameStats.innerHTML = [
      gameRow("controller", "Total Game", g.total),
      gameRow("trophyGame", "Game Menang", g.wins),
      gameRow("closeGame", "Game Kalah", g.losses),
      gameRow("chartGame", "Rasio Menang Permainan", formatPercent(g.winRate)),
      gameRow("clock", "Rata-rata Durasi Game", formatDuration(g.avgDuration)),
      gameRow("sword", "Rata-rata Kill per Game", formatDecimal(g.avgKills)),
      gameRow("skull", "Rata-rata Death per Game", formatDecimal(g.avgDeaths)),
    ].join("");
  }

  // Kartu pemain sesuai Figma: foto kotak, nama dan peran di overlay gradien navy
    function renderRoster(players) {
    if (!el.roster) return;
    if (players.length === 0) {
      el.roster.innerHTML = `<li class="td-empty">Roster belum tersedia</li>`;
      return;
    }
    el.roster.innerHTML = players.map((p) => `
      <li class="td-player">
        <a class="td-player__link"
           href="${escapeHTML(baseUrl)}/player-detail?id=${encodeURIComponent(p.id)}"
           aria-label="Lihat detail ${escapeHTML(p.name)}">
          <div class="td-player__media">
            <img class="td-player__photo" src="${escapeHTML(p.photo)}" alt="${escapeHTML(p.name)}"
                 loading="lazy" onerror="this.onerror=null;this.hidden=true">
            <div class="td-player__overlay">
              <span class="td-player__name">${escapeHTML(p.name)}</span>
              ${p.role ? `<span class="td-player__role">${escapeHTML(p.role)}</span>` : ""}
            </div>
          </div>
        </a>
      </li>`).join("");
  }

  async function load() {
    const teamId = getTeamId();
    if (!teamId) {
      setState("empty", "Tim belum dipilih.");
      return;
    }

    setState("loading", "Memuat data tim...");

    try {
      const team = normalizeTeamStats(await window.ApiClient.getTeamStats(teamId));

      if (!team.id || team.matches.total === 0) {
        setState("empty", "Data belum tersedia.");
        return;
      }

      renderBanner(team);
      renderSummary(team.matches);
      renderGameStats(team.games);
      renderRoster(team.players);
      setState("ready");
    } catch (err) {
      console.error("[TeamDetail]", err);
      setState(
        "error",
        err.status === 404
          ? "Tim tidak ditemukan."
          : "Gagal memuat data tim. Periksa koneksi lalu muat ulang halaman."
      );
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", load);
  } else {
    load();
  }
})();