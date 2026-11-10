console.log("File Jadwal sudah siap dan berhasil dimuat!");
(function () {
    'use strict';

    let isLoaded = false;
    let allMatches = [];
    let activeWeek = 1;
    let totalWeeks = 1;

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

    // Nama singkat seperti di Figma (short_code dari API masih null)
    const SHORT_NAMES = {
        "Natus Vincere": "Navi",
        "RRQ Hoshi": "RRQ",
        "Bigetron by Vitality": "Bigetron",
        "Team Liquid ID": "Team Liquid",
        "Geek Fam ID": "Geek Fam",
        "Dewa United Esports": "Dewa United"
    };
    const shortName = (t) => t?.short_code || SHORT_NAMES[t?.team_name] || t?.team_name || 'Tim';

    function escapeHTML(value) {
        return String(value ?? '').replace(/[&<>"']/g, (char) => ({
            '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
        })[char]);
    }

    function getTeamLogoHTML(team) {
        const teamName = team?.team_name || 'Tim';
        const fallback = teamName.slice(0, 2).toUpperCase();

        let logoUrl = team?.logo_url;
        if (!logoUrl || logoUrl.includes('default.png')) {
            logoUrl = TEAM_LOGOS[teamName] || null;
        }

        if (logoUrl) {
            return `<img class="tr-logo" src="${logoUrl}" alt="${escapeHTML(teamName)}">`;
        }
        return `<span class="tr-logo tr-logo--fallback" aria-hidden="true">${escapeHTML(fallback)}</span>`;
    }

    // Tanpa tahun, sesuai Figma ("Jumat, 16 Oktober")
    function formatMatchDate(value) {
        if (!value) return '';
        const date = new Date(`${value}`.slice(0, 10) + 'T00:00:00');
        if (Number.isNaN(date.getTime())) return String(value);
        return new Intl.DateTimeFormat('id-ID', { weekday: 'long', day: 'numeric', month: 'long' }).format(date);
    }

    function formatFullDate(value) {
        const date = new Date(`${value}`.slice(0, 10) + 'T00:00:00');
        if (Number.isNaN(date.getTime())) return '';
        return new Intl.DateTimeFormat('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(date);
    }

    // match_id format: s18_w01_m01 -> minggu 1
    function getWeek(match) {
        if (match.week) return parseInt(match.week, 10);
        const m = /_w(\d+)_/.exec(match.match_id || '');
        return m ? parseInt(m[1], 10) : 1;
    }

    function getMatchTime(match) {
        if (match.match_time) return match.match_time.slice(0, 5);
        if (match.match_date && /[T ]\d{2}:\d{2}/.test(match.match_date)) {
            return match.match_date.split(/[T ]/)[1].slice(0, 5);
        }
        return '--:--';
    }

    function renderMatchItem(match) {
        const teamA = match.team_a;
        const teamB = match.team_b;
        const matchId = match.match_id || '';

        return `
            <a class="tr-res tr-res--schedule" href="#match-${escapeHTML(matchId)}" data-match-id="${escapeHTML(matchId)}">
                <div class="tr-res__time">${getMatchTime(match)}</div>
                <div class="tr-res__teams">
                    <div class="tr-res__team">
                        ${getTeamLogoHTML(teamA)}
                        <span class="tr-res__name" title="${escapeHTML(teamA.team_name)}">${escapeHTML(shortName(teamA))}</span>
                    </div>
                    <div class="tr-res__team">
                        ${getTeamLogoHTML(teamB)}
                        <span class="tr-res__name" title="${escapeHTML(teamB.team_name)}">${escapeHTML(shortName(teamB))}</span>
                    </div>
                </div>
                <div class="tr-res__vs">Vs</div>
            </a>
        `;
    }

    function renderNextMatch() {
        const el = document.getElementById('tr-schedule-note');
        if (!el) return;

        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const next = allMatches.find(m => new Date(`${m.match_date}`.slice(0, 10) + 'T00:00:00') >= today);

        if (!next) { el.textContent = ''; return; }

        const t = getMatchTime(next);
        const jam = t !== '--:--' ? ` pukul ${t}` : '';
        const season = document.querySelector('.tr')?.dataset.seasonNumber || '';
        el.textContent = `Pertandingan MPL Indonesia Season ${season} selanjutnya: ${shortName(next.team_a)} vs ${shortName(next.team_b)} pada hari ${formatFullDate(next.match_date)}${jam}.`;
    }

    function renderWeekNav() {
        const nav = document.getElementById('tr-week-nav');
        if (!nav) {
            const content = document.getElementById('tr-schedule-content');
            if (!content) return;
            nav = document.createElement('div');
            nav.id = 'tr-week-nav';
            content.parentNode.insertBefore(nav, content);
        }

        nav.className = 'tr-wk';
        nav.innerHTML =
            `<span class="tr-wk__label">Minggu</span>` +
            `<div class="tr-wk__btns">` +
            Array.from({ length: totalWeeks }, (_, i) => {
                const w = i + 1;
                return `<button type="button" class="tr-wk__btn ${w === activeWeek ? 'is-active' : ''}" data-week="${w}">${w}</button>`;
            }).join('') +
            `</div>`;

        nav.querySelectorAll('.tr-wk__btn').forEach(btn => {
            btn.addEventListener('click', () => {
                activeWeek = parseInt(btn.dataset.week, 10);
                renderSchedule();
            });
        });
        console.log('totalWeeks:', totalWeeks, 'activeWeek:', activeWeek);
    }

    function renderSchedule() {
        const container = document.getElementById('tr-schedule-content');
        if (!container) return;

        const weekMatches = allMatches.filter(m => m._week === activeWeek);

        if (weekMatches.length === 0) {
            const emptyCard = `
                <div class="text-center shadow-sm d-flex flex-column justify-content-center align-items-center" style="width: 100%; min-height: 240px; padding: 40px 20px; background-color: #172B4D; border-radius: 4px; margin-bottom: 24px; border: 1px solid rgba(255, 255, 255, 0.2);">
                    <!-- Ikon Lingkaran dengan 3 Bar -->
                    <div style="width: 72px; height: 72px; background-color: #cbd5e1; border-radius: 50%; display: flex; align-items: flex-end; justify-content: center; gap: 6px; padding-bottom: 20px; margin-bottom: 16px;">
                        <div style="width: 8px; height: 16px; background-color: #ffffff; border-radius: 2px;"></div>
                        <div style="width: 8px; height: 28px; background-color: #ffffff; border-radius: 2px;"></div>
                        <div style="width: 8px; height: 20px; background-color: #ffffff; border-radius: 2px;"></div>
                    </div>
                    <!-- Teks Informasi -->
                    <div style="color: #ffffff; font-weight: 600; font-size: 15px; margin-bottom: 4px;">
                        Belum ada jadwal pertandingan
                    </div>
                    <div style="color: #cbd5e1; font-size: 13px;">
                        Belum ada pertandingan yang dijadwalkan untuk minggu ini
                    </div>
                </div>`;
                container.innerHTML = `
                <div style="display: flex; flex-direction: column; gap: 16px; margin-bottom: 24px; width: 100%;">
                    ${emptyCard}
                    ${emptyCard}
                    ${emptyCard}
                </div>
            `;
            renderWeekNav();
            return;
        }

        const grouped = {};
        weekMatches.forEach(match => {
            const key = formatMatchDate(match.match_date) || 'Jadwal Lainnya';
            (grouped[key] = grouped[key] || []).push(match);
        });

        container.innerHTML = Object.entries(grouped).map(([dateStr, list]) => `
            <div class="tr-day">
                <h3 class="tr-day__title">${escapeHTML(dateStr)}</h3>
                <div class="tr-day__matches">
                    ${list.map(renderMatchItem).join('')}
                </div>
            </div>
        `).join('');

        renderWeekNav();
    }

    async function loadSchedule() {
        const container = document.getElementById('tr-schedule-content');
        if (!container) return;
        document.querySelector('.tr')?.classList.add('is-loading');
        try {
            const root = document.querySelector('.tr');
            const seasonId = root && root.dataset.seasonId ? parseInt(root.dataset.seasonId, 10) : 1;

            const response = await window.ApiClient.getTournamentSchedule(seasonId);
            allMatches = Array.isArray(response) ? response : (response.data || []);

            if (allMatches.length === 0) {
                const emptyCard = `
                    <div class="text-center shadow-sm d-flex flex-column justify-content-center align-items-center" style="width: 100%; min-height: 240px; padding: 40px 20px; background-color: #172B4D; border-radius: 4px; margin-top: 0; border: 1px solid rgba(255, 255, 255, 0.2);">
                        <!-- Ikon Lingkaran dengan 3 Bar -->
                        <div style="width: 72px; height: 72px; background-color: #cbd5e1; border-radius: 50%; display: flex; align-items: flex-end; justify-content: center; gap: 6px; padding-bottom: 20px; margin-bottom: 16px;">
                            <div style="width: 8px; height: 16px; background-color: #ffffff; border-radius: 2px;"></div>
                            <div style="width: 8px; height: 28px; background-color: #ffffff; border-radius: 2px;"></div>
                            <div style="width: 8px; height: 20px; background-color: #ffffff; border-radius: 2px;"></div>
                        </div>
                        <!-- Teks Informasi -->
                        <div style="color: #ffffff; font-weight: 600; font-size: 15px; margin-bottom: 4px;">
                            Belum ada jadwal pertandingan
                        </div>
                        <div style="color: #cbd5e1; font-size: 13px;">
                            Belum ada data pertandingan untuk season ini
                        </div>
                    </div>`;
                    container.innerHTML = `
                        <div style="display: flex; flex-direction: column; gap: 16px; margin-bottom: 24px; width: 100%;">
                            ${emptyCard}
                            ${emptyCard}
                            ${emptyCard}
                        </div>
                    `;
                return;
            }

            allMatches.sort((a, b) =>
                new Date(a.match_date) - new Date(b.match_date) ||
                String(a.match_id).localeCompare(String(b.match_id))
            );
            allMatches.forEach(m => { m._week = getWeek(m); });
            totalWeeks = Math.max(...allMatches.map(m => m._week));

            // Minggu default: minggu pertandingan terdekat, kalau tidak ada pakai minggu terakhir
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const upcoming = allMatches.find(m => new Date(`${m.match_date}`.slice(0, 10) + 'T00:00:00') >= today);
            activeWeek = upcoming ? upcoming._week : allMatches[allMatches.length - 1]._week;
            
            renderNextMatch();
            renderSchedule();
            console.log('totalWeeks:', totalWeeks, 'activeWeek:', activeWeek);
        } catch (error) {
            console.error('[Tournament Schedule] Error:', error);
            container.innerHTML = `
                <div class="tr-empty" role="status">
                    <strong>Gagal memuat jadwal pertandingan</strong>
                    <p>Terjadi kesalahan jaringan.</p>
                </div>`;
        }finally {
            const panel = document.getElementById('tr-panel-jadwal');
            if (panel && !panel.hidden) {
                document.querySelector('.tr')?.classList.remove('is-loading');
            }
        }

    }

    window.TournamentSchedule = {
        init: function () {
            if (!isLoaded) {
                loadSchedule();
                isLoaded = true;
            }
        }
    };
})();