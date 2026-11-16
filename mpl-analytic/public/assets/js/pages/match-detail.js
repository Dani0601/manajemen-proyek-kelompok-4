(function () {
  "use strict";

  const root = document.getElementById("match-detail");
  if (!root || !window.ApiClient || !window.MatchMapper) return;

  const MONTHS = ["JAN", "FEB", "MAR", "APR", "MEI", "JUN", "JUL", "AGT", "SEP", "OKT", "NOV", "DES"];

  const el = {
    content: document.getElementById("md-content"),
    message: document.getElementById("md-message"),
    skeleton: document.getElementById("md-skeleton"),
    back: document.getElementById("md-back"),
    logo: [document.getElementById("md-logo1"), document.getElementById("md-logo2")],
    code: [document.getElementById("md-code1"), document.getElementById("md-code2")],
    score: document.getElementById("md-score"),
    when: document.getElementById("md-when"),
    games: document.getElementById("md-games"),
    tabs: [...document.querySelectorAll(".md-tab")],
    panelStats: document.getElementById("md-panel-stats"),
    panelHero: document.getElementById("md-panel-hero"),
  };

  // durations: { [game_id]: nilai duration dari GET /games/{id} }
  const state = { match: null, game: 0, tab: "stats", durations: {} };

  // ===== Util =====
  function escapeHTML(value) {
    return String(value ?? "").replace(/[&<>"']/g, (c) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
    })[c]);
  }
  const fmtNum = (n) =>
    n === null || n === undefined ? "-" : new Intl.NumberFormat("id-ID").format(n)
    // 54200 -> "54.2k". Dipakai untuk kartu ringkasan Gold, Damage, Damage Taken.
  const fmtK = (n) =>
    n === null || n === undefined ? "-" : `${(n / 1000).toFixed(1)}k`;
  
  const sum = (list, key) => list.reduce((t, p) => t + (p[key] ?? 0), 0);

  // Satuan duration belum terkonfirmasi (masih null). Asumsi sementara: detik.
  function fmtDuration(v) {
    if (v === null || v === undefined || Number.isNaN(Number(v))) return "-";
    const s = Math.round(Number(v));
    return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
  }

  function getMatchId() {
    const id = new URLSearchParams(window.location.search).get("id") ?? root.dataset.matchId;
    return /^[A-Za-z0-9_-]+$/.test(id || "") ? id : null;
  }

  function setState(name, message = "") {
    root.dataset.state = name;
    if (el.skeleton) el.skeleton.hidden = name !== "loading";
    if (el.content) el.content.hidden = name !== "ready";
    if (el.message) {
      const show = name === "empty" || name === "error";
      el.message.hidden = !show;
      el.message.textContent = show ? message : "";
    }
  }

  // ===== Header =====
  // "WEEK 6, 19 SEP - 20:00"
  function whenLabel(m) {
    const d = new Date(`${m.date}T00:00:00`);
    const day = Number.isNaN(d.getTime()) ? "" : `${d.getDate()} ${MONTHS[d.getMonth()]}`;
    const dateTime = [day, m.time].filter(Boolean).join(" - ");
    return [m.week ? `WEEK ${m.week}` : "", dateTime].filter(Boolean).join(", ");
  }

  function renderHeader(m) {
    const [t1, t2] = m.teams;
    [t1, t2].forEach((t, i) => {
      el.code[i].textContent = t.code || t.name;
      el.logo[i].alt = t.name;
      el.logo[i].onerror = () => { el.logo[i].hidden = true; };
      el.logo[i].src = t.logo;
      el.logo[i].hidden = !t.logo;
    });
    el.score.textContent = `${t1.score} - ${t2.score}`;
    el.when.textContent = whenLabel(m);
    document.title = `${t1.code || t1.name} vs ${t2.code || t2.name} | MLBB Guide`;
  }

  // ===== Pemilih game & tab =====
  // Tombol dibuat dari games[], tampil hanya untuk match multi-game
  function renderGames() {
    const games = state.match.games;
    el.games.hidden = games.length <= 1;
    el.games.innerHTML = games.map((g, i) => `
      <button type="button" class="md-game${i === state.game ? " is-active" : ""}"
              data-game="${i}" aria-pressed="${i === state.game}">Game ${escapeHTML(g.number)}</button>`).join("");
  }

  function renderTabs() {
    el.tabs.forEach((btn) => {
      const on = btn.dataset.tab === state.tab;
      btn.classList.toggle("is-active", on);
      btn.setAttribute("aria-selected", String(on));
    });
    el.panelStats.hidden = state.tab !== "stats";
    el.panelHero.hidden = state.tab !== "hero";
  }

  // ===== Tab Hero =====
  function heroCell(h) {
    return `
      <li class="md-hcell">
        <img class="md-hcell__icon" src="${escapeHTML(h.icon)}" alt="" loading="lazy"
             onerror="this.onerror=null;this.style.visibility='hidden'">
        <span class="md-hcell__name">${escapeHTML(h.name)}</span>
      </li>`;
  }

  function heroPanel(team, label, heroes) {
    const list = heroes.filter((h) => h && (h.id !== null || h.name));
    const logo = team.logo
      ? `<img class="md-hpanel__logo" src="${escapeHTML(team.logo)}" alt="" onerror="this.style.display='none'">`
      : "";
    const body = list.length
      ? `<ul class="md-hlist">${list.map(heroCell).join("")}</ul>`
      : `<div class="md-nodata">
           <span class="md-nodata__icon" aria-hidden="true"></span>
           <strong>Data belum tersedia</strong>
           <span>Hero yang digunakan pertandingan ini belum tersedia</span>
         </div>`;

    return `
      <section class="md-hpanel" aria-label="${escapeHTML(team.code)} ${escapeHTML(label)}">
        <header class="md-hpanel__head">${logo}<span>${escapeHTML(team.code || team.name)} (${escapeHTML(label)})</span></header>
        ${body}
      </section>`;
  }

  function renderHeroPanel(game) {
    const [t1, t2] = state.match.teams;
    const bansOf = (t) => game.bans.filter((b) => b.teamId === t.id).map((b) => b.hero);
    const picksOf = (i) => game.byTeam[i].map((p) => p.hero);

    el.panelHero.innerHTML = `
      <div class="md-hgrid">
        ${heroPanel(t1, "Ban", bansOf(t1))}
        ${heroPanel(t2, "Ban", bansOf(t2))}
        ${heroPanel(t1, "Pick", picksOf(0))}
        ${heroPanel(t2, "Pick", picksOf(1))}
      </div>`;
  }

  // ===== Tab Statistik =====
  function statsTeamTable(team, players, mirror = false) {
    const cell = {
      player: (p) => `
        <td class="md-s__player">
          <span class="md-s__who">
            <img class="md-s__photo" src="${escapeHTML(p.photo)}" alt="" loading="lazy"
                 onerror="this.onerror=null;this.style.visibility='hidden'">
            <span>${escapeHTML(p.name)}</span>
          </span>
        </td>`,
      hero: (p) => `
        <td>
          <span class="md-s__build">
            <img class="md-s__hero" src="${escapeHTML(p.hero.icon)}" alt="${escapeHTML(p.hero.name)}"
                 loading="lazy" onerror="this.onerror=null;this.style.visibility='hidden'">
            ${p.items.map((i) => `
              <img class="md-s__item" src="${escapeHTML(i.icon)}" alt="${escapeHTML(i.name)}"
                   title="${escapeHTML(i.name)}" loading="lazy"
                   onerror="this.onerror=null;this.style.visibility='hidden'">`).join("")}
          </span>
        </td>`,
      kda3: (p) => `<td>${p.kills}/${p.deaths}/${p.assists}</td>`,
      kda: (p) => `<td>${p.kda.toFixed(2)}</td>`,
      gold: (p) => `<td>${fmtNum(p.gold)}</td>`,
      dmg: (p) => `<td>${fmtNum(p.damage)}</td>`,
      taken: (p) => `<td>${fmtNum(p.damageTaken)}</td>`,
    };

    const heads = {
      player: "Pemain", hero: "Hero", kda3: "K/D/A", kda: "KDA",
      gold: "Gold", dmg: "DMG", taken: "Taken",
    };

    // Tim 1: Pemain di kiri. Tim 2: urutan dibalik, Pemain di kanan.
    let order = ["player", "hero", "kda3", "kda", "gold", "dmg", "taken"];
    if (mirror) order = [...order].reverse();

    const thead = order.map((k) => `<th>${heads[k]}</th>`).join("");
    const rows = players
      .map((p) => `<tr>${order.map((k) => cell[k](p)).join("")}</tr>`)
      .join("");

    return `
      <section class="md-s__team${mirror ? " is-mirror" : ""}" aria-label="${escapeHTML(team.code || team.name)}">
        <header class="md-s__head">
          <span>${escapeHTML(team.code || team.name)}</span>
          <span>Kills ${sum(players, "kills")}</span>
        </header>
        <div class="md-s__scroll">
          <table class="md-s__table">
            <thead><tr>${thead}</tr></thead>
            <tbody>${rows}</tbody>
          </table>
        </div>
      </section>`;
  }

  function renderStatsPanel(game) {
    if (!game.hasData) {
      el.panelStats.innerHTML = `
        <div class="md-nodata">
          <span class="md-nodata__icon" aria-hidden="true"></span>
          <strong>Statistik Belum Tersedia</strong>
          <span>Data statistik pertandingan ini belum tersedia, silakan coba kembali.</span>
        </div>`;
      return;
    }

        const [t1, t2] = state.match.teams;
    const [p1, p2] = game.byTeam;

    const pair = (key, f = fmtNum) => `${f(sum(p1, key))} - ${f(sum(p2, key))}`;
    const values = {
      duration: fmtDuration(state.durations[game.id]),
      kill: pair("kills"),
      gold: pair("gold", fmtK),
      damage: pair("damage", fmtK),
      taken: pair("damageTaken", fmtK),
    };

    // Salin kartu dari template di PHP, lalu isi angkanya
    const holder = document.createElement("div");
    const tpl = document.getElementById("md-cards-tpl");
    if (tpl) {
      holder.appendChild(tpl.content.cloneNode(true));
      holder.querySelectorAll("[data-key]").forEach((n) => {
        n.textContent = values[n.dataset.key] ?? "-";
      });
    }

    el.panelStats.innerHTML = `
      ${holder.innerHTML}
      ${statsTeamTable(t1, p1, false)}
      ${statsTeamTable(t2, p2, true)}`;
  }

  // Durasi hanya ada di GET /games/{id}. Gagal memuat bukan error: durasi tetap "-".
  async function loadDuration(game) {
    if (!game.id || game.id in state.durations) return;
    try {
      const detail = await window.ApiClient.getGameDetail(game.id);
      state.durations[game.id] = detail?.duration ?? null;
      const active = state.match && state.match.games[state.game];
      if (active && active.id === game.id) renderStatsPanel(active); // abaikan kalau sudah pindah game
    } catch (err) {
      console.warn("[MatchDetail] durasi", err);
    }
  }

  function renderPanels() {
    const game = state.match.games[state.game];
    renderStatsPanel(game);
    renderHeroPanel(game);
    loadDuration(game);
  }

  // ===== Interaksi =====
  function setActiveGame(index) {
    if (!state.match || index < 0 || index >= state.match.games.length) return;
    state.game = index;
    renderGames();
    renderPanels();
  }

  function setTab(tab) {
    state.tab = tab === "hero" ? "hero" : "stats";
    renderTabs();
  }

  el.games.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-game]");
    if (btn) setActiveGame(Number(btn.dataset.game));
  });
  el.tabs.forEach((btn) => btn.addEventListener("click", () => setTab(btn.dataset.tab)));
  if (el.back) {
    el.back.addEventListener("click", (e) => {
      if (document.referrer.startsWith(window.location.origin) && history.length > 1) {
        e.preventDefault();
        history.back();
      }
    });
  }

  // ===== Muat data =====
  async function load() {
    const matchId = getMatchId();
    if (!matchId) {
      setState("empty", "Pertandingan belum dipilih.");
      return;
    }

    setState("loading");

    try {
      const match = window.MatchMapper.normalize(await window.ApiClient.getMatchDetail(matchId));

      if (!match.id) {
        setState("empty", "Pertandingan tidak ditemukan.");
        return;
      }
      if (match.games.length === 0) {
        setState("empty", "Data game belum tersedia.");
        return;
      }

      const warnings = window.MatchMapper.validate(match);
      if (warnings.length) console.warn("[MatchDetail] peringatan data", warnings);

      state.match = match;
      state.game = 0;
      state.tab = "stats";
      renderHeader(match);
      renderGames();
      renderTabs();
      renderPanels();
      setState("ready");
    } catch (err) {
      console.error("[MatchDetail]", err);
      setState(
        "error",
        err.status === 404
          ? "Pertandingan tidak ditemukan."
          : "Gagal memuat pertandingan. Periksa koneksi lalu muat ulang halaman."
      );
    }
  }

  window.MatchDetailPage = { setActiveGame, setTab, getState: () => state };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", load);
  } else {
    load();
  }
})();