<?php
// app/controllers/TeamController.php

require_once __DIR__ . '/../services/TeamService.php';
require_once __DIR__ . '/../helpers/response.php';

class TeamController
{
    private TeamService $teamService;

    public function __construct(PDO $db)
    {
        $this->teamService = new TeamService($db);
    }

    // =========================================================================
    // GET /api/teams
    // Mengembalikan daftar semua tim
    // =========================================================================

    public function index(): void
    {
        try {
            $data = $this->teamService->getAllTeams();

            jsonResponse(
                $data,
                'Daftar tim berhasil diambil.',
                200
            );
        } catch (Throwable $e) {
            jsonResponse(
                null,
                'Internal Server Error: ' . $e->getMessage(),
                500,
                ['error' => ['code' => 'INTERNAL_SERVER_ERROR']]
            );
        }
    }

    // =========================================================================
    // GET /api/teams/{id}
    // Mengembalikan detail satu tim
    // =========================================================================

    public function show(int $teamId): void
    {
        try {
            $data = $this->teamService->getTeamById($teamId);

            if ($data === null) {
                jsonResponse(
                    null,
                    'Tim tidak ditemukan.',
                    404,
                    ['error' => ['code' => 'TEAM_NOT_FOUND']]
                );
                return;
            }

            jsonResponse(
                $data,
                'Detail tim berhasil diambil.',
                200
            );
        } catch (Throwable $e) {
            jsonResponse(
                null,
                'Internal Server Error: ' . $e->getMessage(),
                500,
                ['error' => ['code' => 'INTERNAL_SERVER_ERROR']]
            );
        }
    }

    // =========================================================================
    // GET /api/teams/{id}/stats?season={seasonId}
    // Mengembalikan statistik tim selama satu season
    // =========================================================================

    public function stats(int $teamId): void
    {
        try {
            // Ambil season dari query param; default ke season terbaru (1)
            $seasonId = isset($_GET['season']) ? (int) $_GET['season'] : 1;

            if ($seasonId <= 0) {
                jsonResponse(
                    null,
                    'Parameter season harus berupa angka positif.',
                    400,
                    ['error' => ['code' => 'INVALID_SEASON']]
                );
                return;
            }

            $data = $this->teamService->getTeamSeasonStats($teamId, $seasonId);

            if ($data === null) {
                jsonResponse(
                    null,
                    'Tim tidak ditemukan.',
                    404,
                    ['error' => ['code' => 'TEAM_NOT_FOUND']]
                );
                return;
            }

            $message = $data['stats'] === null
                ? 'Tim ditemukan tetapi tidak memiliki data pada season yang dipilih.'
                : 'Statistik tim berhasil diambil.';

            jsonResponse($data, $message, 200);
        } catch (Throwable $e) {
            jsonResponse(
                null,
                'Internal Server Error: ' . $e->getMessage(),
                500,
                ['error' => ['code' => 'INTERNAL_SERVER_ERROR']]
            );
        }
    }

    // =========================================================================
    // GET /api/teams/{id}/matches?season={seasonId}&page={page}&limit={limit}
    // Mengembalikan riwayat pertandingan tim dalam satu season
    // =========================================================================

    public function matches(int $teamId): void
    {
        try {
            $seasonId = isset($_GET['season']) ? (int) $_GET['season'] : 1;
            $page     = isset($_GET['page'])   ? max(1, (int) $_GET['page'])   : 1;
            $limit    = isset($_GET['limit'])  ? min(50, max(1, (int) $_GET['limit'])) : 20;

            if ($seasonId <= 0) {
                jsonResponse(
                    null,
                    'Parameter season harus berupa angka positif.',
                    400,
                    ['error' => ['code' => 'INVALID_SEASON']]
                );
                return;
            }

            $data = $this->teamService->getTeamMatches($teamId, $seasonId, $page, $limit);

            if ($data === null) {
                jsonResponse(
                    null,
                    'Tim tidak ditemukan.',
                    404,
                    ['error' => ['code' => 'TEAM_NOT_FOUND']]
                );
                return;
            }

            jsonResponse(
                $data,
                'Riwayat pertandingan tim berhasil diambil.',
                200
            );
        } catch (Throwable $e) {
            jsonResponse(
                null,
                'Internal Server Error: ' . $e->getMessage(),
                500,
                ['error' => ['code' => 'INTERNAL_SERVER_ERROR']]
            );
        }
    }
}

