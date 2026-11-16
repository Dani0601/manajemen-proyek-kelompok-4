(function () {
  "use strict";

  const root = document.getElementById("player-detail");
  if (!root || !window.ApiClient) return;

  const assetBase = root.dataset.assetBase || "";
  const baseUrl = (window.APP_CONFIG && window.APP_CONFIG.baseUrl) || root.dataset.baseUrl || "";
  const HERO_LIMIT = 3; // Figma menampilkan 3 hero favorit

  // Ikon diambil dari path vektor Figma Detail_Player.svg (stroke #172B4D)
  const ICONS = {
    chart: { vb: "1059.50 544.50 61.00 63.00", d: [
      "M1066.8 606V574.235M1066.8 606H1084.2M1066.8 606H1061M1084.2 606V560.118M1084.2 606H1101.6M1101.6 606V546M1101.6 606H1119",
    ] },
    controller: { vb: "471.82 547.03 85.75 60.97", d: [
      "M489.786 548.531H539.599C542.107 548.59 544.572 549.383 546.81 550.85C549.047 552.317 550.998 554.42 552.516 557.002C554.034 559.583 555.08 562.575 555.574 565.753C556.069 568.932 556 572.214 555.373 575.353L550.391 596.81C549.864 599.052 548.892 601.076 547.572 602.681C546.252 604.286 544.629 605.416 542.865 605.958C541.102 606.501 539.259 606.437 537.521 605.773C535.782 605.109 534.209 603.869 532.957 602.175L522.994 586.082H506.39L496.428 602.175C495.176 603.869 493.602 605.109 491.864 605.773C490.126 606.437 488.283 606.501 486.519 605.958C484.756 605.416 483.133 604.286 481.813 602.681C480.493 601.076 479.52 599.052 478.994 596.81L474.012 575.353C473.385 572.214 473.316 568.932 473.81 565.753C474.305 562.575 475.351 559.583 476.869 557.002C478.387 554.42 480.338 552.317 482.575 550.85C484.812 549.383 487.278 548.59 489.786 548.531Z",
      "M493.939 564.625V575.354M493.939 575.354V586.082M493.939 575.354H485.637M493.939 575.354H502.241M533.374 569.989H533.415M543.751 580.718H543.793",
    ] },
    kill: { vb: "430.50 792.50 55.00 56.00", d: [
      "M432 794L458 820.5M458 820.5L484 847M458 820.5L484 794M458 820.5L432 847",
    ] },
    death: { vb: "429.50 913.50 61.00 68.00", d: [
      "M460 915C452.309 915 444.932 918.044 439.494 923.461C434.055 928.879 431 936.227 431 943.889V961.944C431 963.86 431.764 965.697 433.123 967.051C434.483 968.406 436.327 969.167 438.25 969.167H441.875V980H449.125V969.167H470.875V980H478.125V969.167H481.75C483.673 969.167 485.517 968.406 486.877 967.051C488.236 965.697 489 963.86 489 961.944V943.889C489 936.227 485.945 928.879 480.506 923.461C475.068 918.044 467.691 915 460 915Z",
      "M453 943.5C453 945.433 451.209 947 449 947C446.791 947 445 945.433 445 943.5C445 941.567 446.791 940 449 940C451.209 940 453 941.567 453 943.5Z",
      "M475 943.5C475 945.433 473.209 947 471 947C468.791 947 467 945.433 467 943.5C467 941.567 468.791 940 471 940C473.209 940 475 941.567 475 943.5Z",
    ] },
    assist: { vb: "424.50 1035.50 83.00 57.00", d: [
      "M448.222 1064L458 1054.1C458.457 1053.65 458.957 1053.25 459.49 1052.91M459.49 1052.91C460.897 1052.01 462.535 1051.53 464.222 1051.53C466.549 1051.53 468.783 1052.45 470.444 1054.1L472.667 1056.35C474.328 1058 476.562 1058.92 478.889 1058.92C481.216 1058.92 483.45 1058 485.111 1056.35L490.444 1050.95M459.49 1052.91L443.778 1037L426 1055L443.778 1073L461.556 1055L459.49 1052.91ZM506 1073L488.222 1091L470.444 1073L488.222 1055L506 1073Z",
    ] },
    gold: { vb: "440.50 1158.50 59.00 66.00", d: [
      "M498 1170.5C498 1176.3 485.464 1181 470 1181C454.536 1181 442 1176.3 442 1170.5C442 1164.7 454.536 1160 470 1160C485.464 1160 498 1164.7 498 1170.5Z",
      "M442 1170V1191.2M442 1191.2C442 1197.21 454.6 1201.8 470 1201.8C485.4 1201.8 498 1197.21 498 1191.2M442 1191.2V1212.4C442 1218.41 454.6 1223 470 1223C485.4 1223 498 1218.41 498 1212.4V1191.2M498 1191.2V1170",
    ] },
    damage: { vb: "440.50 1283.50 55.00 69.00", d: [
      "M471.25 1285L442 1324.6H464.75L461.5 1351L494 1308.1H471.25L474.5 1285H471.25Z",
    ] },
  };

  function icon(name) {
    const def = ICONS[name];
    if (!def) return "";
    return `<svg class="pd-icon" viewBox="${def.vb}" fill="none" aria-hidden="true"
      preserveAspectRatio="xMidYMid meet">${def.d.map((d) => `<path d="${d}"/>`).join("")}</svg>`;
  }

  const el = {
    content: document.getElementById("pd-content"),
    message: document.getElementById("pd-message"),
    skeleton: document.getElementById("pd-skeleton"),
    title: document.getElementById("pd-title"),
    back: document.getElementById("pd-back"),
    bannerImg: document.getElementById("pd-banner-img"),
    bannerFallback: document.getElementById("pd-banner-fallback"),
    teamName: document.getElementById("pd-team-name"),
    teamLogo: document.getElementById("pd-team-logo"),
    photo: document.getElementById("pd-photo"),
    main: document.getElementById("pd-main"),
    perf: document.getElementById("pd-perf"),
    heroes: document.getElementById("pd-heroes"),
  };

  function escapeHTML(value) {
    return String(value ?? "").replace(/[&<>"']/g, (c) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
    })[c]);
  }

  // API mengirim banyak angka sebagai string ("90", "14111")
  const num = (v) =>
    v === null || v === undefined || v === "" || Number.isNaN(Number(v)) ? null : Number(v);

  const show = (v) => (v === null ? "-" : v);

  // 14111 -> "14.1k", 950 -> "950"
  function compact(v) {
    const n = num(v);
    if (n === null) return "-";
    return n >= 1000 ? `${Math.round(n / 100) / 10}k` : String(Math.round(n));
  }

  // 75, 37.5 -> "75%", "37.5%"
  function percent(v) {
    const n = num(v);
    return n === null ? "-" : `${Number(n.toFixed(1))}%`;
  }

  const decimal = (v) => (num(v) === null ? "-" : num(v).toFixed(2));

  function getPlayerId() {
    const fromUrl = new URLSearchParams(window.location.search).get("id");
    const id = Number(fromUrl ?? root.dataset.playerId);
    return Number.isInteger(id) && id > 0 ? id : null;
  }

  function emptyHTML(title, sub) {
    return `
      <span class="pd-empty-state__icon" aria-hidden="true">${icon("chart")}</span>
      <strong class="pd-empty-state__title">${escapeHTML(title)}</strong>
      ${sub ? `<span class="pd-empty-state__sub">${escapeHTML(sub)}</span>` : ""}`;
  }

  function setState(state, message = "", sub = "") {
    root.dataset.state = state;
    if (el.content) el.content.hidden = state !== "ready";
    if (el.skeleton) el.skeleton.hidden = state !== "loading";
    if (el.message) {
      el.message.hidden = state === "ready" || state === "loading";
      if (state === "empty") {
        el.message.innerHTML = emptyHTML(message, sub);
      } else {
        el.message.textContent = message;
      }
    }
  }

  function normalizePlayer(payload) {
    const p = payload?.player || {};
    const s = payload?.stats || {};
    const heroes = Array.isArray(payload?.most_used_heroes) ? payload.most_used_heroes : [];
    const totalGames = num(s.total_games);

    return {
      id: p.player_id,
      name: p.player_name || "Player",
      photo: p.player_photo_url || p.photo_url || "",
      teamId: p.team_id,
      teamName: p.team_name || "",
      totalGames,
      // Sementara dihitung dari hero, sampai BE mengirim wins pemain
      wins: heroes.reduce((sum, h) => sum + (num(h.wins) || 0), 0),
      kills: num(s.total_kills),
      deaths: num(s.total_deaths),
      assists: num(s.total_assists),
      avgGold: compact(s.avg_gold_per_game),
      avgDamage: compact(s.avg_damage_per_game),
      heroes: heroes
        .map((h) => ({
          id: h.hero_id,
          name: h.hero_name || "",
          icon: h.hero_icon_url || "",
          picks: num(h.pick_count) ?? 0,
          winRate: num(h.win_rate),
          kda: num(h.avg_kda),
        }))
        .sort((a, b) => b.picks - a.picks),
      hasData: totalGames !== null && totalGames > 0,
    };
  }

  function renderHeader(player) {
    if (el.title) el.title.textContent = player.name;
    document.title = `${player.name} | MLBB Guide`;
    if (el.back && player.teamId) {
      el.back.href = `${baseUrl}/team-detail?id=${encodeURIComponent(player.teamId)}`;
    }
  }

  function renderBanner(player) {
    if (el.teamName) el.teamName.textContent = player.teamName;

    if (el.photo) {
      el.photo.alt = player.name;
      el.photo.src = player.photo;
      el.photo.hidden = !player.photo;
      el.photo.onerror = () => { el.photo.hidden = true; };
    }

    // Logo tim diambil dari endpoint tim (endpoint player tidak mengirim logo)
    if (el.teamLogo && player.teamId) {
      window.ApiClient.getTeamStats(player.teamId)
        .then((t) => {
          const src = t?.team?.logo_url;
          if (src) {
            el.teamLogo.src = src;
            el.teamLogo.alt = player.teamName;
            el.teamLogo.hidden = false;
          }
        })
        .catch(() => {});
    }

    if (el.bannerImg) {
      el.bannerImg.alt = player.teamName;
      el.bannerImg.onload = () => {
        el.bannerImg.hidden = false;
        if (el.bannerFallback) el.bannerFallback.hidden = true;
      };
      el.bannerImg.onerror = () => {
        el.bannerImg.hidden = true;
        if (el.bannerFallback) el.bannerFallback.hidden = false;
      };
      el.bannerImg.src = `${assetBase}/images/teams/banner/${player.teamId}.png`;
    }
  }

  // Statistik Utama: Total Pertandingan dan Menang
  function mainCard(iconName, label, value) {
    return `
      <div class="pd-card">
        <span class="pd-card__icon">${icon(iconName)}</span>
        <div class="pd-card__text">
          <span class="pd-card__label">${label}</span>
          <span class="pd-card__value">${escapeHTML(value)}</span>
        </div>
      </div>`;
  }

  function renderMain(player) {
    if (!el.main) return;
    el.main.innerHTML = [
      mainCard("controller", "Total Pertandingan", show(player.totalGames)),
      mainCard("chart", "Menang", player.heroes.length ? player.wins : "-"),
    ].join("");
  }

  // Statistik Performa
  function perfRow(iconName, label, value) {
    return `
      <li class="pd-row">
        <span class="pd-row__icon">${icon(iconName)}</span>
        <span class="pd-row__label">${label}</span>
        <span class="pd-row__value">${escapeHTML(value)}</span>
      </li>`;
  }

  function renderPerf(player) {
    if (!el.perf) return;
    el.perf.innerHTML = [
      perfRow("kill", "Membunuh", show(player.kills)),
      perfRow("death", "Mati", show(player.deaths)),
      perfRow("assist", "Bantuan", show(player.assists)),
      perfRow("gold", "Rata-rata Emas/Permainan", player.avgGold),
      perfRow("damage", "Rata-rata Kerusakan/Permainan", player.avgDamage),
    ].join("");
  }

  // Hero Favorit
  function renderHeroes(player) {
    if (!el.heroes) return;
    const list = player.heroes.slice(0, HERO_LIMIT);

    if (list.length === 0) {
      el.heroes.innerHTML = `<li class="pd-empty">Data hero belum tersedia</li>`;
      return;
    }

    el.heroes.innerHTML = list.map((h) => `
      <li class="pd-hero">
        <a class="pd-hero__link" href="${escapeHTML(baseUrl)}/hero-detail?id=${encodeURIComponent(h.id)}"
           aria-label="Lihat detail hero ${escapeHTML(h.name)}">
          <img class="pd-hero__icon" src="${escapeHTML(h.icon)}" alt="" loading="lazy"
               onerror="this.onerror=null;this.style.visibility='hidden'">
          <span class="pd-hero__info">
            <span class="pd-hero__name">${escapeHTML(h.name)}</span>
            <span class="pd-hero__meta">
              <span>Dipilih: ${escapeHTML(h.picks)}</span>
              <span>Rasio Menang: ${escapeHTML(percent(h.winRate))}</span>
              <span>KDA: ${escapeHTML(decimal(h.kda))}</span>
            </span>
          </span>
          <svg class="pd-hero__chev" viewBox="0 0 24 24" fill="none" stroke="currentColor"
               stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path d="M9 5l7 7-7 7"></path>
          </svg>
        </a>
      </li>`).join("");
  }

  async function load() {
    const playerId = getPlayerId();
    if (!playerId) {
      setState("empty", "Pemain belum dipilih.");
      return;
    }

    setState("loading");

    try {
      const player = normalizePlayer(await window.ApiClient.getPlayerStats(playerId));

      renderHeader(player);

      if (!player.id || !player.hasData) {
        setState("empty", "Data belum tersedia", "Statistik pemain ini belum tersedia.");
        return;
      }

      renderBanner(player);
      renderMain(player);
      renderPerf(player);
      renderHeroes(player);
      setState("ready");
    } catch (err) {
      console.error("[PlayerDetail]", err);
      setState(
        "error",
        err.status === 404
          ? "Pemain tidak ditemukan."
          : "Gagal memuat data pemain. Periksa koneksi lalu muat ulang halaman."
      );
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", load);
  } else {
    load();
  }
})();