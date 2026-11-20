<?php
// app/controllers/TransferController.php

require_once __DIR__ . '/../services/TransferService.php';
require_once __DIR__ . '/../helpers/response.php';
require_once __DIR__ . '/../helpers/validation.php';

class TransferController
{
    private TransferService $transferService;

    public function __construct(PDO $db)
    {
        $this->transferService = new TransferService($db);
    }

    // -----------------------------------------------------------------------
    // GET /api/transfers
    // -----------------------------------------------------------------------
    public function index(): never
    {
        $page  = isset($_GET['page'])  ? max(1, (int) $_GET['page'])  : 1;
        $limit = isset($_GET['limit']) ? min(100, max(1, (int) $_GET['limit'])) : 20;

        try {
            $data = $this->transferService->getAllTransfers($page, $limit);
            jsonResponse($data, 'Data transfer pemain berhasil diambil.');
        } catch (Throwable $e) {
            error_log('TransferController::index - ' . $e->getMessage());
            jsonResponse(null, 'Terjadi kesalahan pada server.', 500, [
                'error' => ['code' => 'INTERNAL_SERVER_ERROR'],
            ]);
        }
    }

    // -----------------------------------------------------------------------
    // GET /api/teams/{team_id}/transfers
    // -----------------------------------------------------------------------
    public function byTeam(int $teamId): never
    {
        try {
            $data = $this->transferService->getTransfersByTeam($teamId);

            if ($data === null) {
                jsonResponse(null, 'Tim tidak ditemukan.', 404, [
                    'error' => ['code' => 'TEAM_NOT_FOUND'],
                ]);
            }

            jsonResponse($data, 'Riwayat transfer tim berhasil diambil.');
        } catch (Throwable $e) {
            error_log('TransferController::byTeam - ' . $e->getMessage());
            jsonResponse(null, 'Terjadi kesalahan pada server.', 500, [
                'error' => ['code' => 'INTERNAL_SERVER_ERROR'],
            ]);
        }
    }

    // -----------------------------------------------------------------------
    // GET /api/players/{player_id}/transfers
    // -----------------------------------------------------------------------
    public function byPlayer(int $playerId): never
    {
        try {
            $data = $this->transferService->getTransfersByPlayer($playerId);

            if ($data === null) {
                jsonResponse(null, 'Pemain tidak ditemukan.', 404, [
                    'error' => ['code' => 'PLAYER_NOT_FOUND'],
                ]);
            }

            jsonResponse($data, 'Riwayat transfer pemain berhasil diambil.');
        } catch (Throwable $e) {
            error_log('TransferController::byPlayer - ' . $e->getMessage());
            jsonResponse(null, 'Terjadi kesalahan pada server.', 500, [
                'error' => ['code' => 'INTERNAL_SERVER_ERROR'],
            ]);
        }
    }
}

