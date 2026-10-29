<?php
// app/services/MetaService.php
require_once __DIR__ . '/../models/HeroStats.php';

class MetaService {
    private $heroStatsModel;

    public function __construct($db) {
        $this->heroStatsModel = new HeroStats($db);
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