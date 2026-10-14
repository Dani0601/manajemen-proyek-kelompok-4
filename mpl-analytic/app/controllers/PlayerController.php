<?php
// app/controllers/PlayerController.php
require_once __DIR__ . '/../services/PlayerService.php';
// Pastikan memanggil file helper response standar Anda (misal: response.php)
require_once __DIR__ . '/../helpers/response.php'; 

class PlayerController {
    private PlayerService $playerService;

    public function __construct(PDO $db) {
        $this->playerService = new PlayerService($db);
    }

    public function index() {
        try {
            $page = isset($_GET['page']) ? (int)$_GET['page'] : 1;
            $limit = isset($_GET['limit']) ? (int)$_GET['limit'] : 50;
            
            $data = $this->playerService->getMasterPlayers($page, $limit);
            
            // Diubah menggunakan fungsi jsonResponse standar
            jsonResponse($data, "Master data player berhasil diambil", 200);
        } catch (Exception $e) {
            jsonResponse(null, "Internal Server Error: " . $e->getMessage(), 500);
        }
    }

    public function compare() {
        try {
            // Menangkap parameter dari URL (Contoh: /players/compare?p1=5&p2=12)
            $p1 = isset($_GET['p1']) ? (int)$_GET['p1'] : null;
            $p2 = isset($_GET['p2']) ? (int)$_GET['p2'] : null;
            $seasonId = isset($_GET['season']) ? (int)$_GET['season'] : 17;

            if (!$p1 || !$p2) {
                jsonResponse(null, "Parameter p1 dan p2 wajib diisi.", 400);
                return;
            }

            $data = $this->playerService->comparePlayers($p1, $p2, $seasonId);

            if (!$data) {
                jsonResponse(null, "Data salah satu atau kedua pemain tidak ditemukan pada Season $seasonId.", 404);
                return;
            }

            jsonResponse($data, "Data komparasi pemain berhasil dimuat", 200);
        } catch (Exception $e) {
            jsonResponse(null, "Internal Server Error: " . $e->getMessage(), 500);
        }
    }
}
?>