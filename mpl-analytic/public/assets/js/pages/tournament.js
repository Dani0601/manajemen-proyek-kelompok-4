(function () {
  'use strict';

  const root = document.querySelector('.tr');
  if (!root) {
    console.warn('[Tournament] Elemen .tr tidak ditemukan.');
    return;
  }

  const tabs = Array.from(root.querySelectorAll('[role="tab"]'));
  
  // MENCARI PANEL MENGGUNAKAN CLASS .tr-panel (SESUAI HTML PHP ANDA)
  const panels = Array.from(root.querySelectorAll('.tr-panel'));

  const RESULTS_CONTAINER = '#tr-results-content';
  const SEASON_ID = root.dataset.seasonId ? parseInt(root.dataset.seasonId, 10) : 1;

  // Variabel untuk menyimpan data mentah dari API agar bisa difilter per minggu
  let currentMatchesData = [];

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

    return new Intl.DateTimeFormat('id-ID', { weekday: 'long', day: 'numeric', month: 'long' }).format(date);
  }

  function getTeamName(team) {
    return team?.name || 'Tim tidak diketahui';
  }

  function getTeamLogoHTML(team) {
    const name = getTeamName(team);
    const logo = team?.logo;
    const fallback = name.slice(0, 2).toUpperCase();

    if (!logo) {
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
    // Tambahkan di dalam fungsi setTab(key, focus) di tournament.js
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
    // Update status tab (jika ada tombol tab di dalam halaman)
    tabs.forEach((tab) => {
      const tabKey = tab.dataset.tab || tab.getAttribute('href')?.replace('#', '');
      const on = tabKey === cleanKey;

      tab.classList.toggle('is-active', on);
      tab.setAttribute('aria-selected', on ? 'true' : 'false');
      tab.tabIndex = on ? 0 : -1;

      if (on && focus) tab.focus();
    });

    // Sembunyikan panel yang tidak sesuai dengan URL Hash
    panels.forEach((panel) => {
      const isTarget = panel.id === 'tr-panel-' + cleanKey;
      panel.hidden = !isTarget;
    });

    // ==========================================
    // INI ADALAH PEMICU UNTUK MENGAMBIL DATA API
    // ==========================================
    if (cleanKey === 'jadwal' && window.TournamentSchedule) {
        // Panggil file tournament-schedule.js untuk tarik data
        window.TournamentSchedule.init(); 
    } 
    else if (cleanKey === 'hasil') {
        // Panggil fungsi hasil pertandingan lama
        if (typeof loadMatchResults === 'function') {
            loadMatchResults();
        }
    }
  }

  function initTabFromHash() {
    const hash = window.location.hash.replace('#', '').trim();
    if (hash && ['jadwal', 'hasil', 'klasemen'].includes(hash)) {
      setTab(hash, false);
    } else {
      setTab('jadwal', false); // Default ke panel jadwal
    }
  }

  // Event listener saat hash URL berubah (klik back/forward di browser)
  window.addEventListener('hashchange', initTabFromHash);

  // Penanganan klik navigasi dari sidebar/navbar (Atribut data-subnav)
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
  // 3. RENDER KARTU HASIL PERTANDINGAN & FILTER MINGGU
  // =========================================================

  function renderMatch(match) {
    const teamA = match.teamA;
    const teamB = match.teamB;

    const teamAName = getTeamName(teamA);
    const teamBName = getTeamName(teamB);

    const scoreA = teamA?.score ?? 0;
    const scoreB = teamB?.score ?? 0;
    const matchId = match.matchId ?? '';
    
    // Ambil jam pertandingan (misal: "15:00") dari matchDate
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
        <!-- Ganti dengan kode baru ini: -->
        <div class="tr-chev" aria-hidden="true">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="m9 18 6-6-6-6"/>
          </svg>
        </div>
      </a>
    `;
  }

  // Fungsi untuk memfilter dan merender pertandingan berdasarkan minggu yang dipilih
  function filterAndRenderByWeek(weekNumber) {
    const matchesWrapper = root.querySelector('.tr-matches-wrapper');
    if (!matchesWrapper) return;

    // Filter pertandingan (harus sudah selesai dan sesuai minggu)
    const filteredMatches = currentMatchesData.filter((match) => {
      const matchWeek = parseInt(match.week, 10);
      return match.winnerTeamId != null && (matchWeek === weekNumber || !match.week);
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

    // Kelompokkan berdasarkan tanggal
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
            ${dateMatches.map(renderMatch).join('')}
          </div>
        </div>
      `;
    }
    
    matchesWrapper.innerHTML = html;
  }

  function renderResults(matches) {
    const container = getResultsContainer();
    if (!container) return;

    // Simpan data ke variabel global agar bisa dipakai fungsi filter
    currentMatchesData = matches;

    const completedMatches = matches.filter((match) => match.winnerTeamId != null);

    if (completedMatches.length === 0) {
      showResultsMessage(
        'Data belum tersedia',
        'Hasil pertandingan belum tersedia saat ini.'
      );
      return;
    }

    // Tentukan minggu aktif (cari minggu paling terbaru)
    const availableWeeks = completedMatches.map(m => parseInt(m.week || 0, 10)).filter(w => w > 0);
    const activeWeek = availableWeeks.length > 0 ? Math.max(...availableWeeks) : 9;

    // Buat HTML Tombol Navigasi Minggu 1-9
    let weekBtnsHTML = '';
    for (let i = 1; i <= 9; i++) {
      const activeClass = i === activeWeek ? ' is-active' : '';
      weekBtnsHTML += `<button type="button" class="tr-wk__btn${activeClass}">${i}</button>`;
    }

    // Kerangka Dasar HTML (Baris Minggu + Wrapper Pertandingan)
    container.innerHTML = `
      <div class="tr-wk">
        <span class="tr-wk__label">Minggu</span>
        <div class="tr-wk__btns">
          ${weekBtnsHTML}
        </div>
      </div>
      <div class="tr-matches-wrapper"></div>
    `;

    // Render daftar pertandingan untuk minggu aktif
    filterAndRenderByWeek(activeWeek);
  }

  // =========================================================
  // 4. AMBIL DATA DARI API (via MatchResults)
  // =========================================================

  async function loadMatchResults() {
    const container = getResultsContainer();
    if (!container) return;
    document.querySelector('.tr')?.classList.add('is-loading');
    if (!window.MatchResults || typeof window.MatchResults.getMatchResults !== 'function') {
      showResultsMessage('Gagal memuat hasil pertandingan', 'Modul pengambilan data belum tersedia.');
      return;
    }

    showResultsMessage('Memuat hasil pertandingan...', 'Sedang mengambil data pertandingan dari server.');

    try {
      const matches = await window.MatchResults.getMatchResults(SEASON_ID);
      if (!Array.isArray(matches)) {
        throw new Error('Data hasil pertandingan tidak berbentuk array.');
      }
      renderResults(matches);
    } catch (error) {
      console.error('[Tournament] Gagal memuat hasil pertandingan:', error);
      showResultsMessage('Gagal memuat hasil', 'Terjadi kesalahan saat mengambil data. Silakan muat ulang halaman.');
    }finally {
        document.querySelector('.tr')?.classList.remove('is-loading');
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
      
      // Ubah status aktif tombol
      const allWkBtns = root.querySelectorAll('.tr-wk__btn');
      allWkBtns.forEach((btn) => btn.classList.remove('is-active'));
      wkBtn.classList.add('is-active');

      // Filter pertandingan sesuai angka tombol yang diklik
      const selectedWeek = parseInt(wkBtn.textContent.trim(), 10);
      filterAndRenderByWeek(selectedWeek);
      return;
    }

    // B. KLIK KARTU PERTANDINGAN
    const card = target.closest('.tr-res');
    if (card && root.contains(card)) {
      const evt = new CustomEvent('tournament:match', {
        cancelable: true,
        detail: {
          matchId: card.dataset.matchId,
        },
      });

      if (!document.dispatchEvent(evt)) {
        ev.preventDefault();
      }
    }
  });

  // Event Fallback Logo (jika gagal dimuat)
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
    loadMatchResults,
  };

  // 1. Pastikan tab sesuai URL Hash (seperti #hasil) saat halaman direfresh
  initTabFromHash();

  // 2. Mulai tarik data dari backend
  loadMatchResults();

})();