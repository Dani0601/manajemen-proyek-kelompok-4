<?php
// app/controllers/MetaController.php
require_once __DIR__ . '/../services/MetaService.php';
require_once __DIR__ . '/../helpers/Apiresponse.php';

use App\Helpers\ApiResponse;

$users = [
    ['id' => 1, 'name' => 'Budi'],
    ['id' => 2, 'name' => 'Siti']
];

// Mengirimkan data user dengan status 200 OK
ApiResponse::success($users, 'Data user berhasil diambil');

class MetaController {
    private $metaService;

    public function __construct($db) {
        $this->metaService = new MetaService($db);
    }

    public function getDashboardSummary() {
        try {
            // Ambil parameter musim dari URL, tetapkan 13 sebagai lalai (default)
            $seasonId = isset($_GET['season']) ? (int)$_GET['season'] : 13;
            
            $data = $this->metaService->getTopHeroesSummary($seasonId);
            
            if (empty($data['top_overpowered_heroes']) && empty($data['top_most_banned_heroes'])) {
                ApiResponse::error("Tiada data statistik dijumpai untuk musim ini.", 404);
                return;
            }

            // Hantar maklum balas berjaya
            ApiResponse::success($data, "Berjaya mengambil ringkasan papan pemuka Top 5 Hero");
            
        } catch (Exception $e) {
            ApiResponse::error("Ralat Pelayan Dalaman: " . $e->getMessage(), 500);
        }
    }
}
?>