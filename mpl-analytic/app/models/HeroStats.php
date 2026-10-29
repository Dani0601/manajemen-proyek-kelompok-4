<?php
// app/models/HeroStats.php

class HeroStats {
    private $db;

    public function __construct($dbConnection) {
        $this->db = $dbConnection;
    }

    public function getMetaStatsBySeason($seasonId) {
        // Resolusi season: jika user mengirimkan season_number (misal 17), cari season_id yang sesuai
        $seasonStmt = $this->db->prepare("SELECT season_id FROM seasons WHERE season_id = :s1 OR season_number = :s2 LIMIT 1");
        $seasonStmt->execute([':s1' => $seasonId, ':s2' => $seasonId]);
        $resolvedSeason = $seasonStmt->fetchColumn();
        $targetSeasonId = $resolvedSeason !== false ? (int)$resolvedSeason : (int)$seasonId;

        // 1. Menentukan path absolut menuju file SQL eksternal
        $sqlFilePath = __DIR__ . '/../../database/queries/hero_stats.sql';

        // 2. Keamanan: Memastikan file SQL benar-benar ada sebelum dibaca
        if (!file_exists($sqlFilePath)) {
            throw new Exception("File query SQL tidak ditemukan di path: " . $sqlFilePath);
        }

        // 3. Membaca seluruh teks query dari file
        $sql = file_get_contents($sqlFilePath);

        // 4. Mengeksekusi query dengan mengikat parameter
        // Query menggunakan :season_id_1, :season_id_2, :season_id_3 agar PDO
        // tidak menolak parameter yang sama dipakai lebih dari sekali.
        $stmt = $this->db->prepare($sql);
        $stmt->execute([
            ':season_id_1' => $targetSeasonId,
            ':season_id_2' => $targetSeasonId,
            ':season_id_3' => $targetSeasonId,
        ]);

        // 5. Mengembalikan seluruh baris data meta hero
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }
}
?>
