<?php

require_once dirname(__DIR__) . '/config/database.php';
require_once dirname(__DIR__) . '/models/Hero.php';

class HeroService
{
    private Hero $hero;

    public function __construct()
    {
        $db = Database::connect();

        $this->hero = new Hero($db);
    }

    public function getHeroes(): array
    {
        return $this->hero->all();
    }

    public function getHeroById(int $heroId): ?array
    {
        $hero = $this->hero->findById($heroId);

        if ($hero === null) {
            return null;
        }

        $detail = $this->hero->getDetail($heroId);

        if ($detail !== null) {
            if (!empty($detail['hero_info_json'])) {
                $detail['hero_info'] = json_decode(
                    $detail['hero_info_json'],
                    true
                );
            } else {
                $detail['hero_info'] = null;
            }

            if (!empty($detail['base_stats_json'])) {
                $detail['base_stats'] = json_decode(
                    $detail['base_stats_json'],
                    true
                );
            } else {
                $detail['base_stats'] = null;
            }

            unset($detail['hero_info_json']);
            unset($detail['base_stats_json']);
        }

        return [
            'hero' => $hero,
            'detail' => $detail,
        ];
    }

    public function getHeroStats(int $heroId): ?array
    {
        $hero = $this->hero->findById($heroId);

        if ($hero === null) {
            return null;
        }

        return [
            'hero' => $hero,
            'stats' => $this->hero->getStats($heroId),
        ];
    }

    public function getHeroBuilds(int $heroId): ?array
    {
        $hero = $this->hero->findById($heroId);

        if ($hero === null) {
            return null;
        }

        return [
            'hero' => $hero,
            'items' => $this->hero->getBuildItems($heroId),
            'emblems' => $this->hero->getBuildEmblems($heroId),
            'spells' => $this->hero->getBuildSpells($heroId),
            'talents' => $this->hero->getBuildTalents($heroId),
            'situational_swaps' => $this->hero->getSituationalSwaps($heroId),
        ];
    }

    public function getHeroCounters(int $heroId): ?array
    {
        $hero = $this->hero->findById($heroId);

        if ($hero === null) {
            return null;
        }

        return [
            'hero' => $hero,
            'counters' => $this->hero->getCounters(
                $heroId,
                'counter'
            ),
            'strong_against' => $this->hero->getCounters(
                $heroId,
                'strong_against'
            ),
            'synergy' => $this->hero->getCounters(
                $heroId,
                'synergy'
            ),
        ];
    }

    public function getHeroSkills(int $heroId): ?array
    {
        $hero = $this->hero->findById($heroId);

        if ($hero === null) {
            return null;
        }

        return [
            'hero' => $hero,
            'skills' => $this->hero->getSkills($heroId),
            'skill_order' => $this->hero->getSkillOrders($heroId),
        ];
    }
}