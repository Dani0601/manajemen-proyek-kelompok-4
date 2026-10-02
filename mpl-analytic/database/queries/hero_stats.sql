WITH SeasonTotalMatches AS (
    -- Menghitung total game yang dimainkan di season tersebut untuk pembagi Pick/Ban Rate
    SELECT COUNT(g.game_id) AS total_games
    FROM games g
    JOIN matches m ON g.match_id = m.match_id
    WHERE m.season_id = s.season_id
),
HeroPicks AS (
    -- Menghitung jumlah pick, kemenangan, dan MVP hero dari tabel statistik pemain
    SELECT 
        gps.hero_id,
        COUNT(gps.stat_id) AS total_picked,
        SUM(CASE WHEN g.winner_team_id = tr.team_id THEN 1 ELSE 0 END) AS total_wins,
    FROM game_player_stats gps
    JOIN games g ON gps.game_id = g.game_id
    JOIN matches m ON g.match_id = m.match_id
    JOIN team_rosters tr ON gps.player_id = tr.player_id AND tr.season_id = m.season_id
    WHERE m.season_id = s.season_id
    GROUP BY gps.hero_id
),
HeroBans AS (
    -- Menghitung jumlah ban hero dari tabel draft pick
    SELECT 
        gd.hero_id,
        COUNT(gd.draft_id) AS total_banned
    FROM game_drafts gd
    JOIN games g ON gd.game_id = g.game_id
    JOIN matches m ON g.match_id = m.match_id
    WHERE m.season_id = s.season_id AND gd.draft_type = 'BAN'
    GROUP BY gd.hero_id
)
-- Menggabungkan seluruh metrik Meta Hero
SELECT 
    h.hero_id,
    h.hero_name,
    h.primary_role,
    COALESCE(hp.total_picked, 0) AS total_picked,
    COALESCE(hb.total_banned, 0) AS total_banned,
    
    -- Hitung Pick Rate (%) terhadap total game di season tersebut
    ROUND((COALESCE(hp.total_picked, 0) / NULLIF(stm.total_games, 0)) * 100, 2) AS pick_rate,
    
    -- Hitung Ban Rate (%) terhadap total game di season tersebut
    ROUND((COALESCE(hb.total_banned, 0) / NULLIF(stm.total_games, 0)) * 100, 2) AS ban_rate,
    
    -- Hitung Win Rate (%) dari total game yang dimainkan hero tersebut
    ROUND((COALESCE(hp.total_wins, 0) / NULLIF(hp.total_picked, 0)) * 100, 2) AS win_rate,
    

FROM heroes h
CROSS JOIN SeasonTotalMatches stm
LEFT JOIN HeroPicks hp ON h.hero_id = hp.hero_id
LEFT JOIN HeroBans hb ON h.hero_id = hb.hero_id
ORDER BY (COALESCE(hp.total_picked, 0) + COALESCE(hb.total_banned, 0)) DESC;