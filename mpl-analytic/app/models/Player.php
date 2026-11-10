<?php
// app/models/Player.php

class Player {
    private PDO $db;

    public function __construct(PDO $dbConnection) {
        $this->db = $dbConnection;
    }

    /**
     * Mengambil Master Data Player untuk dropdown pencarian
     */
    public function getAllPlayers(int $limit = 100, int $offset = 0) {
        $sql = "SELECT 
                    p.player_id, 
                    p.player_name,
                    p.player_photo_url,
                    (
                        SELECT t.team_id
                        FROM game_players gp
                        JOIN teams t ON gp.team_id = t.team_id
                        WHERE gp.player_id = p.player_id
                        GROUP BY gp.team_id, t.team_name
                        ORDER BY COUNT(*) DESC
                        LIMIT 1
                    ) AS team_id,
                    (
                        SELECT t.team_name
                        FROM game_players gp
                        JOIN teams t ON gp.team_id = t.team_id
                        WHERE gp.player_id = p.player_id
                        GROUP BY gp.team_id, t.team_name
                        ORDER BY COUNT(*) DESC
                        LIMIT 1
                    ) AS team_name
                FROM players p
                ORDER BY p.player_name ASC
                LIMIT :limit OFFSET :offset";
                
        $stmt = $this->db->prepare($sql);
        $stmt->bindValue(':limit', (int)$limit, PDO::PARAM_INT);
        $stmt->bindValue(':offset', (int)$offset, PDO::PARAM_INT);
        $stmt->execute();
        
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
        foreach ($rows as &$row) {
            if (isset($row['team_id']) && $row['team_id'] !== null) {
                $row['team_id'] = (int)$row['team_id'];
            }
            if (!isset($row['photo_url']) && isset($row['player_photo_url'])) {
                $row['photo_url'] = $row['player_photo_url'];
            }
        }
        return $rows;
    }

   // Update di app/models/Player.php
    public function getPlayerComparisonStats(int $p1, int $p2, int $seasonId) {
        $sqlFilePath = __DIR__ . '/../../database/queries/player_comparison.sql';
        
        if (!file_exists($sqlFilePath)) {
            throw new Exception("File query player_comparison.sql tidak ditemukan.");
        }

        // Resolusi season: jika user mengirimkan season_number (misal 17), cari season_id yang sesuai
        $seasonStmt = $this->db->prepare("SELECT season_id FROM seasons WHERE season_id = :s1 OR season_number = :s2 LIMIT 1");
        $seasonStmt->execute([':s1' => $seasonId, ':s2' => $seasonId]);
        $resolvedSeason = $seasonStmt->fetchColumn();
        $targetSeasonId = $resolvedSeason !== false ? (int)$resolvedSeason : $seasonId;

        $sql = file_get_contents($sqlFilePath);
        $stmt = $this->db->prepare($sql);
        
        // Bind 3 parameter sesuai dengan yang diminta di file SQL
        $stmt->execute([
            ':season_id' => $targetSeasonId,
            ':player_a' => $p1,
            ':player_b' => $p2
        ]);
        
        // Gunakan fetchAll karena akan mengembalikan 2 baris data (Pemain A & B)
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }
    /**
     * Mencari player berdasarkan player_id
     */
    public function findById(int $playerId): ?array {
        $sql = "SELECT 
                    p.player_id, 
                    p.player_name,
                    p.player_photo_url,
                    (
                        SELECT t.team_id
                        FROM game_players gp
                        JOIN teams t ON gp.team_id = t.team_id
                        WHERE gp.player_id = p.player_id
                        GROUP BY gp.team_id, t.team_name
                        ORDER BY COUNT(*) DESC
                        LIMIT 1
                    ) AS team_id,
                    (
                        SELECT t.team_name
                        FROM game_players gp
                        JOIN teams t ON gp.team_id = t.team_id
                        WHERE gp.player_id = p.player_id
                        GROUP BY gp.team_id, t.team_name
                        ORDER BY COUNT(*) DESC
                        LIMIT 1
                    ) AS team_name
                FROM players p
                WHERE p.player_id = :player_id
                LIMIT 1";

        $stmt = $this->db->prepare($sql);
        $stmt->bindValue(':player_id', $playerId, PDO::PARAM_INT);
        $stmt->execute();

        $result = $stmt->fetch(PDO::FETCH_ASSOC);
        if ($result) {
            if (isset($result['team_id']) && $result['team_id'] !== null) {
                $result['team_id'] = (int)$result['team_id'];
            }
            if (!isset($result['photo_url']) && isset($result['player_photo_url'])) {
                $result['photo_url'] = $result['player_photo_url'];
            }
        }
        return $result ?: null;
    }

    /**
     * Mengambil statistik agregat seorang player
     */
    public function getPlayerStats(int $playerId): array {
        $sql = "SELECT 
                    gp.player_id,
                    COUNT(DISTINCT gp.game_id) AS total_games,
                    SUM(gp.kills) AS total_kills,
                    SUM(gp.deaths) AS total_deaths,
                    SUM(gp.assists) AS total_assists,
                    ROUND(AVG(gp.kills), 2) AS avg_kills,
                    ROUND(AVG(gp.deaths), 2) AS avg_deaths,
                    ROUND(AVG(gp.assists), 2) AS avg_assists,
                    ROUND(
                        (SUM(gp.kills) + SUM(gp.assists)) / NULLIF(SUM(gp.deaths), 0),
                        2
                    ) AS avg_kda,
                    ROUND(AVG(gp.gold), 0) AS avg_gold_per_game,
                    ROUND(AVG(gp.damage), 0) AS avg_damage_per_game
                FROM game_players gp
                WHERE gp.player_id = :player_id
                GROUP BY gp.player_id";

        $stmt = $this->db->prepare($sql);
        $stmt->bindValue(':player_id', $playerId, PDO::PARAM_INT);
        $stmt->execute();

        $result = $stmt->fetch(PDO::FETCH_ASSOC);
        return $result ?: [];
    }

    /**
     * Mengambil top N hero yang paling sering dipakai oleh seorang player
     */
    public function getMostUsedHeroes(int $playerId, int $limit = 5): array {
        $sql = "SELECT
                    gp.hero_id,
                    h.hero_name,
                    h.hero_url                                          AS hero_icon_url,
                    COUNT(*)                                            AS pick_count,
                    SUM(CASE WHEN g.winner_team_id = gp.team_id THEN 1 ELSE 0 END)                       AS wins,
                    COUNT(*) - SUM(CASE WHEN g.winner_team_id = gp.team_id THEN 1 ELSE 0 END)            AS losses,
                    ROUND(AVG(gp.kills),   2)                          AS avg_kills,
                    ROUND(AVG(gp.deaths),  2)                          AS avg_deaths,
                    ROUND(AVG(gp.assists), 2)                          AS avg_assists,
                    ROUND(
                        (SUM(gp.kills) + SUM(gp.assists)) / NULLIF(SUM(gp.deaths), 0),
                        2
                    )                                                   AS avg_kda
                FROM game_players gp
                JOIN heroes  h ON gp.hero_id = h.hero_id
                JOIN games   g ON gp.game_id = g.game_id
                WHERE gp.player_id = :player_id
                GROUP BY gp.hero_id, h.hero_name, h.hero_url
                ORDER BY pick_count DESC
                LIMIT :lmt";

        $stmt = $this->db->prepare($sql);
        $stmt->bindValue(':player_id', $playerId, PDO::PARAM_INT);
        $stmt->bindValue(':lmt',       $limit,    PDO::PARAM_INT);
        $stmt->execute();

        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

        // Cast tipe numerik
        foreach ($rows as &$row) {
            $row['hero_id']    = (int)$row['hero_id'];
            $row['pick_count'] = (int)$row['pick_count'];
            $row['wins']       = (int)$row['wins'];
            $row['losses']     = (int)$row['losses'];
            $row['avg_kills']  = (float)$row['avg_kills'];
            $row['avg_deaths'] = (float)$row['avg_deaths'];
            $row['avg_assists']= (float)$row['avg_assists'];
            $row['avg_kda']    = $row['avg_kda'] !== null ? (float)$row['avg_kda'] : null;
        }
        unset($row);

        return $rows;
    }

    /**
     * Mengambil daftar build item (equipment) untuk hero tertentu
     */
    public function getHeroBuildItems(int $heroId): array {
        $sql = "SELECT
                    position,
                    item_name,
                    item_url AS item_icon_url,
                    power_spike
                FROM hero_build_items
                WHERE hero_id = :hero_id
                  AND item_url IS NOT NULL
                ORDER BY position ASC
                LIMIT 6";

        $stmt = $this->db->prepare($sql);
        $stmt->bindValue(':hero_id', $heroId, PDO::PARAM_INT);
        $stmt->execute();

        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
        foreach ($rows as &$row) {
            $row['position']    = (int)$row['position'];
            $row['power_spike'] = (int)($row['power_spike'] ?? 0) === 1;
        }
        unset($row);

        return $rows;
    }

    /**
     * Mengambil battle spell yang direkomendasikan untuk hero tertentu
     */
    public function getHeroSpells(int $heroId): array {
        // Ambil top 2 spell berdasarkan share_percent / build_count tertinggi
        $sql = "SELECT
                    spell_name,
                    spell_icon_url
                FROM hero_build_spells
                WHERE hero_id = :hero_id
                  AND spell_icon_url IS NOT NULL
                ORDER BY COALESCE(share_percent, 0) DESC, COALESCE(build_count, 0) DESC
                LIMIT 2";

        $stmt = $this->db->prepare($sql);
        $stmt->bindValue(':hero_id', $heroId, PDO::PARAM_INT);
        $stmt->execute();

        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
        foreach ($rows as &$row) {
            $row['spell_name'] = preg_replace('/^ALSO\s+/i', '', trim($row['spell_name']));
        }
        unset($row);

        return $rows;
    }

    /**
     * Mengambil emblem yang direkomendasikan untuk hero tertentu
     */
    public function getHeroEmblems(int $heroId): array {
        // Ambil emblem utama (paling banyak dipakai)
        $sql = "SELECT
                    emblem_name,
                    emblem_icon_url
                FROM hero_build_emblems
                WHERE hero_id = :hero_id
                  AND emblem_icon_url IS NOT NULL
                ORDER BY COALESCE(build_count, 0) DESC
                LIMIT 1";

        $stmt = $this->db->prepare($sql);
        $stmt->bindValue(':hero_id', $heroId, PDO::PARAM_INT);
        $stmt->execute();

        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
        foreach ($rows as &$row) {
            if (preg_match('/EMBLEM\s+([A-Za-z0-9_\-\s]+)$/i', trim($row['emblem_name']), $m)) {
                $row['emblem_name'] = 'Emblem ' . trim($m[1]);
            }
        }
        unset($row);

        return $rows;
    }

    /**
     * Mengambil riwayat game seorang player
     */
    public function getPlayerGames(int $playerId): array {
        $sql = "SELECT 
                    gp.game_id,
                    gp.hero_id,
                    h.hero_name,
                    gp.team_id,
                    t.team_name,
                    gp.kills,
                    gp.deaths,
                    gp.assists,
                    gp.gold AS gold_earned,
                    gp.damage AS hero_damage,
                    g.match_id,
                    g.game_number,
                    m.match_date
                FROM game_players gp
                JOIN games g ON gp.game_id = g.game_id
                JOIN matches m ON g.match_id = m.match_id
                LEFT JOIN heroes h ON gp.hero_id = h.hero_id
                LEFT JOIN teams t ON gp.team_id = t.team_id
                WHERE gp.player_id = :player_id
                ORDER BY m.match_date DESC, g.game_number ASC
                LIMIT 50";

        $stmt = $this->db->prepare($sql);
        $stmt->bindValue(':player_id', $playerId, PDO::PARAM_INT);
        $stmt->execute();

        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }
}
?>