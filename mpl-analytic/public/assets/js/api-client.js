console.log("=== FILE HERO-DETAIL.JS BERHASIL DIMUAT ===");
(function () {
  "use strict";

  const API_BASE_URL =
    (window.APP_CONFIG && window.APP_CONFIG.apiBase)
      ? window.APP_CONFIG.apiBase
      : "/api";

  async function request(endpoint) {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: "GET",
      headers: {
        Accept: "application/json",
      },
    });

    const contentType = response.headers.get("content-type") || "";

    if (!contentType.includes("application/json")) {
      throw new Error(
        `Respons API bukan JSON (HTTP ${response.status}). Periksa endpoint atau error PHP.`
      );
    }

    const result = await response.json();

    if (!response.ok) {
      throw new Error(
        result.message || `HTTP ${response.status}`
      );
    }

    if (result.success === false) {
      throw new Error(result.message || "API request gagal");
    }

    return result.data;
  }

  async function getDashboard() {
    return request("/dashboard");
  }

  async function getTournamentSchedule(seasonId = 1) {
    return request(
      `/tournaments/${encodeURIComponent(seasonId)}/schedule`
    );
  }

  async function getHeroDetail(heroId) {
    try {
      // Menggunakan helper request() bawaan agar API_BASE_URL dan error otomatis tertangani.
      // Pastikan endpoint ini sesuai dengan routing backend PHP Anda.
      const [buildData, detailData, skillsData] = await Promise.all([
        request(`/heroes/${heroId}/builds`),
        request(`/heroes/${heroId}`),
        request(`/heroes/${heroId}/skills`)
      ]);

      // Catatan: Fungsi request() sudah otomatis me-return 'result.data', 
      // sehingga kita tidak perlu lagi membongkar 'raw.data' nantinya.
      return {
        buildRaw: buildData,
        detailRaw: detailData,
        skillsRaw: skillsData
      };
    } catch (error) {
      console.error("API Fetch Error:", error.message);
      return null; // Memicu state error di fungsi render UI
    }
  }


  async function getPlayerList() {
    try {
        // Pastikan endpoint '/players' ini sesuai dengan URL di backend PHP Anda
        const response = await request('/players'); 
        return response;
    } catch (error) {
        console.error("Gagal mengambil daftar pemain:", error.message);
        throw error;
    }
  }

  // player comparison
  async function getPlayerComparison(player1Id, player2Id, seasonId =1) {
      if (player1Id === player2Id) {
          throw new Error("SAME_PLAYER");
      }
      try {
          // Ganti URL sesuai endpoint perbandingan pemain di backend Anda
          const response = await request(`/players/compare?p1=${player1Id}&p2=${player2Id}&season=${seasonId}`);
          return response; // response otomatis berisi isi dari "data" karena helper request()
      } catch (error) {
          console.error("API Fetch Error:", error.message);
          throw error;
      }
  }


  window.ApiClient = {
    getDashboard,
    getTournamentSchedule,
    getHeroDetail,
    getPlayerComparison,
    getPlayerList
  };
})();
