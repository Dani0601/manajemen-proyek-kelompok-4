
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
                p.player_photo_url,
                p.player_photo_url AS photo_url,
                gp.team_id,
                h.hero_id,
                h.hero_name,
                h.hero_url AS hero_icon_url,
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

        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
        foreach ($rows as &$r) {
            $r['player_id']      = (int)$r['player_id'];
            $r['team_id']        = (int)$r['team_id'];
            $r['hero_id']        = $r['hero_id'] !== null ? (int)$r['hero_id'] : null;
            $r['kills']          = (int)$r['kills'];
            $r['deaths']         = (int)$r['deaths'];
            $r['assists']        = (int)$r['assists'];
            $r['gold']           = (int)$r['gold'];
            $r['damage']         = (int)$r['damage'];
            $r['damage_taken']   = (int)$r['damage_taken'];
            $r['turret_damage']  = (int)$r['turret_damage'];
        }
        unset($r);

        return $rows;
    }


// Mengambil daftar hero yang diban dalam satu game.

    public function getBansByGameId(string $gameId): array
    {
        $sql = "
            SELECT
                gb.game_ban_id,
                gb.ban_turn,
                gb.team_id,
                t.team_name,
                gb.side,
                gb.hero_id,
                h.hero_name,
                h.hero_url AS hero_icon_url
            FROM game_bans gb
            INNER JOIN teams t
                ON gb.team_id = t.team_id
            INNER JOIN heroes h
                ON gb.hero_id = h.hero_id
            WHERE gb.game_id = :game_id
            ORDER BY gb.ban_turn ASC
        ";

        $stmt = $this->db->prepare($sql);
        $stmt->execute([
            ':game_id' => $gameId
        ]);

        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
        foreach ($rows as &$r) {
            $r['ban_turn'] = (int)$r['ban_turn'];
            $r['team_id']  = (int)$r['team_id'];
            $r['hero_id']  = (int)$r['hero_id'];
        }
        unset($r);

        return $rows;
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
                gb.ban_turn AS turn,
                gb.team_id,
                t.team_name,
                'ban' AS draft_type,
                h.hero_id,
                h.hero_name,
                h.hero_url AS hero_icon_url
            FROM game_bans gb
            INNER JOIN games g
                ON gb.game_id = g.game_id
            INNER JOIN teams t
                ON gb.team_id = t.team_id
            INNER JOIN heroes h
                ON gb.hero_id = h.hero_id
            WHERE g.match_id = :match_id1

            UNION ALL

            SELECT
                g.game_number,
                (ROW_NUMBER() OVER(PARTITION BY g.game_id ORDER BY gp.game_pick_id) + 10) AS turn,
                gp.team_id,
                t.team_name,
                'pick' AS draft_type,
                h.hero_id,
                h.hero_name,
                h.hero_url AS hero_icon_url
            FROM game_picks gp
            INNER JOIN games g
                ON gp.game_id = g.game_id
            INNER JOIN teams t
                ON gp.team_id = t.team_id
            INNER JOIN heroes h
                ON gp.hero_id = h.hero_id
            WHERE g.match_id = :match_id2

            ORDER BY
                game_number ASC,
                turn ASC
        ";

        $stmt = $this->db->prepare($sql);
        $stmt->execute([
            ':match_id1' => $matchId,
            ':match_id2' => $matchId
        ]);

        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
        foreach ($rows as &$r) {
            $r['game_number'] = (int)$r['game_number'];
            $r['turn']        = (int)$r['turn'];
            $r['team_id']     = (int)$r['team_id'];
            $r['hero_id']     = (int)$r['hero_id'];
        }
        unset($r);

        return $rows;
    }

    /**
     * Mengambil item build 6 slot per pemain dalam satu game.
     */
    public function getItemsByGameId(string $gameId): array
    {
        $sql = "
            SELECT
                gi.player_id,
                gi.item_slot,
                gi.item_id,
                mi.item_name,

                COALESCE(NULLIF(gi.item_url, ''), mi.item_url) AS item_url
            FROM game_items gi
            LEFT JOIN master_items mi
                ON gi.item_id = mi.item_id
            WHERE gi.game_id = :game_id
            ORDER BY gi.player_id ASC, gi.item_slot ASC
        ";

        $stmt = $this->db->prepare($sql);
        $stmt->execute([
            ':game_id' => $gameId
        ]);

        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    /**
     * Mengambil susunan emblem dan rune/talent per pemain dalam satu game.
     */
    public function getEmblemsByGameId(string $gameId): array
    {
        $sql = "
            SELECT
                ge.player_id,
                ge.emblem_id,
                ge.emblem_url,
                ge.rune1_id,
                ge.rune1_url,
                ge.rune2_id,
                ge.rune2_url,
                ge.rune3_id,
                ge.rune3_url
            FROM game_emblems ge
            WHERE ge.game_id = :game_id
            ORDER BY ge.player_id ASC
        ";

        $stmt = $this->db->prepare($sql);
        $stmt->execute([
            ':game_id' => $gameId
        ]);

        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }
}
