document.addEventListener("DOMContentLoaded", () => {
    // ==========================================
    // 1. TANGKAP ELEMEN DOM
    // ==========================================
    const selectTeamA = document.getElementById("pc-team-a");
    const selectTeamB = document.getElementById("pc-team-b");
    const selectPlayerA = document.getElementById("pc-player-a");
    const selectPlayerB = document.getElementById("pc-player-b");
    
    // Elemen UI State dari FE 1
    const statusBox = document.getElementById("pc-status"); // BARU: Elemen ini wajib ditangkap
    const resultContainer = document.getElementById("pc-result");
    const skeletonUI = document.getElementById("pc-skeleton");
    const alertBox = document.getElementById("pc-alert");
    const alertCloseBtn = document.getElementById("pc-alert-close");
    const noticeBox = document.getElementById("pc-notice");
    const liveRegion = document.getElementById("pc-live");
    const cardsContainer = document.getElementById("pc-cards"); // Kartu pemain A & B
    let allPlayersData = [];

    // ==========================================
    // 2. HELPER: SAKLAR UI STATE
    // ==========================================
    // Menggantikan fungsi hideAllStates() yang lama
    function setUIState(activeState, errorMessage = "") {
        // 1. Matikan semua elemen terlebih dahulu
        if (statusBox) statusBox.hidden = true;
        if (resultContainer) resultContainer.hidden = true;
        if (skeletonUI) skeletonUI.hidden = true;
        if (alertBox) alertBox.hidden = true;
        if (noticeBox) noticeBox.hidden = true;
        // MATIKAN KARTU SAAT LOADING / ERROR
        if (cardsContainer) cardsContainer.hidden = true;
        // 2. Nyalakan hanya satu elemen yang diminta
        switch (activeState) {
            case "status":
                if (statusBox) {statusBox.hidden = false; statusBox.textContent = "Pilih kedua pemain untuk membandingkan.";}
                if (liveRegion) liveRegion.textContent = "Pilih kedua pemain untuk membandingkan.";
                break;
            case "loading":
                if (skeletonUI) skeletonUI.hidden = false;
                if (liveRegion) liveRegion.textContent = "Memuat data perbandingan...";
                break;
            case "alert":
                if (alertBox) alertBox.hidden = false;
                if (liveRegion) liveRegion.textContent = "Kesalahan: Pemain yang sama tidak dapat dipilih.";
                break;
            case "error":
                if (noticeBox) {
                    noticeBox.textContent = errorMessage;
                    noticeBox.hidden = false;
                }
                if (liveRegion) liveRegion.textContent = errorMessage;
                break;
            case "result":
                if (resultContainer) resultContainer.hidden = false;
                if (liveRegion) liveRegion.textContent = "Data perbandingan berhasil dimuat.";
                // Nyalakan kartu pemain
                if (cardsContainer) cardsContainer.hidden = false;
                break;
        }
    }

    // Event Listener khusus untuk tombol "X" (Tutup Alert)
    if (alertCloseBtn) {
        alertCloseBtn.addEventListener("click", () => {
            setUIState("status");
            // Kosongkan salah satu dropdown agar pengguna dipaksa memilih ulang
            if (selectPlayerB) selectPlayerB.value = "";
        });
    }

    // ==========================================
    // TAHAP 1: Ambil Data Sekali & Isi Dropdown Tim
    // ==========================================
    async function initData() {
        setUIState("status"); // Pastikan teks "Pilih kedua pemain" muncul saat awal

        try {
            // Sesuaikan pemanggilan API master player Anda di sini
            // allPlayersData = await window.ApiClient.getPlayerList(); 
            
            // CONTOH SEMENTARA menggunakan fetch standar jika ApiClient belum siap:
            const response = await window.ApiClient.getPlayerList();
            allPlayersData = response.data || response;

            // Ekstraksi Tim Unik (Logika Anda yang sudah bagus)
            const uniqueTeams = [...new Set(allPlayersData.map(p => p.team_name).filter(Boolean))];
            let teamOptionsHtml = '<option value="" disabled selected>Pilih tim</option>';
            
            uniqueTeams.forEach(teamName => {
                teamOptionsHtml += `<option value="${teamName}">${teamName}</option>`;
            });

            if (selectTeamA) selectTeamA.innerHTML = teamOptionsHtml;
            if (selectTeamB) selectTeamB.innerHTML = teamOptionsHtml;

            const defaultIdA = 42; 
            const defaultIdB = 2;

            // 2. Cari data pemain tersebut di allPlayersData
            const defaultPlayerA = allPlayersData.find(p => p.player_id == defaultIdA);
            const defaultPlayerB = allPlayersData.find(p => p.player_id == defaultIdB);

            if (defaultPlayerA && defaultPlayerB) {
                // 3. Set value dropdown Tim agar sesuai dengan tim pemain default
                if (selectTeamA) selectTeamA.value = defaultPlayerA.team_name;
                if (selectTeamB) selectTeamB.value = defaultPlayerB.team_name;

                // 4. Panggil fungsi update untuk mengisi list dropdown Pemain
                updatePlayerDropdown(defaultPlayerA.team_name, selectPlayerA, "Pemain A");
                updatePlayerDropdown(defaultPlayerB.team_name, selectPlayerB, "Pemain B");

                // 5. Set value dropdown Pemain
                if (selectPlayerA) selectPlayerA.value = defaultPlayerA.player_id;
                if (selectPlayerB) selectPlayerB.value = defaultPlayerB.player_id;

                // 6. Langsung eksekusi perbandingan!
                handleComparison();
            }
        } catch (error) {
            console.error("Gagal mengambil data awal:", error);
            setUIState("error", "Gagal memuat data master pemain.");
        }
    }

    // Helper: Ekstrak data untuk Spider Chart
    function getRadarDataset(stats) {
        if (!stats) return [];
        return [
            stats.kill_power || 0,
            stats.farm_rate || 0,
            stats.objective || 0,
            stats.survival || 0,
            stats.teamfight || 0,
            stats.versatility || 0
        ];
    }

// Helper: Render Baris Tabel Sederhana (Mengikuti CSS FE 1)
    function renderTableRow(valA, label, valB) {
        return `
        <div class="pc-row">
            <span class="pc-row__a">${valA}</span>
            <span class="pc-row__label">${label}</span>
            <span class="pc-row__b">${valB}</span>
        </div>`;
    }

    // Helper KHUSUS: Render Baris Performa Progress Bar (Mengikuti CSS FE 1)
    function renderPerfRow(playerName, winRate, isPlayerA) {
        // Gunakan modifier CSS dari FE 1: --a (Biru) atau --b (Oranye)
        const fillClass = isPlayerA ? 'pc-bar__fill--a' : 'pc-bar__fill--b'; 
        
        return `
        <div class="pc-row">
            <span class="pc-perf__name">${playerName}</span>
            <span class="pc-bar">
                <span class="pc-bar__fill ${fillClass}" style="width: ${winRate}%;"></span>
            </span>
            <span class="pc-perf__value">${winRate}%</span>
        </div>`;
    }

    // Helper: Render Kartu Pemain
    function renderPlayerCard(player) {
        if (!player) return "";

        const playerName = player.player_name || "Unknown";
        const initial = playerName.charAt(0).toUpperCase();

        // 1. Ambil URL mentah dari API (berisi http://localhost/...)
        const rawPhotoUrl = player.photo_url || player.player_photo_url || player.photo || "";

        // 2. TRIK JITU: Ambil HANYA nama filenya saja dari URL tersebut (contoh: "killuaa.png")
        // Jika URL kosong, fileName juga akan kosong.
        const fileName = rawPhotoUrl ? rawPhotoUrl.substring(rawPhotoUrl.lastIndexOf('/') + 1) : "";

        // 3. Rakit ulang menggunakan path folder lokal yang terbukti benar
        const photoUrl = fileName ? `assets/images/players/${fileName}` : "";

        // 4. Siapkan visual utama (Gambar atau Fallback)
        const mediaHtml = photoUrl 
            ? `<img class="pc-card__image" src="${photoUrl}" alt="${playerName}" style="object-fit: cover;" onerror="this.onerror=null; this.outerHTML='<span class=&quot;pc-card__initials&quot;>${initial}</span>';">`
            : `<span class="pc-card__initials">${initial}</span>`;

        // 5. Cetak ke HTML
        return `
        <div class="pc-card__fallback">
            ${mediaHtml}
            <span class="pc-card__name">${playerName}</span>
        </div>`;
    }

    // ==========================================
    // TAHAP 2: Filter Pemain Berdasarkan Tim 
    // ==========================================
    function updatePlayerDropdown(selectedTeamName, targetSelectElement, placeholderTxt) {
        if (!selectedTeamName) {
            targetSelectElement.innerHTML = `<option value="" disabled selected>${placeholderTxt}</option>`;
            return;
        }

        const filteredPlayers = allPlayersData.filter(p => p.team_name === selectedTeamName);
        let playerOptionsHtml = `<option value="" disabled selected>${placeholderTxt}</option>`;
        
        filteredPlayers.forEach(player => {
            playerOptionsHtml += `<option value="${player.player_id}">${player.player_name}</option>`;
        });

        targetSelectElement.innerHTML = playerOptionsHtml;
    }

    // ==========================================
    // TAHAP 3: Logika Perbandingan Otomatis (Validasi & Fetch)
    // ==========================================
    async function handleComparison() {
        const idA = selectPlayerA ? selectPlayerA.value : "";
        const idB = selectPlayerB ? selectPlayerB.value : "";

        // Jangan panggil API jika salah satu pemain belum dipilih
        if (!idA || !idB) {
            setUIState("status");
            return;
        }

        // BDD SKENARIO 2: Validasi Cegah pemain yang sama
        if (idA === idB) {
            setUIState("alert");
            return;
        }

        // Mulai Loading
        setUIState("loading");

        try {
            // Panggil API Komparasi
            // Sesuaikan endpoint sesuai route backend Anda!
            const rawResponse = await window.ApiClient.getPlayerComparison(idA, idB);

            console.log("Data Komparasi Diterima:", rawResponse);
            const p1 = rawResponse.data ? rawResponse.data.player_1 : rawResponse.player_1;
            const p2 = rawResponse.data ? rawResponse.data.player_2 : rawResponse.player_2;
            // 1. SIAPKAN DATA UNTUK SPIDER CHART
            const normalizedData = {
                playerA: {
                    player_name: p1.player_name,
                    radarDataset: getRadarDataset(p1.stats)
                },
                playerB: {
                    player_name: p2.player_name,
                    radarDataset: getRadarDataset(p2.stats)
                }
            };

            // 2. RENDER SPIDER CHART (Memanggil Mock Renderer FE 1)
            if (window.ComparisonRender && typeof window.ComparisonRender.init === "function") {
                window.ComparisonRender.init(normalizedData);
            } else {
                console.warn("Fungsi window.ComparisonRender.init belum terpasang di bawah file.");
            }

            // 3. RENDER TABEL STATISTIK LIGA
            const leagueA = p1.league_stats || p1.statistik_liga || {};
            const leagueB = p2.league_stats || p2.statistik_liga || {};
            document.getElementById("pc-league").innerHTML = 
                renderTableRow(leagueA.match_played || 0, "Match dimainkan", leagueB.match_played || 0) +
                renderTableRow(leagueA.avg_kda || 0, "KDA rata-rata", leagueB.avg_kda || 0) +
                renderTableRow((leagueA.kill_participation || 0) + "%", "Kill Participation", (leagueB.kill_participation || 0) + "%");

            // 4. RENDER TABEL STATISTIK DETAIL
            const detA = p1.detail_stats || p1.statistik_detail || {};
            const detB = p2.detail_stats || p2.statistik_detail || {};
            document.getElementById("pc-detail").innerHTML = 
                renderTableRow(detA.gold_per_minute || 0, "Gold per menit", detB.gold_per_minute || 0) +
                renderTableRow(detA.damage_per_minute || 0, "Damage per menit", detB.damage_per_minute || 0) +
                renderTableRow(detA.objective_secured || 0, "Objective dikuasai", detB.objective_secured || 0);

            // 5. RENDER TABEL PERFORMA (Win Rate Sementara menggunakan angka teks)
            const perfA = p1.performance || p1.performa || {};
            const perfB = p2.performance || p2.performa || {};
            const winRateA = parseFloat(perfA.win_rate || 0).toFixed(1);
            const winRateB = parseFloat(perfB.win_rate || 0).toFixed(1);

            // 6. RENDER KARTU FOTO PEMAIN
            document.getElementById("pc-card-a").innerHTML = renderPlayerCard(p1);
            document.getElementById("pc-card-b").innerHTML = renderPlayerCard(p2);
            // Suntikkan struktur progress bar ke HTML
            document.getElementById("pc-perf").innerHTML = 
                renderPerfRow(p1.player_name, winRateA, true) +
                renderPerfRow(p2.player_name, winRateB, false);
            // Tampilkan Hasil Akhir
            setUIState("result");

        } catch (error) {
            console.error(error);
            setUIState("error", "Gagal mengambil data perbandingan pemain. Silakan coba lagi.");
        }
    }

    // ==========================================
    // PEMASANGAN PELATUK (EVENT LISTENER)
    // ==========================================
    if (selectTeamA) {
        selectTeamA.addEventListener("change", (e) => {
            updatePlayerDropdown(e.target.value, selectPlayerA, "Pemain A");
            handleComparison(); 
        });
    }
    if (selectTeamB) {
        selectTeamB.addEventListener("change", (e) => {
            updatePlayerDropdown(e.target.value, selectPlayerB, "Pemain B");
            handleComparison(); 
        });
    }

    // Picu perbandingan otomatis saat pemain dipilih
    if (selectPlayerA) selectPlayerA.addEventListener("change", handleComparison);
    if (selectPlayerB) selectPlayerB.addEventListener("change", handleComparison);

    // Inisialisasi Aplikasi
    initData();
});

// =========================================================================
// MOCK RENDERER SEMENTARA: SPIDER CHART
// =========================================================================
window.ComparisonRender = {
    init: function(data) {
        const canvas = document.getElementById("pc-radar-chart");
        if (!canvas) {
            console.error("Canvas #pc-radar-chart tidak ditemukan!");
            return;
        }

        // Ubah teks legenda HTML
        const legendA = document.getElementById("pc-legend-a");
        const legendB = document.getElementById("pc-legend-b");
        if (legendA) legendA.textContent = data.playerA.player_name || "Pemain A";
        if (legendB) legendB.textContent = data.playerB.player_name || "Pemain B";

        // Hancurkan grafik lama jika ada agar tidak menumpuk saat ganti pemain
        if (window.myRadarChart) {
            window.myRadarChart.destroy();
        }

        // Gambar Spider Chart dengan Chart.js
        window.myRadarChart = new Chart(canvas, {
            type: 'radar',
            data: {
                labels: ['Kill Power', 'Farm Rate', 'Objective', 'Survival', 'Teamfight', 'Versatility'],
                datasets: [
                    {
                        label: data.playerA.player_name,
                        data: data.playerA.radarDataset,
                        // Gunakan warna Figma --pc-blue (#2F6FED) dengan opasitas 40% untuk isi jaring
                        backgroundColor: 'rgba(47, 111, 237, 0.4)', 
                        borderColor: '#2F6FED',
                        pointBackgroundColor: '#2F6FED',
                        pointBorderColor: '#fff',
                        pointBorderWidth: 1,
                        borderWidth: 2
                    },
                    {
                        label: data.playerB.player_name,
                        data: data.playerB.radarDataset,
                        // Gunakan warna Figma --pc-orange (#F28C28) dengan opasitas 40% untuk isi jaring
                        backgroundColor: 'rgba(242, 140, 40, 0.4)', 
                        borderColor: '#F28C28',
                        pointBackgroundColor: '#F28C28',
                        pointBorderColor: '#fff',
                        pointBorderWidth: 1.5,
                        borderWidth: 2
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    r: {
                        startAngle: 330,
                        angleLines: { display: true,color: '#74767b' },
                        grid: { color: '#74767b' },
                        suggestedMin: 0,
                        suggestedMax: 100, // Menjaga bentuk jaring tetap proporsional (0-100)
                        ticks: { display: false, stepSize: 20 },

                        pointLabels: {
                            font: {
                                size: 11,
                                weight: '600'
                            },
                            color: '#74767b'
                        }
                    }
                },
                layout: {
                    padding: 10,
                },
                plugins: {
                    legend: { display: false } // Sembunyikan legend bawaan karena FE 1 sudah buat legend kustom HTML
                }
            }
        });
        
        console.log("Spider Chart berhasil digambar!");
    }
};

