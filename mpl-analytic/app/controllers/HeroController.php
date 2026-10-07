<?php
// app/controllers/HeroController.php
require_once __DIR__ . '/../services/HeroService.php';
require_once __DIR__ . '/../helpers/Apiresponse.php';

class HeroController {
    private $heroService;

    public function __construct($db) {
        $this->heroService = new HeroService($db);
    }

    public function getDetail($heroId) {
        try {
            // Validasi Input: Pastikan hero_id adalah angka
            if (!is_numeric($heroId)) {
                ApiResponse::error("Invalid hero ID format. Must be a number.", 400);
                return;
            }

            // Ambil parameter season dari URL (opsional, default 17)
            $seasonId = isset($_GET['season']) ? (int)$_GET['season'] : 17;
            
            // Panggil Service untuk menyusun data
            $data = $this->heroService->getHeroDetail($heroId, $seasonId);
            
            // Cek apakah hero ditemukan di database
            if (!$data) {
                ApiResponse::error("Hero dengan ID $heroId tidak ditemukan.", 404);
                return;
            }

            // Kirim respons sukses
            ApiResponse::success($data, "Hero detail fetched successfully");
            
        } catch (Exception $e) {
            // Tangani error server secara global
            ApiResponse::error("Internal Server Error: " . $e->getMessage(), 500);
        }
    }
}
?>