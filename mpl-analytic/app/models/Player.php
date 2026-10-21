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
        $sql = "SELECT p.player_id, p.player_name
                FROM players p
                ORDER BY p.player_name ASC
                LIMIT :limit OFFSET :offset";
                
        $stmt = $this->db->prepare($sql);
        $stmt->bindValue(':limit', (int)$limit, PDO::PARAM_INT);
        $stmt->bindValue(':offset', (int)$offset, PDO::PARAM_INT);
        $stmt->execute();
        
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
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
        $sql = "SELECT p.player_id, p.player_name
                FROM players p
                WHERE p.player_id = :player_id
                LIMIT 1";

        $stmt = $this->db->prepare($sql);
        $stmt->bindValue(':player_id', $playerId, PDO::PARAM_INT);
        $stmt->execute();

        $result = $stmt->fetch(PDO::FETCH_ASSOC);
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
     * Mengambil riwayat game seorang player
     */
    public function getPlayerGames(int $playerId): array {
        $sql = "SELECT 
                    gp.game_id,
                    gp.hero_id,
                    h.hero_name,
                    gp.team_id,
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