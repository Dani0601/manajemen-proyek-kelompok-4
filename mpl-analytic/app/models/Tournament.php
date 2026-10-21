<?php
// app/models/Tournament.php

class Tournament {
    private $db;

    public function __construct($dbConnection) {
        $this->db = $dbConnection;
    }

    /**
     * Mengambil daftar jadwal pertandingan (Upcoming/Recent Matches)
     */
    public function getMatchesBySeason($seasonId, ?int $limit = null) {
        $limitClause = ($limit !== null && $limit > 0) ? "LIMIT :limit" : "";

        $sql = "SELECT 
                    m.match_id,
                    m.season_id,
                    m.match_date,
                    t1.team_id AS team_a_id,
                    t1.team_name AS team_a_name,
                    t1.team_code AS team_a_code,
                    m.team1_score AS team_a_score,
                    t2.team_id AS team_b_id,
                    t2.team_name AS team_b_name,
                    t2.team_code AS team_b_code,
                    m.team2_score AS team_b_score,
                    m.winner_team_id
                FROM matches m
                JOIN teams t1 ON m.team1_id = t1.team_id
                JOIN teams t2 ON m.team2_id = t2.team_id
                JOIN seasons s ON m.season_id = s.season_id
                WHERE (s.season_id = :season_id OR s.season_number = :season_id_num)
                ORDER BY m.match_date ASC
                {$limitClause}";

        $stmt = $this->db->prepare($sql);
        $stmt->bindValue(':season_id', (int)$seasonId, PDO::PARAM_INT);
        $stmt->bindValue(':season_id_num', (int)$seasonId, PDO::PARAM_INT);
        if ($limit !== null && $limit > 0) {
            $stmt->bindValue(':limit', (int)$limit, PDO::PARAM_INT);
        }
        $stmt->execute();

        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    /**
     * Mengambil data klasemen (Standings) tim berdasarkan musim
     */
    public function getStandingsBySeason($seasonId) {
        $sqlFilePath = __DIR__ . '/../../database/queries/tournament_standings.sql';
        if (file_exists($sqlFilePath)) {
            $seasonStmt = $this->db->prepare("SELECT season_id FROM seasons WHERE season_id = :s1 OR season_number = :s2 LIMIT 1");
            $seasonStmt->execute([':s1' => $seasonId, ':s2' => $seasonId]);
            $resolvedSeason = $seasonStmt->fetchColumn();
            $targetSeasonId = $resolvedSeason !== false ? (int)$resolvedSeason : $seasonId;

            $this->db->setAttribute(PDO::ATTR_EMULATE_PREPARES, true);
            $sql = file_get_contents($sqlFilePath);
            $stmt = $this->db->prepare($sql);
            $stmt->execute([':season_id' => $targetSeasonId]);
            $result = $stmt->fetchAll(PDO::FETCH_ASSOC);
            $this->db->setAttribute(PDO::ATTR_EMULATE_PREPARES, false);

            return $result;
        }

        return [];
    }

    /**
     * Mengambil semua data seasons sebagai daftar tournament
     */
    public function getAllSeasons(): array {
        $sql = "SELECT 
                    season_id,
                    CONCAT(COALESCE(league, 'MPL'), ' Season ', season_number) AS season_name,
                    season_number,
                    league,
                    start_date,
                    end_date
                FROM seasons
                ORDER BY season_number DESC";

        $stmt = $this->db->query($sql);
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    /**
     * Mengambil data season berdasarkan ID
     */
    public function getSeasonById(int $seasonId): ?array {
        $sql = "SELECT 
                    s.season_id,
                    CONCAT(COALESCE(s.league, 'MPL'), ' Season ', s.season_number) AS season_name,
                    s.season_number,
                    s.league,
                    s.start_date,
                    s.end_date
                FROM seasons s
                WHERE s.season_id = :season_id OR s.season_number = :season_num
                LIMIT 1";

        $stmt = $this->db->prepare($sql);
        $stmt->bindValue(':season_id', $seasonId, PDO::PARAM_INT);
        $stmt->bindValue(':season_num', $seasonId, PDO::PARAM_INT);
        $stmt->execute();

        $result = $stmt->fetch(PDO::FETCH_ASSOC);
        return $result ?: null;
    }
}
?>