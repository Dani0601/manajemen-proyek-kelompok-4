<?php

declare(strict_types=1);

class MatchService
{
    private MatchModel $matchModel;
    private GameService $gameService;

    public function __construct(
        MatchModel $matchModel,
        GameService $gameService
    ) {
        $this->matchModel = $matchModel;
        $this->gameService = $gameService;
    }

    public function getMatch(string $matchId): array
    {
        $matchId = trim($matchId);

        if ($matchId === '') {
            throw new RuntimeException('INVALID_MATCH_ID');
        }

        $match = $this->matchModel->findById($matchId);

        if (!$match) {
            throw new RuntimeException('MATCH_NOT_FOUND');
        }

        $games = $this->matchModel->getGames($matchId);

        $fullGames = $this->gameService->buildFullGames($games);

        return [
            'match' => $match,
            'games' => $fullGames,
        ];
    }

    public function getGames(string $matchId): array
    {
        $matchId = trim($matchId);

        if ($matchId === '') {
            throw new RuntimeException('INVALID_MATCH_ID');
        }

        $match = $this->matchModel->findById($matchId);

        if (!$match) {
            throw new RuntimeException('MATCH_NOT_FOUND');
        }

        return $this->matchModel->getGames($matchId);
    }
}