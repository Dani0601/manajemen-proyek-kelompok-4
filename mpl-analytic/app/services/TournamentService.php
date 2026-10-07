<?php
// app/services/TournamentService.php
require_once __DIR__ . '/../models/Tournament.php';

class TournamentService {
    private Tournament $tournamentModel;

    public function __construct(PDO $db) {
        $this->tournamentModel = new Tournament($db);
    }

    public function getUpcomingMatches($seasonId = 13, $limit = 3) {
        $rawMatches = $this->tournamentModel->getMatchesBySeason($seasonId, $limit);

        // Memetakan struktur data agar bersih untuk Frontend
        $matches = array_map(function($match) {
            return [
                "match_id" => (int)$match['match_id'],
                "match_date" => $match['match_date'],
                "team_a" => [
                    "team_id" => (int)$match['team_a_id'],
                    "team_name" => $match['team_a_name'],
                    "short_code" => $match['team_a_code'],
                    "logo_url" => $match['team_a_logo'] ?? "https://cdn.mplanalytic.com/teams/default.png",
                    "score" => (int)$match['team_a_score']
                ],
                "team_b" => [
                    "team_id" => (int)$match['team_b_id'],
                    "team_name" => $match['team_b_name'],
                    "short_code" => $match['team_b_code'],
                    "logo_url" => $match['team_b_logo'] ?? "https://cdn.mplanalytic.com/teams/default.png",
                    "score" => (int)$match['team_b_score']
                ],
                "winner_team_id" => $match['winner_team_id'] ? (int)$match['winner_team_id'] : null
            ];
        }, $rawMatches);

        return [
            "season" => (int)$seasonId,
            "upcoming_matches" => $matches
        ];
    }
}
?>