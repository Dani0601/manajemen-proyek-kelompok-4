(function () {
  "use strict";

  const LOGOS = {
    "ONIC": "https://wsrv.nl/?url=https://ik.imagekit.io/nloe8dhf7w/mplid/s14/teams/onic-b-256.png",
    "Dewa United Esports": "https://wsrv.nl/?url=https://ik.imagekit.io/nloe8dhf7w/mplid/s14/teams/dewa-united-500.png",
    "RRQ Hoshi": "https://wsrv.nl/?url=https://ik.imagekit.io/nloe8dhf7w/mplid/s14/teams/rrq-500.png",
    "Alter Ego": "https://wsrv.nl/?url=https://ik.imagekit.io/nloe8dhf7w/mplid/s14/teams/ae-256.png",
    "EVOS": "https://wsrv.nl/?url=https://ik.imagekit.io/nloe8dhf7w/mplid/s14/teams/evos-500.png",
    "Bigetron by Vitality": "https://wsrv.nl/?url=https://ik.imagekit.io/nloe8dhf7w/mplid/s14/teams/btr_vit.png",
    "Team Liquid ID": "https://wsrv.nl/?url=https://ik.imagekit.io/nloe8dhf7w/mplid/s14/teams/TLID-Primary500x500.png",
    "Geek Fam ID": "https://wsrv.nl/?url=https://ik.imagekit.io/nloe8dhf7w/mplid/s14/teams/geek-500.png",
    "Natus Vincere": "https://wsrv.nl/?url=https://ik.imagekit.io/nloe8dhf7w/mplid/s14/teams/NAVI-2.png",
  };

  const CODES = {
    "Team Liquid ID": "TLID", "Natus Vincere": "NAVI", "Geek Fam ID": "GEEK",
    "Dewa United Esports": "DEWA", "Bigetron by Vitality": "BTR", "Alter Ego": "ALTER",
    "RRQ Hoshi": "RRQ", "EVOS": "EVOS", "ONIC": "ONIC",
  };

  window.TeamAssets = {
    // Logo dari API dipakai kalau valid, kalau default.png pakai kamus
    logo(team) {
      const url = team && team.logo_url;
      if (url && !url.includes("default.png")) return url;
      return LOGOS[team && team.team_name] || "";
    },
    code(team) {
      return (team && (team.short_code || CODES[team.team_name])) || (team && team.team_name) || "";
    },
  };
})();