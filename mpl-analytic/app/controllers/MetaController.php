<?php
// app/controllers/MetaController.php
require_once __DIR__ . '/../services/MetaService.php';
require_once __DIR__ . '/../helpers/response.php';

class MetaController {
    private $metaService;

    public function __construct($db) {
        $this->metaService = new MetaService($db);
    }

    /**
     * GET /api/meta
     * Mengembalikan ringkasan meta hero top 5 overpowered dan paling banyak dibanned
     */
    public function index() {
        try {
            // Ambil parameter musim dari URL, gunakan 17 sebagai nilai default
            $seasonId = isset($_GET['season']) ? (int)$_GET['season'] : 17;

            $data = $this->metaService->getTopHeroesSummary($seasonId);

            if (empty($data['top_overpowered_heroes']) && empty($data['top_most_banned_heroes'])) {
                jsonResponse(
                    null,
                    'Tidak ada data statistik yang ditemukan untuk musim ini.',
                    404,
                    ['error' => ['code' => 'META_DATA_NOT_FOUND']]
                );
            }

            jsonResponse($data, 'Data meta hero berhasil diambil.');

        } catch (Exception $e) {
            jsonResponse(
                null,
                'Terjadi kesalahan pada server: ' . $e->getMessage(),
                500,
                ['error' => ['code' => 'INTERNAL_SERVER_ERROR']]
            );
        }
    }

    /**
     * Alias backward-compat untuk getDashboardSummary
     */
    public function getDashboardSummary() {
        $this->index();
    }
}
?>
