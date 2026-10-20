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
}
?>