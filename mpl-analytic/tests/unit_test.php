<?php

declare(strict_types=1);

/**
 * Unit & Smoke Test Sederhana untuk CI (tanpa Composer/PHPUnit & tanpa DB).
 * Usage: php mpl-analytic/tests/unit_test.php
 */

$passed = 0;
$failed = 0;

function test(string $name, callable $fn): void
{
    global $passed, $failed;
    try {
        $fn();
        $passed++;
        echo "[PASS] {$name}\n";
    } catch (Throwable $e) {
        $failed++;
        echo "[FAIL] {$name}: {$e->getMessage()} ({$e->getFile()}:{$e->getLine()})\n";
    }
}

function assertSameValue(mixed $expected, mixed $actual, string $message = ''): void
{
    if ($expected !== $actual) {
        $expStr = var_export($expected, true);
        $actStr = var_export($actual, true);
        throw new RuntimeException(($message ? "{$message}: " : '') . "expected {$expStr}, got {$actStr}");
    }
}

$appDir = dirname(__DIR__) . '/app';

// ---------------------------------------------------------------------------
// 1. Smoke Test: Pastikan semua helper, model, service, controller bisa di-load
// ---------------------------------------------------------------------------
test('Smoke: load helpers (pagination & validation)', function () use ($appDir) {
    require_once $appDir . '/helpers/pagination.php';
    require_once $appDir . '/helpers/validation.php';
    assertSameValue(true, function_exists('getPaginationParams'));
    assertSameValue(true, function_exists('paginationMeta'));
    assertSameValue(true, function_exists('validatePositiveInteger'));
});

test('Smoke: load core models & services', function () use ($appDir) {
    $files = [
        '/models/Game.php',
        '/models/Match.php',
        '/models/Player.php',
        '/models/Hero.php',
        '/models/Team.php',
        '/models/Dashboard.php',
        '/models/Meta.php',
        '/services/GameService.php',
        '/services/MatchService.php',
        '/services/PlayerService.php',
        '/services/HeroService.php',
        '/services/TeamService.php',
        '/services/DashboardService.php',
        '/services/MetaService.php',
    ];
    foreach ($files as $rel) {
        $path = $appDir . $rel;
        if (!file_exists($path)) {
            throw new RuntimeException("File tidak ditemukan: {$rel}");
        }
        require_once $path;
    }
    assertSameValue(true, class_exists('GameService'));
    assertSameValue(true, class_exists('MatchService'));
    assertSameValue(true, class_exists('PlayerService'));
});

// ---------------------------------------------------------------------------
// 2. Unit Test: Pagination Helper
// ---------------------------------------------------------------------------
test('Pagination: default params (page=1, limit=20, offset=0)', function () {
    $_GET = [];
    $res = getPaginationParams();
    assertSameValue(['page' => 1, 'limit' => 20, 'offset' => 0], $res);
});

test('Pagination: custom page & limit + offset calculation', function () {
    $_GET = ['page' => '3', 'limit' => '15'];
    $res = getPaginationParams();
    assertSameValue(['page' => 3, 'limit' => 15, 'offset' => 30], $res);
});

test('Pagination: clamp negative page and limit > 100', function () {
    $_GET = ['page' => '-5', 'limit' => '500'];
    $res = getPaginationParams();
    assertSameValue(['page' => 1, 'limit' => 100, 'offset' => 0], $res);
});

test('Pagination: paginationMeta handles normal total and zero limit', function () {
    assertSameValue(
        ['page' => 2, 'limit' => 10, 'total' => 25, 'total_pages' => 3],
        paginationMeta(2, 10, 25)
    );
    assertSameValue(
        ['page' => 1, 'limit' => 0, 'total' => 10, 'total_pages' => 0],
        paginationMeta(1, 0, 10)
    );
});

// ---------------------------------------------------------------------------
// 3. Unit Test: Validation Helper
// ---------------------------------------------------------------------------
test('Validation: validatePositiveInteger accepts valid positive integers', function () {
    assertSameValue(1, validatePositiveInteger(1, 'team_id'));
    assertSameValue(42, validatePositiveInteger('42', 'player_id'));
});

// ---------------------------------------------------------------------------
// 4. Unit Test: GameService & MatchService dengan Stub Model (tanpa DB)
// ---------------------------------------------------------------------------
test('GameService: getDrafts formats draft response correctly', function () {
    $fakePdo = new class extends PDO {
        public function __construct() {}
    };
    $stubModel = new class($fakePdo) extends Game {
        public function findById(string $gameId): ?array
        {
            return $gameId === 'g1' ? ['game_id' => 'g1'] : null;
        }
        public function getDrafts(string $gameId): array
        {
            return [
                ['pick_ban_turn' => 1, 'type' => 'ban', 'team_side' => 'blue', 'hero_name' => 'Fanny'],
                ['pick_ban_turn' => 7, 'type' => 'pick', 'team_side' => 'blue', 'hero_name' => 'Aulus'],
            ];
        }
    };

    $service = new GameService($stubModel);
    $res = $service->getDrafts('g1');
    assertSameValue('g1', $res['game_id']);
    assertSameValue(2, $res['total_drafts']);
    assertSameValue('Aulus', $res['drafts'][1]['hero_name']);
});

test('GameService: getDrafts throws GAME_NOT_FOUND for missing game', function () {
    $fakePdo = new class extends PDO {
        public function __construct() {}
    };
    $stubModel = new class($fakePdo) extends Game {
        public function findById(string $gameId): ?array
        {
            return null;
        }
    };

    $service = new GameService($stubModel);
    $thrown = false;
    try {
        $service->getDrafts('missing_game');
    } catch (RuntimeException $e) {
        $thrown = ($e->getMessage() === 'GAME_NOT_FOUND');
    }
    assertSameValue(true, $thrown, 'Harus melempar GAME_NOT_FOUND');
});

test('MatchService: getMatchDrafts groups draft_sequence by game_number', function () {
    $fakePdo = new class extends PDO {
        public function __construct() {}
    };
    $stubMatchModel = new class($fakePdo) extends MatchModel {
        public function getMatchById(string $matchId): ?array
        {
            return $matchId === 'm1' ? ['match_id' => 'm1'] : null;
        }
        public function getDraftsByMatchId(string $matchId): array
        {
            return [
                [
                    'game_number' => 1,
                    'turn' => 7,
                    'team_id' => 7,
                    'team_name' => 'Dewa United Esports',
                    'draft_type' => 'pick',
                    'hero_id' => 77,
                    'hero_name' => 'Aulus',
                    'hero_icon_url' => 'https://example.com/aulus.png',
                ],
            ];
        }
    };

    $service = new MatchService($fakePdo);
    $prop = new ReflectionProperty(MatchService::class, 'matchModel');
    $prop->setAccessible(true);
    $prop->setValue($service, $stubMatchModel);
    $res = $service->getMatchDrafts('m1');
    assertSameValue('m1', $res['match_id']);
    assertSameValue(1, count($res['drafts']));
    assertSameValue(1, $res['drafts'][0]['game_number']);
    assertSameValue(7, $res['drafts'][0]['draft_sequence'][0]['turn']);
});

echo "\nSummary: {$passed} passed, {$failed} failed.\n";
exit($failed > 0 ? 1 : 0);
