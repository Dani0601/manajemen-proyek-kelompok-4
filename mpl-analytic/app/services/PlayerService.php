<?php
// app/services/PlayerService.php

require_once __DIR__ . '/../models/Player.php';

class PlayerService
{
    private Player $playerModel;

    public function __construct(PDO $db)
    {
        $this->playerModel = new Player($db);
    }

    public function getMasterPlayers(int $page = 1, int $limit = 50)
    {
        $offset = ($page - 1) * $limit;

        return $this->playerModel->getAllPlayers($limit, $offset);
    }

    public function comparePlayers(
        int $player1Id,
        int $player2Id,
        int $seasonId = 17
    ) {
        // Ambil statistik kedua pemain sekaligus
        $rawStats = $this->playerModel->getPlayerComparisonStats(
            $player1Id,
            $player2Id,
            $seasonId
        );

        $statsP1 = null;
        $statsP2 = null;

        foreach ($rawStats as $row) {

            if ((int)$row['player_id'] === $player1Id) {
                $statsP1 = $row;
            }

            if ((int)$row['player_id'] === $player2Id) {
                $statsP2 = $row;
            }
        }

        // Pemain yang dibandingkan tidak boleh sama
        if ($player1Id === $player2Id) {
            return null;
        }

        // Jika salah satu pemain tidak memiliki data pada season yang dipilih
        if (!$statsP1 || !$statsP2) {
            return null;
        }

        $formatPlayerData = function(array $stats) {
            return [
                "player_id" => (int)$stats['player_id'],
                "player_name" => $stats['player_name'],
                "team_name" => $stats['team_name'],

                // 1. Radar Chart / Perbandingan Pemain
                "stats" => [
                    "kill_power" => (float)$stats['Kill Power'],
                    "farm_rate" => (float)$stats['Farm Rate'],
                    "survival" => (float)$stats['Survival'],
                    "versatility" => (float)$stats['Versatility'],
                    "objective" => (float)$stats['Objective'],
                    "teamfight" => (float)$stats['Teamfight']
                ],

                // 2. Statistik Liga
                "league_stats" => [
                    "match_played" => (int)($stats['matches_played'] ?? 0),
                    "avg_kda" => (float)($stats['avg_kda'] ?? 0),
                    "kill_participation" => (float)($stats['kill_participation'] ?? 0)
                ],

                // 3. Statistik Detail
                "detail_stats" => [
                    "gold_per_minute" => (int)round($stats['gold_per_minute'] ?? 0),
                    "damage_per_minute" => (int)round($stats['damage_per_minute'] ?? 0),
                    "objective_secured" => (int)round($stats['objective_secured'] ?? 0)
                ],

                // 4. Performa (win rate)
                "performance" => [
                    "win_rate" => (float)($stats['win_rate'] ?? 0),
                    "total_games" => (int)($stats['matches_played'] ?? 0),
                    "wins" => (int)($stats['wins'] ?? 0),
                    "losses" => (int)($stats['losses'] ?? 0)
                ],

                // Alias Bahasa Indonesia sesuai desain UI
                "statistik_liga" => [
                    "match_dimainkan" => (int)($stats['matches_played'] ?? 0),
                    "kda_rata_rata" => (float)($stats['avg_kda'] ?? 0),
                    "kill_participation" => (float)($stats['kill_participation'] ?? 0)
                ],
                "statistik_detail" => [
                    "gold_per_menit" => (int)round($stats['gold_per_minute'] ?? 0),
                    "damage_per_menit" => (int)round($stats['damage_per_minute'] ?? 0),
                    "objective_dikuasai" => (int)round($stats['objective_secured'] ?? 0)
                ],
                "performa" => [
                    "win_rate" => (float)($stats['win_rate'] ?? 0),
                    "total_game" => (int)($stats['matches_played'] ?? 0),
                    "menang" => (int)($stats['wins'] ?? 0),
                    "kalah" => (int)($stats['losses'] ?? 0)
                ]
            ];
        };

        return [
            "season" => (int)$seasonId,
            "comparison" => [
                "player_1" => $formatPlayerData($statsP1),
                "player_2" => $formatPlayerData($statsP2)
            ]
        ];
    }
}
?>