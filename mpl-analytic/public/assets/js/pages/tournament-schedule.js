console.log("File Jadwal sudah siap dan berhasil dimuat!");
(function () {
    'use strict';

    let isLoaded = false; 

    // Kamus Backup Logo Tim Berdasarkan Nama
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

    // Fungsi helper untuk mendapatkan logo (Prioritas: API -> Kamus TEAM_LOGOS -> Fallback Inisial)
    function getTeamLogoHTML(team) {
        const teamName = team?.team_name || 'Tim';
        const fallback = teamName.slice(0, 2).toUpperCase();
        
        // Cek apakah logo dari API valid (ada isinya dan bukan default.png)
        let logoUrl = team?.logo_url;
        if (!logoUrl || logoUrl.includes('default.png')) {
            // Jika tidak valid, ambil dari kamus TEAM_LOGOS berdasarkan nama tim
            logoUrl = TEAM_LOGOS[teamName] || null;
        }

        if (logoUrl) {
            return `<img class="tr-logo" src="${logoUrl}" alt="${escapeHTML(teamName)}">`;
        }

        // Jika di kamus juga tidak ada, gunakan inisial huruf
        return `<span class="tr-logo tr-logo--fallback" aria-hidden="true">${escapeHTML(fallback)}</span>`;
    }

    // Fungsi pengaman karakter HTML
    function escapeHTML(value) {
        return String(value ?? '').replace(/[&<>"']/g, (char) => ({
            '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
        })[char]);
    }

    // Fungsi mengubah format tanggal
    function formatMatchDate(value) {
        if (!value) return '';
        const date = new Date(`${value}`.slice(0, 10) + 'T00:00:00');
        if (Number.isNaN(date.getTime())) return String(value);
        return new Intl.DateTimeFormat('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(date);
    }

    // Fungsi mencetak HTML 1 Pertandingan
    function renderMatchItem(match) {
        const teamA = match.team_a;
        const teamB = match.team_b;
        const matchId = match.match_id || '';
        
        let matchTime = "--:--";
        if (match.match_date) {
            const timePart = match.match_date.split('T')[1] || match.match_date.split(' ')[1];
            if (timePart) matchTime = timePart.slice(0, 5);
        }

        const isFinished = match.winner_team_id !== null;
        const scoreA = isFinished ? (teamA.score ?? 0) : '-';
        const scoreB = isFinished ? (teamB.score ?? 0) : '-';

        const logoHTML_A = getTeamLogoHTML(teamA);
        const logoHTML_B = getTeamLogoHTML(teamB);

        return `
            <a class="tr-res" href="#match-${matchId}" data-match-id="${matchId}">
                <div class="tr-res__time">${matchTime}</div>
                <div class="tr-res__teams">
                    <div class="tr-res__team">
                        ${logoHTML_A}
                        <span class="tr-res__name" title="${escapeHTML(teamA.team_name)}">${escapeHTML(teamA.team_name)}</span>
                        <span class="tr-res__score">${scoreA}</span>
                    </div>
                    <div class="tr-res__team">
                        ${logoHTML_B}
                        <span class="tr-res__name" title="${escapeHTML(teamB.team_name)}">${escapeHTML(teamB.team_name)}</span>
                        <span class="tr-res__score">${scoreB}</span>
                    </div>
                </div>
            </a>
        `;
    }

    // Fungsi Utama Menarik Data Jadwal
    async function loadSchedule() {
        const container = document.getElementById('tr-schedule-content');
        if (!container) return;

        container.innerHTML = `<div class="text-center py-4">Memuat seluruh jadwal pertandingan...</div>`;

        try {
            const root = document.querySelector('.tr');
            const seasonId = root && root.dataset.seasonId ? parseInt(root.dataset.seasonId, 10) : 1;

            const response = await window.ApiClient.getTournamentSchedule(seasonId);
            const allMatches = Array.isArray(response) ? response : (response.data || []);

            if (allMatches.length === 0) {
                container.innerHTML = `
                    <div class="tr-empty" role="status" style="margin-top: 16px;">
                        <strong>Belum ada jadwal</strong>
                        <p>Belum ada data pertandingan untuk season ini.</p>
                    </div>
                `;
                return;
            }

            allMatches.sort((a, b) => new Date(a.match_date) - new Date(b.match_date));

            const groupedByDate = {};
            allMatches.forEach((match) => {
                const dateText = formatMatchDate(match.match_date) || 'Jadwal Lainnya';
                if (!groupedByDate[dateText]) groupedByDate[dateText] = [];
                groupedByDate[dateText].push(match);
            });

            let html = '';
            for (const [dateStr, dateMatches] of Object.entries(groupedByDate)) {
                html += `
                    <div class="tr-day">
                        <h3 class="tr-day__title">${escapeHTML(dateStr)}</h3>
                        <div class="tr-day__matches">
                            ${dateMatches.map(renderMatchItem).join('')}
                        </div>
                    </div>
                `;
            }
            container.innerHTML = html;

        } catch (error) {
            console.error('[Tournament Schedule] Error:', error);
            container.innerHTML = `
                <div class="tr-empty" role="status" style="margin-top: 16px;">
                    <strong>Gagal memuat jadwal</strong>
                    <p>Terjadi kesalahan jaringan.</p>
                </div>
            `;
        }
    }

    window.TournamentSchedule = {
        init: function() {
            if (!isLoaded) { 
                loadSchedule();
                isLoaded = true; 
            }
        }
    };
})();