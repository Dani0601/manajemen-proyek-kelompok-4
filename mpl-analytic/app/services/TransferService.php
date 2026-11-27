<?php
// app/services/TransferService.php

require_once __DIR__ . '/../models/Transfer.php';
require_once __DIR__ . '/../models/Team.php';
require_once __DIR__ . '/../models/Player.php';

class TransferService
{
    private Transfer $transferModel;
    private PDO      $db;

    public function __construct(PDO $db)
    {
        $this->db            = $db;
        $this->transferModel = new Transfer($db);
    }

    // -----------------------------------------------------------------------
    // Format satu baris transfer ke array response
    // -----------------------------------------------------------------------
    private function formatRow(array $row): array
    {
        return [
            'transfer_id'      => (int) $row['transfer_id'],
            'player'           => [
                'player_id'        => $row['player_id'] !== null ? (int) $row['player_id'] : null,
                'player_name'      => $row['player_name'],
                'player_photo_url' => $row['player_photo_url'] ?: null,
            ],
            'from_team'        => $row['from_team_id'] ? [
                'team_id'    => (int) $row['from_team_id'],
                'team_name'  => $row['from_team_name'],
                'team_code'  => $row['from_team_code'] ?? null,
            ] : (!empty($row['from_team_name']) ? [
                'team_id'    => null,
                'team_name'  => $row['from_team_name'],
                'team_code'  => null,
            ] : null),
            'to_team'          => $row['to_team_id'] ? [
                'team_id'    => (int) $row['to_team_id'],
                'team_name'  => $row['to_team_name'],
                'team_code'  => $row['to_team_code'] ?? null,
            ] : (!empty($row['to_team_name']) ? [
                'team_id'    => null,
                'team_name'  => $row['to_team_name'],
                'team_code'  => null,
            ] : null),
            'transfer_type'    => $row['transfer_type'],    // transfer | loan
            'transfer_date'    => $row['transfer_date'],
            'liquipedia_ref'   => $row['liquipedia_ref'],
            'scraped_at'       => $row['scraped_at'],
        ];
    }

    // -----------------------------------------------------------------------
    // GET /api/transfers — semua transfer dengan paginasi dan filter opsional
    // -----------------------------------------------------------------------
    public function getAllTransfers(
        int $page = 1,
        int $limit = 5,
        ?int $teamId = null,
        ?string $transferType = null
    ): array {
        $offset     = ($page - 1) * $limit;
        $rows       = $this->transferModel->getAllTransfers($limit, $offset, $teamId, $transferType);
        $total      = $this->transferModel->countAllTransfers($teamId, $transferType);
        $totalPages = $total > 0 ? (int) ceil($total / $limit) : 0;

        return [
            'transfers'  => array_values(array_map([$this, 'formatRow'], $rows)),
            'filters'    => [
                'team_id'       => $teamId,
                'transfer_type' => $transferType,
            ],
            'pagination' => [
                'current_page' => $page,
                'per_page'     => $limit,
                'total_data'   => $total,
                'total_pages'  => $totalPages,
            ],
        ];
    }

    // -----------------------------------------------------------------------
    // GET /api/teams/{team_id}/transfers — in & out per tim
    // -----------------------------------------------------------------------
    public function getTransfersByTeam(int $teamId): ?array
    {
        // Validasi tim ada di DB
        $teamModel = new Team($this->db);
        $team = $teamModel->findById($teamId);
        if (!$team) {
            return null;
        }

        $rows = $this->transferModel->getTransfersByTeamId($teamId);

        $in  = [];
        $out = [];

        foreach ($rows as $row) {
            $entry = $this->formatRow($row);
            if ((int) ($row['to_team_id'] ?? 0) === $teamId) {
                $entry['direction'] = 'in';
                $in[]  = $entry;
            } else {
                $entry['direction'] = 'out';
                $out[] = $entry;
            }
        }

        return [
            'team'               => [
                'team_id'    => (int) $team['team_id'],
                'team_name'  => $team['team_name'],
                'team_code'  => $team['team_code'] ?? null,
            ],
            'total_transfers_in'  => count($in),
            'total_transfers_out' => count($out),
            'transfers_in'        => $in,
            'transfers_out'       => $out,
        ];
    }

    // -----------------------------------------------------------------------
    // GET /api/players/{player_id}/transfers — riwayat transfer pemain
    // -----------------------------------------------------------------------
    public function getTransfersByPlayer(int $playerId): ?array
    {
        $playerModel = new Player($this->db);
        $player = $playerModel->findById($playerId);
        if (!$player) {
            return null;
        }

        $rows = $this->transferModel->getTransfersByPlayerId($playerId);

        return [
            'player'    => [
                'player_id'        => (int) $player['player_id'],
                'player_name'      => $player['player_name'],
                'player_photo_url' => $player['player_photo_url'] ?? null,
            ],
            'total'     => count($rows),
            'transfers' => array_values(array_map([$this, 'formatRow'], $rows)),
        ];
    }
}

