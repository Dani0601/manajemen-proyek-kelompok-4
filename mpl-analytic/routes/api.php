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
| REQUEST
|--------------------------------------------------------------------------
*/

$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';

$uri = parse_url(
    $_SERVER['REQUEST_URI'] ?? '/',
    PHP_URL_PATH
);


/*
|--------------------------------------------------------------------------
| BASE PATH
|--------------------------------------------------------------------------
*/

$basePaths = [
    '/mpl-analytic/public',
];

foreach ($basePaths as $basePath) {
    if (str_starts_with($uri, $basePath)) {
        $uri = substr($uri, strlen($basePath));
        break;
    }
}

$uri = trim($uri, '/');

$segments = $uri === ''
    ? []
    : explode('/', $uri);


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

function loadController(
    string $controllerFile,
    string $controllerClass
): object {

    $path = dirname(__DIR__)
        . '/app/controllers/'
        . $controllerFile;

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

    return new $controllerClass();
}


/*
|--------------------------------------------------------------------------
| DASHBOARD
|--------------------------------------------------------------------------
|
| GET /api/dashboard
|
*/

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

    $controller->index();
    exit;
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

    $controller->seasons();
    exit;
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

    $controller->teams();
    exit;
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

        $controller->skills($heroId);
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
    |--------------------------------------------------------------------------
    | GET /api/heroes/{id}
    |--------------------------------------------------------------------------
    */

    if (!isset($segments[3])) {

        $controller->show($heroId);
        exit;
    }


    /*
    |--------------------------------------------------------------------------
    | Endpoint hero tidak dikenal
    |--------------------------------------------------------------------------
    */

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


/*
|--------------------------------------------------------------------------
| PLAYERS
|--------------------------------------------------------------------------
|
| GET /api/players
| GET /api/players/{id}
| GET /api/players/{id}/stats
| GET /api/players/{id}/games
|
*/

if (
    $method === 'GET' &&
    $uri === 'api/players'
) {

    $controller = loadController(
        'PlayerController.php',
        'PlayerController'
    );

    $controller->index();
    exit;
}


if (
    $method === 'GET' &&
    isset($segments[0], $segments[1]) &&
    $segments[0] === 'api' &&
    $segments[1] === 'players'
) {

    if (!isset($segments[2])) {

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

    $playerId = validatePositiveInteger(
        $segments[2],
        'player_id'
    );

    $controller = loadController(
        'PlayerController.php',
        'PlayerController'
    );


    /*
    |--------------------------------------------------------------------------
    | GET /api/players/{id}/stats
    |--------------------------------------------------------------------------
    */

    if (
        isset($segments[3]) &&
        $segments[3] === 'stats'
    ) {

        $controller->stats($playerId);
        exit;
    }


    /*
    |--------------------------------------------------------------------------
    | GET /api/players/{id}/games
    |--------------------------------------------------------------------------
    */

    if (
        isset($segments[3]) &&
        $segments[3] === 'games'
    ) {

        $controller->games($playerId);
        exit;
    }


    /*
    |--------------------------------------------------------------------------
    | GET /api/players/{id}
    |--------------------------------------------------------------------------
    */

    if (!isset($segments[3])) {

        $controller->show($playerId);
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

    $controller->index();
    exit;
}


if (
    $method === 'GET' &&
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

        $controller->standings($tournamentId);
        exit;
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

        $controller->schedule($tournamentId);
        exit;
    }


    /*
    |--------------------------------------------------------------------------
    | GET /api/tournaments/{id}
    |--------------------------------------------------------------------------
    */

    if (!isset($segments[3])) {

        $controller->show($tournamentId);
        exit;
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

    $controller->index();
    exit;
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

    if (
        isset($segments[3]) &&
        $segments[3] === 'games'
    ) {

        $controller->games($matchId);
        exit;
    }


    /*
    |--------------------------------------------------------------------------
    | GET /api/matches/{id}
    |--------------------------------------------------------------------------
    */

    if (!isset($segments[3])) {

        $controller->show($matchId);
        exit;
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