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
    public function getMatchesBySeason($seasonId, $limit = 5) {
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
                LIMIT :limit";

        $stmt = $this->db->prepare($sql);
        $stmt->bindValue(':season_id', (int)$seasonId, PDO::PARAM_INT);
        $stmt->bindValue(':season_id_num', (int)$seasonId, PDO::PARAM_INT);
        $stmt->bindValue(':limit', (int)$limit, PDO::PARAM_INT);
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
}
?>