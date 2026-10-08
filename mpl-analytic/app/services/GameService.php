<?php

declare(strict_types=1);

class GameService
{
    private Game $gameModel;

    public function __construct(Game $gameModel)
    {
        $this->gameModel = $gameModel;
    }


    /*
    |--------------------------------------------------------------------------
    | GET GAME
    |--------------------------------------------------------------------------
    */

    public function getGame(string $gameId): array
    {
        $game = $this->gameModel->findById($gameId);

        if (!$game) {
            throw new RuntimeException('GAME_NOT_FOUND');
        }

        return $this->formatGame($game);
    }


    /*
    |--------------------------------------------------------------------------
    | GET FULL GAME
    |--------------------------------------------------------------------------
    */

    public function getFullGame(string $gameId): array
    {
        $game = $this->gameModel->findById($gameId);

        if (!$game) {
            throw new RuntimeException('GAME_NOT_FOUND');
        }

        return $this->buildFullGame($game);
    }


    /*
    |--------------------------------------------------------------------------
    | BUILD FULL GAME
    |--------------------------------------------------------------------------
    */

    public function buildFullGame(array $game): array
    {
        $gameId = (string) $game['game_id'];

        $players = $this->gameModel->getPlayers($gameId);

        $picks = $this->gameModel->getPicks($gameId);

        $emblems = $this->gameModel->getEmblems($gameId);

        $items = $this->gameModel->getItems($gameId);

        return [
            'game' => $this->formatGame($game),

            'players' => array_map(
                fn(array $player): array =>
                    $this->formatPlayer($player),
                $players
            ),

            'picks' => $picks,

            'emblems' => $emblems,

            'items' => $items
        ];
    }


    /*
    |--------------------------------------------------------------------------
    | GET PLAYERS
    |--------------------------------------------------------------------------
    */

    public function getPlayers(string $gameId): array
    {
        $this->ensureGameExists($gameId);

        $players = $this->gameModel->getPlayers($gameId);

        return array_map(
            fn(array $player): array =>
                $this->formatPlayer($player),
            $players
        );
    }


    /*
    |--------------------------------------------------------------------------
    | GET PICKS
    |--------------------------------------------------------------------------
    */

    public function getPicks(string $gameId): array
    {
        $this->ensureGameExists($gameId);

        return $this->gameModel->getPicks($gameId);
    }


    /*
    |--------------------------------------------------------------------------
    | GET EMBLEMS
    |--------------------------------------------------------------------------
    */

    public function getEmblems(string $gameId): array
    {
        $this->ensureGameExists($gameId);

        return $this->gameModel->getEmblems($gameId);
    }


    /*
    |--------------------------------------------------------------------------
    | GET ITEMS
    |--------------------------------------------------------------------------
    */

    public function getItems(string $gameId): array
    {
        $this->ensureGameExists($gameId);

        return $this->gameModel->getItems($gameId);
    }


    /*
    |--------------------------------------------------------------------------
    | BUILD MULTIPLE GAMES
    |--------------------------------------------------------------------------
    |
    | Digunakan MatchService.
    |
    */

    public function buildFullGames(array $games): array
    {
        if (empty($games)) {
            return [];
        }

        $gameIds = [];

        foreach ($games as $game) {
            $gameIds[] = (string) $game['game_id'];
        }

        $gameIds = array_values(
            array_unique($gameIds)
        );


        /*
        |--------------------------------------------------------------------------
        | Ambil seluruh data sekaligus
        |--------------------------------------------------------------------------
        */

        $players = $this->gameModel
            ->getPlayersByGameIds($gameIds);

        $picks = $this->gameModel
            ->getPicksByGameIds($gameIds);

        $emblems = $this->gameModel
            ->getEmblemsByGameIds($gameIds);

        $items = $this->gameModel
            ->getItemsByGameIds($gameIds);


        /*
        |--------------------------------------------------------------------------
        | Group berdasarkan game_id
        |--------------------------------------------------------------------------
        */

        $playersByGame = $this->groupByGameId(
            $players
        );

        $picksByGame = $this->groupByGameId(
            $picks
        );

        $emblemsByGame = $this->groupByGameId(
            $emblems
        );

        $itemsByGame = $this->groupByGameId(
            $items
        );


        /*
        |--------------------------------------------------------------------------
        | Build response
        |--------------------------------------------------------------------------
        */

        $result = [];

        foreach ($games as $game) {

            $gameId = (string) $game['game_id'];

            $gamePlayers =
                $playersByGame[$gameId] ?? [];

            $gamePicks =
                $picksByGame[$gameId] ?? [];

            $gameEmblems =
                $emblemsByGame[$gameId] ?? [];

            $gameItems =
                $itemsByGame[$gameId] ?? [];


            $result[] = [

                'game' =>
                    $this->formatGame($game),

                'players' =>
                    array_map(
                        fn(array $player): array =>
                            $this->formatPlayer($player),
                        $gamePlayers
                    ),

                'picks' =>
                    $gamePicks,

                'emblems' =>
                    $gameEmblems,

                'items' =>
                    $gameItems
            ];
        }

        return $result;
    }


    /*
    |--------------------------------------------------------------------------
    | ENSURE GAME EXISTS
    |--------------------------------------------------------------------------
    */

    private function ensureGameExists(
        string $gameId
    ): array {

        $game =
            $this->gameModel->findById($gameId);

        if (!$game) {
            throw new RuntimeException(
                'GAME_NOT_FOUND'
            );
        }

        return $game;
    }


    /*
    |--------------------------------------------------------------------------
    | GROUP BY GAME ID
    |--------------------------------------------------------------------------
    */

    private function groupByGameId(
        array $rows
    ): array {

        $result = [];

        foreach ($rows as $row) {

            if (!isset($row['game_id'])) {
                continue;
            }

            $gameId =
                (string) $row['game_id'];

            if (!isset($result[$gameId])) {
                $result[$gameId] = [];
            }

            $result[$gameId][] = $row;
        }

        return $result;
    }


    /*
    |--------------------------------------------------------------------------
    | FORMAT GAME
    |--------------------------------------------------------------------------
    */

    private function formatGame(array $game): array
    {
        return [
            'game_id' =>
                $game['game_id'] ?? null,

            'match_id' =>
                $game['match_id'] ?? null,

            'game_number' =>
                isset($game['game_number'])
                    ? (int) $game['game_number']
                    : null,

            'duration' =>
                $game['duration'] ?? null,

            'winner_team_id' =>
                $game['winner_team_id'] ?? null
        ];
    }


    /*
    |--------------------------------------------------------------------------
    | FORMAT PLAYER
    |--------------------------------------------------------------------------
    */

    private function formatPlayer(
        array $player
    ): array {

        $kills =
            (int) ($player['kills'] ?? 0);

        $deaths =
            (int) ($player['deaths'] ?? 0);

        $assists =
            (int) ($player['assists'] ?? 0);


        return [

            'player_id' =>
                $player['player_id'] ?? null,

            'player_name' =>
                $player['player_name'] ?? null,

            'team_id' =>
                $player['team_id'] ?? null,

            'hero' => [

                'hero_id' =>
                    $player['hero_id'] ?? null,

                'hero_name' =>
                    $player['hero_name'] ?? null
            ],

            'stats' => [

                'kills' =>
                    $kills,

                'deaths' =>
                    $deaths,

                'assists' =>
                    $assists,

                'kda' =>
                    $this->calculateKda(
                        $kills,
                        $deaths,
                        $assists
                    ),

                'gold' =>
                    isset($player['gold'])
                        ? (int) $player['gold']
                        : null,

                'damage' =>
                    isset($player['damage'])
                        ? (int) $player['damage']
                        : null,

                'damage_taken' =>
                    isset($player['damage_taken'])
                        ? (int) $player['damage_taken']
                        : null,

                'turret_damage' =>
                    isset($player['turret_damage'])
                        ? (int) $player['turret_damage']
                        : null
            ]
        ];
    }


    /*
    |--------------------------------------------------------------------------
    | KDA
    |--------------------------------------------------------------------------
    */

    private function calculateKda(
        int $kills,
        int $deaths,
        int $assists
    ): float|int {

        if ($deaths === 0) {
            return $kills + $assists;
        }

        return round(
            ($kills + $assists) / $deaths,
            2
        );
    }
}