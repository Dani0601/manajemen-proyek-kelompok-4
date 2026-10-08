<?php

declare(strict_types=1);

require_once dirname(__DIR__) . '/config/database.php';
require_once dirname(__DIR__) . '/models/Match.php';
require_once dirname(__DIR__) . '/models/Game.php';
require_once dirname(__DIR__) . '/services/MatchService.php';
require_once dirname(__DIR__) . '/services/GameService.php';

class MatchController
{
    private MatchService $service;

    public function __construct()
    {
        $db = Database::connect();

        $matchModel = new MatchModel($db);
        $gameModel = new Game($db);

        $gameService = new GameService($gameModel);

        $this->service = new MatchService(
            $matchModel,
            $gameService
        );
    }

    public function index(): void
    {
        jsonResponse(
            [],
            'Daftar match belum diimplementasikan.',
            501
        );
    }

    public function show(string $matchId): void
    {
        try {
            $data = $this->service->getMatch($matchId);

            jsonResponse(
                $data,
                'Detail match berhasil diambil.',
                200
            );
        } catch (RuntimeException $e) {
            $this->handleException($e);
        }
    }

    public function games(string $matchId): void
    {
        try {
            $data = $this->service->getGames($matchId);

            jsonResponse(
                $data,
                'Daftar game dalam match berhasil diambil.',
                200
            );
        } catch (RuntimeException $e) {
            $this->handleException($e);
        }
    }

    private function handleException(RuntimeException $e): void
    {
        switch ($e->getMessage()) {
            case 'INVALID_MATCH_ID':
                jsonResponse(
                    null,
                    'Match ID tidak valid.',
                    400
                );
                break;

            case 'MATCH_NOT_FOUND':
                jsonResponse(
                    null,
                    'Match tidak ditemukan.',
                    404
                );
                break;

            default:
                throw $e;
        }
    }
}