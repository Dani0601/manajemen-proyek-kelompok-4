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

        // Jika salah satu pemain tidak memiliki data
        // pada season yang dipilih
        if (!$statsP1 || (!$statsP2 && $player1Id !== $player2Id)) {
            return null;
        }

        return [
            "season" => (int)$seasonId,

            "comparison" => [

                "player_1" => [
                    "player_id" => (int)$player1Id,
                    "player_name" => $statsP1['player_name'],
                    "team_name" => $statsP1['team_name'],

                    "stats" => [
                        "kill_power" => (float)$statsP1['Kill Power'],
                        "farm_rate" => (float)$statsP1['Farm Rate'],
                        "survival" => (float)$statsP1['Survival'],
                        "versatility" => (float)$statsP1['Versatility'],
                        "objective" => (float)$statsP1['Objective'],
                        "teamfight" => (float)$statsP1['Teamfight']
                    ]
                ],

                "player_2" => [
                    "player_id" => (int)$player2Id,
                    "player_name" => $statsP2['player_name'],
                    "team_name" => $statsP2['team_name'],

                    "stats" => [
                        "kill_power" => (float)$statsP2['Kill Power'],
                        "farm_rate" => (float)$statsP2['Farm Rate'],
                        "survival" => (float)$statsP2['Survival'],
                        "versatility" => (float)$statsP2['Versatility'],
                        "objective" => (float)$statsP2['Objective'],
                        "teamfight" => (float)$statsP2['Teamfight']
                    ]
                ]
            ]
        ];
    }
}
?>