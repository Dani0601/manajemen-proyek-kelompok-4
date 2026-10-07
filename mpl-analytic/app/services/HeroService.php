<?php
// app/services/HeroService.php
require_once __DIR__ . '/../models/Hero.php';

class HeroService {
    private $heroModel;

    public function __construct($db) {
        $this->heroModel = new Hero($db);
    }

    public function getHeroDetail($heroId, $seasonId = 17) {
        // 1. Ambil Info Dasar
        $baseInfo = $this->heroModel->getBaseInfo($heroId);
        if (!$baseInfo) {
            return null; // Hero tidak ditemukan
        }

        // 2. Ambil Statistik (Win Rate & Pick Rate)
        $stats = $this->heroModel->getStats($heroId, $seasonId);

        // 3. Ambil Rekomendasi Build
        $rawBuild = $this->heroModel->getProBuild($heroId);
        $buildName = !empty($rawBuild) ? $rawBuild[0]['build_name'] : "Standard Pro Build";
        
        // Memformat items dan menambahkan URL ikon secara dinamis
        $items = array_map(function($item) {
            // Asumsi penamaan file icon item menggunakan lowercase dengan underscore (contoh: tough_boots.png)
            $iconName = strtolower(str_replace([' ', '\''], ['_', ''], $item['item_name']));
            return [
                "slot_position" => $item['slot_position'],
                "item_id" => $item['item_id'],
                "item_name" => $item['item_name'],
                "icon_url" => "https://cdn.mplanalytic.com/items/" . $iconName . ".png"
            ];
        }, $rawBuild);

        // 4. Ambil Aturan Situasional (Counter Items)
        $situational = $this->heroModel->getSituationalRules($heroId);

        // 5. Rangkai menjadi format yang diminta API Contract
        return [
            "hero_id" => (int) $baseInfo['hero_id'],
            "hero_name" => $baseInfo['hero_name'],
            "primary_role" => $baseInfo['primary_role'],
            "win_rate" => $stats['win_rate'],
            "pick_rate" => $stats['pick_rate'],
            "pro_build" => [
                "build_name" => $buildName,
                // Workaround sementara karena emblem & spell belum ada di database
                "emblem" => "Custom " . $baseInfo['primary_role'] . " Emblem", 
                "battle_spell" => $baseInfo['primary_role'] === 'Jungler' ? 'Retribution' : 'Flicker',
                "items" => $items
            ],
            "situational_rules" => $situational
        ];
    }
}
?>