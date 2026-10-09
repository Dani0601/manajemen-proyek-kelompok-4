<?php
// app/controllers/TournamentController.php
require_once __DIR__ . '/../services/TournamentService.php';
require_once __DIR__ . '/../helpers/Apiresponse.php';

use App\Helpers\ApiResponse;

$users = [
    ['id' => 1, 'name' => 'Budi'],
    ['id' => 2, 'name' => 'Siti']
];

// Mengirimkan data user dengan status 200 OK
ApiResponse::success($users, 'Data user berhasil diambil');

class TournamentController {
    private $tournamentService;

    public function __construct($db) {
        $this->tournamentService = new TournamentService($db);
    }

    public function getMatchesSchedule() {
        try {
            $seasonId = isset($_GET['season']) ? (int)$_GET['season'] : 13;
            $limit = isset($_GET['limit']) ? (int)$_GET['limit'] : 3; // Default 3 sesuai UI dashboard

            $data = $this->tournamentService->getUpcomingMatches($seasonId, $limit);

            ApiResponse::success($data, "Jadwal pertandingan berhasil dimuat");

        } catch (Exception $e) {
            ApiResponse::error("Internal Server Error: " . $e->getMessage(), 500);
        }
    }
}