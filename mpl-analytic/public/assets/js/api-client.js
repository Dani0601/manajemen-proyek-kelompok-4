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
        const err = new Error(result.message || `HTTP ${response.status}`);
        err.status = response.status;
        throw err;
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
      // Menggunakan Promise.allSettled agar kegagalan 1 endpoint tidak membatalkan yang lain
      const results = await Promise.allSettled([
        request(`/heroes/${heroId}/builds`),
        request(`/heroes/${heroId}`),
        request(`/heroes/${heroId}/skills`),
        request(`/heroes/${heroId}/counters`),
        request(`/heroes/${heroId}/stats`)
      ]);

      return {
        buildRaw: results[0].status === "fulfilled" ? results[0].value : null,
        detailRaw: results[1].status === "fulfilled" ? results[1].value : null,
        skillsRaw: results[2].status === "fulfilled" ? results[2].value : null,
        countersRaw: results[3].status === "fulfilled" ? results[3].value : null,
        statsRaw: results[4].status === "fulfilled" ? results[4].value : null
      };
    } catch (error) {
      console.error("API Fetch Error:", error);
      return null;
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
  async function getHeroes(q = '', role = '') {
    const params = new URLSearchParams();
    
    // Gunakan trim() untuk menghindari spasi kosong
    if (q.trim()) params.append('q', q.trim());
    
    // Jangan kirim parameter role jika isinya kosong atau 'All Roles'
    if (role.trim() && role !== 'All Roles') params.append('role', role.trim());

    const queryString = params.toString() ? `?${params.toString()}` : '';
    
    // Memanfaatkan fungsi helper request() yang sudah ada
    // Ini akan menembak ke URL: /api/heroes atau /api/heroes?search=akai&role=Tank
    return request(`/heroes${queryString}`);
  }
  async function getHeroBuilds(heroId) {
      if (!heroId) throw new Error('Hero ID diperlukan untuk getHeroBuilds');
      return request(`/heroes/${heroId}/builds`);
  }
  async function getHeroCounters(heroId) {
      if (!heroId) throw new Error('Hero ID diperlukan untuk getHeroCounters');
      return request(`/heroes/${heroId}/counters`);
  }
  async function getTournamentStandings(seasonId = 1) {
    return request(
      `/tournaments/${encodeURIComponent(seasonId)}/standings`
    );
  }
  async function getTeams() {
    return request(`/teams`);
  }

  async function getTeamStats(teamId) {
    return request(`/teams/${encodeURIComponent(teamId)}/stats`);
  }


  window.ApiClient = {
    getDashboard,
    getTournamentSchedule,
    getHeroDetail,
    getHeroBuilds,
    getHeroCounters,
    getPlayerComparison,
    getPlayerList,
    getHeroes,
    getTournamentStandings,
    getTeams,
    getTeamStats,
    baseUrl: "http://menpro.test/manajemen-proyek-kelompok-4/mpl-analytic/public",
    // Tambahkan di dalam objek window.ApiClient
    searchHeroes: async function(query = '', role = '') {
        try {
            // 1. Ambil baseUrl (jika undefined, gunakan string kosong agar tidak error)
            const base = this.baseUrl || '';
            
            // 2. Gunakan URLSearchParams HANYA untuk merangkai parameter ?q= dan ?role=
            const params = new URLSearchParams();
            if (query) params.append('q', query);
            if (role) params.append('role', role);

            // 3. Gabungkan parameter menjadi string URL akhir
            const queryString = params.toString() ? `?${params.toString()}` : '';
            const finalUrl = `${base}/api/heroes/search${queryString}`;

            // 4. Lakukan pemanggilan API
            const response = await fetch(finalUrl);
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            
            return await response.json();
        } catch (error) {
            console.error("Gagal melakukan pencarian:", error);
            throw error;
        }
    }
  };
})();
