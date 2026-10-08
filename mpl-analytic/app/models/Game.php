<?php

declare(strict_types=1);

class Game
{
    private PDO $db;

    public function __construct(PDO $db)
    {
        $this->db = $db;
    }

    /**
     * =========================================================
     * GAME
     * =========================================================
     */

    /**
     * Ambil satu game berdasarkan game_id.
     */
    public function findById(string $gameId): ?array
    {
        $sql = "
            SELECT
                g.*
            FROM games g
            WHERE g.game_id = :game_id
            LIMIT 1
        ";

        $stmt = $this->db->prepare($sql);

        $stmt->execute([
            ':game_id' => $gameId,
        ]);

        $game = $stmt->fetch(PDO::FETCH_ASSOC);

        return $game !== false ? $game : null;
    }

    /**
     * =========================================================
     * GAME PLAYERS
     * =========================================================
     */

    /**
     * Ambil player dalam satu game.
     */
    public function getPlayers(string $gameId): array
    {
        $sql = "
            SELECT
                gp.*,
                p.player_name,
                h.hero_name
            FROM game_players gp
            LEFT JOIN players p
                ON p.player_id = gp.player_id
            LEFT JOIN heroes h
                ON h.hero_id = gp.hero_id
            WHERE gp.game_id = :game_id
            ORDER BY
                gp.team_id ASC,
                gp.player_id ASC
        ";

        $stmt = $this->db->prepare($sql);

        $stmt->execute([
            ':game_id' => $gameId,
        ]);

        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    /**
     * Ambil player dari banyak game sekaligus.
     */
    public function getPlayersByGameIds(array $gameIds): array
    {
        if (empty($gameIds)) {
            return [];
        }

        [$placeholders, $params] = $this->buildInClause(
            $gameIds,
            'game_id'
        );

        $sql = "
            SELECT
                gp.*,
                p.player_name,
                h.hero_name
            FROM game_players gp
            LEFT JOIN players p
                ON p.player_id = gp.player_id
            LEFT JOIN heroes h
                ON h.hero_id = gp.hero_id
            WHERE gp.game_id IN (" . implode(', ', $placeholders) . ")
            ORDER BY
                gp.game_id ASC,
                gp.team_id ASC,
                gp.player_id ASC
        ";

        $stmt = $this->db->prepare($sql);

        $stmt->execute($params);

        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    /**
     * =========================================================
     * GAME PICKS
     * =========================================================
     */

    /**
     * Ambil pick dalam satu game.
     *
     * Primary key game_picks adalah game_pick_id,
     * bukan id.
     */
    public function getPicks(string $gameId): array
    {
        $sql = "
            SELECT
                gp.*
            FROM game_picks gp
            WHERE gp.game_id = :game_id
            ORDER BY
                gp.team_id ASC,
                gp.game_pick_id ASC
        ";

        $stmt = $this->db->prepare($sql);

        $stmt->execute([
            ':game_id' => $gameId,
        ]);

        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    /**
     * Ambil pick dari banyak game sekaligus.
     *
     * Digunakan oleh MatchService agar tidak melakukan
     * query satu per satu untuk setiap game.
     */
    public function getPicksByGameIds(array $gameIds): array
    {
        if (empty($gameIds)) {
            return [];
        }

        [$placeholders, $params] = $this->buildInClause(
            $gameIds,
            'game_id'
        );

        $sql = "
            SELECT
                gp.*
            FROM game_picks gp
            WHERE gp.game_id IN (" . implode(', ', $placeholders) . ")
            ORDER BY
                gp.game_id ASC,
                gp.team_id ASC,
                gp.game_pick_id ASC
        ";

        $stmt = $this->db->prepare($sql);

        $stmt->execute($params);

        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    /**
     * =========================================================
     * GAME EMBLEMS
     * =========================================================
     */

    /**
     * Ambil emblem dalam satu game.
     */
    public function getEmblems(string $gameId): array
    {
        $sql = "
            SELECT
                ge.*
            FROM game_emblems ge
            WHERE ge.game_id = :game_id
            ORDER BY
                ge.team_id ASC,
                ge.player_id ASC
        ";

        $stmt = $this->db->prepare($sql);

        $stmt->execute([
            ':game_id' => $gameId,
        ]);

        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    /**
     * Ambil emblem dari banyak game sekaligus.
     */
    public function getEmblemsByGameIds(array $gameIds): array
    {
        if (empty($gameIds)) {
            return [];
        }

        [$placeholders, $params] = $this->buildInClause(
            $gameIds,
            'game_id'
        );

        $sql = "
            SELECT
                ge.*
            FROM game_emblems ge
            WHERE ge.game_id IN (" . implode(', ', $placeholders) . ")
            ORDER BY
                ge.game_id ASC,
                ge.team_id ASC,
                ge.player_id ASC
        ";

        $stmt = $this->db->prepare($sql);

        $stmt->execute($params);

        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    /**
     * =========================================================
     * GAME ITEMS
     * =========================================================
     */

    /**
     * Ambil item dalam satu game.
     */
    public function getItems(string $gameId): array
    {
        $sql = "
            SELECT
                gi.*
            FROM game_items gi
            WHERE gi.game_id = :game_id
            ORDER BY
                gi.team_id ASC,
                gi.player_id ASC,
                gi.item_slot ASC
        ";

        $stmt = $this->db->prepare($sql);

        $stmt->execute([
            ':game_id' => $gameId,
        ]);

        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    /**
     * Ambil item dari banyak game sekaligus.
     */
    public function getItemsByGameIds(array $gameIds): array
    {
        if (empty($gameIds)) {
            return [];
        }

        [$placeholders, $params] = $this->buildInClause(
            $gameIds,
            'game_id'
        );

        $sql = "
            SELECT
                gi.*
            FROM game_items gi
            WHERE gi.game_id IN (" . implode(', ', $placeholders) . ")
            ORDER BY
                gi.game_id ASC,
                gi.team_id ASC,
                gi.player_id ASC,
                gi.item_slot ASC
        ";

        $stmt = $this->db->prepare($sql);

        $stmt->execute($params);

        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    /**
     * =========================================================
     * HELPER
     * =========================================================
     */

    /**
     * Membuat placeholder untuk query IN (...)
     *
     * Contoh:
     *
     * $gameIds = ['GAME001', 'GAME002'];
     *
     * menghasilkan:
     *
     * [
     *     ':game_id_0',
     *     ':game_id_1'
     * ]
     *
     * dan:
     *
     * [
     *     ':game_id_0' => 'GAME001',
     *     ':game_id_1' => 'GAME002'
     * ]
     */
    private function buildInClause(
        array $values,
        string $prefix
    ): array {
        $placeholders = [];
        $params = [];

        foreach ($values as $index => $value) {
            $placeholder = ':' . $prefix . '_' . $index;

            $placeholders[] = $placeholder;
            $params[$placeholder] = $value;
        }

        return [
            $placeholders,
            $params,
        ];
    }
}