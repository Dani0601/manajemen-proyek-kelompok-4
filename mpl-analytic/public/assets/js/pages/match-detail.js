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

  const state = { match: null, game: 0, tab: "stats", drafts: {} };

  // ===== Util =====
  function escapeHTML(value) {
    return String(value ?? "").replace(/[&<>"']/g, (c) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
    })[c]);
  }
  const fmtNum = (n) =>
    n === null || n === undefined ? "-" : new Intl.NumberFormat("en-US").format(n)
    // 54200 -> "54.2k". Dipakai untuk kartu ringkasan Gold, Damage, Damage Taken.
  const fmtK = (n) =>
    n === null || n === undefined ? "-" : `${(n / 1000).toFixed(1)}k`;
  
  const sum = (list, key) => list.reduce((t, p) => t + (p[key] ?? 0), 0);

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
        <header class="md-hpanel__head">${logo}<span>${escapeHTML(team.code || team.name)} ( ${escapeHTML(label)} )</span></header>
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
        ${heroPanel(t1, "Pick", picksOf(0))}
        ${heroPanel(t2, "Ban", bansOf(t2))}
        ${heroPanel(t2, "Pick", picksOf(1))}
      </div>
      <section id="md-draft" class="md-draft" aria-labelledby="md-draft-title"></section>`;
    loadDraft(game);
  }

  // ===== Data Draft Pick (card 13.1): GET /api/games/{id}/drafts =====
  // Field BE: pick_ban_turn, type (ban|pick), team_id, team_name, team_side (blue|red),
  //           hero_id, hero_name, hero_image_url
  const SIDE_LABEL = { blue: "Tim Biru", red: "Tim Merah" };

  function normalizeDrafts(payload) {
    const rows = Array.isArray(payload && payload.drafts) ? payload.drafts : [];
    return rows
      .map((d) => ({
        turn: Number(d.pick_ban_turn) || 0,
        type: String(d.type).toLowerCase() === "pick" ? "pick" : "ban",
        teamId: d.team_id === null || d.team_id === undefined ? null : Number(d.team_id),
        teamName: d.team_name || "",
        side: d.team_side === "red" ? "red" : "blue",
        hero: { name: d.hero_name || "", icon: d.hero_image_url || "" },
      }))
      .sort((a, b) => a.turn - b.turn); // urutan mengikuti pick_ban_turn
  }

  // Empat fase seperti desain: Ban 1-6, Pick 1-6, Ban 7-10, Pick 7-10
  function draftPhases(rows) {
    const bans = rows.filter((r) => r.type === "ban");
    const picks = rows.filter((r) => r.type === "pick");
    return [
      { title: "Fase Ban pertama", kind: "Ban", items: bans.slice(0, 6) },
      { title: "Fase Pick pertama", kind: "Pick", items: picks.slice(0, 6) },
      { title: "Fase Ban kedua", kind: "Ban", items: bans.slice(6) },
      { title: "Fase Pick kedua", kind: "Pick", items: picks.slice(6) },
    ].filter((p) => p.items.length);
  }

  function teamCode(teamId, fallback) {
    const t = state.match.teams.find((x) => x.id === teamId);
    return (t && (t.code || t.name)) || fallback || "-";
  }

  function draftLegend(rows) {
    const seen = new Map();
    rows.forEach((r) => { if (!seen.has(r.teamId)) seen.set(r.teamId, r); });
    return [...seen.values()]
      .sort((a, b) => (a.side === "blue" ? -1 : 1) - (b.side === "blue" ? -1 : 1))
      .map((r) => `<span class="md-dlegend__item"><i class="md-dot md-dot--${r.side}"></i>${escapeHTML(teamCode(r.teamId, r.teamName))} ( ${SIDE_LABEL[r.side]} )</span>`)
      .join("");
  }

  function draftCell(r, no, label) {
    return `
      <li class="md-dcell">
        <span class="md-dcell__no md-dcell__no--${r.side}">${no}</span>
        <span class="md-dcell__side md-dcell__side--${r.side}">${SIDE_LABEL[r.side]}</span>
        <img class="md-dcell__icon" src="${escapeHTML(r.hero.icon)}" alt="" loading="lazy"
             onerror="this.onerror=null;this.style.visibility='hidden'">
        <span class="md-dcell__name">${escapeHTML(r.hero.name)}</span>
        <span class="md-dcell__kind">${label}</span>
      </li>`;
  }

  function draftHTML(entry) {
    const title = '<h2 id="md-draft-title" class="md-draft__title">Data Draft Pick</h2>';
    if (entry.status === "loading") {
      return `${title}<p class="md-dmsg" role="status"><span class="md-skel__spinner"></span>Memuat data draft...</p>`;
    }
    if (entry.status === "empty") {
      return `${title}<p class="md-dmsg" role="status">Data draft belum tersedia</p>`;
    }
    if (entry.status === "error") {
      return `${title}<div class="md-dmsg md-dmsg--error" role="alert">
        <span>Gagal memuat data draft. Periksa koneksi Anda lalu coba lagi.</span>
        <button type="button" class="md-dmsg__retry" data-draft-retry>Coba Lagi</button></div>`;
    }
    const legend = draftLegend(entry.rows);
    let no = 0;
    const count = { Ban: 0, Pick: 0 };
    const phases = draftPhases(entry.rows).map((ph) => `
      <section class="md-dphase" aria-label="${ph.title}">
        <header class="md-dphase__head">
          <span>${ph.title} ( ${ph.items.length} ${ph.kind} )</span>
          <span class="md-dlegend">${legend}</span>
        </header>
        <ol class="md-dlist">
          ${ph.items.map((r) => draftCell(r, ++no, `${ph.kind} ${++count[ph.kind]}`)).join("")}
        </ol>
      </section>`).join("");
    return title + phases;
  }

  function paintDraft(game) {
    const host = document.getElementById("md-draft");
    const active = state.match && state.match.games[state.game];
    if (!host || !active || active.id !== game.id) return; // pengguna sudah pindah game
    host.innerHTML = draftHTML(state.drafts[game.id] || { status: "empty" });
  }

  async function loadDraft(game, force = false) {
    if (!game.id) { state.drafts[game.id] = { status: "empty" }; paintDraft(game); return; }
    if (state.drafts[game.id] && !force) { paintDraft(game); return; }

    state.drafts[game.id] = { status: "loading" };
    paintDraft(game);
    try {
      const rows = normalizeDrafts(await window.ApiClient.getGameDrafts(game.id));
      state.drafts[game.id] = rows.length ? { status: "ready", rows } : { status: "empty" };
    } catch (err) {
      console.warn("[MatchDetail] draft", err);
      state.drafts[game.id] = { status: "error" };
    }
    paintDraft(game);
  }

  el.panelHero.addEventListener("click", (e) => {
    if (!e.target.closest("[data-draft-retry]")) return;
    const game = state.match && state.match.games[state.game];
    if (game) loadDraft(game, true);
  });

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
            <span class="md-s__items">${p.items.map((i) => `
              <img class="md-s__item" src="${escapeHTML(i.icon)}" alt="${escapeHTML(i.name)}"
                   title="${escapeHTML(i.name)}" loading="lazy"
                   onerror="this.onerror=null;this.style.visibility='hidden'">`).join("")}</span>
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

    const logo = team.logo
      ? `<img class="md-s__tlogo" src="${escapeHTML(team.logo)}" alt="" onerror="this.style.display='none'">` : "";
    const nameTag = `<span class="md-s__tname">${mirror ? "" : logo}${escapeHTML(team.code || team.name)}${mirror ? logo : ""}</span>`;
    const thead = order.map((k) => `<th class="c-${k}">${heads[k]}</th>`).join("");
    const rows = players
      .map((p) => `<tr>${order.map((k) => cell[k](p).replace(/<td(\s+class="([^"]*)")?/, (m, a, c) => `<td class="${c ? c + " " : ""}c-${k}"`)).join("")}</tr>`)
      .join("");

    return `
      <section class="md-s__team${mirror ? " is-mirror" : ""}" aria-label="${escapeHTML(team.code || team.name)}">
        <header class="md-s__head">
          ${mirror
            ? `<span>${sum(players, "kills")} Kills</span>${nameTag}`
            : `${nameTag}<span>Kills ${sum(players, "kills")}</span>`}
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

  function renderPanels() {
    const game = state.match.games[state.game];
    renderStatsPanel(game);
    renderHeroPanel(game);
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
  // Tujuan tombol kembali. Selalu halaman yang ada, tidak pernah /team-list.
  // 1) alamat Detail Tim yang disimpan saat match diklik, asal tim itu salah satu peserta match ini
  // 2) Detail Tim dari tim pertama match ini
  // 3) tab Tim di halaman Tournament
  function backTarget() {
    const base = (root.dataset.baseUrl || "").replace(/\/$/, "");
    const ids = state.match ? state.match.teams.map((t) => t.id).filter((id) => id !== null).map(String) : [];
    try {
      const ret = sessionStorage.getItem("mpl:returnTo");
      if (ret) {
        const u = new URL(ret, window.location.href);
        const isTeamDetail = u.origin === window.location.origin && /\/team-detail\/?$/.test(u.pathname);
        if (isTeamDetail && (ids.length === 0 || ids.includes(u.searchParams.get("id")))) return u.href;
      }
    } catch (_) { /* sessionStorage tidak tersedia */ }
    if (ids[0]) return `${base}/team-detail?id=${encodeURIComponent(ids[0])}`;
    return `${base}/tournament#tim`;
  }

  if (el.back) {
    // Kembali ke halaman terakhir (Hasil, Jadwal, atau Detail Tim) lewat riwayat browser.
    // backTarget() dipakai hanya bila tidak ada halaman sebelumnya di situs ini
    // (halaman dibuka langsung, tab baru, atau berasal dari situs lain).
    el.back.addEventListener("click", (e) => {
      // Ctrl/Cmd+klik atau klik tengah tetap membuka tab baru seperti biasa
      if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      e.preventDefault();

      let sameSite = false;
      try {
        const ref = new URL(document.referrer);
        sameSite = ref.origin === window.location.origin && ref.pathname !== window.location.pathname;
      } catch (_) { /* referrer kosong */ }

      if (sameSite && history.length > 1) {
        history.back();
        // Jaga-jaga bila riwayat tidak bergerak (misalnya tab ini baru dibuka)
        setTimeout(() => { if (document.body.contains(root)) window.location.assign(backTarget()); }, 800);
      } else {
        window.location.assign(backTarget());
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