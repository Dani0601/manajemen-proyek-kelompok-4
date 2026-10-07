WITH PlayerRawStats AS (
    SELECT 
        p.player_id,
        p.nickname,
        t.team_name,
        tr.role,
        AVG(gps.damage_to_heroes / (g.duration_seconds / 60.0)) AS kill_power,
        AVG(gps.gold_earned / (g.duration_seconds / 60.0)) AS farm_rate,
        (SUM(gps.kills) + SUM(gps.assists)) / NULLIF(SUM(gps.deaths), 0) AS survival_kda,
        COUNT(DISTINCT gps.hero_id) AS versatility,
        
        -- Sumbu baru yang sudah diambil dari kolom database
        AVG(gps.turret_damage) AS objective,
        AVG(gps.teamfight_percentage) AS teamfight
        
    FROM players p
    JOIN team_rosters tr ON p.player_id = tr.player_id
    JOIN teams t ON tr.team_id = t.team_id
    JOIN game_player_stats gps ON p.player_id = gps.player_id
    JOIN games g ON gps.game_id = g.game_id
    JOIN matches m ON g.match_id = m.match_id
    WHERE m.season_id = :season_id 
    GROUP BY p.player_id, p.nickname, t.team_name, tr.role
),
SeasonMaxStats AS (
    SELECT 
        MAX(kill_power) AS max_kill_power,
        MAX(farm_rate) AS max_farm_rate,
        MAX(survival_kda) AS max_survival,
        MAX(versatility) AS max_versatility,
        
        -- Mencari nilai maksimal dari sumbu baru
        MAX(objective) AS max_objective,
        MAX(teamfight) AS max_teamfight
    FROM PlayerRawStats
)
SELECT 
    prs.player_id,
    prs.nickname,
    prs.team_name,
    prs.role,
    ROUND((prs.kill_power / NULLIF(sms.max_kill_power, 0)) * 100, 1) AS `Kill Power`,
    ROUND((prs.farm_rate / NULLIF(sms.max_farm_rate, 0)) * 100, 1) AS `Farm Rate`,
    ROUND((prs.survival_kda / NULLIF(sms.max_survival, 0)) * 100, 1) AS `Survival`,
    ROUND((prs.versatility / NULLIF(sms.max_versatility, 0)) * 100, 1) AS `Versatility`,
    
    -- Kalkulasi normalisasi 0-100 untuk sumbu baru
    ROUND((prs.objective / NULLIF(sms.max_objective, 0)) * 100, 1) AS `Objective`,
    ROUND((prs.teamfight / NULLIF(sms.max_teamfight, 0)) * 100, 1) AS `Teamfight`
    
FROM PlayerRawStats prs
CROSS JOIN SeasonMaxStats sms
WHERE prs.player_id IN (:player_a, :player_b);