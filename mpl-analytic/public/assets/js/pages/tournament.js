/**
 * Halaman MPL / Tournament.
 * - Tab Jadwal | Hasil Pertandingan | Klasemen (aria-selected + keyboard).
 * - Tombol "Lihat Semua >" membuka tab Klasemen.
 * - Logo tim yang gagal dimuat diganti inisial.
 *
 * Untuk FE2 (integrasi API):
 *   TournamentPage.setTab('jadwal' | 'hasil' | 'klasemen')
 *   Kartu pertandingan membawa data-match-id; event 'tournament:match'
 *   dikirim saat kartu di-tap (detail.matchId). Panggil preventDefault()
 *   jika ingin menangani navigasi sendiri.
 */
(function () {
  'use strict';

  const root = document.querySelector('.tr');
  if (!root) return;

  const tabs = Array.from(root.querySelectorAll('[role="tab"]'));
  const panels = Array.from(root.querySelectorAll('[role="tabpanel"]'));

  function setTab(key, focus) {
    tabs.forEach((tab) => {
      const on = tab.dataset.tab === key;
      tab.classList.toggle('is-active', on);
      tab.setAttribute('aria-selected', on ? 'true' : 'false');
      tab.tabIndex = on ? 0 : -1;
      if (on && focus) tab.focus();
    });
    panels.forEach((panel) => {
      panel.hidden = panel.id !== 'tr-panel-' + key;
    });
  }

  tabs.forEach((tab, i) => {
    tab.addEventListener('click', () => setTab(tab.dataset.tab));
    tab.addEventListener('keydown', (ev) => {
      const step = { ArrowRight: 1, ArrowLeft: -1 }[ev.key];
      if (!step) return;
      ev.preventDefault();
      setTab(tabs[(i + step + tabs.length) % tabs.length].dataset.tab, true);
    });
  });

  root.querySelectorAll('[data-goto-tab]').forEach((btn) => {
    btn.addEventListener('click', () => setTab(btn.dataset.gotoTab, true));
  });

  root.addEventListener('click', (ev) => {
    const card = ev.target.closest('.tr-match');
    if (!card) return;
    const evt = new CustomEvent('tournament:match', {
      cancelable: true,
      detail: { matchId: card.dataset.matchId },
    });
    if (document.dispatchEvent(evt)) ev.preventDefault();
  });

  root.querySelectorAll('img[data-fallback]').forEach((img) => {
    img.addEventListener('error', () => {
      const span = document.createElement('span');
      span.className = 'tr-logo tr-logo--fallback';
      span.textContent = img.dataset.fallback;
      span.setAttribute('aria-hidden', 'true');
      img.replaceWith(span);
    }, { once: true });
  });

  window.TournamentPage = { setTab };
})();
