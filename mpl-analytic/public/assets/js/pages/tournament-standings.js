console.log("1. File tournament-standings.js berhasil dimuat!");

(function () {
    'use strict';

    let isLoaded = false;

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

    function getTeamLogoUrl(teamName) {
        if (TEAM_LOGOS[teamName]) return TEAM_LOGOS[teamName];
        return 'https://placehold.co/32x32/0f172a/ffffff?text=?';
    }

    function escapeHTML(value) {
        return String(value ?? '').replace(/[&<>"']/g, (char) => ({
            '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
        })[char]);
    }

    function renderTable(teams) {
        let rowsHtml = '';

        teams.forEach((team) => {
            const netWin = parseInt(team.net_game_win) || 0;
            let netWinClass = '';
            let netWinText = team.net_game_win;

            if (netWin > 0) {
                netWinClass = 'tr-pos';
                netWinText = `+${netWin}`;
            } else if (netWin < 0) {
                netWinClass = 'tr-neg';
            }

            const teamName = escapeHTML(team.team_name);
            const logoUrl = getTeamLogoUrl(team.team_name);

            rowsHtml += `
                <tr>
                    <td class="tr-table__rank">${team.rank}</td>
                    <td class="tr-table__team">
                        <div class="tr-table__teamwrap">
                            <img src="${logoUrl}" alt="${teamName}" class="tr-logo tr-logo--fallback" onerror="this.onerror=null; this.src='https://placehold.co/32x32/0f172a/ffffff?text=?';">
                            <span>${teamName}</span>
                        </div>
                    </td>
                    <td class="tr-table__pts">${escapeHTML(team.match_point)}</td>
                    <td>${escapeHTML(team.match_w_l)}</td>
                    <td class="${netWinClass}">${netWinText}</td>
                    <td>${escapeHTML(team.game_w_l)}</td>
                </tr>
            `;
        });

        return `
            <div class="tr-table-wrap">
                <div class="tr-table-scroll">
                    <table class="tr-table">
                        <thead>
                            <tr>
                                <th>Rank</th>
                                <th class="tr-table__team">Tim</th>
                                <th>Poin</th>
                                <th>M-K</th>
                                <th>+/-</th>
                                <th>PTD</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${rowsHtml}
                        </tbody>
                    </table>
                </div>
            </div>
        `;
    }

    async function loadStandings() {
        console.log("2. Fungsi loadStandings() mulai dijalankan...");
        const container = document.getElementById('tr-standings-content');
        
        if (!container) {
            console.error("Elemen #tr-standings-content tidak ditemukan di HTML!");
            return;
        }

        try {
            const root = document.querySelector('.tr');
            const seasonId = root && root.dataset.seasonId ? parseInt(root.dataset.seasonId, 10) : 1;
            
            console.log("3. Memanggil API untuk season:", seasonId);
            
            // Panggil API
            const response = await window.ApiClient.getTournamentStandings(seasonId);
            console.log("4. Data diterima dari API:", response);
            
            const teams = Array.isArray(response) ? response : (response.data || []);

            if (teams.length === 0) {
                console.log("5. Data kosong.");
                container.innerHTML = `
                    <div class="p-4 text-center" style="color: #94a3b8;">
                        <p class="mb-0">Belum ada data klasemen untuk musim ini.</p>
                    </div>
                `;
                return;
            }

            console.log("5. Mulai render tabel HTML...");
            container.innerHTML = renderTable(teams);

            const legend = document.querySelector('.tr-legend');
            if (legend) legend.removeAttribute('hidden');

            console.log("6. Klasemen sukses ditampilkan!");

        } catch (error) {
            console.error('[Tournament Standings] Error:', error);
            container.innerHTML = `
                <div class="p-4 text-center" style="color: #f87171;">
                    <p class="mb-1 fw-bold">Gagal memuat klasemen.</p>
                    <p class="small mb-0">${error.message || 'Terjadi kesalahan jaringan.'}</p>
                </div>
            `;
        }
    }

    window.TournamentStandings = {
        init: function() {
            if (!isLoaded) { 
                loadStandings();
                isLoaded = true; 
            }
        }
    };

    // PANGGIL OTOMATIS SAAT HALAMAN SELESAI DIMUAT
    document.addEventListener('DOMContentLoaded', () => {
        window.TournamentStandings.init();
    });

})();