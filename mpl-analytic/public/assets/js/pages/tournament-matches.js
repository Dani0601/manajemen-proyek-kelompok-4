(function () {
  'use strict';

  const root = document.querySelector('.tr');
  if (!root) {
    console.warn('[Tournament] Elemen .tr tidak ditemukan.');
    return;
  }

  const tabs = Array.from(root.querySelectorAll('[role="tab"]'));
  const panels = Array.from(root.querySelectorAll('.tr-panel'));

  // Konstanta ID Kontainer HTML
  const RESULTS_CONTAINER = '#tr-results-content';
  const SCHEDULE_CONTAINER = '#tr-schedule-content'; // <--- PASTIKAN ADA ID INI DI HTML TAB JADWAL
  
  const SEASON_ID = root.dataset.seasonId ? parseInt(root.dataset.seasonId, 10) : 1;

  let currentMatchesData = []; // Data mentah untuk Hasil

  // =========================================================
  // 1. UTILITAS
  // =========================================================

  function escapeHTML(value) {
    return String(value ?? '').replace(/[&<>"']/g, (char) => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;',
    })[char]);
  }

  function getResultsContainer() {
    return root.querySelector(RESULTS_CONTAINER);
  }
  
  function getScheduleContainer() {
    return root.querySelector(SCHEDULE_CONTAINER);
  }

  function showResultsMessage(title, message) {
    const container = getResultsContainer();
    if (!container) return;

    container.innerHTML = `
      <div class="tr-empty" role="status" style="margin-top: 16px;">
        <strong>${escapeHTML(title)}</strong>
        <p>${escapeHTML(message)}</p>
      </div>
    `;
  }

  function formatMatchDate(value) {
    if (!value) return '';

    const date = new Date(`${value}`.slice(0, 10) + 'T00:00:00');
    if (Number.isNaN(date.getTime())) {
      return String(value);
    }

    return new Intl.DateTimeFormat('id-ID', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }).format(date);
  }

  function getTeamName(team) {
    return team?.name || 'Tim tidak diketahui';
  }

  function getTeamLogoHTML(team) {
    const name = getTeamName(team);
    const logo = team?.logo;
    const fallback = name.slice(0, 2).toUpperCase();

    if (!logo || logo.includes('default.png')) { // Antisipasi jika API mengirim default.png kosong
      return `
        <span class="tr-logo tr-logo--fallback" aria-hidden="true">
          ${escapeHTML(fallback)}
        </span>
      `;
    }

    return `
      <img
        class="tr-logo"
        src="${escapeHTML(logo)}"
        data-fallback="${escapeHTML(fallback)}"
        alt="Logo ${escapeHTML(name)}"
        loading="lazy"
      >
    `;
  }

  // =========================================================
  // 2. NAVIGASI TAB & PENANGANAN URL
  // =========================================================

  function setTab(key, focus = false) {
    const cleanKey = key.replace('#', '').trim() || 'jadwal';
    const pageTitle = document.getElementById('tr-head-title');
    const pageNote = document.getElementById('tr-schedule-note');

    if (pageTitle && pageNote) {
      if (cleanKey === 'hasil') {
        pageTitle.textContent = 'HASIL PERTANDINGAN';
        pageNote.textContent = ''; // Anda bisa isi logic untuk mengambil pertandingan terdekat di sini
      } else if (cleanKey === 'jadwal') {
        pageTitle.textContent = 'JADWAL MPL INDONESIA SEASON 18';
        pageNote.textContent = ''; 
      } else if (cleanKey === 'klasemen') {
        pageTitle.textContent = 'KLASEMEN MPL INDONESIA SEASON 18';
        pageNote.textContent = ''; 
      }
    }
    
    tabs.forEach((tab) => {
      const tabKey = tab.dataset.tab || tab.getAttribute('href')?.replace('#', '');
      const on = tabKey === cleanKey;

      tab.classList.toggle('is-active', on);
      tab.setAttribute('aria-selected', on ? 'true' : 'false');
      tab.tabIndex = on ? 0 : -1;

      if (on && focus) tab.focus();
    });

    panels.forEach((panel) => {
      const isTarget = panel.id === 'tr-panel-' + cleanKey;
      panel.hidden = !isTarget;
    });
  }

  function initTabFromHash() {
    const hash = window.location.hash.replace('#', '').trim();
    if (hash && ['jadwal', 'hasil', 'klasemen'].includes(hash)) {
      setTab(hash, false);
    } else {
      setTab('jadwal', false);
    }
  }

  window.addEventListener('hashchange', initTabFromHash);

  document.addEventListener('click', (ev) => {
    const target = ev.target.closest('[data-subnav]');
    if (!target) return;

    const subnavKey = target.getAttribute('data-subnav');
    if (subnavKey && window.location.pathname.includes('/tournament')) {
      ev.preventDefault();
      window.location.hash = subnavKey;
      setTab(subnavKey, true);
    }
  });

  // =========================================================
  // 3. RENDER UI PERTANDINGAN
  // =========================================================

  // Cetakan HTML 1 Pertandingan (Dipakai oleh Jadwal dan Hasil)
  function renderMatch(match, isUpcoming = false) {
    const teamA = match.teamA;
    const teamB = match.teamB;

    const teamAName = getTeamName(teamA);
    const teamBName = getTeamName(teamB);

    // Jika jadwal (belum main), kosongkan skor menjadi "-"
    const scoreA = isUpcoming ? "-" : (teamA?.score ?? 0);
    const scoreB = isUpcoming ? "-" : (teamB?.score ?? 0);
    const matchId = match.matchId ?? '';
    
    let matchTime = "--:--";
    if (match.matchDate) {
      const timePart = match.matchDate.split('T')[1] || match.matchDate.split(' ')[1];
      if (timePart) matchTime = timePart.slice(0, 5);
    }

    return `
      <a class="tr-res" href="#match-${escapeHTML(matchId)}" data-match-id="${escapeHTML(matchId)}">
        <div class="tr-res__time">${escapeHTML(matchTime)}</div>
        <div class="tr-res__teams">
          <div class="tr-res__team">
            ${getTeamLogoHTML(teamA)}
            <span class="tr-res__name" title="${escapeHTML(teamAName)}">${escapeHTML(teamAName)}</span>
            <span class="tr-res__score">${escapeHTML(scoreA)}</span>
          </div>
          <div class="tr-res__team">
            ${getTeamLogoHTML(teamB)}
            <span class="tr-res__name" title="${escapeHTML(teamBName)}">${escapeHTML(teamBName)}</span>
            <span class="tr-res__score">${escapeHTML(scoreB)}</span>
          </div>
        </div>
        <div class="tr-chev" aria-hidden="true">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="m9 18 6-6-6-6"/>
          </svg>
        </div>
      </a>
    `;
  }

  // --- RENDER JADWAL (MENDATANG) ---
  function renderSchedule(matches) {
    const container = getScheduleContainer();
    if (!container) return;

    // BDD: Skenario Data Kosong
    if (!matches || matches.length === 0) {
      container.innerHTML = `
        <div class="tr-empty" role="status" style="margin-top: 16px;">
          <strong>Belum Ada Jadwal</strong>
          <p>Belum ada jadwal pertandingan mendatang untuk saat ini.</p>
        </div>
      `;
      return;
    }

    // Urutkan dari tanggal terdekat
    matches.sort((a, b) => new Date(a.matchDate) - new Date(b.matchDate));

    // Kelompokkan berdasarkan tanggal
    const groupedByDate = {};
    matches.forEach((match) => {
      const dateText = formatMatchDate(match.matchDate) || 'Jadwal Lainnya';
      if (!groupedByDate[dateText]) groupedByDate[dateText] = [];
      groupedByDate[dateText].push(match);
    });

    let html = '';
    for (const [dateStr, dateMatches] of Object.entries(groupedByDate)) {
      html += `
        <div class="tr-day">
          <h3 class="tr-day__title">${escapeHTML(dateStr)}</h3>
          <div class="tr-day__matches">
            ${dateMatches.map(m => renderMatch(m, true)).join('')}
          </div>
        </div>
      `;
    }
    
    container.innerHTML = html;
  }

  // --- RENDER HASIL (SELESAI) ---
  function filterAndRenderByWeek(weekNumber) {
    const matchesWrapper = root.querySelector('.tr-matches-wrapper');
    if (!matchesWrapper) return;

    const filteredMatches = currentMatchesData.filter((match) => {
      // Jika dari API belum ada data "week", asumsikan semuanya muncul
      const matchWeek = match.week ? parseInt(match.week, 10) : weekNumber;
      return matchWeek === weekNumber;
    });

    if (filteredMatches.length === 0) {
      matchesWrapper.innerHTML = `
        <div class="tr-empty" role="status" style="margin-top: 16px;">
          <strong>Data Minggu ke-${weekNumber} Belum Tersedia</strong>
          <p>Belum ada hasil pertandingan untuk minggu ini.</p>
        </div>
      `;
      return;
    }

    const groupedByDate = {};
    filteredMatches.forEach((match) => {
      const dateText = formatMatchDate(match.matchDate) || 'Jadwal Lainnya';
      if (!groupedByDate[dateText]) groupedByDate[dateText] = [];
      groupedByDate[dateText].push(match);
    });

    let html = '';
    for (const [dateStr, dateMatches] of Object.entries(groupedByDate)) {
      html += `
        <div class="tr-day">
          <h3 class="tr-day__title">${escapeHTML(dateStr)}</h3>
          <div class="tr-day__matches">
            ${dateMatches.map(m => renderMatch(m, false)).join('')}
          </div>
        </div>
      `;
    }
    
    matchesWrapper.innerHTML = html;
  }

  function renderResults(matches) {
    const container = getResultsContainer();
    if (!container) return;

    currentMatchesData = matches;

    if (matches.length === 0) {
      showResultsMessage('Data belum tersedia', 'Hasil pertandingan belum tersedia saat ini.');
      return;
    }

    const availableWeeks = matches.map(m => parseInt(m.week || 1, 10)).filter(w => w > 0);
    const activeWeek = availableWeeks.length > 0 ? Math.max(...availableWeeks) : 1;

    let weekBtnsHTML = '';
    // Buat dinamis berdasarkan jumlah minggu yang ada di data
    const maxWeek = Math.max(9, activeWeek); 
    for (let i = 1; i <= maxWeek; i++) {
      const activeClass = i === activeWeek ? ' is-active' : '';
      weekBtnsHTML += `<button type="button" class="tr-wk__btn${activeClass}">${i}</button>`;
    }

    container.innerHTML = `
      <div class="tr-wk">
        <span class="tr-wk__label">Minggu</span>
        <div class="tr-wk__btns">
          ${weekBtnsHTML}
        </div>
      </div>
      <div class="tr-matches-wrapper"></div>
    `;

    filterAndRenderByWeek(activeWeek);
  }

  // =========================================================
  // 4. AMBIL DATA DARI API CLIENT BARU (FE 2)
  // =========================================================

  async function loadTournamentMatches() {
    showResultsMessage('Memuat data...', 'Sedang mengambil data pertandingan dari server.');
    const schedContainer = getScheduleContainer();
    if (schedContainer) {
       schedContainer.innerHTML = `<div class="text-center py-4">Memuat jadwal...</div>`;
    }

    if (!window.ApiClient || typeof window.ApiClient.getTournamentSchedule !== 'function') {
      showResultsMessage('Gagal memuat', 'Modul ApiClient tidak ditemukan.');
      return;
    }

    try {
      // PANGGIL ENDPOINT API
      const response = await window.ApiClient.getTournamentSchedule(SEASON_ID);
      const rawMatches = response.data || response || [];

      // NORMALISASI: Ubah snake_case ke camelCase agar fungsi render tidak rusak
      const normalizedMatches = rawMatches.map(m => ({
        matchId: m.match_id,
        matchDate: m.match_date,
        teamA: {
          id: m.team_a.team_id,
          name: m.team_a.team_name,
          logo: m.team_a.logo_url,
          score: m.team_a.score
        },
        teamB: {
          id: m.team_b.team_id,
          name: m.team_b.team_name,
          logo: m.team_b.logo_url,
          score: m.team_b.score
        },
        winnerTeamId: m.winner_team_id,
        // Mockup perhitungan 'week' (karena API tidak/belum mengirimkan data 'week')
        // Ini disesuaikan agar tombol navigasi minggu Anda tetap berfungsi
        week: m.week || 1 
      }));

      // BDD: PEMISAHAN JADWAL DAN HASIL
      const upcomingMatches = normalizedMatches.filter(m => m.winnerTeamId === null);
      const pastMatches = normalizedMatches.filter(m => m.winnerTeamId !== null);

      // RENDER KEDUANYA
      renderSchedule(upcomingMatches);
      renderResults(pastMatches);

    } catch (error) {
      console.error('[Tournament] Gagal memuat data pertandingan:', error);
      showResultsMessage('Gagal memuat', 'Terjadi kesalahan saat mengambil data dari server.');
      if (schedContainer) {
         schedContainer.innerHTML = `<div class="text-center py-4 text-danger">Gagal memuat jadwal.</div>`;
      }
    }
  }

  // =========================================================
  // 5. EVENT KLIK (PILIHAN MINGGU & KARTU HASIL)
  // =========================================================

  root.addEventListener('click', (ev) => {
    const target = ev.target;
    if (!(target instanceof Element)) return;

    // A. KLIK TOMBOL MINGGU
    const wkBtn = target.closest('.tr-wk__btn');
    if (wkBtn && root.contains(wkBtn)) {
      ev.preventDefault();
      
      const allWkBtns = root.querySelectorAll('.tr-wk__btn');
      allWkBtns.forEach((btn) => btn.classList.remove('is-active'));
      wkBtn.classList.add('is-active');

      const selectedWeek = parseInt(wkBtn.textContent.trim(), 10);
      filterAndRenderByWeek(selectedWeek);
      return;
    }

    // B. KLIK KARTU PERTANDINGAN
    const card = target.closest('.tr-res');
    if (card && root.contains(card)) {
      const evt = new CustomEvent('tournament:match', {
        cancelable: true,
        detail: { matchId: card.dataset.matchId },
      });

      if (!document.dispatchEvent(evt)) ev.preventDefault();
    }
  });

  root.addEventListener('error', (ev) => {
    const img = ev.target;
    if (!(img instanceof HTMLImageElement) || !img.matches('img[data-fallback]')) return;

    const span = document.createElement('span');
    span.className = 'tr-logo tr-logo--fallback';
    span.textContent = img.dataset.fallback || '?';
    span.setAttribute('aria-hidden', 'true');
    img.replaceWith(span);
  }, true);

  // =========================================================
  // 6. INISIALISASI UTAMA
  // =========================================================

  window.TournamentPage = {
    setTab,
    loadTournamentMatches,
  };

  initTabFromHash();
  
  // Eksekusi fungsi penarikan data utama
  loadTournamentMatches();

})();