
<?php
class MatchModel
{
    private PDO $db;

    public function __construct(PDO $dbConnection)
    {
        $this->db = $dbConnection;
    }


// 1. Mengambil informasi dasar pertandingan.
// Target: GET /api/matches/{match_id}

    public function getMatchById(string $matchId): ?array
    {
        $sql = "
            SELECT
                m.match_id,
                m.season_id,
                m.week,
                m.match_date,
                m.match_time,

                t1.team_id AS team1_id,
                t1.team_name AS team1_name,
                m.team1_score,

                t2.team_id AS team2_id,
                t2.team_name AS team2_name,
                m.team2_score,

                m.winner_team_id,
                m.status,
                m.source
            FROM matches m
            INNER JOIN teams t1
                ON m.team1_id = t1.team_id
            INNER JOIN teams t2
                ON m.team2_id = t2.team_id
            WHERE m.match_id = :match_id
            LIMIT 1
        ";

        $stmt = $this->db->prepare($sql);
        $stmt->execute([
            ':match_id' => $matchId
        ]);

        $result = $stmt->fetch(PDO::FETCH_ASSOC);

        return $result ?: null;
    }


// 2. Mengambil daftar game dalam pertandingan.

    public function getGamesByMatchId(string $matchId): array
    {
        $sql = "
            SELECT
                game_id,
                match_id,
                game_number,
                team1_id,
                team2_id,
                winner_team_id
            FROM games
            WHERE match_id = :match_id
            ORDER BY game_number ASC
        ";

        $stmt = $this->db->prepare($sql);
        $stmt->execute([
            ':match_id' => $matchId
        ]);

        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }


// Mengambil statistik pemain dalam satu game.

    public function getPlayerStatsByGameId(string $gameId): array
    {
        $sql = "
            SELECT
                p.player_id,
                p.player_name,
                h.hero_name,
                gp.kills,
                gp.deaths,
                gp.assists,
                gp.gold,
                gp.damage,
                gp.damage_taken,
                gp.turret_damage
            FROM game_players gp
            INNER JOIN players p
                ON gp.player_id = p.player_id
            LEFT JOIN heroes h
                ON gp.hero_id = h.hero_id
            WHERE gp.game_id = :game_id
            ORDER BY gp.team_id ASC, gp.player_id ASC
        ";

        $stmt = $this->db->prepare($sql);
        $stmt->execute([
            ':game_id' => $gameId
        ]);

        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }


// Mengambil timeline gold per game.

    public function getGoldTimelineByGameId(string $gameId): array
    {
        // $sql = "
        //     SELECT
        //         minute_mark AS minute,
        //         team_red_gold AS red_gold,
        //         team_blue_gold AS blue_gold
        //     FROM game_gold_timeline
        //     WHERE game_id = :game_id
        //     ORDER BY minute_mark ASC
        // ";

        // $stmt = $this->db->prepare($sql);
        // $stmt->execute([
        //     ':game_id' => $gameId
        // ]);

        // return $stmt->fetchAll(PDO::FETCH_ASSOC);
        return [];
    }

// Mengambil draft pick dan ban dalam pertandingan.

    public function getDraftsByMatchId(string $matchId): array
    {
        $sql = "
            SELECT
                g.game_number,
                ROW_NUMBER() OVER(PARTITION BY g.game_id ORDER BY gp.game_pick_id) AS turn,
                t.team_name,
                'pick' AS draft_type,
                h.hero_name
            FROM game_picks gp
            INNER JOIN games g
                ON gp.game_id = g.game_id
            INNER JOIN teams t
                ON gp.team_id = t.team_id
            INNER JOIN heroes h
                ON gp.hero_id = h.hero_id
            WHERE g.match_id = :match_id
            ORDER BY
                g.game_number ASC,
                turn ASC
        ";

        $stmt = $this->db->prepare($sql);
        $stmt->execute([
            ':match_id' => $matchId
        ]);

        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }
}
