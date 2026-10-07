<?php
class Hero {
    private PDO $db;
    public function __construct(PDO $dbConnection) {
        $this->db = $dbConnection;
    }

    /**
     * 1. Mengambil Informasi Dasar Hero
     */
    public function getBaseInfo(PDO $heroId) {
        $sql = "SELECT hero_id, hero_name, primary_role FROM heroes WHERE hero_id = :hero_id";
        $stmt = $this->db->prepare($sql);
        $stmt->execute([':hero_id' => $heroId]);
        return $stmt->fetch(PDO::FETCH_ASSOC);
    }

    /**
     * 2. Menghitung Pick Rate dan Win Rate spesifik untuk satu hero
     */
    public function getStats(PDO $heroId, PDO $seasonId) {
        $sql = "SELECT 
                    (SELECT COUNT(*) FROM games g JOIN matches m ON g.match_id = m.match_id WHERE m.season_id = :s1) AS total_games,
                    (SELECT COUNT(*) FROM game_player_stats gps JOIN games g ON gps.game_id = g.game_id JOIN matches m ON g.match_id = m.match_id WHERE gps.hero_id = :h1 AND m.season_id = :s2) AS total_picked,
                    (SELECT SUM(CASE WHEN g.winner_team_id = tr.team_id THEN 1 ELSE 0 END) FROM game_player_stats gps JOIN games g ON gps.game_id = g.game_id JOIN matches m ON g.match_id = m.match_id JOIN team_rosters tr ON gps.player_id = tr.player_id AND tr.season_id = m.season_id WHERE gps.hero_id = :h2 AND m.season_id = :s3) AS total_wins";
        
        $stmt = $this->db->prepare($sql);
        // Binding parameter ganda karena PDO tidak mengizinkan nama placeholder yang sama dipakai berulang
        $stmt->execute([
            ':s1' => $seasonId, ':s2' => $seasonId, ':s3' => $seasonId,
            ':h1' => $heroId, ':h2' => $heroId
        ]);
        
        $result = $stmt->fetch(PDO::FETCH_ASSOC);
        
        // Kalkulasi matematika untuk merubah angka mentah menjadi persentase (Rate)
        $pickRate = ($result['total_games'] > 0) ? ($result['total_picked'] / $result['total_games']) * 100 : 0;
        $winRate = ($result['total_picked'] > 0) ? ($result['total_wins'] / $result['total_picked']) * 100 : 0;

        return [
            'pick_rate' => round($pickRate, 1),
            'win_rate' => round($winRate, 1)
        ];
    }

    /**
     * 3. Mengambil Rekomendasi 6 Slot Pro Build Item
     */
    public function getProBuild(PDO $heroId) {
        $sql = "SELECT 
                    rb.build_name, 
                    rb.description,
                    rbi.slot_order AS slot_position, 
                    mi.item_id, 
                    mi.item_name 
                FROM recommended_builds rb
                JOIN recommended_build_items rbi ON rb.build_rec_id = rbi.build_rec_id
                JOIN master_items mi ON rbi.item_id = mi.item_id
                WHERE rb.hero_id = :hero_id
                ORDER BY rbi.slot_order ASC
                LIMIT 6";
                
        $stmt = $this->db->prepare($sql);
        $stmt->execute([':hero_id' => $heroId]);
        
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    /**
     * 4. Mengambil Aturan Situasional (Counter Item)
     */
    public function getSituationalRules(PDO $heroId) {
        $sql = "SELECT 
                    isr.rule_id, 
                    isr.target_attribute, 
                    mi.item_name AS recommended_item, 
                    isr.reason 
                FROM hero_attributes ha
                JOIN item_suitability_rules isr ON ha.attribute_type = isr.target_attribute
                JOIN master_items mi ON isr.item_id = mi.item_id
                WHERE ha.hero_id = :hero_id";
                
        $stmt = $this->db->prepare($sql);
        $stmt->execute([':hero_id' => $heroId]);
        
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }
}
?>