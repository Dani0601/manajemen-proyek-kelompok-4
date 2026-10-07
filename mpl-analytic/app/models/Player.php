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
        $sql = "SELECT p.player_id, p.nickname, p.real_name, p.primary_role, t.short_code AS team_code
                FROM players p
                LEFT JOIN team_rosters tr ON p.player_id = tr.player_id
                LEFT JOIN teams t ON tr.team_id = t.team_id
                ORDER BY p.nickname ASC
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

        $sql = file_get_contents($sqlFilePath);
        $stmt = $this->db->prepare($sql);
        
        // Bind 3 parameter sesuai dengan yang diminta di file SQL
        $stmt->execute([
            ':season_id' => $seasonId,
            ':player_a' => $p1,
            ':player_b' => $p2
        ]);
        
        // Gunakan fetchAll karena akan mengembalikan 2 baris data (Pemain A & B)
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }
}
?>