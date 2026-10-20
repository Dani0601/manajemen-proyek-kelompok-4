<?php

declare(strict_types=1);

/*
|--------------------------------------------------------------------------
| HELPERS
|--------------------------------------------------------------------------
*/

require_once dirname(__DIR__) . '/app/helpers/response.php';
require_once dirname(__DIR__) . '/app/helpers/validation.php';
require_once dirname(__DIR__) . '/app/helpers/pagination.php';


/*
|--------------------------------------------------------------------------
| Request & Base Path
|--------------------------------------------------------------------------
*/

$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';

if (!isset($uri)) {
    $uri = parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH);

    $basePaths = [
        '/manajemen-proyek-kelompok-4/mpl-analytic/public',
        '/manajemen-proyek-kelompok-4',
        '/mpl-analytic/public',
    ];

    $scriptDir = str_replace('\\', '/', dirname($_SERVER['SCRIPT_NAME'] ?? ''));
    if ($scriptDir !== '/' && $scriptDir !== '' && str_starts_with($uri, $scriptDir)) {
        $uri = substr($uri, strlen($scriptDir));
    } else {
        foreach ($basePaths as $basePath) {
            if (str_starts_with($uri, $basePath)) {
                $uri = substr($uri, strlen($basePath));
                break;
            }
        }
    }
}

$uri = trim($uri, '/');

if (!isset($segments)) {
    $segments = $uri === '' ? [] : explode('/', $uri);
}


/*
|--------------------------------------------------------------------------
| HTTP METHOD
|--------------------------------------------------------------------------
|
| Untuk tahap pertama API hanya menggunakan GET.
|
*/

if ($method !== 'GET') {
    jsonResponse(
        null,
        'Method tidak diizinkan.',
        405,
        [
            'error' => [
                'code' => 'METHOD_NOT_ALLOWED',
            ],
        ]
    );
}


/*
|--------------------------------------------------------------------------
| CONTROLLER LOADER
|--------------------------------------------------------------------------
*/

function loadController(string $controllerFile, string $controllerClass): object
{
    global $db;
    $path = dirname(__DIR__) . '/app/controllers/' . $controllerFile;

    if (!file_exists($path)) {
        jsonResponse(
            null,
            'Endpoint belum diimplementasikan.',
            501,
            [
                'error' => [
                    'code' => 'NOT_IMPLEMENTED',
                    'controller' => $controllerClass,
                ],
            ]
        );
    }

    require_once $path;

    if (!class_exists($controllerClass)) {
        jsonResponse(
            null,
            'Controller belum tersedia.',
            501,
            [
                'error' => [
                    'code' => 'CONTROLLER_NOT_FOUND',
                    'controller' => $controllerClass,
                ],
            ]
        );
    }

    if (isset($db) && $db instanceof PDO) {
        try {
            return new $controllerClass($db);
        } catch (Throwable) {
            return new $controllerClass();
        }
    }

    return new $controllerClass();
}


if ($uri === 'api/dashboard') {

    $controller = loadController(
        'DashboardController.php',
        'DashboardController'
    );

    $controller->index();
    exit;
}


/*
|--------------------------------------------------------------------------
| META
|--------------------------------------------------------------------------
|
| GET /api/meta
|
*/

if ($uri === 'api/meta') {

    $controller = loadController(
        'MetaController.php',
        'MetaController'
    );

    if (method_exists($controller, 'index')) {
        $controller->index();
    } else {
        jsonResponse(
            null,
            'Endpoint belum diimplementasikan.',
            501,
            [
                'error' => [
                    'code' => 'NOT_IMPLEMENTED'
                ]
            ]
        );
    }
}


/*
|--------------------------------------------------------------------------
| SEASONS
|--------------------------------------------------------------------------
|
| GET /api/seasons
|
*/

if ($uri === 'api/seasons') {

    $controller = loadController(
        'MetaController.php',
        'MetaController'
    );

    if (method_exists($controller, 'seasons')) {
        $controller->seasons();
    } else {
        jsonResponse(
            null,
            'Endpoint belum diimplementasikan.',
            501,
            [
                'error' => [
                    'code' => 'NOT_IMPLEMENTED'
                ]
            ]
        );
    }
}


/*
|--------------------------------------------------------------------------
| TEAMS
|--------------------------------------------------------------------------
|
| GET /api/teams
|
*/

if ($uri === 'api/teams') {

    $controller = loadController(
        'MetaController.php',
        'MetaController'
    );

    if (method_exists($controller, 'teams')) {
        $controller->teams();
    } else {
        jsonResponse(
            null,
            'Endpoint belum diimplementasikan.',
            501,
            [
                'error' => [
                    'code' => 'NOT_IMPLEMENTED'
                ]
            ]
        );
    }
}


/*
|--------------------------------------------------------------------------
| HEROES
|--------------------------------------------------------------------------
|
| GET /api/heroes
| GET /api/heroes/{id}
| GET /api/heroes/{id}/stats
| GET /api/heroes/{id}/builds
| GET /api/heroes/{id}/counters
| GET /api/heroes/{id}/skills
| GET /api/heroes/{id}/games
|
*/

if (
    $method === 'GET' &&
    $uri === 'api/heroes'
) {

    $controller = loadController(
        'HeroController.php',
        'HeroController'
    );

    $controller->index();
    exit;
}


if (
    $method === 'GET' &&
    isset($segments[0], $segments[1]) &&
    $segments[0] === 'api' &&
    $segments[1] === 'heroes'
) {

    /*
    |--------------------------------------------------------------------------
    | Hero ID wajib ada
    |--------------------------------------------------------------------------
    */

    if (!isset($segments[2])) {

        jsonResponse(
            null,
            'Endpoint hero tidak ditemukan.',
            404,
            [
                'error' => [
                    'code' => 'ENDPOINT_NOT_FOUND',
                ],
            ]
        );
    }

    $heroId = validatePositiveInteger(
        $segments[2],
        'hero_id'
    );

    $controller = loadController(
        'HeroController.php',
        'HeroController'
    );


    /*
    |--------------------------------------------------------------------------
    | GET /api/heroes/{id}/stats
    |--------------------------------------------------------------------------
    */

    if (
        isset($segments[3]) &&
        $segments[3] === 'stats'
    ) {

        $controller->stats($heroId);
        exit;
    }


    /*
    |--------------------------------------------------------------------------
    | GET /api/heroes/{id}/builds
    |--------------------------------------------------------------------------
    */

    if (
        isset($segments[3]) &&
        $segments[3] === 'builds'
    ) {

        $controller->builds($heroId);
        exit;
    }


    /*
    |--------------------------------------------------------------------------
    | GET /api/heroes/{id}/counters
    |--------------------------------------------------------------------------
    */

    if (
        isset($segments[3]) &&
        $segments[3] === 'counters'
    ) {

        $controller->counters($heroId);
        exit;
    }


    /*
    |--------------------------------------------------------------------------
    | GET /api/heroes/{id}/skills
    |--------------------------------------------------------------------------
    */

    if (
        isset($segments[3]) &&
        $segments[3] === 'skills'
    ) {
        $controller->stats($heroId);
        exit;
    }


    /*
    |--------------------------------------------------------------------------
    | GET /api/heroes/{id}/games
    |--------------------------------------------------------------------------
    */

    if (
        isset($segments[3]) &&
        $segments[3] === 'games'
    ) {

        if (!method_exists($controller, 'games')) {

            jsonResponse(
                null,
                'Endpoint belum diimplementasikan.',
                501,
                [
                    'error' => [
                        'code' => 'NOT_IMPLEMENTED',
                    ],
                ]
            );
        }

        $controller->games($heroId);
        exit;
    }


    /*
    | GET /api/heroes/{id}/builds
    */

    if (
        isset($segments[3]) &&
        $segments[3] === 'builds'
    ) {
        // Memanggil fungsi 'detail' atau 'build' di HeroController yang kita buat sebelumnya
        $controller->detail($heroId);
        exit;
    }


    /*
    |--------------------------------------------------------------------------
    | GET /api/heroes/{id}
    |--------------------------------------------------------------------------
    */

    if (!isset($segments[3])) {

        $controller->show($heroId);
        exit;
    }
}


    /*
    |--------------------------------------------------------------------------
    | Endpoint hero tidak dikenal
    |--------------------------------------------------------------------------
    */

// ==========================================
// 1. GET /api/players
// ==========================================
if ($uri === 'api/players') {
    $controller = loadController('PlayerController.php', 'PlayerController');
    $controller->index();
    exit; // Hentikan script agar tidak membaca ke bawah
}

// ==========================================
// 2. GET /api/players/compare (TAMBAHAN BARU UNTUK US-03)
// ==========================================
// WAJIB diletakkan sebelum blok {id} di bawahnya
if ($uri === 'api/players/compare') {
    $controller = loadController('PlayerController.php', 'PlayerController');
    $controller->compare();
    exit;
}

// ==========================================
// 3. GET /api/players/{id} dan turunannya
// ==========================================
if (
    isset($segments[0], $segments[1]) &&
    $segments[0] === 'api' &&
    $segments[1] === 'players'
) {
    if (!isset($segments[2])) {
        // ... (kode error 404 endpoint tidak ditemukan persis seperti milik Anda) ...
    }

    $playerId = validatePositiveInteger(
        $segments[2],
        'player_id'
    );

    $controller = loadController('PlayerController.php', 'PlayerController');

    // GET /api/players/{id}/stats
    if (isset($segments[3]) && $segments[3] === 'stats') {
        if (method_exists($controller, 'stats')) {
            $controller->stats($playerId);
        } else {
            jsonResponse(null, 'Endpoint belum diimplementasikan.', 501, ['error' => ['code' => 'NOT_IMPLEMENTED']]);
        }
        exit;
    }

    // GET /api/players/{id}/games
    if (isset($segments[3]) && $segments[3] === 'games') {
        if (method_exists($controller, 'games')) {
            $controller->games($playerId);
        } else {
            jsonResponse(null, 'Endpoint belum diimplementasikan.', 501, ['error' => ['code' => 'NOT_IMPLEMENTED']]);
        }
        exit;
    }

    // GET /api/players/{id}
    if (!isset($segments[3])) {
        if (method_exists($controller, 'show')) {
            $controller->show($playerId);
        } else {
            jsonResponse(null, 'Endpoint belum diimplementasikan.', 501, ['error' => ['code' => 'NOT_IMPLEMENTED']]);
        }
        exit;
    }


    /*
    |--------------------------------------------------------------------------
    | Endpoint player tidak dikenal
    |--------------------------------------------------------------------------
    */

    jsonResponse(
        null,
        'Endpoint player tidak ditemukan.',
        404,
        [
            'error' => [
                'code' => 'ENDPOINT_NOT_FOUND',
            ],
        ]
    );
}


/*
|--------------------------------------------------------------------------
| TOURNAMENTS
|--------------------------------------------------------------------------
|
| GET /api/tournaments
| GET /api/tournaments/{id}
| GET /api/tournaments/{id}/standings
| GET /api/tournaments/{id}/schedule
|
| Database tidak memiliki tabel tournaments.
| Data tournament menggunakan seasons, schedules,
| matches, dan teams.
|
*/

if (
    $method === 'GET' &&
    $uri === 'api/tournaments'
) {

    $controller = loadController(
        'TournamentController.php',
        'TournamentController'
    );

    if (method_exists($controller, 'index')) {
        $controller->index();
    } elseif (method_exists($controller, 'getMatchesSchedule')) {
        $controller->getMatchesSchedule();
    } else {
        jsonResponse(
            null,
            'Endpoint belum diimplementasikan.',
            501,
            [
                'error' => [
                    'code' => 'NOT_IMPLEMENTED'
                ]
            ]
        );
    }
}


/*
| GET /api/tournaments/{id}
| GET /api/tournaments/{id}/standings
| GET /api/tournaments/{id}/schedule
*/

if (
    isset($segments[0], $segments[1]) &&
    $segments[0] === 'api' &&
    $segments[1] === 'tournaments'
) {

    if (!isset($segments[2])) {

        jsonResponse(
            null,
            'Endpoint tournament tidak ditemukan.',
            404,
            [
                'error' => [
                    'code' => 'ENDPOINT_NOT_FOUND',
                ],
            ]
        );
    }

    $tournamentId = validatePositiveInteger(
        $segments[2],
        'tournament_id'
    );

    $controller = loadController(
        'TournamentController.php',
        'TournamentController'
    );


    /*
    |--------------------------------------------------------------------------
    | GET /api/tournaments/{id}/standings
    |--------------------------------------------------------------------------
    */

    if (
        isset($segments[3]) &&
        $segments[3] === 'standings'
    ) {
        if (method_exists($controller, 'standings')) {
            $controller->standings($tournamentId);
        } else {
            jsonResponse(null, 'Endpoint belum diimplementasikan.', 501, ['error' => ['code' => 'NOT_IMPLEMENTED']]);
        }
    }


    /*
    |--------------------------------------------------------------------------
    | GET /api/tournaments/{id}/schedule
    |--------------------------------------------------------------------------
    */

    if (
        isset($segments[3]) &&
        $segments[3] === 'schedule'
    ) {
        if (method_exists($controller, 'schedule')) {
            $controller->schedule($tournamentId);
        } elseif (method_exists($controller, 'getMatchesSchedule')) {
            $controller->getMatchesSchedule();
        } else {
            jsonResponse(null, 'Endpoint belum diimplementasikan.', 501, ['error' => ['code' => 'NOT_IMPLEMENTED']]);
        }
    }


    /*
    |--------------------------------------------------------------------------
    | GET /api/tournaments/{id}
    |--------------------------------------------------------------------------
    */

    if (!isset($segments[3])) {
        if (method_exists($controller, 'show')) {
            $controller->show($tournamentId);
        } else {
            jsonResponse(null, 'Endpoint belum diimplementasikan.', 501, ['error' => ['code' => 'NOT_IMPLEMENTED']]);
        }
    }

    /*
    |--------------------------------------------------------------------------
    | Endpoint tournament tidak dikenal
    |--------------------------------------------------------------------------
    */

    jsonResponse(
        null,
        'Endpoint tournament tidak ditemukan.',
        404,
        [
            'error' => [
                'code' => 'ENDPOINT_NOT_FOUND',
            ],
        ]
    );
}



/*
|--------------------------------------------------------------------------
| MATCHES
|--------------------------------------------------------------------------
|
| GET /api/matches
| GET /api/matches/{id}
| GET /api/matches/{id}/games
|
*/

if (
    $method === 'GET' &&
    $uri === 'api/matches'
) {

    $controller = loadController(
        'MatchController.php',
        'MatchController'
    );

    if (method_exists($controller, 'index')) {
        $controller->index();
    } else {
        jsonResponse(
            null,
            'Endpoint belum diimplementasikan.',
            501,
            [
                'error' => [
                    'code' => 'NOT_IMPLEMENTED'
                ]
            ]
        );
    }
}


if (
    $method === 'GET' &&
    isset($segments[0], $segments[1]) &&
    $segments[0] === 'api' &&
    $segments[1] === 'matches'
) {

    if (!isset($segments[2])) {

        jsonResponse(
            null,
            'Endpoint match tidak ditemukan.',
            404,
            [
                'error' => [
                    'code' => 'ENDPOINT_NOT_FOUND',
                ],
            ]
        );
    }


    /*
    |--------------------------------------------------------------------------
    | Match ID
    |--------------------------------------------------------------------------
    |
    | match_id disimpan sebagai VARCHAR.
    | Jangan menggunakan validatePositiveInteger().
    |
    */

    $matchId = trim($segments[2]);

    if ($matchId === '') {

        jsonResponse(
            null,
            'match_id wajib diisi.',
            400,
            [
                'error' => [
                    'code' => 'INVALID_MATCH_ID',
                ],
            ]
        );
    }


    $controller = loadController(
        'MatchController.php',
        'MatchController'
    );


    /*
    |--------------------------------------------------------------------------
    | GET /api/matches/{id}/games
    |--------------------------------------------------------------------------
    */

    // if (
    //     isset($segments[3]) &&
    //     $segments[3] === 'games'
    // ) {
    //     $controller->games($matchId);
    // }


// GET /api/matches/{id}/drafts
        if (
            isset($segments[3]) &&
            $segments[3] === 'drafts' &&
            !isset($segments[4])
        ) {
            $controller->getDrafts($matchId);
        }

    /*
    |--------------------------------------------------------------------------
    | GET /api/matches/{id}
    |--------------------------------------------------------------------------
    */

    if (!isset($segments[3])) {
        $controller->getDetail($matchId);
    }

    /*
    |--------------------------------------------------------------------------
    | Endpoint match tidak dikenal
    |--------------------------------------------------------------------------
    */

    jsonResponse(
        null,
        'Endpoint match tidak ditemukan.',
        404,
        [
            'error' => [
                'code' => 'ENDPOINT_NOT_FOUND',
            ],
        ]
    );
}



/*
|--------------------------------------------------------------------------
| GAMES
|--------------------------------------------------------------------------
|
| GET /api/games
| GET /api/games/{id}
| GET /api/games/{id}/players
| GET /api/games/{id}/picks
| GET /api/games/{id}/emblems
| GET /api/games/{id}/items
|
*/

if (
    $method === 'GET' &&
    $uri === 'api/games'
) {

    $controller = loadController(
        'GameController.php',
        'GameController'
    );

    $controller->index();
    exit;
}


if (
    $method === 'GET' &&
    isset($segments[0], $segments[1]) &&
    $segments[0] === 'api' &&
    $segments[1] === 'games'
) {

    /*
    |--------------------------------------------------------------------------
    | Game ID wajib ada
    |--------------------------------------------------------------------------
    */

    if (!isset($segments[2])) {

        jsonResponse(
            null,
            'Endpoint game tidak ditemukan.',
            404,
            [
                'error' => [
                    'code' => 'ENDPOINT_NOT_FOUND',
                ],
            ]
        );
    }


    /*
    |--------------------------------------------------------------------------
    | Game ID
    |--------------------------------------------------------------------------
    |
    | game_id disimpan sebagai VARCHAR.
    |
    */

    $gameId = trim($segments[2]);

    if ($gameId === '') {

        jsonResponse(
            null,
            'game_id wajib diisi.',
            400,
            [
                'error' => [
                    'code' => 'INVALID_GAME_ID',
                ],
            ]
        );
    }


    $controller = loadController(
        'GameController.php',
        'GameController'
    );


    /*
    |--------------------------------------------------------------------------
    | GET /api/games/{id}/players
    |--------------------------------------------------------------------------
    */

    if (
        isset($segments[3]) &&
        $segments[3] === 'players'
    ) {

        $controller->players($gameId);
        exit;
    }


    /*
    |--------------------------------------------------------------------------
    | GET /api/games/{id}/picks
    |--------------------------------------------------------------------------
    */

    if (
        isset($segments[3]) &&
        $segments[3] === 'picks'
    ) {

        $controller->picks($gameId);
        exit;
    }


    /*
    |--------------------------------------------------------------------------
    | GET /api/games/{id}/emblems
    |--------------------------------------------------------------------------
    */

    if (
        isset($segments[3]) &&
        $segments[3] === 'emblems'
    ) {

        $controller->emblems($gameId);
        exit;
    }


    /*
    |--------------------------------------------------------------------------
    | GET /api/games/{id}/items
    |--------------------------------------------------------------------------
    */

    if (
        isset($segments[3]) &&
        $segments[3] === 'items'
    ) {

        $controller->items($gameId);
        exit;
    }


    /*
    |--------------------------------------------------------------------------
    | GET /api/games/{id}
    |--------------------------------------------------------------------------
    */

    if (!isset($segments[3])) {

        $controller->show($gameId);
        exit;
    }


    /*
    |--------------------------------------------------------------------------
    | Endpoint game tidak dikenal
    |--------------------------------------------------------------------------
    */

    jsonResponse(
        null,
        'Endpoint game tidak ditemukan.',
        404,
        [
            'error' => [
                'code' => 'ENDPOINT_NOT_FOUND',
            ],
        ]
    );
}


/*
|--------------------------------------------------------------------------
| ITEMS
|--------------------------------------------------------------------------
|
| GET /api/items
| GET /api/items/{id}
|
*/

if (
    $method === 'GET' &&
    $uri === 'api/items'
) {

    $controller = loadController(
        'ItemController.php',
        'ItemController'
    );

    $controller->index();
    exit;
}


if (
    $method === 'GET' &&
    isset($segments[0], $segments[1]) &&
    $segments[0] === 'api' &&
    $segments[1] === 'items'
) {

    if (!isset($segments[2])) {

        jsonResponse(
            null,
            'Endpoint item tidak ditemukan.',
            404,
            [
                'error' => [
                    'code' => 'ENDPOINT_NOT_FOUND',
                ],
            ]
        );
    }

    $itemId = validatePositiveInteger(
        $segments[2],
        'item_id'
    );

    $controller = loadController(
        'ItemController.php',
        'ItemController'
    );

    $controller->show($itemId);
    exit;
}


/*
|--------------------------------------------------------------------------
| ENDPOINT TIDAK DITEMUKAN
|--------------------------------------------------------------------------
*/

jsonResponse(
    null,
    'Endpoint tidak ditemukan.',
    404,
    [
        'error' => [
            'code' => 'ENDPOINT_NOT_FOUND',
        ],
    ]
);