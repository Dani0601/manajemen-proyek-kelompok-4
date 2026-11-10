(function () {
    'use strict';

    const TEAM_LOGOS = {
        "ONIC": "https://wsrv.nl/?url=https://ik.imagekit.io/nloe8dhf7w/mplid/s14/teams/onic-b-256.png",
        "Dewa United Esports": "https://wsrv.nl/?url=https://ik.imagekit.io/nloe8dhf7w/mplid/s14/teams/dewa-united-500.png",
        "RRQ Hoshi": "https://wsrv.nl/?url=https://ik.imagekit.io/nloe8dhf7w/mplid/s14/teams/rrq-500.png",
        "Alter Ego": "https://wsrv.nl/?url=https://ik.imagekit.io/nloe8dhf7w/mplid/s14/teams/ae-256.png",
        "EVOS": "https://wsrv.nl/?url=https://ik.imagekit.io/nloe8dhf7w/mplid/s14/teams/evos-500.png",
        "Bigetron by Vitality": "https://wsrv.nl/?url=https://ik.imagekit.io/nloe8dhf7w/mplid/s14/teams/btr_vit.png",
        "Team Liquid ID": "https://wsrv.nl/?url=https://ik.imagekit.io/nloe8dhf7w/mplid/s14/teams/TLID-Primary500x500.png",
        "Geek Fam ID": "https://wsrv.nl/?url=https://ik.imagekit.io/nloe8dhf7w/mplid/s14/teams/geek-500.png",
        "Natus Vincere": "https://wsrv.nl/?url=https://ik.imagekit.io/nloe8dhf7w/mplid/s14/teams/NAVI-2.png"
    };

    const SHORT_NAMES = {
        "Natus Vincere": "NAVI", "Bigetron by Vitality": "Bigetron By Vit",
        "Team Liquid ID": "Team Liquid", "Geek Fam ID": "Geek Fam",
        "Dewa United Esports": "Dewa United", "ONIC": "Onic Esport"
    };
    const displayName = (t) => SHORT_NAMES[t.team_name] || t.team_name || 'Tim';

    function escapeHTML(v) {
        return String(v ?? '').replace(/[&<>"']/g, (c) => ({
            '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
        })[c]);
    }

    const num = (v) => (v === null || v === undefined || v === '') ? null : Number(v);

    // Petakan respons API -> format tampilan (nama field bisa disesuaikan setelah cek Postman)
    function normalize(t) {
        const played = num(t.total_matches ?? t.matches_played ?? t.match_played);
        const wins = num(t.match_wins ?? t.wins);
        const losses = num(t.match_losses ?? t.losses);
        let rate = num(t.win_rate);
        if (rate === null && played > 0 && wins !== null) rate = (wins / played) * 100;

        return {
            id: t.team_id,
            name: displayName(t),
            fullName: t.team_name,
            logo: (t.logo_url && !t.logo_url.includes('default.png')) ? t.logo_url : (TEAM_LOGOS[t.team_name] || null),
            played, wins, losses, rate,
            hasData: t.has_data !== false && played !== null
        };
    }

    function logoHTML(t) {
        if (t.logo) return `<img class="tl-logo" src="${escapeHTML(t.logo)}" alt="${escapeHTML(t.fullName)}">`;
        return `<span class="tl-logo tl-logo--fallback" aria-hidden="true">${escapeHTML(t.name.slice(0, 2).toUpperCase())}</span>`;
    }

    const show = (v) => (v === null || Number.isNaN(v)) ? '-' : v;

    function cardHTML(t, detailTpl) {
        const href = detailTpl.replace('{id}', encodeURIComponent(t.id));
        const body = t.hasData ? `
            <div class="tl-stats">
                <div><span class="tl-stat__label">Pertandingan</span><span class="tl-stat__value">${show(t.played)}</span></div>
                <div><span class="tl-stat__label">Menang</span><span class="tl-stat__value">${show(t.wins)}</span></div>
                <div><span class="tl-stat__label">Kalah</span><span class="tl-stat__value">${show(t.losses)}</span></div>
                <div><span class="tl-stat__label">Win Rate</span><span class="tl-stat__value tl-stat__value--rate">${t.rate === null ? '-' : Math.round(t.rate) + '%'}</span></div>
            </div>` : `<div class="tl-nodata">Data belum tersedia</div>`;

        return `
            <a class="tl-card" href="${escapeHTML(href)}" data-team-id="${escapeHTML(t.id)}">
                <div class="tl-card__top">
                    ${logoHTML(t)}
                    <span class="tl-card__name" title="${escapeHTML(t.fullName)}">${escapeHTML(t.name)}</span>
                    <svg class="tl-card__chev" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" aria-hidden="true"><path d="M9 5l7 7-7 7"/></svg>
                </div>
                ${body}
            </a>`;
    }

    function stateHTML(title, text, withRetry) {
        return `
            <div class="tl-state" role="status">
                <strong>${escapeHTML(title)}</strong>
                <p>${escapeHTML(text)}</p>
                ${withRetry ? '<button type="button" data-retry>Coba lagi</button>' : ''}
            </div>`;
    }

    async function loadTeams() {
        const root = document.querySelector('.tl');
        const list = document.getElementById('tl-list');
        if (!root || !list) return;

        root.classList.add('is-loading');
        try {
            const seasonId = parseInt(root.dataset.seasonId, 10) || 1;
            const response = await window.ApiClient.getTeams(seasonId); // service dari FE 2
            const raw = Array.isArray(response) ? response : (response.data || []);

            if (raw.length === 0) {
                list.innerHTML = stateHTML('Data tim belum tersedia', 'Belum ada tim yang dapat ditampilkan saat ini.');
                return;
            }

            const tpl = root.dataset.detailUrl || '#';
            list.innerHTML = `<div class="tl-grid">${raw.map(normalize).map(t => cardHTML(t, tpl)).join('')}</div>`;
        } catch (error) {
            console.error('[Team List] Error:', error);
            list.innerHTML = stateHTML('Gagal memuat daftar tim', 'Periksa koneksi internet Anda lalu coba lagi.', true);
            list.querySelector('[data-retry]')?.addEventListener('click', loadTeams);
        } finally {
            root.classList.remove('is-loading');
        }
    }

    document.addEventListener('DOMContentLoaded', loadTeams);
})();