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
                    t1.short_code AS team_a_code,
                    t1.logo_url AS team_a_logo,
                    m.team_a_score,
                    t2.team_id AS team_b_id,
                    t2.team_name AS team_b_name,
                    t2.short_code AS team_b_code,
                    t2.logo_url AS team_b_logo,
                    m.team_b_score,
                    m.winner_team_id
                FROM matches m
                JOIN teams t1 ON m.team_a_id = t1.team_id
                JOIN teams t2 ON m.team_b_id = t2.team_id
                WHERE m.season_id = :season_id
                ORDER BY m.match_date ASC
                LIMIT :limit";

        $stmt = $this->db->prepare($sql);
        // Bind parameter limit harus bertipe integer di PDO
        $stmt->bindValue(':season_id', $seasonId, PDO::PARAM_INT);
        $stmt->bindValue(':limit', $limit, PDO::PARAM_INT);
        $stmt->execute();

        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }
    /**
     * Mengambil data klasemen (Standings) tim berdasarkan musim
     */
    public function getStandingsBySeason($seasonId) {
        $sql = "SELECT 
                    t.team_id,
                    t.team_name,
                    t.short_code,
                    t.logo_url,
                    COUNT(m.match_id) AS played,
                    SUM(CASE WHEN (m.winner_team_id = t.team_id) THEN 1 ELSE 0 END) AS wins,
                    SUM(CASE WHEN (m.winner_team_id IS NOT NULL AND m.winner_team_id != t.team_id) THEN 1 ELSE 0 END) AS losses
                FROM teams t
                JOIN team_rosters tr ON t.team_id = tr.team_id
                LEFT JOIN matches m ON (m.team_a_id = t.team_id OR m.team_b_id = t.team_id) AND m.season_id = :season_id
                WHERE tr.season_id = :season_id_roster
                GROUP BY t.team_id, t.team_name, t.short_code, t.logo_url
                ORDER BY wins DESC, losses ASC";

        $stmt = $this->db->prepare($sql);
        $stmt->execute([
            ':season_id' => $seasonId,
            ':season_id_roster' => $seasonId
        ]);

        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }
}
?>