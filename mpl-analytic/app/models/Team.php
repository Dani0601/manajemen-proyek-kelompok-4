<?php
// app/models/Team.php

class Team
{
    private PDO $db;

    public function __construct(PDO $db)
    {
        $this->db = $db;
    }

    // =========================================================================
    // Mapping team_name -> logo CDN URL
    // Menggunakan CDN ImageKit / wsrv resmi yang konsisten dengan frontend
    // =========================================================================

    public static function resolveLogoUrl(string $teamName): ?string
    {
        $map = [
            'ONIC'                  => 'https://wsrv.nl/?url=https://ik.imagekit.io/nloe8dhf7w/mplid/s14/teams/onic-b-256.png',
            'Dewa United Esports'   => 'https://wsrv.nl/?url=https://ik.imagekit.io/nloe8dhf7w/mplid/s14/teams/dewa-united-500.png',
            'RRQ Hoshi'             => 'https://wsrv.nl/?url=https://ik.imagekit.io/nloe8dhf7w/mplid/s14/teams/rrq-500.png',
            'Alter Ego'             => 'https://wsrv.nl/?url=https://ik.imagekit.io/nloe8dhf7w/mplid/s14/teams/ae-256.png',
            'EVOS'                  => 'https://wsrv.nl/?url=https://ik.imagekit.io/nloe8dhf7w/mplid/s14/teams/evos-500.png',
            'Bigetron by Vitality'  => 'https://wsrv.nl/?url=https://ik.imagekit.io/nloe8dhf7w/mplid/s14/teams/btr_vit.png',
            'Team Liquid ID'        => 'https://wsrv.nl/?url=https://ik.imagekit.io/nloe8dhf7w/mplid/s14/teams/TLID-Primary500x500.png',
            'Geek Fam ID'           => 'https://wsrv.nl/?url=https://ik.imagekit.io/nloe8dhf7w/mplid/s14/teams/geek-500.png',
            'Natus Vincere'         => 'https://wsrv.nl/?url=https://ik.imagekit.io/nloe8dhf7w/mplid/s14/teams/NAVI-2.png',
            'Aura Fire'             => 'https://wsrv.nl/?url=https://ik.imagekit.io/nloe8dhf7w/mplid/s14/teams/aura-500.png',
            'Rebellion Esports'     => 'https://wsrv.nl/?url=https://ik.imagekit.io/nloe8dhf7w/mplid/s14/teams/rbl-500.png',
        ];

        return $map[$teamName] ?? null;
    }

    // =========================================================================
    // Tambahkan logo_url ke baris hasil query
    // =========================================================================

    private function appendLogoUrl(array &$row): void
    {
        $row['logo_url'] = self::resolveLogoUrl($row['team_name']);
    }

    // =========================================================================
    // GET /api/teams
    // Daftar semua tim
    // =========================================================================

    public function getAllTeams(): array
    {
        $sql = "SELECT
                    team_id,
                    team_name,
                    team_code
                FROM teams
                ORDER BY team_name ASC";

        $stmt = $this->db->prepare($sql);
        $stmt->execute();

        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

        foreach ($rows as &$row) {
            $row['team_id'] = (int) $row['team_id'];
            $this->appendLogoUrl($row);
        }

        return $rows;
    }

    // =========================================================================
    // GET /api/teams/{id}
    // Detail satu tim
    // =========================================================================

    public function findById(int $teamId): ?array
    {
        $sql = "SELECT
                    team_id,
                    team_name,
                    team_code
                FROM teams
                WHERE team_id = :team_id
                LIMIT 1";

        $stmt = $this->db->prepare($sql);
        $stmt->bindValue(':team_id', $teamId, PDO::PARAM_INT);
        $stmt->execute();

        $row = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$row) {
            return null;
        }

        $row['team_id'] = (int) $row['team_id'];
        $this->appendLogoUrl($row);

        return $row;
    }

    // =========================================================================
    // GET /api/teams/{id}/stats?season={seasonId}
    // Statistik tim selama satu season:
    //   - total match dimainkan, menang, kalah
    //   - total game dimainkan, menang, kalah
    //   - win rate match & game
    //   - rata-rata durasi game (detik)
    //   - rata-rata kills per game
    // =========================================================================

    public function getTeamSeasonStats(int $teamId, int $seasonId): ?array
    {
        // ---- Statistik dari sisi MATCH ----
        $sqlMatch = "SELECT
                        COUNT(*) AS total_matches,
                        SUM(
                            CASE
                                WHEN winner_team_id = :team_id THEN 1
                                ELSE 0
                            END
                        ) AS match_wins,
                        SUM(
                            CASE
                                WHEN winner_team_id IS NOT NULL
                                     AND winner_team_id <> :team_id2 THEN 1
                                ELSE 0
                            END
                        ) AS match_losses
                    FROM matches
                    WHERE season_id = :season_id
                      AND (team1_id = :team_id3 OR team2_id = :team_id4)
                      AND status = 'completed'";

        $stmtMatch = $this->db->prepare($sqlMatch);
        $stmtMatch->execute([
            ':team_id'   => $teamId,
            ':team_id2'  => $teamId,
            ':season_id' => $seasonId,
            ':team_id3'  => $teamId,
            ':team_id4'  => $teamId,
        ]);

        $matchStats = $stmtMatch->fetch(PDO::FETCH_ASSOC);

        if (!$matchStats || (int) $matchStats['total_matches'] === 0) {
            return null;
        }

        // ---- Statistik dari sisi GAME ----
        $sqlGame = "SELECT
                        COUNT(*)                                   AS total_games,
                        SUM(
                            CASE WHEN g.winner_team_id = :team_id THEN 1 ELSE 0 END
                        )                                          AS game_wins,
                        SUM(
                            CASE
                                WHEN g.winner_team_id IS NOT NULL
                                     AND g.winner_team_id <> :team_id2 THEN 1
                                ELSE 0
                            END
                        )                                          AS game_losses,
                        ROUND(AVG(g.duration_seconds), 0)         AS avg_duration_seconds,
                        SUM(
                            CASE WHEN g.team1_id = :team_id3
                                 THEN g.team1_kills
                                 ELSE g.team2_kills
                            END
                        )                                          AS total_kills,
                        SUM(
                            CASE WHEN g.team1_id = :team_id4
                                 THEN g.team2_kills
                                 ELSE g.team1_kills
                            END
                        )                                          AS total_deaths
                    FROM games g
                    JOIN matches m ON g.match_id = m.match_id
                    WHERE m.season_id = :season_id
                      AND (g.team1_id = :team_id5 OR g.team2_id = :team_id6)";

        $stmtGame = $this->db->prepare($sqlGame);
        $stmtGame->execute([
            ':team_id'   => $teamId,
            ':team_id2'  => $teamId,
            ':team_id3'  => $teamId,
            ':team_id4'  => $teamId,
            ':season_id' => $seasonId,
            ':team_id5'  => $teamId,
            ':team_id6'  => $teamId,
        ]);

        $gameStats = $stmtGame->fetch(PDO::FETCH_ASSOC);

        // ---- Daftar pemain aktif tim pada season ini ----
        $sqlPlayers = "SELECT DISTINCT
                           p.player_id,
                           p.player_name,
                           p.player_photo_url
                       FROM game_players gp
                       JOIN players p ON gp.player_id = p.player_id
                       JOIN games g   ON gp.game_id  = g.game_id
                       JOIN matches m ON g.match_id   = m.match_id
                       WHERE m.season_id = :season_id
                         AND gp.team_id  = :team_id
                       ORDER BY p.player_name ASC";

        $stmtPlayers = $this->db->prepare($sqlPlayers);
        $stmtPlayers->execute([':season_id' => $seasonId, ':team_id' => $teamId]);
        $players = $stmtPlayers->fetchAll(PDO::FETCH_ASSOC);

        foreach ($players as &$p) {
            $p['player_id'] = (int) $p['player_id'];
            // Alias photo_url — konsisten dengan format Player API
            $p['photo_url'] = $p['player_photo_url'] ?? null;
        }

        return [
            'match_stats' => $matchStats,
            'game_stats'  => $gameStats,
            'players'     => $players,
        ];
    }

    // =========================================================================
    // GET /api/teams/{id}/matches?season={seasonId}&page={page}&limit={limit}
    // Riwayat pertandingan tim
    // =========================================================================

    public function getTeamMatches(
        int $teamId,
        int $seasonId,
        int $limit = 20,
        int $offset = 0
    ): array {
        $sql = "SELECT
                    m.match_id,
                    m.season_id,
                    m.week,
                    m.match_date,
                    m.match_time,
                    t1.team_id    AS team1_id,
                    t1.team_name  AS team1_name,
                    t1.team_code  AS team1_code,
                    t2.team_id    AS team2_id,
                    t2.team_name  AS team2_name,
                    t2.team_code  AS team2_code,
                    m.team1_score,
                    m.team2_score,
                    m.winner_team_id,
                    m.status
                FROM matches m
                JOIN teams t1 ON m.team1_id = t1.team_id
                JOIN teams t2 ON m.team2_id = t2.team_id
                WHERE m.season_id = :season_id
                  AND (m.team1_id = :team_id OR m.team2_id = :team_id2)
                ORDER BY m.match_date DESC, m.match_time DESC
                LIMIT :limit OFFSET :offset";

        $stmt = $this->db->prepare($sql);
        $stmt->bindValue(':season_id', $seasonId, PDO::PARAM_INT);
        $stmt->bindValue(':team_id',   $teamId,   PDO::PARAM_INT);
        $stmt->bindValue(':team_id2',  $teamId,   PDO::PARAM_INT);
        $stmt->bindValue(':limit',     $limit,    PDO::PARAM_INT);
        $stmt->bindValue(':offset',    $offset,   PDO::PARAM_INT);
        $stmt->execute();

        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

        foreach ($rows as &$row) {
            $row['team1_id']       = (int) $row['team1_id'];
            $row['team2_id']       = (int) $row['team2_id'];
            $row['team1_score']    = $row['team1_score'] !== null ? (int) $row['team1_score'] : null;
            $row['team2_score']    = $row['team2_score'] !== null ? (int) $row['team2_score'] : null;
            $row['winner_team_id'] = $row['winner_team_id'] !== null ? (int) $row['winner_team_id'] : null;
            $row['season_id']      = (int) $row['season_id'];
            $row['week']           = (int) $row['week'];
            // Tambahkan logo_url untuk kedua tim
            $row['team1_logo_url'] = self::resolveLogoUrl($row['team1_name']);
            $row['team2_logo_url'] = self::resolveLogoUrl($row['team2_name']);
        }

        return $rows;
    }

    // =========================================================================
    // Helper: total match untuk pagination
    // =========================================================================

    public function countTeamMatches(int $teamId, int $seasonId): int
    {
        $sql = "SELECT COUNT(*) FROM matches
                WHERE season_id = :season_id
                  AND (team1_id = :team_id OR team2_id = :team_id2)";

        $stmt = $this->db->prepare($sql);
        $stmt->execute([
            ':season_id' => $seasonId,
            ':team_id'   => $teamId,
            ':team_id2'  => $teamId,
        ]);

        return (int) $stmt->fetchColumn();
    }
}

