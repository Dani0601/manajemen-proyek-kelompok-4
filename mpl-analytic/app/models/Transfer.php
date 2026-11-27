<?php
// app/models/Transfer.php

class Transfer
{
    private PDO $db;

    public function __construct(PDO $db)
    {
        $this->db = $db;
    }

    /**
     * Bangun klausa WHERE dan parameter binding untuk filter transfer.
     */
    private function buildFilterClause(?int $teamId, ?string $transferType): array
    {
        $conditions = [];
        $params     = [];

        if ($teamId !== null) {
            $conditions[]      = '(pt.from_team_id = :tid1 OR pt.to_team_id = :tid2)';
            $params[':tid1']   = [$teamId, PDO::PARAM_INT];
            $params[':tid2']   = [$teamId, PDO::PARAM_INT];
        }

        if ($transferType !== null) {
            $conditions[]     = 'pt.transfer_type = :ttype';
            $params[':ttype'] = [$transferType, PDO::PARAM_STR];
        }

        $where = $conditions ? 'WHERE ' . implode(' AND ', $conditions) : '';
        return [$where, $params];
    }

    /**
     * Ambil semua transfer dengan paginasi dan filter opsional (team_id, transfer_type).
     */
    public function getAllTransfers(
        int $limit = 5,
        int $offset = 0,
        ?int $teamId = null,
        ?string $transferType = null
    ): array {
        [$where, $params] = $this->buildFilterClause($teamId, $transferType);

        $sql = "
            SELECT
                pt.transfer_id,
                pt.player_id,
                pt.player_name,
                p.player_photo_url,
                pt.from_team_id,
                pt.from_team_name,
                ft.team_code  AS from_team_code,
                pt.to_team_id,
                pt.to_team_name,
                tt.team_code  AS to_team_code,
                pt.transfer_type,
                pt.transfer_date,
                pt.liquipedia_ref,
                pt.scraped_at
            FROM   player_transfers pt
            LEFT JOIN players p  ON pt.player_id    = p.player_id
            LEFT JOIN teams  ft  ON pt.from_team_id = ft.team_id
            LEFT JOIN teams  tt  ON pt.to_team_id   = tt.team_id
            {$where}
            ORDER  BY pt.transfer_date DESC, pt.transfer_id DESC
            LIMIT  :lim OFFSET :off
        ";

        $stmt = $this->db->prepare($sql);
        foreach ($params as $key => [$val, $type]) {
            $stmt->bindValue($key, $val, $type);
        }
        $stmt->bindValue(':lim', $limit,  PDO::PARAM_INT);
        $stmt->bindValue(':off', $offset, PDO::PARAM_INT);
        $stmt->execute();
        return $stmt->fetchAll(PDO::FETCH_ASSOC) ?: [];
    }

    public function countAllTransfers(?int $teamId = null, ?string $transferType = null): int
    {
        [$where, $params] = $this->buildFilterClause($teamId, $transferType);

        $stmt = $this->db->prepare("SELECT COUNT(*) FROM player_transfers pt {$where}");
        foreach ($params as $key => [$val, $type]) {
            $stmt->bindValue($key, $val, $type);
        }
        $stmt->execute();
        return (int) $stmt->fetchColumn();
    }

    /**
     * Ambil transfer berdasarkan team_id (masuk DAN keluar).
     */
    public function getTransfersByTeamId(int $teamId): array
    {
        $sql = "
            SELECT
                pt.transfer_id,
                pt.player_id,
                pt.player_name,
                p.player_photo_url,
                pt.from_team_id,
                pt.from_team_name,
                ft.team_code  AS from_team_code,
                pt.to_team_id,
                pt.to_team_name,
                tt.team_code  AS to_team_code,
                pt.transfer_type,
                pt.transfer_date,
                pt.liquipedia_ref,
                pt.scraped_at
            FROM   player_transfers pt
            LEFT JOIN players p  ON pt.player_id    = p.player_id
            LEFT JOIN teams  ft  ON pt.from_team_id = ft.team_id
            LEFT JOIN teams  tt  ON pt.to_team_id   = tt.team_id
            WHERE  pt.from_team_id = :tid OR pt.to_team_id = :tid2
            ORDER  BY pt.transfer_date DESC, pt.transfer_id DESC
        ";

        $stmt = $this->db->prepare($sql);
        $stmt->bindValue(':tid',  $teamId, PDO::PARAM_INT);
        $stmt->bindValue(':tid2', $teamId, PDO::PARAM_INT);
        $stmt->execute();
        return $stmt->fetchAll(PDO::FETCH_ASSOC) ?: [];
    }

    /**
     * Ambil transfer berdasarkan player_id.
     */
    public function getTransfersByPlayerId(int $playerId): array
    {
        $sql = "
            SELECT
                pt.transfer_id,
                pt.player_id,
                pt.player_name,
                p.player_photo_url,
                pt.from_team_id,
                pt.from_team_name,
                ft.team_code  AS from_team_code,
                pt.to_team_id,
                pt.to_team_name,
                tt.team_code  AS to_team_code,
                pt.transfer_type,
                pt.transfer_date,
                pt.liquipedia_ref,
                pt.scraped_at
            FROM   player_transfers pt
            LEFT JOIN players p  ON pt.player_id    = p.player_id
            LEFT JOIN teams  ft  ON pt.from_team_id = ft.team_id
            LEFT JOIN teams  tt  ON pt.to_team_id   = tt.team_id
            WHERE  pt.player_id = :pid
            ORDER  BY pt.transfer_date DESC, pt.transfer_id DESC
        ";

        $stmt = $this->db->prepare($sql);
        $stmt->bindValue(':pid', $playerId, PDO::PARAM_INT);
        $stmt->execute();
        return $stmt->fetchAll(PDO::FETCH_ASSOC) ?: [];
    }
}

