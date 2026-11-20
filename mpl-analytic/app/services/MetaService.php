<?php
// app/services/MetaService.php
require_once __DIR__ . '/../models/HeroStats.php';

class MetaService {
    private $heroStatsModel;
    private $db;

    public function __construct($db) {
        $this->db = $db;
        $this->heroStatsModel = new HeroStats($db);
    }

    /**
     * Card 14.1 — Pick Rate hero season berjalan, diurutkan berdasarkan frekuensi penggunaan.
     * Mengembalikan data kosong (bukan error) jika season belum punya data pertandingan.
     */
    public function getHeroTrendsBySeason($seasonId = 17): array {
        // Resolve season
        $seasonStmt = $this->db->prepare(
            "SELECT season_id FROM seasons WHERE season_id = :s1 OR season_number = :s2 LIMIT 1"
        );
        $seasonStmt->execute([':s1' => $seasonId, ':s2' => $seasonId]);
        $resolved = $seasonStmt->fetchColumn();
        $targetSeasonId = $resolved !== false ? (int)$resolved : (int)$seasonId;

        // Total game di season
        $totalStmt = $this->db->prepare(
            "SELECT COUNT(g.game_id) AS total_games
             FROM games g
             JOIN matches m ON g.match_id = m.match_id
             WHERE m.season_id = :sid"
        );
        $totalStmt->execute([':sid' => $targetSeasonId]);
        $totalGames = (int)($totalStmt->fetchColumn() ?: 0);

        // Jika belum ada data pertandingan → kembalikan indikator tren belum tersedia
        if ($totalGames === 0) {
            return [
                'season_id'          => $targetSeasonId,
                'total_games'        => 0,
                'has_trend_data'     => false,
                'heroes'             => [],
            ];
        }

        // Pick rate per hero (dari hero_season_stats yang sudah pre-computed)
        $sql = "SELECT
                    h.hero_id,
                    h.hero_name,
                    COALESCE(hss.pick_count, 0)  AS total_picked,
                    COALESCE(hss.pick_rate, 0)   AS pick_rate,
                    COALESCE(hss.win_rate, 0)    AS win_rate
                FROM heroes h
                LEFT JOIN hero_season_stats hss
                    ON hss.hero_id = h.hero_id AND hss.season_id = :sid
                WHERE COALESCE(hss.pick_count, 0) > 0
                ORDER BY hss.pick_count DESC";

        $stmt = $this->db->prepare($sql);
        $stmt->execute([':sid' => $targetSeasonId]);
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

        $heroes = [];
        foreach ($rows as $row) {
            $iconName = strtolower(str_replace([' ', "'"], ['_', ''], $row['hero_name']));
            $heroes[] = [
                'hero_id'       => (int)$row['hero_id'],
                'hero_name'     => $row['hero_name'],
                'hero_icon_url' => 'https://cdn.mplanalytic.com/heroes/' . $iconName . '.png',
                'total_picked'  => (int)$row['total_picked'],
                'pick_rate'     => (float)$row['pick_rate'],
                'win_rate'      => (float)$row['win_rate'],
            ];
        }

        return [
            'season_id'      => $targetSeasonId,
            'total_games'    => $totalGames,
            'has_trend_data' => true,
            'heroes'         => $heroes,
        ];
    }

    public function getTopHeroesSummary($seasonId = 17) {
        // Ambil data mentah dari database (Model)
        $rawStats = $this->heroStatsModel->getMetaStatsBySeason($seasonId);

        // Fungsi pembantu (helper) untuk menambahkan URL ikon bagi setiap hero
        $formatHeroData = function($hero) {
            $iconName = strtolower(str_replace([' ', '\''], ['_', ''], $hero['hero_name']));
            return [
                "hero_id" => (int)$hero['hero_id'],
                "hero_name" => $hero['hero_name'],
                "hero_icon_url" => "https://cdn.mplanalytic.com/heroes/" . $iconName . ".png",
                "win_rate" => (float)$hero['win_rate'],
                "pick_rate" => (float)$hero['pick_rate'],
                "ban_rate" => (float)$hero['ban_rate']
            ];
        };

        // 1. Logika Top 5 Overpowered (Berdasarkan Win Rate Tertinggi)
        // Kita harus memfilter hero yang setidaknya pernah di-pick minimal 1 kali 
        // untuk menghindari hero yang belum pernah dimainkan mendapatkan win rate palsu.
        $overpowered = array_filter($rawStats, function($h) {
            return $h['total_picked'] > 0;
        });
        usort($overpowered, fn($a, $b) => $b['win_rate'] <=> $a['win_rate']);
        $topOverpowered = array_map($formatHeroData, array_slice($overpowered, 0, 5));

        // 2. Logika Top 5 Most Banned (Berdasarkan Ban Rate Tertinggi)
        $mostBanned = array_filter($rawStats, function($h) {
            return $h['ban_rate'] > 0;
        });
        usort($mostBanned, fn($a, $b) => $b['ban_rate'] <=> $a['ban_rate']);
        $topBanned = array_map($formatHeroData, array_slice($mostBanned, 0, 5));

        // Format return JSON akhir
        return [
            "season" => $seasonId,
            "top_overpowered_heroes" => $topOverpowered,
            "top_most_banned_heroes" => $topBanned
        ];
    }
}
?>