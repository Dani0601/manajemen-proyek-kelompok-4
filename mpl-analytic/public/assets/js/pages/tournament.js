/**
 * Halaman MPL / Tournament.
 * - Tab Jadwal | Hasil Pertandingan | Klasemen.
 * - Tombol "Lihat Semua" membuka tab Klasemen.
 * - Mengambil dan menampilkan hasil pertandingan dari API.
 * - Logo tim yang gagal dimuat diganti dengan inisial.
 */
(function () {
  'use strict';

  const root = document.querySelector('.tr');
  if (!root) {
    console.warn('[Tournament] Elemen .tr tidak ditemukan.');
    return;
  }

  const tabs = Array.from(root.querySelectorAll('[role="tab"]'));
  const panels = Array.from(root.querySelectorAll('[role="tabpanel"]'));

  const RESULTS_CONTAINER = '#tr-results-content';
  const SEASON_ID = 1;

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

    if (!container) {
      console.error(
        `[Tournament] Container ${RESULTS_CONTAINER} tidak ditemukan.`
      );
      return;
    }

    container.innerHTML = `
      <div class="tr-empty" role="status">
        <strong>${escapeHTML(title)}</strong>
        <p>${escapeHTML(message)}</p>
      </div>
    `;
  }

  function formatMatchDate(value) {
    if (!value) return '';

    // Mendukung tanggal ISO, misalnya 2026-10-16.
    const date = new Date(`${value}`.slice(0, 10) + 'T00:00:00');

    if (Number.isNaN(date.getTime())) {
      return String(value);
    }

    return new Intl.DateTimeFormat('id-ID', {
      day: 'numeric',
      month: 'short',
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
  // 2. NAVIGASI TAB
  // =========================================================

  function setTab(key, focus) {
    tabs.forEach((tab) => {
      const on = tab.dataset.tab === key;

      tab.classList.toggle('is-active', on);
      tab.setAttribute('aria-selected', on ? 'true' : 'false');
      tab.tabIndex = on ? 0 : -1;

      if (on && focus) {
        tab.focus();
      }
    });

    panels.forEach((panel) => {
      panel.hidden = panel.id !== 'tr-panel-' + key;
    });
  }

  tabs.forEach((tab, i) => {
    tab.addEventListener('click', () => {
      setTab(tab.dataset.tab);
    });

    tab.addEventListener('keydown', (ev) => {
      const step = {
        ArrowRight: 1,
        ArrowLeft: -1,
      }[ev.key];

      if (!step) return;

      ev.preventDefault();

      const nextIndex = (i + step + tabs.length) % tabs.length;
      setTab(tabs[nextIndex].dataset.tab, true);
    });
  });

  root.querySelectorAll('[data-goto-tab]').forEach((btn) => {
    btn.addEventListener('click', () => {
      setTab(btn.dataset.gotoTab, true);
    });
  });

  // =========================================================
  // 3. RENDER KARTU HASIL PERTANDINGAN
  // =========================================================

  function renderMatch(match) {
    const teamA = match.teamA;
    const teamB = match.teamB;

    const teamAName = getTeamName(teamA);
    const teamBName = getTeamName(teamB);

    const scoreA = teamA?.score;
    const scoreB = teamB?.score;

    const winnerId = match.winnerTeamId;

    const teamAIsWinner =
      winnerId != null &&
      teamA?.id != null &&
      String(winnerId) === String(teamA.id);

    const teamBIsWinner =
      winnerId != null &&
      teamB?.id != null &&
      String(winnerId) === String(teamB.id);

    const dateText = formatMatchDate(match.matchDate);
    const matchId = match.matchId ?? '';

    return `
      <a
        class="tr-match"
        href="#match-${escapeHTML(matchId)}"
        data-match-id="${escapeHTML(matchId)}"
        aria-label="${escapeHTML(teamAName)} ${escapeHTML(scoreA)} lawan ${escapeHTML(teamBName)} ${escapeHTML(scoreB)}"
      >
        <span class="tr-team tr-team--left${teamAIsWinner ? ' is-winner' : ''}">
          ${getTeamLogoHTML(teamA)}
          <span class="tr-team__name">${escapeHTML(teamAName)}</span>
        </span>

        <span class="tr-pill">
          ${escapeHTML(scoreA)} - ${escapeHTML(scoreB)}
        </span>

        <span class="tr-team tr-team--right${teamBIsWinner ? ' is-winner' : ''}">
          <span class="tr-team__name">${escapeHTML(teamBName)}</span>
          ${getTeamLogoHTML(teamB)}
        </span>
      </a>
      ${dateText ? `
        <div class="tr-match__date">${escapeHTML(dateText)}</div>
      ` : ''}
    `;
  }

  function renderResults(matches) {
    const container = getResultsContainer();

    if (!container) {
      console.error(
        `[Tournament] Container ${RESULTS_CONTAINER} tidak ditemukan.`
      );
      return;
    }

    // Hanya tampilkan pertandingan yang memiliki kedua skor.
    // Skor 0 tetap dianggap valid.
    const completedMatches = matches.filter((match) => {
      const scoreA = match.teamA?.score;
      const scoreB = match.teamB?.score;

      return (
        scoreA !== null &&
        scoreA !== undefined &&
        scoreB !== null &&
        scoreB !== undefined &&
        scoreA !== '' &&
        scoreB !== '' &&
        Number.isFinite(Number(scoreA)) &&
        Number.isFinite(Number(scoreB))
      );
    });

    console.log(
      '[Tournament] Jumlah data pertandingan:',
      matches.length
    );

    console.log(
      '[Tournament] Jumlah pertandingan dengan skor:',
      completedMatches.length
    );

    if (completedMatches.length === 0) {
      showResultsMessage(
        'Belum ada hasil pertandingan',
        'Hasil pertandingan yang memiliki skor belum tersedia.'
      );
      return;
    }

    container.innerHTML = completedMatches
      .map(renderMatch)
      .join('');

    console.log('[Tournament] Hasil pertandingan berhasil ditampilkan.');
  }

  // =========================================================
  // 4. AMBIL DATA DARI API MELALUI MatchResults
  // =========================================================

  async function loadMatchResults() {
    const container = getResultsContainer();

    if (!container) {
      console.error(
        `[Tournament] Container ${RESULTS_CONTAINER} tidak ditemukan.`
      );
      return;
    }

    if (
      !window.MatchResults ||
      typeof window.MatchResults.getMatchResults !== 'function'
    ) {
      console.error(
        '[Tournament] MatchResults belum tersedia. Periksa pemuatan match-results.js.'
      );

      showResultsMessage(
        'Gagal memuat hasil pertandingan',
        'Modul pengambilan data pertandingan belum tersedia.'
      );

      return;
    }

    showResultsMessage(
      'Memuat hasil pertandingan...',
      'Sedang mengambil data pertandingan dari server.'
    );

    try {
      const matches = await window.MatchResults.getMatchResults(SEASON_ID);

      if (!Array.isArray(matches)) {
        throw new Error(
          'Data hasil pertandingan tidak berbentuk array.'
        );
      }

      renderResults(matches);
    } catch (error) {
      console.error(
        '[Tournament] Gagal memuat hasil pertandingan:',
        error
      );

      showResultsMessage(
        'Gagal memuat hasil pertandingan',
        'Terjadi kesalahan saat mengambil data. Silakan muat ulang halaman.'
      );
    }
  }

  // =========================================================
  // 5. EVENT KLIK KARTU PERTANDINGAN
  // =========================================================

  root.addEventListener('click', (ev) => {
    const target = ev.target;

    if (!(target instanceof Element)) return;

    const card = target.closest('.tr-match');

    if (!card || !root.contains(card)) return;

    const evt = new CustomEvent('tournament:match', {
      cancelable: true,
      detail: {
        matchId: card.dataset.matchId,
      },
    });

    // Jika listener lain membatalkan event khusus,
    // cegah navigasi bawaan kartu.
    if (!document.dispatchEvent(evt)) {
      ev.preventDefault();
    }
  });

  // =========================================================
  // 6. FALLBACK LOGO UNTUK GAMBAR YANG GAGAL DIMUAT
  // =========================================================

  root.addEventListener('error', (ev) => {
    const img = ev.target;

    if (
      !(img instanceof HTMLImageElement) ||
      !img.matches('img[data-fallback]')
    ) {
      return;
    }

    const span = document.createElement('span');
    span.className = 'tr-logo tr-logo--fallback';
    span.textContent = img.dataset.fallback || '?';
    span.setAttribute('aria-hidden', 'true');

    img.replaceWith(span);
  }, true);

  // =========================================================
  // 7. INISIALISASI HALAMAN
  // =========================================================

  window.TournamentPage = {
    setTab,
    loadMatchResults,
  };

  loadMatchResults();
})();