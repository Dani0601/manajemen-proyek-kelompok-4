<?php

declare(strict_types=1);

require_once dirname(__DIR__) . '/models/Game.php';
require_once dirname(__DIR__) . '/services/GameService.php';
require_once dirname(__DIR__). '/config/database.php';
class GameController
{
    private GameService $service;

    public function __construct()
    {
        /*
        |--------------------------------------------------------------------------
        | Database
        |--------------------------------------------------------------------------
        |
        | Sesuaikan dengan file koneksi database kamu.
        |
        */

        $db = Database::connect();
        /*
        |--------------------------------------------------------------------------
        | Model
        |--------------------------------------------------------------------------
        */

        $model = new Game($db);


        /*
        |--------------------------------------------------------------------------
        | Service
        |--------------------------------------------------------------------------
        */

        $this->service =
            new GameService($model);
    }


    /*
    |--------------------------------------------------------------------------
    | GET /api/games
    |--------------------------------------------------------------------------
    */

    public function index(): void
    {
        jsonResponse(
            [],
            'Daftar game.'
        );
    }


    /*
    |--------------------------------------------------------------------------
    | GET /api/games/{game_id}
    |--------------------------------------------------------------------------
    */

    public function show(
        string $gameId
    ): void {

        try {

            $data =
                $this->service->getFullGame(
                    $gameId
                );

            jsonResponse(
                $data,
                'Detail game berhasil diambil.'
            );

        } catch (RuntimeException $e) {

            if (
                $e->getMessage() ===
                'GAME_NOT_FOUND'
            ) {

                jsonResponse(
                    null,
                    'Game tidak ditemukan.',
                    404,
                    [
                        'error' => [
                            'code' =>
                                'GAME_NOT_FOUND'
                        ]
                    ]
                );
            }

            throw $e;
        }
    }


    /*
    |--------------------------------------------------------------------------
    | GET /api/games/{game_id}/players
    |--------------------------------------------------------------------------
    */

    public function players(
        string $gameId
    ): void {

        try {

            $data =
                $this->service->getPlayers(
                    $gameId
                );

            jsonResponse(
                $data,
                'Data player game berhasil diambil.'
            );

        } catch (RuntimeException $e) {

            $this->handleGameException($e);
        }
    }


    /*
    |--------------------------------------------------------------------------
    | GET /api/games/{game_id}/picks
    |--------------------------------------------------------------------------
    */

    public function picks(
        string $gameId
    ): void {

        try {

            $data =
                $this->service->getPicks(
                    $gameId
                );

            jsonResponse(
                $data,
                'Data pick game berhasil diambil.'
            );

        } catch (RuntimeException $e) {

            $this->handleGameException($e);
        }
    }


    /*
    |--------------------------------------------------------------------------
    | GET /api/games/{game_id}/emblems
    |--------------------------------------------------------------------------
    */

    public function emblems(
        string $gameId
    ): void {

        try {

            $data =
                $this->service->getEmblems(
                    $gameId
                );

            jsonResponse(
                $data,
                'Data emblem game berhasil diambil.'
            );

        } catch (RuntimeException $e) {

            $this->handleGameException($e);
        }
    }


    /*
    |--------------------------------------------------------------------------
    | GET /api/games/{game_id}/items
    |--------------------------------------------------------------------------
    */

    public function items(
        string $gameId
    ): void {

        try {

            $data =
                $this->service->getItems(
                    $gameId
                );

            jsonResponse(
                $data,
                'Data item game berhasil diambil.'
            );

        } catch (RuntimeException $e) {

            $this->handleGameException($e);
        }
    }


    /*
    |--------------------------------------------------------------------------
    | GAME EXCEPTION
    |--------------------------------------------------------------------------
    */

    private function handleGameException(
        RuntimeException $e
    ): void {

        if (
            $e->getMessage() ===
            'GAME_NOT_FOUND'
        ) {

            jsonResponse(
                null,
                'Game tidak ditemukan.',
                404,
                [
                    'error' => [
                        'code' =>
                            'GAME_NOT_FOUND'
                    ]
                ]
            );

            return;
        }

        throw $e;
    }
}