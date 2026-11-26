(function () {
  "use strict";

  const root = document.getElementById("transfer");
  if (!root) return;

  const $ = (id) => document.getElementById(id);
  const el = {
    q: $("tf-q"), team: $("tf-team"), type: $("tf-type"),
    wrap: $("tf-table-wrap"), body: $("tf-body"), pager: $("tf-pager"),
    skeleton: $("tf-skeleton"), empty: $("tf-empty"), error: $("tf-error"),
    loading: $("tf-loading"), retry: $("tf-retry"),
  };

  const PAGE_SIZE = 5;
  const MONTHS = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];

  // ===== MOCK (hapus saat endpoint BE siap) =====
  const T = (id, name) => ({ team_id: id, team_name: name, logo_url: "" });
  const MOCK = { transfers: [
    { transfer_id: 1, player_name: "Benny",   from_team: T(1, "EVOS"),          to_team: T(2, "RRQ Hoshi"),      transfer_type: "Transfer", transfer_date: "2026-11-21" },
    { transfer_id: 2, player_name: "Kyy",     from_team: T(3, "Bigetron"),      to_team: T(5, "Alter Ego"),      transfer_type: "Loan",       transfer_date: "2026-11-20" },
    { transfer_id: 3, player_name: "Alberttt",from_team: T(4, "Alter Ego"),     to_team: T(6, "ONIC"),           transfer_type: "Loan",          transfer_date: "2026-11-19" },
    { transfer_id: 4, player_name: "Kabuki",  from_team: T(5, "Dewa United"),   to_team: T(1, "EVOS"),          transfer_type: "Transfer", transfer_date: "2026-11-18" },
    { transfer_id: 5, player_name: "Pano",    from_team: T(2, "RRQ Hoshi"),     to_team: T(7, "Geek Fam"),       transfer_type: "Loan",          transfer_date: "2026-11-17" },
    { transfer_id: 6, player_name: "Clover",  from_team: T(6, "ONIC"),          to_team: T(2, "RRQ Hoshi"),      transfer_type: "Loan",       transfer_date: "2026-11-16" },
    { transfer_id: 7, player_name: "Zeys",    from_team: T(1, "EVOS"),          to_team: T(4, "Alter Ego"),      transfer_type: "Transfer", transfer_date: "2026-11-15" },
  ] };
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  async function fetchTransfers() { await wait(600); return MOCK; }
  // ===== akhir MOCK =====

  const state = { all: [], page: 1 };

  const esc = (v) => String(v ?? "").replace(/[&<>"']/g, (c) => (
    { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]
  ));

  // "2026-11-21" -> "21 November 2026"
  function fmtDate(v) {
    const d = new Date(`${String(v || "").slice(0, 10)}T00:00:00`);
    return Number.isNaN(d.getTime()) ? "-" : `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
  }

  // ---------- Normalisasi ----------
  function normalize(body) {
    const list = Array.isArray(body?.transfers) ? body.transfers : [];
    const team = (t) => ({ id: t?.team_id ?? null, name: t?.team_name || "-", logo: t?.logo_url || "" });
    return list
      .map((t) => ({
        id: t.transfer_id,
        player: t.player_name || "",
        photo: t.player_photo_url || t.photo_url || "",
        from: team(t.from_team),
        to: team(t.to_team),
        type: t.transfer_type || "-",
        date: t.transfer_date || "",
      }))
      .sort((a, b) => String(b.date).localeCompare(String(a.date)));
  }

  // ---------- Filter ----------
  function filtered() {
    const q = el.q.value.trim().toLowerCase();
    const team = el.team.value;
    const type = el.type.value;
    return state.all.filter((t) =>
      (!q || t.player.toLowerCase().includes(q)) &&
      (!team || String(t.from.id) === team || String(t.to.id) === team) &&
      (!type || t.type === type));
  }

  // ---------- Render ----------
  const img = (cls, src) =>
    `<img class="${cls}" src="${esc(src)}" alt="" loading="lazy" onerror="this.onerror=null;this.style.visibility='hidden'">`;

  function teamCell(t) {
    return `<span class="tf-cell">${img("tf-logo", t.logo)}<span class="tf-cell__name">${esc(t.name)}</span></span>`;
  }

  function row(t, selectedTeam) {
    let dir = "";
    if (selectedTeam) {
      dir = String(t.to.id) === selectedTeam
        ? '<span class="tf-dir tf-dir--in">Masuk</span>'
        : '<span class="tf-dir tf-dir--out">Keluar</span>';
    }
    return `
      <tr>
        <td data-label="Pemain"><span class="tf-cell tf-player">${img("tf-photo", t.photo)}<span class="tf-cell__name">${esc(t.player)}</span>${dir}</span></td>
        <td data-label="Tim Asal">${teamCell(t.from)}</td>
        <td class="tf-arrow" aria-hidden="true">&rarr;</td>
        <td data-label="Tim Baru">${teamCell(t.to)}</td>
        <td data-label="Jenis Transfer"><span class="tf-badge">${esc(t.type)}</span></td>
        <td data-label="Tanggal">${esc(fmtDate(t.date))}</td>
      </tr>`;
  }

  function renderPager(totalPages) {
    if (totalPages <= 1) { el.pager.hidden = true; el.pager.innerHTML = ""; return; }
    el.pager.hidden = false;
    const btn = (label, page, attrs = "") => `<button type="button" class="tf-pager__btn" data-page="${page}" ${attrs}>${label}</button>`;
    let html = btn("&lsaquo;", state.page - 1, state.page === 1 ? "disabled" : 'aria-label="Sebelumnya"');
    for (let p = 1; p <= totalPages; p++) {
      html += btn(p, p, p === state.page ? 'aria-current="page"' : "");
    }
    html += btn("&rsaquo;", state.page + 1, state.page === totalPages ? "disabled" : 'aria-label="Berikutnya"');
    el.pager.innerHTML = html;
  }

  function render() {
    const rows = filtered();
    if (rows.length === 0) { setView("empty"); return; }

    const totalPages = Math.ceil(rows.length / PAGE_SIZE);
    state.page = Math.min(state.page, totalPages);
    const start = (state.page - 1) * PAGE_SIZE;
    el.body.innerHTML = rows.slice(start, start + PAGE_SIZE).map((t) => row(t, el.team.value)).join("");
    renderPager(totalPages);
    setView("ready");
  }

  // ---------- State tampilan ----------
  function setView(name) {
    root.dataset.state = name;
    el.wrap.hidden = name !== "ready";
    el.skeleton.hidden = name !== "loading";
    el.loading.hidden = name !== "loading";
    el.empty.hidden = name !== "empty";
    el.error.hidden = name !== "error";
    if (name === "loading" && !el.skeleton.firstChild) {
      el.skeleton.innerHTML = '<div class="tf-skel__row"></div>'.repeat(6);
    }
  }

  function fillFilters() {
    const teams = new Map();
    const types = new Set();
    state.all.forEach((t) => {
      [t.from, t.to].forEach((x) => { if (x.id !== null) teams.set(String(x.id), x.name); });
      if (t.type && t.type !== "-") types.add(t.type);
    });
    el.team.innerHTML = '<option value="">Semua Tim</option>' +
      [...teams].sort((a, b) => a[1].localeCompare(b[1]))
        .map(([id, name]) => `<option value="${esc(id)}">${esc(name)}</option>`).join("");
    el.type.innerHTML = '<option value="">Semua Jenis</option>' +
      [...types].sort().map((v) => `<option value="${esc(v)}">${esc(v)}</option>`).join("");
    el.team.disabled = false;
    el.type.disabled = false;
  }

  // ---------- Muat data ----------
  async function load() {
    setView("loading");
    try {
      state.all = normalize(await fetchTransfers());
      state.page = 1;
      if (state.all.length === 0) { setView("empty"); return; }
      fillFilters();
      render();
    } catch (err) {
      console.error("[Transfer]", err);
      setView("error");
    }
  }

  // ---------- Event ----------
  const onFilter = () => { state.page = 1; render(); };
  el.q.addEventListener("input", onFilter);
  el.team.addEventListener("change", onFilter);
  el.type.addEventListener("change", onFilter);
  el.pager.addEventListener("click", (e) => {
    const b = e.target.closest("[data-page]");
    if (!b || b.disabled) return;
    state.page = Number(b.dataset.page);
    render();
  });
  el.retry.addEventListener("click", load);

  window.TransferPage = { load, setView };
  load();
})();