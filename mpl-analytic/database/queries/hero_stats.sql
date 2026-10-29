-- Hitung statistik meta hero berdasarkan season_id
-- Menggunakan tabel: hero_season_stats (pre-computed), game_picks, games, matches
-- CATATAN: :season_id digunakan sekali di JOIN; parameter direplikasi di PHP

SELECT
    h.hero_id,
    h.hero_name,
    COALESCE(hss.pick_count, 0)  AS total_picked,
    COALESCE(hss.win_count, 0)   AS total_wins,
    COALESCE(hss.pick_rate, 0)   AS pick_rate,
    COALESCE(hss.win_rate, 0)    AS win_rate,
    -- Pick rate dari game_picks sebagai proxy ban_rate (tidak ada tabel ban tersendiri)
    ROUND(
        COALESCE(gph.hero_picks, 0)
        / NULLIF(season_games.total_games, 0) * 100,
        2
    ) AS ban_rate
FROM heroes h
-- Join hero season stats
LEFT JOIN hero_season_stats hss
    ON hss.hero_id = h.hero_id
   AND hss.season_id = :season_id_1
-- Join total game picks per hero di season ini
LEFT JOIN (
    SELECT gp.hero_id, COUNT(gp.game_pick_id) AS hero_picks
    FROM game_picks gp
    JOIN games g ON gp.game_id = g.game_id
    JOIN matches m ON g.match_id = m.match_id
    WHERE m.season_id = :season_id_2
    GROUP BY gp.hero_id
) gph ON gph.hero_id = h.hero_id
-- Total game di season ini (untuk normalisasi)
CROSS JOIN (
    SELECT COUNT(g.game_id) AS total_games
    FROM games g
    JOIN matches m ON g.match_id = m.match_id
    WHERE m.season_id = :season_id_3
) season_games
ORDER BY COALESCE(hss.pick_count, 0) DESC;
