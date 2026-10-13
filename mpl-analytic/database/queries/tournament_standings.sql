WITH TeamMatches AS (
    -- 1. Statistik pertandingan (match)
    SELECT
        t.team_id,
        t.team_name,
        t.team_code,

        COUNT(m.match_id) AS matches_played,

        SUM(
            CASE
                WHEN m.winner_team_id = t.team_id THEN 1
                ELSE 0
            END
        ) AS match_wins,

        SUM(
            CASE
                WHEN m.winner_team_id IS NOT NULL
                 AND m.winner_team_id != t.team_id THEN 1
                ELSE 0
            END
        ) AS match_losses,

        SUM(
            CASE
                WHEN m.winner_team_id = t.team_id THEN 1
                ELSE 0
            END
        ) AS match_point

    FROM teams t

    LEFT JOIN matches m
        ON (
            t.team_id = m.team1_id
            OR t.team_id = m.team2_id
        )
        AND m.season_id = :season_id
        AND m.status = 'completed'

    GROUP BY
        t.team_id,
        t.team_name,
        t.team_code
),

TeamGames AS (
    -- 2. Statistik game untuk setiap tim
    SELECT
        t.team_id,

        COUNT(g.game_id) AS games_played,

        SUM(
            CASE
                WHEN g.winner_team_id = t.team_id THEN 1
                ELSE 0
            END
        ) AS game_wins,

        SUM(
            CASE
                WHEN g.winner_team_id IS NOT NULL
                 AND g.winner_team_id != t.team_id THEN 1
                ELSE 0
            END
        ) AS game_losses

    FROM teams t

    INNER JOIN matches m
        ON (
            t.team_id = m.team1_id
            OR t.team_id = m.team2_id
        )
        AND m.season_id = :season_id
        AND m.status = 'completed'

    INNER JOIN games g
        ON g.match_id = m.match_id
        AND g.winner_team_id IS NOT NULL
        AND g.winner_team_id IN (g.team1_id, g.team2_id)

    GROUP BY t.team_id
),

Standings AS (
    -- 3. Menggabungkan statistik match dan game
    SELECT
        tm.team_id,
        tm.team_name,
        tm.team_code,
        tm.matches_played,
        tm.match_wins,
        tm.match_losses,
        tm.match_point,

        COALESCE(tg.games_played, 0) AS games_played,
        COALESCE(tg.game_wins, 0) AS game_wins,
        COALESCE(tg.game_losses, 0) AS game_losses,

        (
            COALESCE(tg.game_wins, 0)
            - COALESCE(tg.game_losses, 0)
        ) AS net_game_win,

        CONCAT(
            COALESCE(tm.match_wins, 0),
            '-',
            COALESCE(tm.match_losses, 0)
        ) AS match_w_l,

        CONCAT(
            COALESCE(tg.game_wins, 0),
            '-',
            COALESCE(tg.game_losses, 0)
        ) AS game_w_l,

        CONCAT(
            ROUND(
                COALESCE(tg.game_wins, 0) * 100.0
                / NULLIF(tg.games_played, 0)
            ),
            '%'
        ) AS game_rate

    FROM TeamMatches tm

    LEFT JOIN TeamGames tg
        ON tm.team_id = tg.team_id
)

-- 4. Klasemen akhir
SELECT
    RANK() OVER (
        ORDER BY
            match_point DESC,
            net_game_win DESC,
            game_wins DESC
    ) AS `rank`,

    team_id,
    team_name,
    team_code,
    matches_played,
    match_point,
    match_w_l,
    match_wins,
    match_losses,
    game_w_l,
    game_wins,
    game_losses,
    net_game_win,
    game_rate

FROM Standings

ORDER BY
    `rank` ASC,
    team_name ASC;