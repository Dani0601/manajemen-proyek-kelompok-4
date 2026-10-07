<?php

require_once dirname(__DIR__) . '/services/HeroService.php';
require_once dirname(__DIR__) . '/helpers/response.php';

class HeroController
{
    private HeroService $service;

    public function __construct()
    {
        $this->service = new HeroService();
    }

    public function index(): never
    {
        $data = $this->service->getHeroes();

        jsonResponse(
            $data,
            'Data hero berhasil diambil.'
        );
    }

    public function show(int $heroId): never
    {
        $data = $this->service->getHeroById($heroId);

        if ($data === null) {
            jsonResponse(
                null,
                'Hero tidak ditemukan.',
                404,
                [
                    'error' => [
                        'code' => 'HERO_NOT_FOUND'
                    ]
                ]
            );
        }

        jsonResponse(
            $data,
            'Detail hero berhasil diambil.'
        );
    }

    public function stats(int $heroId): never
    {
        $data = $this->service->getHeroStats($heroId);

        if ($data === null) {
            jsonResponse(
                null,
                'Hero tidak ditemukan.',
                404,
                [
                    'error' => [
                        'code' => 'HERO_NOT_FOUND'
                    ]
                ]
            );
        }

        jsonResponse(
            $data,
            'Statistik hero berhasil diambil.'
        );
    }

    public function builds(int $heroId): never
    {
        $data = $this->service->getHeroBuilds($heroId);

        if ($data === null) {
            jsonResponse(
                null,
                'Hero tidak ditemukan.',
                404,
                [
                    'error' => [
                        'code' => 'HERO_NOT_FOUND'
                    ]
                ]
            );
        }

        jsonResponse(
            $data,
            'Build hero berhasil diambil.'
        );
    }

    public function counters(int $heroId): never
    {
        $data = $this->service->getHeroCounters($heroId);

        if ($data === null) {
            jsonResponse(
                null,
                'Hero tidak ditemukan.',
                404,
                [
                    'error' => [
                        'code' => 'HERO_NOT_FOUND'
                    ]
                ]
            );
        }

        jsonResponse(
            $data,
            'Data counter hero berhasil diambil.'
        );
    }

    public function skills(int $heroId): never
    {
        $data = $this->service->getHeroSkills($heroId);

        if ($data === null) {
            jsonResponse(
                null,
                'Hero tidak ditemukan.',
                404,
                [
                    'error' => [
                        'code' => 'HERO_NOT_FOUND'
                    ]
                ]
            );
        }

        jsonResponse(
            $data,
            'Data skill hero berhasil diambil.'
        );
    }
}