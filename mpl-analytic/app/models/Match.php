<?php

declare(strict_types=1);

class MatchModel
{
    private PDO $db;

    public function __construct(PDO $db)
    {
        $this->db = $db;
    }

    /**
     * Cari detail match berdasarkan match_id.
     */
    public function findById(string $matchId): ?array
    {
        $sql = "
            SELECT
                m.*
            FROM matches m
            WHERE m.match_id = :match_id
            LIMIT 1
        ";

        $stmt = $this->db->prepare($sql);

        $stmt->execute([
            ':match_id' => $matchId,
        ]);

        $match = $stmt->fetch(PDO::FETCH_ASSOC);

        return $match !== false ? $match : null;
    }

    /**
     * Ambil seluruh game dalam sebuah match.
     */
    public function getGames(string $matchId): array
    {
        $sql = "
            SELECT
                g.*
            FROM games g
            WHERE g.match_id = :match_id
            ORDER BY g.game_number ASC
        ";

        $stmt = $this->db->prepare($sql);

        $stmt->execute([
            ':match_id' => $matchId,
        ]);

        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }
}