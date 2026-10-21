<?php
// app/controllers/TournamentController.php
require_once __DIR__ . '/../services/TournamentService.php';
require_once __DIR__ . '/../helpers/response.php';

class TournamentController {
    private $tournamentService;

    public function __construct($db) {
        $this->tournamentService = new TournamentService($db);
    }

    /**
     * GET /api/tournaments
     * Mengembalikan daftar semua season/tournament
     */
    public function index(): never {
        try {
            $data = $this->tournamentService->getAllTournaments();
            jsonResponse($data, 'Data tournament berhasil diambil.');
        } catch (Exception $e) {
            jsonResponse(null, 'Internal Server Error: ' . $e->getMessage(), 500, [
                'error' => ['code' => 'INTERNAL_ERROR']
            ]);
        }
    }

    /**
     * GET /api/tournaments/{id}
     */
    public function show(int $tournamentId): never {
        try {
            $seasonId = $tournamentId;
            $data = $this->tournamentService->getTournamentById($seasonId);

            if ($data === null) {
                jsonResponse(null, 'Tournament tidak ditemukan.', 404, [
                    'error' => ['code' => 'TOURNAMENT_NOT_FOUND']
                ]);
            }

            jsonResponse($data, 'Detail tournament berhasil diambil.');
        } catch (Exception $e) {
            jsonResponse(null, 'Internal Server Error: ' . $e->getMessage(), 500, [
                'error' => ['code' => 'INTERNAL_ERROR']
            ]);
        }
    }

    /**
     * GET /api/tournaments/{id}/standings
     */
    public function standings(int $tournamentId): never {
        try {
            $seasonId = $tournamentId;
            $data = $this->tournamentService->getStandings($seasonId);
            $standings = $data['standings'] ?? $data;

            // Pastikan standings adalah array
            if (!is_array($standings)) {
                $standings = [];
            }

            jsonResponse($standings, 'Klasemen turnamen berhasil dimuat.');
        } catch (Exception $e) {
            jsonResponse(null, 'Internal Server Error: ' . $e->getMessage(), 500, [
                'error' => ['code' => 'INTERNAL_ERROR']
            ]);
        }
    }

    /**
     * GET /api/tournaments/{id}/schedule
     */
    public function schedule(int $tournamentId): never {
        try {
            $seasonId = $tournamentId;
            $limit = isset($_GET['limit']) ? (int)$_GET['limit'] : null;
            $data = $this->tournamentService->getUpcomingMatches($seasonId, $limit);
            jsonResponse($data, 'Jadwal pertandingan berhasil dimuat.');
        } catch (Exception $e) {
            jsonResponse(null, 'Internal Server Error: ' . $e->getMessage(), 500, [
                'error' => ['code' => 'INTERNAL_ERROR']
            ]);
        }
    }

    /**
     * GET /api/tournaments (legacy fallback)
     */
    public function getMatchesSchedule(): never {
        try {
            $seasonId = isset($_GET['season']) ? (int)$_GET['season'] : 13;
            $limit = isset($_GET['limit']) ? (int)$_GET['limit'] : 3;
            $data = $this->tournamentService->getUpcomingMatches($seasonId, $limit);
            jsonResponse($data, 'Jadwal pertandingan berhasil dimuat.');
        } catch (Exception $e) {
            jsonResponse(null, 'Internal Server Error: ' . $e->getMessage(), 500, [
                'error' => ['code' => 'INTERNAL_ERROR']
            ]);
        }
    }
}