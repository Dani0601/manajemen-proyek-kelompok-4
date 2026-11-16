(function () {
  "use strict";

  const num = (v) =>
    v === null || v === undefined || v === "" || Number.isNaN(Number(v)) ? null : Number(v);
  const idOf = (v) => (v === null || v === undefined || v === "" ? null : Number(v));

  // Tahan dua bentuk: hero datar (hero_id, hero_name) atau objek bersarang (hero: {...})
  function hero(h) {
    return {
      id: h?.hero_id ?? null,
      name: h?.hero_name || "",
      icon: h?.hero_icon_url || "",
    };
  }

  function dateLabel(iso) {
    if (!iso) return "";
    const d = new Date(`${iso}T00:00:00`);
    if (Number.isNaN(d.getTime())) return iso;
    return new Intl.DateTimeFormat("id-ID", {
      weekday: "long", day: "numeric", month: "long", year: "numeric",
    }).format(d);
  }

  function normalizeTeam(t, matchWinnerId) {
    const id = idOf(t?.team_id);
    const assets = window.TeamAssets;
    return {
      id,
      name: t?.team_name || "",
      code: assets ? assets.code(t) : (t?.team_name || ""),
      logo: assets ? assets.logo(t) : (t?.logo_url || ""),
      score: num(t?.score) ?? 0,
      isWinner: id !== null && id === matchWinnerId,
    };
  }

  function normalizePlayer(p) {
    const kills = num(p.kills) ?? 0;
    const deaths = num(p.deaths) ?? 0;
    const assists = num(p.assists) ?? 0;
    // Endpoint match tidak mengirim kda. Dihitung: (kill + assist) / max(death, 1)
    const kda = num(p.kda) ?? Math.round(((kills + assists) / Math.max(deaths, 1)) * 100) / 100;

    return {
      id: p.player_id,
      name: p.player_name || "",
      photo: p.photo_url || p.player_photo_url || "",
      teamId: idOf(p.team_id),
      hero: hero(p.hero ?? p),
      kills, deaths, assists, kda,
      gold: num(p.gold),
      damage: num(p.damage),
      damageTaken: num(p.damage_taken),
      turretDamage: num(p.turret_damage),
      items: (Array.isArray(p.items) ? p.items : [])
        .map((i) => ({ slot: num(i.item_slot) ?? 0, name: i.item_name || "", icon: i.item_url || "" }))
        .sort((a, b) => a.slot - b.slot),
    };
  }

  function normalizeBan(b) {
    return {
      turn: num(b.ban_turn) ?? 0,
      teamId: idOf(b.team_id),
      teamName: b.team_name || "",
      side: b.side || "",
      hero: hero(b),
    };
  }

  function normalizeGame(g, team1Id, team2Id) {
    const winnerTeamId = idOf(g.winner_team_id);
    const players = (g.player_stats ?? g.players ?? []).map(normalizePlayer);
    const bans = (g.bans ?? []).map(normalizeBan).sort((a, b) => a.turn - b.turn);

    return {
      id: g.game_id,
      number: num(g.game_number) ?? 0,
      winnerTeamId,
      winnerSide: winnerTeamId === team1Id ? 1 : winnerTeamId === team2Id ? 2 : null,
      players,
      // [pemain tim 1, pemain tim 2] untuk tab Statistik
      byTeam: [
        players.filter((p) => p.teamId === team1Id),
        players.filter((p) => p.teamId === team2Id),
      ],
      // 10 hero yang dipick untuk tab Hero
      picks: players.map((p) => ({
        playerId: p.id, playerName: p.name, teamId: p.teamId, hero: p.hero,
      })),
      bans,
      hasData: players.length > 0,
    };
  }

  // payload = isi "data" dari GET /matches/{id} (request() sudah membuka data)
  function normalize(payload) {
    const m = payload?.match ?? payload ?? {};
    const matchWinnerId = idOf(m.winner_team_id);
    const team1 = normalizeTeam(m.team1, matchWinnerId);
    const team2 = normalizeTeam(m.team2, matchWinnerId);

    const rawGames = payload?.games ?? m.games ?? [];
    const games = rawGames
      .map((g) => normalizeGame(g, team1.id, team2.id))
      .sort((a, b) => a.number - b.number);

    const date = m.match_date ? String(m.match_date).slice(0, 10) : "";

    return {
      id: m.match_id || "",
      seasonId: num(m.season_id),
      week: num(m.week),
      status: m.status || "",
      date,
      dateLabel: dateLabel(date),
      time: m.match_time ? String(m.match_time).slice(0, 5) : "",
      teams: [team1, team2],
      winnerTeamId: matchWinnerId,
      games,
      hasData: !!m.match_id && games.some((g) => g.hasData),
    };
  }

  // Daftar peringatan untuk mengecek kebenaran data. Kosong = aman.
  function validate(match) {
    const warn = [];
    const [a, b] = match.teams;
    const wins1 = match.games.filter((g) => g.winnerSide === 1).length;
    const wins2 = match.games.filter((g) => g.winnerSide === 2).length;

    if (a.score !== wins1 || b.score !== wins2) {
      warn.push(`Skor ${a.score}-${b.score} tidak sama dengan kemenangan game ${wins1}-${wins2}`);
    }
    match.games.forEach((g) => {
      if (g.players.length !== 10) warn.push(`Game ${g.number}: ${g.players.length} pemain (harusnya 10)`);
      if (g.byTeam[0].length !== 5 || g.byTeam[1].length !== 5) {
        warn.push(`Game ${g.number}: pemain per tim ${g.byTeam[0].length} dan ${g.byTeam[1].length} (harusnya 5 dan 5)`);
      }
      if (g.bans.length !== 10) warn.push(`Game ${g.number}: ${g.bans.length} ban (harusnya 10)`);
      if (g.winnerSide === null) warn.push(`Game ${g.number}: pemenang game tidak cocok dengan kedua tim`);
    });
    return warn;
  }

  window.MatchMapper = { normalize, validate };
})();