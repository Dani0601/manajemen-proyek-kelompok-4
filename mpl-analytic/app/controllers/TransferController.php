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
    // Query params: page (default 1), limit (default 5), team_id, transfer_type (transfer|loan)
    // -----------------------------------------------------------------------
    public function index(): never
    {
        $page  = isset($_GET['page'])  ? max(1, (int) $_GET['page'])  : 1;
        $limit = isset($_GET['limit']) ? min(100, max(1, (int) $_GET['limit'])) : 5;

        $teamId = null;
        if (isset($_GET['team_id']) && $_GET['team_id'] !== '') {
            $rawTeamId = $_GET['team_id'];
            if (!ctype_digit((string) $rawTeamId) || (int) $rawTeamId <= 0) {
                jsonResponse(null, 'Parameter team_id harus berupa bilangan bulat positif.', 400, [
                    'error' => ['code' => 'INVALID_TEAM_ID'],
                ]);
            }
            $teamId = (int) $rawTeamId;
        }

        $transferType = null;
        if (isset($_GET['transfer_type']) && $_GET['transfer_type'] !== '') {
            $rawType = strtolower(trim((string) $_GET['transfer_type']));
            if (!in_array($rawType, ['transfer', 'loan'], true)) {
                jsonResponse(null, 'Parameter transfer_type hanya boleh bernilai transfer atau loan.', 400, [
                    'error' => ['code' => 'INVALID_TRANSFER_TYPE'],
                ]);
            }
            $transferType = $rawType;
        }

        try {
            $data = $this->transferService->getAllTransfers($page, $limit, $teamId, $transferType);
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

