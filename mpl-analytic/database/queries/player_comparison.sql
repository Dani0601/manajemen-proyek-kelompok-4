WITH PlayerRawStats AS (
    SELECT 
        p.player_id,
        p.player_name,
        t.team_name,

        -- Kill Power = damage per menit
        AVG(gp.damage / NULLIF(g.duration_seconds / 60.0, 0)) AS kill_power,

        -- Farm Rate = gold per menit
        AVG(gp.gold / NULLIF(g.duration_seconds / 60.0, 0)) AS farm_rate,

        -- Survival = KDA
        (SUM(gp.kills) + SUM(gp.assists)) / NULLIF(SUM(gp.deaths), 0) AS survival_kda,

        -- Versatility = jumlah hero berbeda yang digunakan
        COUNT(DISTINCT gp.hero_id) AS versatility,

        -- Objective = damage terhadap turret
        AVG(gp.turret_damage) AS objective,
    	AVG(gp.damage_taken) AS Teamfight

    FROM players p

    JOIN game_players gp
        ON p.player_id = gp.player_id

    JOIN teams t
        ON gp.team_id = t.team_id

    JOIN games g
        ON gp.game_id = g.game_id

    JOIN matches m
        ON g.match_id = m.match_id

    WHERE m.season_id = :season_id

    GROUP BY
        p.player_id,
        p.player_name,
        t.team_name
),

SeasonMaxStats AS (
    SELECT
        MAX(kill_power) AS max_kill_power,
        MAX(farm_rate) AS max_farm_rate,
        MAX(survival_kda) AS max_survival,
        MAX(versatility) AS max_versatility,
        MAX(objective) AS max_objective,
    	MAX(Teamfight) AS max_Teamfight
    FROM PlayerRawStats
)

SELECT
    prs.player_id,
    prs.player_name,
    prs.team_name,

    ROUND(
        (prs.kill_power / NULLIF(sms.max_kill_power, 0)) * 100,
        1
    ) AS `Kill Power`,

    ROUND(
        (prs.farm_rate / NULLIF(sms.max_farm_rate, 0)) * 100,
        1
    ) AS `Farm Rate`,

    ROUND(
        (prs.survival_kda / NULLIF(sms.max_survival, 0)) * 100,
        1
    ) AS `Survival`,

    ROUND(
        (prs.versatility / NULLIF(sms.max_versatility, 0)) * 100,
        1
    ) AS `Versatility`,

    ROUND(
        (prs.objective / NULLIF(sms.max_objective, 0)) * 100,
        1
    ) AS `Objective`,
    
    ROUND(
        (prs.Teamfight / NULLIF(sms.max_Teamfight, 0)) * 100,
        1
    ) AS `Teamfight`

FROM PlayerRawStats prs
CROSS JOIN SeasonMaxStats sms

WHERE prs.player_id IN (:player_a, :player_b);