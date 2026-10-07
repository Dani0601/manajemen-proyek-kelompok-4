<?php
// app/services/MatchService.php
require_once __DIR__ . '/../models/Match.php';

class MatchService {
    private $matchModel;

    public function __construct($db) {
        $this->matchModel = new MatchModel($db);
    }

    /**
     * Memformat data untuk endpoint GET /matches/{match_id}
     * Menggabungkan data match utama, daftar game, statistik KDA player, dan timeline gold.
     */
    public function getMatchDetail($matchId) {
        // 1. Ambil info utama pertandingan
        $match = $this->matchModel->getMatchById($matchId);
        if (!$match) {
            return null; // Akan memicu error 404 di Controller
        }

        // 2. Ambil daftar game di dalam match tersebut (Match biasanya format BO3 / BO5)
        $gamesData = [];
        $games = $this->matchModel->getGamesByMatchId($matchId);

        // 3. Proses Looping: Untuk setiap game, ambil data KDA dan Gold
        foreach ($games as $game) {
            $gamesData[] = [
                "game_number" => (int)$game['game_number'],
                "duration_seconds" => (int)$game['duration_seconds'],
                "winner_team_id" => (int)$game['winner_team_id'],
                // Memanggil fungsi KDA dan Gold berdasarkan ID game saat ini
                "player_stats" => $this->matchModel->getPlayerStatsByGameId($game['game_id']),
                "gold_timeline" => $this->matchModel->getGoldTimelineByGameId($game['game_id'])
            ];
        }

        // 4. Rangkai menjadi satu format JSON akhir
        return [
            "match_id" => (int)$match['match_id'],
            "season" => (int)$match['season_id'],
            "match_date" => $match['match_date'],
            "team_a" => [
                "team_id" => (int)$match['team_a_id'],
                "short_code" => $match['team_a_code'],
                "score" => (int)$match['team_a_score']
            ],
            "team_b" => [
                "team_id" => (int)$match['team_b_id'],
                "short_code" => $match['team_b_code'],
                "score" => (int)$match['team_b_score']
            ],
            "winner_team_id" => (int)$match['winner_team_id'],
            "games" => $gamesData
        ];
    }

    /**
     * Memformat data untuk endpoint GET /matches/{match_id}/drafts
     * Mengelompokkan riwayat draft berdasarkan urutan game
     */
    public function getMatchDrafts($matchId) {
        // Cek validitas match terlebih dahulu
        if (!$this->matchModel->getMatchById($matchId)) {
            return null;
        }

        $rawDrafts = $this->matchModel->getDraftsByMatchId($matchId);
        $draftsGrouped = [];

        // Algoritma Pengelompokan Data (Grouping by game_number)
        foreach ($rawDrafts as $draft) {
            $gameNum = (int)$draft['game_number'];
            
            // Jika array untuk game ini belum ada, buat kerangkanya
            if (!isset($draftsGrouped[$gameNum])) {
                $draftsGrouped[$gameNum] = [
                    "game_number" => $gameNum,
                    "draft_sequence" => []
                ];
            }
            
            // Masukkan urutan pick/ban ke dalam array sequence
            $draftsGrouped[$gameNum]['draft_sequence'][] = [
                "turn" => (int)$draft['turn'],
                "team_short_code" => $draft['team_short_code'],
                "draft_type" => $draft['draft_type'],
                "hero_name" => $draft['hero_name']
            ];
        }

        return [
            "match_id" => (int)$matchId,
            // array_values mereset kunci index array agar menjadi standar [0, 1, 2] di JSON
            "drafts" => array_values($draftsGrouped) 
        ];
    }
}
?>