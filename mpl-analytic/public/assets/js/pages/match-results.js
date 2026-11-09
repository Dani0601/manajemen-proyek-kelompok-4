(function () {
  "use strict";

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

  const DEFAULT_LOGO = "https://cdn.mplanalytic.com/teams/default.png";

  // Mengambil logo berdasarkan nama tim.
  function getTeamLogo(teamName) {
    if (!teamName) return DEFAULT_LOGO;
    // Cek kecocokan persis atau gunakan pencarian case-insensitive jika perlu
    return TEAM_LOGOS[teamName] || DEFAULT_LOGO;
  }

  // Menormalisasi data satu pertandingan dari API.
  function normalizeMatch(match) {
    const teamAId = match.team_a?.team_id ?? match.team1_id ?? match.teamA?.id ?? null;
    const teamAName = match.team_a?.team_name ?? match.team1_name ?? match.teamA?.name ?? "Tim tidak diketahui";
    const scoreA = match.team_a?.score ?? match.team1_score ?? match.teamA?.score ?? 0;

    const teamBId = match.team_b?.team_id ?? match.team2_id ?? match.teamB?.id ?? null;
    const teamBName = match.team_b?.team_name ?? match.team2_name ?? match.teamB?.name ?? "Tim tidak diketahui";
    const scoreB = match.team_b?.score ?? match.team2_score ?? match.teamB?.score ?? 0;

    // Menentukan winnerTeamId jika backend mengirimkannya secara terpisah atau menghitungnya dari skor
    let winnerId = match.winner_team_id ?? match.winnerTeamId ?? null;
    if (winnerId == null && (scoreA > 0 || scoreB > 0)) {
      if (scoreA > scoreB) winnerId = teamAId;
      else if (scoreB > scoreA) winnerId = teamBId;
    }
    const matchId = match.match_id ?? match.schedule_id ?? match.id ?? null;
    let weekNumber = 1; // Default
    if (matchId) {
      // Regex /w(\d+)/i akan mencari huruf 'w' yang diikuti angka, contoh: w01, w02
      const weekMatch = matchId.match(/w(\d+)/i); 
      if (weekMatch && weekMatch[1]) {
        weekNumber = parseInt(weekMatch[1], 10);
      }
    }

    return {
      matchId: match.match_id ?? match.schedule_id ?? match.id ?? null,
      matchDate: match.match_date ?? match.date ?? null,
      week: weekNumber,
      teamA: {
        id: teamAId,
        name: teamAName,
        logo: getTeamLogo(teamAName),
        score: scoreA
      },

      teamB: {
        id: teamBId,
        name: teamBName,
        logo: getTeamLogo(teamBName),
        score: scoreB
      },

      winnerTeamId: winnerId
    };
  }

  // Mengambil dan mengolah hasil pertandingan.
  async function getMatchResults(seasonId = 1) {
    if (
      !window.ApiClient ||
      typeof window.ApiClient.getTournamentSchedule !== "function"
    ) {
      throw new Error(
        "ApiClient.getTournamentSchedule() belum tersedia. Periksa api-client.js."
      );
    }

    const data = await window.ApiClient.getTournamentSchedule(seasonId);

    // Menerima struktur respons yang didukung.
    const matches = Array.isArray(data)
      ? data
      : Array.isArray(data?.results)
        ? data.results
        : Array.isArray(data?.upcoming_matches)
          ? data.upcoming_matches
          : Array.isArray(data?.schedule)
            ? data.schedule
            : Array.isArray(data?.data)
              ? data.data
              : null;

    // Struktur tidak sesuai kontrak API.
    if (matches === null) {
      throw new Error(
        "Format respons API tidak memiliki array hasil pertandingan yang dikenali."
      );
    }

    // Data kosong bukan error.
    if (matches.length === 0) {
      return [];
    }

    return matches.map(normalizeMatch);
  }

  // Menentukan nama tim pemenang.
  function getWinnerName(match) {
    if (match.winnerTeamId == null) {
      return null;
    }

    if (Number(match.winnerTeamId) === Number(match.teamA.id)) {
      return match.teamA.name;
    }

    if (Number(match.winnerTeamId) === Number(match.teamB.id)) {
      return match.teamB.name;
    }

    return null;
  }

  // Menyediakan fungsi agar dapat dipakai halaman lain.
  window.MatchResults = {
    getMatchResults,
    getTeamLogo,
    getWinnerName
  };
})();