WITH TeamMatches AS (
    -- Menghitung statistik level Match (Seri BO3/BO5)
    SELECT 
        t.team_id,
        t.team_name,
        t.short_code,
        t.logo_url,
        COUNT(m.match_id) AS matches_played,
        SUM(CASE WHEN m.winner_team_id = t.team_id THEN 1 ELSE 0 END) AS match_wins,
        SUM(CASE WHEN m.winner_team_id IS NOT NULL AND m.winner_team_id != t.team_id THEN 1 ELSE 0 END) AS match_losses
    FROM teams t
    LEFT JOIN matches m ON (t.team_id = m.team_a_id OR t.team_id = m.team_b_id) 
        AND m.season_id = 13 -- Parameter ini nanti diganti dengan variabel dinamis di backend (misal: ? di PDO)
    GROUP BY t.team_id
),
TeamGames AS (
    -- Menghitung statistik level Game (Ronde spesifik) untuk kalkulasi poin MPL dan Game Rate
    SELECT 
        t.team_id,
        COUNT(g.game_id) AS games_played,
        SUM(CASE WHEN g.winner_team_id = t.team_id THEN 1 ELSE 0 END) AS game_wins,
        SUM(CASE WHEN g.winner_team_id IS NOT NULL AND g.winner_team_id != t.team_id THEN 1 ELSE 0 END) AS game_losses
    FROM teams t
    JOIN matches m ON (t.team_id = m.team_a_id OR t.team_id = m.team_b_id) 
        AND m.season_id = 13
    JOIN games g ON m.match_id = g.match_id
    GROUP BY t.team_id
)
-- Menggabungkan data dan menghitung Rank, Game Rate, dan Aggregate Points
SELECT 
    RANK() OVER (ORDER BY (COALESCE(tg.game_wins, 0) - COALESCE(tg.game_losses, 0)) DESC, tm.match_wins DESC) AS `rank`,
    tm.team_id,
    tm.team_name,
    tm.short_code,
    tm.logo_url,
    tm.matches_played,
    tm.match_wins,
    tm.match_losses,
    CONCAT(ROUND((COALESCE(tg.game_wins, 0) / NULLIF(tg.games_played, 0)) * 100), '%') AS game_rate,
    (COALESCE(tg.game_wins, 0) - COALESCE(tg.game_losses, 0)) AS points
FROM TeamMatches tm
LEFT JOIN TeamGames tg ON tm.team_id = tg.team_id
ORDER BY `rank` ASC;