<?php
// app/models/HeroStats.php

class HeroStats {
    private $db;

    public function __construct($dbConnection) {
        $this->db = $dbConnection;
    }

    public function getMetaStatsBySeason($seasonId) {
        // 1. Menentukan path absolut menuju file SQL eksternal
        $sqlFilePath = __DIR__ . '/../../database/queries/hero_stats.sql';
        
        // 2. Keamanan: Memastikan file SQL benar-benar ada sebelum dibaca
        if (!file_exists($sqlFilePath)) {
            throw new Exception("File query SQL tidak ditemukan di path: " . $sqlFilePath);
        }

        // 3. Membaca seluruh teks query CTE dari file
        $sql = file_get_contents($sqlFilePath);
        
        // 4. Mengeksekusi query dengan mengikat parameter (binding) untuk mencegah SQL Injection
        $stmt = $this->db->prepare($sql);
        $stmt->execute([':season_id' => $seasonId]);
        
        // 5. Mengembalikan seluruh baris data meta hero
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }
}
?>