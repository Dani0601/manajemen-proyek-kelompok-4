document.addEventListener("DOMContentLoaded", () => {
    // ==========================================
    // 1. TANGKAP ELEMEN DOM
    // ==========================================
    const selectTeamA = document.getElementById("pc-team-a");
    const selectTeamB = document.getElementById("pc-team-b");
    const selectPlayerA = document.getElementById("pc-player-a");
    const selectPlayerB = document.getElementById("pc-player-b");
    
    // Elemen UI State dari FE 1
    const resultContainer = document.getElementById("pc-result");
    const skeletonUI = document.getElementById("pc-skeleton");
    const alertBox = document.getElementById("pc-alert");
    const alertCloseBtn = document.getElementById("pc-alert-close");
    const noticeBox = document.getElementById("pc-notice");
    const liveRegion = document.getElementById("pc-live"); // Untuk screen reader

    let allPlayersData = [];

    // ==========================================
    // 2. HELPER: MANAJEMEN TAMPILAN (UI STATE)
    // ==========================================
    
    // Sembunyikan semua elemen hasil/loading/alert
    function hideAllStates() {
        if (resultContainer) resultContainer.hidden = true;
        if (skeletonUI) skeletonUI.hidden = true;
        if (alertBox) alertBox.hidden = true;
        if (noticeBox) noticeBox.hidden = true;
    }

    // Tampilkan animasi skeleton loading
    function showLoading() {
        hideAllStates();
        if (skeletonUI) skeletonUI.hidden = false;
        if (liveRegion) liveRegion.textContent = "Memuat data perbandingan...";
    }

    // Tampilkan alert kotak merah jika pemain sama
    function showSamePlayerAlert() {
        hideAllStates();
        if (alertBox) alertBox.hidden = false;
        if (liveRegion) liveRegion.textContent = "Kesalahan: Pemain yang sama tidak dapat dipilih.";
    }

    // Tampilkan pesan error/data kosong
    function showError(message) {
        hideAllStates();
        if (noticeBox) {
            noticeBox.textContent = message;
            noticeBox.hidden = false;
        }
        if (liveRegion) liveRegion.textContent = message;
    }

    // Event Listener khusus untuk tombol "X" (Tutup Alert)
    if (alertCloseBtn) {
        alertCloseBtn.addEventListener("click", () => {
            if (alertBox) alertBox.hidden = true;
        });
    }

    // Ekstrak data untuk Spider Chart
    function getRadarDataset(stats) {
        if (!stats) return [];
        return [
            stats.kill_power || 0,
            stats.farm_rate || 0,
            stats.survival || 0,
            stats.versatility || 0,
            stats.objective || 0,
            stats.teamfight || 0
        ];
    }

    // ==========================================
    // TAHAP 1: Ambil Data Sekali & Isi Dropdown Tim
    // ==========================================
    async function initData() {
        try {
            allPlayersData = await window.ApiClient.getPlayerList();
            
            const uniqueTeams = [...new Set(allPlayersData.map(p => p.team_name).filter(Boolean))];
            let teamOptionsHtml = '<option value="">Pilih tim</option>';
            
            uniqueTeams.forEach(teamName => {
                teamOptionsHtml += `<option value="${teamName}">${teamName}</option>`;
            });

            if (selectTeamA) selectTeamA.innerHTML = teamOptionsHtml;
            if (selectTeamB) selectTeamB.innerHTML = teamOptionsHtml;

        } catch (error) {
            console.error("Gagal mengambil data awal:", error);
            showError("Gagal memuat data tim. Pastikan Anda terhubung ke internet.");
        }
    }

    // ==========================================
    // TAHAP 2: Filter Pemain Berdasarkan Tim (Lokal)
    // ==========================================
    function updatePlayerDropdown(selectedTeamName, targetSelectElement, placeholderTxt) {
        if (!selectedTeamName) {
            targetSelectElement.innerHTML = `<option value="">${placeholderTxt}</option>`;
            return;
        }

        const filteredPlayers = allPlayersData.filter(p => p.team_name === selectedTeamName);
        let playerOptionsHtml = `<option value="">${placeholderTxt}</option>`;
        
        filteredPlayers.forEach(player => {
            playerOptionsHtml += `<option value="${player.player_id}">${player.player_name}</option>`;
        });

        targetSelectElement.innerHTML = playerOptionsHtml;
    }

    // ==========================================
    // TAHAP 3: Logika Perbandingan (API Call)
    // ==========================================
    async function comparePlayers() {
        const idA = selectPlayerA ? selectPlayerA.value : null;
        const idB = selectPlayerB ? selectPlayerB.value : null;

        if (!idA || !idB) return;

        // Cegah pemain yang sama dan munculkan Alert Box
        if (idA === idB) {
            showSamePlayerAlert();
            return;
        }

        try {
            showLoading(); // Nyalakan animasi skeleton

            const rawResponse = await window.ApiClient.getPlayerComparison(idA, idB);
            
            const player1Data = rawResponse.data ? rawResponse.data.player_1 : rawResponse.player_1;
            const player2Data = rawResponse.data ? rawResponse.data.player_2 : rawResponse.player_2;

            const normalizedData = {
                playerA: {
                    ...player1Data,
                    radarDataset: getRadarDataset(player1Data.stats)
                },
                playerB: {
                    ...player2Data,
                    radarDataset: getRadarDataset(player2Data.stats)
                }
            };

            // Matikan loading, buka kontainer hasil grafik
            hideAllStates();
            if (resultContainer) resultContainer.hidden = false;
            if (liveRegion) liveRegion.textContent = "Data perbandingan berhasil dimuat.";

            // Lempar ke fungsi Render
            if (window.ComparisonRender && typeof window.ComparisonRender.init === "function") {
                window.ComparisonRender.init(normalizedData);
            } else {
                console.warn("Fungsi window.ComparisonRender.init belum tersedia.");
            }

        } catch (error) {
            if (error.message === "SAME_PLAYER") {
                showSamePlayerAlert();
            } else {
                console.error(error);
                showError("Gagal mengambil data perbandingan pemain. Silakan coba lagi.");
            }
        }
    }

    // ==========================================
    // PEMASANGAN PELATUK (EVENT LISTENER)
    // ==========================================
    
    // Saat Tim berubah: Update dropdown pemain & reset area grafik
    if (selectTeamA) {
        selectTeamA.addEventListener("change", (e) => {
            updatePlayerDropdown(e.target.value, selectPlayerA, "Pemain A");
            hideAllStates(); 
        });
    }
    if (selectTeamB) {
        selectTeamB.addEventListener("change", (e) => {
            updatePlayerDropdown(e.target.value, selectPlayerB, "Pemain B");
            hideAllStates(); 
        });
    }

    // Saat Pemain berubah: Picu perbandingan
    if (selectPlayerA) selectPlayerA.addEventListener("change", comparePlayers);
    if (selectPlayerB) selectPlayerB.addEventListener("change", comparePlayers);

    // Inisialisasi
    initData();
});

// =========================================================================
// MOCK RENDERER SEMENTARA (Akan ditimpa oleh kode FE 1 nanti)
// =========================================================================
window.ComparisonRender = {
    init: function(data) {
        const canvas = document.getElementById("pc-radar-chart");
        if (!canvas) {
            console.error("Canvas #pc-radar-chart tidak ditemukan!");
            return;
        }

        // Ubah teks legenda HTML buatan FE 1
        const legendA = document.getElementById("pc-legend-a");
        const legendB = document.getElementById("pc-legend-b");
        if(legendA) legendA.textContent = data.playerA.player_name || "Pemain A";
        if(legendB) legendB.textContent = data.playerB.player_name || "Pemain B";

        // Hancurkan grafik lama jika ada agar tidak menumpuk (glitch)
        if (window.myRadarChart) {
            window.myRadarChart.destroy();
        }

        // Gambar Spider Chart dengan Chart.js
        window.myRadarChart = new Chart(canvas, {
            type: 'radar',
            data: {
                labels: ['Kill Power', 'Farm Rate', 'Survival', 'Versatility', 'Objective', 'Teamfight'],
                datasets: [
                    {
                        label: data.playerA.player_name,
                        data: data.playerA.radarDataset,
                        backgroundColor: 'rgba(54, 162, 235, 0.4)', // Biru
                        borderColor: 'rgb(54, 162, 235)',
                        pointBackgroundColor: 'rgb(54, 162, 235)',
                        borderWidth: 2
                    },
                    {
                        label: data.playerB.player_name,
                        data: data.playerB.radarDataset,
                        backgroundColor: 'rgba(255, 99, 132, 0.4)', // Merah
                        borderColor: 'rgb(255, 99, 132)',
                        pointBackgroundColor: 'rgb(255, 99, 132)',
                        borderWidth: 2
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    r: {
                        angleLines: { display: true },
                        suggestedMin: 0,
                        suggestedMax: 100, // Asumsi nilai maksimal stat adalah 100
                        ticks: { display: false }
                    }
                },
                plugins: {
                    legend: { display: false } // Sembunyikan legend bawaan
                }
            }
        });
        
        console.log("Mock Spider Chart berhasil digambar!");
    }
};