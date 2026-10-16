
<?php
require_once __DIR__ . '/../models/Match.php';

class MatchService{
    private MatchModel $matchModel;

    public function __construct(PDO $db)
    {
        $this->matchModel = new MatchModel($db);
    }


      // Detail pertandingan.
      // Target: GET /api/matches/{match_id}

    public function getMatchDetail(string $matchId): ?array
    {
        // Ambil informasi utama pertandingan
        $match = $this->matchModel->getMatchById($matchId);

        if ($match === null) {
            return null;
        }

        // Ambil daftar game
        $games = $this->matchModel->getGamesByMatchId($matchId);
        $gamesData = [];

        // Ambil statistik pemain untuk setiap game
        foreach ($games as $game) {
            $gameId = (string) $game['game_id'];

            $gamesData[] = [
                'game_id' => $gameId,
                'game_number' => (int) $game['game_number'],
                'winner_team_id' => $game['winner_team_id'] !== null
                    ? (int) $game['winner_team_id']
                    : null,
                'player_stats' =>
                    $this->matchModel->getPlayerStatsByGameId($gameId),
                'gold_timeline' =>
                    $this->matchModel->getGoldTimelineByGameId($gameId),
            ];
        }

        // Susun respons detail pertandingan
        return [
            'match_id' => $match['match_id'],
            'season_id' => (int) $match['season_id'],
            'week' => isset($match['week'])
                ? (int) $match['week']
                : null,
            'match_date' => $match['match_date'],
            'match_time' => $match['match_time'] ?? null,

            'team1' => [
                'team_id' => (int) $match['team1_id'],
                'team_name' => $match['team1_name'],
                'score' => $match['team1_score'] !== null
                    ? (int) $match['team1_score']
                    : null,
            ],

            'team2' => [
                'team_id' => (int) $match['team2_id'],
                'team_name' => $match['team2_name'],
                'score' => $match['team2_score'] !== null
                    ? (int) $match['team2_score']
                    : null,
            ],

            'winner_team_id' => $match['winner_team_id'] !== null
                ? (int) $match['winner_team_id']
                : null,

            'status' => $match['status'],
            'source' => $match['source'],
        ];
    }


     // Detail draft pertandingan.
     // Target: GET /api/matches/{match_id}/drafts

    public function getMatchDrafts(string $matchId): ?array
    {
        // Pastikan pertandingan tersedia
        $match = $this->matchModel->getMatchById($matchId);

        if ($match === null) {
            return null;
        }

        // Ambil seluruh draft
        $rawDrafts = $this->matchModel->getDraftsByMatchId($matchId);
        $draftsGrouped = [];

        // Kelompokkan berdasarkan nomor game
        foreach ($rawDrafts as $draft) {
            $gameNumber = (int) $draft['game_number'];

            if (!isset($draftsGrouped[$gameNumber])) {
                $draftsGrouped[$gameNumber] = [
                    'game_number' => $gameNumber,
                    'draft_sequence' => [],
                ];
            }

            $draftsGrouped[$gameNumber]['draft_sequence'][] = [
                'turn' => (int) $draft['turn'],
                'team_name' => $draft['team_name'],
                'draft_type' => $draft['draft_type'],
                'hero_name' => $draft['hero_name'],
            ];
        }

        // Kembalikan format respons
        return [
            'match_id' => $matchId,
            'drafts' => array_values($draftsGrouped),
        ];
    }
}
