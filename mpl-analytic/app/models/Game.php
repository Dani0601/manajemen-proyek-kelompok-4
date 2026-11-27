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
     * Ambil daftar game dengan pagination.
     */
    public function getAll(int $limit = 20, int $offset = 0): array
    {
        $sql = "
            SELECT
                g.*
            FROM games g
            ORDER BY g.game_id ASC
            LIMIT :limit OFFSET :offset
        ";

        $stmt = $this->db->prepare($sql);
        $stmt->bindValue(':limit', $limit, PDO::PARAM_INT);
        $stmt->bindValue(':offset', $offset, PDO::PARAM_INT);
        $stmt->execute();

        return $stmt->fetchAll(PDO::FETCH_ASSOC);
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
                p.player_photo_url,
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

        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
        foreach ($rows as &$row) {
            if (!isset($row['photo_url']) && isset($row['player_photo_url'])) {
                $row['photo_url'] = $row['player_photo_url'];
            }
        }
        return $rows;
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
                p.player_photo_url,
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

        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
        foreach ($rows as &$row) {
            if (!isset($row['photo_url']) && isset($row['player_photo_url'])) {
                $row['photo_url'] = $row['player_photo_url'];
            }
        }
        return $rows;
    }

    /**
     * =========================================================
     * GAME DRAFTS (Card 13.1)
     * =========================================================
     * Mengambil urutan pick dan ban dalam satu game
     */
    public function getDrafts(string $gameId): array
    {
        $sql = "
            SELECT
                gb.game_ban_id AS draft_id,
                gb.game_id,
                CASE
                    WHEN gb.ban_turn <= 6 THEN gb.ban_turn
                    ELSE gb.ban_turn + 6
                END AS pick_ban_turn,
                gb.team_id,
                t.team_name,
                CASE WHEN gb.side = 'team1' THEN 'blue' ELSE 'red' END AS team_side,
                'ban' AS type,
                h.hero_id,
                h.hero_name,
                h.hero_url AS hero_image_url
            FROM game_bans gb
            JOIN teams t ON gb.team_id = t.team_id
            JOIN heroes h ON gb.hero_id = h.hero_id
            WHERE gb.game_id = :g1

            UNION ALL

            SELECT
                p.draft_id,
                p.game_id,
                CASE
                    WHEN p.side = 'team1' AND p.side_pick_no = 1 THEN 7
                    WHEN p.side = 'team2' AND p.side_pick_no = 1 THEN 8
                    WHEN p.side = 'team2' AND p.side_pick_no = 2 THEN 9
                    WHEN p.side = 'team1' AND p.side_pick_no = 2 THEN 10
                    WHEN p.side = 'team1' AND p.side_pick_no = 3 THEN 11
                    WHEN p.side = 'team2' AND p.side_pick_no = 3 THEN 12
                    WHEN p.side = 'team2' AND p.side_pick_no = 4 THEN 17
                    WHEN p.side = 'team1' AND p.side_pick_no = 4 THEN 18
                    WHEN p.side = 'team1' AND p.side_pick_no = 5 THEN 19
                    WHEN p.side = 'team2' AND p.side_pick_no = 5 THEN 20
                    ELSE 20 + p.side_pick_no
                END AS pick_ban_turn,
                p.team_id,
                p.team_name,
                CASE WHEN p.side = 'team1' THEN 'blue' ELSE 'red' END AS team_side,
                'pick' AS type,
                p.hero_id,
                p.hero_name,
                p.hero_image_url
            FROM (
                SELECT
                    gp.game_pick_id AS draft_id,
                    gp.game_id,
                    gp.side,
                    gp.team_id,
                    t.team_name,
                    h.hero_id,
                    h.hero_name,
                    h.hero_url AS hero_image_url,
                    ROW_NUMBER() OVER (PARTITION BY gp.game_id, gp.side ORDER BY gp.game_pick_id) AS side_pick_no
                FROM game_picks gp
                JOIN teams t ON gp.team_id = t.team_id
                JOIN heroes h ON gp.hero_id = h.hero_id
                WHERE gp.game_id = :g2
            ) p

            ORDER BY pick_ban_turn ASC
        ";

        $stmt = $this->db->prepare($sql);
        $stmt->execute([
            ':g1' => $gameId,
            ':g2' => $gameId,
        ]);

        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
        foreach ($rows as &$r) {
            $r['pick_ban_turn'] = (int)$r['pick_ban_turn'];
            $r['team_id']       = (int)$r['team_id'];
            $r['hero_id']       = (int)$r['hero_id'];
        }
        unset($r);

        return $rows;
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